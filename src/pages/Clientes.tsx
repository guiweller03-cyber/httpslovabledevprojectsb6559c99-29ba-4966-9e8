import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Phone, Mail, Dog, Cat, Edit, Trash2, Scissors, Droplets, Syringe, Bug, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { mockPets, getBreedsBySpecies } from '@/data/mockData';
import { Pet, FurType, Species, PetSize, PreferredService, GroomingType, BreedInfo } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, addDays, format } from 'date-fns';

const furTypeLabels: Record<FurType, string> = {
  curto: 'Curto',
  medio: 'Médio',
  longo: 'Longo',
  muito_peludo: 'Muito Peludo',
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
  // In production, this would call the n8n webhook endpoint
  // await fetch('https://n8n.example.com/webhook/pet-events', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ event, data, timestamp: new Date() })
  // });
};

interface ClientDB {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  created_at: string | null;
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
}

const Clientes = () => {
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [pets, setPets] = useState<PetDB[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isPetDialogOpen, setIsPetDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  
  // Client form state
  const [clientForm, setClientForm] = useState({
    name: '',
    whatsapp: '',
    email: '',
  });

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
    
    setClients(data || []);
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
    
    setPets(data || []);
  };

  // Load clients and pets on mount
  useEffect(() => {
    fetchClients();
    fetchPets();
  }, []);

  // Save client to database
  const handleSaveClient = async () => {
    console.log("CLICK OK - handleSaveClient");
    console.log("DADOS FORM", clientForm);
    
    if (!clientForm.name || !clientForm.whatsapp) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e WhatsApp.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: clientForm.name,
        whatsapp: clientForm.whatsapp,
        email: clientForm.email || null,
      })
      .select();

    console.log("RESULTADO INSERT CLIENT", data, error);
    
    setIsLoading(false);

    if (error) {
      console.error('Erro ao salvar cliente:', error);
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Não foi possível salvar o cliente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Cliente cadastrado!",
      description: `${clientForm.name} foi salvo com sucesso.`,
    });

    setClientForm({ name: '', whatsapp: '', email: '' });
    setIsClientDialogOpen(false);
    fetchClients();
  };
  
  // New Pet Form State
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
    // Health fields (optional)
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
  
  const [availableBreeds, setAvailableBreeds] = useState<BreedInfo[]>([]);
  const [isSRD, setIsSRD] = useState(false);

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

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.whatsapp.includes(searchTerm)
  );

  const getClientPets = (clientId: string) => pets.filter(p => p.client_id === clientId);

  const resetPetForm = () => {
    setPetForm({
      clientId: '',
      name: '',
      species: '',
      breed: '',
      size: '',
      furType: '',
      weight: '',
      preferredService: '',
      groomingType: '',
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
    setAvailableBreeds([]);
    setIsSRD(false);
    setEditingPetId(null);
  };

  // Open edit pet dialog with data
  const handleEditPet = async (petId: string) => {
    setIsLoading(true);
    
    try {
      // Fetch pet data
      const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .maybeSingle();

      if (petError || !petData) {
        throw new Error('Pet não encontrado');
      }

      // Update breeds list for the species
      if (petData.species) {
        setAvailableBreeds(getBreedsBySpecies(petData.species as Species));
      }

      // Check if breed is SRD
      const isSRDBreed = petData.breed?.includes('SRD') || false;
      setIsSRD(isSRDBreed);

      // Fetch health data
      const { data: healthData } = await supabase
        .from('pet_health')
        .select('*')
        .eq('pet_id', petId)
        .maybeSingle();

      // Populate form with pet data
      setPetForm({
        clientId: petData.client_id,
        name: petData.name,
        species: (petData.species as Species) || '',
        breed: petData.breed || '',
        size: (petData.size as PetSize) || '',
        furType: (petData.coat_type as FurType) || '',
        weight: petData.weight?.toString() || '',
        preferredService: (petData.preferred_service as PreferredService) || '',
        groomingType: (petData.grooming_type as GroomingType) || '',
        vaccineType: healthData?.vaccine_type || '',
        vaccineAppliedAt: healthData?.vaccine_applied_at || '',
        vaccineValidityMonths: healthData?.vaccine_validity_months?.toString() || '12',
        antiparasiticType: healthData?.antiparasitic_type || '',
        antiparasiticAppliedAt: healthData?.antiparasitic_applied_at || '',
        antiparasiticValidityDays: healthData?.antiparasitic_validity_days?.toString() || '30',
        vermifugeType: healthData?.vermifuge_type || '',
        vermifugeAppliedAt: healthData?.vermifuge_applied_at || '',
        vermifugeValidityDays: healthData?.vermifuge_validity_days?.toString() || '90',
      });

      setEditingPetId(petId);
      setIsPetDialogOpen(true);
    } catch (error: any) {
      console.error('Erro ao carregar pet:', error);
      toast({
        title: "Erro ao carregar pet",
        description: error.message || "Não foi possível carregar os dados do pet.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePet = async () => {
    console.log("CLICK OK - handleSavePet", editingPetId ? "(EDIT MODE)" : "(CREATE MODE)");
    console.log("DADOS FORM PET", petForm);
    
    // Validation
    if (!petForm.clientId || !petForm.name || !petForm.species || !petForm.breed || !petForm.size || !petForm.furType) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
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
      };

      let petId: string;

      if (editingPetId) {
        // UPDATE existing pet
        const { error: petError } = await supabase
          .from('pets')
          .update(petPayload)
          .eq('id', editingPetId);

        if (petError) throw petError;
        petId = editingPetId;
      } else {
        // INSERT new pet
        const { data: petData, error: petError } = await supabase
          .from('pets')
          .insert(petPayload)
          .select()
          .single();

        if (petError) throw petError;
        petId = petData.id;
      }

      // Calculate expiration dates for health data
      let vaccineValidUntil = null;
      let antipulgasValidUntil = null;
      let vermifugeValidUntil = null;

      if (petForm.vaccineType && petForm.vaccineAppliedAt) {
        const appliedDate = new Date(petForm.vaccineAppliedAt);
        const validityMonths = parseInt(petForm.vaccineValidityMonths) || 12;
        vaccineValidUntil = format(addMonths(appliedDate, validityMonths), 'yyyy-MM-dd');
      }

      if (petForm.antiparasiticType && petForm.antiparasiticAppliedAt) {
        const appliedDate = new Date(petForm.antiparasiticAppliedAt);
        const validityDays = parseInt(petForm.antiparasiticValidityDays) || 30;
        antipulgasValidUntil = format(addDays(appliedDate, validityDays), 'yyyy-MM-dd');
      }

      if (petForm.vermifugeType && petForm.vermifugeAppliedAt) {
        const appliedDate = new Date(petForm.vermifugeAppliedAt);
        const validityDays = parseInt(petForm.vermifugeValidityDays) || 90;
        vermifugeValidUntil = format(addDays(appliedDate, validityDays), 'yyyy-MM-dd');
      }

      const healthPayload: Record<string, unknown> = {
        pet_id: petId,
        vaccine_name: petForm.vaccineType || null,
        vaccine_type: petForm.vaccineType || null,
        vaccine_applied_at: petForm.vaccineAppliedAt || null,
        vaccine_validity_months: petForm.vaccineValidityMonths ? parseInt(petForm.vaccineValidityMonths) : null,
        vaccine_valid_until: vaccineValidUntil,
        antiparasitic_type: petForm.antiparasiticType || null,
        antiparasitic_applied_at: petForm.antiparasiticAppliedAt || null,
        antiparasitic_validity_days: petForm.antiparasiticValidityDays ? parseInt(petForm.antiparasiticValidityDays) : null,
        antipulgas_valid_until: antipulgasValidUntil,
        vermifuge_type: petForm.vermifugeType || null,
        vermifuge_applied_at: petForm.vermifugeAppliedAt || null,
        vermifuge_validity_days: petForm.vermifugeValidityDays ? parseInt(petForm.vermifugeValidityDays) : null,
        vermifuge_valid_until: vermifugeValidUntil,
      };

      // Check if health record exists
      const { data: existingHealth } = await supabase
        .from('pet_health')
        .select('id')
        .eq('pet_id', petId)
        .maybeSingle();

      if (existingHealth) {
        // Update existing health record
        await supabase
          .from('pet_health')
          .update(healthPayload)
          .eq('pet_id', petId);
      } else {
        // Create new health record if any health data was provided
        const hasHealthData = petForm.vaccineType || petForm.antiparasiticType || petForm.vermifugeType;
        if (hasHealthData) {
          await supabase
            .from('pet_health')
            .insert(healthPayload as any);
        }
      }

      toast({
        title: editingPetId ? "Pet atualizado!" : "Pet cadastrado!",
        description: `${petForm.name} foi ${editingPetId ? 'atualizado' : 'cadastrado'} com sucesso.`,
      });

      resetPetForm();
      setIsPetDialogOpen(false);
      fetchPets();
    } catch (error: any) {
      console.error('Erro ao salvar pet:', error);
      toast({
        title: editingPetId ? "Erro ao atualizar" : "Erro ao cadastrar",
        description: error.message || "Não foi possível salvar o pet.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              <Users className="w-8 h-8 text-primary" />
              Clientes & Pets
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie sua base de clientes e seus pets
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isPetDialogOpen} onOpenChange={(open) => {
              setIsPetDialogOpen(open);
              if (!open) resetPetForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Pet
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPetId ? 'Editar Pet' : 'Cadastrar Novo Pet'}</DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue="dados" className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="dados">Dados do Pet</TabsTrigger>
                    <TabsTrigger value="servicos">Serviços</TabsTrigger>
                    <TabsTrigger value="saude">Saúde (opcional)</TabsTrigger>
                  </TabsList>
                  
                  {/* Tab: Dados do Pet */}
                  <TabsContent value="dados" className="space-y-4 mt-4">
                    <div>
                      <Label>Dono *</Label>
                      <Select 
                        value={petForm.clientId} 
                        onValueChange={(value) => setPetForm(prev => ({ ...prev, clientId: value }))}
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
                      <Label>Nome do Pet *</Label>
                      <Input 
                        placeholder="Ex: Thor" 
                        value={petForm.name}
                        onChange={(e) => setPetForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Espécie *</Label>
                        <Select 
                          value={petForm.species}
                          onValueChange={(value: Species) => setPetForm(prev => ({ ...prev, species: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Espécie" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cachorro">Cachorro</SelectItem>
                            <SelectItem value="gato">Gato</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Raça *</Label>
                        <Select 
                          value={petForm.breed}
                          onValueChange={(value) => setPetForm(prev => ({ ...prev, breed: value }))}
                          disabled={!petForm.species}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a raça" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableBreeds.map(breed => (
                              <SelectItem key={breed.name} value={breed.name}>
                                {breed.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>
                          Porte *
                          {isSRD && <span className="text-xs text-muted-foreground ml-1">(obrigatório para SRD)</span>}
                        </Label>
                        <Select 
                          value={petForm.size}
                          onValueChange={(value: PetSize) => setPetForm(prev => ({ ...prev, size: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o porte" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pequeno">Pequeno</SelectItem>
                            <SelectItem value="medio">Médio</SelectItem>
                            <SelectItem value="grande">Grande</SelectItem>
                          </SelectContent>
                        </Select>
                        {!isSRD && petForm.breed && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Porte sugerido pela raça. Ajuste se necessário.
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label>Tipo de Pelo *</Label>
                        <Select 
                          value={petForm.furType}
                          onValueChange={(value: FurType) => setPetForm(prev => ({ ...prev, furType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo de pelo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="curto">Curto</SelectItem>
                            <SelectItem value="medio">Médio</SelectItem>
                            <SelectItem value="longo">Longo</SelectItem>
                            <SelectItem value="muito_peludo">Muito Peludo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Peso (kg) <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                      <Input 
                        type="number" 
                        placeholder="Ex: 15" 
                        value={petForm.weight}
                        onChange={(e) => setPetForm(prev => ({ ...prev, weight: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Apenas informativo, não usado para precificação padrão.
                      </p>
                    </div>
                  </TabsContent>
                  
                  {/* Tab: Preferências de Serviço */}
                  <TabsContent value="servicos" className="space-y-4 mt-4">
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-muted-foreground">
                        Configure as preferências de serviço do cliente para este pet. 
                        Essas informações serão usadas como sugestão no agendamento e na frente de caixa.
                      </p>
                    </div>
                    
                    <div>
                      <Label className="flex items-center gap-2">
                        <Droplets className="w-4 h-4" />
                        Tipo de Serviço Preferido
                      </Label>
                      <Select 
                        value={petForm.preferredService}
                        onValueChange={(value: PreferredService) => {
                          setPetForm(prev => ({ 
                            ...prev, 
                            preferredService: value,
                            groomingType: value === 'banho' ? '' : prev.groomingType 
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="banho">Banho</SelectItem>
                          <SelectItem value="banho_tosa">Banho + Tosa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {petForm.preferredService === 'banho_tosa' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Label className="flex items-center gap-2">
                          <Scissors className="w-4 h-4" />
                          Tipo de Tosa <span className="text-xs text-muted-foreground">(preferência do cliente)</span>
                        </Label>
                        <Select 
                          value={petForm.groomingType}
                          onValueChange={(value: GroomingType) => setPetForm(prev => ({ ...prev, groomingType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de tosa" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tosa_higienica">Tosa Higiênica</SelectItem>
                            <SelectItem value="tosa_tesoura">Tosa na Tesoura</SelectItem>
                            <SelectItem value="tosa_maquina">Tosa na Máquina</SelectItem>
                            <SelectItem value="tosa_bebe">Tosa Bebê</SelectItem>
                            <SelectItem value="tosa_padrao_raca">Tosa Padrão da Raça</SelectItem>
                            <SelectItem value="sem_preferencia">Sem Preferência (padrão do pet shop)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Esta é a preferência do cliente. A equipe pode ajustar durante o atendimento.
                        </p>
                      </motion.div>
                    )}
                  </TabsContent>
                  
                  {/* Tab: Dados Sanitários (opcional) */}
                  <TabsContent value="saude" className="space-y-4 mt-4">
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-muted-foreground">
                        Campos <strong>opcionais</strong>. Se preenchidos, o sistema calculará automaticamente 
                        os lembretes de vencimento. Se não preencher, o pet não aparecerá na central de lembretes.
                      </p>
                    </div>
                    
                    {/* Vacina */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <Label className="flex items-center gap-2 text-base font-semibold">
                        <Syringe className="w-4 h-4 text-blue-500" />
                        Vacina
                      </Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Tipo de Vacina</Label>
                          <Input 
                            placeholder="Ex: V10, V8, Antirrábica"
                            value={petForm.vaccineType}
                            onChange={(e) => setPetForm(prev => ({ ...prev, vaccineType: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Data Aplicação</Label>
                          <Input 
                            type="date"
                            value={petForm.vaccineAppliedAt}
                            onChange={(e) => setPetForm(prev => ({ ...prev, vaccineAppliedAt: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Validade (meses)</Label>
                          <Input 
                            type="number"
                            placeholder="12"
                            value={petForm.vaccineValidityMonths}
                            onChange={(e) => setPetForm(prev => ({ ...prev, vaccineValidityMonths: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Antipulgas */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <Label className="flex items-center gap-2 text-base font-semibold">
                        <Bug className="w-4 h-4 text-orange-500" />
                        Antipulgas / Antiparasitário
                      </Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Tipo / Marca</Label>
                          <Input 
                            placeholder="Ex: Bravecto, Nexgard"
                            value={petForm.antiparasiticType}
                            onChange={(e) => setPetForm(prev => ({ ...prev, antiparasiticType: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Data Aplicação</Label>
                          <Input 
                            type="date"
                            value={petForm.antiparasiticAppliedAt}
                            onChange={(e) => setPetForm(prev => ({ ...prev, antiparasiticAppliedAt: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Validade (dias)</Label>
                          <Input 
                            type="number"
                            placeholder="30"
                            value={petForm.antiparasiticValidityDays}
                            onChange={(e) => setPetForm(prev => ({ ...prev, antiparasiticValidityDays: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Vermífugo */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <Label className="flex items-center gap-2 text-base font-semibold">
                        <Pill className="w-4 h-4 text-purple-500" />
                        Vermífugo
                      </Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Tipo / Marca</Label>
                          <Input 
                            placeholder="Ex: Drontal, Vermivet"
                            value={petForm.vermifugeType}
                            onChange={(e) => setPetForm(prev => ({ ...prev, vermifugeType: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Data Aplicação</Label>
                          <Input 
                            type="date"
                            value={petForm.vermifugeAppliedAt}
                            onChange={(e) => setPetForm(prev => ({ ...prev, vermifugeAppliedAt: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Validade (dias)</Label>
                          <Input 
                            type="number"
                            placeholder="90"
                            value={petForm.vermifugeValidityDays}
                            onChange={(e) => setPetForm(prev => ({ ...prev, vermifugeValidityDays: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => { setIsPetDialogOpen(false); resetPetForm(); }} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleSavePet} disabled={isLoading} className="flex-1 bg-gradient-primary hover:opacity-90">
                    {isLoading ? 'Salvando...' : (editingPetId ? 'Salvar Alterações' : 'Cadastrar Pet')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isClientDialogOpen} onOpenChange={(open) => {
              setIsClientDialogOpen(open);
              if (!open) setClientForm({ name: '', whatsapp: '', email: '' });
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input 
                      placeholder="Ex: Maria Silva" 
                      value={clientForm.name}
                      onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input 
                      placeholder="Ex: 11999887766" 
                      value={clientForm.whatsapp}
                      onChange={(e) => setClientForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Email (opcional)</Label>
                    <Input 
                      type="email" 
                      placeholder="Ex: maria@email.com" 
                      value={clientForm.email}
                      onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <Button 
                    className="w-full bg-gradient-primary hover:opacity-90"
                    onClick={handleSaveClient}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Salvando...' : 'Cadastrar Cliente'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
      >
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-sm text-muted-foreground">Clientes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
              <Dog className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pets.filter(p => p.species === 'cachorro').length}</p>
              <p className="text-sm text-muted-foreground">Cachorros</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <Cat className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pets.filter(p => p.species === 'gato').length}</p>
              <p className="text-sm text-muted-foreground">Gatos</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Client List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-soft">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredClients.map((client, index) => {
                const clientPets = getClientPets(client.id);
                
                return (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{client.name}</h4>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* Pets */}
                        <div className="flex flex-wrap items-center gap-2 max-w-md">
                          {clientPets.map(pet => (
                            <div
                              key={pet.id}
                              className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full"
                            >
                              <span>{pet.species === 'cachorro' ? '🐕' : pet.species === 'gato' ? '🐈' : '🐾'}</span>
                              <span className="text-sm font-medium">{pet.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {pet.size ? sizeLabels[pet.size as PetSize] : 'N/A'}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {pet.coat_type ? furTypeLabels[pet.coat_type as FurType] : 'N/A'}
                              </Badge>
                              {pet.preferred_service && (
                                <Badge className="text-xs bg-primary/20 text-primary">
                                  {pet.preferred_service === 'banho_tosa' ? 'B+T' : 'Banho'}
                                </Badge>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-primary hover:bg-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPet(pet.id);
                                }}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Editar
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Clientes;