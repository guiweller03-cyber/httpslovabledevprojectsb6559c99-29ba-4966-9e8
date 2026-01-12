import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Bot, User, Pause, Filter, MessageSquarePlus, CheckCircle2, 
  UserCheck, PauseCircle, XCircle, Circle, Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WhatsAppConversation, ConversationStatus } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationListProps {
  conversations: WhatsAppConversation[];
  selectedId: string | null;
  onSelect: (conversation: WhatsAppConversation) => void;
  onAssumeConversation?: (conv: WhatsAppConversation) => void;
  onPauseAI?: (conv: WhatsAppConversation) => void;
  onFinishConversation?: (conv: WhatsAppConversation) => void;
}

const statusConfig: Record<ConversationStatus, { 
  label: string; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  icon: React.ReactNode;
  pulse?: boolean;
}> = {
  novo: { 
    label: 'Novo', 
    color: 'text-red-600', 
    bgColor: 'bg-red-500', 
    borderColor: 'border-red-400',
    icon: <Sparkles className="w-3 h-3" />,
    pulse: true
  },
  em_atendimento: { 
    label: 'Atendendo', 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-500', 
    borderColor: 'border-amber-400',
    icon: <User className="w-3 h-3" /> 
  },
  finalizado: { 
    label: 'Finalizado', 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-500', 
    borderColor: 'border-emerald-400',
    icon: <CheckCircle2 className="w-3 h-3" /> 
  },
  ia_ativa: { 
    label: 'IA', 
    color: 'text-green-600', 
    bgColor: 'bg-green-500', 
    borderColor: 'border-green-400',
    icon: <Bot className="w-3 h-3" />,
    pulse: true
  },
  humano_ativo: { 
    label: 'Humano', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-500', 
    borderColor: 'border-blue-400',
    icon: <User className="w-3 h-3" /> 
  },
  pausada: { 
    label: 'Pausada', 
    color: 'text-gray-500', 
    bgColor: 'bg-gray-400', 
    borderColor: 'border-gray-300',
    icon: <Pause className="w-3 h-3" /> 
  },
};

