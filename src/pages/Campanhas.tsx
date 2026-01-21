import { useState, useEffect, useMemo } from 'react';
import { Megaphone, Search, Send, Users, Image, Video, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
}

type MediaType = 'text' | 'image' | 'video';

const mediaTypeLabels: Record<MediaType, { label: string; icon: React.ReactNode }> = {
  text: { label: 'Texto', icon: <FileText className="w-4 h-4" /> },
  image: { label: 'Imagem', icon: <Image className="w-4 h-4" /> },
  video: { label: 'Vídeo', icon: <Video className="w-4 h-4" /> },
};

// N8N Webhook URL - configure this with your actual n8n webhook URL
const N8N_WEBHOOK_URL = 'https://SEU_N8N_URL/webhook/campanha';

export default function Campanhas() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  
  // Campaign form state
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  
  // UI state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch clients from database
  useEffect(() => {
    const fetchClients = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, whatsapp, email')
          .order('name', { ascending: true });

        if (error) throw error;
        setClients(data || []);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        toast({
          title: 'Erro ao carregar clientes',
          description: 'Não foi possível carregar a lista de clientes.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(
      c => c.name.toLowerCase().includes(term) || c.whatsapp.includes(term)
    );
  }, [clients, searchTerm]);

  // Get selected clients
  const selectedClients = useMemo(() => {
    return clients.filter(c => selectedClientIds.has(c.id));
  }, [clients, selectedClientIds]);

  // Toggle client selection
  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  // Select/Deselect all visible clients
  const toggleSelectAll = () => {
    if (filteredClients.every(c => selectedClientIds.has(c.id))) {
      // Deselect all filtered
      setSelectedClientIds(prev => {
        const newSet = new Set(prev);
        filteredClients.forEach(c => newSet.delete(c.id));
        return newSet;
      });
    } else {
      // Select all filtered
      setSelectedClientIds(prev => {
        const newSet = new Set(prev);
        filteredClients.forEach(c => newSet.add(c.id));
        return newSet;
      });
    }
  };

  // Validate form
  const isFormValid = useMemo(() => {
    if (!campaignName.trim()) return false;
    if (!message.trim()) return false;
    if (selectedClientIds.size === 0) return false;
    if (mediaType !== 'text' && !mediaUrl.trim()) return false;
    return true;
  }, [campaignName, message, selectedClientIds.size, mediaType, mediaUrl]);

  // Format phone number with country code
  const formatPhoneWithDDI = (phone: string): string => {
    // Remove non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    // Add Brazil country code if not present
    if (!cleanPhone.startsWith('55')) {
      return `55${cleanPhone}`;
    }
    return cleanPhone;
  };

  // Send campaign
  const handleSendCampaign = async () => {
    if (!isFormValid) return;

    setIsSending(true);

    try {
      const payload = {
        mensagem: message,
        mediaType: mediaType,
        mediaUrl: mediaType !== 'text' ? mediaUrl : '',
        clientes: selectedClients.map(c => ({
          nome: c.name,
          telefone: formatPhoneWithDDI(c.whatsapp),
        })),
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
        description: `Campanha "${campaignName}" enviada para ${selectedClients.length} cliente(s).`,
      });

      // Reset form
      setCampaignName('');
      setMessage('');
      setMediaType('text');
      setMediaUrl('');
      setSelectedClientIds(new Set());
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
          <p className="text-muted-foreground">Envie mensagens em massa para seus clientes via WhatsApp</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Selecionar Clientes
            </CardTitle>
            <CardDescription>
              Escolha os clientes que receberão a campanha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {filteredClients.every(c => selectedClientIds.has(c.id)) && filteredClients.length > 0
                  ? 'Desmarcar Todos'
                  : 'Selecionar Todos'}
              </Button>
              <Badge variant="secondary">
                {selectedClientIds.size} selecionado(s)
              </Badge>
            </div>

            <Separator />

            {/* Client List */}
            <ScrollArea className="h-[400px] pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum cliente encontrado
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedClientIds.has(client.id)
                          ? 'bg-primary/10 border-primary'
                          : 'bg-background border-border hover:bg-muted/50'
                      }`}
                      onClick={() => toggleClientSelection(client.id)}
                    >
                      <Checkbox
                        checked={selectedClientIds.has(client.id)}
                        onCheckedChange={() => toggleClientSelection(client.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.whatsapp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

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
                placeholder="Ex: Promoção de Verão"
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
                className="min-h-[150px] resize-none"
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
                <p className="text-xs text-muted-foreground">
                  Insira o link direto para o arquivo de mídia
                </p>
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
                  <span className="text-muted-foreground">Tipo:</span>{' '}
                  {mediaTypeLabels[mediaType].label}
                </p>
                <p>
                  <span className="text-muted-foreground">Destinatários:</span>{' '}
                  <Badge variant="secondary">{selectedClientIds.size}</Badge>
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
            </Button>

            {!isFormValid && (
              <p className="text-xs text-center text-muted-foreground">
                Preencha todos os campos obrigatórios e selecione ao menos um cliente
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
                <strong>{selectedClientIds.size} cliente(s)</strong>.
              </p>
              
              <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                <p><strong>Tipo:</strong> {mediaTypeLabels[mediaType].label}</p>
                {mediaType !== 'text' && mediaUrl && (
                  <p><strong>Mídia:</strong> {mediaUrl}</p>
                )}
                <p><strong>Mensagem:</strong></p>
                <p className="text-muted-foreground whitespace-pre-wrap">{message}</p>
              </div>

              <p className="text-xs text-muted-foreground">
                Os dados serão enviados para o webhook do n8n. O envio real das mensagens
                será processado pelo n8n via Uazapi.
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
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Envio
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
