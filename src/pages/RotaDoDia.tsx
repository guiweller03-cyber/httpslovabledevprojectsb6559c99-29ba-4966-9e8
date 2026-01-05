import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Phone, Car, User, Dog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Logistics types that involve company pickup or delivery
const COMPANY_LOGISTICS = ['tutor_empresa', 'empresa_tutor', 'empresa_empresa'];

const LOGISTICS_LABELS: Record<string, { label: string; color: string }> = {
  tutor_tutor: { label: 'Tutor Leva e Busca', color: 'bg-blue-500' },
  tutor_empresa: { label: 'Tutor Leva / Empresa Busca', color: 'bg-yellow-500' },
  empresa_tutor: { label: 'Empresa Leva / Tutor Busca', color: 'bg-purple-500' },
  empresa_empresa: { label: 'Empresa Leva e Busca', color: 'bg-orange-500' },
};

interface PetDB {
  id: string;
  name: string;
  client_id: string;
  address?: string | null;
  neighborhood?: string | null;
  zip_code?: string | null;
  logistics_type?: string | null;
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

interface PetWithPickup {
  id: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
  pickup_time: string | null;
  delivery_time: string | null;
  client_id: string;
  client_name: string;
  client_whatsapp: string;
  service_type: string;
  service_id: string;
  logistics_type: string;
}

const RotaDoDia = () => {
  const [pickupPets, setPickupPets] = useState<PetWithPickup[]>([]);
  const [deliveryPets, setDeliveryPets] = useState<PetWithPickup[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    fetchRoutePets();
  }, []);

  const fetchRoutePets = async () => {
    setLoading(true);

    // Buscar pets que envolvem logística da empresa
    const [petsRes, clientsRes, appointmentsRes, hotelRes] = await Promise.all([
      supabase.from('pets').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('bath_grooming_appointments').select('*')
        .gte('start_datetime', `${today}T00:00:00`)
        .lt('start_datetime', `${today}T23:59:59`)
        .neq('status', 'cancelado'),
      supabase.from('hotel_stays').select('*')
        .neq('status', 'cancelado'),
    ]);

    // Cast to local types since DB may have new columns not in generated types
    const allPets = (petsRes.data || []) as unknown as PetDB[];
    // Filter pets with company logistics (empresa_tutor, tutor_empresa, empresa_empresa)
    const pets = allPets.filter(p => p.logistics_type && COMPANY_LOGISTICS.includes(p.logistics_type));
    const clients = (clientsRes.data || []) as unknown as ClientDB[];
    const appointments = appointmentsRes.data || [];
    const hotelStays = hotelRes.data || [];

    const getClient = (clientId: string) => clients.find(c => c.id === clientId);

    // Criar lista de pets para buscar (pickup) e entregar (delivery)
    const pickupList: PetWithPickup[] = [];
    const deliveryList: PetWithPickup[] = [];

    // Agendamentos de banho/tosa hoje - incluir se empresa busca ou empresa entrega
    appointments.forEach(apt => {
      const pet = pets.find(p => p.id === apt.pet_id);
      if (pet) {
        const client = getClient(pet.client_id);
        const logisticsType = pet.logistics_type || 'tutor_tutor';
        const petData: PetWithPickup = {
          id: pet.id,
          name: pet.name,
          address: pet.address || client?.address || null,
          neighborhood: pet.neighborhood || client?.neighborhood || null,
          pickup_time: pet.pickup_time || null,
          delivery_time: pet.delivery_time || null,
          client_id: pet.client_id,
          client_name: client?.name || 'N/A',
          client_whatsapp: client?.whatsapp || '',
          service_type: apt.service_type === 'banho' ? 'Banho' : 'Banho + Tosa',
          service_id: apt.id,
          logistics_type: logisticsType,
        };
        
        // Empresa busca (empresa_tutor ou empresa_empresa)
        if (logisticsType === 'empresa_tutor' || logisticsType === 'empresa_empresa') {
          pickupList.push(petData);
        }
        // Empresa entrega (tutor_empresa ou empresa_empresa)
        if (logisticsType === 'tutor_empresa' || logisticsType === 'empresa_empresa') {
          deliveryList.push(petData);
        }
      }
    });

    // Hotel check-in hoje (buscar pet)
    hotelStays.forEach(stay => {
      const checkInDate = format(new Date(stay.check_in), 'yyyy-MM-dd');
      const checkOutDate = format(new Date(stay.check_out), 'yyyy-MM-dd');
      const pet = pets.find(p => p.id === stay.pet_id);
      
      if (pet) {
        const client = getClient(pet.client_id);
        const serviceLabel = stay.is_creche ? 'Creche' : 'Hotel';
        const logisticsType = pet.logistics_type || 'tutor_tutor';
        
        if (checkInDate === today && (logisticsType === 'empresa_tutor' || logisticsType === 'empresa_empresa')) {
          pickupList.push({
            id: pet.id,
            name: pet.name,
            address: pet.address || client?.address || null,
            neighborhood: pet.neighborhood || client?.neighborhood || null,
            pickup_time: pet.pickup_time || null,
            delivery_time: pet.delivery_time || null,
            client_id: pet.client_id,
            client_name: client?.name || 'N/A',
            client_whatsapp: client?.whatsapp || '',
            service_type: serviceLabel,
            service_id: stay.id,
            logistics_type: logisticsType,
          });
        }
        
        if (checkOutDate === today && (logisticsType === 'tutor_empresa' || logisticsType === 'empresa_empresa')) {
          deliveryList.push({
            id: pet.id,
            name: pet.name,
            address: pet.address || client?.address || null,
            neighborhood: pet.neighborhood || client?.neighborhood || null,
            pickup_time: pet.pickup_time || null,
            delivery_time: pet.delivery_time || null,
            client_id: pet.client_id,
            client_name: client?.name || 'N/A',
            client_whatsapp: client?.whatsapp || '',
            service_type: serviceLabel,
            service_id: stay.id,
            logistics_type: logisticsType,
          });
        }
      }
    });

    // Ordenar por horário
    pickupList.sort((a, b) => (a.pickup_time || '').localeCompare(b.pickup_time || ''));
    deliveryList.sort((a, b) => (a.delivery_time || '').localeCompare(b.delivery_time || ''));

    setPickupPets(pickupList);
    setDeliveryPets(deliveryList);
    setLoading(false);
  };

