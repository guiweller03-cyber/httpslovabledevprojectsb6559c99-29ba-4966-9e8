import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
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
  DollarSign,
  GripVertical,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type KanbanStatus = 'espera' | 'banho' | 'secando' | 'tosa' | 'concluido';

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
  is_plan_usage?: boolean | null;
  kanban_status?: string | null;
  payment_status?: string | null;
  rota_buscar?: boolean | null;
  rota_entregar?: boolean | null;
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
  logistics_type?: string | null;
}

interface ServiceAddon {
  id: string;
  name: string;
  price: number;
}

const KANBAN_COLUMNS: { key: KanbanStatus; label: string; icon: string; color: string }[] = [
  { key: 'espera', label: 'Na Espera', icon: '🕒', color: 'bg-gray-100 border-gray-300' },
  { key: 'banho', label: 'No Banho', icon: '🚿', color: 'bg-blue-50 border-blue-300' },
  { key: 'secando', label: 'Secando', icon: '💨', color: 'bg-yellow-50 border-yellow-300' },
  { key: 'tosa', label: 'Na Tosa', icon: '✂️', color: 'bg-purple-50 border-purple-300' },
  { key: 'concluido', label: 'Concluído', icon: '✅', color: 'bg-green-50 border-green-300' },
];

const LOGISTICS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  tutor: { label: 'Tutor', color: 'bg-slate-500', icon: '🧑' },
  buscar: { label: 'Táxi Dog - Buscar', color: 'bg-yellow-500', icon: '🚗' },
  entregar: { label: 'Táxi Dog - Entregar', color: 'bg-purple-500', icon: '🚗' },
  buscar_entregar: { label: 'Táxi Dog - Buscar e Entregar', color: 'bg-orange-500', icon: '🚗🚗' },
};

