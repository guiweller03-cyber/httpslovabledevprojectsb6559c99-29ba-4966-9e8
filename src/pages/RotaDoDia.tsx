import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Phone, Car, User, Dog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PetDB {
  id: string;
  name: string;
  client_id: string;
  address?: string | null;
  neighborhood?: string | null;
  zip_code?: string | null;
  pickup_time?: string | null;
  delivery_time?: string | null;
}

interface ClientDB {
  id: string;
  name: string;
  whatsapp: string;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
}

interface AppointmentDB {
  id: string;
  client_id: string;
  pet_id: string;
  service_type: string;
  start_datetime: string;
  status: string | null;
  rota_buscar?: boolean | null;
  rota_entregar?: boolean | null;
}

interface RouteItem {
  id: string;
  pet_name: string;
  address: string | null;
  neighborhood: string | null;
  time: string | null;
  client_id: string;
  client_name: string;
  client_whatsapp: string;
  service_type: string;
  service_id: string;
}

const RotaDoDia = () => {
  const [pickupPets, setPickupPets] = useState<RouteItem[]>([]);
  const [deliveryPets, setDeliveryPets] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Data de hoje no timezone local (Brasil -3)
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    fetchRoutePets();
  }, []);

  const fetchRoutePets = async () => {
    setLoading(true);

    // Buscar agendamentos do dia com rota_buscar ou rota_entregar = true
    const [petsRes, clientsRes, appointmentsRes] = await Promise.all([
      supabase.from('pets').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('bath_grooming_appointments').select('*')
        .gte('start_datetime', `${today}T00:00:00`)
        .lt('start_datetime', `${today}T23:59:59`)
        .neq('status', 'cancelado'),
    ]);

    const pets = (petsRes.data || []) as unknown as PetDB[];
    const clients = (clientsRes.data || []) as unknown as ClientDB[];
    const appointments = (appointmentsRes.data || []) as unknown as AppointmentDB[];

    const getClient = (clientId: string) => clients.find(c => c.id === clientId);
    const getPet = (petId: string) => pets.find(p => p.id === petId);

    const pickupList: RouteItem[] = [];
    const deliveryList: RouteItem[] = [];

    // Filtrar por rota_buscar e rota_entregar
    appointments.forEach(apt => {
      const pet = getPet(apt.pet_id);
      const client = getClient(apt.client_id);
      
      if (!pet || !client) return;

      const baseItem: RouteItem = {
        id: apt.id,
        pet_name: pet.name,
        address: pet.address || client.address || null,
        neighborhood: pet.neighborhood || client.neighborhood || null,
        time: null,
        client_id: client.id,
        client_name: client.name,
        client_whatsapp: client.whatsapp || '',
        service_type: apt.service_type === 'banho' ? 'Banho' : 'Banho + Tosa',
        service_id: apt.id,
      };

      // Se rota_buscar = true, adiciona na lista de buscar
      if (apt.rota_buscar === true) {
        pickupList.push({
          ...baseItem,
          time: pet.pickup_time || null,
        });
      }

      // Se rota_entregar = true, adiciona na lista de entregar
      if (apt.rota_entregar === true) {
        deliveryList.push({
          ...baseItem,
          time: pet.delivery_time || null,
        });
      }
    });

    // Ordenar por horário
    pickupList.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    deliveryList.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

    setPickupPets(pickupList);
    setDeliveryPets(deliveryList);
    setLoading(false);
  };

  const RouteCard = ({ item, type }: { item: RouteItem; type: 'pickup' | 'delivery' }) => {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-4 border rounded-xl bg-card hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              type === 'pickup' ? 'bg-blue-500/10' : 'bg-green-500/10'
            }`}>
              <Dog className={`w-5 h-5 ${type === 'pickup' ? 'text-blue-500' : 'text-green-500'}`} />
            </div>
            <div>
              <p className="font-semibold">{item.pet_name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> {item.client_name}
              </p>
            </div>
          </div>
          <Badge variant="outline">{item.service_type}</Badge>
        </div>
        
        <div className="mt-3 space-y-2">
          {item.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span>{item.address}{item.neighborhood ? `, ${item.neighborhood}` : ''}</span>
            </div>
          )}
          
          {item.time && (
            <div className="flex items-center gap-1 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{type === 'pickup' ? 'Buscar' : 'Entregar'}: {item.time}</span>
            </div>
          )}
          
          {item.client_whatsapp && (
            <a 
              href={`https://wa.me/55${item.client_whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-green-600 hover:underline"
            >
              <Phone className="w-4 h-4" />
              {item.client_whatsapp}
            </a>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Car className="w-8 h-8 text-primary" />
          Rota do Dia
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Buscar */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Car className="w-4 h-4 text-blue-500" />
              </div>
              🔵 Buscar ({pickupPets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-center text-muted-foreground py-4">Carregando...</p>
            ) : pickupPets.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum pet para buscar hoje
              </p>
            ) : (
              pickupPets.map((item) => (
                <RouteCard key={`pickup-${item.service_id}`} item={item} type="pickup" />
              ))
            )}
          </CardContent>
        </Card>

        {/* Entregar */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-green-500" />
              </div>
              🟢 Entregar ({deliveryPets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-center text-muted-foreground py-4">Carregando...</p>
            ) : deliveryPets.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum pet para entregar hoje
              </p>
            ) : (
              deliveryPets.map((item) => (
                <RouteCard key={`delivery-${item.service_id}`} item={item} type="delivery" />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RotaDoDia;