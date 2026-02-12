import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Calendar,
  Filter,
  Scissors,
  Home,
  Package,
  Sparkles,
  ChevronDown,
  Users,
  Receipt,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodFilter = 'today' | '7d' | '30d' | '90d' | '12m' | 'all';

interface SaleItem {
  id: string;
  sale_id: string;
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  covered_by_plan: boolean;
  pet_id: string | null;
  product_id: string | null;
}

interface Sale {
  id: string;
  created_at: string;
  total_amount: number;
  subtotal: number;
  payment_method: string;
  payment_status: string;
  client_id: string | null;
  pet_id: string | null;
  notes: string | null;
  items: SaleItem[];
  client_name?: string;
}

interface ClientPlan {
  id: string;
  price_paid: number;
  purchased_at: string;
  client_id: string;
  pet_id: string;
  plan_name?: string;
  client_name?: string;
}

interface HotelStay {
  id: string;
  check_in: string;
  check_out: string;
  total_price: number;
  daily_rate: number;
  is_creche: boolean;
  payment_status: string;
  client_id: string;
  pet_id: string;
  client_name?: string;
}

interface CategoryStats {
  name: string;
  icon: React.ReactNode;
  color: string;
  total: number;
  count: number;
  percentage: number;
}

const PAYMENT_METHODS = [
  { value: 'all', label: 'Todas' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'credito', label: 'Crédito' },
  { value: 'debito', label: 'Débito' },
];

