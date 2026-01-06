import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import BanhoTosa from "./pages/BanhoTosa";
import GoogleCallback from "./pages/GoogleCallback";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/google-callback" element={<GoogleCallback />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout><Dashboard /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/banho-tosa" element={
            <ProtectedRoute>
              <MainLayout><BanhoTosa /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/hotel-creche" element={
            <ProtectedRoute>
              <MainLayout><HotelCreche /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/planos" element={
            <ProtectedRoute>
              <MainLayout><Planos /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/clientes" element={
            <ProtectedRoute>
              <MainLayout><Clientes /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/lembretes" element={
            <ProtectedRoute>
              <MainLayout><Lembretes /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/inativos" element={
            <ProtectedRoute>
              <MainLayout><Inativos /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/caixa" element={
            <ProtectedRoute>
              <MainLayout><FrenteCaixa /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/whatsapp" element={
            <ProtectedRoute>
              <MainLayout><WhatsAppPanel /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/importar" element={
            <ProtectedRoute>
              <MainLayout><Importar /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/tabela-valores" element={
            <ProtectedRoute>
              <MainLayout><TabelaValores /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/servicos-do-dia" element={
            <ProtectedRoute>
              <MainLayout><ServicosDoDia /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/rota-do-dia" element={
            <ProtectedRoute>
              <MainLayout><RotaDoDia /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
