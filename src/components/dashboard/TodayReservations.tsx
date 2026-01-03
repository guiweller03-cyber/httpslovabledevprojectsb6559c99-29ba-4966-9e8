import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarCheck, Clock, CheckCircle2, Scissors, Home, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Reservation {
  id: string;
  type: 'grooming' | 'hotel';
  clientId: string;
  clientName: string;
  petId: string;
  petName: string;
  service: string;
  status: string;
  price: number;
  scheduledAt: string;
}

interface TodayReservationsProps {
  reservations: Reservation[];
  onUpdate: () => void;
}

const statusColors: Record<string, string> = {
  agendado: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  em_atendimento: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  finalizado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  reservado: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  hospedado: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  check_out_realizado: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const statusLabels: Record<string, string> = {
  agendado: 'Agendado',
  em_atendimento: 'Em Atendimento',
  finalizado: 'Finalizado',
  reservado: 'Reservado',
  hospedado: 'Hospedado',
  check_out_realizado: 'Check-out Realizado',
};

export function TodayReservations({ reservations, onUpdate }: TodayReservationsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const capitalizedToday = today.charAt(0).toUpperCase() + today.slice(1);

  const handlePetReady = async (reservation: Reservation) => {
    setLoadingId(reservation.id);
    
    try {
      if (reservation.type === 'grooming') {
        const { error } = await supabase
          .from('bath_grooming_appointments')
          .update({ status: 'finalizado' })
          .eq('id', reservation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hotel_stays')
          .update({ status: 'check_out_realizado' })
          .eq('id', reservation.id);

        if (error) throw error;
      }

      toast.success(`${reservation.petName} marcado como pronto!`, {
        description: 'Status atualizado com sucesso.',
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setLoadingId(null);
    }
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm');
  };

  const canMarkAsReady = (status: string) => {
    return ['agendado', 'em_atendimento', 'reservado', 'hospedado'].includes(status);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-card border border-border shadow-soft"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <CalendarCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Reservas de Hoje</h3>
            <p className="text-xs text-muted-foreground">{capitalizedToday}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          {reservations.length} {reservations.length === 1 ? 'reserva' : 'reservas'}
        </Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        {reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CalendarCheck className="w-12 h-12 mb-3 opacity-30" />
            <p>Nenhuma reserva para hoje</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map((res, index) => (
              <motion.div
                key={res.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  res.status === 'finalizado' || res.status === 'check_out_realizado'
                    ? "bg-muted/30 border-border opacity-60"
                    : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      res.type === 'grooming' ? "bg-blue-100 dark:bg-blue-950" : "bg-violet-100 dark:bg-violet-950"
                    )}>
                      {res.type === 'grooming' ? (
                        <Scissors className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Home className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-foreground">{res.petName}</p>
                        <Badge className={cn("text-xs", statusColors[res.status])}>
                          {statusLabels[res.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{res.clientName}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(res.scheduledAt)}
                        </span>
                        <span>{res.service}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="font-bold text-primary">
                      R$ {res.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    
                    {canMarkAsReady(res.status) && (
                      <Button
                        size="sm"
                        onClick={() => handlePetReady(res)}
                        disabled={loadingId === res.id}
                        className="gap-1.5"
                      >
                        {loadingId === res.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Pet Pronto
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>
    </motion.div>
  );
}
