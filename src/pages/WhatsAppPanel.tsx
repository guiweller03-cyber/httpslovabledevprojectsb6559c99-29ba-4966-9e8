import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Bot, User, Pause, Play, UserCheck, Circle, ExternalLink, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { mockConversations, mockMessages } from '@/data/mockData';
import { WhatsAppConversation, WhatsAppMessage, ConversationStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<ConversationStatus, { label: string; color: string; bgColor: string }> = {
  ia_ativa: { label: 'IA Ativa', color: 'text-primary', bgColor: 'bg-primary/10' },
  humano_ativo: { label: 'Humano', color: 'text-secondary', bgColor: 'bg-secondary/10' },
  pausada: { label: 'Pausada', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

// Simula disparo de webhook para o n8n
const triggerWebhook = async (event: string, data: Record<string, unknown>) => {
  console.log(`[WEBHOOK] ${event}:`, data);
  // Em produção: fetch('https://seu-n8n.com/webhook/...', { method: 'POST', body: JSON.stringify(data) })
  return true;
};

const WhatsAppPanel = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>(mockConversations);
  const [messages] = useState<WhatsAppMessage[]>(mockMessages);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(
    mockConversations[0]
  );

  const conversationMessages = selectedConversation
    ? messages.filter(m => m.clientId === selectedConversation.clientId)
    : [];

  // Webhook: Humano assumiu a conversa
  const handleAssumeConversation = async () => {
    if (!selectedConversation) return;

    await triggerWebhook('humano_assumiu_conversa', {
      conversationId: selectedConversation.id,
      clientId: selectedConversation.clientId,
      clientWhatsapp: selectedConversation.clientWhatsapp,
      timestamp: new Date().toISOString(),
    });

    setConversations(prev =>
      prev.map(c =>
        c.id === selectedConversation.id
          ? { ...c, status: 'humano_ativo' as ConversationStatus }
          : c
      )
    );
    setSelectedConversation({ ...selectedConversation, status: 'humano_ativo' });

    toast({
      title: "👤 Humano Assumiu Conversa",
      description: "Webhook disparado para o n8n. A IA está pausada para este cliente.",
    });
  };

  // Webhook: Pausar IA
  const handlePauseAI = async () => {
    if (!selectedConversation) return;

    await triggerWebhook('ia_pausada', {
      conversationId: selectedConversation.id,
      clientId: selectedConversation.clientId,
      clientWhatsapp: selectedConversation.clientWhatsapp,
      timestamp: new Date().toISOString(),
    });

    setConversations(prev =>
      prev.map(c =>
        c.id === selectedConversation.id
          ? { ...c, status: 'pausada' as ConversationStatus }
          : c
      )
    );
    setSelectedConversation({ ...selectedConversation, status: 'pausada' });

    toast({
      title: "⏸️ IA Pausada",
      description: "Webhook disparado para o n8n. A IA não responderá mais este cliente.",
    });
  };

  // Webhook: Retomar IA
  const handleResumeAI = async () => {
    if (!selectedConversation) return;

    await triggerWebhook('ia_retomada', {
      conversationId: selectedConversation.id,
      clientId: selectedConversation.clientId,
      clientWhatsapp: selectedConversation.clientWhatsapp,
      timestamp: new Date().toISOString(),
    });

    setConversations(prev =>
      prev.map(c =>
        c.id === selectedConversation.id
          ? { ...c, status: 'ia_ativa' as ConversationStatus }
          : c
      )
    );
    setSelectedConversation({ ...selectedConversation, status: 'ia_ativa' });

    toast({
      title: "▶️ IA Retomada",
      description: "Webhook disparado para o n8n. A IA voltará a responder este cliente.",
    });
  };

  return (
    <div className="p-8 h-[calc(100vh-2rem)]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          Painel de Operação do WhatsApp
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitoramento em tempo real via API externa • Orquestrador de webhooks
        </p>
      </motion.div>

      {/* Important Architecture Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card className="border-0 shadow-soft bg-primary/5 border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm space-y-1">
                <p><strong>Arquitetura:</strong> Este painel <strong>NÃO envia mensagens</strong>.</p>
                <p>• Mensagens recebidas e enviadas vêm da <strong>API externa</strong> (Z-API + n8n)</p>
                <p>• Botões disparam <strong>webhooks para o n8n</strong> que controla as respostas</p>
                <p>• IA responde primeiro, humano pode assumir via webhook</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-220px)]">
        {/* Conversation List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-0 shadow-soft h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Conversas Ativas
                <Badge variant="secondary" className="ml-auto">
                  {conversations.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100%-60px)]">
                <div className="p-3 space-y-2">
                  {conversations.map((conv) => {
                    const status = statusConfig[conv.status];
                    const isSelected = selectedConversation?.id === conv.id;

                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={cn(
                          "w-full p-3 rounded-xl text-left transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                              isSelected ? "bg-white/20" : "bg-primary/10 text-primary"
                            )}>
                              {conv.clientName.charAt(0)}
                            </div>
                            {conv.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-secondary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold truncate">{conv.clientName}</p>
                              <span className={cn(
                                "text-xs",
                                isSelected ? "text-white/70" : "text-muted-foreground"
                              )}>
                                {formatDistanceToNow(conv.lastMessageAt, { locale: ptBR })}
                              </span>
                            </div>
                            <p className={cn(
                              "text-sm truncate",
                              isSelected ? "text-white/80" : "text-muted-foreground"
                            )}>
                              {conv.lastMessage}
                            </p>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "mt-1 text-xs border-0",
                                isSelected ? "bg-white/20 text-white" : status.bgColor + " " + status.color
                              )}
                            >
                              {conv.status === 'ia_ativa' && <Bot className="w-3 h-3 mr-1" />}
                              {conv.status === 'humano_ativo' && <User className="w-3 h-3 mr-1" />}
                              {conv.status === 'pausada' && <Pause className="w-3 h-3 mr-1" />}
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Message Monitor (Read-Only) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="border-0 shadow-soft h-full flex flex-col">
            {selectedConversation ? (
              <>
                {/* Header with Controls */}
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                        {selectedConversation.clientName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold">{selectedConversation.clientName}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Circle className="w-2 h-2 fill-success text-success" />
                          {selectedConversation.clientWhatsapp}
                        </p>
                      </div>
                      <Badge className={cn("ml-2", statusConfig[selectedConversation.status].bgColor, statusConfig[selectedConversation.status].color)}>
                        {selectedConversation.status === 'ia_ativa' && <Bot className="w-3 h-3 mr-1" />}
                        {selectedConversation.status === 'humano_ativo' && <User className="w-3 h-3 mr-1" />}
                        {selectedConversation.status === 'pausada' && <Pause className="w-3 h-3 mr-1" />}
                        {statusConfig[selectedConversation.status].label}
                      </Badge>
                    </div>
                    
                    {/* Webhook Control Buttons */}
                    <div className="flex items-center gap-2">
                      {selectedConversation.status === 'ia_ativa' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePauseAI}
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pausar IA
                        </Button>
                      )}
                      
                      {selectedConversation.status === 'pausada' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResumeAI}
                          className="border-success text-success hover:bg-success/10"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Retomar IA
                        </Button>
                      )}
                      
                      {selectedConversation.status !== 'humano_ativo' && (
                        <Button
                          size="sm"
                          onClick={handleAssumeConversation}
                          className="bg-gradient-secondary hover:opacity-90"
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Humano Assumir
                        </Button>
                      )}
                      
                      {selectedConversation.status === 'humano_ativo' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResumeAI}
                          className="border-primary text-primary hover:bg-primary/10"
                        >
                          <Bot className="w-4 h-4 mr-1" />
                          Devolver para IA
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Messages Display (Read-Only Monitor) */}
                <CardContent className="flex-1 p-4 overflow-auto">
                  <div className="space-y-4">
                    {conversationMessages.map((msg, index) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "flex",
                          msg.direction === 'outgoing' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className={cn(
                          "max-w-[70%] p-3 rounded-2xl",
                          msg.direction === 'outgoing'
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        )}>
                          <p className="text-sm">{msg.content}</p>
                          <div className={cn(
                            "flex items-center gap-1 mt-1 text-xs",
                            msg.direction === 'outgoing' ? "text-white/70" : "text-muted-foreground"
                          )}>
                            {msg.source === 'ia' ? (
                              <Bot className="w-3 h-3" />
                            ) : (
                              <User className="w-3 h-3" />
                            )}
                            <span>{msg.source === 'ia' ? 'IA (n8n)' : 'Humano'}</span>
                            <span>•</span>
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span>•</span>
                            <ExternalLink className="w-3 h-3" />
                            <span>via API</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>

                {/* Info Footer - No Input! */}
                <div className="p-4 border-t bg-muted/30">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <ExternalLink className="w-4 h-4" />
                    <span>Respostas são enviadas exclusivamente via <strong>n8n + Z-API</strong></span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Selecione uma conversa para monitorar</p>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default WhatsAppPanel;
