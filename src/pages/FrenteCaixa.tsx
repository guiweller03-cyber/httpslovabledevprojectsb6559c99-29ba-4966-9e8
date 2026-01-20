import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, CreditCard, Banknote, Smartphone, Check, Trash2, Hotel, Scissors, Package, AlertCircle, Clock, CheckCircle2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { differenceInDays, format, addDays, startOfDay, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentConfirmationDialog } from '@/components/pos/PaymentConfirmationDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

type PaymentMethod = 'dinheiro' | 'pix' | 'credito' | 'debito';
type PaymentStatus = 'pendente' | 'confirmado' | 'pago' | 'pago_antecipado' | 'isento';

interface ClientDB {
  id: string;
  name: string;
  whatsapp: string;
}

interface PetDB {
  id: string;
  client_id: string;
  name: string;
  species: string;
  breed: string | null;
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
  data_cobranca?: string | null;
  optional_services?: string[] | null;
  is_plan_usage?: boolean | null;
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
  data_cobranca?: string | null;
}

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
  time: string;
  sourceId: string;
  isPaid: boolean;
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
  
  // State from database
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [pets, setPets] = useState<PetDB[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDB[]>([]);
  const [hotelStays, setHotelStays] = useState<HotelStayDB[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'hoje' | 'amanha' | 'outra'>('hoje');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  
  // Payment confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('pix');
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    item: PendingPaymentItem;
    isEarlyPayment: boolean;
  } | null>(null);

  // Today's sales for summary
  const [todaySales, setTodaySales] = useState<{ amount: number; method: string }[]>([]);

  // Fetch data from Supabase
  const fetchData = async () => {
    const [clientsRes, petsRes, appointmentsRes, hotelRes] = await Promise.all([
      supabase.from('clients').select('id, name, whatsapp').order('name'),
      supabase.from('pets').select('id, client_id, name, species, breed').order('name'),
      supabase.from('bath_grooming_appointments').select('*').neq('status', 'cancelado'),
      supabase.from('hotel_stays').select('*').neq('status', 'cancelado'),
    ]);

    if (!clientsRes.error) setClients(clientsRes.data || []);
    if (!petsRes.error) setPets(petsRes.data || []);
    if (!appointmentsRes.error) setAppointments(appointmentsRes.data || []);
    if (!hotelRes.error) setHotelStays(hotelRes.data || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get date based on active tab
  const getTargetDate = (): Date => {
    if (activeTab === 'hoje') return startOfDay(new Date());
    if (activeTab === 'amanha') return startOfDay(addDays(new Date(), 1));
    return customDate ? startOfDay(customDate) : startOfDay(new Date());
  };

  // Build pending payments for a specific date
  const buildPaymentsForDate = (targetDate: Date): PendingPaymentItem[] => {
    const items: PendingPaymentItem[] = [];
    const targetDateStr = format(targetDate, 'yyyy-MM-dd');

    // Add appointments
    for (const apt of appointments) {
      const aptCobrancaDate = apt.data_cobranca || format(new Date(apt.start_datetime), 'yyyy-MM-dd');
      if (aptCobrancaDate !== targetDateStr) continue;

      const client = clients.find(c => c.id === apt.client_id);
      const pet = pets.find(p => p.id === apt.pet_id);

      const groomingLabel = apt.grooming_type 
        ? groomingTypeLabels[apt.grooming_type] || apt.grooming_type
        : groomingTypeLabels[apt.service_type] || apt.service_type;

      const isPaid = apt.payment_status === 'pago' || apt.payment_status === 'pago_antecipado' || apt.payment_status === 'isento';

      items.push({
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
        time: format(new Date(apt.start_datetime), 'HH:mm'),
        sourceId: apt.id,
        isPaid,
      });
    }

    // Add hotel stays
    for (const stay of hotelStays) {
      const stayCobrancaDate = stay.data_cobranca || format(new Date(stay.check_out), 'yyyy-MM-dd');
      if (stayCobrancaDate !== targetDateStr) continue;

      const client = clients.find(c => c.id === stay.client_id);
      const pet = pets.find(p => p.id === stay.pet_id);

      const nights = Math.max(1, differenceInDays(new Date(stay.check_out), new Date(stay.check_in)));
      const totalPrice = stay.total_price || (nights * stay.daily_rate);

      const isPaid = stay.payment_status === 'pago' || stay.payment_status === 'pago_antecipado' || stay.payment_status === 'isento';

      items.push({
        id: `hotel_${stay.id}`,
        type: 'hotel',
        clientId: stay.client_id,
        clientName: client?.name || 'N/A',
        petId: stay.pet_id,
        petName: pet?.name || 'N/A',
        description: stay.is_creche ? 'Creche' : `Hotel - ${nights} diária${nights > 1 ? 's' : ''}`,
        price: totalPrice,
        serviceStatus: stay.status || 'reservado',
        paymentStatus: (stay.payment_status as PaymentStatus) || 'pendente',
        time: format(new Date(stay.check_out), 'HH:mm'),
        sourceId: stay.id,
        isPaid,
      });
    }

    // Sort: Paid items at bottom, then by time
    items.sort((a, b) => {
      if (a.isPaid && !b.isPaid) return 1;
      if (!a.isPaid && b.isPaid) return -1;
      // Finalized services come first
      if (a.serviceStatus === 'finalizado' && b.serviceStatus !== 'finalizado') return -1;
      if (b.serviceStatus === 'finalizado' && a.serviceStatus !== 'finalizado') return 1;
      return a.time.localeCompare(b.time);
    });

    return items;
  };

  // Memoized payments for each tab
  const todayPayments = useMemo(() => 
    buildPaymentsForDate(startOfDay(new Date())), 
    [clients, pets, appointments, hotelStays]
  );

  const tomorrowPayments = useMemo(() => 
    buildPaymentsForDate(startOfDay(addDays(new Date(), 1))), 
    [clients, pets, appointments, hotelStays]
  );

  const customDatePayments = useMemo(() => 
    customDate ? buildPaymentsForDate(startOfDay(customDate)) : [], 
    [clients, pets, appointments, hotelStays, customDate]
  );

  // Calculate totals
  const todayPending = todayPayments.filter(p => !p.isPaid);
  const todayPaid = todayPayments.filter(p => p.isPaid);
  const todayPendingTotal = todayPending.reduce((acc, p) => acc + p.price, 0);
  const todayPaidTotal = todayPaid.reduce((acc, p) => acc + p.price, 0);

  const tomorrowPending = tomorrowPayments.filter(p => !p.isPaid);

  // Open payment confirmation dialog
  const handleOpenPayment = (item: PendingPaymentItem, isEarlyPayment: boolean = false) => {
    setPendingConfirmation({ item, isEarlyPayment });
    setConfirmDialogOpen(true);
  };

  // Handle confirmed payment
  const handlePaymentConfirmed = async (confirmedAmount: number, paymentMethod: PaymentMethod, notes?: string) => {
    if (!pendingConfirmation) return;

    const { item, isEarlyPayment } = pendingConfirmation;
    setConfirmDialogOpen(false);
    setIsLoading(true);

    try {
      const now = new Date().toISOString();
      const paymentStatus = isEarlyPayment ? 'pago_antecipado' : 'pago';

      if (item.type === 'banho_tosa') {
        const { error } = await supabase
          .from('bath_grooming_appointments')
          .update({ 
            status: 'finalizado',
            payment_status: paymentStatus,
            payment_method: paymentMethod,
            paid_at: now,
            price: confirmedAmount,
          } as any)
          .eq('id', item.sourceId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hotel_stays')
          .update({ 
            status: 'check_out',
            payment_status: paymentStatus,
            payment_method: paymentMethod,
            paid_at: now,
            total_price: confirmedAmount,
          } as any)
          .eq('id', item.sourceId);

        if (error) throw error;
      }

      // Update client last_purchase
      await supabase
        .from('clients')
        .update({ last_purchase: now })
        .eq('id', item.clientId);

      // Track sale
      setTodaySales(prev => [...prev, { amount: confirmedAmount, method: paymentMethod }]);

      toast({
        title: isEarlyPayment ? "✅ Pagamento Antecipado Registrado!" : "✅ Pagamento Confirmado!",
        description: `${item.petName}: ${item.description} - R$ ${confirmedAmount.toFixed(2)} via ${paymentMethods.find(m => m.value === paymentMethod)?.label}`,
      });

      // Refresh data
      await fetchData();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Erro ao registrar pagamento",
        description: error?.message || "Ocorreu um erro ao processar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setPendingConfirmation(null);
    }
  };

  // Render payment item row
  const renderPaymentItem = (item: PendingPaymentItem, isEarlyPayment: boolean = false) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center justify-between p-4 rounded-xl border transition-all",
        item.isPaid
          ? "bg-green-50 border-green-200 opacity-70"
          : item.serviceStatus === 'finalizado'
            ? "bg-red-50 border-red-300"
            : "bg-card border-border hover:border-primary/30"
      )}
    >
      {/* Left: Info */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Icon */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
          item.type === 'banho_tosa' ? "bg-primary/10" : "bg-orange-100"
        )}>
          {item.type === 'banho_tosa' ? (
            <Scissors className="w-5 h-5 text-primary" />
          ) : (
            <Hotel className="w-5 h-5 text-orange-500" />
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground truncate">{item.clientName}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground truncate">{item.petName}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">{item.description}</span>
            <Badge variant="outline" className="text-xs">
              {item.time}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {statusLabels[item.serviceStatus] || item.serviceStatus}
            </Badge>
            {item.isPaid ? (
              <Badge className="text-xs bg-green-100 text-green-700 border-0">
                <Check className="w-3 h-3 mr-1" />
                {item.paymentStatus === 'pago_antecipado' ? 'Pago Antecipado' : 'Pago'}
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Pendente
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Right: Price & Action */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <p className={cn(
            "text-lg font-bold",
            item.isPaid ? "text-green-600" : "text-foreground"
          )}>
            R$ {item.price.toFixed(2)}
          </p>
        </div>

        {!item.isPaid && (
          <Button
            onClick={() => handleOpenPayment(item, isEarlyPayment)}
            disabled={isLoading}
            className={cn(
              "gap-2",
              isEarlyPayment 
                ? "bg-orange-500 hover:bg-orange-600" 
                : "bg-green-600 hover:bg-green-700"
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isEarlyPayment ? 'Antecipar' : 'Receber'}
          </Button>
        )}
      </div>
    </motion.div>
  );

  // Render empty state
  const renderEmptyState = (message: string) => (
    <div className="text-center py-12 text-muted-foreground">
      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-primary" />
              Frente de Caixa
            </h1>
            <p className="text-muted-foreground mt-1">
              Visão operacional • Cobranças do dia
            </p>
          </div>

          {/* Summary Cards */}
          <div className="flex items-center gap-4">
            {todayPending.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-100 border border-red-300 rounded-xl text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{todayPending.length} pendente{todayPending.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl">
              <span className="text-sm text-muted-foreground">Recebido hoje</span>
              <p className="text-lg font-bold text-primary">
                R$ {todayPaidTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex items-center gap-4">
          <TabsList className="grid grid-cols-2 w-[300px]">
            <TabsTrigger value="hoje" className="gap-2">
              <Calendar className="w-4 h-4" />
              Hoje
              {todayPending.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {todayPending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="amanha" className="gap-2">
              <Calendar className="w-4 h-4" />
              Amanhã
              {tomorrowPending.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {tomorrowPending.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Other dates picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="w-4 h-4" />
                Outra Data
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={customDate}
                onSelect={(date) => {
                  setCustomDate(date);
                  if (date) setActiveTab('outra');
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {activeTab === 'outra' && customDate && (
            <Badge variant="outline" className="text-sm">
              {format(customDate, "dd 'de' MMMM", { locale: ptBR })}
            </Badge>
          )}
        </div>

        {/* Payment Method Quick Select */}
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Forma padrão:</span>
              <div className="flex gap-2">
                {paymentMethods.map(method => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.value}
                      onClick={() => setSelectedPayment(method.value)}
                      className={cn(
                        "px-3 py-2 rounded-lg border-2 flex items-center gap-2 transition-all text-sm",
                        selectedPayment === method.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/30 text-muted-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {method.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TODAY Tab */}
        <TabsContent value="hoje" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Cobranças de Hoje
              <Badge variant="outline">
                {format(new Date(), "dd/MM/yyyy")}
              </Badge>
            </h2>
            <div className="text-sm text-muted-foreground">
              {todayPayments.length} registro{todayPayments.length !== 1 ? 's' : ''}
            </div>
          </div>

          {todayPayments.length === 0 ? (
            renderEmptyState("Nenhuma cobrança para hoje")
          ) : (
            <div className="space-y-3">
              {todayPayments.map(item => renderPaymentItem(item, false))}
            </div>
          )}
        </TabsContent>

        {/* TOMORROW Tab */}
        <TabsContent value="amanha" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Cobranças de Amanhã
              <Badge variant="outline">
                {format(addDays(new Date(), 1), "dd/MM/yyyy")}
              </Badge>
            </h2>
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="w-4 h-4" />
              Pagamentos aqui serão marcados como antecipados
            </div>
          </div>

          {tomorrowPayments.length === 0 ? (
            renderEmptyState("Nenhuma cobrança para amanhã")
          ) : (
            <div className="space-y-3">
              {tomorrowPayments.map(item => renderPaymentItem(item, true))}
            </div>
          )}
        </TabsContent>

        {/* CUSTOM DATE Tab */}
        <TabsContent value="outra" className="space-y-4">
          {customDate ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Cobranças de {format(customDate, "dd 'de' MMMM", { locale: ptBR })}
                  <Badge variant="outline">
                    {format(customDate, "dd/MM/yyyy")}
                  </Badge>
                </h2>
                <div className="text-sm text-muted-foreground">
                  {customDatePayments.length} registro{customDatePayments.length !== 1 ? 's' : ''}
                </div>
              </div>

              {customDatePayments.length === 0 ? (
                renderEmptyState("Nenhuma cobrança para esta data")
              ) : (
                <div className="space-y-3">
                  {customDatePayments.map(item => {
                    const isEarly = customDate > startOfDay(new Date());
                    return renderPaymentItem(item, isEarly);
                  })}
                </div>
              )}
            </>
          ) : (
            renderEmptyState("Selecione uma data no calendário acima")
          )}
        </TabsContent>
      </Tabs>

      {/* Summary Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="border-0 shadow-soft bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recebido Hoje</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {todayPaidTotal.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft bg-gradient-to-br from-red-100 to-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-200 flex items-center justify-center">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-600/80">Pendente Hoje</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {todayPendingTotal.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft bg-gradient-to-br from-orange-100 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-200 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-orange-600/80">Agendado Amanhã</p>
                <p className="text-2xl font-bold text-orange-600">
                  {tomorrowPayments.length} serviço{tomorrowPayments.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Confirmation Dialog */}
      <PaymentConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        amount={pendingConfirmation?.item.price || 0}
        paymentMethod={selectedPayment}
        clientName={pendingConfirmation?.item.clientName || ''}
        description={pendingConfirmation ? `${pendingConfirmation.item.petName}: ${pendingConfirmation.item.description}` : ''}
        onConfirm={handlePaymentConfirmed}
        onCancel={() => {
          setConfirmDialogOpen(false);
          setPendingConfirmation(null);
        }}
      />
    </div>
  );
};

export default FrenteCaixa;
