import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, UserPlus, Building2, Mail, Clock, 
  CheckCircle2, XCircle, Trash2, Loader2, Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
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

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: 'owner' | 'admin' | 'manager' | 'employee';
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
}

interface Invite {
  id: string;
  email: string | null;
  invite_code: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function Equipe() {
  const { tenant, userProfile, isTenantAdmin } = useTenant();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteInviteId, setDeleteInviteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('members');

  useEffect(() => {
    if (tenant) {
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    if (!tenant) return;
    
    setIsLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Fetch team members
      const membersResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users_profile?tenant_id=eq.${tenant.id}&select=*`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(membersData);
      }

      // Fetch invites
      const invitesResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tenant_invites?tenant_id=eq.${tenant.id}&select=*&order=created_at.desc`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (invitesResponse.ok) {
        const invitesData = await invitesResponse.json();
        setInvites(invitesData);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Erro ao carregar dados da equipe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInvite = async () => {
    if (!deleteInviteId) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tenant_invites?id=eq.${deleteInviteId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (!response.ok) throw new Error('Failed to delete invite');

      setInvites(prev => prev.filter(i => i.id !== deleteInviteId));
      toast.success('Convite removido');
    } catch (error) {
      console.error('Error deleting invite:', error);
      toast.error('Erro ao remover convite');
    } finally {
      setDeleteInviteId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      owner: { className: 'bg-amber-500 hover:bg-amber-600', label: 'Proprietário' },
      admin: { className: 'bg-blue-500 hover:bg-blue-600', label: 'Administrador' },
      manager: { className: 'bg-purple-500 hover:bg-purple-600', label: 'Gerente' },
      employee: { className: 'bg-slate-500 hover:bg-slate-600', label: 'Funcionário' },
    };
    const variant = variants[role] || variants.employee;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      active: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', label: 'Ativo' },
      inactive: { className: 'bg-slate-500/10 text-slate-600 border-slate-200', label: 'Inativo' },
      pending: { className: 'bg-amber-500/10 text-amber-600 border-amber-200', label: 'Pendente' },
    };
    const variant = variants[status] || variants.pending;
    return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
  };

  const getInviteStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'accepted') {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200" variant="outline">Aceito</Badge>;
    }
    if (status === 'revoked') {
      return <Badge className="bg-red-500/10 text-red-600 border-red-200" variant="outline">Revogado</Badge>;
    }
    if (isExpired) {
      return <Badge className="bg-slate-500/10 text-slate-600 border-slate-200" variant="outline">Expirado</Badge>;
    }
    return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200" variant="outline">Pendente</Badge>;
  };

  if (!isTenantAdmin) {
    return (
      <div className="p-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Settings className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">Acesso Restrito</h3>
              <p className="text-amber-600">
                Apenas administradores podem gerenciar a equipe.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Equipe</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os membros e convites da sua empresa
          </p>
        </div>
        <InviteUserDialog onInviteSent={fetchData} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{members.length}</p>
              <p className="text-sm text-muted-foreground">Membros</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {members.filter(m => m.status === 'active').length}
              </p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {invites.filter(i => i.status === 'pending' && new Date(i.expires_at) > new Date()).length}
              </p>
              <p className="text-sm text-muted-foreground">Convites Pendentes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground truncate max-w-[120px]">
                {tenant?.nome}
              </p>
              <p className="text-sm text-muted-foreground">Empresa</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="border-border bg-card">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b border-border pb-0">
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="members" className="gap-2">
                <Users className="w-4 h-4" />
                Membros
              </TabsTrigger>
              <TabsTrigger value="invites" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Convites
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="members" className="m-0">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Carregando...
                </div>
              ) : members.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Nome</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Cargo</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Desde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id} className="border-border hover:bg-muted/50">
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {member.full_name || 'Sem nome'}
                            {member.id === userProfile?.id && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.email}
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(member.role)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(member.status)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(member.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum membro encontrado</p>
                </div>
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="invites" className="m-0">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Carregando...
                </div>
              ) : invites.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Código</TableHead>
                      <TableHead className="text-muted-foreground">Cargo</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Expira em</TableHead>
                      <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id} className="border-border hover:bg-muted/50">
                        <TableCell className="text-muted-foreground">
                          {invite.email || <span className="text-slate-400">Qualquer email</span>}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-foreground">
                          {invite.invite_code.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(invite.role)}
                        </TableCell>
                        <TableCell>
                          {getInviteStatusBadge(invite.status, invite.expires_at)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(invite.expires_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          {invite.status === 'pending' && new Date(invite.expires_at) > new Date() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteInviteId(invite.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum convite encontrado</p>
                  <p className="text-sm mt-1">
                    Clique em "Convidar Usuário" para adicionar novos membros
                  </p>
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Delete Invite Dialog */}
      <AlertDialog open={!!deleteInviteId} onOpenChange={() => setDeleteInviteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar Convite</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar este convite? O código não poderá mais ser usado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvite}
              className="bg-red-500 hover:bg-red-600"
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
