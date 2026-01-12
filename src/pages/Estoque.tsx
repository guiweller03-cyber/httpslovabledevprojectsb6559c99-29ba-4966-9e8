import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Search, Edit, Trash2, AlertTriangle, ArrowUpDown, BarChart3, ImagePlus, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Categories
const CATEGORIES = [
  { value: 'racao', label: 'Ração' },
  { value: 'petisco', label: 'Petisco' },
  { value: 'higiene', label: 'Higiene' },
  { value: 'acessorio', label: 'Acessório' },
  { value: 'medicamento', label: 'Medicamento' },
  { value: 'outros', label: 'Outros' },
];

const UNITS = [
  { value: 'un', label: 'Unidade' },
  { value: 'kg', label: 'Quilograma' },
  { value: 'pct', label: 'Pacote' },
  { value: 'cx', label: 'Caixa' },
];

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock_quantity: number;
  unit: string;
  active: boolean;
  control_stock: boolean;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface StockMovement {
  id: string;
  product_id: string;
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  reason: string | null;
  created_at: string;
  performed_by: string | null;
}

const initialProductForm = {
  name: '',
  description: '',
  category: 'outros',
  brand: '',
  sku: '',
  barcode: '',
  cost_price: '',
  sale_price: '',
  stock_quantity: '0',
  min_stock_quantity: '5',
  unit: 'un',
  active: true,
  control_stock: false,
  photo_url: '',
};

