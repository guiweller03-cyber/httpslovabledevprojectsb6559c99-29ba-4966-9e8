import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PawPrint, AlertTriangle } from 'lucide-react';
import { getBreedsBySpecies } from '@/data/mockData';
import { Species, BreedInfo } from '@/types';

interface PetEditDialogProps {
  petId: string | null;
  petName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface PetFormData {
  name: string;
  species: string;
  breed: string;
  age: string;
  allergies: string;
}

export function PetEditDialog({ petId, petName, isOpen, onClose, onSaved }: PetEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [availableBreeds, setAvailableBreeds] = useState<BreedInfo[]>([]);
  
  const [formData, setFormData] = useState<PetFormData>({
    name: '',
    species: '',
    breed: '',
    age: '',
    allergies: '',
  });
  
  const [originalData, setOriginalData] = useState<PetFormData>({
    name: '',
    species: '',
    breed: '',
    age: '',
    allergies: '',
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof PetFormData, string>>>({});

  // Fetch pet data when dialog opens
  useEffect(() => {
    if (isOpen && petId) {
      fetchPetData();
    }
  }, [isOpen, petId]);

  // Update breeds when species changes
  useEffect(() => {
    if (formData.species) {
      setAvailableBreeds(getBreedsBySpecies(formData.species as Species));
    }
  }, [formData.species]);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [formData, originalData]);

  const fetchPetData = async () => {
    if (!petId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('name, species, breed, age, allergies')
        .eq('id', petId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        const petData = data as any;
        const formValues: PetFormData = {
          name: petData.name || '',
          species: petData.species || '',
          breed: petData.breed || '',
          age: petData.age?.toString() || '',
          allergies: petData.allergies || '',
        };
        
        setFormData(formValues);
        setOriginalData(formValues);
        
        // Load breeds for the species
        if (petData.species) {
          setAvailableBreeds(getBreedsBySpecies(petData.species as Species));
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar pet:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados do pet.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PetFormData, string>> = {};
    
    // Name is required
    if (!formData.name.trim()) {
      newErrors.name = 'Nome do pet é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Nome muito longo (máx. 50 caracteres)';
    }
    
    // Age validation (optional but must be valid if provided)
    if (formData.age) {
      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 0) {
        newErrors.age = 'Idade deve ser um número válido';
      } else if (ageNum > 30) {
        newErrors.age = 'Idade parece incorreta (máx. 30 anos)';
      }
    }
    
    // Allergies validation (optional)
    if (formData.allergies && formData.allergies.length > 500) {
      newErrors.allergies = 'Informações de alergia muito longas (máx. 500 caracteres)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !petId) return;
    
    setIsSaving(true);
    try {
      const updateData: any = {
        name: formData.name.trim(),
        species: formData.species || null,
        breed: formData.breed || null,
        age: formData.age ? parseInt(formData.age) : null,
        allergies: formData.allergies.trim() || null,
      };
      
      const { error } = await supabase
        .from('pets')
        .update(updateData)
        .eq('id', petId);
      
      if (error) throw error;
      
      toast({
        title: 'Pet atualizado!',
        description: `Os dados de ${formData.name} foram salvos com sucesso.`,
      });
      
      setOriginalData(formData);
      setHasChanges(false);
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar pet:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja descartar?');
      if (!confirmed) return;
    }
    setFormData(originalData);
    setErrors({});
    onClose();
  };

  const handleFieldChange = (field: keyof PetFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-primary" />
            Editar Pet
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando dados...</span>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Pet Name */}
            <div className="space-y-2">
              <Label htmlFor="pet-name" className="flex items-center gap-1">
                Nome do Pet <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pet-name"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Ex: Thor"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            
            {/* Species and Breed */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pet-species">Espécie</Label>
                <Select
                  value={formData.species}
                  onValueChange={(value) => {
                    handleFieldChange('species', value);
                    handleFieldChange('breed', ''); // Reset breed when species changes
                  }}
                >
                  <SelectTrigger id="pet-species">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cachorro">Cachorro</SelectItem>
                    <SelectItem value="gato">Gato</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pet-breed">Raça</Label>
                <Select
                  value={formData.breed}
                  onValueChange={(value) => handleFieldChange('breed', value)}
                  disabled={!formData.species}
                >
                  <SelectTrigger id="pet-breed">
                    <SelectValue placeholder="Selecione" />
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
            
            {/* Age */}
            <div className="space-y-2">
              <Label htmlFor="pet-age">Idade (anos)</Label>
              <Input
                id="pet-age"
                type="number"
                min="0"
                max="30"
                value={formData.age}
                onChange={(e) => handleFieldChange('age', e.target.value)}
                placeholder="Ex: 3"
                className={errors.age ? 'border-destructive' : ''}
              />
              {errors.age && (
                <p className="text-sm text-destructive">{errors.age}</p>
              )}
            </div>
            
            {/* Allergies */}
            <div className="space-y-2">
              <Label htmlFor="pet-allergies" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Informações de Alergia
              </Label>
              <Textarea
                id="pet-allergies"
                value={formData.allergies}
                onChange={(e) => handleFieldChange('allergies', e.target.value)}
                placeholder="Descreva alergias conhecidas, sensibilidades ou restrições..."
                rows={3}
                className={errors.allergies ? 'border-destructive' : ''}
              />
              {errors.allergies && (
                <p className="text-sm text-destructive">{errors.allergies}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Opcional. Inclua alergias a medicamentos, produtos ou alimentos.
              </p>
            </div>
            
            {/* Unsaved changes indicator */}
            {hasChanges && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-950/20 px-3 py-2 rounded-md">
                <AlertTriangle className="w-4 h-4" />
                Você tem alterações não salvas
              </div>
            )}
          </div>
        )}
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
