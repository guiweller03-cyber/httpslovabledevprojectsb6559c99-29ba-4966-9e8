import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface InactivitySettingsProps {
  onSettingsChange?: () => void;
}

export function InactivitySettings({ onSettingsChange }: InactivitySettingsProps) {
  const [diasInatividade, setDiasInatividade] = useState(40);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      const settingsData = data as any;
      if (settingsData?.dias_inatividade) {
        setDiasInatividade(settingsData.dias_inatividade);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (diasInatividade < 1 || diasInatividade > 365) {
      toast({
        title: 'Valor inválido',
        description: 'O prazo deve ser entre 1 e 365 dias.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('tenant_settings')
        .update({ dias_inatividade: diasInatividade, updated_at: new Date().toISOString() })
        .not('id', 'is', null);

      if (error) throw error;

      toast({
        title: 'Configuração salva',
        description: `Prazo de inatividade atualizado para ${diasInatividade} dias.`,
      });

      // Recalcular campanhas
      await recalculateCampaigns();

      if (onSettingsChange) {
        onSettingsChange();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a configuração.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const recalculateCampaigns = async () => {
    setIsRecalculating(true);
    try {
      // Chamar função do banco para recalcular todos os clientes
      const { error } = await (supabase as any).rpc('recalculate_all_client_campaigns');
      
      if (error) throw error;

      toast({
        title: 'Clientes recalculados',
        description: 'Todas as classificações de campanha foram atualizadas.',
      });

      if (onSettingsChange) {
        onSettingsChange();
      }
    } catch (error) {
      console.error('Erro ao recalcular:', error);
      toast({
        title: 'Erro ao recalcular',
        description: 'Não foi possível recalcular as classificações.',
        variant: 'destructive',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-24 bg-muted rounded-lg" />;
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Configuração de Inatividade
        </CardTitle>
        <CardDescription>
          Defina após quantos dias sem compra um cliente é considerado inativo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="dias_inatividade">Dias de Inatividade</Label>
            <Input
              id="dias_inatividade"
              type="number"
              min={1}
              max={365}
              value={diasInatividade}
              onChange={(e) => setDiasInatividade(parseInt(e.target.value) || 40)}
              className="mt-1.5"
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Clientes sem compras há mais de {diasInatividade} dias serão classificados como <strong>inativos</strong>.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={recalculateCampaigns}
            disabled={isRecalculating}
            className="gap-2"
          >
            <RefreshCw className={`w-3 h-3 ${isRecalculating ? 'animate-spin' : ''}`} />
            Recalcular
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
