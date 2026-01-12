import { useEffect, useState } from 'react';
import { User, Dog, Edit, Phone, Mail, MapPin, AlertCircle, Package, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WhatsAppConversation } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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
  const [client, setClient] = useState<ClientData | null>(null);
  const [pets, setPets] = useState<PetData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (conversation?.clientWhatsapp) {
      loadClientData(conversation.clientWhatsapp);
      loadProducts();
    }
  }, [conversation?.clientWhatsapp]);

  const loadClientData = async (whatsapp: string) => {
    setLoading(true);
    try {
      // Fetch client
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('whatsapp', whatsapp)
        .single();

      if (clientData) {
        setClient(clientData as ClientData);

        // Fetch pets
        const { data: petsData } = await supabase
          .from('pets')
          .select('*')
          .eq('client_id', clientData.id);

        setPets((petsData || []) as PetData[]);
      } else {
        // Client not found - auto create
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

  const isRegistrationComplete = client && client.name && client.whatsapp && (client.address || client.email);

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Selecione uma conversa</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Client Info */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Dados do Cliente
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onEditClient}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : client ? (
              <>
                <div>
                  <p className="font-semibold">{client.name}</p>
                  <Badge 
                    variant="outline" 
                    className={isRegistrationComplete 
                      ? "bg-green-100 text-green-700 border-0 mt-1" 
                      : "bg-orange-100 text-orange-700 border-0 mt-1"
                    }
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
                </div>
                
                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    {client.whatsapp}
                  </p>
                  {client.email && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      {client.email}
                    </p>
                  )}
                  {client.address && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {client.address}
                      {client.neighborhood && `, ${client.neighborhood}`}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Cliente será criado automaticamente
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pets */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Dog className="w-4 h-4" />
              Pets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : pets.length > 0 ? (
              <div className="space-y-3">
                {pets.map((pet) => (
                  <div 
                    key={pet.id} 
                    className="p-3 bg-muted/50 rounded-lg"
                  >
                    <p className="font-medium">{pet.name}</p>
                    <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                      <p>
                        <span className="font-medium">Espécie:</span> {pet.species === 'cachorro' ? '🐕 Cachorro' : pet.species === 'gato' ? '🐱 Gato' : pet.species}
                      </p>
                      {pet.breed && (
                        <p>
                          <span className="font-medium">Raça:</span> {pet.breed}
                        </p>
                      )}
                      {pet.size && (
                        <p>
                          <span className="font-medium">Porte:</span> {pet.size}
                        </p>
                      )}
                      {pet.weight && (
                        <p>
                          <span className="font-medium">Peso:</span> {pet.weight} kg
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum pet cadastrado
              </p>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Products (Read-only for AI consultation) */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Estoque (Consulta IA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              A IA pode consultar estes produtos, mas não pode alterar.
            </p>
            {products.length > 0 ? (
              <div className="space-y-2">
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                  >
                    <div>
                      <p className="font-medium truncate max-w-[140px]">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {product.sale_price.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      {product.control_stock ? (
                        <Badge 
                          variant="outline" 
                          className={
                            (product.stock_quantity || 0) > 0 
                              ? "bg-green-100 text-green-700 border-0" 
                              : "bg-red-100 text-red-700 border-0"
                          }
                        >
                          {product.stock_quantity || 0} un
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-0 bg-muted text-muted-foreground">
                          Sem controle
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum produto cadastrado
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default ContextPanel;
