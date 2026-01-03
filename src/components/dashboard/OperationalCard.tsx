import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface OperationalCardProps {
  title: string;
  icon: LucideIcon;
  items: Array<{
    label: string;
    value: number | string;
    icon?: string;
    highlight?: boolean;
  }>;
  variant?: 'default' | 'primary' | 'secondary' | 'success';
}

const variantStyles = {
  default: 'bg-card border border-border',
  primary: 'bg-gradient-primary text-white',
  secondary: 'bg-gradient-secondary text-white',
  success: 'bg-gradient-success text-white',
};

export function OperationalCard({ title, icon: Icon, items, variant = 'default' }: OperationalCardProps) {
  const isWhiteText = variant !== 'default';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "p-6 rounded-2xl shadow-soft",
        variantStyles[variant]
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "p-2 rounded-lg",
          isWhiteText ? "bg-white/20" : "bg-primary/10"
        )}>
          <Icon className={cn("w-5 h-5", isWhiteText ? "text-white" : "text-primary")} />
        </div>
        <h3 className={cn(
          "font-semibold text-lg",
          isWhiteText ? "text-white" : "text-foreground"
        )}>
          {title}
        </h3>
      </div>
      
      <div className="space-y-3">
        {items.map((item, index) => (
          <div 
            key={index}
            className={cn(
              "flex items-center justify-between py-2 px-3 rounded-lg",
              isWhiteText ? "bg-white/10" : "bg-muted/50",
              item.highlight && !isWhiteText && "bg-primary/10"
            )}
          >
            <span className={cn(
              "flex items-center gap-2 text-sm",
              isWhiteText ? "text-white/90" : "text-muted-foreground"
            )}>
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </span>
            <span className={cn(
              "font-bold text-lg",
              isWhiteText ? "text-white" : "text-foreground",
              item.highlight && !isWhiteText && "text-primary"
            )}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
