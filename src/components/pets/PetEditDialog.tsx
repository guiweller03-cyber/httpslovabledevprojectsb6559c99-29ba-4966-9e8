import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PawPrint, AlertTriangle, CalendarIcon, FileText } from 'lucide-react';
import { getBreedsBySpecies } from '@/data/mockData';
import { Species, BreedInfo } from '@/types';
import { format, isAfter, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  birthDate: Date | undefined;
  observations: string;
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
    birthDate: undefined,
    observations: '',
  });
  
  const [originalData, setOriginalData] = useState<PetFormData>({
    name: '',
    species: '',
    breed: '',
    birthDate: undefined,
    observations: '',
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
    const formStr = JSON.stringify({
      ...formData,
      birthDate: formData.birthDate?.toISOString() || null
    });
    const origStr = JSON.stringify({
      ...originalData,
      birthDate: originalData.birthDate?.toISOString() || null
    });
    setHasChanges(formStr !== origStr);
  }, [formData, originalData]);

  const fetchPetData = async () => {
    if (!petId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('name, species, breed, birth_date, allergies')
        .eq('id', petId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        const petData = data as any;
        let birthDate: Date | undefined;
        
        if (petData.birth_date) {
          const parsed = parseISO(petData.birth_date);
          if (isValid(parsed)) {
            birthDate = parsed;
          }
        }
        
        const formValues: PetFormData = {
          name: petData.name || '',
          species: petData.species || '',
          breed: petData.breed || '',
          birthDate,
          observations: petData.allergies || '',
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
    
    // Birth date validation (not in the future)
    if (formData.birthDate && isAfter(formData.birthDate, new Date())) {
      newErrors.birthDate = 'Data de nascimento não pode ser no futuro';
    }
    
    // Observations validation (optional)
    if (formData.observations && formData.observations.length > 500) {
      newErrors.observations = 'Observações muito longas (máx. 500 caracteres)';
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
        birth_date: formData.birthDate ? format(formData.birthDate, 'yyyy-MM-dd') : null,
        allergies: formData.observations.trim() || null,
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

  const handleFieldChange = (field: keyof PetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Calculate age from birth date for display
  const getAgeDisplay = () => {
    if (!formData.birthDate) return null;
    
    const today = new Date();
    const birth = formData.birthDate;
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years > 0) {
      return `${years} ano${years > 1 ? 's' : ''}${months > 0 ? ` e ${months} mês${months > 1 ? 'es' : ''}` : ''}`;
    } else if (months > 0) {
      return `${months} mês${months > 1 ? 'es' : ''}`;
    } else {
      const days = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} dia${days !== 1 ? 's' : ''}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-primary" />
            Editar Pet - Cadastro Completo
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
            
            {/* Birth Date with Calendar Picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Data de Nascimento
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.birthDate && "text-muted-foreground",
                      errors.birthDate && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.birthDate ? (
                      format(formData.birthDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione a data de nascimento</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.birthDate}
                    onSelect={(date) => handleFieldChange('birthDate', date)}
                    disabled={(date) => isAfter(date, new Date())}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                    captionLayout="dropdown-buttons"
                    fromYear={2000}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
              {errors.birthDate && (
                <p className="text-sm text-destructive">{errors.birthDate}</p>
              )}
              {formData.birthDate && (
                <p className="text-xs text-muted-foreground">
                  Idade calculada: {getAgeDisplay()}
                </p>
              )}
            </div>
            
            {/* Observations */}
            <div className="space-y-2">
              <Label htmlFor="pet-observations">
                Observações
              </Label>
              <Textarea
                id="pet-observations"
                value={formData.observations}
                onChange={(e) => handleFieldChange('observations', e.target.value)}
                placeholder="Ex: Alergia"
                rows={3}
                className={errors.observations ? 'border-destructive' : ''}
              />
              {errors.observations && (
                <p className="text-sm text-destructive">{errors.observations}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Opcional. Inclua alergias, sensibilidades ou outras notas importantes.
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