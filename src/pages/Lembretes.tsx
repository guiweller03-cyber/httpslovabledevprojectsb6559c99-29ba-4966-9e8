import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Bell, Filter, Send, CheckCircle, AlertTriangle, Syringe, Bug, Phone, Calendar, User, Dog, Pill, RefreshCw, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, differenceInDays, addMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

// Types
export type ReminderType = 'vacina' | 'antipulgas' | 'vermifugo';
export type ReminderStatus = 'valido' | 'a_vencer' | 'vencido';

export interface HealthReminder {
  id: string;
  petId: string;
  petName: string;
  petBreed: string | null;
  clientId: string;
  clientName: string;
  clientWhatsapp: string;
  type: ReminderType;
  description: string;
  expirationDate: Date;
  daysRemaining: number;
  status: ReminderStatus;
}

interface PetHealthDB {
  id: string;
  pet_id: string;
  vaccine_name: string | null;
  vaccine_valid_until: string | null;
  vaccine_type: string | null;
  vaccine_applied_at: string | null;
  vaccine_validity_months: number | null;
  antipulgas_valid_until: string | null;
  antiparasitic_type: string | null;
  antiparasitic_applied_at: string | null;
  antiparasitic_validity_days: number | null;
  vermifuge_type: string | null;
  vermifuge_applied_at: string | null;
  vermifuge_valid_until: string | null;
  vermifuge_validity_days: number | null;
}

interface PetDB {
  id: string;
  name: string;
  breed: string | null;
  client_id: string;
}

interface ClientDB {
  id: string;
  name: string;
  whatsapp: string;
}

