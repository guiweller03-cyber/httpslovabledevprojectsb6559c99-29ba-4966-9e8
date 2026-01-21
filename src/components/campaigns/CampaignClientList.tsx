import { useState, useMemo } from 'react';
import { Search, Users, Calendar, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientWithCampaign {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  tipo_campanha: string | null;
  last_purchase: string | null;
  created_at: string | null;
}

interface CampaignClientListProps {
  clients: ClientWithCampaign[];
  isLoading: boolean;
  diasInatividade: number;
}

export function CampaignClientList({ clients, isLoading, diasInatividade }: CampaignClientListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(term) ||
        client.whatsapp.includes(term)
    );
  }, [clients, searchTerm]);

  const calculateDaysInactive = (lastPurchase: string | null): number | null => {
    if (!lastPurchase) return null;
    try {
      const lastDate = parseISO(lastPurchase);
      return differenceInDays(new Date(), lastDate);
    } catch {
      return null;
    }
  };

  const formatLastPurchase = (lastPurchase: string | null): string => {
    if (!lastPurchase) return 'Nunca';
    try {
      return format(parseISO(lastPurchase), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const getInactivityBadge = (daysInactive: number | null) => {
    if (daysInactive === null) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Nunca comprou</Badge>;
    }
    if (daysInactive >= diasInatividade) {
      return <Badge className="bg-red-100 text-red-700 border-red-200">{daysInactive} dias</Badge>;
    }
    if (daysInactive >= diasInatividade * 0.5) {
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200">{daysInactive} dias</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 border-green-200">{daysInactive} dias</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2" />
            Carregando clientes...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Clientes Selecionados
          </CardTitle>
          <Badge variant="outline" className="text-base px-3 py-1">
            {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Client List */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum cliente encontrado</p>
            <p className="text-sm">Selecione critérios de segmentação acima</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Última Compra
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Inatividade
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => {
                  const daysInactive = calculateDaysInactive(client.last_purchase);
                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-muted-foreground">{client.whatsapp}</TableCell>
                      <TableCell>{formatLastPurchase(client.last_purchase)}</TableCell>
                      <TableCell>{getInactivityBadge(daysInactive)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Total de destinatários:
          </span>
          <span className="font-semibold text-foreground">
            {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
