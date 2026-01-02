import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Bell, Filter, Send, CheckCircle, AlertTriangle, Syringe, Bug, Phone, Calendar, User, Dog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { mockClients, mockPets } from '@/data/mockData';

// Types
export type ReminderType = 'vacina' | 'antipulgas';
export type ReminderStatus = 'pendente' | 'avisado' | 'resolvido';
export type ImpactedService = 'hotelzinho' | 'creche';

export interface HealthReminder {
  id: string;
  clientId: string;
  petId: string;
  type: ReminderType;
  expirationDate: Date;
  daysRemaining: number;
  impactedServices: ImpactedService[];
  status: ReminderStatus;
  lastAction?: Date;
  createdAt: Date;
}

// Mock data for health info (would come from Pet in real system)
interface PetHealthInfo {
  petId: string;
  vaccineExpiration?: Date;
  fleaTreatmentExpiration?: Date;
}

// Generate mock health data
const mockHealthData: PetHealthInfo[] = mockPets.map((pet, index) => ({
  petId: pet.id,
  vaccineExpiration: addDays(new Date(), [5, 12, 25, 45, -3, 8, 60][index % 7]),
  fleaTreatmentExpiration: addDays(new Date(), [3, 18, 35, 7, -5, 22, 50][index % 7]),
}));

// Generate reminders based on health data
const generateReminders = (healthData: PetHealthInfo[], warningDays: number = 30): HealthReminder[] => {
  const reminders: HealthReminder[] = [];
  const today = new Date();

  healthData.forEach((health) => {
    const pet = mockPets.find(p => p.id === health.petId);
    if (!pet) return;

    // Check vaccine
    if (health.vaccineExpiration) {
      const daysRemaining = differenceInDays(health.vaccineExpiration, today);
      if (daysRemaining <= warningDays) {
        reminders.push({
          id: `vaccine-${health.petId}`,
          clientId: pet.clientId,
          petId: health.petId,
          type: 'vacina',
          expirationDate: health.vaccineExpiration,
          daysRemaining,
          impactedServices: ['hotelzinho', 'creche'],
          status: daysRemaining < 0 ? 'pendente' : 'pendente',
          createdAt: new Date(),
        });
      }
    }

    // Check flea treatment
    if (health.fleaTreatmentExpiration) {
      const daysRemaining = differenceInDays(health.fleaTreatmentExpiration, today);
      if (daysRemaining <= warningDays) {
        reminders.push({
          id: `flea-${health.petId}`,
          clientId: pet.clientId,
          petId: health.petId,
          type: 'antipulgas',
          expirationDate: health.fleaTreatmentExpiration,
          daysRemaining,
          impactedServices: ['hotelzinho', 'creche'],
          status: daysRemaining < 0 ? 'pendente' : 'pendente',
          createdAt: new Date(),
        });
      }
    }
  });

  return reminders.sort((a, b) => a.daysRemaining - b.daysRemaining);
};

