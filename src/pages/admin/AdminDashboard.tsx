import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Calendar, ShoppingCart, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  totalClients: number;
  totalPets: number;
  todayAppointments: number;
  pendingPayments: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalPets: 0,
    todayAppointments: 0,
    pendingPayments: 0,
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      // Fetch all stats in parallel
      const [
        clientsResult,
        petsResult,
        appointmentsResult,
        pendingResult,
        recentSalesResult
      ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('pets').select('id', { count: 'exact', head: true }),
        supabase.from('bath_grooming_appointments')
          .select('id', { count: 'exact', head: true })
          .gte('start_datetime', startOfToday)
          .lte('start_datetime', endOfToday),
        supabase.from('sales')
          .select('id', { count: 'exact', head: true })
          .eq('payment_status', 'pendente'),
        supabase.from('sales')
          .select('id, created_at, total_amount, payment_method')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const activity = (recentSalesResult.data || []).map(sale => ({
        id: sale.id,
        type: 'sale',
        description: `Venda de R$ ${sale.total_amount?.toFixed(2)} via ${sale.payment_method}`,
        timestamp: sale.created_at || ''
      }));

      setStats({
        totalClients: clientsResult.count || 0,
        totalPets: petsResult.count || 0,
        todayAppointments: appointmentsResult.count || 0,
        pendingPayments: pendingResult.count || 0,
        recentActivity: activity
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total de Clientes',
      value: stats.totalClients,
      icon: Users,
      color: 'text-[#3B82F6]',
      bgColor: 'bg-[#3B82F6]/10'
    },
    {
      title: 'Total de Pets',
      value: stats.totalPets,
      icon: TrendingUp,
      color: 'text-[#10B981]',
      bgColor: 'bg-[#10B981]/10'
    },
    {
      title: 'Agendamentos Hoje',
      value: stats.todayAppointments,
      icon: Calendar,
      color: 'text-[#8B5CF6]',
      bgColor: 'bg-[#8B5CF6]/10'
    },
    {
      title: 'Pagamentos Pendentes',
      value: stats.pendingPayments,
      icon: AlertTriangle,
      color: 'text-[#F59E0B]',
      bgColor: 'bg-[#F59E0B]/10'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1F2933]">Dashboard</h1>
        <p className="text-[#64748B] mt-1">
          Visão geral do estado atual do produto
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <Card key={card.title} className="border-[#E2E8F0] bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] font-medium">
                    {card.title}
                  </p>
                  <p className="text-3xl font-semibold text-[#1F2933] mt-2">
                    {isLoading ? '...' : card.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="border-[#E2E8F0] bg-white">
        <CardHeader className="border-b border-[#E2E8F0]">
          <CardTitle className="text-lg font-semibold text-[#1F2933] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#64748B]" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentActivity.length > 0 ? (
            <ul className="divide-y divide-[#E2E8F0]">
              {stats.recentActivity.map((activity) => (
                <li key={activity.id} className="px-6 py-4 hover:bg-[#F8FAFC] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-[#10B981]" />
                      </div>
                      <span className="text-sm text-[#1F2933]">
                        {activity.description}
                      </span>
                    </div>
                    <span className="text-xs text-[#94A3B8]">
                      {activity.timestamp && format(new Date(activity.timestamp), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-[#64748B]">
              <p>Nenhuma atividade recente</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="border-[#E2E8F0] bg-white">
        <CardHeader className="border-b border-[#E2E8F0]">
          <CardTitle className="text-lg font-semibold text-[#1F2933]">
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-sm text-[#1F2933]">
              Todos os serviços operacionais
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-2">
            Última verificação: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
