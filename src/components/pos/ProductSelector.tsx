import { useState, useEffect } from 'react';
import { Package, Search, Plus, Minus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  sale_price: number;
  stock_quantity: number;
  min_stock_quantity: number;
  unit: string;
  active: boolean;
  control_stock: boolean;
}

interface ProductSelectorProps {
  onSelectProduct: (product: Product, quantity: number) => void;
  trigger?: React.ReactNode;
}

const CATEGORY_LABELS: Record<string, string> = {
  racao: 'Ração',
  petisco: 'Petisco',
  higiene: 'Higiene',
  acessorio: 'Acessório',
  medicamento: 'Medicamento',
  outros: 'Outros',
};

export function ProductSelector({ onSelectProduct, trigger }: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any).from('products')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      const productsWithControl = (data || []).map((p: any) => ({
        ...p,
        control_stock: p.control_stock ?? false,
      }));
      
      setProducts(productsWithControl);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchProducts();
      setQuantities({});
      setSearchTerm('');
    }
  }, [open]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const newQty = Math.max(0, current + delta);
      return { ...prev, [productId]: newQty };
    });
  };

  const handleAddProduct = (product: Product) => {
    const quantity = quantities[product.id] || 1;
    onSelectProduct(product, quantity);
    setQuantities(prev => ({ ...prev, [product.id]: 0 }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Package className="w-4 h-4" />
            Adicionar Produto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Selecionar Produto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          {/* Products List */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Carregando produtos...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mb-2 opacity-50" />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((product) => {
                  const isLowStock = product.control_stock && product.stock_quantity <= product.min_stock_quantity;
                  const quantity = quantities[product.id] || 0;
                  const canSell = !product.control_stock || product.stock_quantity > 0;
                  
                  return (
                    <div
                      key={product.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-colors",
                        "hover:bg-muted/50",
                        !canSell && "opacity-50"
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {CATEGORY_LABELS[product.category] || product.category}
                          </Badge>
                          {isLowStock && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Baixo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {product.brand && <span>{product.brand}</span>}
                          <span className="font-semibold text-primary">
                            R$ {product.sale_price.toFixed(2)}
                          </span>
                          {product.control_stock && (
                            <span className={cn(isLowStock && "text-yellow-600")}>
                              Estoque: {product.stock_quantity} {product.unit}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Quantity Selector */}
                        <div className="flex items-center gap-1 bg-muted rounded-lg">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(product.id, -1)}
                            disabled={quantity <= 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {quantity || 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(product.id, 1)}
                            disabled={product.control_stock && (quantity || 1) >= product.stock_quantity}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => handleAddProduct(product)}
                          disabled={!canSell}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
