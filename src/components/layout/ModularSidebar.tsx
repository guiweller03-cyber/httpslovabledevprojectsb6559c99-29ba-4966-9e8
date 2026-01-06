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
  ClipboardList,
  Car,
  Stethoscope,
  Package,
  ShoppingCart,
  Wallet,
  BarChart3,
  TrendingUp,
  Megaphone,
  Lock,
  LogOut
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModules, PlanType } from '@/contexts/ModulesContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NavItem {
  title: string;
  url: string;
  icon: any;
  module?: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Banho & Tosa', url: '/banho-tosa', icon: Scissors, module: 'mod_petshop' },
  { title: 'Serviços do Dia', url: '/servicos-do-dia', icon: ClipboardList, module: 'mod_petshop' },
  { title: 'Hotel & Creche', url: '/hotel-creche', icon: Home, module: 'mod_hotel' },
  { title: 'Rota do Dia', url: '/rota-do-dia', icon: Car, module: 'mod_petshop' },
  { title: 'Clínica Veterinária', url: '/clinica', icon: Stethoscope, module: 'mod_clinica' },
  { title: 'Produtos', url: '/produtos', icon: Package, module: 'mod_produtos' },
  { title: 'PDV', url: '/pdv', icon: ShoppingCart, module: 'mod_pdv' },
  { title: 'Caixa', url: '/caixa-operacoes', icon: Wallet, module: 'mod_caixa' },
  { title: 'Comissões', url: '/comissoes', icon: TrendingUp, module: 'mod_comissao' },
  { title: 'Financeiro', url: '/financeiro', icon: BarChart3, module: 'mod_financeiro_avancado' },
  { title: 'Planos de Banho', url: '/planos', icon: CreditCard, module: 'mod_petshop' },
  { title: 'Clientes & Pets', url: '/clientes', icon: Users, module: 'mod_petshop' },
  { title: 'Lembretes', url: '/lembretes', icon: Bell, module: 'mod_petshop' },
  { title: 'Inativos', url: '/inativos', icon: UserX, module: 'mod_petshop' },
  { title: 'Frente de Caixa', url: '/caixa', icon: DollarSign, module: 'mod_pdv' },
  { title: 'Marketing', url: '/marketing', icon: Megaphone, module: 'mod_marketing' },
  { title: 'WhatsApp', url: '/whatsapp', icon: MessageSquare, badge: 3 },
  { title: 'Importar Dados', url: '/importar', icon: Upload },
  { title: 'Tabela de Valores', url: '/tabela-valores', icon: Settings },
];

const planLabels: Record<PlanType, string> = {
  basic: 'Pet Shop Simples',
  hotel: 'Pet Shop + Hotel',
  premium: 'Premium Completo',
};

export function ModularSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [blockedModule, setBlockedModule] = useState<NavItem | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { hasModule, config } = useModules();
  const { profile, signOut, isAdmin } = useAuth();

  const handleNavClick = (item: NavItem, e: React.MouseEvent) => {
    if (item.module && !hasModule(item.module as any)) {
      e.preventDefault();
      setBlockedModule(item);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    toast.success('Você saiu do sistema');
  };

  const getRequiredPlan = (module: string): string => {
    if (module === 'mod_clinica') return 'Premium Completo';
    if (module === 'mod_hotel') return 'Pet Shop + Hotel';
    return 'Pet Shop Simples';
  };

  const filteredItems = navItems.filter(item => {
    // Always show items without module requirement
    if (!item.module) return true;
    // Show if module is enabled
    if (hasModule(item.module as any)) return true;
    // Show locked items to admins
    if (isAdmin) return true;
    return false;
  });

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
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
                <div className="flex flex-col">
                  <span className="font-display font-bold text-lg text-sidebar-foreground">
                    {config?.business_name || 'PetSaaS'}
                  </span>
                  <span className="text-xs text-sidebar-foreground/60">
                    {config?.plan_type && planLabels[config.plan_type]}
                  </span>
                </div>
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
            {filteredItems.map((item) => {
              const isActive = location.pathname === item.url;
              const Icon = item.icon;
              const isLocked = item.module && !hasModule(item.module as any);
              
              return (
                <li key={item.url}>
                  <NavLink
                    to={isLocked ? '#' : item.url}
                    onClick={(e) => handleNavClick(item, e)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      "hover:bg-sidebar-accent",
                      isActive && !isLocked
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow" 
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                      isLocked && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isLocked ? (
                      <Lock className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <Icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        isActive && "animate-pulse-soft"
                      )} />
                    )}
                    <AnimatePresence mode="wait">
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="font-medium text-sm whitespace-nowrap overflow-hidden flex-1"
                        >
                          {item.title}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {item.badge && !collapsed && (
                      <span className="ml-auto bg-secondary text-secondary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {isLocked && !collapsed && (
                      <span className="ml-auto text-xs text-sidebar-foreground/50">
                        Bloqueado
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info & Collapse Toggle */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          {!collapsed && profile && (
            <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile.full_name || profile.email}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {profile.email}
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="flex-1 justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && <span className="ml-2">Sair</span>}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* Blocked Module Dialog */}
      <Dialog open={!!blockedModule} onOpenChange={() => setBlockedModule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-warning" />
              Módulo Bloqueado
            </DialogTitle>
            <DialogDescription className="pt-4 space-y-4">
              <p>
                O módulo <strong>{blockedModule?.title}</strong> não está disponível no seu plano atual.
              </p>
              <p>
                Este recurso está disponível no plano{' '}
                <strong>{blockedModule?.module && getRequiredPlan(blockedModule.module)}</strong>.
              </p>
              <p className="text-muted-foreground">
                Deseja conhecer nossos planos e fazer upgrade?
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setBlockedModule(null)} className="flex-1">
              Fechar
            </Button>
            <Button 
              onClick={() => {
                setBlockedModule(null);
                navigate('/configuracoes/planos');
              }}
              className="flex-1"
            >
              Ver Planos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
