import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TenantSettings {
  id: string;
  business_name: string | null;
  plan_type: string;
  mod_petshop: boolean | null;
  mod_hotel: boolean | null;
  mod_clinica: boolean | null;
  mod_produtos: boolean | null;
  mod_pdv: boolean | null;
  mod_caixa: boolean | null;
  mod_comissao: boolean | null;
  mod_financeiro_avancado: boolean | null;
  mod_dashboard_completo: boolean | null;
  mod_estoque: boolean | null;
  mod_marketing: boolean | null;
}

export default function AdminConfig() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tenant_settings')
        .update({
          business_name: settings.business_name,
          mod_petshop: settings.mod_petshop,
          mod_hotel: settings.mod_hotel,
          mod_clinica: settings.mod_clinica,
          mod_produtos: settings.mod_produtos,
          mod_pdv: settings.mod_pdv,
          mod_caixa: settings.mod_caixa,
          mod_comissao: settings.mod_comissao,
          mod_financeiro_avancado: settings.mod_financeiro_avancado,
          mod_dashboard_completo: settings.mod_dashboard_completo,
          mod_estoque: settings.mod_estoque,
          mod_marketing: settings.mod_marketing,
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('Estado atualizado com sucesso');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof TenantSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const moduleSettings = [
    { key: 'mod_petshop', label: 'Módulo Petshop', description: 'Banho & Tosa, agendamentos' },
    { key: 'mod_hotel', label: 'Módulo Hotel & Creche', description: 'Hospedagem e creche de pets' },
    { key: 'mod_clinica', label: 'Módulo Clínica', description: 'Atendimento veterinário' },
    { key: 'mod_produtos', label: 'Módulo Produtos', description: 'Catálogo de produtos' },
    { key: 'mod_pdv', label: 'Módulo PDV', description: 'Ponto de venda' },
    { key: 'mod_caixa', label: 'Módulo Caixa', description: 'Controle de caixa' },
    { key: 'mod_comissao', label: 'Módulo Comissões', description: 'Comissões de funcionários' },
    { key: 'mod_financeiro_avancado', label: 'Financeiro Avançado', description: 'Relatórios detalhados' },
    { key: 'mod_dashboard_completo', label: 'Dashboard Completo', description: 'Métricas avançadas' },
    { key: 'mod_estoque', label: 'Módulo Estoque', description: 'Controle de estoque' },
    { key: 'mod_marketing', label: 'Módulo Marketing', description: 'Campanhas e automações' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#64748B]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1F2933]">Configurações Internas</h1>
          <p className="text-[#64748B] mt-1">
            Regras globais, flags e estados do sistema
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar alterações
            </>
          )}
        </Button>
      </div>

      {/* General Settings */}
      <Card className="border-[#E2E8F0] bg-white">
        <CardHeader className="border-b border-[#E2E8F0]">
          <CardTitle className="text-lg font-semibold text-[#1F2933] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#64748B]" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[#1F2933]">Nome do Negócio</Label>
              <Input
                value={settings?.business_name || ''}
                onChange={(e) => updateSetting('business_name', e.target.value)}
                className="border-[#E2E8F0]"
                placeholder="Nome do seu negócio"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1F2933]">Tipo de Plano</Label>
              <Input
                value={settings?.plan_type || ''}
                disabled
                className="border-[#E2E8F0] bg-[#F8FAFC]"
              />
              <p className="text-xs text-[#94A3B8]">
                Contate o suporte para alterar o plano
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Flags */}
      <Card className="border-[#E2E8F0] bg-white">
        <CardHeader className="border-b border-[#E2E8F0]">
          <CardTitle className="text-lg font-semibold text-[#1F2933]">
            Feature Flags
          </CardTitle>
          <CardDescription className="text-[#64748B]">
            Ative ou desative módulos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#E2E8F0]">
            {moduleSettings.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between p-4 hover:bg-[#F8FAFC]">
                <div>
                  <p className="font-medium text-[#1F2933]">{label}</p>
                  <p className="text-sm text-[#64748B]">{description}</p>
                </div>
                <Switch
                  checked={settings?.[key as keyof TenantSettings] as boolean || false}
                  onCheckedChange={(checked) => updateSetting(key as keyof TenantSettings, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
