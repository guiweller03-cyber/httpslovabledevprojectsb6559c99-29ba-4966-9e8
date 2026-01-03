import { Scissors, Home, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ServiceFilter } from '@/hooks/useDashboardData';

interface DashboardFilterProps {
  filter: ServiceFilter;
  onChange: (filter: ServiceFilter) => void;
}

const filterOptions: { value: ServiceFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Todos', icon: LayoutGrid },
  { value: 'grooming', label: 'Banho & Tosa', icon: Scissors },
  { value: 'hotel', label: 'Hotelzinho', icon: Home },
];

export function DashboardFilter({ filter, onChange }: DashboardFilterProps) {
  return (
    <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/50 border border-border">
      {filterOptions.map((option) => {
        const Icon = option.icon;
        const isActive = filter === option.value;
        
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive 
                ? "text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeFilter"
                className="absolute inset-0 rounded-lg bg-primary"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <Icon className={cn("w-4 h-4 relative z-10", isActive && "text-primary-foreground")} />
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
