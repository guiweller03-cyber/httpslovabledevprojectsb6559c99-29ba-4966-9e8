import { motion } from 'framer-motion';
import { TrendingUp, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RevenueCardsProps {
  forecastRevenue: number;
  completedRevenue: number;
  filterLabel: string;
}

export function RevenueCards({ forecastRevenue, completedRevenue, filterLabel }: RevenueCardsProps) {
  const currentMonth = format(new Date(), 'MMMM', { locale: ptBR });
  const capitalizedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
  const totalRevenue = forecastRevenue + completedRevenue;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Forecast Revenue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-amber-500/20">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Faturamento Futuro</p>
            <p className="text-xs text-amber-600/70">{filterLabel} • {capitalizedMonth}</p>
          </div>
        </div>
        <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">
          R$ {formatCurrency(forecastRevenue)}
        </p>
        <p className="text-xs text-amber-600/70 mt-1">Agendados + Em atendimento</p>
      </motion.div>

      {/* Completed Revenue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-emerald-500/20">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Faturamento Realizado</p>
            <p className="text-xs text-emerald-600/70">{filterLabel} • {capitalizedMonth}</p>
          </div>
        </div>
        <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
          R$ {formatCurrency(completedRevenue)}
        </p>
        <p className="text-xs text-emerald-600/70 mt-1">Serviços finalizados</p>
      </motion.div>

      {/* Total Revenue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-primary/20">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-primary font-medium">Total do Mês</p>
            <p className="text-xs text-primary/70">{filterLabel} • {capitalizedMonth}</p>
          </div>
        </div>
        <p className="text-3xl font-bold text-primary">
          R$ {formatCurrency(totalRevenue)}
        </p>
        <p className="text-xs text-primary/70 mt-1">Previsto + Realizado</p>
      </motion.div>
    </div>
  );
}
