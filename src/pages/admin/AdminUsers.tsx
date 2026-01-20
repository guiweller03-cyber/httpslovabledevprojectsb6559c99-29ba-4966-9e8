import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, Eye, UserX, Trash2, AlertTriangle, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  role?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        role: roles?.find(r => r.user_id === profile.id)?.role || 'user'
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      // Delete user roles first
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', deleteUserId);

      // Delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteUserId);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== deleteUserId));
      toast.success('Usuário removido com sucesso');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao remover usuário');
    } finally {
      setDeleteUserId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-[#3B82F6] hover:bg-[#2563EB]">Admin</Badge>;
      case 'manager':
        return <Badge className="bg-[#8B5CF6] hover:bg-[#7C3AED]">Manager</Badge>;
      default:
        return <Badge variant="secondary">Employee</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1F2933]">Usuários</h1>
        <p className="text-[#64748B] mt-1">
          Gerencie os usuários do sistema
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#E2E8F0] bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#1F2933]">{users.length}</p>
              <p className="text-sm text-[#64748B]">Total de usuários</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E2E8F0] bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#1F2933]">
                {users.filter(u => u.role === 'admin').length}
              </p>
              <p className="text-sm text-[#64748B]">Administradores</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E2E8F0] bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#1F2933]">
                {users.filter(u => u.role === 'manager').length}
              </p>
              <p className="text-sm text-[#64748B]">Managers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Table */}
      <Card className="border-[#E2E8F0] bg-white">
        <CardHeader className="border-b border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-[#1F2933]">
              Lista de Usuários
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <Input
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-[#E2E8F0]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-[#64748B]">
              Carregando usuários...
            </div>
          ) : filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0]">
                  <TableHead className="text-[#64748B]">Usuário</TableHead>
                  <TableHead className="text-[#64748B]">Email</TableHead>
                  <TableHead className="text-[#64748B]">Role</TableHead>
                  <TableHead className="text-[#64748B]">Criado em</TableHead>
                  <TableHead className="text-[#64748B] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    <TableCell className="font-medium text-[#1F2933]">
                      {user.full_name || 'Sem nome'}
                    </TableCell>
                    <TableCell className="text-[#64748B]">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role || 'employee')}
                    </TableCell>
                    <TableCell className="text-[#64748B]">
                      {user.created_at && format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#64748B] hover:text-[#1F2933]"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteUserId(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-[#64748B]">
              Nenhum usuário encontrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent className="bg-white border-[#E2E8F0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#1F2933]">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Apagar usuário definitivamente
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#64748B]">
              Essa ação não pode ser desfeita. O usuário será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E2E8F0]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Apagar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
