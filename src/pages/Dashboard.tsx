import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Loader2, 
  Scissors, 
  Home, 
  Clock, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  
  // Mês
  monthGroomingTotal: number;
  monthGroomingCompleted: number;
  monthHotelTotal: number;
  monthTotalRevenue: number;
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      // Fetch all data in parallel
      const [{ data: groomingData }, { data: hotelData }] = await Promise.all([
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
      ]);

      // Today's data
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

      // Counts (excluding cancelled)
      const todayGrooming = todayGroomingList.filter(a => a.status !== 'cancelado').length;
      const todayHotel = todayHotelList.filter(s => s.status !== 'cancelado').length;

      // Status do dia (grooming + hotel)
      const todayScheduled = 
        todayGroomingList.filter(a => a.status === 'agendado' || a.status === 'em_atendimento').length +
        todayHotelList.filter(s => s.status === 'reservado' || s.status === 'hospedado').length;
      
      const todayCompleted = 
        todayGroomingList.filter(a => a.status === 'finalizado').length +
        todayHotelList.filter(s => s.status === 'check_out_realizado').length;
      
      const todayCancelled = 
        todayGroomingList.filter(a => a.status === 'cancelado').length +
        todayHotelList.filter(s => s.status === 'cancelado').length;

      // Faturamento HOJE
      const todayCompletedRevenue = 
        todayGroomingList.filter(a => a.status === 'finalizado').reduce((sum, a) => sum + (a.price || 0), 0) +
        todayHotelList.filter(s => s.status === 'check_out_realizado').reduce((sum, s) => sum + (s.total_price || 0), 0);

      const todayFutureRevenue = 
        todayGroomingList.filter(a => a.status === 'agendado' || a.status === 'em_atendimento').reduce((sum, a) => sum + (a.price || 0), 0) +
        todayHotelList.filter(s => s.status === 'reservado' || s.status === 'hospedado').reduce((sum, s) => sum + (s.total_price || 0), 0);

      // Mês
      const monthGroomingActive = groomingData?.filter(a => a.status !== 'cancelado') || [];
      const monthGroomingTotal = monthGroomingActive.length;
      const monthGroomingCompleted = groomingData?.filter(a => a.status === 'finalizado').length || 0;

      const monthHotelActive = hotelData?.filter(s => s.status !== 'cancelado') || [];
      const monthHotelTotal = monthHotelActive.length;

      const monthTotalRevenue = 
        (groomingData?.filter(a => a.status === 'finalizado').reduce((sum, a) => sum + (a.price || 0), 0) || 0) +
        (hotelData?.filter(s => s.status === 'check_out_realizado').reduce((sum, s) => sum + (s.total_price || 0), 0) || 0);

      setData({
        todayGrooming,
        todayHotel,
        todayScheduled,
        todayCompleted,
        todayCancelled,
        todayCompletedRevenue,
        todayFutureRevenue,
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

    // Realtime subscriptions
    const groomingChannel = supabase
      .channel('dashboard-grooming-simple')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bath_grooming_appointments' }, fetchDashboardData)
      .subscribe();

    const hotelChannel = supabase
      .channel('dashboard-hotel-simple')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(groomingChannel);
      supabase.removeChannel(hotelChannel);
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

        {/* BLOCO 3 - Faturamento */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-soft h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5 text-primary" />
                Faturamento Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-500/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Realizado</p>
                      <p className="text-2xl font-bold text-green-600">
                        R$ {data.todayCompletedRevenue.toFixed(2)}
                      </p>
                    </div>
                    <CheckCircle2 className="w-10 h-10 text-green-500/40" />
                  </div>
                </div>
                <div className="bg-amber-500/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">A receber (pendente)</p>
                      <p className="text-2xl font-bold text-amber-600">
                        R$ {data.todayFutureRevenue.toFixed(2)}
                      </p>
                    </div>
                    <Clock className="w-10 h-10 text-amber-500/40" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* BLOCO 4 - Visão do Mês */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-soft h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
                Visão de {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Banhos agendados</span>
                  </div>
                  <span className="font-bold text-lg">{data.monthGroomingTotal}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Banhos finalizados</span>
                  </div>
                  <span className="font-bold text-lg">{data.monthGroomingCompleted}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Hotelzinho</span>
                  </div>
                  <span className="font-bold text-lg">{data.monthHotelTotal}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Faturado no mês</span>
                  </div>
                  <span className="font-bold text-lg text-green-600">
                    R$ {data.monthTotalRevenue.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;