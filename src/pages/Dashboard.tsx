import { motion } from 'framer-motion';
import { Scissors, Home, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { OperationalCard } from '@/components/dashboard/OperationalCard';
import { RevenueCard } from '@/components/dashboard/RevenueCard';
import { TodaySchedule } from '@/components/dashboard/TodaySchedule';
import { StatCard } from '@/components/dashboard/StatCard';

const Dashboard = () => {
  const data = useDashboardData();

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2"
      >
        <h1 className="text-3xl font-display font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Visão geral da operação em tempo real
        </p>
      </motion.div>

      {/* Quick Stats - Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Banhos Agendados"
          value={data.groomingScheduled + data.groomingInProgress}
          icon={Calendar}
          variant="primary"
        />
        <StatCard
          title="Em Atendimento"
          value={data.groomingInProgress}
          icon={Scissors}
          variant="warning"
        />
        <StatCard
          title="Finalizados Hoje"
          value={data.groomingCompleted}
          icon={Scissors}
          variant="success"
        />
        <StatCard
          title="Pets Hospedados"
          value={data.hotelCurrentGuests}
          icon={Home}
          variant="secondary"
        />
      </div>

      {/* Financial Summary */}
      <RevenueCard
        completedRevenue={data.totalCompletedRevenue}
        forecastRevenue={data.totalForecastRevenue}
        title="Faturamento do Dia"
      />

      {/* Operational Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OperationalCard
          title="Banho & Tosa"
          icon={Scissors}
          variant="default"
          items={[
            { icon: '📅', label: 'Agendados', value: data.groomingScheduled },
            { icon: '🔄', label: 'Em Atendimento', value: data.groomingInProgress, highlight: true },
            { icon: '✅', label: 'Finalizados', value: data.groomingCompleted },
            { icon: '📊', label: 'Total do Dia', value: data.groomingTotal },
            { 
              icon: '💰', 
              label: 'Faturamento Previsto', 
              value: `R$ ${data.groomingForecastRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              highlight: true 
            },
          ]}
        />

        <OperationalCard
          title="Hotelzinho"
          icon={Home}
          variant="default"
          items={[
            { icon: '🏨', label: 'Hospedados Agora', value: data.hotelCurrentGuests, highlight: true },
            { icon: '📆', label: 'Check-ins Futuros', value: data.hotelFutureCheckIns },
            { icon: '🚪', label: 'Check-outs Previstos', value: data.hotelTodayCheckOuts },
            { 
              icon: '💰', 
              label: 'Faturamento Previsto', 
              value: `R$ ${data.hotelForecastRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              highlight: true 
            },
          ]}
        />
      </div>

      {/* Today's Schedule */}
      <TodaySchedule appointments={data.todayAppointments} />
    </div>
  );
};

export default Dashboard;
