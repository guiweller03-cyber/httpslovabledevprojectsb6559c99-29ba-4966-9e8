import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Scissors, 
  Bath, 
  Home, 
  Plus, 
  Car,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SaleItemData {
  id: string;
  item_type: string;
  description: string;
  total_price: number;
  covered_by_plan: boolean;
  sale: {
    id: string;
    payment_status: string;
    created_at: string;
    total_amount: number;
  };
}

interface RevenueCategory {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  total: number;
  count: number;
}

interface RevenueData {
  banho: RevenueCategory;
  tosa: RevenueCategory;
  banho_tosa: RevenueCategory;
  adicionais: RevenueCategory;
  taxi_dog: RevenueCategory;
  hotel: RevenueCategory;
  creche: RevenueCategory;
  produtos: RevenueCategory;
}

const INITIAL_CATEGORIES: RevenueData = {
  banho: { label: 'Banho', icon: Bath, color: 'text-blue-600', bgColor: 'bg-blue-100', total: 0, count: 0 },
  tosa: { label: 'Tosa', icon: Scissors, color: 'text-purple-600', bgColor: 'bg-purple-100', total: 0, count: 0 },
  banho_tosa: { label: 'Banho + Tosa', icon: Scissors, color: 'text-indigo-600', bgColor: 'bg-indigo-100', total: 0, count: 0 },
  adicionais: { label: 'Adicionais', icon: Plus, color: 'text-amber-600', bgColor: 'bg-amber-100', total: 0, count: 0 },
  taxi_dog: { label: 'Táxi Dog', icon: Car, color: 'text-green-600', bgColor: 'bg-green-100', total: 0, count: 0 },
  hotel: { label: 'Hotel', icon: Home, color: 'text-rose-600', bgColor: 'bg-rose-100', total: 0, count: 0 },
  creche: { label: 'Creche', icon: Home, color: 'text-orange-600', bgColor: 'bg-orange-100', total: 0, count: 0 },
  produtos: { label: 'Produtos', icon: DollarSign, color: 'text-teal-600', bgColor: 'bg-teal-100', total: 0, count: 0 },
};

