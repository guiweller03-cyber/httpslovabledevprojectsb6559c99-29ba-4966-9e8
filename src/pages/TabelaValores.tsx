import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Scissors, Package, CreditCard, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
interface ServicePrice {
  id: string;
  breed: string;
  size_category: 'pequeno' | 'medio' | 'grande';
  coat_type: 'curto' | 'medio' | 'longo';
  service_type: 'banho' | 'banho_tosa';
  price: number;
}

interface ServiceAddon {
  id: string;
  name: string;
  price: number;
  service_type?: string;
}

interface BathPlan {
  id: string;
  plan_name: string;
  total_baths: number;
  price: number;
  validity_days: number;
}

interface HotelRate {
  id: string;
  size_category: 'pequeno' | 'medio' | 'grande';
  daily_rate: number;
}

const coatTypeLabels: Record<string, string> = {
  curto: 'Curto',
  medio: 'Médio',
  longo: 'Longo'
};

const serviceTypeLabels: Record<string, string> = {
  banho: 'Banho',
  banho_tosa: 'Banho & Tosa'
};

const sizeLabels: Record<string, string> = {
  pequeno: 'Pequeno',
  medio: 'Médio',
  grande: 'Grande'
};

// Helper function for dynamic table queries
const dynamicFrom = (tableName: string) => {
  return (supabase as any).from(tableName);
};

