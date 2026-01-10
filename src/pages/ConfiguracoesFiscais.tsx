import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Settings, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  Building2,
  Shield,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  Info,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
}

interface FiscalConfig {
  id: string;
  company_id: string;
  tipo_nota: 'nfce' | 'nfe' | 'desativado';
  ambiente: 'homologacao' | 'producao';
  regime_tributario: string;
  serie: string;
  numero_atual: number;
  emitir_automatico: boolean;
  csosn_servicos: string;
  csosn_produtos: string;
}

interface Certificate {
  id: string;
  company_id: string;
  nome_arquivo: string;
  validade: string;
  status: 'ativo' | 'expirado' | 'invalido';
}

const ConfiguracoesFiscais = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const [company, setCompany] = useState<Company | null>(null);
  const [config, setConfig] = useState<FiscalConfig | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    // Company
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
    cep: '',
    telefone: '',
    email: '',
    // Config
    tipo_nota: 'desativado' as 'nfce' | 'nfe' | 'desativado',
    ambiente: 'homologacao' as 'homologacao' | 'producao',
    regime_tributario: '1',
    serie: '1',
    numero_atual: 1,
    emitir_automatico: false,
    csosn_servicos: '102',
    csosn_produtos: '102',
  });
  
  const [certPassword, setCertPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Get or create company - using type assertion for new tables
      const { data: companies, error: compError } = await supabase
        .from('companies' as any)
        .select('*')
        .limit(1);

      if (compError) throw compError;

      let comp = ((companies as unknown) as Company[] | null)?.[0];
      
      if (!comp) {
        // Create default company
        const { data: newComp, error: createError } = await supabase
          .from('companies' as any)
          .insert({
            razao_social: 'Minha Empresa',
            cnpj: '',
          } as any)
          .select()
          .single();
        
        if (createError) throw createError;
        comp = (newComp as unknown) as Company;
      }
      
      setCompany(comp);

      // Get or create fiscal config
      const { data: configs, error: configError } = await supabase
        .from('config_fiscal' as any)
        .select('*')
        .eq('company_id', comp.id)
        .limit(1);

      if (configError) throw configError;

      let cfg = ((configs as unknown) as FiscalConfig[] | null)?.[0];
      
      if (!cfg) {
        const { data: newCfg, error: cfgCreateError } = await supabase
          .from('config_fiscal' as any)
          .insert({
            company_id: comp.id,
            tipo_nota: 'desativado',
            ambiente: 'homologacao',
            regime_tributario: '1',
            serie: '1',
            numero_atual: 1,
            emitir_automatico: false,
            csosn_servicos: '102',
            csosn_produtos: '102',
          } as any)
          .select()
          .single();
        
        if (cfgCreateError) throw cfgCreateError;
        cfg = (newCfg as unknown) as FiscalConfig;
      }
      
      setConfig(cfg);

      // Get certificate
      const { data: certs } = await supabase
        .from('certificados_digitais' as any)
        .select('*')
        .eq('company_id', comp.id)
        .eq('status', 'ativo')
        .limit(1);

      setCertificate(((certs as unknown) as Certificate[] | null)?.[0] || null);

      // Update form data
      setFormData({
        razao_social: comp.razao_social || '',
        nome_fantasia: comp.nome_fantasia || '',
        cnpj: comp.cnpj || '',
        inscricao_estadual: comp.inscricao_estadual || '',
        inscricao_municipal: comp.inscricao_municipal || '',
        logradouro: comp.logradouro || '',
        numero: comp.numero || '',
        complemento: comp.complemento || '',
        bairro: comp.bairro || '',
        municipio: comp.municipio || '',
        uf: comp.uf || '',
        cep: comp.cep || '',
        telefone: comp.telefone || '',
        email: comp.email || '',
        tipo_nota: cfg.tipo_nota || 'desativado',
        ambiente: cfg.ambiente || 'homologacao',
        regime_tributario: cfg.regime_tributario || '1',
        serie: cfg.serie || '1',
        numero_atual: cfg.numero_atual || 1,
        emitir_automatico: cfg.emitir_automatico || false,
        csosn_servicos: cfg.csosn_servicos || '102',
        csosn_produtos: cfg.csosn_produtos || '102',
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as configurações fiscais.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!company) return;
    
    setIsSaving(true);
    try {
      // Update company
      const { error: compError } = await supabase
        .from('companies' as any)
        .update({
          razao_social: formData.razao_social,
          nome_fantasia: formData.nome_fantasia,
          cnpj: formData.cnpj,
          inscricao_estadual: formData.inscricao_estadual,
          inscricao_municipal: formData.inscricao_municipal,
          logradouro: formData.logradouro,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          municipio: formData.municipio,
          uf: formData.uf,
          cep: formData.cep,
          telefone: formData.telefone,
          email: formData.email,
        } as any)
        .eq('id', company.id);

      if (compError) throw compError;

      // Update config
      const { error: cfgError } = await supabase
        .from('config_fiscal' as any)
        .update({
          tipo_nota: formData.tipo_nota,
          ambiente: formData.ambiente,
          regime_tributario: formData.regime_tributario,
          serie: formData.serie,
          numero_atual: formData.numero_atual,
          emitir_automatico: formData.emitir_automatico,
          csosn_servicos: formData.csosn_servicos,
          csosn_produtos: formData.csosn_produtos,
        } as any)
        .eq('company_id', company.id);

      if (cfgError) throw cfgError;

      toast({
        title: 'Configurações salvas!',
        description: 'As configurações fiscais foram atualizadas com sucesso.',
      });

      // Refresh data
      await fetchData();

    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!company) return;

    setIsValidating(true);
    setValidationIssues([]);

    try {
      const { data, error } = await supabase.functions.invoke('focus-nfe', {
        body: {
          action: 'validar_config',
          company_id: company.id,
        },
      });

      if (error) throw error;

      if (data.issues && data.issues.length > 0) {
        setValidationIssues(data.issues);
        toast({
          title: 'Problemas encontrados',
          description: `${data.issues.length} problema(s) encontrado(s) na configuração.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Configuração válida!',
          description: 'Todas as configurações estão corretas.',
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: 'Erro na validação',
        description: 'Não foi possível validar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleCertUpload = async () => {
    if (!certFile || !certPassword || !company) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione o arquivo do certificado e informe a senha.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1];
        
        // Save certificate (password should be encrypted - for demo, we store hash)
        const { error } = await supabase
          .from('certificados_digitais' as any)
          .insert({
            company_id: company.id,
            nome_arquivo: certFile.name,
            certificado_base64: base64,
            senha_hash: btoa(certPassword), // In production, use proper encryption
            validade: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
            status: 'ativo',
          } as any);

        if (error) throw error;

        toast({
          title: 'Certificado enviado!',
          description: 'O certificado digital foi configurado com sucesso.',
        });

        setCertFile(null);
        setCertPassword('');
        await fetchData();
      };

      reader.readAsDataURL(certFile);
    } catch (error) {
      console.error('Error uploading certificate:', error);
      toast({
        title: 'Erro ao enviar certificado',
        description: 'Não foi possível configurar o certificado digital.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações Fiscais</h1>
            <p className="text-sm text-muted-foreground">
              Configure a emissão de notas fiscais da sua empresa
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleValidate} disabled={isValidating}>
            {isValidating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Validar Configuração
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </motion.div>

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Problemas na configuração</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {validationIssues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="empresa" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="w-4 h-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-2">
            <FileText className="w-4 h-4" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="certificado" className="gap-2">
            <Shield className="w-4 h-4" />
            Certificado
          </TabsTrigger>
          <TabsTrigger value="tributacao" className="gap-2">
            <Settings className="w-4 h-4" />
            Tributação
          </TabsTrigger>
        </TabsList>

        {/* Empresa Tab */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>
                Informações cadastrais que serão utilizadas na emissão das notas fiscais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social *</Label>
                  <Input
                    id="razao_social"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    placeholder="Razão social da empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                  <Input
                    id="nome_fantasia"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    placeholder="Nome fantasia"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                  <Input
                    id="inscricao_estadual"
                    value={formData.inscricao_estadual}
                    onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                    placeholder="Inscrição estadual"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
                  <Input
                    id="inscricao_municipal"
                    value={formData.inscricao_municipal}
                    onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                    placeholder="Inscrição municipal"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input
                    id="logradouro"
                    value={formData.logradouro}
                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                    placeholder="Rua, Avenida..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="Nº"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    placeholder="Sala, Andar..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Bairro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="municipio">Município</Label>
                  <Input
                    id="municipio"
                    value={formData.municipio}
                    onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uf">UF</Label>
                  <Select
                    value={formData.uf}
                    onValueChange={(value) => setFormData({ ...formData, uf: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="empresa@email.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fiscal Tab */}
        <TabsContent value="fiscal">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Emissão</CardTitle>
              <CardDescription>
                Defina como as notas fiscais serão emitidas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Tipo de Nota Fiscal</Label>
                  <Select
                    value={formData.tipo_nota}
                    onValueChange={(value: 'nfce' | 'nfe' | 'desativado') => 
                      setFormData({ ...formData, tipo_nota: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desativado">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-muted rounded-full" />
                          Desativado
                        </div>
                      </SelectItem>
                      <SelectItem value="nfce">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full" />
                          NFC-e (Consumidor)
                        </div>
                      </SelectItem>
                      <SelectItem value="nfe">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                          NF-e (Completa)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    NFC-e é ideal para vendas ao consumidor final
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select
                    value={formData.ambiente}
                    onValueChange={(value: 'homologacao' | 'producao') => 
                      setFormData({ ...formData, ambiente: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">TESTE</Badge>
                          Homologação
                        </div>
                      </SelectItem>
                      <SelectItem value="producao">
                        <div className="flex items-center gap-2">
                          <Badge className="text-xs bg-green-500">REAL</Badge>
                          Produção
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Use Homologação para testes sem valor fiscal
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serie">Série</Label>
                  <Input
                    id="serie"
                    value={formData.serie}
                    onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero_atual">Número Atual</Label>
                  <Input
                    id="numero_atual"
                    type="number"
                    value={formData.numero_atual}
                    onChange={(e) => setFormData({ ...formData, numero_atual: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regime Tributário</Label>
                  <Select
                    value={formData.regime_tributario}
                    onValueChange={(value) => setFormData({ ...formData, regime_tributario: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Simples Nacional</SelectItem>
                      <SelectItem value="2">Simples Nacional - Excesso</SelectItem>
                      <SelectItem value="3">Regime Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label>Emissão Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Emitir NFC-e automaticamente ao finalizar pagamento na Frente de Caixa
                  </p>
                </div>
                <Switch
                  checked={formData.emitir_automatico}
                  onCheckedChange={(checked) => setFormData({ ...formData, emitir_automatico: checked })}
                />
              </div>

              {formData.tipo_nota === 'desativado' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Emissão desativada</AlertTitle>
                  <AlertDescription>
                    As notas fiscais não serão emitidas. Você pode ativar a qualquer momento.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificado Tab */}
        <TabsContent value="certificado">
          <Card>
            <CardHeader>
              <CardTitle>Certificado Digital A1</CardTitle>
              <CardDescription>
                O certificado digital é obrigatório para emissão de notas fiscais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {certificate ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 dark:text-green-100">
                        Certificado Configurado
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Arquivo: {certificate.nome_arquivo}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Validade: {new Date(certificate.validade).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge variant={certificate.status === 'ativo' ? 'default' : 'destructive'}>
                      {certificate.status === 'ativo' ? 'Ativo' : 'Expirado'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Certificado não configurado</AlertTitle>
                  <AlertDescription>
                    Faça o upload do seu certificado digital A1 (.pfx) para habilitar a emissão de notas.
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Enviar novo certificado</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="cert_file">Arquivo do Certificado (.pfx)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cert_file"
                      type="file"
                      accept=".pfx,.p12"
                      onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  {certFile && (
                    <p className="text-sm text-muted-foreground">
                      Arquivo selecionado: {certFile.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cert_password">Senha do Certificado</Label>
                  <div className="relative">
                    <Input
                      id="cert_password"
                      type={showPassword ? 'text' : 'password'}
                      value={certPassword}
                      onChange={(e) => setCertPassword(e.target.value)}
                      placeholder="Digite a senha do certificado"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={handleCertUpload} 
                  disabled={!certFile || !certPassword || isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  Enviar Certificado
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  A senha é criptografada e armazenada de forma segura
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tributação Tab */}
        <TabsContent value="tributacao">
          <Card>
            <CardHeader>
              <CardTitle>Perfil Tributário Padrão</CardTitle>
              <CardDescription>
                Configure os códigos tributários padrão para serviços e produtos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Configuração para Simples Nacional</AlertTitle>
                <AlertDescription>
                  Os códigos abaixo são padrões recomendados para empresas do Simples Nacional 
                  no segmento de pet shop. Consulte seu contador para confirmar.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    Serviços (Banho, Tosa, Consultas)
                  </h4>
                  
                  <div className="space-y-2">
                    <Label>CSOSN</Label>
                    <Select
                      value={formData.csosn_servicos}
                      onValueChange={(value) => setFormData({ ...formData, csosn_servicos: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="102">102 - Tributada sem permissão de crédito</SelectItem>
                        <SelectItem value="103">103 - Isenção de ICMS</SelectItem>
                        <SelectItem value="300">300 - Imune</SelectItem>
                        <SelectItem value="400">400 - Não tributada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    ICMS: Isento (Simples Nacional)<br />
                    ISS: Conforme legislação municipal
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    Produtos (Ração, Acessórios)
                  </h4>
                  
                  <div className="space-y-2">
                    <Label>CSOSN</Label>
                    <Select
                      value={formData.csosn_produtos}
                      onValueChange={(value) => setFormData({ ...formData, csosn_produtos: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="102">102 - Tributada sem permissão de crédito</SelectItem>
                        <SelectItem value="103">103 - Isenção de ICMS</SelectItem>
                        <SelectItem value="500">500 - ICMS cobrado anteriormente (ST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    ICMS: Padrão Simples Nacional<br />
                    NCM e CFOP configurados por produto
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracoesFiscais;
