import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Dog, Edit, Phone, Mail, MapPin, AlertCircle, Package, CheckCircle, 
  Plus, Calendar, ShoppingCart, DollarSign, PawPrint, Scissors, Bath,
  ChevronRight, ExternalLink, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WhatsAppConversation } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ClientData {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

interface PetData {
  id: string;
  name: string;
  species: string;
  breed?: string;
  size?: string;
  weight?: number;
  coat_type?: string;
  preferred_service?: string;
}

interface ProductData {
  id: string;
  name: string;
  sale_price: number;
  stock_quantity: number | null;
  control_stock: boolean;
}

interface ContextPanelProps {
  conversation: WhatsAppConversation | null;
  onEditClient: () => void;
}

const ContextPanel = ({ conversation, onEditClient }: ContextPanelProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientData | null>(null);
  const [pets, setPets] = useState<PetData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (conversation?.clientWhatsapp) {
      loadClientData(conversation.clientWhatsapp);
      loadProducts();
    }
  }, [conversation?.clientWhatsapp]);

  const loadClientData = async (whatsapp: string) => {
    setLoading(true);
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('whatsapp', whatsapp)
        .single();

      if (clientData) {
        setClient(clientData as ClientData);

        const { data: petsData } = await supabase
          .from('pets')
          .select('*')
          .eq('client_id', clientData.id);

        setPets((petsData || []) as PetData[]);
      } else {
        const { data: newClient } = await supabase
          .from('clients')
          .insert({
            name: conversation?.clientName || 'Novo Contato',
            whatsapp: whatsapp,
          })
          .select()
          .single();

        if (newClient) {
          setClient(newClient as ClientData);
        }
        setPets([]);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, sale_price, stock_quantity, control_stock')
        .eq('active', true)
        .order('name')
        .limit(10);

      setProducts((data || []) as ProductData[]);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleAddToSale = (product: ProductData) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(product.id)) {
      newSelected.delete(product.id);
    } else {
      newSelected.add(product.id);
    }
    setSelectedProducts(newSelected);
    
    toast({
      title: newSelected.has(product.id) ? "✅ Produto adicionado" : "❌ Produto removido",
      description: product.name,
    });
  };

  const handleOpenPOS = () => {
    navigate('/frente-caixa');
    toast({
      title: "🛒 Abrindo Frente de Caixa",
      description: `${selectedProducts.size} produto(s) selecionados`,
    });
  };

  const handleScheduleService = () => {
    navigate('/banho-tosa');
    toast({
      title: "📅 Agendar Serviço",
      description: "Redirecionando para agenda...",
    });
  };

  const isRegistrationComplete = client && client.name && client.whatsapp && (client.address || client.email);

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground bg-gradient-to-b from-background to-muted/20 rounded-xl">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center p-6"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <User className="w-16 h-16 mx-auto mb-3 text-primary/20" />
          </motion.div>
          <p className="text-sm font-medium">Selecione uma conversa</p>
          <p className="text-xs text-muted-foreground mt-1">para ver os detalhes</p>
        </motion.div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-2"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 transition-all"
                  onClick={() => navigate('/clientes')}
                >
                  <Plus className="w-5 h-5 text-primary" />
                  <span className="text-xs">Cadastrar Pet</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Adicionar novo pet para este cliente</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1 bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20 hover:border-secondary/40 transition-all"
                  onClick={handleScheduleService}
                >
                  <Calendar className="w-5 h-5 text-secondary" />
                  <span className="text-xs">Agendar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Agendar banho/tosa</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1 bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 hover:border-accent/40 transition-all"
                  onClick={handleOpenPOS}
                >
                  <ShoppingCart className="w-5 h-5 text-accent" />
                  <span className="text-xs">Criar Venda</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir frente de caixa</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1 bg-gradient-to-br from-success/5 to-success/10 border-success/20 hover:border-success/40 transition-all"
                  onClick={handleOpenPOS}
                  disabled={selectedProducts.size === 0}
                >
                  <DollarSign className="w-5 h-5 text-success" />
                  <span className="text-xs">
                    Finalizar {selectedProducts.size > 0 && `(${selectedProducts.size})`}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir caixa com produtos selecionados</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>

        <Separator />

        {/* Client Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-muted/20 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 font-display">
                  <User className="w-4 h-4 text-primary" />
                  Dados do Cliente
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onEditClient}
                  className="h-7 w-7 p-0 rounded-full hover:bg-primary/10"
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </motion.div>
                  Carregando...
                </div>
              ) : client ? (
                <>
                  <div>
                    <p className="font-semibold text-base">{client.name}</p>
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                    >
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "mt-1.5 border-0",
                          isRegistrationComplete 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        )}
                      >
                        {isRegistrationComplete ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Cadastro Completo
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Cadastro Incompleto
                          </>
                        )}
                      </Badge>
                    </motion.div>
                  </div>
                  
                  <div className="space-y-1.5 text-sm">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      <span className="font-mono">{client.whatsapp}</span>
                    </p>
                    {client.email && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        {client.email}
                      </p>
                    )}
                    {client.address && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {client.address}
                        {client.neighborhood && `, ${client.neighborhood}`}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Cliente será criado automaticamente
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pets */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 font-display">
                  <PawPrint className="w-4 h-4 text-secondary" />
                  Pets ({pets.length})
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => navigate('/clientes')}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Novo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : pets.length > 0 ? (
                <div className="space-y-2">
                  <AnimatePresence>
                    {pets.map((pet, index) => (
                      <motion.div 
                        key={pet.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {pet.species === 'cachorro' ? '🐕' : pet.species === 'gato' ? '🐱' : '🐾'}
                              {pet.name}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                              {pet.breed && <p>{pet.breed}</p>}
                              <div className="flex gap-2 mt-1">
                                {pet.size && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {pet.size}
                                  </Badge>
                                )}
                                {pet.weight && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {pet.weight}kg
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 rounded-full"
                              onClick={handleScheduleService}
                            >
                              <Scissors className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Dog className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhum pet cadastrado</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="mt-1 h-auto p-0 text-primary"
                    onClick={() => navigate('/clientes')}
                  >
                    Cadastrar pet
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <Separator />

        {/* Products - Interactive with Add to Sale */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 font-display">
                  <Package className="w-4 h-4 text-accent" />
                  Produtos (Consulta IA)
                </CardTitle>
                {selectedProducts.size > 0 && (
                  <Badge className="bg-primary text-primary-foreground">
                    {selectedProducts.size} selecionados
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                IA pode consultar, mas não alterar
              </p>
              {products.length > 0 ? (
                <div className="space-y-1.5">
                  <AnimatePresence>
                    {products.map((product, index) => {
                      const isSelected = selectedProducts.has(product.id);
                      const hasStock = !product.control_stock || (product.stock_quantity || 0) > 0;
                      
                      return (
                        <motion.div 
                          key={product.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => hasStock && handleAddToSale(product)}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg text-sm cursor-pointer transition-all",
                            isSelected 
                              ? "bg-primary/10 border-2 border-primary shadow-sm" 
                              : "bg-muted/50 hover:bg-muted border-2 border-transparent",
                            !hasStock && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-medium truncate",
                              isSelected && "text-primary"
                            )}>
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              R$ {product.sale_price.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {product.control_stock ? (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[10px] border-0",
                                  (product.stock_quantity || 0) > 5 
                                    ? "bg-green-100 text-green-700" 
                                    : (product.stock_quantity || 0) > 0
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                )}
                              >
                                {product.stock_quantity || 0} un
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-0 bg-muted">
                                ∞
                              </Badge>
                            )}
                            {hasStock && (
                              <motion.div
                                animate={{ scale: isSelected ? [1, 1.2, 1] : 1 }}
                              >
                                <Plus className={cn(
                                  "w-4 h-4 transition-colors",
                                  isSelected ? "text-primary" : "text-muted-foreground"
                                )} />
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhum produto</p>
                </div>
              )}

              {selectedProducts.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 pt-3 border-t"
                >
                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-primary/80"
                    onClick={handleOpenPOS}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Abrir Caixa com {selectedProducts.size} produto(s)
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ScrollArea>
  );
};

export default ContextPanel;
