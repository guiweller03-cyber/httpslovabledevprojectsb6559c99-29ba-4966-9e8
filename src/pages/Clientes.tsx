import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Phone, Mail, Dog, Cat, Edit, TrendingUp, PawPrint, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent as AlertDialogContentComp, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { mockPets, getBreedsBySpecies } from '@/data/mockData';
import { Pet, FurType, Species, PetSize, PreferredService, GroomingType, BreedInfo } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, addDays, format } from 'date-fns';
import { VaccineBooklet } from '@/components/pets/VaccineBooklet';
import { lookupCep, formatCep } from '@/lib/cepLookup';
import { ClientBillingDialog } from '@/components/clients/ClientBillingDialog';
import { ClientEditDialog } from '@/components/clients/ClientEditDialog';
import { PetEditDialog } from '@/components/pets/PetEditDialog';

const furTypeLabels: Record<FurType, string> = {
  curto: 'Pelo curto',
  medio: 'Pelo médio',
  longo: 'Pelo longo',
};

const sizeLabels: Record<PetSize, string> = {
  pequeno: 'Pequeno',
  medio: 'Médio',
  grande: 'Grande',
};

const groomingTypeLabels: Record<GroomingType, string> = {
  banho: 'Apenas Banho',
  banho_tosa: 'Banho + Tosa',
  tosa_baby: 'Tosa Baby',
  tosa_higienica: 'Tosa Higiênica',
  tosa_padrao: 'Tosa Padrão da Raça',
  tosa_tesoura: 'Tosa Tesoura',
  tosa_maquina: 'Tosa Máquina',
};

// Webhook trigger function
const triggerWebhook = async (event: string, data: Record<string, unknown>) => {
  console.log(`[Webhook] ${event}:`, data);
};

interface ClientDB {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  created_at: string | null;
  zip_code: string | null;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  tipo_campanha: string | null;
  last_purchase: string | null;
}

interface PetDB {
  id: string;
  client_id: string;
  name: string;
  species: string;
  breed: string | null;
  size: string | null;
  coat_type: string | null;
  weight: number | null;
  preferred_service: string | null;
  grooming_type: string | null;
  created_at: string | null;
  zip_code: string | null;
  address: string | null;
  neighborhood: string | null;
  pickup_delivery: boolean | null;
  pickup_time: string | null;
  delivery_time: string | null;
  logistics_type: string | null;
  birth_date: string | null;
  allergies: string | null;
}

const LOGISTICS_TYPES = [
  { value: 'tutor_tutor', label: 'Tutor Leva e Busca', color: 'bg-blue-500' },
  { value: 'tutor_empresa', label: 'Tutor Leva / Empresa Busca', color: 'bg-yellow-500' },
  { value: 'empresa_tutor', label: 'Empresa Leva / Tutor Busca', color: 'bg-purple-500' },
  { value: 'empresa_empresa', label: 'Empresa Leva e Busca', color: 'bg-orange-500' },
];

