import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Loader2, User, Phone, FileText, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { lookupCep, formatCep } from '@/lib/cepLookup';
import { z } from 'zod';

// Validation schema
const clientSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  whatsapp: z.string().trim().min(10, 'Telefone inválido').max(15, 'Telefone muito longo').regex(/^\d+$/, 'Apenas números'),
  email: z.string().trim().email('Email inválido').optional().or(z.literal('')),
  zip_code: z.string().optional(),
  address: z.string().max(200, 'Endereço muito longo').optional(),
  address_number: z.string().max(20, 'Número muito longo').optional(),
  address_complement: z.string().max(100, 'Complemento muito longo').optional(),
  neighborhood: z.string().max(100, 'Bairro muito longo').optional(),
  city: z.string().max(100, 'Cidade muito longa').optional(),
  state: z.string().max(2, 'UF inválida').optional(),
  notes: z.string().max(500, 'Observações muito longas').optional(),
});

interface ClientEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess?: () => void;
}

interface ClientFormData {
  name: string;
  whatsapp: string;
  email: string;
  zip_code: string;
  address: string;
  address_number: string;
  address_complement: string;
  neighborhood: string;
  city: string;
  state: string;
  notes: string;
}

const initialFormData: ClientFormData = {
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
  notes: '',
};

export const ClientEditDialog = ({ open, onOpenChange, clientId, onSuccess }: ClientEditDialogProps) => {
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [originalData, setOriginalData] = useState<ClientFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Load client data when dialog opens
  useEffect(() => {
    if (open && clientId) {
      loadClientData();
    }
  }, [open, clientId]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [formData, originalData]);

  const loadClientData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;

      const clientData: ClientFormData = {
        name: data.name || '',
        whatsapp: data.whatsapp || '',
        email: data.email || '',
        zip_code: data.zip_code || '',
        address: data.address || '',
        address_number: data.address_number || '',
        address_complement: data.address_complement || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || '',
        notes: '', // Notes field - we'll add this to DB if needed
      };

      setFormData(clientData);
      setOriginalData(clientData);
      setErrors({});
    } catch (error: any) {
      console.error('Erro ao carregar cliente:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message || 'Não foi possível carregar os dados do cliente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCepLookup = async (cep: string) => {
    const formattedCep = formatCep(cep);
    setFormData(prev => ({ ...prev, zip_code: formattedCep }));
    
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      const result = await lookupCep(cleanCep);
      setIsLoadingCep(false);
      
      if (result) {
        setFormData(prev => ({
          ...prev,
          address: result.logradouro,
          neighborhood: result.bairro,
          city: result.localidade,
          state: result.uf,
        }));
        toast({
          title: 'Endereço encontrado!',
          description: `${result.logradouro}, ${result.bairro}`,
        });
      } else {
        toast({
          title: 'CEP não encontrado',
          description: 'Verifique o CEP digitado.',
          variant: 'destructive',
        });
      }
    }
  };

  const validateForm = (): boolean => {
    try {
      clientSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: 'Campos inválidos',
        description: 'Verifique os campos destacados em vermelho.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name.trim(),
          whatsapp: formData.whatsapp.trim(),
          email: formData.email.trim() || null,
          zip_code: formData.zip_code || null,
          address: formData.address || null,
          address_number: formData.address_number || null,
          address_complement: formData.address_complement || null,
          neighborhood: formData.neighborhood || null,
          city: formData.city || null,
          state: formData.state || null,
        })
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: 'Cliente atualizado!',
        description: `${formData.name} foi atualizado com sucesso.`,
      });

      setOriginalData(formData);
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
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
      // Reset to original data
      setFormData(originalData);
      setErrors({});
    }
    onOpenChange(false);
  };

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Editar Cliente
          </DialogTitle>
          <DialogDescription>
            Atualize as informações do cliente. Campos com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-4"
          >
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome Completo *
              </Label>
              <Input
                id="name"
                placeholder="Ex: Maria Silva"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`transition-all ${errors.name ? 'border-destructive ring-1 ring-destructive' : 'focus:ring-2 focus:ring-primary/20'}`}
              />
              {errors.name && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                WhatsApp *
              </Label>
              <Input
                id="whatsapp"
                placeholder="Ex: 11999887766"
                value={formData.whatsapp}
                onChange={(e) => handleInputChange('whatsapp', e.target.value.replace(/\D/g, ''))}
                className={`transition-all ${errors.whatsapp ? 'border-destructive ring-1 ring-destructive' : 'focus:ring-2 focus:ring-primary/20'}`}
              />
              {errors.whatsapp && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.whatsapp}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ex: maria@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`transition-all ${errors.email ? 'border-destructive ring-1 ring-destructive' : 'focus:ring-2 focus:ring-primary/20'}`}
              />
              {errors.email && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Address Section */}
            <div className="border-t pt-4 mt-4">
              <Label className="flex items-center gap-2 mb-3 text-base font-semibold">
                <MapPin className="w-4 h-4" />
                Endereço
              </Label>

              <div className="space-y-3">
                {/* CEP */}
                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  <div className="relative">
                    <Input
                      id="zip_code"
                      placeholder="00000-000"
                      value={formData.zip_code}
                      onChange={(e) => handleCepLookup(e.target.value)}
                      maxLength={9}
                      className="focus:ring-2 focus:ring-primary/20"
                    />
                    {isLoadingCep && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Digite o CEP para buscar o endereço automaticamente
                  </p>
                </div>

                {/* Street */}
                <div className="space-y-2">
                  <Label htmlFor="address">Logradouro</Label>
                  <Input
                    id="address"
                    placeholder="Rua, Avenida..."
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Number and Complement */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="address_number">Número</Label>
                    <Input
                      id="address_number"
                      placeholder="123"
                      value={formData.address_number}
                      onChange={(e) => handleInputChange('address_number', e.target.value)}
                      className="focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address_complement">Complemento</Label>
                    <Input
                      id="address_complement"
                      placeholder="Apto, Bloco..."
                      value={formData.address_complement}
                      onChange={(e) => handleInputChange('address_complement', e.target.value)}
                      className="focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Neighborhood */}
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    placeholder="Bairro"
                    value={formData.neighborhood}
                    onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                    className="focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* City and State */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      placeholder="Cidade"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      placeholder="UF"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                      maxLength={2}
                      className="focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t pt-4 mt-4 space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Observações (opcional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Anotações sobre o cliente..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="focus:ring-2 focus:ring-primary/20 resize-none"
              />
              {errors.notes && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.notes}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.notes.length}/500 caracteres
              </p>
            </div>

            {/* Change indicator */}
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400"
              >
                <AlertCircle className="w-4 h-4" />
                Você tem alterações não salvas.
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};