const Faturamento = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [hotelStays, setHotelStays] = useState<HotelStay[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');

  // Fetch all financial data
  useEffect(() => {
    fetchData();

    // Setup realtime subscription for sales
    const channel = supabase
      .channel('faturamento-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_items' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch clients for name mapping
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name');

      const clientMap: Record<string, string> = {};
      (clientsData || []).forEach((c: any) => {
        clientMap[c.id] = c.name;
      });
      setClients(clientMap);

      // Fetch sales and sale_items separately (no FK relationship)
      const [{ data: salesData }, { data: saleItemsData }] = await Promise.all([
        supabase
          .from('sales')
          .select('id, created_at, total_amount, subtotal, payment_method, payment_status, client_id, pet_id, notes')
          .eq('payment_status', 'pago')
          .order('created_at', { ascending: false }),
        supabase
          .from('sale_items')
          .select('id, sale_id, description, item_type, quantity, unit_price, total_price, covered_by_plan, pet_id, product_id')
      ]);

      // Group sale_items by sale_id
      const itemsBySaleId: Record<string, SaleItem[]> = {};
      (saleItemsData || []).forEach((item: any) => {
        if (!item.sale_id) return;
        if (!itemsBySaleId[item.sale_id]) itemsBySaleId[item.sale_id] = [];
        itemsBySaleId[item.sale_id].push(item);
      });

      const salesWithItems = (salesData || []).map((s: any) => ({
        ...s,
        items: itemsBySaleId[s.id] || [],
        client_name: s.client_id ? clientMap[s.client_id] : null,
      }));
      setSales(salesWithItems);

      // Fetch client plans
      const { data: plansData } = await supabase
        .from('client_plans')
        .select(`
          id,
          price_paid,
          purchased_at,
          client_id,
          pet_id,
          bath_plans(plan_name)
        `)
        .order('purchased_at', { ascending: false });

      const plans = (plansData || []).map((p: any) => ({
        id: p.id,
        price_paid: p.price_paid,
        purchased_at: p.purchased_at,
        client_id: p.client_id,
        pet_id: p.pet_id,
        plan_name: p.bath_plans?.plan_name || 'Plano',
        client_name: clientMap[p.client_id] || null,
      }));
      setClientPlans(plans);

      // Fetch hotel stays
      const { data: hotelData } = await supabase
        .from('hotel_stays')
        .select('*')
        .eq('payment_status', 'pago')
        .order('check_in', { ascending: false });

      const stays = (hotelData || []).map((h: any) => ({
        ...h,
        client_name: clientMap[h.client_id] || null,
      }));
      setHotelStays(stays);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date | null = null;

    switch (periodFilter) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      case '12m':
        startDate = subMonths(now, 12);
        break;
      case 'all':
        startDate = null;
        break;
    }

    return startDate;
  };

  // Filter sales
  const getFilteredSales = useMemo(() => {
    let filtered = sales;
    const startDate = getDateRange();

    if (startDate) {
      filtered = filtered.filter(s => new Date(s.created_at) >= startDate);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(s => s.payment_method === paymentFilter);
    }

    return filtered;
  }, [sales, periodFilter, paymentFilter]);

  // Filter plans
  const getFilteredPlans = useMemo(() => {
    let filtered = clientPlans;
    const startDate = getDateRange();

    if (startDate) {
      filtered = filtered.filter(p => new Date(p.purchased_at) >= startDate);
    }

    return filtered;
  }, [clientPlans, periodFilter]);

  // Filter hotel stays
  const getFilteredHotelStays = useMemo(() => {
    let filtered = hotelStays;
    const startDate = getDateRange();

    if (startDate) {
      filtered = filtered.filter(h => new Date(h.check_in) >= startDate);
    }

    return filtered;
  }, [hotelStays, periodFilter]);

  // Calculate main KPIs
  const mainKPIs = useMemo(() => {
    const filteredSales = getFilteredSales;
    const filteredPlans = getFilteredPlans;
    const filteredHotel = getFilteredHotelStays;

    const salesTotal = filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const plansTotal = filteredPlans.reduce((sum, p) => sum + (p.price_paid || 0), 0);
    const hotelTotal = filteredHotel.reduce((sum, h) => sum + (h.total_price || 0), 0);

    const totalRevenue = salesTotal + plansTotal + hotelTotal;
    const totalTransactions = filteredSales.length + filteredPlans.length + filteredHotel.length;
    const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Today's revenue
    const today = startOfDay(new Date());
    const todaySales = sales.filter(s => new Date(s.created_at) >= today);
    const todayPlans = clientPlans.filter(p => new Date(p.purchased_at) >= today);
    const todayHotel = hotelStays.filter(h => new Date(h.check_in) >= today);
    
    const todayRevenue = 
      todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0) +
      todayPlans.reduce((sum, p) => sum + (p.price_paid || 0), 0) +
      todayHotel.reduce((sum, h) => sum + (h.total_price || 0), 0);

    // This month's revenue
    const monthStart = startOfMonth(new Date());
    const monthSales = sales.filter(s => new Date(s.created_at) >= monthStart);
    const monthPlans = clientPlans.filter(p => new Date(p.purchased_at) >= monthStart);
    const monthHotel = hotelStays.filter(h => new Date(h.check_in) >= monthStart);
    
    const monthRevenue = 
      monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0) +
      monthPlans.reduce((sum, p) => sum + (p.price_paid || 0), 0) +
      monthHotel.reduce((sum, h) => sum + (h.total_price || 0), 0);

    return {
      totalRevenue,
      todayRevenue,
      monthRevenue,
      avgTicket,
      totalTransactions,
    };
  }, [getFilteredSales, getFilteredPlans, getFilteredHotelStays, sales, clientPlans, hotelStays]);

  // Calculate category statistics
  const categoryStats = useMemo((): CategoryStats[] => {
    const filteredSales = getFilteredSales;
    const filteredPlans = getFilteredPlans;
    const filteredHotel = getFilteredHotelStays;

    let servicesTotal = 0;
    let servicesCount = 0;
    let additionalsTotal = 0;
    let additionalsCount = 0;
    let productsTotal = 0;
    let productsCount = 0;



    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.covered_by_plan) return; // Skip items covered by plan

        const desc = item.description?.toLowerCase() || '';
        const type = item.item_type?.toLowerCase() || '';

        if (type === 'adicional' || desc.includes('adicional')) {
          additionalsTotal += item.total_price;
          additionalsCount += 1;
        } else if (type === 'produto' || item.product_id) {
          productsTotal += item.total_price;
          productsCount += 1;
        } else if (type === 'servico' || desc.includes('banho') || desc.includes('tosa')) {
          servicesTotal += item.total_price;
          servicesCount += 1;
        } else {
          // Default to services
          servicesTotal += item.total_price;
          servicesCount += 1;
        }
      });
    });

    // Plans
    const plansTotal = filteredPlans.reduce((sum, p) => sum + (p.price_paid || 0), 0);
    const plansCount = filteredPlans.length;

    // Hotel
    const hotelTotal = filteredHotel.filter(h => !h.is_creche).reduce((sum, h) => sum + (h.total_price || 0), 0);
    const hotelCount = filteredHotel.filter(h => !h.is_creche).length;

    // Creche
    const crecheTotal = filteredHotel.filter(h => h.is_creche).reduce((sum, h) => sum + (h.total_price || 0), 0);
    const crecheCount = filteredHotel.filter(h => h.is_creche).length;

    const grandTotal = servicesTotal + additionalsTotal + productsTotal + plansTotal + hotelTotal + crecheTotal;

    const categories: CategoryStats[] = [
      {
        name: 'Serviços (Banho/Tosa)',
        icon: <Scissors className="w-5 h-5" />,
        color: 'bg-blue-500',
        total: servicesTotal,
        count: servicesCount,
        percentage: grandTotal > 0 ? (servicesTotal / grandTotal) * 100 : 0,
      },
      {
        name: 'Adicionais',
        icon: <Sparkles className="w-5 h-5" />,
        color: 'bg-purple-500',
        total: additionalsTotal,
        count: additionalsCount,
        percentage: grandTotal > 0 ? (additionalsTotal / grandTotal) * 100 : 0,
      },
      {
        name: 'Planos',
        icon: <Receipt className="w-5 h-5" />,
        color: 'bg-green-500',
        total: plansTotal,
        count: plansCount,
        percentage: grandTotal > 0 ? (plansTotal / grandTotal) * 100 : 0,
      },
      {
        name: 'Hotel',
        icon: <Home className="w-5 h-5" />,
        color: 'bg-orange-500',
        total: hotelTotal,
        count: hotelCount,
        percentage: grandTotal > 0 ? (hotelTotal / grandTotal) * 100 : 0,
      },
      {
        name: 'Creche',
        icon: <Home className="w-5 h-5" />,
        color: 'bg-yellow-500',
        total: crecheTotal,
        count: crecheCount,
        percentage: grandTotal > 0 ? (crecheTotal / grandTotal) * 100 : 0,
      },
      {
        name: 'Produtos',
        icon: <Package className="w-5 h-5" />,
        color: 'bg-teal-500',
        total: productsTotal,
        count: productsCount,
        percentage: grandTotal > 0 ? (productsTotal / grandTotal) * 100 : 0,
      },
    ];

    return categories.sort((a, b) => b.total - a.total);
  }, [getFilteredSales, getFilteredPlans, getFilteredHotelStays]);

  // Service breakdown
  const serviceBreakdown = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    
    getFilteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.covered_by_plan) return;
        
        const type = item.item_type?.toLowerCase();
        if (type !== 'servico' && type !== 'adicional') {
          const desc = item.description?.toLowerCase() || '';
          if (!desc.includes('banho') && !desc.includes('tosa')) return;
        }

        const name = item.description || 'Serviço';
        if (!stats[name]) {
          stats[name] = { count: 0, total: 0 };
        }
        stats[name].count += item.quantity;
        stats[name].total += item.total_price;
      });
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        total: data.total,
        avgTicket: data.count > 0 ? data.total / data.count : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [getFilteredSales]);

  // Additionals ranking
  const additionalsRanking = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    
    getFilteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.covered_by_plan) return;
        
        const type = item.item_type?.toLowerCase();
        const desc = item.description?.toLowerCase() || '';
        
        if (type === 'adicional' || desc.includes('adicional')) {
          const name = item.description || 'Adicional';
          if (!stats[name]) {
            stats[name] = { count: 0, total: 0 };
          }
          stats[name].count += item.quantity;
          stats[name].total += item.total_price;
        }
      });
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        total: data.total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [getFilteredSales]);

  // Products stats
  const productsStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    
    getFilteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.covered_by_plan) return;
        
        const type = item.item_type?.toLowerCase();
        
        if (type === 'produto' || item.product_id) {
          const name = item.description || 'Produto';
          if (!stats[name]) {
            stats[name] = { count: 0, total: 0 };
          }
          stats[name].count += item.quantity;
          stats[name].total += item.total_price;
        }
      });
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        total: data.total,
        avgTicket: data.count > 0 ? data.total / data.count : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [getFilteredSales]);

  // Hotel/Creche stats
  const hotelStats = useMemo(() => {
    const hotel = getFilteredHotelStays.filter(h => !h.is_creche);
    const creche = getFilteredHotelStays.filter(h => h.is_creche);

    const hotelDays = hotel.reduce((sum, h) => {
      const days = Math.max(1, Math.ceil(
        (new Date(h.check_out).getTime() - new Date(h.check_in).getTime()) / (1000 * 60 * 60 * 24)
      ));
      return sum + days;
    }, 0);

    const crecheDays = creche.reduce((sum, h) => {
      const days = Math.max(1, Math.ceil(
        (new Date(h.check_out).getTime() - new Date(h.check_in).getTime()) / (1000 * 60 * 60 * 24)
      ));
      return sum + days;
    }, 0);

    return {
      hotel: {
        total: hotel.reduce((sum, h) => sum + (h.total_price || 0), 0),
        count: hotel.length,
        days: hotelDays,
        avgPerPet: hotel.length > 0 ? hotel.reduce((sum, h) => sum + (h.total_price || 0), 0) / hotel.length : 0,
      },
      creche: {
        total: creche.reduce((sum, h) => sum + (h.total_price || 0), 0),
        count: creche.length,
        days: crecheDays,
        avgPerPet: creche.length > 0 ? creche.reduce((sum, h) => sum + (h.total_price || 0), 0) / creche.length : 0,
      },
    };
  }, [getFilteredHotelStays]);

  // Top clients
  const topClients = useMemo(() => {
    const clientStats: Record<string, { name: string; total: number; count: number }> = {};

    getFilteredSales.forEach(sale => {
      if (!sale.client_id) return;
      if (!clientStats[sale.client_id]) {
        clientStats[sale.client_id] = {
          name: sale.client_name || 'Cliente',
          total: 0,
          count: 0,
        };
      }
      clientStats[sale.client_id].total += sale.total_amount || 0;
      clientStats[sale.client_id].count += 1;
    });

    getFilteredPlans.forEach(plan => {
      if (!plan.client_id) return;
      if (!clientStats[plan.client_id]) {
        clientStats[plan.client_id] = {
          name: plan.client_name || 'Cliente',
          total: 0,
          count: 0,
        };
      }
      clientStats[plan.client_id].total += plan.price_paid || 0;
      clientStats[plan.client_id].count += 1;
    });

    return Object.entries(clientStats)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [getFilteredSales, getFilteredPlans]);

  // Monthly revenue chart data
  const monthlyRevenue = useMemo(() => {
    const monthStats: Record<string, number> = {};

    getFilteredSales.forEach(sale => {
      const monthKey = format(new Date(sale.created_at), 'yyyy-MM');
      monthStats[monthKey] = (monthStats[monthKey] || 0) + (sale.total_amount || 0);
    });

    getFilteredPlans.forEach(plan => {
      const monthKey = format(new Date(plan.purchased_at), 'yyyy-MM');
      monthStats[monthKey] = (monthStats[monthKey] || 0) + (plan.price_paid || 0);
    });

    getFilteredHotelStays.forEach(stay => {
      const monthKey = format(new Date(stay.check_in), 'yyyy-MM');
      monthStats[monthKey] = (monthStats[monthKey] || 0) + (stay.total_price || 0);
    });

    return Object.entries(monthStats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, revenue]) => ({
        month,
        monthLabel: format(parseISO(month + '-01'), 'MMM/yy', { locale: ptBR }),
        revenue,
      }));
  }, [getFilteredSales, getFilteredPlans, getFilteredHotelStays]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

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
              <TrendingUp className="w-8 h-8 text-primary" />
              Faturamento
            </h1>
            <p className="text-muted-foreground mt-1">
              Visão financeira completa do sistema
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 p-4 bg-muted/50 rounded-lg flex flex-wrap gap-4 items-center"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        
        <Select value={periodFilter} onValueChange={(v: PeriodFilter) => setPeriodFilter(v)}>
          <SelectTrigger className="w-44">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="12m">Últimos 12 meses</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Main KPIs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8"
          >
            <Card className="border-0 shadow-soft bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(mainKPIs.totalRevenue)}</p>
                    <p className="text-sm opacity-90">Faturamento Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(mainKPIs.todayRevenue)}</p>
                    <p className="text-sm text-muted-foreground">Hoje</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(mainKPIs.monthRevenue)}</p>
                    <p className="text-sm text-muted-foreground">Este Mês</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(mainKPIs.avgTicket)}</p>
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-teal-600">{mainKPIs.totalTransactions}</p>
                    <p className="text-sm text-muted-foreground">Vendas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Tabs defaultValue="categorias" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="categorias">📊 Categorias</TabsTrigger>
              <TabsTrigger value="servicos">🛁 Serviços</TabsTrigger>
              <TabsTrigger value="adicionais">➕ Adicionais</TabsTrigger>
              <TabsTrigger value="produtos">🛒 Produtos</TabsTrigger>
              <TabsTrigger value="hotel">🏨 Hotel/Creche</TabsTrigger>
              <TabsTrigger value="clientes">👥 Top Clientes</TabsTrigger>
            </TabsList>

            {/* Tab: Categorias */}
            <TabsContent value="categorias">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <Card className="border-0 shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Faturamento por Categoria
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categoryStats.map((cat, index) => (
                        <motion.div
                          key={cat.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 ${cat.color} rounded-lg flex items-center justify-center text-white`}>
                                {cat.icon}
                              </div>
                              <span className="font-medium">{cat.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold">{formatCurrency(cat.total)}</span>
                              <Badge variant="secondary" className="ml-2">
                                {cat.percentage.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${cat.percentage}%` }}
                              transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                              className={`h-full ${cat.color}`}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {cat.count} {cat.count === 1 ? 'venda' : 'vendas'}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Revenue Chart */}
                <Card className="border-0 shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Faturamento Mensal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {monthlyRevenue.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Sem dados no período
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {monthlyRevenue.map((item, index) => {
                          const maxRevenue = Math.max(...monthlyRevenue.map(r => r.revenue));
                          const width = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                          
                          return (
                            <motion.div
                              key={item.month}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="flex items-center gap-3"
                            >
                              <span className="w-14 text-sm text-muted-foreground">{item.monthLabel}</span>
                              <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${width}%` }}
                                  transition={{ delay: index * 0.03, duration: 0.5 }}
                                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full flex items-center justify-end pr-2"
                                >
                                  {width > 25 && (
                                    <span className="text-xs text-white font-medium">
                                      {formatCurrency(item.revenue)}
                                    </span>
                                  )}
                                </motion.div>
                              </div>
                              {width <= 25 && (
                                <span className="text-sm font-medium w-24 text-right">
                                  {formatCurrency(item.revenue)}
                                </span>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Serviços */}
            <TabsContent value="servicos">
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="w-5 h-5" />
                    Faturamento por Serviço
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {serviceBreakdown.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Sem serviços no período
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Serviço</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Ticket Médio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serviceBreakdown.map((service) => (
                          <TableRow key={service.name}>
                            <TableCell className="font-medium">{service.name}</TableCell>
                            <TableCell className="text-right">{service.count}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(service.total)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(service.avgTicket)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Adicionais */}
            <TabsContent value="adicionais">
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Ranking de Adicionais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {additionalsRanking.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Sem adicionais no período
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {additionalsRanking.map((item, index) => (
                        <motion.div
                          key={item.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.count} {item.count === 1 ? 'venda' : 'vendas'}
                            </p>
                          </div>
                          <span className="font-bold text-lg text-green-600">
                            {formatCurrency(item.total)}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Produtos */}
            <TabsContent value="produtos">
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Vendas de Produtos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {productsStats.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Sem produtos vendidos no período
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Ticket Médio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productsStats.map((product) => (
                          <TableRow key={product.name}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right">{product.count}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(product.total)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.avgTicket)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Hotel/Creche */}
            <TabsContent value="hotel">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="w-5 h-5" />
                      🏨 Hotel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <span className="text-muted-foreground">Total Faturado</span>
                        <span className="text-2xl font-bold text-orange-600">
                          {formatCurrency(hotelStats.hotel.total)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{hotelStats.hotel.count}</p>
                          <p className="text-xs text-muted-foreground">Estadias</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{hotelStats.hotel.days}</p>
                          <p className="text-xs text-muted-foreground">Diárias</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{formatCurrency(hotelStats.hotel.avgPerPet)}</p>
                          <p className="text-xs text-muted-foreground">Média/Pet</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="w-5 h-5" />
                      🐕 Creche
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <span className="text-muted-foreground">Total Faturado</span>
                        <span className="text-2xl font-bold text-yellow-600">
                          {formatCurrency(hotelStats.creche.total)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{hotelStats.creche.count}</p>
                          <p className="text-xs text-muted-foreground">Estadias</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{hotelStats.creche.days}</p>
                          <p className="text-xs text-muted-foreground">Diárias</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{formatCurrency(hotelStats.creche.avgPerPet)}</p>
                          <p className="text-xs text-muted-foreground">Média/Pet</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Top Clientes */}
            <TabsContent value="clientes">
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Top 10 Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topClients.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Sem clientes no período
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {topClients.map((client, index) => (
                        <motion.div
                          key={client.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-600' :
                            'bg-primary/50'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {client.count} {client.count === 1 ? 'compra' : 'compras'}
                            </p>
                          </div>
                          <span className="font-bold text-xl text-green-600">
                            {formatCurrency(client.total)}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Faturamento;
