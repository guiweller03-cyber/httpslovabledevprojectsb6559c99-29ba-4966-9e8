import { motion } from 'framer-motion';
import { Calendar, CheckCircle, Clock, XCircle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyStatsCardProps {
  title: string;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  total: number;
}

export function MonthlyStatsCard({
  title,
  scheduled,
  inProgress,
  completed,
  cancelled,
  total,
}: MonthlyStatsCardProps) {
  const currentMonth = format(new Date(), 'MMMM', { locale: ptBR });
  const capitalizedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-card border border-border shadow-soft"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{capitalizedMonth}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground">serviços ativos</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
          <Calendar className="w-4 h-4 text-blue-600" />
          <div>
            <p className="text-xs text-blue-600/70">Agendados</p>
            <p className="text-lg font-bold text-blue-600">{scheduled}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
          <Clock className="w-4 h-4 text-amber-600" />
          <div>
            <p className="text-xs text-amber-600/70">Em Atendimento</p>
            <p className="text-lg font-bold text-amber-600">{inProgress}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <div>
            <p className="text-xs text-emerald-600/70">Finalizados</p>
            <p className="text-lg font-bold text-emerald-600">{completed}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-950/30">
          <XCircle className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500/70">Cancelados</p>
            <p className="text-lg font-bold text-gray-500">{cancelled}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
