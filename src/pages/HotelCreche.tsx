import { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion } from 'framer-motion';
import { Plus, Home, XCircle, AlertTriangle, Baby, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type HotelStatus = 'reservado' | 'check_in' | 'hospedado' | 'check_out' | 'cancelado';

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
}

interface HotelStayDB {
  id: string;
  client_id: string;
  pet_id: string;
  check_in: string;
  check_out: string;
  daily_rate: number;
  total_price: number | null;
  status: string | null;
  notes: string | null;
  is_creche: boolean | null;
  is_plan_usage?: boolean | null;
  client_plan_id?: string | null;
}

interface HotelRate {
  id: string;
  size_category: string;
  daily_rate: number;
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

const statusColors: Record<HotelStatus, string> = {
  reservado: '#3b82f6',
  check_in: '#f59e0b',
  hospedado: '#22c55e',
  check_out: '#9ca3af',
  cancelado: '#ef4444',
};

const sizeLabels: Record<string, string> = {
  pequeno: 'Pequeno',
  medio: 'Médio',
  grande: 'Grande',
};

const HotelCreche = () => {
  const { toast } = useToast();
  const calendarRef = useRef<FullCalendar>(null);
  
  // State from database
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [pets, setPets] = useState<PetDB[]>([]);
  const [filteredPets, setFilteredPets] = useState<PetDB[]>([]);
  const [bookings, setBookings] = useState<HotelStayDB[]>([]);
  const [hotelRates, setHotelRates] = useState<HotelRate[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  
  const [selectedBooking, setSelectedBooking] = useState<HotelStayDB | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientId: '',
    petId: '',
    checkIn: '',
    checkOut: '',
    serviceType: 'hotel' as 'hotel' | 'creche',
  });

  // Calculated values
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [totalDays, setTotalDays] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [activePlan, setActivePlan] = useState<ClientPlan | null>(null);
  const [isPlanUsage, setIsPlanUsage] = useState(false);

