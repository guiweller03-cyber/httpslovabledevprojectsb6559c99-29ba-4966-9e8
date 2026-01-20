import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CampaignType } from '@/components/campaigns/CampaignFilters';

interface ClientWithCampaign {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  tipo_campanha: string | null;
  last_purchase: string | null;
  created_at: string | null;
}

export function useCampaignClients() {
  const [clients, setClients] = useState<ClientWithCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<CampaignType[]>([]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients((data || []) as unknown as ClientWithCampaign[]);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const clientCounts = useMemo(() => {
    return {
      primeira_compra: clients.filter(c => c.tipo_campanha === 'primeira_compra').length,
      ativo: clients.filter(c => c.tipo_campanha === 'ativo').length,
      inativo: clients.filter(c => c.tipo_campanha === 'inativo').length,
    };
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (selectedTypes.length === 0) {
      return clients;
    }
    return clients.filter(c => c.tipo_campanha && selectedTypes.includes(c.tipo_campanha as CampaignType));
  }, [clients, selectedTypes]);

  return {
    clients,
    filteredClients,
    clientCounts,
    isLoading,
    selectedTypes,
    setSelectedTypes,
    refetch: fetchClients,
  };
}
