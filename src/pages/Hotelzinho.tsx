import { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion } from 'framer-motion';
import { Plus, Home, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
}

interface HotelRate {
  id: string;
  size_category: string;
  daily_rate: number;
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

const Hotelzinho = () => {
  const { toast } = useToast();
  const calendarRef = useRef<FullCalendar>(null);
  
  // State from database
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [pets, setPets] = useState<PetDB[]>([]);
  const [filteredPets, setFilteredPets] = useState<PetDB[]>([]);
  const [bookings, setBookings] = useState<HotelStayDB[]>([]);
  const [hotelRates, setHotelRates] = useState<HotelRate[]>([]);
  
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
  });

  // Calculated values
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [totalDays, setTotalDays] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);

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

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('hotel_stays')
      .select('*')
      .order('check_in', { ascending: true });
    
    if (!error) setBookings(data || []);
  };

  const fetchHotelRates = async () => {
    const { data, error } = await supabase
      .from('hotel_rates')
      .select('*');
    
    if (!error) setHotelRates(data || []);
  };

  useEffect(() => {
    fetchClients();
    fetchPets();
    fetchBookings();
    fetchHotelRates();
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
    } else {
      setFilteredPets([]);
    }
  }, [formData.clientId, pets]);

  // Calculate daily rate based on pet size
  useEffect(() => {
    if (formData.petId) {
      const pet = pets.find(p => p.id === formData.petId);
      if (pet && pet.size) {
        const rate = hotelRates.find(r => r.size_category === pet.size);
        if (rate) {
          setDailyRate(rate.daily_rate);
        } else {
          // Default rate if size not found
          setDailyRate(80);
        }
      } else {
        // Default to medium if no size specified
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
        setTotalPrice(days * dailyRate);
      } else {
        setTotalDays(0);
        setTotalPrice(0);
      }
    } else {
      setTotalDays(0);
      setTotalPrice(0);
    }
  }, [formData.checkIn, formData.checkOut, dailyRate]);

  // Filter out cancelled bookings from calendar
  const events = bookings
    .filter(booking => booking.status !== 'cancelado')
    .map(booking => {
      const pet = pets.find(p => p.id === booking.pet_id);
      const client = clients.find(c => c.id === booking.client_id);
      
      return {
        id: booking.id,
        title: `🐕 ${pet?.name || 'Pet'} (${client?.name || 'Cliente'})`,
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

    // Only allow cancellation if not checked out
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

    const { data, error } = await supabase
      .from('hotel_stays')
      .insert({
        client_id: formData.clientId,
        pet_id: formData.petId,
        check_in: checkInDate.toISOString(),
        check_out: checkOutDate.toISOString(),
        daily_rate: dailyRate,
        total_price: totalPrice,
        status: 'reservado',
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

    toast({
      title: "Reserva criada!",
      description: `${totalDays} diária(s) - Total: R$ ${totalPrice.toFixed(2)}`,
    });

    setFormData({ clientId: '', petId: '', checkIn: '', checkOut: '' });
    setDailyRate(0);
    setTotalDays(0);
    setTotalPrice(0);
    setIsNewDialogOpen(false);
    fetchBookings();
  };

  const getPet = (petId: string) => pets.find(p => p.id === petId);
  const getClient = (clientId: string) => clients.find(c => c.id === clientId);

  const activeGuests = bookings.filter(b => b.status === 'hospedado');

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
              Hotelzinho
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as reservas e hospedagens
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
                  Preencha os dados para criar uma nova reserva de hospedagem.
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
                          {pet.name} ({pet.breed || pet.species}) - {sizeLabels[pet.size || ''] || 'Porte N/D'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Check-in *</Label>
                    <Input 
                      type="date" 
                      value={formData.checkIn}
                      onChange={(e) => setFormData(prev => ({ ...prev, checkIn: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Check-out *</Label>
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
                              <span className="text-muted-foreground">Quantidade de Diárias:</span>
                              <span className="font-medium">{totalDays}</span>
                            </div>
                            <div className="border-t border-primary/20 pt-2 mt-2">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-lg">Total</span>
                                <span className="font-bold text-xl text-primary">R$ {totalPrice.toFixed(2)}</span>
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
                  disabled={isLoading || totalPrice === 0}
                >
                  {isLoading ? 'Salvando...' : `Reservar - R$ ${totalPrice.toFixed(2)}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Active Guests Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card className="border-0 shadow-soft bg-gradient-hero text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Hóspedes Ativos</p>
                <p className="text-3xl font-display font-bold mt-1">
                  {activeGuests.length} pet{activeGuests.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-4">
                {activeGuests.slice(0, 4).map(guest => {
                  const pet = getPet(guest.pet_id);
                  return (
                    <div 
                      key={guest.id}
                      className="bg-white/10 rounded-xl p-3 text-center"
                    >
                      <div className="text-2xl mb-1">🐕</div>
                      <p className="text-sm font-medium">{pet?.name}</p>
                      <p className="text-xs text-white/60">
                        até {new Date(guest.check_out).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: 'short' 
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
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
      </motion.div>

      {/* Booking Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Hospedagem</DialogTitle>
            <DialogDescription>
              Visualize e gerencie os detalhes desta reserva.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-4">
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
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-semibold">
                    {new Date(selectedBooking.check_in).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
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
                    R$ {selectedBooking.total_price?.toFixed(2) || 'N/A'}
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

              {/* Cancel Button */}
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
                  <p className="text-sm"><strong>Check-in:</strong> {new Date(selectedBooking.check_in).toLocaleDateString('pt-BR')}</p>
                  <p className="text-sm"><strong>Check-out:</strong> {new Date(selectedBooking.check_out).toLocaleDateString('pt-BR')}</p>
                  <p className="text-sm"><strong>Valor:</strong> R$ {selectedBooking.total_price?.toFixed(2)}</p>
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

export default Hotelzinho;
