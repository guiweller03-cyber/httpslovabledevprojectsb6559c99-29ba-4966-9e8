import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  CheckCircle2, 
  Bell, 
  Printer,
  Clock,
  Dog,
  Scissors,
  Droplets,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Appointment {
  id: string;
  client_id: string;
  pet_id: string;
  service_type: string;
  grooming_type: string | null;
  start_datetime: string;
  end_datetime: string;
  price: number | null;
  status: string | null;
  notes: string | null;
  optional_services: string[] | null;
}

interface Client {
  id: string;
  name: string;
  whatsapp: string;
}

interface Pet {
  id: string;
  client_id: string;
  name: string;
  breed: string | null;
  size: string | null;
  coat_type: string | null;
}

interface ServiceAddon {
  id: string;
  name: string;
  price: number;
}

const groomingTypeLabels: Record<string, string> = {
  banho: 'Apenas Banho',
  banho_tosa: 'Banho + Tosa',
  tosa_baby: 'Tosa Baby',
  tosa_higienica: 'Tosa Higiênica',
  tosa_padrao: 'Tosa Padrão da Raça',
  tosa_tesoura: 'Tosa Tesoura',
  tosa_maquina: 'Tosa Máquina',
};

const sizeLabels: Record<string, string> = {
  pequeno: 'Pequeno',
  medio: 'Médio',
  grande: 'Grande',
};

const coatTypeLabels: Record<string, string> = {
  curto: 'Curto',
  medio: 'Médio',
  longo: 'Longo',
};

const statusColors: Record<string, string> = {
  agendado: 'bg-blue-500',
  em_atendimento: 'bg-amber-500',
  pronto: 'bg-green-500',
  finalizado: 'bg-gray-500',
};

const statusLabels: Record<string, string> = {
  agendado: 'Agendado',
  em_atendimento: 'Em Atendimento',
  pronto: 'Pronto',
  finalizado: 'Finalizado',
};

