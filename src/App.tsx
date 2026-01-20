import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import BanhoTosa from "./pages/BanhoTosa";
import HotelCreche from "./pages/HotelCreche";
import Planos from "./pages/Planos";
import Clientes from "./pages/Clientes";
import Lembretes from "./pages/Lembretes";
import Inativos from "./pages/Inativos";
import FrenteCaixa from "./pages/FrenteCaixa";
import WhatsAppPanel from "./pages/WhatsAppPanel";
import Importar from "./pages/Importar";
import TabelaValores from "./pages/TabelaValores";
import ServicosDoDia from "./pages/ServicosDoDia";
import RotaDoDia from "./pages/RotaDoDia";
import Faturamento from "./pages/Faturamento";
import Estoque from "./pages/Estoque";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminData from "./pages/admin/AdminData";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminActions from "./pages/admin/AdminActions";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Auth Route */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout><AdminDashboard /></AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/usuarios" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout><AdminUsers /></AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/dados" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout><AdminData /></AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/config" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout><AdminConfig /></AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/acoes" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout><AdminActions /></AdminLayout>
                </ProtectedRoute>
              } />
              
              {/* Main App Routes */}
              <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
              <Route path="/banho-tosa" element={<MainLayout><BanhoTosa /></MainLayout>} />
              <Route path="/hotel-creche" element={<MainLayout><HotelCreche /></MainLayout>} />
              <Route path="/planos" element={<MainLayout><Planos /></MainLayout>} />
              <Route path="/clientes" element={<MainLayout><Clientes /></MainLayout>} />
              <Route path="/lembretes" element={<MainLayout><Lembretes /></MainLayout>} />
              <Route path="/inativos" element={<MainLayout><Inativos /></MainLayout>} />
              <Route path="/caixa" element={<MainLayout><FrenteCaixa /></MainLayout>} />
              <Route path="/whatsapp" element={<MainLayout><WhatsAppPanel /></MainLayout>} />
              <Route path="/importar" element={<MainLayout><Importar /></MainLayout>} />
              <Route path="/tabela-valores" element={<MainLayout><TabelaValores /></MainLayout>} />
              <Route path="/servicos-do-dia" element={<MainLayout><ServicosDoDia /></MainLayout>} />
              <Route path="/rota-do-dia" element={<MainLayout><RotaDoDia /></MainLayout>} />
              <Route path="/faturamento" element={<MainLayout><Faturamento /></MainLayout>} />
              <Route path="/estoque" element={<MainLayout><Estoque /></MainLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
