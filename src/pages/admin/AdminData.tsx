import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, PawPrint, Calendar, ShoppingCart, Package } from 'lucide-react';
import AdminClientsTable from '@/components/admin/AdminClientsTable';
import AdminPetsTable from '@/components/admin/AdminPetsTable';
import AdminAppointmentsTable from '@/components/admin/AdminAppointmentsTable';
import AdminSalesTable from '@/components/admin/AdminSalesTable';
import AdminProductsTable from '@/components/admin/AdminProductsTable';

export default function AdminData() {
  const [activeTab, setActiveTab] = useState('clients');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1F2933]">Dados Principais</h1>
        <p className="text-[#64748B] mt-1">
          CRUD completo dos dados centrais do sistema
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#E2E8F0] p-1 h-auto flex-wrap">
          <TabsTrigger 
            value="clients"
            className="data-[state=active]:bg-white data-[state=active]:text-[#1F2933] gap-2"
          >
            <Users className="w-4 h-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger 
            value="pets"
            className="data-[state=active]:bg-white data-[state=active]:text-[#1F2933] gap-2"
          >
            <PawPrint className="w-4 h-4" />
            Pets
          </TabsTrigger>
          <TabsTrigger 
            value="appointments"
            className="data-[state=active]:bg-white data-[state=active]:text-[#1F2933] gap-2"
          >
            <Calendar className="w-4 h-4" />
            Agendamentos
          </TabsTrigger>
          <TabsTrigger 
            value="sales"
            className="data-[state=active]:bg-white data-[state=active]:text-[#1F2933] gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger 
            value="products"
            className="data-[state=active]:bg-white data-[state=active]:text-[#1F2933] gap-2"
          >
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-6">
          <AdminClientsTable />
        </TabsContent>

        <TabsContent value="pets" className="mt-6">
          <AdminPetsTable />
        </TabsContent>

        <TabsContent value="appointments" className="mt-6">
          <AdminAppointmentsTable />
        </TabsContent>

        <TabsContent value="sales" className="mt-6">
          <AdminSalesTable />
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <AdminProductsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
