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
import TenantSetup from "./pages/TenantSetup";
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
              {/* Auth Routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/setup" element={<TenantSetup />} />
              
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
              
              {/* Main App Routes - Protected */}
              <Route path="/" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
              <Route path="/banho-tosa" element={<ProtectedRoute><MainLayout><BanhoTosa /></MainLayout></ProtectedRoute>} />
              <Route path="/hotel-creche" element={<ProtectedRoute><MainLayout><HotelCreche /></MainLayout></ProtectedRoute>} />
              <Route path="/planos" element={<ProtectedRoute><MainLayout><Planos /></MainLayout></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute><MainLayout><Clientes /></MainLayout></ProtectedRoute>} />
              <Route path="/lembretes" element={<ProtectedRoute><MainLayout><Lembretes /></MainLayout></ProtectedRoute>} />
              <Route path="/inativos" element={<ProtectedRoute><MainLayout><Inativos /></MainLayout></ProtectedRoute>} />
              <Route path="/caixa" element={<ProtectedRoute><MainLayout><FrenteCaixa /></MainLayout></ProtectedRoute>} />
              <Route path="/whatsapp" element={<ProtectedRoute><MainLayout><WhatsAppPanel /></MainLayout></ProtectedRoute>} />
              <Route path="/importar" element={<ProtectedRoute><MainLayout><Importar /></MainLayout></ProtectedRoute>} />
              <Route path="/tabela-valores" element={<ProtectedRoute><MainLayout><TabelaValores /></MainLayout></ProtectedRoute>} />
              <Route path="/servicos-do-dia" element={<ProtectedRoute><MainLayout><ServicosDoDia /></MainLayout></ProtectedRoute>} />
              <Route path="/rota-do-dia" element={<ProtectedRoute><MainLayout><RotaDoDia /></MainLayout></ProtectedRoute>} />
              <Route path="/faturamento" element={<ProtectedRoute><MainLayout><Faturamento /></MainLayout></ProtectedRoute>} />
              <Route path="/estoque" element={<ProtectedRoute><MainLayout><Estoque /></MainLayout></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
