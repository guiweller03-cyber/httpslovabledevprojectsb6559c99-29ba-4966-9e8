import { ReactNode, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  Settings, 
  Wrench,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminLayoutProps {
  children: ReactNode;
}

const adminNavItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Usuários', url: '/admin/usuarios', icon: Users },
  { title: 'Dados', url: '/admin/dados', icon: Database },
  { title: 'Configurações', url: '/admin/config', icon: Settings },
  { title: 'Ações de Fundador', url: '/admin/acoes', icon: Wrench },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F8FAFC]">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="bg-[#1F2933] h-screen flex flex-col border-r border-[#2D3A45] sticky top-0"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#2D3A45]">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-9 h-9 bg-[#3B82F6] rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-white text-sm">
                  Control Room
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {collapsed && (
            <div className="w-9 h-9 bg-[#3B82F6] rounded-lg flex items-center justify-center mx-auto">
              <Shield className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {adminNavItems.map((item) => {
              const isActive = location.pathname === item.url || 
                (item.url !== '/admin' && location.pathname.startsWith(item.url));
              const Icon = item.icon;
              
              return (
                <li key={item.url}>
                  <NavLink
                    to={item.url}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      "hover:bg-[#2D3A45]",
                      isActive 
                        ? "bg-[#3B82F6] text-white" 
                        : "text-[#94A3B8] hover:text-white"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
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
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[#2D3A45] space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={cn(
              "w-full text-[#94A3B8] hover:text-white hover:bg-[#2D3A45]",
              collapsed ? "justify-center" : "justify-start"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="ml-3">Sair</span>}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-[#94A3B8] hover:text-white hover:bg-[#2D3A45]"
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
