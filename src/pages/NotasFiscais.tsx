import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Search,
  Filter,
  Download,
  Eye,
  XCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotaFiscal {
  id: string;
  company_id: string;
  sale_id: string | null;
  tipo: string;
  numero: number;
  serie: string;
  chave: string | null;
  status: string;
  referencia_focus: string | null;
  xml: string | null;
  pdf_url: string | null;
  erro_sefaz: string | null;
  ambiente: string;
  created_at: string;
  client_name?: string;
  total_amount?: number;
}

const NotasFiscais = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [filteredNotas, setFilteredNotas] = useState<NotaFiscal[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedNota, setSelectedNota] = useState<NotaFiscal | null>(null);
  const [cancelJustificativa, setCancelJustificativa] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);

  useEffect(() => {
    fetchNotas();
  }, []);

  useEffect(() => {
    filterNotas();
  }, [notas, searchTerm, statusFilter, tipoFilter]);

  const fetchNotas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select(`
          *,
          sales:sale_id (
            client_id,
            total_amount,
            clients:client_id (name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedNotas = (data || []).map(nota => ({
        ...nota,
        client_name: (nota.sales as any)?.clients?.name || 'N/A',
        total_amount: (nota.sales as any)?.total_amount || 0,
      }));

      setNotas(formattedNotas);
    } catch (error) {
      console.error('Error fetching notas:', error);
      toast({
        title: 'Erro ao carregar notas',
        description: 'Não foi possível carregar as notas fiscais.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterNotas = () => {
    let filtered = [...notas];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        n => 
          n.numero.toString().includes(term) ||
          n.chave?.toLowerCase().includes(term) ||
          n.client_name?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'todos') {
      filtered = filtered.filter(n => n.status === statusFilter);
    }

    if (tipoFilter !== 'todos') {
      filtered = filtered.filter(n => n.tipo === tipoFilter);
    }

    setFilteredNotas(filtered);
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
      autorizada: { variant: 'default', icon: CheckCircle2 },
      processando: { variant: 'secondary', icon: Clock },
      rejeitada: { variant: 'destructive', icon: XCircle },
      cancelada: { variant: 'outline', icon: XCircle },
      erro: { variant: 'destructive', icon: AlertTriangle },
    };

    const config = configs[status] || { variant: 'secondary' as const, icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleRefreshStatus = async (nota: NotaFiscal) => {
    setIsRefreshing(nota.id);
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single();

      if (!company) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase.functions.invoke('focus-nfe', {
        body: {
          action: 'consultar',
          company_id: company.id,
          nota_id: nota.id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: `Novo status: ${data.nota.status}`,
      });

      await fetchNotas();
    } catch (error) {
      console.error('Error refreshing status:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível consultar o status da nota.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(null);
    }
  };

  const handleCancel = async () => {
    if (!selectedNota || cancelJustificativa.length < 15) {
      toast({
        title: 'Justificativa obrigatória',
        description: 'A justificativa deve ter pelo menos 15 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setIsCanceling(true);
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single();

      if (!company) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase.functions.invoke('focus-nfe', {
        body: {
          action: 'cancelar',
          company_id: company.id,
          nota_id: selectedNota.id,
          justificativa: cancelJustificativa,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error);
      }

      toast({
        title: 'Nota cancelada',
        description: 'A nota fiscal foi cancelada com sucesso.',
      });

      setCancelDialogOpen(false);
      setSelectedNota(null);
      setCancelJustificativa('');
      await fetchNotas();
    } catch (error: any) {
      console.error('Error canceling:', error);
      toast({
        title: 'Erro ao cancelar',
        description: error.message || 'Não foi possível cancelar a nota fiscal.',
        variant: 'destructive',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  const openCancelDialog = (nota: NotaFiscal) => {
    setSelectedNota(nota);
    setCancelDialogOpen(true);
  };

  // Stats
  const stats = {
    total: notas.length,
    autorizadas: notas.filter(n => n.status === 'autorizada').length,
    pendentes: notas.filter(n => n.status === 'processando').length,
    erros: notas.filter(n => n.status === 'rejeitada' || n.status === 'erro').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notas Fiscais</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie todas as notas fiscais emitidas
            </p>
          </div>
        </div>
        <Button onClick={fetchNotas} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de Notas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.autorizadas}</div>
            <p className="text-xs text-muted-foreground">Autorizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendentes}</div>
            <p className="text-xs text-muted-foreground">Processando</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.erros}</div>
            <p className="text-xs text-muted-foreground">Com Erro</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, chave ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="autorizada">Autorizadas</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="rejeitada">Rejeitadas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Tipos</SelectItem>
                <SelectItem value="nfce">NFC-e</SelectItem>
                <SelectItem value="nfe">NF-e</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredNotas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma nota fiscal encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotas.map((nota) => (
                  <TableRow key={nota.id}>
                    <TableCell>
                      <div className="font-medium">{nota.numero}</div>
                      <div className="text-xs text-muted-foreground">Série {nota.serie}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {nota.tipo.toUpperCase()}
                      </Badge>
                      {nota.ambiente === 'homologacao' && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          TESTE
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{nota.client_name}</TableCell>
                    <TableCell>
                      {nota.total_amount?.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(nota.status)}
                      {nota.erro_sefaz && (
                        <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={nota.erro_sefaz}>
                          {nota.erro_sefaz}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(nota.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRefreshStatus(nota)}
                          disabled={isRefreshing === nota.id}
                          title="Atualizar Status"
                        >
                          <RefreshCw className={`w-4 h-4 ${isRefreshing === nota.id ? 'animate-spin' : ''}`} />
                        </Button>
                        
                        {nota.pdf_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Visualizar PDF"
                          >
                            <a href={nota.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        )}

                        {nota.xml && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Baixar XML"
                          >
                            <a href={nota.xml} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        )}

                        {nota.status === 'autorizada' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openCancelDialog(nota)}
                            title="Cancelar Nota"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Nota Fiscal</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A nota será cancelada junto à SEFAZ.
            </DialogDescription>
          </DialogHeader>
          
          {selectedNota && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p><strong>Nota:</strong> {selectedNota.numero}</p>
              <p><strong>Série:</strong> {selectedNota.serie}</p>
              <p><strong>Chave:</strong> {selectedNota.chave?.substring(0, 20)}...</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="justificativa">Justificativa (mínimo 15 caracteres)</Label>
            <Textarea
              id="justificativa"
              placeholder="Informe o motivo do cancelamento..."
              value={cancelJustificativa}
              onChange={(e) => setCancelJustificativa(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {cancelJustificativa.length}/15 caracteres mínimos
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isCanceling || cancelJustificativa.length < 15}
            >
              {isCanceling ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Cancelar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotasFiscais;
