import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Pause, Play, UserCheck, Send, Circle, ExternalLink, ToggleLeft, ToggleRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WhatsAppConversation, WhatsAppMessage, ConversationStatus } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ChatPanelProps {
  conversation: WhatsAppConversation | null;
  messages: WhatsAppMessage[];
  onToggleAI: (enabled: boolean) => void;
  onAssumeConversation: () => void;
  onResumeAI: () => void;
  onPauseAI: () => void;
  onSendMessage: (message: string) => void;
}

const statusConfig: Record<ConversationStatus, { label: string; color: string; bgColor: string }> = {
  novo: { label: 'Novo', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  em_atendimento: { label: 'Em Atendimento', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  finalizado: { label: 'Finalizado', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  ia_ativa: { label: 'IA Ativa', color: 'text-primary', bgColor: 'bg-primary/10' },
  humano_ativo: { label: 'Humano', color: 'text-secondary', bgColor: 'bg-secondary/10' },
  pausada: { label: 'Pausada', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

const ChatPanel = ({ 
  conversation, 
  messages, 
  onToggleAI, 
  onAssumeConversation, 
  onResumeAI,
  onPauseAI,
  onSendMessage 
}: ChatPanelProps) => {
  const { toast } = useToast();
  const [inputMessage, setInputMessage] = useState('');

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    
    onSendMessage(inputMessage);
    setInputMessage('');
    
    toast({
      title: "📤 Mensagem enviada",
      description: "Webhook disparado para o n8n",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-xl">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Selecione uma conversa</p>
          <p className="text-sm">Escolha uma conversa na lista para começar</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[conversation.status] || statusConfig['novo'];

  return (
    <div className="flex flex-col h-full bg-background rounded-xl border shadow-soft">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
              {conversation.clientName.charAt(0)}
            </div>
            <div>
              <p className="font-semibold">{conversation.clientName}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                {conversation.clientWhatsapp}
              </p>
            </div>
            <Badge className={cn("ml-2", status.bgColor, status.color)}>
              {conversation.status === 'ia_ativa' && <Bot className="w-3 h-3 mr-1" />}
              {conversation.status === 'humano_ativo' && <User className="w-3 h-3 mr-1" />}
              {conversation.status === 'pausada' && <Pause className="w-3 h-3 mr-1" />}
              {status.label}
            </Badge>
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            {/* AI Toggle */}
            <Button
              variant={conversation.aiEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleAI(!conversation.aiEnabled)}
              className={cn(
                conversation.aiEnabled 
                  ? "bg-primary hover:bg-primary/90" 
                  : "border-muted-foreground/30"
              )}
            >
              {conversation.aiEnabled ? (
                <>
                  <ToggleRight className="w-4 h-4 mr-1" />
                  IA Ativada
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 mr-1" />
                  IA Desativada
                </>
              )}
            </Button>

            {conversation.status === 'ia_ativa' && (
              <Button variant="outline" size="sm" onClick={onPauseAI}>
                <Pause className="w-4 h-4 mr-1" />
                Pausar
              </Button>
            )}
            
            {conversation.status === 'pausada' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResumeAI}
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <Play className="w-4 h-4 mr-1" />
                Retomar IA
              </Button>
            )}
            
            {conversation.status !== 'humano_ativo' && (
              <Button
                size="sm"
                onClick={onAssumeConversation}
                className="bg-gradient-to-r from-secondary to-secondary/80"
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Assumir
              </Button>
            )}
            
            {conversation.status === 'humano_ativo' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResumeAI}
                className="border-primary text-primary hover:bg-primary/10"
              >
                <Bot className="w-4 h-4 mr-1" />
                Devolver para IA
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Nenhuma mensagem ainda</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "flex",
                  msg.direction === 'outgoing' ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[75%] p-3 rounded-2xl shadow-sm",
                  msg.direction === 'outgoing'
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                )}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <div className={cn(
                    "flex items-center gap-1.5 mt-2 text-xs",
                    msg.direction === 'outgoing' ? "text-white/70" : "text-muted-foreground"
                  )}>
                    {/* Source indicator */}
                    {msg.direction === 'outgoing' && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs border-0 px-1.5 py-0",
                          msg.direction === 'outgoing' 
                            ? "bg-white/20 text-white" 
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {msg.source === 'ia' ? (
                          <>
                            <Bot className="w-3 h-3 mr-0.5" />
                            IA
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 mr-0.5" />
                            Atendente
                          </>
                        )}
                      </Badge>
                    )}
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!inputMessage.trim()}>
            <Send className="w-4 h-4 mr-1" />
            Enviar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Mensagens enviadas via webhook para n8n + Z-API
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;