export function RevenueBreakdown() {
  const [salesData, setSalesData] = useState<SaleItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'day' | 'week'>('day');

  const fetchSalesData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

      // Fetch sale_items with their parent sale info (only paid)
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          id,
          item_type,
          description,
          total_price,
          covered_by_plan,
          sale:sales!inner (
            id,
            payment_status,
            created_at,
            total_amount
          )
        `)
        .in('sale.payment_status', ['pago', 'pago_antecipado'])
        .gte('sale.created_at', weekStart.toISOString())
        .lte('sale.created_at', weekEnd.toISOString());

      if (error) throw error;
      
      // Transform nested structure
      const transformedData: SaleItemData[] = (data || []).map((item: any) => ({
        id: item.id,
        item_type: item.item_type,
        description: item.description || '',
        total_price: item.total_price || 0,
        covered_by_plan: item.covered_by_plan || false,
        sale: item.sale
      }));
      
      setSalesData(transformedData);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();

    // Realtime subscription
    const channel = supabase
      .channel('revenue-breakdown-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, fetchSalesData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, fetchSalesData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Categorize items
  const categorizeItem = (item: SaleItemData): keyof RevenueData | null => {
    const itemType = item.item_type?.toLowerCase() || '';
    const desc = item.description?.toLowerCase() || '';

    // Check for Táxi Dog first (in additionals)
    if (desc.includes('táxi dog') || desc.includes('taxi dog')) {
      return 'taxi_dog';
    }

    // Check service types
    if (itemType === 'service_banho_tosa' || desc.includes('banho + tosa') || desc.includes('banho e tosa')) {
      return 'banho_tosa';
    }
    if (itemType === 'service_banho' || desc === 'banho') {
      return 'banho';
    }
    if (itemType === 'service_tosa' || desc === 'tosa') {
      return 'tosa';
    }

    // Check for additionals/extras
    if (itemType === 'adicional' || itemType === 'additional' || itemType.includes('addon')) {
      return 'adicionais';
    }

    // Check for hotel/creche
    if (itemType === 'hotel' || desc.includes('hotel')) {
      return 'hotel';
    }
    if (itemType === 'creche' || desc.includes('creche')) {
      return 'creche';
    }

    // Products
    if (itemType === 'product' || itemType === 'produto') {
      return 'produtos';
    }

    // Default to adicionais for unknown items
    if (item.total_price > 0) {
      return 'adicionais';
    }

    return null;
  };

  const calculateRevenueData = (items: SaleItemData[]): { categories: RevenueData; total: number } => {
    const categories: RevenueData = JSON.parse(JSON.stringify(INITIAL_CATEGORIES));
    let total = 0;

    items.forEach(item => {
      // Skip if covered by plan (already paid via subscription)
      if (item.covered_by_plan) return;
      
      const category = categorizeItem(item);
      if (category && categories[category]) {
        categories[category].total += item.total_price || 0;
        categories[category].count += 1;
        total += item.total_price || 0;
      }
    });

    return { categories, total };
  };

  const dayData = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    
    const todayItems = salesData.filter(item => {
      const saleDate = new Date(item.sale.created_at);
      return saleDate >= todayStart && saleDate <= todayEnd;
    });
    
    return calculateRevenueData(todayItems);
  }, [salesData]);

  const weekData = useMemo(() => {
    return calculateRevenueData(salesData);
  }, [salesData]);

  const currentData = activeTab === 'day' ? dayData : weekData;

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const CategoryCard = ({ category, data }: { category: keyof RevenueData; data: RevenueCategory }) => {
    const Icon = data.icon;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${data.bgColor}`}>
            <Icon className={`w-5 h-5 ${data.color}`} />
          </div>
          <div>
            <p className="font-medium text-sm">{data.label}</p>
            <p className="text-xs text-muted-foreground">{data.count} {data.count === 1 ? 'item' : 'itens'}</p>
          </div>
        </div>
        <span className={`font-bold ${data.total > 0 ? data.color : 'text-muted-foreground'}`}>
          {formatCurrency(data.total)}
        </span>
      </motion.div>
    );
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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'day' | 'week')}>
              <TabsList className="h-8">
                <TabsTrigger value="day" className="text-xs px-3 h-6">
                  <Calendar className="w-3 h-3 mr-1" />
                  Hoje
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-3 h-6">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Semana
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === 'day' 
              ? format(new Date(), "dd 'de' MMMM", { locale: ptBR })
              : `${format(startOfWeek(new Date(), { weekStartsOn: 0 }), "dd/MM", { locale: ptBR })} - ${format(endOfWeek(new Date(), { weekStartsOn: 0 }), "dd/MM", { locale: ptBR })}`
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
                      Total {activeTab === 'day' ? 'do dia' : 'da semana'}
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(currentData.total)}
                    </p>
                  </div>
                  <DollarSign className="w-12 h-12 text-green-500/30" />
                </div>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Serviços */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Scissors className="w-4 h-4" />
                    Serviços
                  </h4>
                  <CategoryCard category="banho" data={currentData.categories.banho} />
                  <CategoryCard category="tosa" data={currentData.categories.tosa} />
                  <CategoryCard category="banho_tosa" data={currentData.categories.banho_tosa} />
                </div>

                {/* Adicionais e Outros */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionais e Outros
                  </h4>
                  <CategoryCard category="adicionais" data={currentData.categories.adicionais} />
                  <CategoryCard category="taxi_dog" data={currentData.categories.taxi_dog} />
                  <CategoryCard category="produtos" data={currentData.categories.produtos} />
                </div>
              </div>

              {/* Hotel/Creche */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Hospedagem
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CategoryCard category="hotel" data={currentData.categories.hotel} />
                  <CategoryCard category="creche" data={currentData.categories.creche} />
                </div>
              </div>

              {/* Legend */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  ℹ️ Apenas vendas com pagamento confirmado no Frente de Caixa são contabilizadas.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