const Lembretes = () => {
  const [reminders, setReminders] = useState<HealthReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [pets, setPets] = useState<PetDB[]>([]);
  const [petHealthRecords, setPetHealthRecords] = useState<PetHealthDB[]>([]);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<string>('30');

  // Fetch data from database
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [clientsRes, petsRes, healthRes] = await Promise.all([
        supabase.from('clients').select('id, name, whatsapp'),
        supabase.from('pets').select('id, name, breed, client_id'),
        supabase.from('pet_health').select('*'),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (petsRes.error) throw petsRes.error;
      if (healthRes.error) throw healthRes.error;

      setClients(clientsRes.data || []);
      setPets(petsRes.data || []);
      setPetHealthRecords((healthRes.data || []) as unknown as PetHealthDB[]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de saúde');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Generate reminders from health records
  useEffect(() => {
    const today = new Date();
    const generatedReminders: HealthReminder[] = [];

    petHealthRecords.forEach(health => {
      const pet = pets.find(p => p.id === health.pet_id);
      if (!pet) return;
      
      const client = clients.find(c => c.id === pet.client_id);
      if (!client) return;

      // Calculate vaccine reminder
      if (health.vaccine_valid_until) {
        const expDate = new Date(health.vaccine_valid_until);
        const daysRemaining = differenceInDays(expDate, today);
        const status: ReminderStatus = daysRemaining < 0 ? 'vencido' : daysRemaining <= 30 ? 'a_vencer' : 'valido';
        
        if (status !== 'valido') {
          generatedReminders.push({
            id: `vaccine-${health.id}`,
            petId: pet.id,
            petName: pet.name,
            petBreed: pet.breed,
            clientId: client.id,
            clientName: client.name,
            clientWhatsapp: client.whatsapp,
            type: 'vacina',
            description: health.vaccine_name || health.vaccine_type || 'Vacina',
            expirationDate: expDate,
            daysRemaining,
            status,
          });
        }
      }

      // Calculate antipulgas reminder
      if (health.antipulgas_valid_until) {
        const expDate = new Date(health.antipulgas_valid_until);
        const daysRemaining = differenceInDays(expDate, today);
        const status: ReminderStatus = daysRemaining < 0 ? 'vencido' : daysRemaining <= 30 ? 'a_vencer' : 'valido';
        
        if (status !== 'valido') {
          generatedReminders.push({
            id: `antipulgas-${health.id}`,
            petId: pet.id,
            petName: pet.name,
            petBreed: pet.breed,
            clientId: client.id,
            clientName: client.name,
            clientWhatsapp: client.whatsapp,
            type: 'antipulgas',
            description: health.antiparasitic_type || 'Antipulgas',
            expirationDate: expDate,
            daysRemaining,
            status,
          });
        }
      }

      // Calculate vermifuge reminder
      if (health.vermifuge_valid_until) {
        const expDate = new Date(health.vermifuge_valid_until);
        const daysRemaining = differenceInDays(expDate, today);
        const status: ReminderStatus = daysRemaining < 0 ? 'vencido' : daysRemaining <= 30 ? 'a_vencer' : 'valido';
        
        if (status !== 'valido') {
          generatedReminders.push({
            id: `vermifuge-${health.id}`,
            petId: pet.id,
            petName: pet.name,
            petBreed: pet.breed,
            clientId: client.id,
            clientName: client.name,
            clientWhatsapp: client.whatsapp,
            type: 'vermifugo',
            description: health.vermifuge_type || 'Vermífugo',
            expirationDate: expDate,
            daysRemaining,
            status,
          });
        }
      }
    });

    // Sort by days remaining (most urgent first)
    generatedReminders.sort((a, b) => a.daysRemaining - b.daysRemaining);
    setReminders(generatedReminders);
  }, [petHealthRecords, pets, clients]);

  // Filtered reminders
  const filteredReminders = useMemo(() => {
    return reminders.filter(reminder => {
      if (typeFilter !== 'all' && reminder.type !== typeFilter) return false;
      if (statusFilter !== 'all' && reminder.status !== statusFilter) return false;
      
      if (daysFilter !== 'all') {
        const days = parseInt(daysFilter);
        if (reminder.daysRemaining > days) return false;
      }
      
      return true;
    });
  }, [reminders, typeFilter, statusFilter, daysFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: reminders.length,
    urgent: reminders.filter(r => r.daysRemaining <= 7).length,
    aVencer: reminders.filter(r => r.status === 'a_vencer').length,
    vencidos: reminders.filter(r => r.status === 'vencido').length,
  }), [reminders]);

  // Export data for n8n
  const handleExportForN8n = () => {
    const exportData = filteredReminders.map(r => ({
      nome_tutor: r.clientName,
      telefone_tutor: r.clientWhatsapp,
      nome_pet: r.petName,
      raca_pet: r.petBreed,
      tipo: r.type,
      descricao: r.description,
      data_vencimento: format(r.expirationDate, 'yyyy-MM-dd'),
      dias_para_vencer: r.daysRemaining,
      status: r.status,
    }));
    
    console.log('📤 Dados para n8n:', JSON.stringify(exportData, null, 2));
    
    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast.success(`${exportData.length} lembretes copiados para a área de transferência`);
  };

  // Send single reminder to n8n webhook
  const handleSendToN8n = async (reminder: HealthReminder) => {
    const webhookPayload = {
      event: 'lembrete_sanitario',
      data: {
        nome_tutor: reminder.clientName,
        telefone_tutor: reminder.clientWhatsapp,
        nome_pet: reminder.petName,
        raca_pet: reminder.petBreed,
        tipo: reminder.type,
        descricao: reminder.description,
        data_vencimento: format(reminder.expirationDate, 'yyyy-MM-dd'),
        dias_para_vencer: reminder.daysRemaining,
        status: reminder.status,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Webhook Lembrete Sanitário:', webhookPayload);
    toast.success(`Dados enviados para n8n: ${reminder.clientName} - ${reminder.petName}`);
  };

  // Status badge
  const getStatusBadge = (status: ReminderStatus) => {
    switch (status) {
      case 'valido':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Válido</Badge>;
      case 'a_vencer':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">A Vencer</Badge>;
      case 'vencido':
        return <Badge variant="destructive">Vencido</Badge>;
    }
  };

  // Type icon
  const getTypeIcon = (type: ReminderType) => {
    switch (type) {
      case 'vacina':
        return <Syringe className="w-4 h-4 text-blue-500" />;
      case 'antipulgas':
        return <Bug className="w-4 h-4 text-orange-500" />;
      case 'vermifugo':
        return <Pill className="w-4 h-4 text-purple-500" />;
    }
  };

  // Days remaining badge
  const getDaysRemainingBadge = (days: number) => {
    if (days < 0) {
      return <Badge variant="destructive">Vencido há {Math.abs(days)} dias</Badge>;
    }
    if (days <= 7) {
      return <Badge variant="destructive">{days} dias</Badge>;
    }
    if (days <= 15) {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">{days} dias</Badge>;
    }
    return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">{days} dias</Badge>;
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
            <Bell className="w-8 h-8 text-primary" />
            Central de Lembretes
          </h1>
          <p className="text-muted-foreground mt-1">
            Vacinas, antipulgas e vermífugos a vencer ou vencidos — dados prontos para n8n
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={handleExportForN8n} disabled={filteredReminders.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar ({filteredReminders.length})
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total de Lembretes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.urgent}</p>
                  <p className="text-sm text-muted-foreground">Urgentes (≤7 dias)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.aVencer}</p>
                  <p className="text-sm text-muted-foreground">A Vencer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.vencidos}</p>
                  <p className="text-sm text-muted-foreground">Vencidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Tipo</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="vacina">Vacina</SelectItem>
                  <SelectItem value="antipulgas">Antipulgas</SelectItem>
                  <SelectItem value="vermifugo">Vermífugo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="a_vencer">A Vencer</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Dias Restantes</label>
              <Select value={daysFilter} onValueChange={setDaysFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="7">Até 7 dias</SelectItem>
                  <SelectItem value="15">Até 15 dias</SelectItem>
                  <SelectItem value="30">Até 30 dias</SelectItem>
                  <SelectItem value="60">Até 60 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminders Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Lista de Lembretes ({filteredReminders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum lembrete encontrado</p>
              <p className="text-sm mt-1">Cadastre dados sanitários nos pets para gerar lembretes</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Tutor</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReminders.map((reminder) => (
                    <TableRow key={reminder.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{reminder.clientName}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {reminder.clientWhatsapp}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dog className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{reminder.petName}</p>
                            <p className="text-xs text-muted-foreground">{reminder.petBreed || 'N/A'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(reminder.type)}
                          <span className="capitalize">{reminder.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{reminder.description}</span>
                      </TableCell>
                      <TableCell>
                        {format(reminder.expirationDate, 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {getDaysRemainingBadge(reminder.daysRemaining)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(reminder.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendToN8n(reminder)}
                          title="Enviar para n8n"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
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
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Integração com n8n</h4>
              <p className="text-sm text-muted-foreground">
                Os dados desta tela estão prontos para consumo via n8n + OpenAI. 
                Use o botão "Exportar" para copiar os dados estruturados ou clique no ícone de envio 
                para disparar um webhook individual. O sistema <strong>não gera mensagens</strong> — 
                isso é responsabilidade do fluxo externo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Lembretes;
