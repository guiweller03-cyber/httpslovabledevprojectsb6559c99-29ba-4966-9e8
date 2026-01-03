import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Plus, Receipt, CreditCard, Banknote, Smartphone, Check, Gift, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type PaymentMethod = 'dinheiro' | 'pix' | 'credito' | 'debito';
type SaleType = 'banho' | 'hotelzinho' | 'plano' | 'adicional';

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

interface AppointmentDB {
  id: string;
  client_id: string;
  pet_id: string;
  service_type: string;
  price: number | null;
  status: string | null;
  start_datetime: string;
}

interface ClientPlan {
  id: string;
  client_id: string;
  pet_id: string;
  plan_id: string;
  baths_remaining: number;
  expires_at: string;
  active: boolean;
}

interface BathPlan {
  id: string;
  plan_name: string;
  total_baths: number;
  price: number;
  validity_days: number | null;
}

interface ServicePrice {
  id: string;
  breed: string;
  size_category: string;
  service_type: string;
  price: number;
}

interface SelectedPetInfo {
  pet: PetDB;
  appointment: AppointmentDB | null;
  calculatedPrice: number;
  hasPlanCredit: boolean;
  planId?: string;
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

const saleTypes: { value: SaleType; label: string }[] = [
  { value: 'banho', label: 'Banho' },
  { value: 'hotelzinho', label: 'Hotelzinho' },
  { value: 'plano', label: 'Plano' },
  { value: 'adicional', label: 'Adicional' },
];

const FrenteCaixa = () => {
  const { toast } = useToast();
  
  // State from database
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [pets, setPets] = useState<PetDB[]>([]);
  const [filteredPets, setFilteredPets] = useState<PetDB[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDB[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [bathPlans, setBathPlans] = useState<BathPlan[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [selectedPetsInfo, setSelectedPetsInfo] = useState<SelectedPetInfo[]>([]);
  const [selectedType, setSelectedType] = useState<SaleType>('banho');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('pix');
  const [description, setDescription] = useState('');
  const [issueNF, setIssueNF] = useState(false);

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
    // Fetch today's appointments that are finalized or pronto
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('bath_grooming_appointments')
      .select('*')
      .gte('start_datetime', today.toISOString())
      .lt('start_datetime', tomorrow.toISOString())
      .in('status', ['agendado', 'em_atendimento', 'pronto', 'finalizado']);
    
    if (!error) setAppointments(data || []);
  };

  const fetchClientPlans = async () => {
    // Note: This table will be created - for now gracefully handle if it doesn't exist
    // The client_plans feature is prepared for when the table is created
    setClientPlans([]);
  };

  const fetchBathPlans = async () => {
    const { data, error } = await supabase
      .from('bath_plans')
      .select('*');
    
    if (!error) setBathPlans(data || []);
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
    fetchClientPlans();
    fetchBathPlans();
    fetchServicePrices();
  }, []);

  // Filter pets when client changes
  useEffect(() => {
    if (selectedClient) {
      const clientPets = pets.filter(p => p.client_id === selectedClient);
      setFilteredPets(clientPets);
      setSelectedPetIds([]);
      setSelectedPetsInfo([]);
    } else {
      setFilteredPets([]);
      setSelectedPetIds([]);
      setSelectedPetsInfo([]);
    }
  }, [selectedClient, pets]);

  // Calculate prices for selected pets
  useEffect(() => {
    if (selectedPetIds.length === 0) {
      setSelectedPetsInfo([]);
      return;
    }

    const petsInfo: SelectedPetInfo[] = selectedPetIds.map(petId => {
      const pet = pets.find(p => p.id === petId);
      if (!pet) return null;

      // Check for existing appointment
      const appointment = appointments.find(a => 
        a.pet_id === petId && 
        a.client_id === selectedClient &&
        (a.status === 'agendado' || a.status === 'em_atendimento' || a.status === 'pronto')
      );

      // Check for plan credit
      const activePlan = clientPlans.find(cp => 
        cp.pet_id === petId && 
        cp.client_id === selectedClient && 
        cp.baths_remaining > 0 &&
        cp.active &&
        new Date(cp.expires_at) > new Date()
      );

      // Calculate price from service_prices table
      let calculatedPrice = 0;
      if (appointment?.price) {
        calculatedPrice = appointment.price;
      } else {
        // Find price based on pet characteristics
        const sizeMatch = servicePrices.find(sp => 
          sp.size_category === pet.size && 
          sp.service_type === 'banho'
        );
        if (sizeMatch) {
          calculatedPrice = sizeMatch.price;
        } else {
          // Default price
          calculatedPrice = 50;
        }
      }

      return {
        pet,
        appointment,
        calculatedPrice,
        hasPlanCredit: !!activePlan,
        planId: activePlan?.id,
      };
    }).filter(Boolean) as SelectedPetInfo[];

    setSelectedPetsInfo(petsInfo);
  }, [selectedPetIds, pets, appointments, clientPlans, servicePrices, selectedClient]);

  const togglePetSelection = (petId: string) => {
    setSelectedPetIds(prev => 
      prev.includes(petId) 
        ? prev.filter(id => id !== petId)
        : [...prev, petId]
    );
  };

  // Calculate totals
  const totalWithCredits = selectedPetsInfo.reduce((acc, info) => {
    return acc + (info.hasPlanCredit ? 0 : info.calculatedPrice);
  }, 0);

  const petsWithCredits = selectedPetsInfo.filter(info => info.hasPlanCredit);
  const petsWithoutCredits = selectedPetsInfo.filter(info => !info.hasPlanCredit);

  const todaySales = sales.filter(s => 
    new Date(s.createdAt).toDateString() === new Date().toDateString()
  );
  const todayTotal = todaySales.reduce((acc, s) => acc + s.amount, 0);

  const handleRegisterSale = async () => {
    if (!selectedClient || selectedPetIds.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione cliente e pelo menos um pet.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Process each pet
    for (const petInfo of selectedPetsInfo) {
      if (petInfo.hasPlanCredit && petInfo.planId) {
        // Deduct from plan
        try {
          const plan = clientPlans.find(cp => cp.id === petInfo.planId);
          if (plan) {
            await supabase
              .from('client_plans' as any)
              .update({ baths_remaining: plan.baths_remaining - 1 })
              .eq('id', petInfo.planId);
          }
        } catch (e) {
          console.log('Error updating plan');
        }
      }

      // Update appointment status if exists
      if (petInfo.appointment) {
        await supabase
          .from('bath_grooming_appointments')
          .update({ status: 'finalizado' })
          .eq('id', petInfo.appointment.id);
      }
    }

    // Create sale record (local for now)
    const client = clients.find(c => c.id === selectedClient);
    const petNames = selectedPetsInfo.map(p => p.pet.name).join(', ');
    
    const newSale: Sale = {
      id: String(Date.now()),
      clientId: selectedClient,
      description: description || `${saleTypes.find(t => t.value === selectedType)?.label} - ${petNames}`,
      amount: totalWithCredits,
      paymentMethod: selectedPayment,
      createdAt: new Date().toISOString(),
    };

    setSales(prev => [newSale, ...prev]);

    setIsLoading(false);

    const creditMessage = petsWithCredits.length > 0 
      ? ` (${petsWithCredits.length} pet(s) com crédito de plano)` 
      : '';

    toast({
      title: "✅ Venda Registrada!",
      description: `Venda de R$ ${totalWithCredits.toFixed(2)} para ${client?.name}.${creditMessage} ${issueNF ? 'NF-e será preparada.' : ''}`,
    });

    // Reset form
    setSelectedClient('');
    setSelectedPetIds([]);
    setSelectedPetsInfo([]);
    setDescription('');
    setIssueNF(false);
    
    // Refresh appointments
    fetchAppointments();
    fetchClientPlans();
  };

  const getClient = (clientId: string) => clients.find(c => c.id === clientId);

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
              Registre vendas de serviços e produtos
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Sale Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Nova Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                        {client.name} - {client.whatsapp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pet Selection - Multiple */}
              {selectedClient && (
                <div>
                  <Label className="mb-3 block">Pets * (selecione um ou mais)</Label>
                  {filteredPets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum pet cadastrado para este cliente</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {filteredPets.map(pet => {
                        const isSelected = selectedPetIds.includes(pet.id);
                        const petInfo = selectedPetsInfo.find(p => p.pet.id === pet.id);
                        
                        return (
                          <div 
                            key={pet.id}
                            onClick={() => togglePetSelection(pet.id)}
                            className={cn(
                              "p-4 border-2 rounded-xl cursor-pointer transition-all",
                              isSelected 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => togglePetSelection(pet.id)}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{pet.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {pet.breed || pet.species} - {pet.size || 'Porte N/D'}
                                </p>
                                {petInfo && (
                                  <div className="mt-2">
                                    {petInfo.hasPlanCredit ? (
                                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                                        <Gift className="w-3 h-3 mr-1" />
                                        Crédito de Plano
                                      </Badge>
                                    ) : (
                                      <p className="text-sm font-semibold text-primary">
                                        R$ {petInfo.calculatedPrice.toFixed(2)}
                                      </p>
                                    )}
                                    {petInfo.appointment && (
                                      <Badge variant="outline" className="mt-1">
                                        Agendamento vinculado
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sale Type */}
              <div>
                <Label>Tipo de Venda</Label>
                <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as SaleType)}>
                  <TabsList className="grid grid-cols-4 w-full">
                    {saleTypes.map(type => (
                      <TabsTrigger key={type.value} value={type.value}>
                        {type.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {/* Description */}
              <div>
                <Label>Descrição (opcional)</Label>
                <Input 
                  placeholder="Ex: Banho + Tosa - Thor"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Order Summary */}
              {selectedPetsInfo.length > 0 && (
                <Card className="bg-muted/50 border-0">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Resumo do Pedido</h4>
                    <div className="space-y-2">
                      {selectedPetsInfo.map(petInfo => (
                        <div key={petInfo.pet.id} className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{petInfo.pet.name}</span>
                            {petInfo.appointment && (
                              <span className="text-xs text-muted-foreground ml-2">(agendado)</span>
                            )}
                          </div>
                          {petInfo.hasPlanCredit ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              Crédito de Plano
                            </Badge>
                          ) : (
                            <span className="font-semibold">R$ {petInfo.calculatedPrice.toFixed(2)}</span>
                          )}
                        </div>
                      ))}
                      
                      {petsWithCredits.length > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg mt-3">
                          <Gift className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700">
                            {petsWithCredits.length} pet(s) usando crédito de plano
                          </span>
                        </div>
                      )}

                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between items-center text-lg">
                          <span className="font-bold">Total a Cobrar</span>
                          <span className="font-bold text-primary">
                            R$ {totalWithCredits.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Method */}
              <div>
                <Label>Forma de Pagamento</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
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

              {/* Submit Button */}
              <Button 
                className="w-full h-14 text-lg bg-gradient-success hover:opacity-90"
                onClick={handleRegisterSale}
                disabled={isLoading || selectedPetIds.length === 0}
              >
                <Check className="w-5 h-5 mr-2" />
                {isLoading ? 'Registrando...' : `Registrar Venda - R$ ${totalWithCredits.toFixed(2)}`}
              </Button>
            </CardContent>
          </Card>
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
                          <p className="font-medium text-sm">{sale.description}</p>
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
