import { useState, useEffect } from 'react';
import { Plus, Syringe, Bug, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { format, addMonths, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VaccineRecord {
  id: string;
  pet_id: string;
  tipo: string;
  nome: string;
  data_aplicacao: string;
  validade_meses: number;
  data_vencimento: string;
  created_at: string;
}

interface VaccineBookletProps {
  petId: string;
  petName: string;
}

const getVaccineStatus = (dataVencimento: string): { label: string; variant: 'default' | 'destructive' | 'secondary'; color: string } => {
  const today = new Date();
  const vencimento = parseISO(dataVencimento);
  const daysRemaining = differenceInDays(vencimento, today);

  if (daysRemaining < 0) {
    return { label: 'Vencida', variant: 'destructive', color: 'text-destructive' };
  } else if (daysRemaining <= 30) {
    return { label: 'Próxima do vencimento', variant: 'secondary', color: 'text-orange-500' };
  }
  return { label: 'Válida', variant: 'default', color: 'text-green-500' };
};

export const VaccineBooklet = ({ petId, petName }: VaccineBookletProps) => {
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for new vaccine
  const [newVaccine, setNewVaccine] = useState({
    tipo: 'vacina',
    nome: '',
    dataAplicacao: '',
    validadeMeses: '12',
  });

  // Fetch vaccines for this pet
  const fetchVaccines = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/pet_vacinas?pet_id=eq.${petId}&order=data_vencimento.asc`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      const result = await response.json();
      setVaccines(result || []);
    } catch (error) {
      console.error('Erro ao carregar vacinas:', error);
      setVaccines([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (petId) {
      fetchVaccines();
    }
  }, [petId]);

  const resetForm = () => {
    setNewVaccine({
      tipo: 'vacina',
      nome: '',
      dataAplicacao: '',
      validadeMeses: '12',
    });
  };

  const handleSaveVaccine = async () => {
    if (!newVaccine.nome || !newVaccine.dataAplicacao) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome e data de aplicação.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const aplicacao = parseISO(newVaccine.dataAplicacao);
      const validade = parseInt(newVaccine.validadeMeses) || 12;
      const vencimento = addMonths(aplicacao, validade);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/pet_vacinas`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            pet_id: petId,
            tipo: newVaccine.tipo,
            nome: newVaccine.nome,
            data_aplicacao: newVaccine.dataAplicacao,
            validade_meses: validade,
            data_vencimento: format(vencimento, 'yyyy-MM-dd'),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao salvar vacina');
      }

      toast({
        title: 'Vacina adicionada!',
        description: `${newVaccine.nome} foi registrada com sucesso.`,
      });

      resetForm();
      setIsAddDialogOpen(false);
      fetchVaccines();
    } catch (error: any) {
      console.error('Erro ao salvar vacina:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar a vacina.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVaccine = async (vaccineId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/pet_vacinas?id=eq.${vaccineId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao remover vacina');
      }

      toast({
        title: 'Vacina removida',
        description: 'Registro removido com sucesso.',
      });
      fetchVaccines();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Syringe className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-base">🩺 Caderneta de Saúde</h3>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-1" />
          Registrar novo item
        </Button>
      </div>

      {/* Vaccine List */}
      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground">Carregando...</div>
      ) : vaccines.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground bg-background rounded-lg border border-dashed">
          <Syringe className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum registro na caderneta</p>
          <p className="text-xs">Clique em "Registrar novo item" para começar</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {vaccines.map((vaccine) => {
            const status = getVaccineStatus(vaccine.data_vencimento);
            const daysRemaining = differenceInDays(parseISO(vaccine.data_vencimento), new Date());

            return (
              <div
                key={vaccine.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {vaccine.tipo === 'vacina' ? (
                    <Syringe className={`w-4 h-4 ${status.color}`} />
                  ) : vaccine.tipo === 'vermifugo' ? (
                    <Pill className={`w-4 h-4 ${status.color}`} />
                  ) : (
                    <Bug className={`w-4 h-4 ${status.color}`} />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      <span className="text-xs text-muted-foreground mr-1">
                        [{vaccine.tipo === 'vacina' ? 'Vacina' : vaccine.tipo === 'vermifugo' ? 'Vermífugo' : 'Antipulgas'}]
                      </span>
                      {vaccine.nome}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        Aplicada: {format(parseISO(vaccine.data_aplicacao), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      <span>•</span>
                      <span>
                        Vence: {format(parseISO(vaccine.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={status.variant} className="text-xs">
                    {status.label}
                    {daysRemaining > 0 && ` (${daysRemaining}d)`}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteVaccine(vaccine.id)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Vaccine Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-primary" />
              Registrar novo item
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Categoria *</Label>
              <Select
                value={newVaccine.tipo}
                onValueChange={(value) => setNewVaccine((prev) => ({ 
                  ...prev, 
                  tipo: value,
                  validadeMeses: value === 'vacina' ? '12' : value === 'vermifugo' ? '3' : '1'
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacina">🩺 Vacina</SelectItem>
                  <SelectItem value="antiparasitario">🐛 Antipulgas / Antiparasitário</SelectItem>
                  <SelectItem value="vermifugo">💊 Vermífugo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nome / Marca *</Label>
              <Input
                placeholder={
                  newVaccine.tipo === 'vacina' 
                    ? 'Ex: V10, V8, Antirrábica' 
                    : newVaccine.tipo === 'vermifugo'
                    ? 'Ex: Drontal, Vermivet'
                    : 'Ex: Bravecto, Nexgard, Simparic'
                }
                value={newVaccine.nome}
                onChange={(e) => setNewVaccine((prev) => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            <div>
              <Label>Data de Aplicação *</Label>
              <Input
                type="date"
                value={newVaccine.dataAplicacao}
                onChange={(e) => setNewVaccine((prev) => ({ ...prev, dataAplicacao: e.target.value }))}
              />
            </div>

            <div>
              <Label>
                Validade ({newVaccine.tipo === 'vacina' ? 'meses' : 'meses'})
              </Label>
              <Input
                type="number"
                placeholder={newVaccine.tipo === 'vacina' ? '12' : newVaccine.tipo === 'vermifugo' ? '3' : '1'}
                value={newVaccine.validadeMeses}
                onChange={(e) => setNewVaccine((prev) => ({ ...prev, validadeMeses: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {newVaccine.tipo === 'vacina' 
                  ? 'Vacinas geralmente têm validade de 12 meses'
                  : newVaccine.tipo === 'vermifugo'
                  ? 'Vermífugos geralmente têm validade de 3 meses'
                  : 'Antipulgas geralmente têm validade de 1 mês'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveVaccine}
              disabled={isSaving}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              {isSaving ? 'Salvando...' : 'Salvar registro'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
