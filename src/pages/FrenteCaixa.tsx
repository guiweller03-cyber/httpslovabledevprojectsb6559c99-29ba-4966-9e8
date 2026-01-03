import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Plus, Receipt, CreditCard, Banknote, Smartphone, Check, Gift, Trash2, Hotel, Scissors, Package } from 'lucide-react';
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
import { differenceInDays } from 'date-fns';

type PaymentMethod = 'dinheiro' | 'pix' | 'credito' | 'debito';

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
  start_datetime: string;
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
  type: 'banho_tosa' | 'hotel' | 'extra';
  description: string;
  petName?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  coveredByPlan: boolean;
  sourceId?: string; // appointment_id ou hotel_stay_id
  petId?: string;
}

interface Sale {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
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

const FrenteCaixa = () => {
  const { toast } = useToast();
  
  // State from database
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [pets, setPets] = useState<PetDB[]>([]);
  const [filteredPets, setFilteredPets] = useState<PetDB[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDB[]>([]);
  const [hotelStays, setHotelStays] = useState<HotelStayDB[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
    // Fetch appointments that are ready to be billed (pronto or em_atendimento)
    const { data, error } = await supabase
      .from('bath_grooming_appointments')
      .select('*')
      .in('status', ['agendado', 'em_atendimento', 'pronto']);
    
    if (!error) setAppointments(data || []);
  };

  const fetchHotelStays = async () => {
    // Fetch hotel stays that need billing (check_out today or before, not finalized)
    const { data, error } = await supabase
      .from('hotel_stays')
      .select('*')
      .in('status', ['reservado', 'check_in', 'hospedado']);
    
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

  useEffect(() => {
    fetchClients();
    fetchPets();
    fetchAppointments();
    fetchHotelStays();
    fetchClientPlans();
    fetchServicePrices();
  }, []);

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

    // 1. Check for grooming appointments
    const petAppointments = appointments.filter(a => 
      a.pet_id === selectedPetId && 
      a.client_id === selectedClient
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
      // Calculate price
      let price = apt.price || 0;
      if (!price) {
        const priceMatch = servicePrices.find(sp => 
          sp.size_category === pet.size && 
          sp.service_type === (apt.grooming_type || apt.service_type)
        );
        price = priceMatch?.price || 50;
      }

      const canUseCredit = usedCredits < remainingCredits;
      if (canUseCredit) usedCredits++;

      const groomingLabel = apt.grooming_type 
        ? groomingTypeLabels[apt.grooming_type] || apt.grooming_type
        : groomingTypeLabels[apt.service_type] || apt.service_type;

      items.push({
        id: `apt_${apt.id}`,
        type: 'banho_tosa',
        description: groomingLabel,
        petName: pet.name,
        unitPrice: price,
        quantity: 1,
        totalPrice: canUseCredit ? 0 : price,
        coveredByPlan: canUseCredit,
        sourceId: apt.id,
        petId: pet.id,
      });
    }

    // 2. Check for hotel stays
    const petHotelStays = hotelStays.filter(h => 
      h.pet_id === selectedPetId && 
      h.client_id === selectedClient
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
      });
    }

    setInvoiceItems(items);
  }, [selectedPetId, selectedClient, pets, appointments, hotelStays, clientPlans, servicePrices]);

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
  const itemsNotCoveredByPlan = invoiceItems.filter(item => !item.coveredByPlan);

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
      // 1. Update appointments to finalizado
      const appointmentItems = invoiceItems.filter(item => item.type === 'banho_tosa' && item.sourceId);
      for (const item of appointmentItems) {
        await supabase
          .from('bath_grooming_appointments')
          .update({ status: 'finalizado' })
          .eq('id', item.sourceId);

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

      // 2. Update hotel stays to check_out
      const hotelItems = invoiceItems.filter(item => item.type === 'hotel' && item.sourceId);
      for (const item of hotelItems) {
        await supabase
          .from('hotel_stays')
          .update({ status: 'check_out' })
          .eq('id', item.sourceId);
      }

      // 3. Update client last_purchase
      await supabase
        .from('clients')
        .update({ last_purchase: new Date().toISOString() })
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
        createdAt: new Date().toISOString(),
      };

      setSales(prev => [newSale, ...prev]);

      const planMessage = itemsCoveredByPlan.length > 0 
        ? ` (${itemsCoveredByPlan.length} serviço(s) coberto(s) pelo plano)` 
        : '';

      toast({
        title: "✅ Venda Finalizada!",
        description: `Cobrança de R$ ${totalToPay.toFixed(2)} para ${client?.name}.${planMessage}`,
      });

      // Reset form
      setSelectedClient('');
      setSelectedPetId('');
      setInvoiceItems([]);
      setIssueNF(false);
      
      // Refresh data
      fetchAppointments();
      fetchHotelStays();
      fetchClientPlans();

    } catch (error) {
      console.error('Error finalizing sale:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao finalizar a venda.",
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
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Builder */}
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
                    Nenhum serviço pendente encontrado para este pet.
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

                {/* Extra Items Section */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Itens Adicionais / Venda Avulsa
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      placeholder="Descrição (ex: Ração, Coleira)"
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
                  {isLoading ? 'Finalizando...' : `Finalizar Cobrança - R$ ${totalToPay.toFixed(2)}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Today's Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Today's Total */}
          <Card className="border-0 shadow-soft bg-gradient-primary text-white">
            <CardContent className="p-6">
              <p className="text-white/80 text-sm">Total de Hoje</p>
              <p className="text-4xl font-display font-bold mt-2">
                R$ {todayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-white/60 text-sm mt-2">
                {todaySales.length} venda{todaySales.length !== 1 ? 's' : ''} realizada{todaySales.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Vendas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sales.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma venda registrada ainda
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
