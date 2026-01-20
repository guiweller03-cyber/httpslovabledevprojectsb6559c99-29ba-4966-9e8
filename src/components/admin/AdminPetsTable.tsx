import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

export default function AdminPetsTable() {
  const [pets, setPets] = useState<any[]>([]);
  useEffect(() => { supabase.from('pets').select('*').order('created_at', { ascending: false }).then(({ data }) => setPets(data || [])); }, []);
  return (
    <Card className="border-[#E2E8F0]"><CardContent className="p-4">
      <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Raça</TableHead><TableHead>Espécie</TableHead></TableRow></TableHeader>
        <TableBody>{pets.map(p => (<TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>{p.breed || '-'}</TableCell><TableCell>{p.species}</TableCell></TableRow>))}</TableBody>
      </Table>
    </CardContent></Card>
  );
}
