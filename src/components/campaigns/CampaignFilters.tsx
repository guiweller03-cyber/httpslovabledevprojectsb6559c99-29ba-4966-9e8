import { useState } from 'react';
import { Filter, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type CampaignType = 'primeira_compra' | 'ativo' | 'inativo';

interface CampaignFiltersProps {
  selectedTypes: CampaignType[];
  onFilterChange: (types: CampaignType[]) => void;
  clientCounts: {
    primeira_compra: number;
    ativo: number;
    inativo: number;
  };
  filteredClients: Array<{
    id: string;
    name: string;
    whatsapp: string;
    email: string | null;
    tipo_campanha: string | null;
  }>;
  onSendCampaign?: (clients: any[], type: string) => void;
}

const campaignLabels: Record<CampaignType, { label: string; color: string; description: string }> = {
  primeira_compra: {
    label: 'Sem Compra',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Clientes que nunca realizaram compra',
  },
  ativo: {
    label: 'Ativos',
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Clientes com compras recentes',
  },
  inativo: {
    label: 'Inativos',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Clientes sem compras há mais de X dias',
  },
};

export function CampaignFilters({
  selectedTypes,
  onFilterChange,
  clientCounts,
  filteredClients,
  onSendCampaign,
}: CampaignFiltersProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleTypeToggle = (values: string[]) => {
    onFilterChange(values as CampaignType[]);
  };

  const handleSendCampaign = async () => {
    if (filteredClients.length === 0) {
      toast({
        title: 'Nenhum cliente selecionado',
        description: 'Aplique um filtro para selecionar clientes.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      // Preparar payload para webhook
      const payload = {
        tipo_campanha: selectedTypes.join(',') || 'todos',
        timestamp: new Date().toISOString(),
        total_clientes: filteredClients.length,
        clientes: filteredClients.map(c => ({
          id: c.id,
          name: c.name,
          whatsapp: c.whatsapp,
          email: c.email,
          tipo_campanha: c.tipo_campanha,
        })),
      };

      // Disparar webhook para n8n
      console.log('[Campaign Webhook] Enviando dados:', payload);
      
      // Em produção, descomentar:
      // await fetch('https://n8n.example.com/webhook/campaigns', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });

      if (onSendCampaign) {
        onSendCampaign(filteredClients, selectedTypes.join(','));
      }

      toast({
        title: '✅ Campanha enviada!',
        description: `${filteredClients.length} cliente(s) enviados para processamento.`,
      });

      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Erro ao enviar campanha:', error);
      toast({
        title: 'Erro ao enviar campanha',
        description: 'Não foi possível enviar os dados. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-xl border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Filtrar por Campanha</span>
        </div>
        
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowConfirmDialog(true)}
          disabled={filteredClients.length === 0}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Enviar Campanha
          {selectedTypes.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {filteredClients.length}
            </Badge>
          )}
        </Button>
      </div>

      <ToggleGroup
        type="multiple"
        value={selectedTypes}
        onValueChange={handleTypeToggle}
        className="flex flex-wrap gap-2 justify-start"
      >
        {(Object.keys(campaignLabels) as CampaignType[]).map((type) => (
          <ToggleGroupItem
            key={type}
            value={type}
            aria-label={`Filtrar ${campaignLabels[type].label}`}
            className={`px-4 py-2 rounded-lg border transition-all ${
              selectedTypes.includes(type)
                ? campaignLabels[type].color
                : 'bg-background border-border hover:bg-muted'
            }`}
          >
            <span className="mr-2">{campaignLabels[type].label}</span>
            <Badge variant="outline" className="text-xs">
              {clientCounts[type]}
            </Badge>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {selectedTypes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedTypes.map(t => campaignLabels[t].description).join(' | ')}
        </p>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Confirmar Envio de Campanha
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a enviar {filteredClients.length} cliente(s) para
                processamento de campanha.
              </p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <strong>Tipos selecionados:</strong>{' '}
                {selectedTypes.length > 0
                  ? selectedTypes.map(t => campaignLabels[t].label).join(', ')
                  : 'Todos'}
              </div>
              <p className="text-xs text-muted-foreground">
                Os dados serão enviados via webhook. O n8n é responsável pelo
                envio efetivo das mensagens.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendCampaign} disabled={isSending}>
              {isSending ? 'Enviando...' : 'Confirmar Envio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
