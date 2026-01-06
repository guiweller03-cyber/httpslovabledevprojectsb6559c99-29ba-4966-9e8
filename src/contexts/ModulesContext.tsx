import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export type PlanType = 'basic' | 'hotel' | 'premium';

export interface ModulesConfig {
  plan_type: PlanType;
  business_name: string;
  mod_petshop: boolean;
  mod_hotel: boolean;
  mod_clinica: boolean;
  mod_produtos: boolean;
  mod_pdv: boolean;
  mod_caixa: boolean;
  mod_comissao: boolean;
  mod_financeiro_avancado: boolean;
  mod_dashboard_completo: boolean;
  mod_estoque: boolean;
  mod_marketing: boolean;
}

interface ModulesContextType {
  config: ModulesConfig | null;
  isLoading: boolean;
  hasModule: (module: keyof Omit<ModulesConfig, 'plan_type' | 'business_name'>) => boolean;
  updateModule: (module: keyof Omit<ModulesConfig, 'plan_type' | 'business_name'>, enabled: boolean) => Promise<void>;
  setPlan: (plan: PlanType) => Promise<void>;
  refetch: () => Promise<void>;
}

const defaultConfig: ModulesConfig = {
  plan_type: 'hotel',
  business_name: 'PetSaaS',
  mod_petshop: true,
  mod_hotel: true,
  mod_clinica: false,
  mod_produtos: false,
  mod_pdv: true,
  mod_caixa: false,
  mod_comissao: false,
  mod_financeiro_avancado: false,
  mod_dashboard_completo: false,
  mod_estoque: false,
  mod_marketing: false,
};

// Configurações por plano
const planConfigs: Record<PlanType, Partial<ModulesConfig>> = {
  basic: {
    mod_petshop: true,
    mod_hotel: false,
    mod_clinica: false,
    mod_dashboard_completo: false,
  },
  hotel: {
    mod_petshop: true,
    mod_hotel: true,
    mod_clinica: false,
    mod_dashboard_completo: false,
  },
  premium: {
    mod_petshop: true,
    mod_hotel: true,
    mod_clinica: true,
    mod_produtos: true,
    mod_pdv: true,
    mod_caixa: true,
    mod_dashboard_completo: true,
  },
};

const ModulesContext = createContext<ModulesContextType | undefined>(undefined);

export function ModulesProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [config, setConfig] = useState<ModulesConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      // Using any since tables are newly created
      const { data, error } = await (supabase as any)
        .from('tenant_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching tenant settings:', error);
        setConfig(defaultConfig);
      } else if (data) {
        setConfig(data as ModulesConfig);
      } else {
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Error:', error);
      setConfig(defaultConfig);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConfig();
    } else {
      setConfig(defaultConfig);
      setIsLoading(false);
    }
  }, [user]);

  const hasModule = (module: keyof Omit<ModulesConfig, 'plan_type' | 'business_name'>): boolean => {
    if (!config) return false;
    return config[module] === true;
  };

  const updateModule = async (
    module: keyof Omit<ModulesConfig, 'plan_type' | 'business_name'>,
    enabled: boolean
  ) => {
    if (!isAdmin || !config) return;

    const { error } = await (supabase as any)
      .from('tenant_settings')
      .update({ [module]: enabled })
      .eq('id', (config as any).id);

    if (!error) {
      setConfig({ ...config, [module]: enabled });
    }
  };

  const setPlan = async (plan: PlanType) => {
    if (!isAdmin || !config) return;

    const planConfig = planConfigs[plan];
    const updates = {
      plan_type: plan,
      ...planConfig,
    };

    const { error } = await (supabase as any)
      .from('tenant_settings')
      .update(updates)
      .eq('id', (config as any).id);

    if (!error) {
      setConfig({ ...config, ...updates });
    }
  };

  const refetch = async () => {
    setIsLoading(true);
    await fetchConfig();
  };

  return (
    <ModulesContext.Provider
      value={{
        config,
        isLoading,
        hasModule,
        updateModule,
        setPlan,
        refetch,
      }}
    >
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  const context = useContext(ModulesContext);
  if (context === undefined) {
    throw new Error('useModules must be used within a ModulesProvider');
  }
  return context;
}
