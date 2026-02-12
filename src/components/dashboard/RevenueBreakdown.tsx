import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Scissors, 
  Home, 
  Plus, 
  TrendingUp,
  Calendar,
  Package,
  Sparkles,
  Receipt
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CategoryStats {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  total: number;
  count: number;
  percentage: number;
}

export function RevenueBreakdown() {
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'month'>('month');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      
      if (activeTab === 'today') {
        startDate = startOfDay(now);
      } else {
        startDate = startOfMonth(now);
      }

      // Fetch same data sources as Faturamento page
      const [{ data: clientsData }, { data: salesData }, { data: saleItemsData }, { data: plansData }, { data: hotelData }] = await Promise.all([
        supabase.from('clients').select('id, name'),
        supabase
          .from('sales')
          .select('id, created_at, total_amount, payment_method, payment_status, client_id')
          .eq('payment_status', 'pago')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('sale_items')
          .select('id, sale_id, description, item_type, quantity, unit_price, total_price, covered_by_plan, product_id'),
        supabase
          .from('client_plans')
          .select('id, price_paid, purchased_at, client_id, pet_id')
          .gte('purchased_at', startDate.toISOString()),
        supabase
          .from('hotel_stays')
          .select('id, check_in, total_price, is_creche, payment_status')
          .eq('payment_status', 'pago')
          .gte('check_in', startDate.toISOString()),
      ]);

      // Build sale IDs set
      const saleIds = new Set((salesData || []).map((s: any) => s.id));

      // Group sale_items by sale_id, filter to valid sales
      const validItems = (saleItemsData || []).filter((item: any) => item.sale_id && saleIds.has(item.sale_id));

      // Calculate categories exactly like Faturamento page
      let servicesTotal = 0, servicesCount = 0;
      let additionalsTotal = 0, additionalsCount = 0;
      let productsTotal = 0, productsCount = 0;

      validItems.forEach((item: any) => {
        if (item.covered_by_plan) return;
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
          servicesTotal += item.total_price;
          servicesCount += 1;
        }
      });

      // Plans
      const plansTotal = (plansData || []).reduce((sum: number, p: any) => sum + (p.price_paid || 0), 0);
      const plansCount = (plansData || []).length;

      // Hotel & Creche
      const hotelItems = (hotelData || []).filter((h: any) => !h.is_creche);
      const crecheItems = (hotelData || []).filter((h: any) => h.is_creche);
      const hotelTotal = hotelItems.reduce((sum: number, h: any) => sum + (h.total_price || 0), 0);
      const hotelCount = hotelItems.length;
      const crecheTotal = crecheItems.reduce((sum: number, h: any) => sum + (h.total_price || 0), 0);
      const crecheCount = crecheItems.length;

      const total = servicesTotal + additionalsTotal + productsTotal + plansTotal + hotelTotal + crecheTotal;

      const cats: CategoryStats[] = [
        {
          name: 'Hotel',
          icon: <Home className="w-5 h-5" />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          total: hotelTotal,
          count: hotelCount,
          percentage: total > 0 ? (hotelTotal / total) * 100 : 0,
        },
        {
          name: 'Serviços (Banho/Tosa)',
          icon: <Scissors className="w-5 h-5" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          total: servicesTotal,
          count: servicesCount,
          percentage: total > 0 ? (servicesTotal / total) * 100 : 0,
        },
        {
          name: 'Creche',
          icon: <Home className="w-5 h-5" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          total: crecheTotal,
          count: crecheCount,
          percentage: total > 0 ? (crecheTotal / total) * 100 : 0,
        },
        {
          name: 'Adicionais',
          icon: <Sparkles className="w-5 h-5" />,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          total: additionalsTotal,
          count: additionalsCount,
          percentage: total > 0 ? (additionalsTotal / total) * 100 : 0,
        },
        {
          name: 'Planos',
          icon: <Receipt className="w-5 h-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          total: plansTotal,
          count: plansCount,
          percentage: total > 0 ? (plansTotal / total) * 100 : 0,
        },
        {
          name: 'Produtos',
          icon: <Package className="w-5 h-5" />,
          color: 'text-teal-600',
          bgColor: 'bg-teal-100',
          total: productsTotal,
          count: productsCount,
          percentage: total > 0 ? (productsTotal / total) * 100 : 0,
        },
      ].sort((a, b) => b.total - a.total);

      setCategories(cats);
      setGrandTotal(total);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('revenue-breakdown-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_plans' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Faturamento por Categoria
            </CardTitle>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'today' | 'month')}>
              <TabsList className="h-8">
                <TabsTrigger value="today" className="text-xs px-3 h-6">
                  <Calendar className="w-3 h-3 mr-1" />
                  Hoje
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-3 h-6">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Este Mês
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === 'today'
              ? format(new Date(), "dd 'de' MMMM", { locale: ptBR })
              : format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })
            }
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <>
              {/* Total */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {activeTab === 'today' ? 'Faturamento Hoje' : 'Faturamento do Mês'}
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(grandTotal)}
                    </p>
                  </div>
                  <DollarSign className="w-12 h-12 text-green-500/30" />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-3">
                {categories.map((cat) => (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cat.bgColor}`}>
                          <span className={cat.color}>{cat.icon}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">{cat.count} vendas</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="font-bold text-sm">{formatCurrency(cat.total)}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {cat.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden ml-13">
                      <div
                        className={`h-full rounded-full ${cat.bgColor.replace('100', '500')}`}
                        style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Legend */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  ℹ️ Apenas vendas com pagamento confirmado são contabilizadas.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
