import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { DollarSign, Plus, Receipt, CreditCard, Banknote, Smartphone, Check, Gift, Trash2, Hotel, Scissors, Package, AlertCircle, Clock, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { differenceInDays, format } from 'date-fns';
import { ProductSelector } from '@/components/pos/ProductSelector';

type PaymentMethod = 'dinheiro' | 'pix' | 'credito' | 'debito';
type PaymentStatus = 'pendente' | 'pago' | 'isento';

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
  price: number | null;
  status: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  paid_at?: string | null;
  start_datetime: string;
  optional_services?: string[] | null;
  is_plan_usage?: boolean | null;
  client_plan_id?: string | null;
}

interface ServiceAddon {
  id: string;
  name: string;
  price: number;
  active: boolean | null;
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
  payment_status?: string | null;
  payment_method?: string | null;
  paid_at?: string | null;
  is_creche: boolean | null;
}

interface ClientPlan {
  id: string;
  client_id: string;
  pet_id: string;
  plan_id: string;
  total_baths: number;
  used_baths: number;
  expires_at: string;
  active: boolean | null;
}

interface ServicePrice {
  id: string;
  breed: string;
  size_category: string;
  coat_type: string;
  service_type: string;
  price: number;
}

// Itens da fatura
interface InvoiceItem {
  id: string;
  type: 'banho_tosa' | 'hotel' | 'extra' | 'produto';
  description: string;
  petName?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  coveredByPlan: boolean;
  sourceId?: string; // appointment_id ou hotel_stay_id
  petId?: string;
  serviceStatus?: string;
  paymentStatus?: PaymentStatus;
  productId?: string;
  controlStock?: boolean;
}

interface Sale {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

// Pending payment item for display
interface PendingPaymentItem {
  id: string;
  type: 'banho_tosa' | 'hotel';
  clientId: string;
  clientName: string;
  petId: string;
  petName: string;
  description: string;
  price: number;
  serviceStatus: string;
  paymentStatus: PaymentStatus;
  date: string;
  sourceId: string;
}

const paymentMethods: { value: PaymentMethod; label: string; icon: typeof DollarSign }[] = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'PIX', icon: Smartphone },
  { value: 'credito', label: 'Crédito', icon: CreditCard },
  { value: 'debito', label: 'Débito', icon: CreditCard },
];

const groomingTypeLabels: Record<string, string> = {
  'banho': 'Banho',
  'banho_tosa': 'Banho + Tosa',
  'tosa_baby': 'Tosa Baby',
  'tosa_higienica': 'Tosa Higiênica',
  'tosa_padrao': 'Tosa Padrão',
  'tosa_tesoura': 'Tosa Tesoura',
  'tosa_maquina': 'Tosa Máquina',
};

const statusLabels: Record<string, string> = {
  agendado: 'Agendado',
  em_atendimento: 'Em Atendimento',
  pronto: 'Pronto',
  finalizado: 'Finalizado',
};

