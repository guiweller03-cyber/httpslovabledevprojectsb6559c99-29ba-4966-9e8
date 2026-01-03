import { Calendar, Clock, CheckCircle, PlayCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  clientName: string;
  petName: string;
  service: string;
  status: string;
  price: number;
  scheduledAt: string;
}

interface TodayScheduleProps {
  appointments: Appointment[];
}

const statusConfig: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  agendado: { icon: Clock, label: 'Agendado', color: 'text-blue-500 bg-blue-50' },
  em_atendimento: { icon: PlayCircle, label: 'Em Atendimento', color: 'text-amber-500 bg-amber-50' },
  finalizado: { icon: CheckCircle, label: 'Finalizado', color: 'text-green-500 bg-green-50' },
  pronto: { icon: CheckCircle, label: 'Pronto', color: 'text-green-500 bg-green-50' },
  cancelado: { icon: AlertCircle, label: 'Cancelado', color: 'text-red-500 bg-red-50' },
};

export function TodaySchedule({ appointments }: TodayScheduleProps) {
  if (appointments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 rounded-2xl shadow-soft bg-card border border-border"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Agenda de Hoje</h3>
        </div>
        <p className="text-muted-foreground text-center py-8">
          Nenhum agendamento para hoje
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 rounded-2xl shadow-soft bg-card border border-border"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Agenda de Hoje</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {appointments.map((apt, index) => {
          const status = statusConfig[apt.status] || statusConfig.agendado;
          const StatusIcon = status.icon;
          const time = format(new Date(apt.scheduledAt), 'HH:mm', { locale: ptBR });
          
          return (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-center min-w-[50px]">
                  <p className="text-lg font-bold text-foreground">{time}</p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div>
                  <p className="font-medium text-foreground">{apt.petName}</p>
                  <p className="text-sm text-muted-foreground">{apt.clientName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{apt.service}</p>
                  <p className="font-semibold text-foreground">
                    R$ {apt.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={cn(
                  "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium",
                  status.color
                )}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
