// =====================================================
// Client Pet History - Histórico do Cliente e Pet
// =====================================================
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Dog, History, ShoppingBag, Scissors, Hotel, Syringe, 
  Package, Calendar, DollarSign, TrendingUp, ChevronDown, ChevronUp,
  Pill, Shield, Bug
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';

interface ClientPetHistoryProps {
  clientId?: string;
  petId?: string;
  clientName?: string;
  petName?: string;
}

interface HistoryData {
  totalSpent: number;
  totalPurchases: number;
  lastPurchase?: string;
  recentSales: any[];
  recentServices: any[];
  recentHotel: any[];
  vaccines: any[];
  vermifuge?: any;
  antiparasitic?: any;
}

export function ClientPetHistory({ clientId, petId, clientName, petName }: ClientPetHistoryProps) {
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    purchases: true,
    services: false,
    health: false,
  });

  useEffect(() => {
    if (!clientId && !petId) {
      setHistory(null);
      return;
    }

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const data: HistoryData = {
          totalSpent: 0,
          totalPurchases: 0,
          recentSales: [],
          recentServices: [],
          recentHotel: [],
          vaccines: [],
        };

        // Fetch recent sales
        let salesQuery = supabase
          .from('sales')
          .select('*, sale_items(*)')
          .order('created_at', { ascending: false })
          .limit(10);

        if (clientId) {
          salesQuery = salesQuery.eq('client_id', clientId);
        }
        if (petId) {
          salesQuery = salesQuery.eq('pet_id', petId);
        }

        const { data: sales } = await salesQuery;
        if (sales) {
          data.recentSales = sales;
          data.totalSpent = sales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
          data.totalPurchases = sales.length;
          if (sales[0]) {
            data.lastPurchase = sales[0].created_at;
          }
        }

        // Fetch grooming services
        if (petId) {
          const { data: services } = await supabase
            .from('bath_grooming_appointments')
            .select('*')
            .eq('pet_id', petId)
            .order('start_datetime', { ascending: false })
            .limit(5);
          if (services) data.recentServices = services;

          // Fetch hotel stays
          const { data: hotel } = await supabase
            .from('hotel_stays')
            .select('*')
            .eq('pet_id', petId)
            .order('check_in', { ascending: false })
            .limit(5);
          if (hotel) data.recentHotel = hotel;

          // Fetch vaccines
          const { data: vaccines } = await supabase
            .from('pet_vacinas')
            .select('*')
            .eq('pet_id', petId)
            .order('data_vencimento', { ascending: false });
          if (vaccines) data.vaccines = vaccines;

          // Fetch health info
          const { data: health } = await supabase
            .from('pet_health')
            .select('*')
            .eq('pet_id', petId)
            .single();
          if (health) {
            data.vermifuge = health.vermifuge_valid_until ? {
              type: health.vermifuge_type,
              validUntil: health.vermifuge_valid_until,
            } : null;
            data.antiparasitic = health.antipulgas_valid_until ? {
              type: health.antiparasitic_type,
              validUntil: health.antipulgas_valid_until,
            } : null;
          }
        }

        setHistory(data);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [clientId, petId]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!clientId && !petId) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="py-6 text-center text-muted-foreground">
          <div className="animate-pulse">Carregando histórico...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-5 h-5 text-primary" />
          Histórico
          {petName && (
            <Badge variant="outline" className="ml-2">
              <Dog className="w-3 h-3 mr-1" />
              {petName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        {history && (
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-primary/5 rounded-lg">
              <p className="text-lg font-bold text-primary">
                R$ {history.totalSpent.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">Total gasto</p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-600">
                {history.totalPurchases}
              </p>
              <p className="text-xs text-muted-foreground">Compras</p>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-lg">
              <p className="text-lg font-bold text-amber-600">
                {history.recentServices.length}
              </p>
              <p className="text-xs text-muted-foreground">Serviços</p>
            </div>
          </div>
        )}

        <ScrollArea className="h-[250px]">
          {/* Recent purchases */}
          <Collapsible open={expandedSections.purchases} onOpenChange={() => toggleSection('purchases')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2">
                <span className="flex items-center gap-2 text-sm">
                  <ShoppingBag className="w-4 h-4" />
                  Últimas Compras
                </span>
                {expandedSections.purchases ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 px-2">
              {history?.recentSales.slice(0, 5).map((sale: any) => (
                <div key={sale.id} className="flex justify-between text-xs p-2 bg-muted/50 rounded">
                  <div>
                    <p>{format(new Date(sale.created_at), 'dd/MM/yy', { locale: ptBR })}</p>
                    <p className="text-muted-foreground">
                      {sale.sale_items?.length || 0} itens
                    </p>
                  </div>
                  <span className="font-medium">R$ {sale.total_amount?.toFixed(2)}</span>
                </div>
              ))}
              {(!history?.recentSales || history.recentSales.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhuma compra</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-2" />

          {/* Services */}
          {petId && (
            <>
              <Collapsible open={expandedSections.services} onOpenChange={() => toggleSection('services')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-2">
                    <span className="flex items-center gap-2 text-sm">
                      <Scissors className="w-4 h-4" />
                      Serviços Realizados
                    </span>
                    {expandedSections.services ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 px-2">
                  {history?.recentServices.map((svc: any) => (
                    <div key={svc.id} className="flex justify-between text-xs p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3 h-3 text-primary" />
                        <div>
                          <p>{svc.grooming_type || svc.service_type}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(svc.start_datetime), 'dd/MM/yy', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {svc.status}
                      </Badge>
                    </div>
                  ))}
                  {history?.recentHotel.map((stay: any) => (
                    <div key={stay.id} className="flex justify-between text-xs p-2 bg-orange-50 rounded">
                      <div className="flex items-center gap-2">
                        <Hotel className="w-3 h-3 text-orange-500" />
                        <div>
                          <p>{stay.is_creche ? 'Creche' : 'Hotel'}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(stay.check_in), 'dd/MM', { locale: ptBR })} - {format(new Date(stay.check_out), 'dd/MM', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <span className="font-medium">R$ {stay.total_price?.toFixed(2)}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              <Separator className="my-2" />

              {/* Health info */}
              <Collapsible open={expandedSections.health} onOpenChange={() => toggleSection('health')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-2">
                    <span className="flex items-center gap-2 text-sm">
                      <Syringe className="w-4 h-4" />
                      Saúde
                    </span>
                    {expandedSections.health ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 px-2">
                  {history?.vaccines.slice(0, 3).map((vac: any) => {
                    const isExpired = new Date(vac.data_vencimento) < new Date();
                    return (
                      <div key={vac.id} className="flex justify-between text-xs p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3 h-3 text-green-500" />
                          <span>{vac.nome}</span>
                        </div>
                        <Badge variant={isExpired ? 'destructive' : 'outline'} className="text-xs">
                          {isExpired ? 'Vencida' : format(new Date(vac.data_vencimento), 'dd/MM/yy')}
                        </Badge>
                      </div>
                    );
                  })}
                  {history?.vermifuge && (
                    <div className="flex justify-between text-xs p-2 bg-purple-50 rounded">
                      <div className="flex items-center gap-2">
                        <Pill className="w-3 h-3 text-purple-500" />
                        <span>Vermífugo</span>
                      </div>
                      <span className="text-muted-foreground">
                        até {format(new Date(history.vermifuge.validUntil), 'dd/MM/yy')}
                      </span>
                    </div>
                  )}
                  {history?.antiparasitic && (
                    <div className="flex justify-between text-xs p-2 bg-blue-50 rounded">
                      <div className="flex items-center gap-2">
                        <Bug className="w-3 h-3 text-blue-500" />
                        <span>Antipulgas</span>
                      </div>
                      <span className="text-muted-foreground">
                        até {format(new Date(history.antiparasitic.validUntil), 'dd/MM/yy')}
                      </span>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
