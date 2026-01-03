import { 
  LayoutDashboard, 
  Scissors, 
  Home, 
  CreditCard, 
  Users, 
  UserX, 
  DollarSign, 
  MessageSquare,
  Upload,
  Dog,
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
  ClipboardList
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Banho & Tosa', url: '/banho-tosa', icon: Scissors },
  { title: 'Serviços do Dia', url: '/servicos-do-dia', icon: ClipboardList },
  { title: 'Hotelzinho', url: '/hotelzinho', icon: Home },
  { title: 'Planos', url: '/planos', icon: CreditCard },
  { title: 'Clientes & Pets', url: '/clientes', icon: Users },
  { title: 'Lembretes', url: '/lembretes', icon: Bell },
  { title: 'Inativos', url: '/inativos', icon: UserX },
  { title: 'Frente de Caixa', url: '/caixa', icon: DollarSign },
  { title: 'WhatsApp', url: '/whatsapp', icon: MessageSquare },
  { title: 'Importar Dados', url: '/importar', icon: Upload },
  { title: 'Tabela de Valores', url: '/tabela-valores', icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-sidebar h-screen flex flex-col border-r border-sidebar-border"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Dog className="w-6 h-6 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-sidebar-foreground">
                PetSaaS
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {collapsed && (
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto">
            <Dog className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.url;
            const Icon = item.icon;
            
            return (
              <li key={item.url}>
                <NavLink
                  to={item.url}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "hover:bg-sidebar-accent",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow" 
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive && "animate-pulse-soft"
                  )} />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-medium text-sm whitespace-nowrap overflow-hidden"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.url === '/whatsapp' && (
                    <span className={cn(
                      "ml-auto bg-secondary text-secondary-foreground text-xs font-bold px-2 py-0.5 rounded-full",
                      collapsed && "absolute top-0 right-0 -mt-1 -mr-1"
                    )}>
                      3
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span>Recolher</span>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
}
