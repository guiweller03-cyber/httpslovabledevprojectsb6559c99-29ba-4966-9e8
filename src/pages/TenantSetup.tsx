import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import petzapLogo from '@/assets/petzap-logo.png';

export default function TenantSetup() {
  const { user, hasProfile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [businessName, setBusinessName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  useEffect(() => {
    // If user already has a profile, redirect to dashboard
    if (!authLoading && hasProfile) {
      navigate('/');
    }
  }, [hasProfile, authLoading, navigate]);

  useEffect(() => {
    // If no user at all, redirect to auth
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessName.trim()) {
      toast.error('Por favor, informe o nome do seu negócio.');
      return;
    }

    if (!user) {
      toast.error('Usuário não autenticado.');
      return;
    }

    setIsLoading(true);

    try {
      // Call the create_tenant_with_owner function
      const { data, error } = await supabase.rpc('create_tenant_with_owner', {
        _tenant_nome: businessName.trim(),
        _user_id: user.id,
        _user_name: user.user_metadata?.full_name || user.email || 'Usuário',
        _user_email: user.email || ''
      });

      if (error) {
        console.error('Error creating tenant:', error);
        toast.error('Erro ao criar conta. Tente novamente.');
        return;
      }

      const result = data as { success: boolean; error?: string; tenant_id?: string };

      if (!result.success) {
        toast.error(result.error || 'Erro ao criar conta.');
        return;
      }

      toast.success('Conta criada com sucesso!');
      
      // Reload to update the auth context
      window.location.href = '/';
    } catch (err) {
      console.error('Error creating tenant:', err);
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      toast.error('Por favor, informe o código de convite.');
      return;
    }

    if (!user) {
      toast.error('Usuário não autenticado.');
      return;
    }

    setIsLoading(true);

    try {
      // Call the accept_tenant_invite function
      const { data, error } = await supabase.rpc('accept_tenant_invite', {
        _invite_code: inviteCode.trim(),
        _user_id: user.id,
        _user_name: user.user_metadata?.full_name || user.email || 'Usuário',
        _user_email: user.email || ''
      });

      if (error) {
        console.error('Error accepting invite:', error);
        toast.error('Código de convite inválido ou expirado.');
        return;
      }

      const result = data as { success: boolean; error?: string; tenant_id?: string };

      if (!result.success) {
        toast.error(result.error || 'Código de convite inválido.');
        return;
      }

      toast.success('Você entrou na equipe com sucesso!');
      
      // Reload to update the auth context
      window.location.href = '/';
    } catch (err) {
      console.error('Error accepting invite:', err);
      toast.error('Erro ao aceitar convite. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img src={petzapLogo} alt="PetZap" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800">Configure sua conta</h1>
          <p className="text-slate-500 mt-2">
            {user?.email}
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Bem-vindo ao PetZap!</CardTitle>
            <CardDescription>
              Crie um novo negócio ou entre em uma equipe existente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create' | 'join')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="create" className="gap-2">
                  <Building2 className="w-4 h-4" />
                  Criar Negócio
                </TabsTrigger>
                <TabsTrigger value="join" className="gap-2">
                  <Users className="w-4 h-4" />
                  Entrar em Equipe
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create">
                <form onSubmit={handleCreateTenant} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nome do seu negócio</Label>
                    <Input
                      id="businessName"
                      placeholder="Ex: PetShop do João"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-emerald-700">
                        <p className="font-medium">Você será o proprietário</p>
                        <p className="text-emerald-600 mt-1">
                          Terá acesso total ao sistema e poderá convidar outros membros.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar meu negócio'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="join">
                <form onSubmit={handleJoinTenant} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Código de convite</Label>
                    <Input
                      id="inviteCode"
                      placeholder="Cole o código de convite aqui"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="h-12 font-mono"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">Código de convite</p>
                        <p className="text-blue-600 mt-1">
                          Peça ao administrador da equipe para enviar um código de convite.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar na equipe'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}