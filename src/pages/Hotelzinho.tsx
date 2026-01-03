import { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion } from 'framer-motion';
import { Plus, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type HotelStatus = 'reservado' | 'check_in' | 'hospedado' | 'check_out';

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

const statusColors: Record<HotelStatus, string> = {
  reservado: '#3b82f6',
  check_in: '#f59e0b',
  hospedado: '#22c55e',
  check_out: '#9ca3af',
};

const Hotelzinho = () => {
  const { toast } = useToast();
  const calendarRef = useRef<FullCalendar>(null);
  
  // State from database
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [pets, setPets] = useState<PetDB[]>([]);
  const [filteredPets, setFilteredPets] = useState<PetDB[]>([]);
  const [bookings, setBookings] = useState<HotelStayDB[]>([]);
  
  const [selectedBooking, setSelectedBooking] = useState<HotelStayDB | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientId: '',
    petId: '',
    checkIn: '',
    checkOut: '',
    dailyRate: '',
  });

  // Fetch data from Supabase
  const fetchClients = async () => {
    console.log("Fetching clients...");
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar clientes:', error);
      return;
    }
    console.log("Clients loaded:", data);
    setClients(data || []);
  };

  const fetchPets = async () => {
    console.log("Fetching pets...");
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar pets:', error);
      return;
    }
    console.log("Pets loaded:", data);
    setPets(data || []);
  };

  const fetchBookings = async () => {
    console.log("Fetching hotel bookings...");
    const { data, error } = await supabase
      .from('hotel_stays')
      .select('*')
      .order('check_in', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar reservas:', error);
      return;
    }
    console.log("Bookings loaded:", data);
    setBookings(data || []);
  };

  useEffect(() => {
    fetchClients();
    fetchPets();
    fetchBookings();
  }, []);

  // Filter pets when client changes
  useEffect(() => {
    if (formData.clientId) {
      const clientPets = pets.filter(p => p.client_id === formData.clientId);
      setFilteredPets(clientPets);
      setFormData(prev => ({ ...prev, petId: '' }));
    } else {
      setFilteredPets([]);
    }
  }, [formData.clientId, pets]);

  const events = bookings.map(booking => {
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
      console.error('Erro ao atualizar status:', error);
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

  const handleSaveBooking = async () => {
    console.log("CLICK OK - handleSaveBooking");
    console.log("DADOS FORM", formData);

    if (!formData.clientId || !formData.petId || !formData.checkIn || !formData.checkOut || !formData.dailyRate) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const days = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = parseFloat(formData.dailyRate);
    const totalPrice = days * dailyRate;

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

    console.log("RESULTADO INSERT BOOKING", data, error);

    setIsLoading(false);

    if (error) {
      console.error('Erro ao salvar reserva:', error);
      toast({
        title: "Erro ao reservar",
        description: error.message || "Não foi possível salvar a reserva.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Reserva criada!",
      description: `Reserva de ${days} dia(s) criada com sucesso.`,
    });

    setFormData({ clientId: '', petId: '', checkIn: '', checkOut: '', dailyRate: '' });
    setIsNewDialogOpen(false);
    fetchBookings();
  };

  const getPet = (petId: string) => pets.find(p => p.id === petId);
  const getClient = (clientId: string) => clients.find(c => c.id === clientId);

  const activeGuests = bookings.filter(b => b.status === 'hospedado');

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
                          {pet.name} ({pet.breed || pet.species})
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
                <div>
                  <Label>Valor da Diária *</Label>
                  <Input 
                    type="number" 
                    placeholder="R$ 0,00" 
                    value={formData.dailyRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dailyRate: e.target.value }))}
                  />
                </div>
                <Button 
                  className="w-full bg-gradient-primary hover:opacity-90"
                  onClick={handleSaveBooking}
                  disabled={isLoading}
                >
                  {isLoading ? 'Salvando...' : 'Reservar'}
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
                  <p className="font-semibold text-primary">
                    R$ {selectedBooking.total_price?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label>Status</Label>
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
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Hotelzinho;