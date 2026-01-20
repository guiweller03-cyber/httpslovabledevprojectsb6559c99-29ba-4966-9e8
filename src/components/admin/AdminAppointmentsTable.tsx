import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function AdminAppointmentsTable() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { supabase.from('bath_grooming_appointments').select('*').order('start_datetime', { ascending: false }).limit(100).then(({ data }) => setItems(data || [])); }, []);
  return (
    <Card className="border-[#E2E8F0]"><CardContent className="p-4">
      <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Serviço</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{items.map(i => (<TableRow key={i.id}><TableCell>{i.start_datetime && format(new Date(i.start_datetime), 'dd/MM/yyyy HH:mm')}</TableCell><TableCell>{i.service_type}</TableCell><TableCell>{i.status}</TableCell></TableRow>))}</TableBody>
      </Table>
    </CardContent></Card>
  );
}
