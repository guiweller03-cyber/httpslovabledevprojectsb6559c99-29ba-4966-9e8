import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function AdminSalesTable() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(100).then(({ data }) => setItems(data || [])); }, []);
  return (
    <Card className="border-[#E2E8F0]"><CardContent className="p-4">
      <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{items.map(i => (<TableRow key={i.id}><TableCell>{i.created_at && format(new Date(i.created_at), 'dd/MM/yyyy')}</TableCell><TableCell>R$ {i.total_amount?.toFixed(2)}</TableCell><TableCell>{i.payment_status}</TableCell></TableRow>))}</TableBody>
      </Table>
    </CardContent></Card>
  );
}
