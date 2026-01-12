import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, User, Pause, Play, UserCheck, Send, Circle, MessageSquare, 
  ToggleLeft, ToggleRight, FileText, DollarSign, Sparkles, Clock,
  Phone, MoreVertical, Smile
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  onCreateService?: () => void;
  onCreateQuote?: () => void;
}

const statusConfig: Record<ConversationStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  novo: { label: 'Novo', color: 'text-red-600', bgColor: 'bg-red-100', icon: <Sparkles className="w-3 h-3" /> },
  em_atendimento: { label: 'Atendendo', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: <User className="w-3 h-3" /> },
  finalizado: { label: 'Finalizado', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: <Circle className="w-3 h-3" /> },
  ia_ativa: { label: 'IA Ativa', color: 'text-green-600', bgColor: 'bg-green-100', icon: <Bot className="w-3 h-3" /> },
  humano_ativo: { label: 'Humano', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <User className="w-3 h-3" /> },
  pausada: { label: 'Pausada', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: <Pause className="w-3 h-3" /> },
};

const ChatPanel = ({ 
  conversation, 
  messages, 
  onToggleAI, 
  onAssumeConversation, 
  onResumeAI,
  onPauseAI,
  onSendMessage,
  onCreateService,
  onCreateQuote
}: ChatPanelProps) => {
  const { toast } = useToast();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    
    onSendMessage(inputMessage);
    setInputMessage('');
    
    toast({
      title: "📤 Mensagem enviada",
      description: "Webhook disparado para n8n",
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
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border-2 border-dashed border-muted">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <MessageSquare className="w-20 h-20 mx-auto mb-4 text-primary/30" />
          </motion.div>
          <p className="text-lg font-display font-semibold text-foreground/70">Selecione uma conversa</p>
          <p className="text-sm text-muted-foreground mt-1">Escolha na lista à esquerda para começar</p>
        </motion.div>
      </div>
    );
  }

  const status = statusConfig[conversation.status] || statusConfig['novo'];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-background rounded-xl border shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 border-b bg-gradient-to-r from-background to-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-11 h-11 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-primary-foreground font-bold shadow-md">
                {conversation.clientName.charAt(0)}
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
            </motion.div>
            <div>
              <p className="font-semibold">{conversation.clientName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                {conversation.clientWhatsapp}
              </p>
            </div>
            <Badge className={cn("ml-2", status.bgColor, status.color, "border-0")}>
              {status.icon}
              <span className="ml-1">{status.label}</span>
            </Badge>
          </div>
          
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>

        {/* Action Bar */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-3 pt-3 border-t overflow-x-auto pb-1"
        >
          <TooltipProvider>
            {/* AI Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={conversation.aiEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToggleAI(!conversation.aiEnabled)}
                  className={cn(
                    "h-8 transition-all",
                    conversation.aiEnabled 
                      ? "bg-green-500 hover:bg-green-600 text-white shadow-md" 
                      : "border-muted-foreground/30"
                  )}
                >
                  {conversation.aiEnabled ? (
                    <>
                      <ToggleRight className="w-4 h-4 mr-1" />
                      IA Ativa
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 mr-1" />
                      IA Off
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ativar/Desativar IA para esta conversa</TooltipContent>
            </Tooltip>

            {/* Assume */}
            {conversation.status !== 'humano_ativo' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={onAssumeConversation}
                    className="h-8 bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Assumir
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Assumir atendimento humano</TooltipContent>
              </Tooltip>
            )}

            {/* Pause/Resume */}
            {conversation.status === 'ia_ativa' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onPauseAI}
                    className="h-8 border-amber-400 text-amber-600 hover:bg-amber-50"
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Pausar IA
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pausar respostas da IA</TooltipContent>
              </Tooltip>
            )}
            
            {(conversation.status === 'pausada' || conversation.status === 'humano_ativo') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onResumeAI}
                    className="h-8 border-green-400 text-green-600 hover:bg-green-50"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Retomar IA
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Devolver para IA</TooltipContent>
              </Tooltip>
            )}

            <div className="w-px h-6 bg-border mx-1" />

            {/* Service actions */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onCreateService}
                  className="h-8"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Atendimento
                </Button>
              </TooltipTrigger>
              <TooltipContent>Criar novo atendimento</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onCreateQuote}
                  className="h-8"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Orçamento
                </Button>
              </TooltipTrigger>
              <TooltipContent>Criar orçamento</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>
      </div>

      {/* Messages - WhatsApp style background */}
      <ScrollArea className="flex-1 bg-[#e5ddd5] dark:bg-[#0b141a]">
        <div 
          className="p-4 min-h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        >
          <div className="space-y-2 max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg p-6 inline-block shadow-sm">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
                </div>
              </motion.div>
            ) : (
              <AnimatePresence>
                {messages.map((msg, index) => {
                  const isOutgoing = msg.direction === 'outgoing';
                  const isAI = msg.source === 'ia';
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "flex",
                        isOutgoing ? "justify-end" : "justify-start"
                      )}
                    >
                      <motion.div 
                        whileHover={{ scale: 1.01 }}
                        className={cn(
                          "max-w-[70%] px-3 py-2 rounded-lg shadow-sm relative",
                          isOutgoing
                            ? isAI 
                              ? "bg-gradient-to-r from-green-500 to-green-600 text-white rounded-br-none"
                              : "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-br-none"
                            : "bg-white dark:bg-gray-800 rounded-bl-none"
                        )}
                      >
                        {/* Source indicator for outgoing */}
                        {isOutgoing && (
                          <div className={cn(
                            "flex items-center gap-1 text-xs mb-1",
                            isOutgoing ? "text-white/80" : "text-muted-foreground"
                          )}>
                            {isAI ? (
                              <>
                                <Bot className="w-3 h-3" />
                                <span className="font-medium">IA</span>
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3" />
                                <span className="font-medium">Atendente</span>
                              </>
                            )}
                          </div>
                        )}
                        
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        
                        {/* Timestamp */}
                        <div className={cn(
                          "flex items-center justify-end gap-1 mt-1 text-[10px]",
                          isOutgoing ? "text-white/70" : "text-muted-foreground"
                        )}>
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>

                        {/* Message tail */}
                        <div 
                          className={cn(
                            "absolute bottom-0 w-3 h-3",
                            isOutgoing 
                              ? cn(
                                  "-right-1.5",
                                  isAI ? "text-green-600" : "text-primary"
                                )
                              : "-left-1.5 text-white dark:text-gray-800"
                          )}
                          style={{
                            clipPath: isOutgoing 
                              ? "polygon(0 0, 100% 100%, 0 100%)" 
                              : "polygon(100% 0, 100% 100%, 0 100%)",
                            backgroundColor: isOutgoing 
                              ? (isAI ? 'rgb(22 163 74)' : 'hsl(var(--primary))') 
                              : 'white'
                          }}
                        />
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Input Area - Fixed at bottom like WhatsApp */}
      <div className="p-3 border-t bg-muted/30 backdrop-blur-sm">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
            <Smile className="w-5 h-5 text-muted-foreground" />
          </Button>
          
          <Input
            placeholder="Digite sua mensagem..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-background border-0 shadow-sm rounded-full px-4"
          />
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={handleSend} 
              disabled={!inputMessage.trim()}
              size="icon"
              className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90 shadow-md"
            >
              <Send className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Mensagens via webhook → n8n + Z-API
        </p>
      </div>
    </motion.div>
  );
};

export default ChatPanel;
