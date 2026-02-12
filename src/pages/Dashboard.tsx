import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  Scissors, 
  Home, 
  Clock, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClientStatusSection } from '@/components/dashboard/ClientStatusSection';
import { RevenueBreakdown } from '@/components/dashboard/RevenueBreakdown';

interface DashboardData {
  // Hoje
  todayGrooming: number;
  todayHotel: number;
  
  // Status do dia
  todayScheduled: number;
  todayCompleted: number;
  todayCancelled: number;
  
  // Faturamento
  todayCompletedRevenue: number;
  todayFutureRevenue: number;
  
  // Pagamentos pendentes (finalizados mas não pagos)
  pendingPaymentsCount: number;
  pendingPaymentsTotal: number;
  
  // Mês
  monthGroomingTotal: number;
  monthGroomingCompleted: number;
  monthHotelTotal: number;
  monthTotalRevenue: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      // Fetch appointment data (for scheduling counts) + sales data (for revenue) in parallel
      const [
        { data: groomingDataRaw },
        { data: hotelDataRaw },
        { data: salesData },
        { data: saleItemsData },
        { data: plansData },
        { data: hotelPaidData },
      ] = await Promise.all([
        supabase
          .from('bath_grooming_appointments')
          .select('*')
          .gte('start_datetime', monthStart.toISOString())
          .lte('start_datetime', monthEnd.toISOString()),
        supabase
          .from('hotel_stays')
          .select('*')
          .gte('check_in', monthStart.toISOString())
          .lte('check_in', monthEnd.toISOString()),
        // Revenue sources - same as Faturamento page
        supabase
          .from('sales')
          .select('id, created_at, total_amount, payment_method, payment_status, client_id')
          .eq('payment_status', 'pago'),
        supabase
          .from('sale_items')
          .select('id, sale_id, description, item_type, quantity, unit_price, total_price, covered_by_plan, product_id'),
        supabase
          .from('client_plans')
          .select('id, price_paid, purchased_at, client_id, pet_id'),
        supabase
          .from('hotel_stays')
          .select('id, check_in, total_price, is_creche, payment_status')
          .eq('payment_status', 'pago'),
      ]);

      const groomingData = groomingDataRaw as Array<typeof groomingDataRaw[number] & { payment_status?: string }> | null;
      const hotelData = hotelDataRaw as Array<typeof hotelDataRaw[number] & { payment_status?: string }> | null;

      // === SCHEDULING COUNTS (from appointments) ===
      const todayGroomingList = groomingData?.filter(apt => {
        const aptDate = new Date(apt.start_datetime);
        return isWithinInterval(aptDate, { start: todayStart, end: todayEnd });
      }) || [];

      const todayHotelList = hotelData?.filter(stay => {
        const checkIn = new Date(stay.check_in);
        const checkOut = new Date(stay.check_out);
        return isWithinInterval(todayStart, { start: checkIn, end: checkOut }) ||
               isWithinInterval(checkIn, { start: todayStart, end: todayEnd });
      }) || [];

      const todayGrooming = todayGroomingList.filter(a => a.status !== 'cancelado').length;
      const todayHotel = todayHotelList.filter(s => s.status !== 'cancelado').length;

      const todayScheduled = 
        todayGroomingList.filter(a => a.status === 'agendado' || a.status === 'em_atendimento').length +
        todayHotelList.filter(s => s.status === 'reservado' || s.status === 'hospedado').length;
      
      const todayCompleted = 
        todayGroomingList.filter(a => a.status === 'finalizado').length +
        todayHotelList.filter(s => s.status === 'check_out').length;
      
      const todayCancelled = 
        todayGroomingList.filter(a => a.status === 'cancelado').length +
        todayHotelList.filter(s => s.status === 'cancelado').length;

      // Pending payments (from appointments)
      const pendingGrooming = groomingData?.filter(a => 
        a.status === 'finalizado' && 
        a.payment_status !== 'pago' && 
        a.payment_status !== 'isento'
      ) || [];
      
      const pendingHotel = hotelData?.filter(s => 
        (s.status === 'check_out' || s.status === 'finalizado') && 
        s.payment_status !== 'pago' && 
        s.payment_status !== 'isento'
      ) || [];

      const pendingPaymentsCount = pendingGrooming.length + pendingHotel.length;
      const pendingPaymentsTotal = 
        pendingGrooming.reduce((sum, a) => sum + (a.price || 0), 0) +
        pendingHotel.reduce((sum, s) => sum + (s.total_price || 0), 0);

      // === REVENUE (from sales/plans/hotel - SAME as Faturamento page) ===
      const allSales = salesData || [];
      const allSaleItems = saleItemsData || [];
      const allPlans = plansData || [];
      const allHotelPaid = hotelPaidData || [];

