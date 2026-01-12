import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { mockConversations, mockMessages } from '@/data/mockData';
import { WhatsAppConversation, WhatsAppMessage, ConversationStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import ConversationList from '@/components/whatsapp/ConversationList';
import ChatPanel from '@/components/whatsapp/ChatPanel';
import ContextPanel from '@/components/whatsapp/ContextPanel';

// Simula disparo de webhook para o n8n
const triggerWebhook = async (event: string, data: Record<string, unknown>) => {
  console.log(`[WEBHOOK] ${event}:`, data);
  // Em produção: fetch('https://seu-n8n.com/webhook/...', { method: 'POST', body: JSON.stringify(data) })
  return true;
};

// Add missing fields to mock data
const enhancedConversations: WhatsAppConversation[] = mockConversations.map(conv => ({
  ...conv,
  aiEnabled: conv.status === 'ia_ativa',
  registrationComplete: conv.clientId !== '3', // Ana Oliveira will be incomplete for demo
}));

const enhancedMessages: WhatsAppMessage[] = mockMessages.map(msg => ({
  ...msg,
  conversationId: '1', // Assign to first conversation for demo
}));

const WhatsAppPanel = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>(enhancedConversations);
  const [messages, setMessages] = useState<WhatsAppMessage[]>(enhancedMessages);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);

  const conversationMessages = selectedConversation
    ? messages.filter(m => m.clientId === selectedConversation.clientId)
    : [];

  const handleSelectConversation = (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation);
    
    // Mark as read
    setConversations(prev =>
      prev.map(c =>
        c.id === conversation.id ? { ...c, unreadCount: 0 } : c
      )
    );
  };

  const handleToggleAI = async (enabled: boolean) => {
    if (!selectedConversation) return;

    await triggerWebhook(enabled ? 'ia_ativada' : 'ia_desativada', {
      conversationId: selectedConversation.id,
      clientId: selectedConversation.clientId,
      clientWhatsapp: selectedConversation.clientWhatsapp,
      enabled,
      timestamp: new Date().toISOString(),
    });

    const newStatus: ConversationStatus = enabled ? 'ia_ativa' : 'humano_ativo';

    setConversations(prev =>
      prev.map(c =>
        c.id === selectedConversation.id
          ? { ...c, aiEnabled: enabled, status: newStatus }
          : c
      )
    );
    setSelectedConversation({ ...selectedConversation, aiEnabled: enabled, status: newStatus });

    toast({
      title: enabled ? "🤖 IA Ativada" : "👤 IA Desativada",
      description: `Webhook disparado para o n8n. IA ${enabled ? 'ativada' : 'desativada'} para esta conversa.`,
    });
  };

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
          ? { ...c, status: 'humano_ativo' as ConversationStatus, aiEnabled: false }
          : c
      )
    );
    setSelectedConversation({ ...selectedConversation, status: 'humano_ativo', aiEnabled: false });

    toast({
      title: "👤 Humano Assumiu Conversa",
      description: "Webhook disparado para o n8n. A IA está pausada para este cliente.",
    });
  };

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
          ? { ...c, status: 'ia_ativa' as ConversationStatus, aiEnabled: true }
          : c
      )
    );
    setSelectedConversation({ ...selectedConversation, status: 'ia_ativa', aiEnabled: true });

    toast({
      title: "▶️ IA Retomada",
      description: "Webhook disparado para o n8n. A IA voltará a responder este cliente.",
    });
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !content.trim()) return;

    const newMessage: WhatsAppMessage = {
      id: `msg-${Date.now()}`,
      clientId: selectedConversation.clientId,
      conversationId: selectedConversation.id,
      direction: 'outgoing',
      content,
      source: 'humano',
      timestamp: new Date(),
    };

    // Add message to local state
    setMessages(prev => [...prev, newMessage]);

    // Update conversation last message
    setConversations(prev =>
      prev.map(c =>
        c.id === selectedConversation.id
          ? { ...c, lastMessage: content, lastMessageAt: new Date() }
          : c
      )
    );

    // Trigger webhook
    await triggerWebhook('mensagem_enviada', {
      conversationId: selectedConversation.id,
      clientId: selectedConversation.clientId,
      clientWhatsapp: selectedConversation.clientWhatsapp,
      message: content,
      source: 'humano',
      timestamp: new Date().toISOString(),
    });
  };

  const handleEditClient = () => {
    toast({
      title: "📝 Editar Cliente",
      description: "Redirecione para a página de clientes ou abra um modal de edição.",
    });
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <MessageSquare className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          Central de Atendimento
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitoramento em tempo real • Orquestrador de webhooks n8n
        </p>
      </motion.div>

      {/* Architecture Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <Card className="border-0 shadow-soft bg-primary/5 border-l-4 border-l-primary">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Activity className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>Arquitetura:</strong> Mensagens são enviadas via <strong>n8n + Z-API</strong>. 
                A IA pode consultar estoque (nome, preço, quantidade) mas <strong>não pode alterar</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 3-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Column 1 - Conversation List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-3 h-full"
        >
          <Card className="border-0 shadow-soft h-full">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id || null}
              onSelect={handleSelectConversation}
            />
          </Card>
        </motion.div>

        {/* Column 2 - Chat Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-6 h-full min-h-[400px] lg:min-h-0"
        >
          <ChatPanel
            conversation={selectedConversation}
            messages={conversationMessages}
            onToggleAI={handleToggleAI}
            onAssumeConversation={handleAssumeConversation}
            onResumeAI={handleResumeAI}
            onPauseAI={handlePauseAI}
            onSendMessage={handleSendMessage}
          />
        </motion.div>

        {/* Column 3 - Context Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-3 h-full"
        >
          <Card className="border-0 shadow-soft h-full">
            <ContextPanel
              conversation={selectedConversation}
              onEditClient={handleEditClient}
            />
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default WhatsAppPanel;