const Estoque = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<Product | null>(null);
  
  const [productForm, setProductForm] = useState(initialProductForm);
  const [movementForm, setMovementForm] = useState({
    type: 'entrada' as 'entrada' | 'saida' | 'ajuste',
    quantity: '',
    reason: '',
  });

  // Fetch products
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase.from('products') as any)
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      // Add control_stock field if not exists (default true for products with stock > 0)
      const productsWithControl = (data || []).map((p: any) => ({
        ...p,
        control_stock: p.control_stock ?? (p.stock_quantity > 0),
      }));
      
      setProducts(productsWithControl);
    } catch (error: any) {
      console.error('Erro ao carregar produtos:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch movements for a product
  const fetchMovements = async (productId: string) => {
    try {
      const { data, error } = await (supabase as any).from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setMovements(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar movimentações:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm);
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesLowStock = !showLowStock || (p.control_stock && p.stock_quantity <= p.min_stock_quantity);
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Low stock count
  const lowStockCount = products.filter(p => 
    p.control_stock && p.stock_quantity <= p.min_stock_quantity
  ).length;

  // Open product dialog for edit
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      category: product.category,
      brand: product.brand || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      cost_price: product.cost_price?.toString() || '',
      sale_price: product.sale_price.toString(),
      stock_quantity: product.stock_quantity?.toString() || '0',
      min_stock_quantity: product.min_stock_quantity?.toString() || '5',
      unit: product.unit || 'un',
      active: product.active ?? true,
      control_stock: product.control_stock ?? false,
      photo_url: product.photo_url || '',
    });
    setIsProductDialogOpen(true);
  };

  // Reset form
  const resetProductForm = () => {
    setProductForm(initialProductForm);
    setEditingProduct(null);
  };

  // Save product
  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.sale_price) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e preço de venda.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const productData = {
        name: productForm.name,
        description: productForm.description || null,
        category: productForm.category,
        brand: productForm.brand || null,
        sku: productForm.sku || null,
        barcode: productForm.barcode || null,
        cost_price: parseFloat(productForm.cost_price) || 0,
        sale_price: parseFloat(productForm.sale_price),
        stock_quantity: parseInt(productForm.stock_quantity) || 0,
        min_stock_quantity: parseInt(productForm.min_stock_quantity) || 5,
        unit: productForm.unit,
        active: productForm.active,
        updated_at: new Date().toISOString(),
      };

      if (editingProduct) {
        const { error } = await (supabase.from('products') as any)
          .update(productData)
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        
        toast({
          title: "Produto atualizado!",
          description: `${productForm.name} foi atualizado com sucesso.`,
        });
      } else {
        const { error } = await (supabase.from('products') as any)
          .insert(productData);
        
        if (error) throw error;
        
        toast({
          title: "Produto cadastrado!",
          description: `${productForm.name} foi adicionado ao estoque.`,
        });
      }

      setIsProductDialogOpen(false);
      resetProductForm();
      fetchProducts();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Tem certeza que deseja excluir "${product.name}"?`)) return;

    try {
      const { error } = await (supabase.from('products') as any)
        .delete()
        .eq('id', product.id);
      
      if (error) throw error;
      
      toast({
        title: "Produto excluído",
        description: `${product.name} foi removido.`,
      });
      
      fetchProducts();
    } catch (error: any) {
      console.error('Erro ao excluir produto:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Open movement dialog
  const handleOpenMovementDialog = async (product: Product) => {
    setSelectedProductForMovement(product);
    setMovementForm({ type: 'entrada', quantity: '', reason: '' });
    await fetchMovements(product.id);
    setIsMovementDialogOpen(true);
  };

  // Save movement
  const handleSaveMovement = async () => {
    if (!selectedProductForMovement || !movementForm.quantity) {
      toast({
        title: "Quantidade obrigatória",
        description: "Informe a quantidade da movimentação.",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(movementForm.quantity);
    if (quantity <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Calculate new stock
      let newStock = selectedProductForMovement.stock_quantity;
      if (movementForm.type === 'entrada') {
        newStock += quantity;
      } else if (movementForm.type === 'saida') {
        newStock -= quantity;
      } else {
        newStock = quantity; // ajuste: define valor absoluto
      }

      if (newStock < 0) newStock = 0;

      // Insert movement
      const { error: movError } = await (supabase as any).from('stock_movements')
        .insert({
          product_id: selectedProductForMovement.id,
          type: movementForm.type,
          quantity: quantity,
          reason: movementForm.reason || null,
        });
      
      if (movError) throw movError;

      // Update product stock
      const { error: prodError } = await (supabase.from('products') as any)
        .update({ 
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProductForMovement.id);
      
      if (prodError) throw prodError;

      toast({
        title: "Movimentação registrada!",
        description: `Estoque atualizado para ${newStock} ${selectedProductForMovement.unit}.`,
      });

      setIsMovementDialogOpen(false);
      setSelectedProductForMovement(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Erro ao registrar movimentação:', error);
      toast({
        title: "Erro ao registrar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate margin
  const calculateMargin = (costPrice: string, salePrice: string) => {
    const cost = parseFloat(costPrice) || 0;
    const sale = parseFloat(salePrice) || 0;
    if (cost === 0) return null;
    const margin = sale - cost;
    const marginPercent = (margin / cost) * 100;
    return { margin, marginPercent };
  };

  const marginData = calculateMargin(productForm.cost_price, productForm.sale_price);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Package className="w-7 h-7 text-primary" />
            Estoque & Produtos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastre e gerencie seus produtos
          </p>
        </div>
        
        <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
          setIsProductDialogOpen(open);
          if (!open) resetProductForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Nome do Produto *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Ração Golden Cães Adultos 15kg"
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select
                    value={productForm.category}
                    onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    placeholder="Ex: Golden, Premier"
                    value={productForm.brand}
                    onChange={(e) => setProductForm(prev => ({ ...prev, brand: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="sku">Código / SKU</Label>
                  <Input
                    id="sku"
                    placeholder="Código interno"
                    value={productForm.sku}
                    onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="barcode">Código de Barras</Label>
                  <Input
                    id="barcode"
                    placeholder="EAN/GTIN"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                  />
                </div>
                
                <div className="sm:col-span-2 flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Label htmlFor="active" className="font-medium">Produto Ativo</Label>
                    <p className="text-sm text-muted-foreground">Disponível para venda</p>
                  </div>
                  <Switch
                    id="active"
                    checked={productForm.active}
                    onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, active: checked }))}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição detalhada do produto..."
                  value={productForm.description}
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Stock Control */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="control_stock" className="font-medium flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Controlar Estoque deste Item
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Se desativado, o produto pode ser vendido sem controle de quantidade
                    </p>
                  </div>
                  <Switch
                    id="control_stock"
                    checked={productForm.control_stock}
                    onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, control_stock: checked }))}
                  />
                </div>
                
                {productForm.control_stock && (
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div>
                      <Label htmlFor="stock_quantity">Quantidade em Estoque</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        value={productForm.stock_quantity}
                        onChange={(e) => setProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="min_stock">Estoque Mínimo</Label>
                      <Input
                        id="min_stock"
                        type="number"
                        min="0"
                        value={productForm.min_stock_quantity}
                        onChange={(e) => setProductForm(prev => ({ ...prev, min_stock_quantity: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unidade</Label>
                      <Select
                        value={productForm.unit}
                        onValueChange={(value) => setProductForm(prev => ({ ...prev, unit: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map(u => (
                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Preços</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="sale_price">Preço de Venda *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                      <Input
                        id="sale_price"
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-10"
                        placeholder="0,00"
                        value={productForm.sale_price}
                        onChange={(e) => setProductForm(prev => ({ ...prev, sale_price: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cost_price">Preço de Compra</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                      <Input
                        id="cost_price"
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-10"
                        placeholder="0,00"
                        value={productForm.cost_price}
                        onChange={(e) => setProductForm(prev => ({ ...prev, cost_price: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Margem de Lucro</Label>
                    <div className={cn(
                      "h-10 px-3 rounded-md flex items-center justify-center font-medium",
                      marginData && marginData.margin > 0 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : marginData && marginData.margin < 0
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {marginData 
                        ? `R$ ${marginData.margin.toFixed(2)} (${marginData.marginPercent.toFixed(1)}%)`
                        : '-'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveProduct} disabled={isLoading}>
                {isLoading ? 'Salvando...' : editingProduct ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{products.length}</div>
            <div className="text-sm text-muted-foreground">Total de Produtos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{products.filter(p => p.active).length}</div>
            <div className="text-sm text-muted-foreground">Ativos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{products.filter(p => p.control_stock).length}</div>
            <div className="text-sm text-muted-foreground">Com Estoque</div>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? 'border-yellow-500' : ''}>
          <CardContent className="pt-4">
            <div className={cn("text-2xl font-bold flex items-center gap-2", lowStockCount > 0 && "text-yellow-600")}>
              {lowStockCount > 0 && <AlertTriangle className="w-5 h-5" />}
              {lowStockCount}
            </div>
            <div className="text-sm text-muted-foreground">Estoque Baixo</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, SKU ou código de barras..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStock ? "destructive" : "outline"}
              onClick={() => setShowLowStock(!showLowStock)}
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              {showLowStock ? 'Mostrar Todos' : 'Estoque Baixo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Carregando...' : 'Nenhum produto encontrado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const isLowStock = product.control_stock && product.stock_quantity <= product.min_stock_quantity;
                    
                    return (
                      <TableRow key={product.id} className={cn(!product.active && "opacity-50")}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {product.brand && `${product.brand} • `}
                                {product.sku && `SKU: ${product.sku}`}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {product.sale_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.control_stock ? (
                            <div className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
                              isLowStock 
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-muted"
                            )}>
                              {isLowStock && <AlertTriangle className="w-3 h-3" />}
                              {product.stock_quantity} {product.unit}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.active ? (
                            <Badge variant="default" className="bg-green-600">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {product.control_stock && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenMovementDialog(product)}
                                title="Movimentação de Estoque"
                              >
                                <ArrowUpDown className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditProduct(product)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteProduct(product)}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Movement Dialog */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Movimentação de Estoque</DialogTitle>
            <DialogDescription>
              {selectedProductForMovement?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Estoque Atual</div>
              <div className="text-3xl font-bold">
                {selectedProductForMovement?.stock_quantity} {selectedProductForMovement?.unit}
              </div>
            </div>
            
            <div>
              <Label>Tipo de Movimentação</Label>
              <Select
                value={movementForm.type}
                onValueChange={(value: 'entrada' | 'saida' | 'ajuste') => 
                  setMovementForm(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (adicionar)</SelectItem>
                  <SelectItem value="saida">Saída (remover)</SelectItem>
                  <SelectItem value="ajuste">Ajuste (definir quantidade)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="0"
                placeholder={movementForm.type === 'ajuste' ? 'Nova quantidade' : 'Quantidade'}
                value={movementForm.quantity}
                onChange={(e) => setMovementForm(prev => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
            
            <div>
              <Label>Motivo (opcional)</Label>
              <Input
                placeholder="Ex: Compra de fornecedor, Venda avulsa..."
                value={movementForm.reason}
                onChange={(e) => setMovementForm(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            {movements.length > 0 && (
              <div className="pt-4 border-t">
                <Label className="flex items-center gap-2 mb-2">
                  <History className="w-4 h-4" />
                  Últimas Movimentações
                </Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {movements.slice(0, 5).map(mov => (
                    <div key={mov.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                      <div>
                        <Badge variant={
                          mov.type === 'entrada' ? 'default' : 
                          mov.type === 'saida' ? 'destructive' : 'secondary'
                        } className="text-xs">
                          {mov.type}
                        </Badge>
                        <span className="ml-2">{mov.quantity} un</span>
                      </div>
                      <span className="text-muted-foreground">
                        {format(new Date(mov.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMovement} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Estoque;
