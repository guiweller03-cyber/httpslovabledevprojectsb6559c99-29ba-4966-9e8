import { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion } from 'framer-motion';
import { Plus, Scissors, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { sendCreateWebhook, sendUpdateWebhook, sendDeleteWebhook } from '@/lib/webhooks';

type AppointmentStatus = 'agendado' | 'em_atendimento' | 'pronto' | 'finalizado' | 'cancelado';

interface ClientDB {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
}

interface PetDB {
  id: string;
  client_id: string;
  name: string;
  species: string;
  breed: string | null;
  size: string | null;
  coat_type: string | null;
}

interface AppointmentDB {
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
  client_plan_id?: string | null;
  google_event_id?: string | null;
}

interface ServicePrice {
  id: string;
  breed: string;
  size_category: string;
  coat_type: string;
  service_type: string;
  price: number;
}

interface ServiceAddon {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

interface ClientPlan {
  id: string;
  client_id: string;
  pet_id: string;
  plan_id: string;
  service_type?: string | null;
  total_baths: number;
  used_baths: number;
  expires_at: string;
  active: boolean | null;
}

const statusColors: Record<AppointmentStatus, string> = {
  agendado: '#3b82f6',
  em_atendimento: '#f59e0b',
  pronto: '#22c55e',
  finalizado: '#9ca3af',
  cancelado: '#ef4444',
};

// Tipos de tosa profissionais (PADRÃO OFICIAL DO SISTEMA)
const GROOMING_TYPES = [
  { value: 'tosa_baby', label: 'Tosa Baby' },
  { value: 'tosa_higienica', label: 'Tosa Higiênica' },
  { value: 'tosa_padrao', label: 'Tosa Padrão da Raça' },
  { value: 'tosa_tesoura', label: 'Tosa Tesoura' },
  { value: 'tosa_maquina', label: 'Tosa Máquina' },
];

// Valores válidos de grooming_type aceitos pelo sistema
const VALID_GROOMING_VALUES = ['banho', 'banho_tosa', 'tosa_baby', 'tosa_higienica', 'tosa_padrao', 'tosa_tesoura', 'tosa_maquina'];

// Tipos de pelo
const COAT_TYPES = [
  { value: 'curto', label: 'Curto' },
  { value: 'medio', label: 'Médio' },
  { value: 'longo', label: 'Longo' },
];

// Portes
const SIZE_CATEGORIES = [
  { value: 'pequeno', label: 'Pequeno' },
  { value: 'medio', label: 'Médio' },
  { value: 'grande', label: 'Grande' },
];

const BanhoTosa = () => {
  const { toast } = useToast();
  const calendarRef = useRef<FullCalendar>(null);
  
  // State from database
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [pets, setPets] = useState<PetDB[]>([]);
  const [filteredPets, setFilteredPets] = useState<PetDB[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDB[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [serviceAddons, setServiceAddons] = useState<ServiceAddon[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDB | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Plan detection state
  const [activePlan, setActivePlan] = useState<ClientPlan | null>(null);
  const [isPlanUsage, setIsPlanUsage] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    clientId: '',
    petId: '',
    service: '',
    groomingType: '',
    coatType: '',
    size: '',
    datetime: '',
    notes: '',
    selectedAddons: [] as string[],
    responsavel: '' as 'tutor_tutor' | 'tutor_traxidog' | 'traxidog_tutor' | 'traxidog_traxidog' | '',
  });

  // Calculated price state
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [addonsTotal, setAddonsTotal] = useState<number>(0);
  const [taxiDogPrice, setTaxiDogPrice] = useState<number>(0);

  // Get Táxi Dog addon based on logistics option
  const getTaxiDogAddon = (responsavel: string) => {
    if (responsavel === 'tutor_traxidog') {
      // TraxiDog só entrega
      return serviceAddons.find(a => a.name.toLowerCase().includes('entregar') && !a.name.toLowerCase().includes('buscar'));
    } else if (responsavel === 'traxidog_tutor') {
      // TraxiDog só busca
      return serviceAddons.find(a => a.name.toLowerCase().includes('buscar') && !a.name.toLowerCase().includes('entregar'));
    } else if (responsavel === 'traxidog_traxidog') {
      // TraxiDog busca e entrega
      return serviceAddons.find(a => a.name.toLowerCase().includes('buscar') && a.name.toLowerCase().includes('entregar'));
    }
    return null;
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error) setClients(data || []);
  };

  const fetchPets = async () => {
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error) setPets(data || []);
  };

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('bath_grooming_appointments')
      .select('*')
      .order('start_datetime', { ascending: true });
    
    if (!error) setAppointments(data || []);
  };

  const fetchServicePrices = async () => {
    const { data, error } = await supabase
      .from('service_prices')
      .select('*');
    
    if (!error) setServicePrices(data || []);
  };

  const fetchServiceAddons = async () => {
    const { data, error } = await supabase
      .from('service_addons')
      .select('*')
      .eq('active', true);
    
    if (!error) setServiceAddons(data || []);
  };

  const fetchClientPlans = async () => {
    const { data, error } = await supabase
      .from('client_plans')
      .select('*')
      .eq('active', true);
    
    if (!error) setClientPlans(data as unknown as ClientPlan[] || []);
  };

  useEffect(() => {
    fetchClients();
    fetchPets();
    fetchAppointments();
    fetchServicePrices();
    fetchServiceAddons();
    fetchClientPlans();
  }, []);

  // Filter pets when client changes
  useEffect(() => {
    if (formData.clientId) {
      const clientPets = pets.filter(p => p.client_id === formData.clientId);
      setFilteredPets(clientPets);
      setFormData(prev => ({ 
        ...prev, 
        petId: '', 
        coatType: '',
        size: '',
        selectedAddons: [] 
      }));
      setCalculatedPrice(null);
      setBasePrice(0);
      setAddonsTotal(0);
      setActivePlan(null);
      setIsPlanUsage(false);
    } else {
      setFilteredPets([]);
    }
  }, [formData.clientId, pets]);

  // Check for active plan when pet is selected
  useEffect(() => {
    if (formData.petId) {
      const today = new Date();
      const plan = clientPlans.find(cp => 
        cp.pet_id === formData.petId &&
        (cp.service_type === 'banho_tosa' || !cp.service_type) &&
        cp.active === true &&
        new Date(cp.expires_at) > today &&
        (cp.total_baths - cp.used_baths) > 0
      );
      
      if (plan) {
        setActivePlan(plan);
        setIsPlanUsage(true);
        toast({
          title: "🟢 Plano Detectado!",
          description: `Pet possui plano com ${plan.total_baths - plan.used_baths} banhos restantes.`,
        });
      } else {
        setActivePlan(null);
        setIsPlanUsage(false);
      }
    } else {
      setActivePlan(null);
      setIsPlanUsage(false);
    }
  }, [formData.petId, clientPlans]);

  // Auto-fill pet characteristics when pet is selected
  useEffect(() => {
    if (formData.petId) {
      const pet = pets.find(p => p.id === formData.petId);
      if (pet) {
        setFormData(prev => ({
          ...prev,
          coatType: pet.coat_type || '',
          size: pet.size || '',
        }));
      }
    }
  }, [formData.petId, pets]);

  // Calculate price automatically based on size + coat type + service type
  useEffect(() => {
    if (formData.service && formData.size && formData.coatType) {
      const pet = pets.find(p => p.id === formData.petId);
      
      // Priority 1: Try to match by breed + coat_type + service_type
      let matchingPrice = servicePrices.find(sp => 
        pet?.breed &&
        sp.breed?.toLowerCase() === pet.breed.toLowerCase() &&
        sp.coat_type === formData.coatType &&
        sp.service_type === formData.service
      );
      
      // Priority 2: Match by size_category + coat_type + service_type
      if (!matchingPrice) {
        matchingPrice = servicePrices.find(sp => 
          sp.size_category === formData.size &&
          sp.coat_type === formData.coatType &&
          sp.service_type === formData.service
        );
      }
      
      // Priority 3: Match by size_category + service_type only
      if (!matchingPrice) {
        matchingPrice = servicePrices.find(sp => 
          sp.size_category === formData.size &&
          sp.service_type === formData.service
        );
      }

      if (matchingPrice) {
        setBasePrice(matchingPrice.price);
      } else {
        // Default prices based on size and service
        const sizeMultiplier = formData.size === 'pequeno' ? 1 : formData.size === 'medio' ? 1.3 : 1.6;
        const baseValue = formData.service === 'banho' ? 40 : 70;
        setBasePrice(Math.round(baseValue * sizeMultiplier));
      }
    } else {
      setBasePrice(0);
    }
  }, [formData.petId, formData.service, formData.size, formData.coatType, pets, servicePrices]);

  // Calculate addons total (excluding Táxi Dog - it's calculated separately)
  useEffect(() => {
    const taxiDogAddonIds = serviceAddons
      .filter(a => a.name.toLowerCase().includes('táxi') || a.name.toLowerCase().includes('taxi'))
      .map(a => a.id);
    
    const total = formData.selectedAddons
      .filter(addonId => !taxiDogAddonIds.includes(addonId))
      .reduce((acc, addonId) => {
        const addon = serviceAddons.find(a => a.id === addonId);
        return acc + (addon?.price || 0);
      }, 0);
    setAddonsTotal(total);
  }, [formData.selectedAddons, serviceAddons]);

  // Calculate Táxi Dog price based on logistics option
  useEffect(() => {
    const taxiAddon = getTaxiDogAddon(formData.responsavel);
    if (taxiAddon) {
      setTaxiDogPrice(taxiAddon.price);
    } else {
      setTaxiDogPrice(0);
    }
  }, [formData.responsavel, serviceAddons]);

  // Update calculated price
  useEffect(() => {
    if (basePrice > 0) {
      setCalculatedPrice(basePrice + addonsTotal + taxiDogPrice);
    } else {
      setCalculatedPrice(null);
    }
  }, [basePrice, addonsTotal, taxiDogPrice]);

  const toggleAddon = (addonId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedAddons: prev.selectedAddons.includes(addonId)
        ? prev.selectedAddons.filter(id => id !== addonId)
        : [...prev.selectedAddons, addonId]
    }));
  };

  // Service type colors for calendar border
  const serviceTypeColors: Record<string, string> = {
    banho: '#3b82f6',       // Blue for banho
    banho_tosa: '#eab308',  // Yellow for banho + tosa
  };

  // Filter out cancelled appointments from calendar (or show differently)
  const events = appointments
    .filter(apt => apt.status !== 'cancelado') // Hide cancelled from calendar
    .map(apt => {
      const pet = pets.find(p => p.id === apt.pet_id);
      const client = clients.find(c => c.id === apt.client_id);
      const planLabel = apt.is_plan_usage ? ' [PLANO]' : '';
      const borderColor = serviceTypeColors[apt.service_type] || '#3b82f6';
      
      return {
        id: apt.id,
        title: `${pet?.name || 'Pet'} - ${apt.service_type === 'banho' ? 'Banho' : 'Banho + Tosa'}${planLabel}`,
        start: apt.start_datetime,
        end: apt.end_datetime,
        backgroundColor: apt.is_plan_usage ? '#22c55e' : statusColors[(apt.status as AppointmentStatus) || 'agendado'],
        borderColor: borderColor,
        classNames: [apt.service_type === 'banho' ? 'event-banho' : 'event-banho-tosa'],
        extendedProps: {
          ...apt,
          petName: pet?.name,
          clientName: client?.name,
        },
      };
    });

  const handleEventClick = (info: any) => {
    const apt = appointments.find(a => a.id === info.event.id);
    if (apt) {
      setSelectedAppointment(apt);
      setIsDialogOpen(true);
    }
  };

  const handleStatusChange = async (status: AppointmentStatus) => {
    if (!selectedAppointment) return;

    const { error } = await supabase
      .from('bath_grooming_appointments')
      .update({ status })
      .eq('id', selectedAppointment.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
      return;
    }

    setAppointments(prev => 
      prev.map(apt => 
        apt.id === selectedAppointment.id ? { ...apt, status } : apt
      )
    );

    if (status === 'pronto') {
      toast({
        title: "🎉 Pet Pronto!",
        description: "Status atualizado. Cliente pode ser notificado.",
      });
    }

    setSelectedAppointment({ ...selectedAppointment, status });
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    // Only allow cancellation if not finalized
    if (selectedAppointment.status === 'finalizado') {
      toast({
        title: "Não permitido",
        description: "Agendamentos finalizados não podem ser cancelados.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('bath_grooming_appointments')
      .update({ status: 'cancelado' })
      .eq('id', selectedAppointment.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o agendamento.",
        variant: "destructive",
      });
      return;
    }

    // Send delete webhook to n8n if google_event_id exists
    if (selectedAppointment.google_event_id) {
      await sendDeleteWebhook({
        action: 'delete',
        google_event_id: selectedAppointment.google_event_id,
      });
    }

    setAppointments(prev => 
      prev.map(apt => 
        apt.id === selectedAppointment.id ? { ...apt, status: 'cancelado' } : apt
      )
    );

    toast({
      title: "❌ Agendamento Cancelado",
      description: "O agendamento foi cancelado com sucesso.",
    });

    setIsCancelDialogOpen(false);
    setIsDialogOpen(false);
    setSelectedAppointment(null);
  };

  const handlePetReady = async () => {
    if (!selectedAppointment) return;
    
    await handleStatusChange('pronto');
    
    // TODO: Trigger webhook to n8n for WhatsApp notification
    const client = clients.find(c => c.id === selectedAppointment.client_id);
    const pet = pets.find(p => p.id === selectedAppointment.pet_id);
    
    toast({
      title: "✅ Mensagem enviada!",
      description: `Notificação enviada para ${client?.name} sobre ${pet?.name}.`,
    });
    
    setIsDialogOpen(false);
  };

  const handleSaveAppointment = async () => {
    // Validação básica
    if (!formData.clientId || !formData.petId || !formData.service || !formData.datetime) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Validação do responsável por trazer o pet
    if (!formData.responsavel) {
      toast({
        title: "Selecione a logística de transporte",
        description: "Escolha uma das 4 opções de transporte.",
        variant: "destructive",
      });
      return;
    }

    // Define grooming_type baseado no serviço
    const groomingTypeToSave = formData.service === 'banho' ? 'banho' : formData.groomingType;

    // Se for banho_tosa, precisa ter tipo de tosa selecionado
    if (formData.service === 'banho_tosa' && !formData.groomingType) {
      toast({
        title: "Tipo de Tosa obrigatório",
        description: "Selecione o tipo de tosa para o serviço Banho + Tosa.",
        variant: "destructive",
      });
      return;
    }

    // Validação contra lista oficial
    if (!VALID_GROOMING_VALUES.includes(groomingTypeToSave)) {
      toast({
        title: "Valor inválido",
        description: "O tipo de tosa selecionado não é válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const startDate = new Date(formData.datetime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

    // Calcular rota_buscar e rota_entregar baseado na logística
    const rotaBuscar = formData.responsavel === 'traxidog_tutor' || formData.responsavel === 'traxidog_traxidog';
    const rotaEntregar = formData.responsavel === 'tutor_traxidog' || formData.responsavel === 'traxidog_traxidog';

    const { data, error } = await supabase
      .from('bath_grooming_appointments')
      .insert({
        client_id: formData.clientId,
        pet_id: formData.petId,
        service_type: formData.service,
        grooming_type: groomingTypeToSave,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        status: 'agendado',
        price: calculatedPrice,
        optional_services: formData.selectedAddons,
        notes: formData.notes || null,
        rota_buscar: rotaBuscar,
        rota_entregar: rotaEntregar,
      } as any)
      .select();

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro ao agendar",
        description: error.message || "Não foi possível salvar o agendamento.",
        variant: "destructive",
      });
      return;
    }

    // Disparar webhook após salvar no banco
    const pet = pets.find(p => p.id === formData.petId);
    const client = clients.find(c => c.id === formData.clientId);
    const serviceLabel = formData.service === 'banho' ? 'Banho' : 'Banho + Tosa';
    
    // Map logistics option to readable label
    const logisticsLabels: Record<string, string> = {
      'tutor_tutor': 'Tutor leva e traz',
      'tutor_traxidog': 'Tutor leva / TraxiDog entrega',
      'traxidog_tutor': 'TraxiDog busca / Tutor busca',
      'traxidog_traxidog': 'TraxiDog leva e traz',
    };
    
    // Map size to readable label
    const sizeLabels: Record<string, string> = {
      'pequeno': 'Pequeno',
      'medio': 'Médio',
      'grande': 'Grande',
    };
    
    // Map coat type to readable label
    const coatLabels: Record<string, string> = {
      'curto': 'Curto',
      'medio': 'Médio',
      'longo': 'Longo',
    };
    
    // Get grooming type label
    const groomingLabel = GROOMING_TYPES.find(g => g.value === formData.groomingType)?.label || '';
    
    // Format additional services as comma-separated string
    const additionalServicesString = formData.selectedAddons
      .map(addonId => serviceAddons.find(a => a.id === addonId)?.name)
      .filter(Boolean)
      .join(', ');

    const webhookResponse = await sendCreateWebhook({
      action: 'create',
      pet_name: pet?.name || '',
      service: serviceLabel,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      client_name: client?.name || '',
      pet_size: sizeLabels[formData.size] || formData.size,
      hair_type: coatLabels[formData.coatType] || formData.coatType,
      transport_logistics: logisticsLabels[formData.responsavel] || formData.responsavel,
      additional_services: additionalServicesString || undefined,
      observations: formData.notes || undefined,
      grooming_type: groomingLabel || undefined,
      price: calculatedPrice || undefined,
    });

    // Save google_event_id if received from webhook
    if (webhookResponse.google_id && data && data[0]) {
      await supabase
        .from('bath_grooming_appointments')
        .update({ google_event_id: webhookResponse.google_id })
        .eq('id', data[0].id);
    }

    toast({
      title: "Agendamento criado!",
      description: `Valor total: R$ ${calculatedPrice?.toFixed(2)}`,
    });

    setFormData({ 
      clientId: '', 
      petId: '', 
      service: '', 
      groomingType: '',
      coatType: '',
      size: '',
      datetime: '', 
      notes: '',
      selectedAddons: [],
      responsavel: '',
    });
    setCalculatedPrice(null);
    setBasePrice(0);
    setAddonsTotal(0);
    setIsNewDialogOpen(false);
    fetchAppointments();
  };

  const getPet = (petId: string) => pets.find(p => p.id === petId);
  const getClient = (clientId: string) => clients.find(c => c.id === clientId);

  const getAddonNames = (addonIds: string[] | null) => {
    if (!addonIds || addonIds.length === 0) return null;
    return addonIds.map(id => serviceAddons.find(a => a.id === id)?.name).filter(Boolean).join(', ');
  };

  const canCancel = selectedAppointment && 
    selectedAppointment.status !== 'finalizado' && 
    selectedAppointment.status !== 'cancelado';

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
              <Scissors className="w-8 h-8 text-primary" />
              Banho & Tosa
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os agendamentos de banho e tosa
            </p>
          </div>
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo agendamento de banho ou tosa.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Cliente *</Label>
                  <Select 
                    value={formData.clientId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pet *</Label>
                  <Select 
                    value={formData.petId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, petId: value }))}
                    disabled={!formData.clientId || filteredPets.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.clientId 
                          ? "Selecione um cliente primeiro" 
                          : filteredPets.length === 0 
                            ? "Nenhum pet cadastrado" 
                            : "Selecione o pet"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPets.map(pet => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({pet.breed || pet.species}) - {pet.size || 'Porte N/D'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Serviço *</Label>
                  <Select 
                    value={formData.service}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      service: value, 
                      // Se for apenas banho, define grooming_type como 'banho'. Se for banho_tosa, limpa para selecionar
                      groomingType: value === 'banho' ? 'banho' : '' 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banho">Apenas Banho</SelectItem>
                      <SelectItem value="banho_tosa">Banho + Tosa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de Tosa - somente se for banho_tosa */}
                {formData.service === 'banho_tosa' && (
                  <div>
                    <Label>Tipo de Tosa *</Label>
                    <Select 
                      value={formData.groomingType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, groomingType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de tosa" />
                      </SelectTrigger>
                      <SelectContent>
                        {GROOMING_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Porte e Tipo de Pelo - somente exibição informativa */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Porte</Label>
                    <div className="mt-1 p-2 bg-muted/50 rounded-md text-sm font-medium">
                      {formData.size ? (SIZE_CATEGORIES.find(s => s.value === formData.size)?.label || formData.size) : 'Selecione um pet'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Definido no cadastro do pet</p>
                  </div>
                  <div>
                    <Label>Tipo de Pelo *</Label>
                    <Select 
                      value={formData.coatType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, coatType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de pelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {COAT_TYPES.map(coat => (
                          <SelectItem key={coat.value} value={coat.value}>
                            {coat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Data e Hora *</Label>
                  <Input 
                    type="datetime-local" 
                    value={formData.datetime}
                    onChange={(e) => setFormData(prev => ({ ...prev, datetime: e.target.value }))}
                  />
                </div>

                {/* Logística - OBRIGATÓRIO */}
                <div>
                  <Label>Logística de transporte *</Label>
                  <Select 
                    value={formData.responsavel}
                    onValueChange={(value: 'tutor_tutor' | 'tutor_traxidog' | 'traxidog_tutor' | 'traxidog_traxidog') => setFormData(prev => ({ ...prev, responsavel: value }))}
                  >
                    <SelectTrigger className={!formData.responsavel ? "border-destructive/50" : ""}>
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tutor_tutor">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          Tutor leva e traz
                        </span>
                      </SelectItem>
                      <SelectItem value="tutor_traxidog">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                          Tutor leva / TraxiDog entrega
                        </span>
                      </SelectItem>
                      <SelectItem value="traxidog_tutor">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          TraxiDog busca / Tutor busca
                        </span>
                      </SelectItem>
                      <SelectItem value="traxidog_traxidog">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                          TraxiDog leva e traz
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Observações */}
                <div>
                  <Label>Observações</Label>
                  <Input 
                    placeholder="Observações sobre o atendimento..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                {/* Addons Section - Exclude Táxi Dog (managed by logistics) */}
                {serviceAddons.filter(a => 
                  !a.name.toLowerCase().includes('táxi') && 
                  !a.name.toLowerCase().includes('taxi')
                ).length > 0 && (
                  <div>
                    <Label className="mb-2 block">Serviços Adicionais</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {serviceAddons
                        .filter(addon => 
                          !addon.name.toLowerCase().includes('táxi') && 
                          !addon.name.toLowerCase().includes('taxi')
                        )
                        .map(addon => (
                          <div 
                            key={addon.id}
                            className={cn(
                              "flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors",
                              formData.selectedAddons.includes(addon.id) 
                                ? "border-primary bg-primary/10" 
                                : "border-border hover:border-primary/50"
                            )}
                            onClick={() => toggleAddon(addon.id)}
                          >
                            <Checkbox 
                              checked={formData.selectedAddons.includes(addon.id)}
                              onCheckedChange={() => toggleAddon(addon.id)}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{addon.name}</p>
                              <p className="text-xs text-muted-foreground">R$ {addon.price.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Price Display */}
                {calculatedPrice !== null && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">Valor do Serviço</p>
                          <p className="font-medium">R$ {basePrice.toFixed(2)}</p>
                        </div>
                        {addonsTotal > 0 && (
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">Adicionais</p>
                            <p className="font-medium">+ R$ {addonsTotal.toFixed(2)}</p>
                          </div>
                        )}
                        {taxiDogPrice > 0 && (
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                              Táxi Dog ({formData.responsavel === 'tutor_traxidog' 
                                ? 'Entregar' 
                                : formData.responsavel === 'traxidog_tutor' 
                                  ? 'Buscar' 
                                  : 'Buscar + Entregar'})
                            </p>
                            <p className="font-medium text-accent-foreground">+ R$ {taxiDogPrice.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-primary/20 mt-3 pt-3">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-lg">Total</p>
                          <p className="font-bold text-xl text-primary">R$ {calculatedPrice.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button 
                  className="w-full bg-gradient-primary hover:opacity-90"
                  onClick={handleSaveAppointment}
                  disabled={isLoading || calculatedPrice === null}
                >
                  {isLoading ? 'Salvando...' : `Agendar - R$ ${calculatedPrice?.toFixed(2) || '0,00'}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Status Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-4 mb-6"
      >
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-muted-foreground capitalize">
              {status.replace('_', ' ')}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'timeGridDay,timeGridWeek,dayGridMonth',
              }}
              locale="pt-br"
              events={events}
              eventClick={handleEventClick}
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
              height="auto"
              expandRows={true}
              stickyHeaderDates={true}
              nowIndicator={true}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
              buttonText={{
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia',
              }}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Appointment Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Atendimento</DialogTitle>
            <DialogDescription>
              Visualize e gerencie os detalhes deste agendamento.
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Pet</p>
                  <p className="font-semibold">{getPet(selectedAppointment.pet_id)?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{getClient(selectedAppointment.client_id)?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Raça</p>
                  <p className="font-semibold">{getPet(selectedAppointment.pet_id)?.breed || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Porte / Pelo</p>
                  <p className="font-semibold">
                    {SIZE_CATEGORIES.find(s => s.value === getPet(selectedAppointment.pet_id)?.size)?.label || 'N/A'} / {COAT_TYPES.find(c => c.value === getPet(selectedAppointment.pet_id)?.coat_type)?.label || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Serviço</p>
                  <p className="font-semibold capitalize">
                    {selectedAppointment.service_type?.replace('_', ' + ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Tosa</p>
                  <p className="font-semibold">
                    {selectedAppointment.grooming_type === 'banho' 
                      ? 'Apenas Banho' 
                      : (GROOMING_TYPES.find(g => g.value === selectedAppointment.grooming_type)?.label || selectedAppointment.grooming_type || 'N/A')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-semibold text-primary text-lg">
                    R$ {selectedAppointment.price?.toFixed(2) || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {selectedAppointment.status === 'cancelado' ? (
                    <Badge variant="destructive">Cancelado</Badge>
                  ) : (
                    <Select 
                      value={selectedAppointment.status || 'agendado'}
                      onValueChange={(value) => handleStatusChange(value as AppointmentStatus)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                        <SelectItem value="pronto">Pronto</SelectItem>
                        <SelectItem value="finalizado">Finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Addons */}
              {selectedAppointment.optional_services && selectedAppointment.optional_services.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Serviços Adicionais</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAppointment.optional_services.map(addonId => {
                      const addon = serviceAddons.find(a => a.id === addonId);
                      return addon ? (
                        <Badge key={addonId} variant="secondary">
                          {addon.name} - R$ {addon.price.toFixed(2)}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {selectedAppointment.status !== 'cancelado' && (
                <div className="flex gap-3">
                  {/* Pet Ready Button */}
                  <Button 
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
                    onClick={handlePetReady}
                    disabled={selectedAppointment.status === 'finalizado'}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Pet Pronto - Notificar
                  </Button>

                  {/* Cancel Button */}
                  {canCancel && (
                    <Button 
                      variant="destructive"
                      onClick={() => setIsCancelDialogOpen(true)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Cancelamento
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="py-4">
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-4">
                  <p className="text-sm"><strong>Pet:</strong> {getPet(selectedAppointment.pet_id)?.name}</p>
                  <p className="text-sm"><strong>Cliente:</strong> {getClient(selectedAppointment.client_id)?.name}</p>
                  <p className="text-sm"><strong>Serviço:</strong> {selectedAppointment.service_type?.replace('_', ' + ')}</p>
                  <p className="text-sm"><strong>Valor:</strong> R$ {selectedAppointment.price?.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancelAppointment}>
              <XCircle className="w-4 h-4 mr-2" />
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BanhoTosa;
