import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, UserX, UserPlus, Clock, Search, RefreshCw, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InactivitySettings } from '@/components/campaigns/InactivitySettings';

type ClientStatus = 'todos' | 'ativo' | 'inativo' | 'novo' | 'sem_compra';

interface ClientData {
  id: string;
  name: string;
  whatsapp: string;
  tipo_campanha: string | null;
  last_purchase: string | null;
  created_at: string | null;
}

interface ClientCounts {
  total: number;
  ativo: number;
  inativo: number;
  novo: number;
  sem_compra: number;
}

const STATUS_CONFIG: Record<ClientStatus, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  todos: { label: 'Todos', icon: Users, color: 'text-primary', bgColor: 'bg-primary/10' },
  ativo: { label: 'Ativos', icon: UserCheck, color: 'text-green-600', bgColor: 'bg-green-100' },
  inativo: { label: 'Inativos', icon: UserX, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  novo: { label: 'Novos', icon: UserPlus, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  sem_compra: { label: 'Nunca Compraram', icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export function ClientStatusSection() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ClientStatus>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, whatsapp, tipo_campanha, last_purchase, created_at')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients((data || []) as ClientData[]);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();

    // Realtime subscription
    const channel = supabase
      .channel('client-status-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, fetchClients)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, fetchClients)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const counts = useMemo<ClientCounts>(() => ({
    total: clients.length,
    ativo: clients.filter(c => c.tipo_campanha === 'ativo').length,
    inativo: clients.filter(c => c.tipo_campanha === 'inativo').length,
    novo: clients.filter(c => c.tipo_campanha === 'novo').length,
    sem_compra: clients.filter(c => c.tipo_campanha === 'sem_compra' || !c.tipo_campanha).length,
  }), [clients]);

  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Filter by status
    if (selectedStatus !== 'todos') {
      if (selectedStatus === 'sem_compra') {
        filtered = filtered.filter(c => c.tipo_campanha === 'sem_compra' || !c.tipo_campanha);
      } else {
        filtered = filtered.filter(c => c.tipo_campanha === selectedStatus);
      }
    }

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.whatsapp.includes(searchTerm)
      );
    }

    return filtered;
  }, [clients, selectedStatus, searchTerm]);

  const calculateDaysInactive = (lastPurchase: string | null): number | null => {
    if (!lastPurchase) return null;
    return differenceInDays(new Date(), parseISO(lastPurchase));
  };

  const formatLastPurchase = (lastPurchase: string | null): string => {
    if (!lastPurchase) return 'Nunca';
    return format(parseISO(lastPurchase), "dd/MM/yyyy", { locale: ptBR });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'ativo':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Ativo</Badge>;
      case 'inativo':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Inativo</Badge>;
      case 'novo':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Novo</Badge>;
      case 'sem_compra':
      default:
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Nunca Comprou</Badge>;
    }
  };

  const getDaysInactiveBadge = (days: number | null, status: string | null) => {
    if (days === null || status === 'sem_compra' || !status) return <span className="text-muted-foreground">—</span>;
    
    if (status === 'inativo') {
      return <Badge variant="outline" className="border-orange-300 text-orange-600">{days} dias</Badge>;
    }
    
    return <span className="text-muted-foreground">{days} dias</span>;
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await (supabase as any).rpc('recalculate_all_client_campaigns');
      await fetchClients();
    } catch (error) {
      console.error('Erro ao recalcular:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Status de Clientes
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            Recalcular
          </Button>
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <InactivitySettings onSettingsChange={fetchClients} />
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(Object.keys(STATUS_CONFIG) as ClientStatus[]).map((status) => {
          const config = STATUS_CONFIG[status];
          const count = status === 'todos' ? counts.total : counts[status];
          const isSelected = selectedStatus === status;

          return (
            <Card
              key={status}
              className={`cursor-pointer transition-all border-2 ${
                isSelected ? 'border-primary shadow-md' : 'border-transparent hover:border-muted'
              }`}
              onClick={() => setSelectedStatus(status)}
            >
              <CardContent className="p-4 text-center">
                <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center ${config.bgColor}`}>
                  <config.icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Table */}
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {STATUS_CONFIG[selectedStatus].label}
              <Badge variant="secondary">{filteredClients.length}</Badge>
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Compra</TableHead>
                  <TableHead>Dias Inativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => {
                    const daysInactive = calculateDaysInactive(client.last_purchase);
                    return (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.whatsapp}</TableCell>
                        <TableCell>{getStatusBadge(client.tipo_campanha)}</TableCell>
                        <TableCell>{formatLastPurchase(client.last_purchase)}</TableCell>
                        <TableCell>{getDaysInactiveBadge(daysInactive, client.tipo_campanha)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