export default function TabelaValores() {
  // State for each table
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [serviceAddons, setServiceAddons] = useState<ServiceAddon[]>([]);
  const [bathPlans, setBathPlans] = useState<BathPlan[]>([]);
  const [hotelRates, setHotelRates] = useState<HotelRate[]>([]);

  // Dialog states
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);

  // Form states
  const [editingPrice, setEditingPrice] = useState<ServicePrice | null>(null);
  const [editingAddon, setEditingAddon] = useState<ServiceAddon | null>(null);
  const [editingPlan, setEditingPlan] = useState<BathPlan | null>(null);
  const [editingRate, setEditingRate] = useState<HotelRate | null>(null);

  // Form data
  const [priceForm, setPriceForm] = useState({ breed: '', size_category: 'pequeno', coat_type: 'curto', service_type: 'banho', price: 0 });
  const [addonForm, setAddonForm] = useState({ name: '', price: 0, service_type: '' });
  const [planForm, setPlanForm] = useState({ plan_name: '', total_baths: 1, price: 0, validity_days: 30 });
  const [rateForm, setRateForm] = useState({ size_category: 'pequeno', daily_rate: 0 });

  // Fetch all data
  useEffect(() => {
    fetchServicePrices();
    fetchServiceAddons();
    fetchBathPlans();
    fetchHotelRates();
  }, []);

  const fetchServicePrices = async () => {
    const { data, error } = await dynamicFrom('service_prices').select('*').order('breed');
    if (error) {
      console.error('Error fetching service prices:', error);
      if (error.code !== '42P01') toast.error('Erro ao carregar preços');
    } else {
      setServicePrices((data as ServicePrice[]) || []);
    }
  };

  const fetchServiceAddons = async () => {
    const { data, error } = await dynamicFrom('service_addons').select('*').order('name');
    if (error) {
      console.error('Error fetching addons:', error);
      if (error.code !== '42P01') toast.error('Erro ao carregar adicionais');
    } else {
      setServiceAddons((data as ServiceAddon[]) || []);
    }
  };

  const fetchBathPlans = async () => {
    const { data, error } = await dynamicFrom('bath_plans').select('*').order('total_baths');
    if (error) {
      console.error('Error fetching plans:', error);
      if (error.code !== '42P01') toast.error('Erro ao carregar planos');
    } else {
      setBathPlans((data as BathPlan[]) || []);
    }
  };

  const fetchHotelRates = async () => {
    const { data, error } = await dynamicFrom('hotel_rates').select('*');
    if (error) {
      console.error('Error fetching rates:', error);
      if (error.code !== '42P01') toast.error('Erro ao carregar diárias');
    } else {
      setHotelRates((data as HotelRate[]) || []);
    }
  };

  // CRUD for Service Prices
  const handleSavePrice = async () => {
    if (!priceForm.breed.trim()) {
      toast.error('Informe a raça');
      return;
    }

    if (editingPrice) {
      const { error } = await dynamicFrom('service_prices')
        .update({ ...priceForm })
        .eq('id', editingPrice.id);
      if (error) {
        console.error('Error updating price:', error);
        toast.error('Erro ao atualizar preço');
      } else {
        toast.success('Preço atualizado!');
        fetchServicePrices();
      }
    } else {
      const { error } = await dynamicFrom('service_prices').insert([priceForm]);
      if (error) {
        console.error('Error inserting price:', error);
        toast.error('Erro ao cadastrar preço');
      } else {
        toast.success('Preço cadastrado!');
        fetchServicePrices();
      }
    }
    setPriceDialogOpen(false);
    resetPriceForm();
  };

  const handleDeletePrice = async (id: string) => {
    const { error } = await dynamicFrom('service_prices').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Excluído!');
      fetchServicePrices();
    }
  };

  const resetPriceForm = () => {
    setPriceForm({ breed: '', size_category: 'pequeno', coat_type: 'curto', service_type: 'banho', price: 0 });
    setEditingPrice(null);
  };

  // CRUD for Addons
  const handleSaveAddon = async () => {
    if (!addonForm.name.trim()) {
      toast.error('Informe o nome do adicional');
      return;
    }

    if (editingAddon) {
      const { error } = await dynamicFrom('service_addons')
        .update({ ...addonForm })
        .eq('id', editingAddon.id);
      if (error) {
        toast.error('Erro ao atualizar adicional');
      } else {
        toast.success('Adicional atualizado!');
        fetchServiceAddons();
      }
    } else {
      const { error } = await dynamicFrom('service_addons').insert([addonForm]);
      if (error) {
        toast.error('Erro ao cadastrar adicional');
      } else {
        toast.success('Adicional cadastrado!');
        fetchServiceAddons();
      }
    }
    setAddonDialogOpen(false);
    resetAddonForm();
  };

  const handleDeleteAddon = async (id: string) => {
    const { error } = await dynamicFrom('service_addons').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Excluído!');
      fetchServiceAddons();
    }
  };

  const resetAddonForm = () => {
    setAddonForm({ name: '', price: 0, service_type: '' });
    setEditingAddon(null);
  };

  // CRUD for Bath Plans
  const handleSavePlan = async () => {
    if (!planForm.plan_name.trim()) {
      toast.error('Informe o nome do plano');
      return;
    }

    if (editingPlan) {
      const { error } = await dynamicFrom('bath_plans')
        .update({ ...planForm })
        .eq('id', editingPlan.id);
      if (error) {
        toast.error('Erro ao atualizar plano');
      } else {
        toast.success('Plano atualizado!');
        fetchBathPlans();
      }
    } else {
      const { error } = await dynamicFrom('bath_plans').insert([planForm]);
      if (error) {
        toast.error('Erro ao cadastrar plano');
      } else {
        toast.success('Plano cadastrado!');
        fetchBathPlans();
      }
    }
    setPlanDialogOpen(false);
    resetPlanForm();
  };

  const handleDeletePlan = async (id: string) => {
    const { error } = await dynamicFrom('bath_plans').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Excluído!');
      fetchBathPlans();
    }
  };

  const resetPlanForm = () => {
    setPlanForm({ plan_name: '', total_baths: 1, price: 0, validity_days: 30 });
    setEditingPlan(null);
  };

  // CRUD for Hotel Rates
  const handleSaveRate = async () => {
    if (editingRate) {
      const { error } = await dynamicFrom('hotel_rates')
        .update({ daily_rate: rateForm.daily_rate })
        .eq('id', editingRate.id);
      if (error) {
        toast.error('Erro ao atualizar diária');
      } else {
        toast.success('Diária atualizada!');
        fetchHotelRates();
      }
    } else {
      const { error } = await dynamicFrom('hotel_rates').insert([rateForm]);
      if (error) {
        toast.error('Erro ao cadastrar diária');
      } else {
        toast.success('Diária cadastrada!');
        fetchHotelRates();
      }
    }
    setRateDialogOpen(false);
    resetRateForm();
  };

  const resetRateForm = () => {
    setRateForm({ size_category: 'pequeno', daily_rate: 0 });
    setEditingRate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-foreground">Tabela de Valores</h1>
      </div>

      <Tabs defaultValue="prices" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="prices" className="flex items-center gap-2">
            <Scissors className="w-4 h-4" />
            Banho & Tosa
          </TabsTrigger>
          <TabsTrigger value="addons" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Adicionais
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="hotel" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Hotelzinho
          </TabsTrigger>
        </TabsList>

        {/* Service Prices Tab */}
        <TabsContent value="prices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Preços por Raça e Tipo de Pelo</CardTitle>
              <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetPriceForm()}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingPrice ? 'Editar Preço' : 'Novo Preço'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Raça</Label>
                      <Input
                        value={priceForm.breed}
                        onChange={(e) => setPriceForm({ ...priceForm, breed: e.target.value })}
                        placeholder="Ex: Shih-tzu, Poodle..."
                      />
                    </div>
                    <div>
                      <Label>Porte</Label>
                      <Select
                        value={priceForm.size_category}
                        onValueChange={(v) => setPriceForm({ ...priceForm, size_category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pequeno">Pequeno</SelectItem>
                          <SelectItem value="medio">Médio</SelectItem>
                          <SelectItem value="grande">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo de Pelo</Label>
                      <Select
                        value={priceForm.coat_type}
                        onValueChange={(v) => setPriceForm({ ...priceForm, coat_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="curto">Curto</SelectItem>
                          <SelectItem value="medio">Médio</SelectItem>
                          <SelectItem value="longo">Longo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Serviço</Label>
                      <Select
                        value={priceForm.service_type}
                        onValueChange={(v) => setPriceForm({ ...priceForm, service_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="banho">Banho</SelectItem>
                          <SelectItem value="banho_tosa">Banho & Tosa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Preço (R$)</Label>
                      <Input
                        type="number"
                        value={priceForm.price}
                        onChange={(e) => setPriceForm({ ...priceForm, price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <Button onClick={handleSavePrice} className="w-full">
                      Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Raça</TableHead>
                    <TableHead>Porte</TableHead>
                    <TableHead>Tipo de Pelo</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicePrices.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.breed}</TableCell>
                      <TableCell>{sizeLabels[item.size_category]}</TableCell>
                      <TableCell>{coatTypeLabels[item.coat_type]}</TableCell>
                      <TableCell>{serviceTypeLabels[item.service_type]}</TableCell>
                      <TableCell>R$ {item.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingPrice(item);
                              setPriceForm({
                                breed: item.breed,
                                size_category: item.size_category,
                                coat_type: item.coat_type,
                                service_type: item.service_type,
                                price: item.price
                              });
                              setPriceDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeletePrice(item.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {servicePrices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum preço cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Addons Tab */}
        <TabsContent value="addons">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Serviços Adicionais</CardTitle>
              <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetAddonForm()}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingAddon ? 'Editar Adicional' : 'Novo Adicional'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={addonForm.name}
                        onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                        placeholder="Ex: Corte de Unha, Tosa Higiênica..."
                      />
                    </div>
                    <div>
                      <Label>Preço (R$)</Label>
                      <Input
                        type="number"
                        value={addonForm.price}
                        onChange={(e) => setAddonForm({ ...addonForm, price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>Vinculado a (opcional)</Label>
                      <Select
                        value={addonForm.service_type || ''}
                        onValueChange={(v) => setAddonForm({ ...addonForm, service_type: v || undefined })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os serviços" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os serviços</SelectItem>
                          <SelectItem value="banho">Banho</SelectItem>
                          <SelectItem value="banho_tosa">Banho & Tosa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleSaveAddon} className="w-full">
                      Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Vinculado a</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceAddons.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>R$ {item.price.toFixed(2)}</TableCell>
                      <TableCell>{item.service_type ? serviceTypeLabels[item.service_type] : 'Todos'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingAddon(item);
                              setAddonForm({
                                name: item.name,
                                price: item.price,
                                service_type: item.service_type || ''
                              });
                              setAddonDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteAddon(item.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {serviceAddons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhum adicional cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Planos de Banho</CardTitle>
              <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetPlanForm()}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome do Plano</Label>
                      <Input
                        value={planForm.plan_name}
                        onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                        placeholder="Ex: Plano 4 Banhos"
                      />
                    </div>
                    <div>
                      <Label>Quantidade de Banhos</Label>
                      <Input
                        type="number"
                        value={planForm.total_baths}
                        onChange={(e) => setPlanForm({ ...planForm, total_baths: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <Label>Preço (R$)</Label>
                      <Input
                        type="number"
                        value={planForm.price}
                        onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>Validade (dias)</Label>
                      <Input
                        type="number"
                        value={planForm.validity_days}
                        onChange={(e) => setPlanForm({ ...planForm, validity_days: parseInt(e.target.value) || 30 })}
                      />
                    </div>
                    <Button onClick={handleSavePlan} className="w-full">
                      Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Banhos</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bathPlans.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.plan_name}</TableCell>
                      <TableCell>{item.total_baths}</TableCell>
                      <TableCell>R$ {item.price.toFixed(2)}</TableCell>
                      <TableCell>{item.validity_days > 0 ? `${item.validity_days} dias` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingPlan(item);
                              setPlanForm({
                                plan_name: item.plan_name,
                                total_baths: item.total_baths,
                                price: item.price,
                                validity_days: item.validity_days
                              });
                              setPlanDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeletePlan(item.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {bathPlans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum plano cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hotel Rates Tab */}
        <TabsContent value="hotel">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Diárias por Porte</CardTitle>
              <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetRateForm()}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingRate ? 'Editar Diária' : 'Nova Diária'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Porte</Label>
                      <Select
                        value={rateForm.size_category}
                        onValueChange={(v) => setRateForm({ ...rateForm, size_category: v })}
                        disabled={!!editingRate}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pequeno">Pequeno</SelectItem>
                          <SelectItem value="medio">Médio</SelectItem>
                          <SelectItem value="grande">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Diária (R$)</Label>
                      <Input
                        type="number"
                        value={rateForm.daily_rate}
                        onChange={(e) => setRateForm({ ...rateForm, daily_rate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <Button onClick={handleSaveRate} className="w-full">
                      Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Porte</TableHead>
                    <TableHead>Diária</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotelRates.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{sizeLabels[item.size_category]}</TableCell>
                      <TableCell>R$ {item.daily_rate.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingRate(item);
                              setRateForm({
                                size_category: item.size_category,
                                daily_rate: item.daily_rate
                              });
                              setRateDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {hotelRates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhuma diária cadastrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
