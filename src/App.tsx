import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
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
          <Route path="/google-callback" element={<GoogleCallback />} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