const Lembretes = () => {
  const [reminders, setReminders] = useState<HealthReminder[]>(() => 
    generateReminders(mockHealthData, 30)
  );
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Helper functions
  const getClient = (clientId: string) => mockClients.find(c => c.id === clientId);
  const getPet = (petId: string) => mockPets.find(p => p.id === petId);

  // Filtered reminders
  const filteredReminders = useMemo(() => {
    return reminders.filter(reminder => {
      if (typeFilter !== 'all' && reminder.type !== typeFilter) return false;
      if (statusFilter !== 'all' && reminder.status !== statusFilter) return false;
      if (serviceFilter !== 'all' && !reminder.impactedServices.includes(serviceFilter as ImpactedService)) return false;
      
      if (daysFilter !== 'all') {
        const days = parseInt(daysFilter);
        if (reminder.daysRemaining > days) return false;
      }
      
      return true;
    });
  }, [reminders, typeFilter, daysFilter, serviceFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: reminders.length,
    urgent: reminders.filter(r => r.daysRemaining <= 7).length,
    pending: reminders.filter(r => r.status === 'pendente').length,
    expired: reminders.filter(r => r.daysRemaining < 0).length,
  }), [reminders]);

  // Send to n8n webhook
  const handleSendToN8n = async (reminder: HealthReminder) => {
    const client = getClient(reminder.clientId);
    const pet = getPet(reminder.petId);

    if (!client || !pet) {
      toast.error('Dados incompletos');
      return;
    }

    const webhookPayload = {
      event: 'lembrete_sanitario',
      data: {
        cliente: {
          id: client.id,
          nome: client.name,
          whatsapp: client.whatsapp,
        },
        pet: {
          id: pet.id,
          nome: pet.name,
          raca: pet.breed,
          porte: pet.size,
        },
        lembrete: {
          tipo: reminder.type,
          dataVencimento: reminder.expirationDate.toISOString(),
          diasRestantes: reminder.daysRemaining,
          servicosAfetados: reminder.impactedServices,
          status: reminder.status,
        },
      },
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Webhook Lembrete Sanitário:', webhookPayload);

    // Simulate webhook call
    try {
      // In production: await fetch(N8N_WEBHOOK_URL, { method: 'POST', body: JSON.stringify(webhookPayload) })
      
      setReminders(prev => prev.map(r => 
        r.id === reminder.id 
          ? { ...r, status: 'avisado' as ReminderStatus, lastAction: new Date() }
          : r
      ));
      
      toast.success(`Lembrete enviado para n8n`, {
        description: `${client.name} - ${pet.name} (${reminder.type})`,
      });
    } catch (error) {
      toast.error('Erro ao enviar webhook');
    }
  };

  // Mark as resolved
  const handleMarkResolved = (reminderId: string) => {
    setReminders(prev => prev.map(r => 
      r.id === reminderId 
        ? { ...r, status: 'resolvido' as ReminderStatus, lastAction: new Date() }
        : r
    ));
    toast.success('Lembrete marcado como resolvido');
  };

  // Status badge
  const getStatusBadge = (status: ReminderStatus) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pendente</Badge>;
      case 'avisado':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Avisado</Badge>;
      case 'resolvido':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Resolvido</Badge>;
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
    return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">{days} dias</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary" />
            Lembretes Sanitários
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle de vacinas e antipulgas para Hotelzinho e Creche
          </p>
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
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
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
                  <p className="text-2xl font-bold text-foreground">{stats.expired}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Serviço Impactado</label>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="hotelzinho">Hotelzinho</SelectItem>
                  <SelectItem value="creche">Creche</SelectItem>
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
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="avisado">Avisado</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
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
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pet</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Vence em</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Serviços</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Ação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReminders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum lembrete encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReminders.map((reminder) => {
                    const client = getClient(reminder.clientId);
                    const pet = getPet(reminder.petId);

                    return (
                      <TableRow key={reminder.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{client?.name || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {client?.whatsapp || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dog className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{pet?.name || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{pet?.breed}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {reminder.type === 'vacina' ? (
                              <Syringe className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Bug className="w-4 h-4 text-orange-500" />
                            )}
                            <span className="capitalize">{reminder.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(reminder.expirationDate, "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {getDaysRemainingBadge(reminder.daysRemaining)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {reminder.impactedServices.map(service => (
                              <Badge key={service} variant="secondary" className="text-xs capitalize">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(reminder.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {reminder.lastAction 
                            ? format(reminder.lastAction, "dd/MM HH:mm", { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {reminder.status !== 'resolvido' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSendToN8n(reminder)}
                                  className="gap-1"
                                  disabled={reminder.status === 'avisado'}
                                >
                                  <Send className="w-3 h-3" />
                                  n8n
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkResolved(reminder.id)}
                                  className="gap-1 text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Resolver
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Regras de Bloqueio</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ <strong>Banho & Tosa:</strong> Nunca bloqueia - apenas exibe alerta visual</li>
                <li>🚫 <strong>Hotelzinho / Creche:</strong> Bloqueia agendamento se vacina ou antipulgas estiverem vencidos</li>
                <li>📧 <strong>Mensagens:</strong> Todas as comunicações são enviadas exclusivamente via n8n + Z-API</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Lembretes;
