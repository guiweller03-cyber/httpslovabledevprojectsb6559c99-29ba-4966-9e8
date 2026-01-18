import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Phone, Mail, Dog, Cat, Edit, Trash2, Scissors, Droplets, MapPin, Truck, Loader2, TrendingUp, PawPrint, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  zip_code: string | null;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
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

// Logistics type options
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
  // Client form state
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
        toast({
          title: "Endereço encontrado!",
          description: `${result.logradouro}, ${result.bairro}`,
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado.",
          variant: "destructive",
        });
      }
    }
  };

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
        zip_code: clientForm.zip_code || null,
        address: clientForm.address || null,
        address_number: clientForm.address_number || null,
        address_complement: clientForm.address_complement || null,
        neighborhood: clientForm.neighborhood || null,
        city: clientForm.city || null,
        state: clientForm.state || null,
      } as any)
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

    setClientForm({ name: '', whatsapp: '', email: '', zip_code: '', address: '', address_number: '', address_complement: '', neighborhood: '', city: '', state: '' });
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
    // Address fields
    useClientAddress: true,
    zip_code: '',
    address: '',
    neighborhood: '',
    logistics_type: 'tutor_tutor',
    pickup_time: '',
    delivery_time: '',
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
  const [isLoadingPetCep, setIsLoadingPetCep] = useState(false);
  
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

  // CEP lookup for pet
  const handlePetCepLookup = async (cep: string) => {
    const formattedCep = formatCep(cep);
    setPetForm(prev => ({ ...prev, zip_code: formattedCep }));
    
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsLoadingPetCep(true);
      const result = await lookupCep(cleanCep);
      setIsLoadingPetCep(false);
      
      if (result) {
        setPetForm(prev => ({
          ...prev,
          address: result.logradouro,
          neighborhood: result.bairro,
        }));
        toast({
          title: "Endereço encontrado!",
          description: `${result.logradouro}, ${result.bairro}`,
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado.",
          variant: "destructive",
        });
      }
    }
  };

  // Get selected client address for pet
  const getSelectedClientAddress = () => {
    if (!petForm.clientId) return null;
    const client = clients.find(c => c.id === petForm.clientId);
    if (!client || !client.address) return null;
    return {
      address: client.address,
      neighborhood: client.neighborhood,
      city: client.city,
      state: client.state,
      zip_code: client.zip_code,
    };
  };

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
      const petDataCast = petData as any;
      const hasPetAddress = petDataCast.address || petDataCast.zip_code;
      
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
        useClientAddress: !hasPetAddress,
        zip_code: petDataCast.zip_code || '',
        address: petDataCast.address || '',
        neighborhood: petDataCast.neighborhood || '',
        logistics_type: petDataCast.logistics_type || 'tutor_tutor',
        pickup_time: petDataCast.pickup_time || '',
        delivery_time: petDataCast.delivery_time || '',
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
      // Get address data - use client address if useClientAddress is true
      let addressData = {
        zip_code: null as string | null,
        address: null as string | null,
        neighborhood: null as string | null,
      };
      
      if (petForm.useClientAddress) {
        const clientAddress = getSelectedClientAddress();
        if (clientAddress) {
          addressData = {
            zip_code: clientAddress.zip_code || null,
            address: clientAddress.address || null,
            neighborhood: clientAddress.neighborhood || null,
          };
        }
      } else {
        addressData = {
          zip_code: petForm.zip_code || null,
          address: petForm.address || null,
          neighborhood: petForm.neighborhood || null,
        };
      }

      // Validate: cannot enable company logistics without address
      const requiresAddress = petForm.logistics_type !== 'tutor_tutor';
      if (requiresAddress && !addressData.address) {
        toast({
          title: "Endereço obrigatório",
          description: "Para logística da empresa, é necessário ter endereço completo.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

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
        zip_code: addressData.zip_code,
        address: addressData.address,
        neighborhood: addressData.neighborhood,
        logistics_type: petForm.logistics_type,
        pickup_time: petForm.pickup_time || null,
        delivery_time: petForm.delivery_time || null,
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
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="dados">Dados</TabsTrigger>
                    <TabsTrigger value="servicos">Serviços</TabsTrigger>
                    <TabsTrigger value="logistica">🚗 Logística</TabsTrigger>
                    <TabsTrigger value="caderneta">🩺 Saúde</TabsTrigger>
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
                            <SelectItem value="curto">Pelo curto</SelectItem>
                            <SelectItem value="medio">Pelo médio</SelectItem>
                            <SelectItem value="longo">Pelo longo</SelectItem>
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
                  
                  {/* Tab: Logística */}
                  <TabsContent value="logistica" className="space-y-4 mt-4">
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-muted-foreground">
                        Configure o endereço e opções de busca e entrega para este pet.
                      </p>
                    </div>
                    
                    {/* Address Selection */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Label className="font-medium">Usar endereço do cliente</Label>
                          <p className="text-xs text-muted-foreground">
                            {(() => {
                              const clientAddr = getSelectedClientAddress();
                              return clientAddr?.address 
                                ? `${clientAddr.address}, ${clientAddr.neighborhood}` 
                                : 'Cliente sem endereço cadastrado';
                            })()}
                          </p>
                        </div>
                        <Switch 
                          checked={petForm.useClientAddress}
                          onCheckedChange={(checked) => {
                            setPetForm(prev => ({ ...prev, useClientAddress: checked }));
                            if (checked) {
                              // Clear pet-specific address
                              setPetForm(prev => ({ ...prev, zip_code: '', address: '', neighborhood: '' }));
                            }
                          }}
                          disabled={!petForm.clientId}
                        />
                      </div>
                      
                      {!petForm.useClientAddress && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3 p-4 border rounded-lg"
                        >
                          <Label className="flex items-center gap-2 font-semibold">
                            <MapPin className="w-4 h-4" />
                            Endereço diferente para este pet
                          </Label>
                          
                          <div>
                            <Label>CEP</Label>
                            <div className="relative">
                              <Input 
                                placeholder="00000-000" 
                                value={petForm.zip_code}
                                onChange={(e) => handlePetCepLookup(e.target.value)}
                                maxLength={9}
                              />
                              {isLoadingPetCep && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <Label>Logradouro</Label>
                            <Input 
                              placeholder="Rua, Avenida..." 
                              value={petForm.address}
                              onChange={(e) => setPetForm(prev => ({ ...prev, address: e.target.value }))}
                            />
                          </div>
                          
                          <div>
                            <Label>Bairro</Label>
                            <Input 
                              placeholder="Bairro" 
                              value={petForm.neighborhood}
                              onChange={(e) => setPetForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                    
                    {/* Logistics Type */}
                    <div className="border-t pt-4 mt-4">
                      <div className="mb-4">
                        <Label className="flex items-center gap-2 text-base font-semibold mb-3">
                          <Truck className="w-5 h-5 text-primary" />
                          Tipo de Logística *
                        </Label>
                        <Select 
                          value={petForm.logistics_type}
                          onValueChange={(value) => {
                            // Check if address exists for company logistics
                            const requiresAddress = value !== 'tutor_tutor';
                            const hasAddress = petForm.useClientAddress 
                              ? !!getSelectedClientAddress()?.address 
                              : !!petForm.address;
                            
                            if (requiresAddress && !hasAddress) {
                              toast({
                                title: "Endereço necessário",
                                description: "Cadastre um endereço antes de selecionar logística da empresa.",
                                variant: "destructive",
                              });
                              return;
                            }
                            setPetForm(prev => ({ ...prev, logistics_type: value }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de logística" />
                          </SelectTrigger>
                          <SelectContent>
                            {LOGISTICS_TYPES.map(lt => (
                              <SelectItem key={lt.value} value={lt.value}>
                                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${lt.color}`}></span>
                                {lt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">
                          Define quem leva e busca o pet no serviço.
                        </p>
                      </div>
                      
                      {/* Time fields - show if company is involved */}
                      {petForm.logistics_type !== 'tutor_tutor' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <Label>Horário de Chegada</Label>
                            <Input 
                              type="time" 
                              value={petForm.pickup_time}
                              onChange={(e) => setPetForm(prev => ({ ...prev, pickup_time: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Quando o pet chega</p>
                          </div>
                          <div>
                            <Label>Horário de Saída</Label>
                            <Input 
                              type="time" 
                              value={petForm.delivery_time}
                              onChange={(e) => setPetForm(prev => ({ ...prev, delivery_time: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Quando o pet sai</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Tab: Carteirinha de Saúde */}
                  <TabsContent value="caderneta" className="space-y-4 mt-4">
                    {editingPetId ? (
                      <VaccineBooklet petId={editingPetId} petName={petForm.name} />
                    ) : (
                      <div className="bg-muted/50 rounded-lg p-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          A carteirinha de saúde estará disponível após salvar o pet pela primeira vez.
                        </p>
                      </div>
                    )}
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
              if (!open) setClientForm({ name: '', whatsapp: '', email: '', zip_code: '', address: '', address_number: '', address_complement: '', neighborhood: '', city: '', state: '' });
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
                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <Label>Nome Completo *</Label>
                    <Input 
                      placeholder="Ex: Maria Silva" 
                      value={clientForm.name}
                      onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>WhatsApp *</Label>
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
                  
                  {/* Address Section */}
                  <div className="border-t pt-4 mt-4">
                    <Label className="flex items-center gap-2 mb-3 text-base font-semibold">
                      <MapPin className="w-4 h-4" />
                      Endereço
                    </Label>
                    
                    <div className="space-y-3">
                      <div>
                        <Label>CEP</Label>
                        <div className="relative">
                          <Input 
                            placeholder="00000-000" 
                            value={clientForm.zip_code}
                            onChange={(e) => handleClientCepLookup(e.target.value)}
                            maxLength={9}
                          />
                          {isLoadingCep && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Digite o CEP para buscar o endereço automaticamente
                        </p>
                      </div>
                      
                      <div>
                        <Label>Logradouro</Label>
                        <Input 
                          placeholder="Rua, Avenida..." 
                          value={clientForm.address}
                          onChange={(e) => setClientForm(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Número</Label>
                          <Input 
                            placeholder="123" 
                            value={clientForm.address_number}
                            onChange={(e) => setClientForm(prev => ({ ...prev, address_number: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Complemento</Label>
                          <Input 
                            placeholder="Apto, Bloco..." 
                            value={clientForm.address_complement}
                            onChange={(e) => setClientForm(prev => ({ ...prev, address_complement: e.target.value }))}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Bairro</Label>
                        <Input 
                          placeholder="Bairro" 
                          value={clientForm.neighborhood}
                          onChange={(e) => setClientForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Cidade</Label>
                          <Input 
                            placeholder="Cidade" 
                            value={clientForm.city}
                            onChange={(e) => setClientForm(prev => ({ ...prev, city: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Estado</Label>
                          <Input 
                            placeholder="UF" 
                            value={clientForm.state}
                            onChange={(e) => setClientForm(prev => ({ ...prev, state: e.target.value }))}
                            maxLength={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-gradient-primary hover:opacity-90"
                    onClick={handleSaveClient}
                    disabled={isLoading || isLoadingCep}
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
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">{client.name}</h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingClient({ id: client.id, name: client.name });
                              }}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                          </div>
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
                            {client.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {client.address}{client.address_number ? `, ${client.address_number}` : ''} - {client.neighborhood || client.city}
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
                              className="flex flex-col gap-1 bg-muted px-3 py-2 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <span>{pet.species === 'cachorro' ? '🐕' : pet.species === 'gato' ? '🐈' : '🐾'}</span>
                                <span className="text-sm font-medium">{pet.name}</span>
                                {pet.birth_date && (
                                  <Badge variant="outline" className="text-xs" title={format(new Date(pet.birth_date), 'dd/MM/yyyy')}>
                                    {(() => {
                                      const birth = new Date(pet.birth_date);
                                      const today = new Date();
                                      let years = today.getFullYear() - birth.getFullYear();
                                      let months = today.getMonth() - birth.getMonth();
                                      if (months < 0) { years--; months += 12; }
                                      if (years > 0) return `${years}a`;
                                      return `${months}m`;
                                    })()}
                                  </Badge>
                                )}
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
                              </div>
                              {(pet as any).allergies && (
                                <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="truncate max-w-[200px]" title={(pet as any).allergies}>
                                    {(pet as any).allergies}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 mt-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-primary hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickEditPet({ id: pet.id, name: pet.name });
                                  }}
                                  title="Editar dados básicos (nome, raça, nascimento, alergias)"
                                >
                                  <PawPrint className="w-3 h-3 mr-1" />
                                  Dados
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-muted-foreground hover:bg-muted"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditPet(pet.id);
                                  }}
                                  title="Editar cadastro completo"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Completo
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBillingClient({ id: client.id, name: client.name });
                          }}
                        >
                          <TrendingUp className="w-4 h-4 mr-1" />
                          Faturamento
                        </Button>
                        
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Client Billing Dialog */}
      <ClientBillingDialog
        open={!!billingClient}
        onOpenChange={(open) => !open && setBillingClient(null)}
        clientId={billingClient?.id || ''}
        clientName={billingClient?.name || ''}
      />

      {/* Client Edit Dialog */}
      <ClientEditDialog
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        clientId={editingClient?.id || ''}
        onSuccess={() => {
          fetchClients();
          setEditingClient(null);
        }}
      />

      {/* Pet Quick Edit Dialog (Nome, Raça, Idade, Alergias) */}
      <PetEditDialog
        petId={quickEditPet?.id || null}
        petName={quickEditPet?.name || ''}
        isOpen={!!quickEditPet}
        onClose={() => setQuickEditPet(null)}
        onSaved={() => {
          fetchPets();
        }}
      />
    </div>
  );
};

export default Clientes;