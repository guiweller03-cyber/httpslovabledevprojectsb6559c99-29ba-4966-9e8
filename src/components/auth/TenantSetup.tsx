import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export function TenantSetup() {
  const { createTenantWithOwner, acceptInvite, validateInviteCode } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  // Create tenant state
  const [tenantName, setTenantName] = useState('');
  
  // Join tenant state
  const [inviteCode, setInviteCode] = useState('');
  const [inviteValid, setInviteValid] = useState<{ valid: boolean; tenant_name?: string; role?: string } | null>(null);
  const [validating, setValidating] = useState(false);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantName.trim()) {
      toast.error('Digite o nome da empresa');
      return;
    }

    setIsLoading(true);
    const result = await createTenantWithOwner(tenantName.trim());
    setIsLoading(false);

    if (result.success) {
      toast.success('Empresa criada com sucesso! Você agora é o proprietário.');
    } else {
      toast.error(result.error || 'Erro ao criar empresa');
    }
  };

  const handleValidateCode = async () => {
    if (!inviteCode.trim()) return;
    
    setValidating(true);
    const result = await validateInviteCode(inviteCode.trim());
    setInviteValid(result);
    setValidating(false);

    if (!result.valid) {
      toast.error('Código de convite inválido ou expirado');
    }
  };

  const handleJoinTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      toast.error('Digite o código de convite');
      return;
    }

    setIsLoading(true);
    const result = await acceptInvite(inviteCode.trim());
    setIsLoading(false);

    if (result.success) {
      toast.success('Você entrou na empresa com sucesso!');
    } else {
      toast.error(result.error || 'Erro ao aceitar convite');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: 'Proprietário',
      admin: 'Administrador',
      manager: 'Gerente',
      employee: 'Funcionário'
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-slate-100/60 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-semibold text-slate-800">
              Configurar Conta
            </CardTitle>
            <CardDescription className="text-slate-500">
              Crie sua empresa ou entre em uma existente
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create' | 'join')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="create" className="gap-2">
                  <Building2 className="w-4 h-4" />
                  Nova Empresa
                </TabsTrigger>
                <TabsTrigger value="join" className="gap-2">
                  <Users className="w-4 h-4" />
                  Entrar com Código
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create">
                <form onSubmit={handleCreateTenant} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tenant-name">Nome da Empresa / Petshop</Label>
                    <Input
                      id="tenant-name"
                      placeholder="Ex: Pet Shop Amigo Fiel"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="h-12"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-slate-500">
                      Você será o proprietário desta conta
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                    disabled={isLoading || !tenantName.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Building2 className="w-4 h-4 mr-2" />
                        Criar Empresa
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="join">
                <form onSubmit={handleJoinTenant} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-code">Código de Convite</Label>
                    <div className="flex gap-2">
                      <Input
                        id="invite-code"
                        placeholder="Cole o código aqui"
                        value={inviteCode}
                        onChange={(e) => {
                          setInviteCode(e.target.value);
                          setInviteValid(null);
                        }}
                        className="h-12 flex-1"
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleValidateCode}
                        disabled={validating || !inviteCode.trim()}
                        className="h-12"
                      >
                        {validating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Validar'
                        )}
                      </Button>
                    </div>
                  </div>

                  {inviteValid && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg flex items-start gap-3 ${
                        inviteValid.valid 
                          ? 'bg-emerald-50 border border-emerald-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      {inviteValid.valid ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-emerald-800">Convite válido!</p>
                            <p className="text-sm text-emerald-600">
                              Empresa: <strong>{inviteValid.tenant_name}</strong>
                            </p>
                            <p className="text-sm text-emerald-600">
                              Cargo: <strong>{getRoleLabel(inviteValid.role || 'employee')}</strong>
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-red-800">Convite inválido</p>
                            <p className="text-sm text-red-600">
                              O código expirou ou não existe
                            </p>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                    disabled={isLoading || !inviteCode.trim() || (inviteValid !== null && !inviteValid.valid)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Entrar na Empresa
                      </>
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
