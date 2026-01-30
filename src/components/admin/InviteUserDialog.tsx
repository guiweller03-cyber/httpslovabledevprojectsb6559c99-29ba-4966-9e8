import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2, Copy, CheckCircle2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

interface InviteUserDialogProps {
  onInviteSent?: () => void;
}

export function InviteUserDialog({ onInviteSent }: InviteUserDialogProps) {
  const { tenant } = useTenant();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'employee'>('employee');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant) {
      toast.error('Tenant não encontrado');
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Use REST API for new table
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tenant_invites`;
      const session = await supabase.auth.getSession();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session.data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          tenant_id: tenant.id,
          email: email || null,
          role,
          invited_by: userData.user?.id
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setGeneratedCode(data[0]?.invite_code || data.invite_code);
      toast.success('Convite criado com sucesso!');
      onInviteSent?.();
    } catch (error: any) {
      console.error('Error creating invite:', error);
      toast.error('Erro ao criar convite: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar código');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEmail('');
    setRole('employee');
    setGeneratedCode(null);
    setCopied(false);
  };

  const getRoleLabel = (r: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      manager: 'Gerente',
      employee: 'Funcionário'
    };
    return labels[r] || r;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => v ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <UserPlus className="w-4 h-4 mr-2" />
          Convidar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Novo Usuário</DialogTitle>
          <DialogDescription>
            Crie um código de convite para adicionar um novo membro à sua equipe.
          </DialogDescription>
        </DialogHeader>

        {!generatedCode ? (
          <form onSubmit={handleCreateInvite} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email (opcional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="usuario@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Se informado, apenas este email poderá usar o convite
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Cargo</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="employee">Funcionário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1 bg-primary hover:bg-primary/90">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Convite'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-medium text-primary">Convite criado!</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Compartilhe este código com o usuário que deseja convidar
              </p>
              
              <div className="flex gap-2">
                <Input
                  value={generatedCode}
                  readOnly
                  className="font-mono text-sm bg-background"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyCode}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Cargo: <strong>{getRoleLabel(role)}</strong> • Expira em 7 dias
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