  const PetRouteCard = ({ pet, type }: { pet: PetWithPickup; type: 'pickup' | 'delivery' }) => {
    const logistics = LOGISTICS_LABELS[pet.logistics_type] || LOGISTICS_LABELS.tutor_tutor;
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-4 border rounded-xl bg-card hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Dog className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{pet.name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> {pet.client_name}
              </p>
            </div>
          </div>
          <Badge variant="outline">{pet.service_type}</Badge>
        </div>
        
        <div className="mt-3 space-y-2">
          {pet.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span>{pet.address}{pet.neighborhood ? `, ${pet.neighborhood}` : ''}</span>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            {type === 'pickup' && pet.pickup_time && (
              <div className="flex items-center gap-1 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Buscar: {pet.pickup_time}</span>
              </div>
            )}
            {type === 'delivery' && pet.delivery_time && (
              <div className="flex items-center gap-1 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Entregar: {pet.delivery_time}</span>
              </div>
            )}
          </div>
          
          {/* Logistics badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${logistics.color}`}>
              {logistics.label}
            </span>
          </div>
          
          {pet.client_whatsapp && (
            <a 
              href={`https://wa.me/55${pet.client_whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-green-600 hover:underline"
            >
              <Phone className="w-4 h-4" />
              {pet.client_whatsapp}
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
              pickupPets.map((pet, idx) => (
                <PetRouteCard key={`pickup-${pet.service_id}-${idx}`} pet={pet} type="pickup" />
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
              deliveryPets.map((pet, idx) => (
                <PetRouteCard key={`delivery-${pet.service_id}-${idx}`} pet={pet} type="delivery" />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RotaDoDia;
