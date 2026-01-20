import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Search } from 'lucide-react';

export default function AdminClientsTable() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.from('clients').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setClients(data || []);
      setIsLoading(false);
    });
  }, []);

  const filtered = clients.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card className="border-[#E2E8F0]">
      <CardContent className="p-4">
        <div className="relative w-64 mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>WhatsApp</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell>{c.whatsapp}</TableCell><TableCell>{c.email || '-'}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
