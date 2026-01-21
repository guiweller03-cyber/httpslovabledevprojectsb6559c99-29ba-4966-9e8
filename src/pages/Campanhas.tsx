import { useState, useMemo, useEffect } from 'react';
import { Megaphone, Send, Filter, Clock, UserCheck, UserX, ShoppingBag, Loader2, Info, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Image, Video, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CampaignClientList } from '@/components/campaigns/CampaignClientList';
import { differenceInDays, parseISO } from 'date-fns';

// Types
type MediaType = 'text' | 'image' | 'video';
type CriterioType = 'INATIVO' | 'ATIVO' | 'PRIMEIRA_COMPRA' | 'NUNCA_COMPROU';

interface ClientWithCampaign {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  tipo_campanha: string | null;
  last_purchase: string | null;
  created_at: string | null;
}

interface CriterioConfig {
  id: CriterioType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const criteriosConfig: CriterioConfig[] = [
  {
    id: 'INATIVO',
    label: 'Cliente Inativo',
    description: 'Sem serviço concluído no caixa há X dias',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  {
    id: 'ATIVO',
    label: 'Cliente Ativo',
    description: 'Com serviço recente no caixa',
    icon: <UserCheck className="w-4 h-4" />,
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  {
    id: 'PRIMEIRA_COMPRA',
    label: 'Primeira Compra',
    description: 'Realizou apenas uma compra',
    icon: <ShoppingBag className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    id: 'NUNCA_COMPROU',
    label: 'Nunca Comprou',
    description: 'Cadastrado mas sem compras no caixa',
    icon: <UserX className="w-4 h-4" />,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
];

const mediaTypeLabels: Record<MediaType, { label: string; icon: React.ReactNode }> = {
  text: { label: 'Texto', icon: <FileText className="w-4 h-4" /> },
  image: { label: 'Imagem', icon: <Image className="w-4 h-4" /> },
  video: { label: 'Vídeo', icon: <Video className="w-4 h-4" /> },
};

// N8N Webhook URL - configure this with your actual n8n webhook URL
const N8N_WEBHOOK_URL = 'https://SEU_N8N_URL/webhook/campanha';

export default function Campanhas() {
  // Clients data
  const [allClients, setAllClients] = useState<ClientWithCampaign[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  
  // Criteria selection state
  const [selectedCriterios, setSelectedCriterios] = useState<Set<CriterioType>>(new Set());
  const [diasInatividade, setDiasInatividade] = useState<number>(40);
  
  // Campaign form state
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  
  // UI state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, whatsapp, email, tipo_campanha, last_purchase, created_at')
        .order('name', { ascending: true });

      if (error) throw error;
      setAllClients((data || []) as ClientWithCampaign[]);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: 'Erro ao carregar clientes',
        description: 'Não foi possível buscar a lista de clientes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Filter clients based on selected criteria
  const filteredClients = useMemo(() => {
    if (selectedCriterios.size === 0) return [];

    return allClients.filter((client) => {
      const daysInactive = client.last_purchase 
        ? differenceInDays(new Date(), parseISO(client.last_purchase))
        : null;

      for (const criterio of selectedCriterios) {
        switch (criterio) {
          case 'INATIVO':
            // Inactive: has last_purchase but it's >= diasInatividade days ago
            if (daysInactive !== null && daysInactive >= diasInatividade) {
              return true;
            }
            break;
          case 'ATIVO':
            // Active: has recent purchase (less than diasInatividade)
            if (daysInactive !== null && daysInactive < diasInatividade) {
              return true;
            }
            break;
          case 'PRIMEIRA_COMPRA':
            // First purchase: has tipo_campanha as primeira_compra or has exactly one purchase
            if (client.tipo_campanha === 'primeira_compra') {
              return true;
            }
            break;
          case 'NUNCA_COMPROU':
            // Never bought: no last_purchase date
            if (!client.last_purchase) {
              return true;
            }
            break;
        }
      }
      return false;
    });
  }, [allClients, selectedCriterios, diasInatividade]);

  // Toggle criteria selection
  const toggleCriterio = (criterio: CriterioType) => {
    setSelectedCriterios(prev => {
      const newSet = new Set(prev);
      if (newSet.has(criterio)) {
        newSet.delete(criterio);
      } else {
        newSet.add(criterio);
      }
      return newSet;
    });
  };

  // Validate form - now requires clients to be visible
  const isFormValid = useMemo(() => {
    if (!campaignName.trim()) return false;
    if (!message.trim()) return false;
    if (selectedCriterios.size === 0) return false;
    if (filteredClients.length === 0) return false;
    if (mediaType !== 'text' && !mediaUrl.trim()) return false;
    if (selectedCriterios.has('INATIVO') && (!diasInatividade || diasInatividade < 1)) return false;
    return true;
  }, [campaignName, message, selectedCriterios, mediaType, mediaUrl, diasInatividade, filteredClients.length]);

  // Build criteria labels for display
  const selectedCriteriosLabels = useMemo(() => {
    return criteriosConfig
      .filter(c => selectedCriterios.has(c.id))
      .map(c => c.label);
  }, [selectedCriterios]);

  // Send campaign
  const handleSendCampaign = async () => {
    if (!isFormValid) return;

    setIsSending(true);

    try {
      const payload = {
        campanha: campaignName,
        mensagem: message,
        mediaType: mediaType,
        mediaUrl: mediaType !== 'text' ? mediaUrl : '',
        filtros: {
          criterios: Array.from(selectedCriterios),
          diasInatividade: selectedCriterios.has('INATIVO') ? diasInatividade : null,
        },
        clientes: filteredClients.map(c => ({
          id: c.id,
          nome: c.name,
          telefone: c.whatsapp,
          email: c.email,
        })),
        totalClientes: filteredClients.length,
      };

      console.log('[Campanha Webhook] Enviando dados:', payload);
      console.log('[Campanha Webhook] URL:', N8N_WEBHOOK_URL);

      // Send to n8n webhook
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: '✅ Campanha enviada com sucesso!',
        description: `Campanha "${campaignName}" enviada para ${filteredClients.length} cliente(s).`,
      });

      // Reset form
      setCampaignName('');
      setMessage('');
      setMediaType('text');
      setMediaUrl('');
      setSelectedCriterios(new Set());
      setDiasInatividade(40);
      setShowConfirmDialog(false);

    } catch (error) {
      console.error('Erro ao enviar campanha:', error);
      toast({
        title: '❌ Erro ao enviar campanha',
        description: 'Não foi possível enviar a campanha. Verifique a URL do webhook e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center">
          <Megaphone className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Campanhas</h1>
          <p className="text-muted-foreground">Envie campanhas segmentadas para seus clientes via WhatsApp</p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Como funciona a segmentação</p>
              <p className="text-blue-700">
                A inatividade é calculada com base nos serviços <strong>concluídos e pagos</strong> no Frente de Caixa.
                Selecione os critérios para visualizar os clientes que atendem ao filtro antes de enviar a campanha.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Criteria Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Segmentação de Público
            </CardTitle>
            <CardDescription>
              Selecione os critérios para filtrar os clientes da campanha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Criteria List */}
            <div className="space-y-3">
              {criteriosConfig.map((criterio) => (
                <div key={criterio.id}>
                  <div
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedCriterios.has(criterio.id)
                        ? `${criterio.color} border-2`
                        : 'bg-background border-border hover:bg-muted/50'
                    }`}
                    onClick={() => toggleCriterio(criterio.id)}
                  >
                    <Checkbox
                      checked={selectedCriterios.has(criterio.id)}
                      onCheckedChange={() => toggleCriterio(criterio.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {criterio.icon}
                        <span className="font-medium text-sm">{criterio.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {criterio.description}
                      </p>
                    </div>
                  </div>

                  {/* Inactivity days input - only shown when INATIVO is selected */}
                  {criterio.id === 'INATIVO' && selectedCriterios.has('INATIVO') && (
                    <div className="mt-3 ml-8 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <Label htmlFor="diasInatividade" className="text-sm font-medium text-orange-800">
                        Dias de inatividade
                      </Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          id="diasInatividade"
                          type="number"
                          min={1}
                          value={diasInatividade}
                          onChange={(e) => setDiasInatividade(parseInt(e.target.value) || 40)}
                          className="w-24 bg-white"
                        />
                        <span className="text-sm text-orange-700">dias sem serviço</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Selected Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Critérios selecionados</h4>
              {selectedCriterios.size === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum critério selecionado</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {criteriosConfig
                    .filter(c => selectedCriterios.has(c.id))
                    .map(c => (
                      <Badge key={c.id} className={c.color}>
                        {c.icon}
                        <span className="ml-1">{c.label}</span>
                        {c.id === 'INATIVO' && (
                          <span className="ml-1">({diasInatividade}d)</span>
                        )}
                      </Badge>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Client List Panel */}
        <CampaignClientList 
          clients={filteredClients} 
          isLoading={isLoadingClients}
          diasInatividade={diasInatividade}
        />

        {/* Campaign Form Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Dados da Campanha
            </CardTitle>
            <CardDescription>
              Configure a mensagem e mídia da campanha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="campaignName">Nome da Campanha *</Label>
              <Input
                id="campaignName"
                placeholder="Ex: Reativação de Clientes Inativos"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem *</Label>
              <Textarea
                id="message"
                placeholder="Digite a mensagem que será enviada aos clientes..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {message.length} caracteres
              </p>
            </div>

            {/* Media Type */}
            <div className="space-y-2">
              <Label htmlFor="mediaType">Tipo de Mídia</Label>
              <Select value={mediaType} onValueChange={(v) => setMediaType(v as MediaType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(mediaTypeLabels) as MediaType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {mediaTypeLabels[type].icon}
                        <span>{mediaTypeLabels[type].label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Media URL (shown only for image/video) */}
            {mediaType !== 'text' && (
              <div className="space-y-2">
                <Label htmlFor="mediaUrl">
                  URL da {mediaType === 'image' ? 'Imagem' : 'Vídeo'} *
                </Label>
                <Input
                  id="mediaUrl"
                  type="url"
                  placeholder={`https://exemplo.com/${mediaType === 'image' ? 'imagem.jpg' : 'video.mp4'}`}
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
              </div>
            )}

            <Separator />

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Resumo da Campanha</h4>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Campanha:</span>{' '}
                  {campaignName || '-'}
                </p>
                <p>
                  <span className="text-muted-foreground">Mídia:</span>{' '}
                  {mediaTypeLabels[mediaType].label}
                </p>
                <p>
                  <span className="text-muted-foreground">Público:</span>{' '}
                  {selectedCriteriosLabels.length > 0 
                    ? selectedCriteriosLabels.join(', ')
                    : 'Nenhum critério'}
                </p>
                <p className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Destinatários:</span>{' '}
                  <Badge variant="secondary">{filteredClients.length}</Badge>
                </p>
              </div>
            </div>

            {/* Send Button */}
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={!isFormValid || isSending}
              onClick={() => setShowConfirmDialog(true)}
            >
              <Send className="w-4 h-4" />
              Enviar Campanha
              {filteredClients.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filteredClients.length}
                </Badge>
              )}
            </Button>

            {!isFormValid && selectedCriterios.size > 0 && filteredClients.length === 0 && (
              <p className="text-xs text-center text-amber-600">
                Nenhum cliente atende aos critérios selecionados
              </p>
            )}

            {!isFormValid && selectedCriterios.size === 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Selecione ao menos um critério para visualizar os clientes
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Confirmar Envio de Campanha
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a enviar a campanha <strong>"{campaignName}"</strong> para{' '}
                <strong>{filteredClients.length}</strong> cliente(s).
              </p>
              
              <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                <p><strong>Público-alvo:</strong></p>
                <div className="flex flex-wrap gap-2">
                  {criteriosConfig
                    .filter(c => selectedCriterios.has(c.id))
                    .map(c => (
                      <Badge key={c.id} variant="secondary">
                        {c.label}
                        {c.id === 'INATIVO' && ` (${diasInatividade} dias)`}
                      </Badge>
                    ))}
                </div>
                
                <Separator className="my-2" />
                
                <p><strong>Tipo:</strong> {mediaTypeLabels[mediaType].label}</p>
                {mediaType !== 'text' && mediaUrl && (
                  <p><strong>Mídia:</strong> {mediaUrl}</p>
                )}
                <p><strong>Mensagem:</strong></p>
                <p className="text-muted-foreground whitespace-pre-wrap line-clamp-3">{message}</p>
              </div>

              <p className="text-xs text-muted-foreground">
                Os dados serão enviados via webhook para o n8n, que é responsável pelo 
                envio efetivo das mensagens via WhatsApp.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendCampaign} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>Confirmar Envio ({filteredClients.length})</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