export default function ServicosDoDia() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    const startOfDay = `${todayStr}T00:00:00`;
    const endOfDay = `${todayStr}T23:59:59`;

    const [appointmentsRes, clientsRes, petsRes, addonsRes] = await Promise.all([
      supabase
        .from('bath_grooming_appointments')
        .select('*')
        .gte('start_datetime', startOfDay)
        .lte('start_datetime', endOfDay)
        .neq('status', 'cancelado')
        .order('start_datetime', { ascending: true }),
      supabase.from('clients').select('*'),
      supabase.from('pets').select('*'),
      supabase.from('service_addons').select('*').eq('active', true),
    ]);

    if (appointmentsRes.data) setAppointments(appointmentsRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    if (petsRes.data) setPets(petsRes.data);
    if (addonsRes.data) setAddons(addonsRes.data);
    
    setIsLoading(false);
  };

  const getClient = (clientId: string) => clients.find(c => c.id === clientId);
  const getPet = (petId: string) => pets.find(p => p.id === petId);
  
  const getAddonNames = (addonIds: string[] | null) => {
    if (!addonIds || addonIds.length === 0) return [];
    return addonIds
      .map(id => addons.find(a => a.id === id)?.name)
      .filter(Boolean) as string[];
  };

  const handleMarkFinished = async (appointment: Appointment) => {
    // Atualizar o status do serviço para finalizado
    // O pagamento continua PENDENTE até ser registrado no caixa
    const { error } = await supabase
      .from('bath_grooming_appointments')
      .update({ status: 'finalizado' })
      .eq('id', appointment.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
      return;
    }

    setAppointments(prev => 
      prev.map(apt => apt.id === appointment.id ? { ...apt, status: 'finalizado' } : apt)
    );

    const pet = getPet(appointment.pet_id);
    const client = getClient(appointment.client_id);
    
    toast({
      title: "✅ Serviço Finalizado!",
      description: `${pet?.name} está pronto. Abrindo caixa para cobrança...`,
    });

    // Redirecionar automaticamente para o caixa com cliente e pet pré-selecionados
    navigate(`/caixa?clientId=${appointment.client_id}&petId=${appointment.pet_id}`);
  };

  const handlePetReady = async (appointment: Appointment) => {
    const { error } = await supabase
      .from('bath_grooming_appointments')
      .update({ status: 'pronto' })
      .eq('id', appointment.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
      return;
    }

    setAppointments(prev => 
      prev.map(apt => apt.id === appointment.id ? { ...apt, status: 'pronto' } : apt)
    );

    const client = getClient(appointment.client_id);
    const pet = getPet(appointment.pet_id);

    // TODO: Webhook n8n for WhatsApp
    toast({
      title: "🔔 Pet Pronto!",
      description: `Aviso enviado para ${client?.name} sobre ${pet?.name}.`,
    });
  };

  const handlePrint = () => {
    const printContent = document.getElementById('print-area');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Serviços do Dia - ${format(today, 'dd/MM/yyyy')}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            .service { 
              border: 1px solid #ccc; 
              padding: 15px; 
              margin-bottom: 10px; 
              page-break-inside: avoid;
            }
            .service-header { 
              display: flex; 
              justify-content: space-between; 
              border-bottom: 1px solid #eee; 
              padding-bottom: 10px; 
              margin-bottom: 10px;
            }
            .checkbox { 
              width: 20px; 
              height: 20px; 
              border: 2px solid #333; 
              display: inline-block;
              margin-right: 10px;
            }
            .info { margin: 5px 0; }
            .addons { font-size: 0.9em; color: #666; }
            .notes { font-style: italic; background: #f5f5f5; padding: 8px; margin-top: 10px; }
            @media print {
              body { padding: 0; }
              .service { border: 1px solid #999; }
            }
          </style>
        </head>
        <body>
          <h1>🐾 Serviços do Dia - ${format(today, 'dd/MM/yyyy', { locale: ptBR })}</h1>
          ${appointments.filter(a => a.status !== 'finalizado').map(apt => {
            const pet = getPet(apt.pet_id);
            const client = getClient(apt.client_id);
            const addonsList = getAddonNames(apt.optional_services);
            return `
              <div class="service">
                <div class="service-header">
                  <span><span class="checkbox"></span><strong>${format(new Date(apt.start_datetime), 'HH:mm')}</strong></span>
                  <span>${statusLabels[apt.status || 'agendado']}</span>
                </div>
                <div class="info"><strong>Pet:</strong> ${pet?.name || 'N/A'}</div>
                <div class="info"><strong>Cliente:</strong> ${client?.name || 'N/A'}</div>
                <div class="info"><strong>Raça:</strong> ${pet?.breed || 'N/A'}</div>
                <div class="info"><strong>Porte:</strong> ${sizeLabels[pet?.size || ''] || 'N/A'} | <strong>Pelo:</strong> ${coatTypeLabels[pet?.coat_type || ''] || 'N/A'}</div>
                <div class="info"><strong>Serviço:</strong> ${apt.service_type === 'banho' ? 'Banho' : 'Banho + Tosa'}</div>
                <div class="info"><strong>Tipo de Tosa:</strong> ${groomingTypeLabels[apt.grooming_type || ''] || 'Apenas Banho'}</div>
                ${addonsList.length > 0 ? `<div class="addons"><strong>Adicionais:</strong> ${addonsList.join(', ')}</div>` : ''}
                ${apt.notes ? `<div class="notes"><strong>Obs:</strong> ${apt.notes}</div>` : ''}
              </div>
            `;
          }).join('')}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const activeAppointments = appointments.filter(a => a.status !== 'finalizado');
  const finishedAppointments = appointments.filter(a => a.status === 'finalizado');

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-primary" />
              Serviços do Dia
            </h1>
            <p className="text-muted-foreground mt-1">
              {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })} - {activeAppointments.length} serviço(s) pendente(s)
            </p>
          </div>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir Serviços
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-4 mb-8"
      >
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {appointments.filter(a => a.status === 'agendado').length}
            </p>
            <p className="text-sm text-muted-foreground">Agendados</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {appointments.filter(a => a.status === 'em_atendimento').length}
            </p>
            <p className="text-sm text-muted-foreground">Em Atendimento</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {appointments.filter(a => a.status === 'pronto').length}
            </p>
            <p className="text-sm text-muted-foreground">Prontos</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-500/10 border-gray-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">
              {finishedAppointments.length}
            </p>
            <p className="text-sm text-muted-foreground">Finalizados</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Services List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        id="print-area"
        ref={printRef}
      >
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Carregando serviços...
            </CardContent>
          </Card>
        ) : activeAppointments.length === 0 && finishedAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Dog className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum serviço agendado para hoje.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Active Services */}
            {activeAppointments.map((apt, index) => {
              const pet = getPet(apt.pet_id);
              const client = getClient(apt.client_id);
              const addonsList = getAddonNames(apt.optional_services);

              return (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-l-4" style={{ borderLeftColor: apt.status === 'pronto' ? '#22c55e' : apt.status === 'em_atendimento' ? '#f59e0b' : '#3b82f6' }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2 text-lg font-semibold">
                              <Clock className="w-5 h-5 text-muted-foreground" />
                              {format(new Date(apt.start_datetime), 'HH:mm')}
                            </div>
                            <Badge className={statusColors[apt.status || 'agendado']}>
                              {statusLabels[apt.status || 'agendado']}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Pet</p>
                              <p className="font-semibold flex items-center gap-1">
                                <Dog className="w-4 h-4" />
                                {pet?.name || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Cliente</p>
                              <p className="font-semibold">{client?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Raça</p>
                              <p className="font-semibold">{pet?.breed || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Porte / Pelo</p>
                              <p className="font-semibold">
                                {sizeLabels[pet?.size || ''] || 'N/A'} / {coatTypeLabels[pet?.coat_type || ''] || 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                            <div>
                              <p className="text-muted-foreground">Serviço</p>
                              <p className="font-semibold flex items-center gap-1">
                                {apt.service_type === 'banho' ? (
                                  <><Droplets className="w-4 h-4" /> Banho</>
                                ) : (
                                  <><Scissors className="w-4 h-4" /> Banho + Tosa</>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Tipo de Tosa</p>
                              <p className="font-semibold">
                                {groomingTypeLabels[apt.grooming_type || ''] || 'Apenas Banho'}
                              </p>
                            </div>
                            {addonsList.length > 0 && (
                              <div className="col-span-2">
                                <p className="text-muted-foreground">Adicionais</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {addonsList.map((name, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {apt.notes && (
                            <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                              <span className="text-muted-foreground">Obs:</span> {apt.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleMarkFinished(apt)}
                            disabled={apt.status === 'finalizado'}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Finalizar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePetReady(apt)}
                            disabled={apt.status === 'pronto' || apt.status === 'finalizado'}
                          >
                            <Bell className="w-4 h-4 mr-1" />
                            Pet Pronto
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {/* Finished Services */}
            {finishedAppointments.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-muted-foreground mb-4">
                  ✅ Finalizados Hoje ({finishedAppointments.length})
                </h2>
                <div className="space-y-2">
                  {finishedAppointments.map(apt => {
                    const pet = getPet(apt.pet_id);
                    const client = getClient(apt.client_id);
                    return (
                      <Card key={apt.id} className="bg-muted/30 border-muted">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              {format(new Date(apt.start_datetime), 'HH:mm')}
                            </span>
                            <span className="font-medium">{pet?.name}</span>
                            <span className="text-muted-foreground">({client?.name})</span>
                          </div>
                          <Badge variant="secondary">Finalizado</Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
