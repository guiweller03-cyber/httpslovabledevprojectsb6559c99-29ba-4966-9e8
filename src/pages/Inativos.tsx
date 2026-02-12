import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { UserX, Calendar, ShoppingBag, Send, Filter, CheckSquare, Square, RefreshCw, Download, Phone, Dog, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const inactivityPeriods = [
  { value: '30', label: '30 dias' },
  { value: '50', label: '50 dias' },
  { value: '60', label: '60 dias' },
  { value: '90', label: '90 dias' },
];

interface ClientDB {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  created_at: string | null;
  last_purchase: string | null;
  last_interaction: string | null;
}

interface PetDB {
  id: string;
  name: string;
  client_id: string;
}

interface InactiveClient {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  lastPurchase: Date | null;
  daysSinceLastPurchase: number;
  pets: string[];
}



const Inativos = () => {
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [pets, setPets] = useState<PetDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);

  // Fetch data from database
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch clients with their last payment dates from appointments and hotel stays
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (clientsError) throw clientsError;

      // Fetch all paid appointments
      const { data: appointmentsData } = await supabase
        .from('bath_grooming_appointments')
        .select('client_id, paid_at')
        .eq('payment_status', 'pago')
        .not('paid_at', 'is', null);

      // Fetch all paid hotel stays
      const { data: hotelData } = await supabase
        .from('hotel_stays')
        .select('client_id, paid_at')
        .eq('payment_status', 'pago')
        .not('paid_at', 'is', null);

      // Fetch pets
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('id, name, client_id');

      if (petsError) throw petsError;

      // Calculate last purchase for each client
      const clientLastPurchase: Record<string, Date> = {};
      
      (appointmentsData || []).forEach(apt => {
        if (apt.paid_at) {
          const date = new Date(apt.paid_at);
          if (!clientLastPurchase[apt.client_id] || date > clientLastPurchase[apt.client_id]) {
            clientLastPurchase[apt.client_id] = date;
          }
        }
      });

      (hotelData || []).forEach(stay => {
        if (stay.paid_at) {
          const date = new Date(stay.paid_at);
          if (!clientLastPurchase[stay.client_id] || date > clientLastPurchase[stay.client_id]) {
            clientLastPurchase[stay.client_id] = date;
          }
        }
      });

      // Update clients with calculated last_purchase
      const updatedClients = (clientsData || []).map(client => ({
        ...client,
        last_purchase: clientLastPurchase[client.id]?.toISOString() || client.last_purchase,
      }));

      setClients(updatedClients);
      setPets(petsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate inactive clients
  const inactiveClients = useMemo((): InactiveClient[] => {
    const today = new Date();
    const periodDays = parseInt(period);

    return clients
      .map(client => {
        const lastPurchase = client.last_purchase ? new Date(client.last_purchase) : null;
        const daysSince = lastPurchase ? differenceInDays(today, lastPurchase) : Infinity;
        const clientPets = pets.filter(p => p.client_id === client.id).map(p => p.name);

        return {
          id: client.id,
          name: client.name,
          whatsapp: client.whatsapp,
          email: client.email,
          lastPurchase,
          daysSinceLastPurchase: daysSince === Infinity ? -1 : daysSince,
          pets: clientPets,
        };
      })
      .filter(client => client.daysSinceLastPurchase >= periodDays || client.daysSinceLastPurchase === -1)
      .sort((a, b) => {
        // Never purchased first, then by days since last purchase
        if (a.daysSinceLastPurchase === -1) return -1;
        if (b.daysSinceLastPurchase === -1) return 1;
        return b.daysSinceLastPurchase - a.daysSinceLastPurchase;
      });
  }, [clients, pets, period]);

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleAll = () => {
    if (selectedClients.length === inactiveClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(inactiveClients.map(c => c.id));
    }
  };

  // Export data for n8n
  const handleExportForN8n = () => {
    const dataToExport = selectedClients.length > 0 
      ? inactiveClients.filter(c => selectedClients.includes(c.id))
      : inactiveClients;

    const exportData = dataToExport.map(c => ({
      nome_tutor: c.name,
      telefone_tutor: c.whatsapp,
      email: c.email,
      nome_pet: c.pets.join(', ') || 'Nenhum pet cadastrado',
      ultima_data_compra: c.lastPurchase ? format(c.lastPurchase, 'yyyy-MM-dd') : null,
      dias_sem_compra: c.daysSinceLastPurchase === -1 ? 'Nunca comprou' : c.daysSinceLastPurchase,
    }));
    
    console.log('📤 Dados para n8n:', JSON.stringify(exportData, null, 2));
    
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast.success(`${exportData.length} clientes copiados para a área de transferência`);
  };

  // Send campaign to n8n via webhook
  const handleSendCampaign = async () => {
    if (selectedClients.length === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }

    setIsSendingCampaign(true);

    try {
      // Get full client data including pets
      const selectedClientData = inactiveClients.filter(c => selectedClients.includes(c.id));
      
      // Build payload with all client information
      const payload = {
        clientes: selectedClientData.map(c => ({
          nome: c.name,
          whatsapp: c.whatsapp,
          email: c.email,
          pets: c.pets,
          ultima_compra: c.lastPurchase ? format(c.lastPurchase, 'yyyy-MM-dd') : null,
          dias_inativo: c.daysSinceLastPurchase === -1 ? null : c.daysSinceLastPurchase,
        })),
      };

      console.log('📤 Enviando webhook para n8n via edge function:', payload);

      const { data, error } = await supabase.functions.invoke('send-campaign-webhook', {
        body: payload,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao enviar webhook');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido');
      }

      toast.success(`Campanha enviada com sucesso! ${selectedClients.length} cliente(s) enviados.`);
      setSelectedClients([]);
    } catch (error) {
      console.error('Erro ao enviar campanha:', error);
      toast.error('Erro ao enviar campanha. Verifique o console para mais detalhes.');
    } finally {
      setIsSendingCampaign(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <UserX className="w-8 h-8 text-primary" />
            Clientes Inativos
          </h1>
          <p className="text-muted-foreground mt-1">
            Clientes sem compras registradas — dados prontos para reativação via n8n
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {inactivityPeriods.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleExportForN8n}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button 
            onClick={handleSendCampaign}
            disabled={selectedClients.length === 0 || isSendingCampaign}
          >
            {isSendingCampaign ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isSendingCampaign ? 'Enviando...' : `Campanha (${selectedClients.length})`}
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <UserX className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{inactiveClients.length}</p>
                  <p className="text-sm text-muted-foreground">Inativos há +{period} dias</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <ShoppingBag className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {inactiveClients.filter(c => c.daysSinceLastPurchase === -1).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Nunca compraram</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <CheckSquare className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{selectedClients.length}</p>
                  <p className="text-sm text-muted-foreground">Selecionados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Client List */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            Lista de Inativos ({inactiveClients.length})
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={toggleAll}>
            {selectedClients.length === inactiveClients.length ? (
              <>
                <CheckSquare className="w-4 h-4 mr-2" />
                Desmarcar Todos
              </>
            ) : (
              <>
                <Square className="w-4 h-4 mr-2" />
                Selecionar Todos
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : inactiveClients.length === 0 ? (
            <div className="text-center py-12">
              <UserX className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum cliente inativo encontrado para este período! 🎉
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Pets</TableHead>
                    <TableHead>Última Compra</TableHead>
                    <TableHead>Dias Sem Compra</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveClients.map((client) => (
                    <TableRow 
                      key={client.id} 
                      className={`hover:bg-muted/30 cursor-pointer ${
                        selectedClients.includes(client.id) ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => toggleClient(client.id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedClients.includes(client.id)}
                          onCheckedChange={() => toggleClient(client.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground font-bold text-sm">
                            {client.name.charAt(0)}
                          </div>
                          <span className="font-medium">{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {client.whatsapp}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.pets.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <Dog className="w-4 h-4 text-muted-foreground" />
                            <span>{client.pets.join(', ')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Nenhum</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.lastPurchase ? (
                          format(client.lastPurchase, 'dd/MM/yyyy', { locale: ptBR })
                        ) : (
                          <span className="text-muted-foreground">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.daysSinceLastPurchase === -1 ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            Nunca comprou
                          </Badge>
                        ) : (
                          <Badge variant={client.daysSinceLastPurchase > 60 ? 'destructive' : 'outline'}>
                            {client.daysSinceLastPurchase} dias
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir <strong>{client.name}</strong>? Esta ação também removerá todos os pets associados e não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={async () => {
                                  // Delete pets first, then client
                                  await supabase.from('pets').delete().eq('client_id', client.id);
                                  const { error } = await supabase.from('clients').delete().eq('id', client.id);
                                  if (error) {
                                    toast.error('Erro ao excluir cliente');
                                  } else {
                                    toast.success(`${client.name} foi excluído`);
                                    setSelectedClients(prev => prev.filter(id => id !== client.id));
                                    fetchData();
                                  }
                                }}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Integração com n8n</h4>
              <p className="text-sm text-muted-foreground">
                Os dados desta tela estão prontos para consumo via n8n + OpenAI. 
                Selecione os clientes desejados e clique em "Campanha" para disparar o webhook, 
                ou use "Exportar" para copiar os dados estruturados. O sistema <strong>não envia mensagens</strong> — 
                isso é responsabilidade do fluxo n8n externo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inativos;