const Clientes = () => {
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [pets, setPets] = useState<PetDB[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isPetDialogOpen, setIsPetDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [billingClient, setBillingClient] = useState<{ id: string; name: string } | null>(null);
  const [editingClient, setEditingClient] = useState<{ id: string; name: string } | null>(null);
  const [quickEditPet, setQuickEditPet] = useState<{ id: string; name: string } | null>(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    whatsapp: '',
    email: '',
    zip_code: '',
    address: '',
    address_number: '',
    address_complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const [petForm, setPetForm] = useState({
    clientId: '',
    name: '',
    species: '' as Species | '',
    breed: '',
    size: '' as PetSize | '',
    furType: '' as FurType | '',
    weight: '',
    preferredService: '' as PreferredService | '',
    groomingType: '' as GroomingType | '',
    useClientAddress: true,
    zip_code: '',
    address: '',
    neighborhood: '',
    logistics_type: 'tutor_tutor',
    pickup_time: '',
    delivery_time: '',
    vaccineType: '',
    vaccineAppliedAt: '',
    vaccineValidityMonths: '12',
    antiparasiticType: '',
    antiparasiticAppliedAt: '',
    antiparasiticValidityDays: '30',
    vermifugeType: '',
    vermifugeAppliedAt: '',
    vermifugeValidityDays: '90',
  });
  const [isLoadingPetCep, setIsLoadingPetCep] = useState(false);
  const [availableBreeds, setAvailableBreeds] = useState<BreedInfo[]>([]);
  const [isSRD, setIsSRD] = useState(false);

  // Fetch clients from database
  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar clientes:', error);
      return;
    }
    
    setClients((data || []) as unknown as ClientDB[]);
  };

  // Fetch pets from database
  const fetchPets = async () => {
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar pets:', error);
      return;
    }
    
    setPets((data || []) as unknown as PetDB[]);
  };

  // Load clients and pets on mount
  useEffect(() => {
    fetchClients();
    fetchPets();
  }, []);

  // Update breeds when species changes
  useEffect(() => {
    if (petForm.species) {
      setAvailableBreeds(getBreedsBySpecies(petForm.species as Species));
      setPetForm(prev => ({ ...prev, breed: '', size: '' }));
    }
  }, [petForm.species]);

  // Auto-suggest size when breed changes
  useEffect(() => {
    if (petForm.breed) {
      const breedInfo = availableBreeds.find(b => b.name === petForm.breed);
      const isSRDBreed = petForm.breed.includes('SRD');
      setIsSRD(isSRDBreed);
      
      if (breedInfo && !isSRDBreed) {
        setPetForm(prev => ({ ...prev, size: breedInfo.suggestedSize }));
      } else if (isSRDBreed) {
        setPetForm(prev => ({ ...prev, size: '' }));
      }
    }
  }, [petForm.breed, availableBreeds]);

  // Filter clients by search only
  const filteredClients = clients.filter(client =>
    !searchTerm ||
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.whatsapp.includes(searchTerm)
  );

  const getClientPets = (clientId: string) => pets.filter(p => p.client_id === clientId);

  // CEP lookup for client
  const handleClientCepLookup = async (cep: string) => {
    const formattedCep = formatCep(cep);
    setClientForm(prev => ({ ...prev, zip_code: formattedCep }));
    
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      const result = await lookupCep(cleanCep);
      setIsLoadingCep(false);
      
      if (result) {
        setClientForm(prev => ({
          ...prev,
          address: result.logradouro,
          neighborhood: result.bairro,
          city: result.localidade,
          state: result.uf,
        }));
        toast({ title: "Endereço encontrado!", description: `${result.logradouro}, ${result.bairro}` });
      } else {
        toast({ title: "CEP não encontrado", description: "Verifique o CEP digitado.", variant: "destructive" });
      }
    }
  };

  // Save client to database
  const handleSaveClient = async () => {
    if (!clientForm.name || !clientForm.whatsapp) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome e WhatsApp.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase
      .from('clients')
      .insert({
        name: clientForm.name,
        whatsapp: clientForm.whatsapp,
        email: clientForm.email || null,
        zip_code: clientForm.zip_code || null,
        address: clientForm.address || null,
        address_number: clientForm.address_number || null,
        address_complement: clientForm.address_complement || null,
        neighborhood: clientForm.neighborhood || null,
        city: clientForm.city || null,
        state: clientForm.state || null,
      } as any);

    setIsLoading(false);

    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Cliente cadastrado!", description: `${clientForm.name} foi salvo com sucesso.` });
    setClientForm({ name: '', whatsapp: '', email: '', zip_code: '', address: '', address_number: '', address_complement: '', neighborhood: '', city: '', state: '' });
    setIsClientDialogOpen(false);
    fetchClients();
  };

  const resetPetForm = () => {
    setPetForm({
      clientId: '', name: '', species: '', breed: '', size: '', furType: '', weight: '',
      preferredService: '', groomingType: '', useClientAddress: true, zip_code: '', address: '',
      neighborhood: '', logistics_type: 'tutor_tutor', pickup_time: '', delivery_time: '',
      vaccineType: '', vaccineAppliedAt: '', vaccineValidityMonths: '12',
      antiparasiticType: '', antiparasiticAppliedAt: '', antiparasiticValidityDays: '30',
      vermifugeType: '', vermifugeAppliedAt: '', vermifugeValidityDays: '90',
    });
    setAvailableBreeds([]);
    setIsSRD(false);
    setEditingPetId(null);
  };

  const handleSavePet = async () => {
    if (!petForm.clientId || !petForm.name || !petForm.species || !petForm.breed || !petForm.size || !petForm.furType) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const petPayload = {
        client_id: petForm.clientId,
        name: petForm.name,
        species: petForm.species,
        breed: petForm.breed,
        size: petForm.size,
        coat_type: petForm.furType,
        weight: petForm.weight ? parseFloat(petForm.weight) : null,
        preferred_service: petForm.preferredService || null,
        grooming_type: petForm.groomingType || null,
        logistics_type: petForm.logistics_type,
        pickup_time: petForm.pickup_time || null,
        delivery_time: petForm.delivery_time || null,
      };

      if (editingPetId) {
        const { error } = await supabase.from('pets').update(petPayload).eq('id', editingPetId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pets').insert(petPayload);
        if (error) throw error;
      }

      toast({ title: editingPetId ? "Pet atualizado!" : "Pet cadastrado!", description: `${petForm.name} foi salvo com sucesso.` });
      resetPetForm();
      setIsPetDialogOpen(false);
      fetchPets();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Clientes & Pets
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie sua base de clientes e seus pets</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsPetDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Pet
            </Button>
            <Button onClick={() => setIsClientDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats - Only basic counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center">
              <PawPrint className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pets.length}</p>
              <p className="text-sm text-muted-foreground">Total de Pets</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum cliente encontrado.
              </div>
            ) : (
              filteredClients.map((client) => {
                const clientPets = getClientPets(client.id);
                
                return (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground">{client.name}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.whatsapp}
                          </span>
                          {client.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {client.email}
                            </span>
                          )}
                        </div>
                        
                        {/* Pets */}
                        {clientPets.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {clientPets.map(pet => (
                              <Badge key={pet.id} variant="secondary" className="gap-1">
                                {pet.species === 'cachorro' ? <Dog className="w-3 h-3" /> : <Cat className="w-3 h-3" />}
                                {pet.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBillingClient({ id: client.id, name: client.name })}
                        >
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingClient({ id: client.id, name: client.name })}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContentComp>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir <strong>{client.name}</strong>? Esta ação também removerá todos os pets associados e não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={async () => {
                                  await supabase.from('pets').delete().eq('client_id', client.id);
                                  const { error } = await supabase.from('clients').delete().eq('id', client.id);
                                  if (error) {
                                    toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
                                  } else {
                                    toast({ title: 'Cliente excluído', description: `${client.name} foi removido.` });
                                    fetchClients();
                                    fetchPets();
                                  }
                                }}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContentComp>
                        </AlertDialog>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pet Dialog */}
      <Dialog open={isPetDialogOpen} onOpenChange={(open) => { setIsPetDialogOpen(open); if (!open) resetPetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPetId ? 'Editar Pet' : 'Cadastrar Novo Pet'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Dono *</Label>
              <Select value={petForm.clientId} onValueChange={(v) => setPetForm(p => ({ ...p, clientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome do Pet *</Label>
              <Input value={petForm.name} onChange={(e) => setPetForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Espécie *</Label>
                <Select value={petForm.species} onValueChange={(v: Species) => setPetForm(p => ({ ...p, species: v }))}>
                  <SelectTrigger><SelectValue placeholder="Espécie" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cachorro">Cachorro</SelectItem>
                    <SelectItem value="gato">Gato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Raça *</Label>
                <Select value={petForm.breed} onValueChange={(v) => setPetForm(p => ({ ...p, breed: v }))} disabled={!petForm.species}>
                  <SelectTrigger><SelectValue placeholder="Raça" /></SelectTrigger>
                  <SelectContent>
                    {availableBreeds.map(b => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Porte *</Label>
                <Select value={petForm.size} onValueChange={(v: PetSize) => setPetForm(p => ({ ...p, size: v }))}>
                  <SelectTrigger><SelectValue placeholder="Porte" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pequeno">Pequeno</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="grande">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Pelo *</Label>
                <Select value={petForm.furType} onValueChange={(v: FurType) => setPetForm(p => ({ ...p, furType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pelo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="curto">Curto</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="longo">Longo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={handleSavePet} disabled={isLoading}>
              {isLoading ? 'Salvando...' : editingPetId ? 'Atualizar Pet' : 'Cadastrar Pet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Dialog */}
      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={clientForm.name} onChange={(e) => setClientForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>WhatsApp *</Label>
              <Input value={clientForm.whatsapp} onChange={(e) => setClientForm(p => ({ ...p, whatsapp: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={clientForm.email} onChange={(e) => setClientForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label>CEP</Label>
              <Input 
                value={clientForm.zip_code} 
                onChange={(e) => handleClientCepLookup(e.target.value)}
                disabled={isLoadingCep}
              />
            </div>
            {clientForm.address && (
              <>
                <div>
                  <Label>Endereço</Label>
                  <Input value={clientForm.address} onChange={(e) => setClientForm(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Número</Label>
                    <Input value={clientForm.address_number} onChange={(e) => setClientForm(p => ({ ...p, address_number: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input value={clientForm.neighborhood} onChange={(e) => setClientForm(p => ({ ...p, neighborhood: e.target.value }))} />
                  </div>
                </div>
              </>
            )}
            <Button className="w-full" onClick={handleSaveClient} disabled={isLoading || isLoadingCep}>
              {isLoading ? 'Salvando...' : 'Cadastrar Cliente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Billing Dialog */}
      <ClientBillingDialog
        open={!!billingClient}
        onOpenChange={(open) => !open && setBillingClient(null)}
        clientId={billingClient?.id || ''}
        clientName={billingClient?.name || ''}
      />

      {/* Edit Dialog */}
      <ClientEditDialog
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        clientId={editingClient?.id || ''}
        onSuccess={() => { fetchClients(); setEditingClient(null); }}
      />

      {/* Pet Edit Dialog */}
      <PetEditDialog
        petId={quickEditPet?.id || null}
        petName={quickEditPet?.name || ''}
        isOpen={!!quickEditPet}
        onClose={() => setQuickEditPet(null)}
        onSaved={() => fetchPets()}
      />
    </div>
  );
};

export default Clientes;