const groomingTypeLabels: Record<string, string> = {
  banho: 'Apenas Banho',
  banho_tosa: 'Banho + Tosa',
  tosa_baby: 'Tosa Baby',
  tosa_higienica: 'Tosa Higiênica',
  tosa_padrao: 'Tosa Padrão da Raça',
  tosa_tesoura: 'Tosa Tesoura',
  tosa_maquina: 'Tosa Máquina',
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
  const [draggedCard, setDraggedCard] = useState<string | null>(null);

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
        .not('payment_status', 'in', '("pago","pago_antecipado","isento")')
        .order('start_datetime', { ascending: true }),
      supabase.from('clients').select('*'),
      supabase.from('pets').select('*'),
      supabase.from('service_addons').select('*').eq('active', true),
    ]);

    if (appointmentsRes.data) setAppointments(appointmentsRes.data as unknown as Appointment[]);
    if (clientsRes.data) setClients(clientsRes.data);
    if (petsRes.data) setPets(petsRes.data as unknown as Pet[]);
    if (addonsRes.data) setAddons(addonsRes.data);
    
    setIsLoading(false);
  };

  const getClient = (clientId: string) => clients.find(c => c.id === clientId);
  const getPet = (petId: string) => pets.find(p => p.id === petId);

  // Kanban functions
  const getCardsByStatus = (status: KanbanStatus): Appointment[] => {
    return appointments.filter(apt => (apt.kanban_status || 'espera') === status);
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: KanbanStatus) => {
    e.preventDefault();
    if (!draggedCard) return;

    const apt = appointments.find(a => a.id === draggedCard);
    if (!apt) return;

    const currentStatus = apt.kanban_status || 'espera';
    if (currentStatus === targetStatus) {
      setDraggedCard(null);
      return;
    }

    // Update in database
    const updateData: Record<string, any> = { kanban_status: targetStatus };
    
    // Record status changes
    if (targetStatus === 'concluido') {
      updateData.status = 'pronto';
      
      // Notify about plan vs avulso
      if (apt.is_plan_usage) {
        toast({
          title: "🟢 Concluído (PLANO)",
          description: "Desconto do plano já aplicado no agendamento.",
        });
      } else {
        toast({
          title: "🔵 Concluído (AVULSO)",
          description: "Serviço finalizado. Cobrança pendente.",
        });
      }
    }

    const { error } = await supabase
      .from('bath_grooming_appointments')
      .update(updateData)
      .eq('id', draggedCard);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    } else {
      // Update local state
      setAppointments(prev =>
        prev.map(a =>
          a.id === draggedCard ? { ...a, kanban_status: targetStatus, ...updateData } : a
        )
      );
    }

    setDraggedCard(null);
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
          ${appointments.filter(a => (a.kanban_status || 'espera') !== 'concluido').map(apt => {
            const pet = getPet(apt.pet_id);
            const client = getClient(apt.client_id);
            const planLabel = apt.is_plan_usage ? '[PLANO]' : '[AVULSO]';
            return `
              <div class="service">
                <div class="service-header">
                  <span><span class="checkbox"></span><strong>${format(new Date(apt.start_datetime), 'HH:mm')}</strong> ${planLabel}</span>
                  <span>${apt.kanban_status || 'espera'}</span>
                </div>
                <div class="info"><strong>Pet:</strong> ${pet?.name || 'N/A'}</div>
                <div class="info"><strong>Cliente:</strong> ${client?.name || 'N/A'}</div>
                <div class="info"><strong>Serviço:</strong> ${apt.service_type === 'banho' ? 'Banho' : 'Banho + Tosa'}</div>
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

  // Navigate to FrenteCaixa with appointment data
  const handleGoToCaixa = (apt: Appointment) => {
    navigate(`/caixa?appointmentId=${apt.id}`);
  };

  const handleFinalizarAtendimento = async (apt: Appointment) => {
    // Mark as completed and navigate to payment
    const { error } = await supabase
      .from('bath_grooming_appointments')
      .update({ 
        kanban_status: 'concluido',
        status: 'pronto'
      })
      .eq('id', apt.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o atendimento.",
        variant: "destructive",
      });
      return;
    }

    // Update local state
    setAppointments(prev =>
      prev.map(a =>
        a.id === apt.id ? { ...a, kanban_status: 'concluido', status: 'pronto' } : a
      )
    );

    toast({
      title: "Atendimento finalizado",
      description: "Redirecionando para o Frente de Caixa...",
    });

    // Navigate to FrenteCaixa
    navigate(`/caixa?appointmentId=${apt.id}`);
  };

  const KanbanCard = ({ apt }: { apt: Appointment }) => {
    const pet = getPet(apt.pet_id);
    const client = getClient(apt.client_id);
    const isCompleted = (apt.kanban_status || 'espera') === 'concluido';
    const isPaid = apt.payment_status === 'pago' || apt.payment_status === 'pago_antecipado' || apt.payment_status === 'isento';
    
    // Get logistics based on rota_buscar and rota_entregar flags
    const getLogistics = () => {
      const buscar = apt.rota_buscar;
      const entregar = apt.rota_entregar;
      
      if (buscar && entregar) return LOGISTICS_LABELS.buscar_entregar;
      if (buscar) return LOGISTICS_LABELS.buscar;
      if (entregar) return LOGISTICS_LABELS.entregar;
      return LOGISTICS_LABELS.tutor;
    };
    
    const logistics = getLogistics();
    const isTaxiDog = apt.rota_buscar || apt.rota_entregar;
    
    // Get grooming type label
    const getGroomingLabel = () => {
      if (apt.service_type === 'banho') return 'Banho';
      if (apt.grooming_type && groomingTypeLabels[apt.grooming_type]) {
        return groomingTypeLabels[apt.grooming_type];
      }
      return 'Banho + Tosa';
    };

    // Get selected addons from optional_services (excluding Táxi Dog as it's shown separately)
    const getSelectedAddons = () => {
      if (!apt.optional_services || apt.optional_services.length === 0) return [];
      return apt.optional_services
        .map(addonId => addons.find(a => a.id === addonId))
        .filter(addon => addon && !addon.name.toLowerCase().includes('táxi')) as ServiceAddon[];
    };

    const selectedAddons = getSelectedAddons();
    const hasTosa = apt.service_type === 'banho_tosa';
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        draggable={!isCompleted}
        onDragStart={(e) => !isCompleted && handleDragStart(e as any, apt.id)}
        className={cn(
          "p-3 rounded-lg border-2 bg-card shadow-sm hover:shadow-md transition-all",
          "border-l-4",
          apt.is_plan_usage ? "border-l-green-500" : "border-l-blue-500",
          !isCompleted && "cursor-grab active:cursor-grabbing"
        )}
      >
        <div className="flex items-start gap-2">
          {!isCompleted && (
            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
          )}
          {isCompleted && !isPaid && (
            <DollarSign className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Dog className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm truncate">{pet?.name || 'Pet'}</span>
              </div>
              <Badge 
                variant={apt.is_plan_usage ? "default" : "secondary"} 
                className={cn(
                  "text-xs",
                  apt.is_plan_usage ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600 text-white"
                )}
              >
                {apt.is_plan_usage ? '🟢 PLANO' : '🔵 AVULSO'}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <User className="w-3 h-3" /> {client?.name || 'Cliente'}
            </p>
            
            {/* Service type with grooming detail */}
            <div className="flex items-center gap-1 mb-1">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  hasTosa && "border-purple-400 bg-purple-50 text-purple-700"
                )}
              >
                {hasTosa && <Scissors className="w-3 h-3 mr-1" />}
                {getGroomingLabel()}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(parseISO(apt.start_datetime), 'HH:mm')}
              </span>
            </div>

            {/* Addons list - only show if there are addons */}
            {selectedAddons.length > 0 && (
              <div className="mt-1.5 p-1.5 bg-muted/50 rounded text-xs">
                <span className="text-muted-foreground font-medium">+ Adicionais:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedAddons.map(addon => (
                    <span 
                      key={addon.id} 
                      className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px]"
                    >
                      {addon.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Arrival / Logistics Info */}
            <div className="mt-2 p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground font-medium">Chegada:</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-white font-medium",
                  logistics.color
                )}>
                  {logistics.icon} {isTaxiDog ? 'Táxi Dog' : 'Tutor'}
                </span>
              </div>
              {isTaxiDog && (
                <div className="text-[10px] text-muted-foreground mt-0.5 pl-0.5">
                  {apt.rota_buscar && apt.rota_entregar ? 'Buscar + Entregar' : apt.rota_buscar ? 'Buscar' : 'Entregar'}
                </div>
              )}
            </div>
            
            {/* Action button - Finalizar Atendimento */}
            {!isCompleted && (
              <Button
                size="sm"
                className="w-full mt-3 bg-primary hover:bg-primary/90 gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFinalizarAtendimento(apt);
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Ir para pagamento
              </Button>
            )}

            {/* Payment status for completed items */}
            {isCompleted && !isPaid && (
              <Button
                size="sm"
                className="w-full mt-3 bg-green-600 hover:bg-green-700 gap-2 animate-pulse"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGoToCaixa(apt);
                }}
              >
                <DollarSign className="w-4 h-4" />
                💳 Cobrar agora
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const totalAgendados = appointments.length;
  const totalConcluidos = appointments.filter(a => (a.kanban_status || 'espera') === 'concluido').length;

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-primary" />
              Serviços em Andamento
            </h1>
            <p className="text-muted-foreground mt-1">
              {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })} — {totalAgendados - totalConcluidos} serviço(s) pendente(s)
            </p>
          </div>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </div>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span>PLANO</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span>AVULSO</span>
        </div>
        <div className="border-l mx-2"></div>
        {Object.entries(LOGISTICS_LABELS).map(([key, { label, color }]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span className={cn("w-3 h-3 rounded-full", color)}></span>
            <span className="text-xs">{label}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {KANBAN_COLUMNS.map(col => {
          const count = getCardsByStatus(col.key).length;
          return (
            <Card key={col.key} className="bg-muted/30">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{col.icon} {col.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Dog className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum serviço agendado para hoje.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-5 gap-4" id="print-area" ref={printRef}>
          {KANBAN_COLUMNS.map(column => {
            const cards = getCardsByStatus(column.key);
            return (
              <Card
                key={column.key}
                className={cn(
                  "min-h-[400px] border-2",
                  column.color
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.key)}
              >
                <CardHeader className="pb-2 px-3 py-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span>{column.icon}</span>
                    {column.label}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {cards.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-2 py-1">
                  {cards.length === 0 ? (
                    <p className="text-xs text-center text-muted-foreground py-4">
                      Arraste aqui
                    </p>
                  ) : (
                    cards.map(apt => (
                      <KanbanCard key={apt.id} apt={apt} />
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
