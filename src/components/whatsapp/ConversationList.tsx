import { useState } from 'react';
import { Search, Bot, User, Pause, Circle, Filter, MessageSquarePlus, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
}

const statusConfig: Record<ConversationStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  novo: { label: 'Novo', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <MessageSquarePlus className="w-3 h-3" /> },
  em_atendimento: { label: 'Em Atendimento', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: <User className="w-3 h-3" /> },
  finalizado: { label: 'Finalizado', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: <CheckCircle2 className="w-3 h-3" /> },
  ia_ativa: { label: 'IA Ativa', color: 'text-primary', bgColor: 'bg-primary/10', icon: <Bot className="w-3 h-3" /> },
  humano_ativo: { label: 'Humano', color: 'text-secondary', bgColor: 'bg-secondary/10', icon: <User className="w-3 h-3" /> },
  pausada: { label: 'Pausada', color: 'text-muted-foreground', bgColor: 'bg-muted', icon: <Pause className="w-3 h-3" /> },
};

const ConversationList = ({ conversations, selectedId, onSelect }: ConversationListProps) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      conv.clientName.toLowerCase().includes(search.toLowerCase()) ||
      conv.clientWhatsapp.includes(search);
    
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Conversas</h2>
          <Badge variant="secondary">{filteredConversations.length}</Badge>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="novo">Novo</SelectItem>
            <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="ia_ativa">IA Ativa</SelectItem>
            <SelectItem value="humano_ativo">Humano Ativo</SelectItem>
            <SelectItem value="pausada">Pausada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquarePlus className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const status = statusConfig[conv.status] || statusConfig['novo'];
              const isSelected = selectedId === conv.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  className={cn(
                    "w-full p-3 rounded-xl text-left transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                        isSelected ? "bg-white/20" : "bg-primary/10 text-primary"
                      )}>
                        {conv.clientName.charAt(0).toUpperCase()}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                      {conv.aiEnabled && (
                        <span className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center",
                          isSelected ? "bg-white/30" : "bg-primary/20"
                        )}>
                          <Bot className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-semibold truncate text-sm">{conv.clientName}</p>
                        <span className={cn(
                          "text-xs flex-shrink-0",
                          isSelected ? "text-white/70" : "text-muted-foreground"
                        )}>
                          {formatDistanceToNow(conv.lastMessageAt, { locale: ptBR, addSuffix: true })}
                        </span>
                      </div>
                      
                      <p className={cn(
                        "text-xs mb-1",
                        isSelected ? "text-white/70" : "text-muted-foreground"
                      )}>
                        {conv.clientWhatsapp}
                      </p>
                      
                      <p className={cn(
                        "text-sm truncate mb-1.5",
                        isSelected ? "text-white/80" : "text-muted-foreground"
                      )}>
                        {conv.lastMessage}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs border-0 px-2 py-0.5",
                            isSelected ? "bg-white/20 text-white" : status.bgColor + " " + status.color
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
                              isSelected ? "bg-orange-400/30 text-white" : "bg-orange-100 text-orange-600"
                            )}
                          >
                            Incompleto
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
