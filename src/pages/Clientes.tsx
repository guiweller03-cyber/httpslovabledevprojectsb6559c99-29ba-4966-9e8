import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Phone, Mail, Dog, Cat, Edit, Trash2, Scissors, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { mockClients, mockPets, dogBreeds, catBreeds, getBreedsBySpecies } from '@/data/mockData';
import { Client, Pet, FurType, Species, PetSize, PreferredService, GroomingType, BreedInfo } from '@/types';

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
  tosa_higienica: 'Tosa Higiênica',
  tosa_tesoura: 'Tosa na Tesoura',
  tosa_maquina: 'Tosa na Máquina',
  tosa_bebe: 'Tosa Bebê',
  tosa_padrao_raca: 'Tosa Padrão da Raça',
  sem_preferencia: 'Sem Preferência',
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

const Clientes = () => {
  const [clients] = useState<Client[]>(mockClients);
  const [pets, setPets] = useState<Pet[]>(mockPets);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isPetDialogOpen, setIsPetDialogOpen] = useState(false);
  
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

  const getClientPets = (clientId: string) => pets.filter(p => p.clientId === clientId);

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
    });
    setAvailableBreeds([]);
    setIsSRD(false);
  };

  const handleSavePet = async () => {
    // Validation
    if (!petForm.clientId || !petForm.name || !petForm.species || !petForm.breed || !petForm.size || !petForm.furType) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const client = clients.find(c => c.id === petForm.clientId);
    
    const newPet: Pet = {
      id: String(Date.now()),
      clientId: petForm.clientId,
      name: petForm.name,
      species: petForm.species as Species,
      breed: petForm.breed,
      size: petForm.size as PetSize,
      furType: petForm.furType as FurType,
      weight: petForm.weight ? parseFloat(petForm.weight) : undefined,
      preferredService: petForm.preferredService as PreferredService || undefined,
      groomingType: petForm.groomingType as GroomingType || undefined,
    };

    setPets(prev => [...prev, newPet]);

    // Trigger webhook for new pet
    await triggerWebhook('novo_pet', {
      cliente: client?.name,
      clienteWhatsapp: client?.whatsapp,
      pet: newPet.name,
      raca: newPet.breed,
      porte: newPet.size,
      tipoPelo: newPet.furType,
      tipoServico: newPet.preferredService,
      tipoTosa: newPet.groomingType,
    });

    // If service preferences were defined, trigger additional webhook
    if (newPet.preferredService) {
      await triggerWebhook('preferencia_servico_definida', {
        cliente: client?.name,
        pet: newPet.name,
        tipoServico: newPet.preferredService,
        tipoTosa: newPet.groomingType,
      });
    }

    toast({
      title: "Pet cadastrado!",
      description: `${newPet.name} foi cadastrado com sucesso.`,
    });

    resetPetForm();
    setIsPetDialogOpen(false);
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
                  <DialogTitle>Cadastrar Novo Pet</DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue="dados" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="dados">Dados do Pet</TabsTrigger>
                    <TabsTrigger value="servicos">Preferências de Serviço</TabsTrigger>
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
                </Tabs>
                
                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsPetDialogOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleSavePet} className="flex-1 bg-gradient-primary hover:opacity-90">
                    Cadastrar Pet
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
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
                    <Input placeholder="Ex: Maria Silva" />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input placeholder="Ex: 11999887766" />
                  </div>
                  <div>
                    <Label>Email (opcional)</Label>
                    <Input type="email" placeholder="Ex: maria@email.com" />
                  </div>
                  <Button className="w-full bg-gradient-primary hover:opacity-90">
                    Cadastrar Cliente
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
                                {sizeLabels[pet.size]}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {furTypeLabels[pet.furType]}
                              </Badge>
                              {pet.preferredService && (
                                <Badge className="text-xs bg-primary/20 text-primary">
                                  {pet.preferredService === 'banho_tosa' ? 'B+T' : 'Banho'}
                                </Badge>
                              )}
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