  // Fetch data from Supabase
  const fetchData = async () => {
    const [clientsRes, petsRes, bookingsRes, ratesRes, plansRes] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('pets').select('*').order('name'),
      supabase.from('hotel_stays').select('*').order('check_in'),
      supabase.from('hotel_rates').select('*'),
      supabase.from('client_plans').select('*').eq('active', true),
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (petsRes.data) setPets(petsRes.data);
    if (bookingsRes.data) setBookings(bookingsRes.data as unknown as HotelStayDB[]);
    if (ratesRes.data) setHotelRates(ratesRes.data);
    if (plansRes.data) setClientPlans(plansRes.data as unknown as ClientPlan[]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter pets when client changes
  useEffect(() => {
    if (formData.clientId) {
      const clientPets = pets.filter(p => p.client_id === formData.clientId);
      setFilteredPets(clientPets);
      setFormData(prev => ({ ...prev, petId: '' }));
      setDailyRate(0);
      setTotalDays(0);
      setTotalPrice(0);
      setActivePlan(null);
      setIsPlanUsage(false);
    } else {
      setFilteredPets([]);
    }
  }, [formData.clientId, pets]);

  // Check for active plan when pet is selected and service is creche
  useEffect(() => {
    if (formData.petId && formData.serviceType === 'creche') {
      const plan = clientPlans.find(cp => 
        cp.pet_id === formData.petId &&
        (cp.service_type === 'creche') &&
        cp.active === true &&
        !isPast(new Date(cp.expires_at)) &&
        (cp.total_baths - cp.used_baths) > 0
      );
      
      if (plan) {
        setActivePlan(plan);
        setIsPlanUsage(true);
        toast({
          title: "🟢 Plano Detectado!",
          description: `Pet possui plano de creche com ${plan.total_baths - plan.used_baths} usos restantes.`,
        });
      } else {
        setActivePlan(null);
        setIsPlanUsage(false);
      }
    } else {
      setActivePlan(null);
      setIsPlanUsage(false);
    }
  }, [formData.petId, formData.serviceType, clientPlans]);

  // Calculate daily rate based on pet size
  useEffect(() => {
    if (formData.petId) {
      const pet = pets.find(p => p.id === formData.petId);
      if (pet && pet.size) {
        const rate = hotelRates.find(r => r.size_category === pet.size);
        if (rate) {
          setDailyRate(rate.daily_rate);
        } else {
          setDailyRate(80);
        }
      } else {
        const mediumRate = hotelRates.find(r => r.size_category === 'medio');
        setDailyRate(mediumRate?.daily_rate || 80);
      }
    }
  }, [formData.petId, pets, hotelRates]);

  // Calculate total price based on dates and daily rate
  useEffect(() => {
    if (formData.checkIn && formData.checkOut && dailyRate > 0) {
      const checkInDate = new Date(formData.checkIn);
      const checkOutDate = new Date(formData.checkOut);
      const diffTime = checkOutDate.getTime() - checkInDate.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (days > 0) {
        setTotalDays(days);
        // Se usar plano, valor é zero
        setTotalPrice(isPlanUsage ? 0 : days * dailyRate);
      } else {
        setTotalDays(0);
        setTotalPrice(0);
      }
    } else {
      setTotalDays(0);
      setTotalPrice(0);
    }
  }, [formData.checkIn, formData.checkOut, dailyRate, isPlanUsage]);

  // Filter out cancelled bookings from calendar
  const events = bookings
    .filter(booking => booking.status !== 'cancelado')
    .map(booking => {
      const pet = pets.find(p => p.id === booking.pet_id);
      const client = clients.find(c => c.id === booking.client_id);
      const typeIcon = booking.is_creche ? '🐕' : '🏨';
      const planBadge = booking.is_plan_usage ? ' [PLANO]' : '';
      
      return {
        id: booking.id,
        title: `${typeIcon} ${pet?.name || 'Pet'} (${client?.name || 'Cliente'})${planBadge}`,
        start: booking.check_in,
        end: booking.check_out,
        backgroundColor: statusColors[(booking.status as HotelStatus) || 'reservado'],
        borderColor: statusColors[(booking.status as HotelStatus) || 'reservado'],
        extendedProps: booking,
      };
    });

  const handleEventClick = (info: any) => {
    const booking = bookings.find(b => b.id === info.event.id);
    if (booking) {
      setSelectedBooking(booking);
      setIsDialogOpen(true);
    }
  };

  const handleStatusChange = async (status: HotelStatus) => {
    if (!selectedBooking) return;

    const { error } = await supabase
      .from('hotel_stays')
      .update({ status })
      .eq('id', selectedBooking.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
      return;
    }

    setBookings(prev => 
      prev.map(b => 
        b.id === selectedBooking.id ? { ...b, status } : b
      )
    );

    toast({
      title: "Status atualizado!",
      description: `Reserva atualizada para ${status.replace('_', '-')}.`,
    });

    setSelectedBooking({ ...selectedBooking, status });
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    if (selectedBooking.status === 'check_out') {
      toast({
        title: "Não permitido",
        description: "Reservas finalizadas não podem ser canceladas.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('hotel_stays')
      .update({ status: 'cancelado' })
      .eq('id', selectedBooking.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a reserva.",
        variant: "destructive",
      });
      return;
    }

    // Se era uso de plano, devolver o uso
    if (selectedBooking.is_plan_usage && selectedBooking.client_plan_id) {
      // Buscar plano e reverter uso
      const planToRevert = clientPlans.find(cp => cp.id === selectedBooking.client_plan_id);
      if (planToRevert) {
        await supabase
          .from('client_plans')
          .update({ used_baths: Math.max(0, planToRevert.used_baths - 1) })
          .eq('id', selectedBooking.client_plan_id);
      }
    }

    setBookings(prev => 
      prev.map(b => 
        b.id === selectedBooking.id ? { ...b, status: 'cancelado' } : b
      )
    );

    toast({
      title: "❌ Reserva Cancelada",
      description: "A reserva foi cancelada com sucesso.",
    });

    setIsCancelDialogOpen(false);
    setIsDialogOpen(false);
    setSelectedBooking(null);
  };

  const handleSaveBooking = async () => {
    if (!formData.clientId || !formData.petId || !formData.checkIn || !formData.checkOut) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (totalDays <= 0) {
      toast({
        title: "Datas inválidas",
        description: "A data de check-out deve ser posterior ao check-in.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);

    // Se usar plano de creche, descontar do saldo
    if (isPlanUsage && activePlan) {
      const { error: planError } = await supabase
        .from('client_plans')
        .update({ used_baths: activePlan.used_baths + totalDays })
        .eq('id', activePlan.id);

      if (planError) {
        toast({
          title: "Erro ao descontar do plano",
          description: planError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from('hotel_stays')
      .insert({
        client_id: formData.clientId,
        pet_id: formData.petId,
        check_in: checkInDate.toISOString(),
        check_out: checkOutDate.toISOString(),
        daily_rate: dailyRate,
        total_price: isPlanUsage ? 0 : totalPrice,
        status: 'reservado',
        is_creche: formData.serviceType === 'creche',
        is_plan_usage: isPlanUsage,
        client_plan_id: activePlan?.id || null,
      })
      .select();

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro ao reservar",
        description: error.message || "Não foi possível salvar a reserva.",
        variant: "destructive",
      });
      return;
    }

    const serviceLabel = formData.serviceType === 'creche' ? 'Creche' : 'Hotel';
    const planMessage = isPlanUsage ? ' (PLANO)' : '';

    toast({
      title: `✅ ${serviceLabel} reservado!${planMessage}`,
      description: isPlanUsage 
        ? `Descontado ${totalDays} uso(s) do plano. Restam ${(activePlan?.total_baths || 0) - (activePlan?.used_baths || 0) - totalDays}.`
        : `${totalDays} diária(s) - Total: R$ ${totalPrice.toFixed(2)}`,
    });

    setFormData({ clientId: '', petId: '', checkIn: '', checkOut: '', serviceType: 'hotel' });
    setDailyRate(0);
    setTotalDays(0);
    setTotalPrice(0);
    setActivePlan(null);
    setIsPlanUsage(false);
    setIsNewDialogOpen(false);
    fetchData();
  };

  const getPet = (petId: string) => pets.find(p => p.id === petId);
  const getClient = (clientId: string) => clients.find(c => c.id === clientId);

  // Pets no hotel/creche hoje
  const todayGuests = bookings.filter(b => {
    const checkIn = new Date(b.check_in);
    const checkOut = new Date(b.check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return b.status !== 'cancelado' && checkIn <= today && checkOut >= today;
  });

  const hotelGuests = todayGuests.filter(b => !b.is_creche);
  const crecheGuests = todayGuests.filter(b => b.is_creche);

  const canCancel = selectedBooking && 
    selectedBooking.status !== 'check_out' && 
    selectedBooking.status !== 'cancelado';

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
              <Home className="w-8 h-8 text-primary" />
              Hotel & Creche
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie hospedagens e creche diária
            </p>
          </div>
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Nova Reserva
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Reserva</DialogTitle>
                <DialogDescription>
                  Selecione o tipo de serviço e preencha os dados.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Tipo de Serviço */}
                <div>
                  <Label>Tipo de Serviço *</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <Button
                      type="button"
                      variant={formData.serviceType === 'hotel' ? 'default' : 'outline'}
                      className="h-20 flex flex-col gap-2"
                      onClick={() => setFormData(prev => ({ ...prev, serviceType: 'hotel' }))}
                    >
                      <Building className="w-6 h-6" />
                      <span>🏨 Hotel</span>
                      <span className="text-xs opacity-70">Com pernoite</span>
                    </Button>
                    <Button
                      type="button"
                      variant={formData.serviceType === 'creche' ? 'default' : 'outline'}
                      className="h-20 flex flex-col gap-2"
                      onClick={() => setFormData(prev => ({ ...prev, serviceType: 'creche' }))}
                    >
                      <Baby className="w-6 h-6" />
                      <span>🐕 Creche</span>
                      <span className="text-xs opacity-70">Sem pernoite</span>
                    </Button>
                  </div>
                </div>

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
                          {pet.name} ({pet.breed || pet.species}) - {sizeLabels[pet.size || ''] || 'Porte N/D'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Indicador de Plano */}
                {isPlanUsage && activePlan && (
                  <Card className="bg-green-500/10 border-green-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500 text-white">🟢 PLANO</Badge>
                        <span className="text-sm">
                          {activePlan.total_baths - activePlan.used_baths} usos restantes
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        O valor será R$ 0,00 pois será descontado do plano
                      </p>
                    </CardContent>
                  </Card>
                )}

                {formData.petId && !isPlanUsage && formData.serviceType === 'creche' && (
                  <Card className="bg-blue-500/10 border-blue-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-blue-500 text-blue-600">🔵 AVULSO</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pet não possui plano de creche ativo
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{formData.serviceType === 'creche' ? 'Entrada *' : 'Check-in *'}</Label>
                    <Input 
                      type="date" 
                      value={formData.checkIn}
                      onChange={(e) => setFormData(prev => ({ ...prev, checkIn: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{formData.serviceType === 'creche' ? 'Saída *' : 'Check-out *'}</Label>
                    <Input 
                      type="date" 
                      value={formData.checkOut}
                      onChange={(e) => setFormData(prev => ({ ...prev, checkOut: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Price Display */}
                {dailyRate > 0 && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Porte do Pet:</span>
                          <span className="font-medium">
                            {sizeLabels[pets.find(p => p.id === formData.petId)?.size || ''] || 'Médio'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valor da Diária:</span>
                          <span className="font-medium">R$ {dailyRate.toFixed(2)}</span>
                        </div>
                        {totalDays > 0 && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                {formData.serviceType === 'creche' ? 'Dias:' : 'Diárias:'}
                              </span>
                              <span className="font-medium">{totalDays}</span>
                            </div>
                            <div className="border-t border-primary/20 pt-2 mt-2">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-lg">Total</span>
                                <span className="font-bold text-xl text-primary">
                                  {isPlanUsage ? (
                                    <span className="text-green-500">R$ 0,00 (PLANO)</span>
                                  ) : (
                                    `R$ ${totalPrice.toFixed(2)}`
                                  )}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button 
                  className="w-full bg-gradient-primary hover:opacity-90"
                  onClick={handleSaveBooking}
                  disabled={isLoading || totalDays === 0}
                >
                  {isLoading ? 'Salvando...' : isPlanUsage 
                    ? `Reservar - PLANO (${totalDays} uso${totalDays > 1 ? 's' : ''})`
                    : `Reservar - R$ ${totalPrice.toFixed(2)}`
                  }
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Tabs: Calendário / Hoje */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">📅 Calendário</TabsTrigger>
          <TabsTrigger value="today">
            🐕 Hoje ({todayGuests.length})
          </TabsTrigger>
        </TabsList>

        {/* Aba Calendário */}
        <TabsContent value="calendar">
          {/* Status Legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap gap-4 mb-6"
          >
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-muted-foreground capitalize">
                  {status.replace('_', '-')}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm">🏨 = Hotel</span>
              <span className="text-sm">🐕 = Creche</span>
            </div>
          </motion.div>

          {/* Calendar */}
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth',
                }}
                locale="pt-br"
                events={events}
                eventClick={handleEventClick}
                height="auto"
                buttonText={{
                  today: 'Hoje',
                  month: 'Mês',
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Hoje */}
        <TabsContent value="today">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Hotel */}
            <Card className="border-0 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-primary" />
                  🏨 Hotel ({hotelGuests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hotelGuests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum pet no hotel hoje
                  </p>
                ) : (
                  hotelGuests.map(guest => {
                    const pet = getPet(guest.pet_id);
                    const client = getClient(guest.client_id);
                    return (
                      <div key={guest.id} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{pet?.name}</p>
                          <p className="text-sm text-muted-foreground">{client?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Check-out: {format(new Date(guest.check_out), 'dd/MM')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {guest.is_plan_usage && (
                            <Badge className="bg-green-500 text-white">PLANO</Badge>
                          )}
                          <Badge variant="outline">{guest.status}</Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Creche */}
            <Card className="border-0 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Baby className="w-5 h-5 text-primary" />
                  🐕 Creche ({crecheGuests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {crecheGuests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum pet na creche hoje
                  </p>
                ) : (
                  crecheGuests.map(guest => {
                    const pet = getPet(guest.pet_id);
                    const client = getClient(guest.client_id);
                    return (
                      <div key={guest.id} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{pet?.name}</p>
                          <p className="text-sm text-muted-foreground">{client?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Entrada: {format(new Date(guest.check_in), 'HH:mm')} | 
                            Saída: {format(new Date(guest.check_out), 'HH:mm')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {guest.is_plan_usage && (
                            <Badge className="bg-green-500 text-white">PLANO</Badge>
                          )}
                          <Badge variant="outline">{guest.status}</Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Booking Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Reserva</DialogTitle>
            <DialogDescription>
              Visualize e gerencie os detalhes desta reserva.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="flex gap-2 mb-4">
                <Badge className={selectedBooking.is_creche ? 'bg-purple-500' : 'bg-blue-500'}>
                  {selectedBooking.is_creche ? '🐕 Creche' : '🏨 Hotel'}
                </Badge>
                {selectedBooking.is_plan_usage && (
                  <Badge className="bg-green-500 text-white">🟢 PLANO</Badge>
                )}
                {!selectedBooking.is_plan_usage && (
                  <Badge variant="outline" className="border-blue-500 text-blue-600">🔵 AVULSO</Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Pet</p>
                  <p className="font-semibold">{getPet(selectedBooking.pet_id)?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{getClient(selectedBooking.client_id)?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedBooking.is_creche ? 'Entrada' : 'Check-in'}
                  </p>
                  <p className="font-semibold">
                    {new Date(selectedBooking.check_in).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedBooking.is_creche ? 'Saída' : 'Check-out'}
                  </p>
                  <p className="font-semibold">
                    {new Date(selectedBooking.check_out).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Diária</p>
                  <p className="font-semibold">R$ {selectedBooking.daily_rate.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-semibold text-primary text-lg">
                    {selectedBooking.is_plan_usage 
                      ? 'R$ 0,00 (PLANO)' 
                      : `R$ ${selectedBooking.total_price?.toFixed(2) || 'N/A'}`
                    }
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {selectedBooking.status === 'cancelado' ? (
                    <Badge variant="destructive" className="mt-1">Cancelado</Badge>
                  ) : (
                    <Select 
                      value={selectedBooking.status || 'reservado'}
                      onValueChange={(value) => handleStatusChange(value as HotelStatus)}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reservado">Reservado</SelectItem>
                        <SelectItem value="check_in">Check-in</SelectItem>
                        <SelectItem value="hospedado">Hospedado</SelectItem>
                        <SelectItem value="check_out">Check-out</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {canCancel && (
                <Button 
                  variant="destructive"
                  className="w-full"
                  onClick={() => setIsCancelDialogOpen(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar Reserva
                </Button>
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
              Tem certeza que deseja cancelar esta reserva? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="py-4">
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-4">
                  <p className="text-sm"><strong>Pet:</strong> {getPet(selectedBooking.pet_id)?.name}</p>
                  <p className="text-sm"><strong>Cliente:</strong> {getClient(selectedBooking.client_id)?.name}</p>
                  <p className="text-sm"><strong>Tipo:</strong> {selectedBooking.is_creche ? 'Creche' : 'Hotel'}</p>
                  <p className="text-sm"><strong>Valor:</strong> {selectedBooking.is_plan_usage ? 'PLANO' : `R$ ${selectedBooking.total_price?.toFixed(2)}`}</p>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancelBooking}>
              <XCircle className="w-4 h-4 mr-2" />
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HotelCreche;