      // Today's revenue from sales
      const todaySalesRevenue = allSales
        .filter(s => new Date(s.created_at) >= todayStart)
        .reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const todayPlansRevenue = allPlans
        .filter(p => new Date(p.purchased_at) >= todayStart)
        .reduce((sum, p) => sum + (p.price_paid || 0), 0);
      const todayHotelRevenue = allHotelPaid
        .filter(h => new Date(h.check_in) >= todayStart)
        .reduce((sum, h) => sum + (h.total_price || 0), 0);
      const todayCompletedRevenue = todaySalesRevenue + todayPlansRevenue + todayHotelRevenue;

      // Future revenue (pending appointments today)
      const todayFutureRevenue = 
        todayGroomingList.filter(a => a.status !== 'cancelado' && a.payment_status !== 'pago' && a.payment_status !== 'isento').reduce((sum, a) => sum + (a.price || 0), 0) +
        todayHotelList.filter(s => s.status !== 'cancelado' && s.payment_status !== 'pago' && s.payment_status !== 'isento').reduce((sum, s) => sum + (s.total_price || 0), 0);

      // Month totals (scheduling counts from appointments)
      const monthGroomingActive = groomingData?.filter(a => a.status !== 'cancelado') || [];
      const monthGroomingTotal = monthGroomingActive.length;
      const monthGroomingCompleted = groomingData?.filter(a => a.payment_status === 'pago' || a.payment_status === 'isento').length || 0;
      const monthHotelActive = hotelData?.filter(s => s.status !== 'cancelado') || [];
      const monthHotelTotal = monthHotelActive.length;

      // Month revenue (from sales - SAME as Faturamento)
      const monthSalesRevenue = allSales
        .filter(s => new Date(s.created_at) >= monthStart)
        .reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const monthPlansRevenue = allPlans
        .filter(p => new Date(p.purchased_at) >= monthStart)
        .reduce((sum, p) => sum + (p.price_paid || 0), 0);
      const monthHotelRevenue = allHotelPaid
        .filter(h => new Date(h.check_in) >= monthStart)
        .reduce((sum, h) => sum + (h.total_price || 0), 0);
      const monthTotalRevenue = monthSalesRevenue + monthPlansRevenue + monthHotelRevenue;

      setData({
        todayGrooming,
        todayHotel,
        todayScheduled,
        todayCompleted,
        todayCancelled,
        todayCompletedRevenue,
        todayFutureRevenue,
        pendingPaymentsCount,
        pendingPaymentsTotal,
        monthGroomingTotal,
        monthGroomingCompleted,
        monthHotelTotal,
        monthTotalRevenue,
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Realtime subscriptions - all sources used by both Dashboard and Faturamento
    const channel = supabase
      .channel('dashboard-all-sources')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bath_grooming_appointments' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_plans' }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const today = new Date();
  const monthName = format(today, 'MMMM', { locale: ptBR });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-display font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </motion.div>

      {/* Alert for pending payments */}
      {data.pendingPaymentsCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <Card className="border-2 border-red-300 bg-red-50/50 shadow-soft cursor-pointer hover:bg-red-50 transition-colors"
                onClick={() => navigate('/caixa')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500 rounded-full">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-red-700 text-lg">
                      🔴 {data.pendingPaymentsCount} Pagamento{data.pendingPaymentsCount !== 1 ? 's' : ''} Pendente{data.pendingPaymentsCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-red-600 text-sm">
                      Total: R$ {data.pendingPaymentsTotal.toFixed(2)} aguardando recebimento
                    </p>
                  </div>
                </div>
                <Button className="bg-red-600 hover:bg-red-700">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Ir para o Caixa
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 4 Main Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* BLOCO 1 - Agenda de Hoje */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-soft h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-primary" />
                Agenda de Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                  <Scissors className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-4xl font-bold text-blue-600">{data.todayGrooming}</p>
                  <p className="text-sm text-muted-foreground mt-1">Banho & Tosa</p>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-4 text-center">
                  <Home className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-4xl font-bold text-purple-600">{data.todayHotel}</p>
                  <p className="text-sm text-muted-foreground mt-1">Hotel / Creche</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* BLOCO 2 - Status do Dia */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-soft h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-primary" />
                Status do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-around items-center py-4">
                <div className="text-center">
                  <Badge variant="outline" className="mb-2 border-amber-500 text-amber-600">
                    Pendentes
                  </Badge>
                  <p className="text-3xl font-bold text-amber-600">{data.todayScheduled}</p>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="mb-2 border-green-500 text-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Finalizados
                  </Badge>
                  <p className="text-3xl font-bold text-green-600">{data.todayCompleted}</p>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="mb-2 border-red-500 text-red-600">
                    <XCircle className="w-3 h-3 mr-1" />
                    Cancelados
                  </Badge>
                  <p className="text-3xl font-bold text-red-600">{data.todayCancelled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* Client Status Section */}
      <div className="mt-8">
        <ClientStatusSection />
      </div>
    </div>
  );
};

export default Dashboard;