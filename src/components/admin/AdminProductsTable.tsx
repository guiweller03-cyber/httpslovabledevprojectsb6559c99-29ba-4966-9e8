import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

export default function AdminProductsTable() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { supabase.from('products').select('*').order('name').then(({ data }) => setItems(data || [])); }, []);
  return (
    <Card className="border-[#E2E8F0]"><CardContent className="p-4">
      <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Preço</TableHead><TableHead>Estoque</TableHead></TableRow></TableHeader>
        <TableBody>{items.map(i => (<TableRow key={i.id}><TableCell>{i.name}</TableCell><TableCell>R$ {i.sale_price?.toFixed(2)}</TableCell><TableCell>{i.stock_quantity}</TableCell></TableRow>))}</TableBody>
      </Table>
    </CardContent></Card>
  );
}