const ConversationList = ({ 
  conversations, 
  selectedId, 
  onSelect,
  onAssumeConversation,
  onPauseAI,
  onFinishConversation
}: ConversationListProps) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      conv.clientName.toLowerCase().includes(search.toLowerCase()) ||
      conv.clientWhatsapp.includes(search);
    
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Count conversations by status
  const statusCounts = conversations.reduce((acc, conv) => {
    acc[conv.status] = (acc[conv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const newCount = statusCounts['novo'] || 0;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="p-4 border-b bg-background/80 backdrop-blur-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-lg">Conversas</h2>
            {newCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="relative"
              >
                <Badge className="bg-red-500 text-white border-0 animate-pulse">
                  {newCount} novo{newCount > 1 ? 's' : ''}
                </Badge>
              </motion.div>
            )}
          </div>
          <Badge variant="secondary" className="font-mono">
            {filteredConversations.length}
          </Badge>
        </div>
        
        {/* Search with animation */}
        <motion.div 
          className="relative"
          whileFocus={{ scale: 1.01 }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-0 focus:bg-background transition-colors"
          />
        </motion.div>
        
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full bg-muted/50 border-0">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📋 Todos ({conversations.length})</SelectItem>
            <SelectItem value="novo">🔴 Novos ({statusCounts['novo'] || 0})</SelectItem>
            <SelectItem value="ia_ativa">🟢 IA Ativa ({statusCounts['ia_ativa'] || 0})</SelectItem>
            <SelectItem value="humano_ativo">🔵 Humano ({statusCounts['humano_ativo'] || 0})</SelectItem>
            <SelectItem value="pausada">⏸️ Pausadas ({statusCounts['pausada'] || 0})</SelectItem>
            <SelectItem value="finalizado">✅ Finalizados ({statusCounts['finalizado'] || 0})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          <AnimatePresence>
            {filteredConversations.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                <MessageSquarePlus className="w-16 h-16 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">Nenhuma conversa</p>
                <p className="text-xs">Aguardando mensagens...</p>
              </motion.div>
            ) : (
              filteredConversations.map((conv, index) => {
                const status = statusConfig[conv.status] || statusConfig['novo'];
                const isSelected = selectedId === conv.id;
                const isHovered = hoveredId === conv.id;

                return (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.03 }}
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="relative"
                  >
                    <motion.button
                      onClick={() => onSelect(conv)}
                      whileHover={{ scale: 1.01, x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "w-full p-3 rounded-xl text-left transition-all relative overflow-hidden",
                        "border-2 border-transparent",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-lg border-primary"
                          : "bg-card hover:bg-muted/80 hover:shadow-md"
                      )}
                    >
                      {/* Status indicator line */}
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all",
                        status.bgColor,
                        status.pulse && !isSelected && "animate-pulse"
                      )} />

                      <div className="flex items-start gap-3 pl-2">
                        {/* Avatar with status */}
                        <div className="relative flex-shrink-0">
                          <motion.div 
                            className={cn(
                              "w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-sm",
                              isSelected 
                                ? "bg-white/20 text-white" 
                                : "bg-gradient-to-br from-primary/20 to-primary/10 text-primary"
                            )}
                            whileHover={{ rotate: [0, -5, 5, 0] }}
                          >
                            {conv.clientName.charAt(0).toUpperCase()}
                          </motion.div>
                          
                          {/* Unread badge */}
                          {conv.unreadCount > 0 && (
                            <motion.span 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md"
                            >
                              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                            </motion.span>
                          )}
                          
                          {/* AI/Status indicator */}
                          <motion.span 
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border-2",
                              isSelected ? "border-primary bg-white/90" : "border-background",
                              status.bgColor
                            )}
                            animate={status.pulse ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                          >
                            <span className="text-white">{status.icon}</span>
                          </motion.span>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="font-semibold truncate text-sm">
                              {conv.clientName}
                            </p>
                            <span className={cn(
                              "text-xs flex-shrink-0 font-medium",
                              isSelected ? "text-white/80" : "text-muted-foreground"
                            )}>
                              {formatDistanceToNow(conv.lastMessageAt, { locale: ptBR, addSuffix: false })}
                            </span>
                          </div>
                          
                          <p className={cn(
                            "text-xs mb-1.5 font-mono",
                            isSelected ? "text-white/70" : "text-muted-foreground"
                          )}>
                            {conv.clientWhatsapp}
                          </p>
                          
                          <p className={cn(
                            "text-sm truncate",
                            isSelected ? "text-white/90" : "text-foreground/80"
                          )}>
                            {conv.lastMessage}
                          </p>
                          
                          {/* Badges row */}
                          <div className="flex items-center gap-1.5 mt-2">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs border-0 px-2 py-0.5 font-medium",
                                isSelected 
                                  ? "bg-white/20 text-white" 
                                  : cn(status.bgColor, "text-white")
                              )}
                            >
                              {status.icon}
                              <span className="ml-1">{status.label}</span>
                            </Badge>
                            
                            {!conv.registrationComplete && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs border-0 px-2 py-0.5",
                                  isSelected 
                                    ? "bg-orange-400/40 text-white" 
                                    : "bg-orange-500 text-white"
                                )}
                              >
                                ⚠️ Incompleto
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick actions on hover */}
                      <AnimatePresence>
                        {isHovered && !isSelected && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-2 right-2 flex gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {conv.status !== 'humano_ativo' && onAssumeConversation && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 px-2 text-xs bg-blue-500 text-white hover:bg-blue-600 shadow-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAssumeConversation(conv);
                                }}
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                Assumir
                              </Button>
                            )}
                            {conv.status === 'ia_ativa' && onPauseAI && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 px-2 text-xs bg-amber-500 text-white hover:bg-amber-600 shadow-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPauseAI(conv);
                                }}
                              >
                                <PauseCircle className="w-3 h-3 mr-1" />
                                Pausar
                              </Button>
                            )}
                            {onFinishConversation && conv.status !== 'finalizado' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 px-2 text-xs bg-gray-500 text-white hover:bg-gray-600 shadow-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onFinishConversation(conv);
                                }}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