const FrenteCaixa = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // State from database
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [pets, setPets] = useState<PetDB[]>([]);
  const [filteredPets, setFilteredPets] = useState<PetDB[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDB[]>([]);
  const [hotelStays, setHotelStays] = useState<HotelStayDB[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [serviceAddons, setServiceAddons] = useState<ServiceAddon[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pending payments list
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentItem[]>([]);
  
  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('pix');
  const [issueNF, setIssueNF] = useState(false);
  
  // Invoice items
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  
  // Extra item form
  const [extraDescription, setExtraDescription] = useState('');
  const [extraPrice, setExtraPrice] = useState('');

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
    // Fetch all appointments that need billing (payment_status = pendente OR null)
    // Include finalized services that haven't been paid
    const { data, error } = await supabase
      .from('bath_grooming_appointments')
      .select('*')
      .neq('status', 'cancelado');
    
    if (!error) setAppointments(data || []);
  };

  const fetchHotelStays = async () => {
    const { data, error } = await supabase
      .from('hotel_stays')
      .select('*')
      .neq('status', 'cancelado');
    
    if (!error) setHotelStays(data || []);
  };

  const fetchClientPlans = async () => {
    const { data, error } = await supabase
      .from('client_plans')
      .select('*')
      .eq('active', true)
      .gt('expires_at', new Date().toISOString());
    
    if (!error) setClientPlans(data || []);
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

  // Build pending payments list - services FINALIZED but NOT PAID
  // This is the key fix: finalized services with pending payment must appear here
  const buildPendingPayments = () => {
    const pending: PendingPaymentItem[] = [];

    // Add appointments that are FINALIZED but NOT PAID (payment_status != 'pago')
    // OR services that are still in progress (not finalized, not cancelled)
    for (const apt of appointments) {
      // Skip cancelled
      if (apt.status === 'cancelado') continue;
      
      // Skip already paid
      if (apt.payment_status === 'pago' || apt.payment_status === 'isento') continue;
      
      const client = clients.find(c => c.id === apt.client_id);
      const pet = pets.find(p => p.id === apt.pet_id);
      
      const groomingLabel = apt.grooming_type 
        ? groomingTypeLabels[apt.grooming_type] || apt.grooming_type
        : groomingTypeLabels[apt.service_type] || apt.service_type;

      pending.push({
        id: `apt_${apt.id}`,
        type: 'banho_tosa',
        clientId: apt.client_id,
        clientName: client?.name || 'N/A',
        petId: apt.pet_id,
        petName: pet?.name || 'N/A',
        description: groomingLabel,
        price: apt.price || 50,
        serviceStatus: apt.status || 'agendado',
        paymentStatus: (apt.payment_status as PaymentStatus) || 'pendente',
        date: apt.start_datetime,
        sourceId: apt.id,
      });
    }

    // Add hotel stays that are NOT PAID (not check_out with payment, not cancelled)
    for (const stay of hotelStays) {
      // Skip cancelled
      if (stay.status === 'cancelado') continue;
      
      // Skip already paid
      if (stay.payment_status === 'pago' || stay.payment_status === 'isento') continue;
      
      const client = clients.find(c => c.id === stay.client_id);
      const pet = pets.find(p => p.id === stay.pet_id);
      
      const nights = Math.max(1, differenceInDays(new Date(stay.check_out), new Date(stay.check_in)));
      const totalPrice = stay.total_price || (nights * stay.daily_rate);

      pending.push({
        id: `hotel_${stay.id}`,
        type: 'hotel',
        clientId: stay.client_id,
        clientName: client?.name || 'N/A',
        petId: stay.pet_id,
        petName: pet?.name || 'N/A',
        description: stay.is_creche ? 'Creche (Day Care)' : `Hotel - ${nights} diária${nights > 1 ? 's' : ''}`,
        price: totalPrice,
        serviceStatus: stay.status || 'reservado',
        paymentStatus: (stay.payment_status as PaymentStatus) || 'pendente',
        date: stay.check_out,
        sourceId: stay.id,
      });
    }

    // Sort: FINALIZED services with pending payment come FIRST (ready to be paid)
    pending.sort((a, b) => {
      // Finalized services come first as they're ready to be collected
      if (a.serviceStatus === 'finalizado' && b.serviceStatus !== 'finalizado') return -1;
      if (b.serviceStatus === 'finalizado' && a.serviceStatus !== 'finalizado') return 1;
      // Then "pronto" services
      if (a.serviceStatus === 'pronto' && b.serviceStatus !== 'pronto') return -1;
      if (b.serviceStatus === 'pronto' && a.serviceStatus !== 'pronto') return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    setPendingPayments(pending);
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchClients(),
        fetchPets(),
        fetchAppointments(),
        fetchHotelStays(),
        fetchClientPlans(),
        fetchServicePrices(),
        fetchServiceAddons(),
      ]);
    };
    loadData();
  }, []);

  // Auto-select from URL params (when redirected from ServicosDoDia)
  useEffect(() => {
    const appointmentIdParam = searchParams.get('appointmentId');
    const clientIdParam = searchParams.get('clientId');
    const petIdParam = searchParams.get('petId');
    
    // Priority 1: Load from appointmentId (new flow from ServicosDoDia)
    if (appointmentIdParam && appointments.length > 0 && clients.length > 0 && pets.length > 0) {
      const appointment = appointments.find(a => a.id === appointmentIdParam);
      if (appointment) {
        setSelectedClient(appointment.client_id);
        // Pet will be set after client is selected and filteredPets updates
        setTimeout(() => {
          setSelectedPetId(appointment.pet_id);
        }, 100);
      }
      return;
    }
    
    // Priority 2: Legacy params (clientId/petId)
    if (clientIdParam && clients.length > 0) {
      setSelectedClient(clientIdParam);
    }
    if (petIdParam && pets.length > 0 && clientIdParam === selectedClient) {
      setSelectedPetId(petIdParam);
    }
  }, [searchParams, clients, pets, appointments, selectedClient]);

  // Build pending payments when data changes
  useEffect(() => {
    if (clients.length > 0 && pets.length > 0) {
      buildPendingPayments();
    }
  }, [clients, pets, appointments, hotelStays]);

  // Filter pets when client changes
  useEffect(() => {
    if (selectedClient) {
      const clientPets = pets.filter(p => p.client_id === selectedClient);
      setFilteredPets(clientPets);
      setSelectedPetId('');
      setInvoiceItems([]);
    } else {
      setFilteredPets([]);
      setSelectedPetId('');
      setInvoiceItems([]);
    }
  }, [selectedClient, pets]);

  // Load services when pet is selected
  useEffect(() => {
    if (!selectedPetId || !selectedClient) {
      setInvoiceItems([]);
      return;
    }

    const pet = pets.find(p => p.id === selectedPetId);
    if (!pet) return;

    const items: InvoiceItem[] = [];

    // 1. Check for grooming appointments that need billing:
    // - FINALIZED with payment_status != 'pago'/'isento' (main case after clicking "Finalizar")
    // - OR still in progress (agendado, em_atendimento, pronto)
    const petAppointments = appointments.filter(a => 
      a.pet_id === selectedPetId && 
      a.client_id === selectedClient &&
      a.status !== 'cancelado' &&
      a.payment_status !== 'pago' &&
      a.payment_status !== 'isento'
    );

    // Check for active plan
    const activePlan = clientPlans.find(cp => 
      cp.pet_id === selectedPetId && 
      cp.client_id === selectedClient && 
      cp.active &&
      cp.used_baths < cp.total_baths &&
      new Date(cp.expires_at) > new Date()
    );

    const remainingCredits = activePlan
      ? activePlan.total_baths - activePlan.used_baths 
      : 0;

    let usedCredits = 0;

    for (const apt of petAppointments) {
      // Calculate price for main service
      let price = apt.price || 0;
      if (!price) {
        const priceMatch = servicePrices.find(sp => 
          sp.size_category === pet.size && 
          sp.service_type === (apt.grooming_type || apt.service_type)
        );
        price = priceMatch?.price || 50;
      }

      // Check if appointment uses plan credit OR has is_plan_usage flag
      const isPlanUsage = Boolean(apt.is_plan_usage) || Boolean(apt.client_plan_id);
      const canUseCredit = !isPlanUsage && usedCredits < remainingCredits;
      if (canUseCredit) usedCredits++;
      
      // Main service is covered by plan if is_plan_usage or we're using available credits
      const mainServiceCovered = isPlanUsage || canUseCredit;

      const groomingLabel = apt.grooming_type 
        ? groomingTypeLabels[apt.grooming_type] || apt.grooming_type
        : groomingTypeLabels[apt.service_type] || apt.service_type;

      // Add main service item
      items.push({
        id: `apt_${apt.id}`,
        type: 'banho_tosa',
        description: mainServiceCovered ? `${groomingLabel} (Plano)` : groomingLabel,
        petName: pet.name,
        unitPrice: price,
        quantity: 1,
        totalPrice: mainServiceCovered ? 0 : price,
        coveredByPlan: mainServiceCovered,
        sourceId: apt.id,
        petId: pet.id,
        serviceStatus: apt.status || 'agendado',
        paymentStatus: 'pendente' as PaymentStatus,
      });

      // Add optional services (addons) - ALWAYS billed separately, even for plan usage
      if (apt.optional_services && apt.optional_services.length > 0) {
        for (const addonId of apt.optional_services) {
          const addon = serviceAddons.find(sa => sa.id === addonId);
          if (addon) {
            items.push({
              id: `addon_${apt.id}_${addonId}`,
              type: 'extra',
              description: addon.name,
              petName: pet.name,
              unitPrice: addon.price,
              quantity: 1,
              totalPrice: addon.price,
              coveredByPlan: false, // Addons are NEVER covered by plan
              sourceId: apt.id,
              petId: pet.id,
              serviceStatus: apt.status || 'agendado',
              paymentStatus: 'pendente' as PaymentStatus,
            });
          }
        }
      }
    }

    // 2. Check for hotel stays that need billing (not paid yet)
    const petHotelStays = hotelStays.filter(h => 
      h.pet_id === selectedPetId && 
      h.client_id === selectedClient &&
      h.status !== 'cancelado' &&
      h.payment_status !== 'pago' &&
      h.payment_status !== 'isento'
    );

    for (const stay of petHotelStays) {
      const checkIn = new Date(stay.check_in);
      const checkOut = new Date(stay.check_out);
      const nights = Math.max(1, differenceInDays(checkOut, checkIn));
      const totalPrice = stay.total_price || (nights * stay.daily_rate);

      items.push({
        id: `hotel_${stay.id}`,
        type: 'hotel',
        description: stay.is_creche ? 'Creche (Day Care)' : `Hotel - ${nights} diária${nights > 1 ? 's' : ''}`,
        petName: pet.name,
        unitPrice: stay.daily_rate,
        quantity: nights,
        totalPrice: totalPrice,
        coveredByPlan: false,
        sourceId: stay.id,
        petId: pet.id,
        serviceStatus: stay.status || 'reservado',
        paymentStatus: 'pendente' as PaymentStatus,
      });
    }

    setInvoiceItems(items);
  }, [selectedPetId, selectedClient, pets, appointments, hotelStays, clientPlans, servicePrices, serviceAddons]);

  // Add extra item
  const handleAddExtraItem = () => {
    if (!extraDescription.trim() || !extraPrice) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe descrição e valor.",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(extraPrice.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor válido.",
        variant: "destructive",
      });
      return;
    }

    const newItem: InvoiceItem = {
      id: `extra_${Date.now()}`,
      type: 'extra',
      description: extraDescription,
      unitPrice: price,
      quantity: 1,
      totalPrice: price,
      coveredByPlan: false,
    };

    setInvoiceItems(prev => [...prev, newItem]);
    setExtraDescription('');
    setExtraPrice('');

    toast({
      title: "Item adicionado",
      description: `${extraDescription} - R$ ${price.toFixed(2)}`,
    });
  };

  // Remove item from invoice
  const handleRemoveItem = (itemId: string) => {
    setInvoiceItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Calculate totals
  const subtotal = invoiceItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const planDiscount = invoiceItems
    .filter(item => item.coveredByPlan)
    .reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const totalToPay = subtotal - planDiscount;

  const itemsCoveredByPlan = invoiceItems.filter(item => item.coveredByPlan);

  const todaySales = sales.filter(s => 
    new Date(s.createdAt).toDateString() === new Date().toDateString()
  );
  const todayTotal = todaySales.reduce((acc, s) => acc + s.amount, 0);

  const handleFinalizeSale = async () => {
    if (!selectedClient || invoiceItems.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione cliente e adicione itens à fatura.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const now = new Date().toISOString();

      // 1. Update appointments - mark payment as PAID
      const appointmentItems = invoiceItems.filter(item => item.type === 'banho_tosa' && item.sourceId);
      for (const item of appointmentItems) {
        const paymentStatus = item.coveredByPlan ? 'isento' : 'pago';
        
        const { error: aptError } = await supabase
          .from('bath_grooming_appointments')
          .update({ 
            status: 'finalizado',
            payment_status: paymentStatus,
            payment_method: item.coveredByPlan ? null : selectedPayment,
            paid_at: now,
          } as any)
          .eq('id', item.sourceId);

        if (aptError) {
          console.error('Error updating appointment:', aptError);
          throw aptError;
        }

        // Deduct plan credit if used
        if (item.coveredByPlan && item.petId) {
          const activePlan = clientPlans.find(cp => 
            cp.pet_id === item.petId && 
            cp.client_id === selectedClient && 
            cp.active &&
            cp.used_baths < cp.total_baths
          );

          if (activePlan) {
            const newUsedBaths = activePlan.used_baths + 1;
            await supabase
              .from('client_plans')
              .update({ 
                used_baths: newUsedBaths,
                active: newUsedBaths < activePlan.total_baths
              })
              .eq('id', activePlan.id);
          }
        }
      }

      // 2. Update hotel stays - mark as PAID
      const hotelItems = invoiceItems.filter(item => item.type === 'hotel' && item.sourceId);
      for (const item of hotelItems) {
        const { error: hotelError } = await supabase
          .from('hotel_stays')
          .update({ 
            status: 'check_out',
            payment_status: 'pago',
            payment_method: selectedPayment,
            paid_at: now,
          } as any)
          .eq('id', item.sourceId);

        if (hotelError) {
          console.error('Error updating hotel stay:', hotelError);
          throw hotelError;
        }
      }

      // 3. Update stock for products sold
      const productItems = invoiceItems.filter(item => item.type === 'produto' && item.productId && item.controlStock);
      for (const item of productItems) {
        // Deduct stock
        const { data: product } = await (supabase as any).from('products')
          .select('stock_quantity')
          .eq('id', item.productId)
          .single();
        
        if (product) {
          const newStock = Math.max(0, product.stock_quantity - item.quantity);
          await (supabase as any).from('products')
            .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
            .eq('id', item.productId);
          
          // Record movement
          await (supabase as any).from('stock_movements')
            .insert({
              product_id: item.productId,
              type: 'venda',
              quantity: item.quantity,
              reason: `Venda para ${clients.find(c => c.id === selectedClient)?.name}`,
            });
        }
      }

      // 4. Update client last_purchase
      await supabase
        .from('clients')
        .update({ last_purchase: now })
        .eq('id', selectedClient);

      // 4. Create sale record (local state for now)
      const client = clients.find(c => c.id === selectedClient);
      const pet = pets.find(p => p.id === selectedPetId);
      const itemDescriptions = invoiceItems.map(item => item.description).join(', ');
      
      const newSale: Sale = {
        id: String(Date.now()),
        clientId: selectedClient,
        description: `${pet?.name}: ${itemDescriptions}`,
        amount: totalToPay,
        paymentMethod: selectedPayment,
        createdAt: now,
      };

      setSales(prev => [newSale, ...prev]);

      const planMessage = itemsCoveredByPlan.length > 0 
        ? ` (${itemsCoveredByPlan.length} serviço(s) coberto(s) pelo plano)` 
        : '';

      toast({
        title: "✅ Pagamento Registrado!",
        description: `Cobrança de R$ ${totalToPay.toFixed(2)} para ${client?.name}.${planMessage}`,
      });

      // Reset form
      setSelectedClient('');
      setSelectedPetId('');
      setInvoiceItems([]);
      setIssueNF(false);
      
      // Refresh data from database to update UI immediately
      await Promise.all([
        fetchAppointments(),
        fetchHotelStays(),
        fetchClientPlans(),
      ]);

    } catch (error) {
      console.error('Error finalizing sale:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao registrar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Quick pay a single pending item
  const handleQuickPay = async (item: PendingPaymentItem) => {
    // VALIDATE: Check if sourceId exists
    if (!item.sourceId) {
      toast({
        title: "Erro: Registro não encontrado",
        description: "Registro financeiro não encontrado para este serviço. Finalize o serviço novamente.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date().toISOString();

      if (item.type === 'banho_tosa') {
        // First verify the record exists
        const { data: existing, error: checkError } = await supabase
          .from('bath_grooming_appointments')
          .select('id, status')
          .eq('id', item.sourceId)
          .maybeSingle();

        if (checkError || !existing) {
          console.error('Record not found:', checkError);
          throw new Error('Registro financeiro não encontrado para este serviço.');
        }

        const { error } = await supabase
          .from('bath_grooming_appointments')
          .update({ 
            status: 'finalizado',
            payment_status: 'pago',
            payment_method: selectedPayment,
            paid_at: now,
          } as any)
          .eq('id', item.sourceId);

        if (error) {
          console.error('Error updating appointment:', error);
          throw error;
        }
      } else {
        // First verify the record exists
        const { data: existing, error: checkError } = await supabase
          .from('hotel_stays')
          .select('id, status')
          .eq('id', item.sourceId)
          .maybeSingle();

        if (checkError || !existing) {
          console.error('Record not found:', checkError);
          throw new Error('Registro financeiro não encontrado para este serviço.');
        }

        const { error } = await supabase
          .from('hotel_stays')
          .update({ 
            status: 'check_out',
            payment_status: 'pago',
            payment_method: selectedPayment,
            paid_at: now,
          } as any)
          .eq('id', item.sourceId);

        if (error) {
          console.error('Error updating hotel stay:', error);
          throw error;
        }
      }

      // Update client
      await supabase
        .from('clients')
        .update({ last_purchase: now })
        .eq('id', item.clientId);

      // Add to sales
      const newSale: Sale = {
        id: String(Date.now()),
        clientId: item.clientId,
        description: `${item.petName}: ${item.description}`,
        amount: item.price,
        paymentMethod: selectedPayment,
        createdAt: now,
      };
      setSales(prev => [newSale, ...prev]);

      toast({
        title: "✅ Pagamento Registrado!",
        description: `${item.description} - R$ ${item.price.toFixed(2)}`,
      });

      // Refresh data immediately after payment
      await Promise.all([
        fetchAppointments(),
        fetchHotelStays(),
      ]);
    } catch (error: any) {
      console.error('Quick pay error:', error);
      toast({
        title: "Erro ao registrar pagamento",
        description: error?.message || "Registro financeiro não encontrado para este serviço. Finalize o serviço novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getClient = (clientId: string) => clients.find(c => c.id === clientId);
  const selectedPet = pets.find(p => p.id === selectedPetId);

  // Check if selected pet has active plan
  const activePlanForPet = selectedPetId ? clientPlans.find(cp => 
    cp.pet_id === selectedPetId && 
    cp.client_id === selectedClient && 
    cp.active &&
    cp.used_baths < cp.total_baths &&
    new Date(cp.expires_at) > new Date()
  ) : null;

  const remainingPlanCredits = activePlanForPet 
    ? activePlanForPet.total_baths - activePlanForPet.used_baths 
    : 0;

  // Count pending payments - FINALIZED services waiting for payment are critical
  const totalPendingPayments = pendingPayments.length;
  const finishedPendingPayments = pendingPayments.filter(p => p.serviceStatus === 'finalizado' || p.serviceStatus === 'pronto');

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
              <DollarSign className="w-8 h-8 text-primary" />
              Frente de Caixa
            </h1>
            <p className="text-muted-foreground mt-1">
              Cobrança unificada - Serviços + Hotel + Itens Extras
            </p>
          </div>
          
          {/* Pending Alert */}
          {finishedPendingPayments.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-100 border border-red-300 rounded-xl text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{finishedPendingPayments.length} serviço(s) finalizado(s) aguardando pagamento</span>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Invoice Builder */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Client & Pet Selection */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Nova Cobrança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Client Selection */}
                <div>
                  <Label>Cliente *</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
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

                {/* Pet Selection */}
                <div>
                  <Label>Pet *</Label>
                  <Select 
                    value={selectedPetId} 
                    onValueChange={setSelectedPetId}
                    disabled={!selectedClient}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedClient ? "Selecione o pet" : "Selecione um cliente primeiro"} />
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
              </div>

              {/* Plan Info Badge */}
              {selectedPetId && activePlanForPet && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <Gift className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">
                      {selectedPet?.name} tem plano ativo
                    </p>
                    <p className="text-sm text-green-600">
                      {remainingPlanCredits} crédito{remainingPlanCredits !== 1 ? 's' : ''} disponível{remainingPlanCredits !== 1 ? 'is' : ''}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Items */}
          {selectedPetId && (
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Itens da Fatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoiceItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum serviço com pagamento pendente para este pet.
                    <br />
                    <span className="text-sm">Adicione itens extras abaixo se necessário.</span>
                  </p>
                ) : (
                  <div className="space-y-3">
                    {invoiceItems.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border",
                          item.coveredByPlan 
                            ? "bg-green-50 border-green-200" 
                            : item.paymentStatus === 'pendente'
                              ? "bg-red-50 border-red-200"
                              : "bg-muted/30 border-border"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {item.type === 'banho_tosa' && <Scissors className="w-5 h-5 text-primary" />}
                          {item.type === 'hotel' && <Hotel className="w-5 h-5 text-orange-500" />}
                          {item.type === 'extra' && <Package className="w-5 h-5 text-purple-500" />}
                          
                          <div>
                            <p className="font-medium">{item.description}</p>
                            {item.petName && (
                              <p className="text-sm text-muted-foreground">{item.petName}</p>
                            )}
                            {item.serviceStatus && item.type !== 'extra' && (
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {statusLabels[item.serviceStatus] || item.serviceStatus}
                                </Badge>
                                {item.paymentStatus === 'pendente' && (
                                  <Badge variant="destructive" className="text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pgto Pendente
                                  </Badge>
                                )}
                              </div>
                            )}
                            {item.type === 'hotel' && item.quantity > 1 && (
                              <p className="text-xs text-muted-foreground">
                                {item.quantity}x R$ {item.unitPrice.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {item.coveredByPlan ? (
                            <Badge className="bg-green-100 text-green-700 border-0">
                              <Check className="w-3 h-3 mr-1" />
                              Coberto pelo Plano
                            </Badge>
                          ) : (
                            <span className="font-bold text-primary">
                              R$ {item.totalPrice.toFixed(2)}
                            </span>
                          )}
                          
                          {item.type === 'extra' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Products & Extra Items Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Produtos do Estoque
                  </h4>
                  <ProductSelector
                    onSelectProduct={(product, quantity) => {
                      const newItem: InvoiceItem = {
                        id: `prod_${product.id}_${Date.now()}`,
                        type: 'produto',
                        description: product.name,
                        unitPrice: product.sale_price,
                        quantity: quantity,
                        totalPrice: product.sale_price * quantity,
                        coveredByPlan: false,
                        productId: product.id,
                        controlStock: product.control_stock,
                      };
                      setInvoiceItems(prev => [...prev, newItem]);
                      toast({
                        title: "Produto adicionado",
                        description: `${quantity}x ${product.name}`,
                      });
                    }}
                    trigger={
                      <Button variant="outline" className="w-full gap-2">
                        <Package className="w-4 h-4" />
                        Adicionar Produto do Estoque
                      </Button>
                    }
                  />
                  
                  <div className="pt-2">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Item Avulso (sem estoque)
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        placeholder="Descrição"
                        value={extraDescription}
                        onChange={(e) => setExtraDescription(e.target.value)}
                        className="col-span-2"
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="Valor"
                          value={extraPrice}
                          onChange={(e) => setExtraPrice(e.target.value)}
                          type="text"
                          className="w-24"
                        />
                        <Button onClick={handleAddExtraItem} size="icon">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment & Finalize */}
          {invoiceItems.length > 0 && (
            <Card className="border-0 shadow-soft">
              <CardContent className="p-6 space-y-6">
                {/* Summary */}
                <div className="space-y-3">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  {planDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        Desconto do Plano
                      </span>
                      <span>- R$ {planDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total a Cobrar</span>
                    <span className="text-primary">R$ {totalToPay.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <Label className="mb-3 block">Forma de Pagamento</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {paymentMethods.map(method => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.value}
                          onClick={() => setSelectedPayment(method.value)}
                          className={cn(
                            "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                            selectedPayment === method.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <Icon className={cn(
                            "w-6 h-6",
                            selectedPayment === method.value ? "text-primary" : "text-muted-foreground"
                          )} />
                          <span className={cn(
                            "text-sm font-medium",
                            selectedPayment === method.value ? "text-primary" : "text-muted-foreground"
                          )}>
                            {method.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* NF-e Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div className="flex items-center gap-3">
                    <Receipt className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Emitir NF-e</p>
                      <p className="text-sm text-muted-foreground">
                        Preparar dados para nota fiscal
                      </p>
                    </div>
                  </div>
                  <Switch checked={issueNF} onCheckedChange={setIssueNF} />
                </div>

                {/* Finalize Button */}
                <Button 
                  className="w-full h-14 text-lg bg-gradient-success hover:opacity-90"
                  onClick={handleFinalizeSale}
                  disabled={isLoading}
                >
                  <Check className="w-5 h-5 mr-2" />
                  {isLoading ? 'Registrando...' : `Registrar Pagamento - R$ ${totalToPay.toFixed(2)}`}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pending Payments List */}
          {pendingPayments.length > 0 && !selectedPetId && (
            <Card className="border-0 shadow-soft border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  Pagamentos Pendentes ({totalPendingPayments})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {pendingPayments.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border",
                        item.serviceStatus === 'finalizado'
                          ? "bg-red-50 border-red-300"
                          : "bg-amber-50 border-amber-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {item.type === 'banho_tosa' ? (
                          <Scissors className="w-5 h-5 text-primary" />
                        ) : (
                          <Hotel className="w-5 h-5 text-orange-500" />
                        )}
                        
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.petName} • {item.clientName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {statusLabels[item.serviceStatus] || item.serviceStatus}
                            </Badge>
                            <Badge variant="destructive" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Pgto Pendente
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-red-600">
                          R$ {item.price.toFixed(2)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleQuickPay(item)}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Pagar
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Right Column - Today's Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Payment Method Quick Select for pending list */}
          {!selectedPetId && pendingPayments.length > 0 && (
            <Card className="border-0 shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map(method => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        onClick={() => setSelectedPayment(method.value)}
                        className={cn(
                          "p-3 rounded-xl border-2 flex items-center gap-2 transition-all",
                          selectedPayment === method.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <Icon className={cn(
                          "w-4 h-4",
                          selectedPayment === method.value ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                          "text-sm font-medium",
                          selectedPayment === method.value ? "text-primary" : "text-muted-foreground"
                        )}>
                          {method.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Total */}
          <Card className="border-0 shadow-soft bg-gradient-primary text-white">
            <CardContent className="p-6">
              <p className="text-white/80 text-sm">Total de Hoje</p>
              <p className="text-4xl font-display font-bold mt-2">
                R$ {todayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-white/60 text-sm mt-2">
                {todaySales.length} pagamento{todaySales.length !== 1 ? 's' : ''} registrado{todaySales.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          {/* Pending Summary */}
          {totalPendingPayments > 0 && (
            <Card className="border-0 shadow-soft bg-red-50 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-semibold">Pendências</p>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {totalPendingPayments} serviço{totalPendingPayments !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-600/80 mt-1">
                  aguardando pagamento
                </p>
              </CardContent>
            </Card>
          )}

          {/* Recent Sales */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Pagamentos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sales.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum pagamento registrado ainda
                  </p>
                ) : (
                  sales.slice(0, 5).map((sale, index) => {
                    const client = getClient(sale.clientId);
                    return (
                      <motion.div
                        key={sale.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm truncate max-w-[150px]">{sale.description}</p>
                          <p className="text-xs text-muted-foreground">{client?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            R$ {sale.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {sale.paymentMethod}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default FrenteCaixa;
