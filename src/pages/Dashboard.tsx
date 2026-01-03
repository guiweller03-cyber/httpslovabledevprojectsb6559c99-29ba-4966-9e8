import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useDashboardData, ServiceFilter } from '@/hooks/useDashboardData';
import { DashboardFilter } from '@/components/dashboard/DashboardFilter';
import { MonthlyStatsCard } from '@/components/dashboard/MonthlyStatsCard';
import { RevenueCards } from '@/components/dashboard/RevenueCards';
import { TodayReservations } from '@/components/dashboard/TodayReservations';

const filterLabels: Record<ServiceFilter, string> = {
  all: 'Todos os Serviços',
  grooming: 'Banho & Tosa',
  hotel: 'Hotelzinho',
};

const Dashboard = () => {
  const [filter, setFilter] = useState<ServiceFilter>('all');
  const { monthlyStats, forecastRevenue, completedRevenue, todayReservations, isLoading, refetch } = useDashboardData(filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header with Filter */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral da operação em tempo real
          </p>
        </div>
        
        <DashboardFilter filter={filter} onChange={setFilter} />
      </motion.div>

      {/* Revenue Cards */}
      <RevenueCards
        forecastRevenue={forecastRevenue}
        completedRevenue={completedRevenue}
        filterLabel={filterLabels[filter]}
      />

      {/* Monthly Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyStatsCard
          title={filter === 'all' ? 'Total de Serviços do Mês' : filterLabels[filter]}
          scheduled={monthlyStats.scheduled}
          inProgress={monthlyStats.inProgress}
          completed={monthlyStats.completed}
          cancelled={monthlyStats.cancelled}
          total={monthlyStats.total}
        />

        {/* Today's Reservations */}
        <TodayReservations
          reservations={todayReservations}
          onUpdate={refetch}
        />
      </div>
    </div>
  );
};

export default Dashboard;
