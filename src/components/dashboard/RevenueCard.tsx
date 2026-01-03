import { DollarSign, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface RevenueCardProps {
  completedRevenue: number;
  forecastRevenue: number;
  title?: string;
}

export function RevenueCard({ completedRevenue, forecastRevenue, title = "Resumo Financeiro" }: RevenueCardProps) {
  const totalRevenue = completedRevenue + forecastRevenue;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 rounded-2xl shadow-soft bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-white/20">
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-semibold text-lg text-white">{title}</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-200" />
            <span className="text-sm text-white/80">Realizado</span>
          </div>
          <p className="text-2xl font-bold text-white">
            R$ {completedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-200" />
            <span className="text-sm text-white/80">Previsto</span>
          </div>
          <p className="text-2xl font-bold text-white">
            R$ {forecastRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-white/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-white" />
            <span className="text-sm text-white/80">Total do Dia</span>
          </div>
          <p className="text-3xl font-bold text-white">
            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
