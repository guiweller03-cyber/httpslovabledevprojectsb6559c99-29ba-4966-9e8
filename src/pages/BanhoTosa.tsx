import { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion } from 'framer-motion';
import { Plus, Scissors, CheckCircle2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type AppointmentStatus = 'agendado' | 'em_atendimento' | 'pronto' | 'finalizado';

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

const statusColors: Record<AppointmentStatus, string> = {
  agendado: '#3b82f6',
  em_atendimento: '#f59e0b',
  pronto: '#22c55e',
  finalizado: '#9ca3af',
};

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
  
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDB | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    clientId: '',
    petId: '',
    service: '',
    datetime: '',
    selectedAddons: [] as string[],
  });

  // Calculated price state
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [addonsTotal, setAddonsTotal] = useState<number>(0);

  // Fetch data from Supabase
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

  useEffect(() => {
    fetchClients();
    fetchPets();
    fetchAppointments();
    fetchServicePrices();
    fetchServiceAddons();
  }, []);

  // Filter pets when client changes
  useEffect(() => {
    if (formData.clientId) {
      const clientPets = pets.filter(p => p.client_id === formData.clientId);
      setFilteredPets(clientPets);
      setFormData(prev => ({ ...prev, petId: '', selectedAddons: [] }));
      setCalculatedPrice(null);
      setBasePrice(0);
      setAddonsTotal(0);
    } else {
      setFilteredPets([]);
    }
  }, [formData.clientId, pets]);

  // Calculate price automatically when pet or service changes
  useEffect(() => {
    if (formData.petId && formData.service) {
      const pet = pets.find(p => p.id === formData.petId);
      if (pet) {
        // Find matching price in service_prices table
        const matchingPrice = servicePrices.find(sp => 
          sp.breed?.toLowerCase() === pet.breed?.toLowerCase() &&
          sp.service_type === formData.service
        );
        
        // If no exact breed match, try by size_category
        if (matchingPrice) {
          setBasePrice(matchingPrice.price);
        } else {
          // Fallback: find by size
          const sizeMatch = servicePrices.find(sp => 
            sp.size_category === pet.size &&
            sp.service_type === formData.service
          );
          if (sizeMatch) {
            setBasePrice(sizeMatch.price);
          } else {
            // Default prices if nothing matches
            const defaultPrice = formData.service === 'banho' ? 50 : 80;
            setBasePrice(defaultPrice);
          }
        }
      }
    } else {
      setBasePrice(0);
    }
  }, [formData.petId, formData.service, pets, servicePrices]);

  // Calculate addons total
  useEffect(() => {
    const total = formData.selectedAddons.reduce((acc, addonId) => {
      const addon = serviceAddons.find(a => a.id === addonId);
      return acc + (addon?.price || 0);
    }, 0);
    setAddonsTotal(total);
  }, [formData.selectedAddons, serviceAddons]);

  // Update calculated price
  useEffect(() => {
    if (basePrice > 0) {
      setCalculatedPrice(basePrice + addonsTotal);
    } else {
      setCalculatedPrice(null);
    }
  }, [basePrice, addonsTotal]);

  const toggleAddon = (addonId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedAddons: prev.selectedAddons.includes(addonId)
        ? prev.selectedAddons.filter(id => id !== addonId)
        : [...prev.selectedAddons, addonId]
    }));
  };

  const events = appointments.map(apt => {
    const pet = pets.find(p => p.id === apt.pet_id);
    const client = clients.find(c => c.id === apt.client_id);
    
    return {
      id: apt.id,
      title: `${pet?.name || 'Pet'} - ${apt.service_type === 'banho' ? 'Banho' : 'Banho + Tosa'}`,
      start: apt.start_datetime,
      end: apt.end_datetime,
      backgroundColor: statusColors[(apt.status as AppointmentStatus) || 'agendado'],
      borderColor: statusColors[(apt.status as AppointmentStatus) || 'agendado'],
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
    if (!formData.clientId || !formData.petId || !formData.service || !formData.datetime) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const startDate = new Date(formData.datetime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

    const { data, error } = await supabase
      .from('bath_grooming_appointments')
      .insert({
        client_id: formData.clientId,
        pet_id: formData.petId,
        service_type: formData.service,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        status: 'agendado',
        price: calculatedPrice,
        optional_services: formData.selectedAddons,
      })
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

    toast({
      title: "Agendamento criado!",
      description: `Valor total: R$ ${calculatedPrice?.toFixed(2)}`,
    });

    setFormData({ clientId: '', petId: '', service: '', datetime: '', selectedAddons: [] });
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
            <DialogContent className="max-w-lg">
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
                    onValueChange={(value) => setFormData(prev => ({ ...prev, service: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banho">Banho</SelectItem>
                      <SelectItem value="banho_tosa">Banho + Tosa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data e Hora *</Label>
                  <Input 
                    type="datetime-local" 
                    value={formData.datetime}
                    onChange={(e) => setFormData(prev => ({ ...prev, datetime: e.target.value }))}
                  />
                </div>

                {/* Addons Section */}
                {serviceAddons.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Serviços Adicionais</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {serviceAddons.map(addon => (
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
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Valor do Serviço</p>
                          <p className="font-medium">R$ {basePrice.toFixed(2)}</p>
                        </div>
                        {addonsTotal > 0 && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Adicionais</p>
                            <p className="font-medium">+ R$ {addonsTotal.toFixed(2)}</p>
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
                  <p className="text-sm text-muted-foreground">Serviço</p>
                  <p className="font-semibold capitalize">
                    {selectedAppointment.service_type?.replace('_', ' + ')}
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

              {/* Pet Ready Button */}
              <Button 
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
                onClick={handlePetReady}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Pet Pronto - Notificar Cliente
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BanhoTosa;
