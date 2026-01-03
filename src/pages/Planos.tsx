import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Plus, Sparkles, Check, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { addDays, format, isPast, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BathPlan {
  id: string;
  plan_name: string;
  total_baths: number;
  price: number;
  validity_days: number;
}

interface Client {
  id: string;
  name: string;
  whatsapp: string;
}

interface Pet {
  id: string;
  client_id: string;
  name: string;
  breed: string | null;
  size: string | null;
}

interface ClientPlan {
  id: string;
  client_id: string;
  pet_id: string;
  plan_id: string;
  total_baths: number;
  used_baths: number;
  price_paid: number;
  purchased_at: string;
  expires_at: string;
  active: boolean;
}

const Planos = () => {
  const { toast } = useToast();
  
  // Data from database
  const [bathPlans, setBathPlans] = useState<BathPlan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [filteredPets, setFilteredPets] = useState<Pet[]>([]);
  
  // Dialog states
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  
  // Form states for selling a plan
  const [sellForm, setSellForm] = useState({
    clientId: '',
    petId: '',
    planId: '',
  });
  
  // Form for creating/editing bath plans
  const [planForm, setPlanForm] = useState({
    plan_name: '',
    total_baths: 1,
    price: 0,
    validity_days: 90,
  });
  const [editingPlan, setEditingPlan] = useState<BathPlan | null>(null);

  // Fetch all data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [plansRes, clientsRes, petsRes, clientPlansRes] = await Promise.all([
      supabase.from('bath_plans').select('*').order('total_baths'),
      supabase.from('clients').select('*').order('name'),
      supabase.from('pets').select('*').order('name'),
      (supabase as any).from('client_plans').select('*').order('purchased_at', { ascending: false }),
    ]);

    if (plansRes.data) setBathPlans(plansRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    if (petsRes.data) setPets(petsRes.data);
    if (clientPlansRes.data) setClientPlans(clientPlansRes.data as ClientPlan[]);
  };

  // Filter pets when client is selected
  useEffect(() => {
    if (sellForm.clientId) {
      const clientPets = pets.filter(p => p.client_id === sellForm.clientId);
      setFilteredPets(clientPets);
      setSellForm(prev => ({ ...prev, petId: '' }));
    } else {
      setFilteredPets([]);
    }
  }, [sellForm.clientId, pets]);

  const getClient = (clientId: string) => clients.find(c => c.id === clientId);
  const getPet = (petId: string) => pets.find(p => p.id === petId);
  const getPlan = (planId: string) => bathPlans.find(p => p.id === planId);

  const isExpired = (dateStr: string) => isPast(new Date(dateStr));
  const isNearExpiry = (dateStr: string) => {
    const diff = differenceInDays(new Date(dateStr), new Date());
    return diff > 0 && diff <= 7;
  };

  // Sell a plan
  const handleSellPlan = async () => {
    if (!sellForm.clientId || !sellForm.petId || !sellForm.planId) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione cliente, pet e plano.",
        variant: "destructive",
      });
      return;
    }

    const selectedPlan = bathPlans.find(p => p.id === sellForm.planId);
    if (!selectedPlan) return;

    const expiresAt = addDays(new Date(), selectedPlan.validity_days || 90);

    const { error } = await (supabase as any).from('client_plans').insert({
      client_id: sellForm.clientId,
      pet_id: sellForm.petId,
      plan_id: sellForm.planId,
      total_baths: selectedPlan.total_baths,
      used_baths: 0,
      price_paid: selectedPlan.price,
      expires_at: expiresAt.toISOString(),
      active: true,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível vender o plano.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "✅ Plano Vendido!",
      description: `${selectedPlan.plan_name} para ${getPet(sellForm.petId)?.name}`,
    });

    setSellForm({ clientId: '', petId: '', planId: '' });
    setIsSellDialogOpen(false);
    fetchData();
  };

  // Save bath plan (create or update)
  const handleSavePlan = async () => {
    if (!planForm.plan_name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o nome do plano.",
        variant: "destructive",
      });
      return;
    }

    if (editingPlan) {
      const { error } = await supabase
        .from('bath_plans')
        .update(planForm)
        .eq('id', editingPlan.id);

      if (error) {
        toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
        return;
      }
      toast({ title: "Plano atualizado!" });
    } else {
      const { error } = await supabase.from('bath_plans').insert(planForm);
      if (error) {
        toast({ title: "Erro", description: "Não foi possível criar.", variant: "destructive" });
        return;
      }
      toast({ title: "Plano criado!" });
    }

    setPlanForm({ plan_name: '', total_baths: 1, price: 0, validity_days: 90 });
    setEditingPlan(null);
    setIsPlanDialogOpen(false);
    fetchData();
  };

  const handleDeletePlan = async (id: string) => {
    const { error } = await supabase.from('bath_plans').delete().eq('id', id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
      return;
    }
    toast({ title: "Plano excluído!" });
    fetchData();
  };

  // Active plans only (not expired and has remaining baths)
  const activePlans = clientPlans.filter(cp => 
    cp.active && 
    !isExpired(cp.expires_at) && 
    (cp.total_baths - cp.used_baths) > 0
  );

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-primary" />
              Planos
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e venda planos de banho & tosa
            </p>
          </div>
          <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Vender Plano
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vender Novo Plano</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Cliente *</Label>
                  <Select
                    value={sellForm.clientId}
                    onValueChange={(v) => setSellForm({ ...sellForm, clientId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pet *</Label>
                  <Select
                    value={sellForm.petId}
                    onValueChange={(v) => setSellForm({ ...sellForm, petId: v })}
                    disabled={!sellForm.clientId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={sellForm.clientId ? "Selecione o pet" : "Selecione um cliente primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPets.map(pet => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} {pet.breed ? `(${pet.breed})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plano *</Label>
                  <Select
                    value={sellForm.planId}
                    onValueChange={(v) => setSellForm({ ...sellForm, planId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {bathPlans.filter(p => p.total_baths > 1).map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.plan_name} - R$ {plan.price.toFixed(2)} ({plan.total_baths} banhos)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSellPlan} className="w-full bg-gradient-primary hover:opacity-90">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Confirmar Venda
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Planos Ativos ({activePlans.length})</TabsTrigger>
          <TabsTrigger value="catalog">Catálogo de Planos</TabsTrigger>
        </TabsList>

        {/* Active Client Plans */}
        <TabsContent value="active">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Planos Vendidos (Ativos)</CardTitle>
              </CardHeader>
              <CardContent>
                {activePlans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum plano ativo no momento.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activePlans.map((cp, index) => {
                      const client = getClient(cp.client_id);
                      const pet = getPet(cp.pet_id);
                      const plan = getPlan(cp.plan_id);
                      const remainingBaths = cp.total_baths - cp.used_baths;
                      const progress = (cp.used_baths / cp.total_baths) * 100;
                      const expired = isExpired(cp.expires_at);
                      const nearExpiry = isNearExpiry(cp.expires_at);

                      return (
                        <motion.div
                          key={cp.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "p-4 rounded-xl border",
                            expired ? "bg-destructive/5 border-destructive/20" : "bg-card border-border"
                          )}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                expired ? "bg-destructive/10" : "bg-primary/10"
                              )}>
                                <CreditCard className={cn(
                                  "w-5 h-5",
                                  expired ? "text-destructive" : "text-primary"
                                )} />
                              </div>
                              <div>
                                <p className="font-semibold">{client?.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {pet?.name} - {plan?.plan_name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {expired ? (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Expirado
                                </Badge>
                              ) : nearExpiry ? (
                                <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Expira em breve
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-green-500 text-green-600">
                                  <Check className="w-3 h-3 mr-1" />
                                  Ativo
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {cp.used_baths} de {cp.total_baths} banhos utilizados
                              </span>
                              <span className="font-medium text-primary">
                                {remainingBaths} restantes
                              </span>
                            </div>
                            <Progress 
                              value={progress} 
                              className={cn(
                                "h-2",
                                expired && "[&>div]:bg-destructive"
                              )}
                            />
                            <p className="text-xs text-muted-foreground">
                              Válido até {format(new Date(cp.expires_at), "dd/MM/yyyy")}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Plan Catalog */}
        <TabsContent value="catalog">
          <Card className="border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catálogo de Planos</CardTitle>
              <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingPlan(null);
                      setPlanForm({ plan_name: '', total_baths: 1, price: 0, validity_days: 90 });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Plano
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Nome do Plano *</Label>
                      <Input
                        value={planForm.plan_name}
                        onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                        placeholder="Ex: Plano 4 Banhos"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Quantidade de Banhos</Label>
                        <Input
                          type="number"
                          min={1}
                          value={planForm.total_baths}
                          onChange={(e) => setPlanForm({ ...planForm, total_baths: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <Label>Validade (dias)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={planForm.validity_days}
                          onChange={(e) => setPlanForm({ ...planForm, validity_days: parseInt(e.target.value) || 90 })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Preço (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={planForm.price}
                        onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
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
                    <TableHead>Validade</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Preço/Banho</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bathPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.plan_name}</TableCell>
                      <TableCell>{plan.total_baths}</TableCell>
                      <TableCell>{plan.validity_days} dias</TableCell>
                      <TableCell>R$ {plan.price.toFixed(2)}</TableCell>
                      <TableCell>R$ {(plan.price / plan.total_baths).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingPlan(plan);
                              setPlanForm({
                                plan_name: plan.plan_name,
                                total_baths: plan.total_baths,
                                price: plan.price,
                                validity_days: plan.validity_days,
                              });
                              setIsPlanDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeletePlan(plan.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {bathPlans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum plano cadastrado
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
};

export default Planos;