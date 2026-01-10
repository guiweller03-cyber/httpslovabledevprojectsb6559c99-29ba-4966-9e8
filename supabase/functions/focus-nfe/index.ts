import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOCUS_NFE_BASE_URL_HOMOLOGACAO = 'https://homologacao.focusnfe.com.br/v2';
const FOCUS_NFE_BASE_URL_PRODUCAO = 'https://api.focusnfe.com.br/v2';

interface EmitirNFCeRequest {
  company_id: string;
  sale_id: string;
  client_id: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    ncm?: string;
    cfop?: string;
  }>;
  payment_method: string;
  total_amount: number;
}

interface CancelRequest {
  company_id: string;
  nota_id: string;
  justificativa: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const focusApiKey = Deno.env.get('FOCUS_NFE_API_KEY')!;
    
    if (!focusApiKey) {
      console.error('FOCUS_NFE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Configuração fiscal incompleta. Chave da API não configurada.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, ...payload } = await req.json();

    console.log(`Focus NFe action: ${action}`, JSON.stringify(payload, null, 2));

    switch (action) {
      case 'emitir_nfce':
        return await emitirNFCe(supabase, payload as EmitirNFCeRequest, focusApiKey);
      
      case 'cancelar':
        return await cancelarNota(supabase, payload as CancelRequest, focusApiKey);
      
      case 'consultar':
        return await consultarNota(supabase, payload, focusApiKey);
      
      case 'validar_config':
        return await validarConfiguracao(supabase, payload.company_id, focusApiKey);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Ação não reconhecida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in focus-nfe function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar requisição fiscal',
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getCompanyConfig(supabase: any, companyId: string) {
  const { data: config, error } = await supabase
    .from('config_fiscal')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching fiscal config:', error);
    throw new Error('Erro ao buscar configuração fiscal');
  }

  if (!config) {
    throw new Error('Configuração fiscal não encontrada para esta empresa');
  }

  return config;
}

async function getCompany(supabase: any, companyId: string) {
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching company:', error);
    throw new Error('Erro ao buscar dados da empresa');
  }

  if (!company) {
    throw new Error('Empresa não encontrada');
  }

  return company;
}

async function emitirNFCe(supabase: any, payload: EmitirNFCeRequest, apiKey: string) {
  const { company_id, sale_id, client_id, items, payment_method, total_amount } = payload;

  // Get company and config
  const config = await getCompanyConfig(supabase, company_id);
  const company = await getCompany(supabase, company_id);

  // Check if fiscal emission is enabled
  if (config.tipo_nota === 'desativado') {
    console.log('Fiscal emission disabled for company:', company_id);
    return new Response(
      JSON.stringify({ success: true, message: 'Emissão fiscal desativada', skipped: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get client info
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', client_id)
    .maybeSingle();

  // Build the NFC-e payload for Focus NFe
  const baseUrl = config.ambiente === 'producao' 
    ? FOCUS_NFE_BASE_URL_PRODUCAO 
    : FOCUS_NFE_BASE_URL_HOMOLOGACAO;

  // Determine next invoice number
  const nextNumber = (config.numero_atual || 0) + 1;

  // Map payment method to Focus NFe format
  const formaPagamento = mapPaymentMethod(payment_method);

  // Build invoice items
  const nfceItems = items.map((item, idx) => ({
    numero_item: idx + 1,
    codigo_produto: `SERV${idx + 1}`,
    descricao: item.description.substring(0, 120), // Max 120 chars
    quantidade_comercial: item.quantity.toFixed(4),
    valor_unitario_comercial: item.unit_price.toFixed(2),
    valor_bruto: item.total_price.toFixed(2),
    unidade_comercial: 'UN',
    ncm: item.ncm || '96031000', // Default: grooming services
    cfop: item.cfop || '5933', // Default for services
    // For Simples Nacional
    icms_situacao_tributaria: config.csosn_servicos || '102',
    icms_origem: '0',
  }));

  const nfcePayload = {
    natureza_operacao: 'VENDA DE SERVICOS',
    forma_pagamento: '0', // À vista
    tipo_documento: '1', // Saída
    local_destino: '1', // Operação interna
    finalidade_emissao: '1', // NFe normal
    consumidor_final: '1', // Consumer final
    presenca_comprador: '1', // Operação presencial
    
    // Company info
    cnpj_emitente: company.cnpj,
    nome_emitente: company.razao_social,
    nome_fantasia_emitente: company.nome_fantasia,
    logradouro_emitente: company.logradouro,
    numero_emitente: company.numero,
    bairro_emitente: company.bairro,
    municipio_emitente: company.municipio,
    uf_emitente: company.uf,
    cep_emitente: company.cep,
    inscricao_estadual_emitente: company.inscricao_estadual,
    regime_tributario_emitente: config.regime_tributario || '1', // Simples Nacional
    
    // Client info (for NFC-e, client is optional)
    cpf_destinatario: client?.cpf || null,
    nome_destinatario: client?.name || 'CONSUMIDOR FINAL',
    
    // Invoice details
    serie: config.serie || '1',
    numero: nextNumber.toString(),
    
    // Items
    items: nfceItems,
    
    // Payment
    formas_pagamento: [{
      forma_pagamento: formaPagamento,
      valor_pagamento: total_amount.toFixed(2),
    }],
    
    // Totals
    valor_produtos: total_amount.toFixed(2),
    valor_total: total_amount.toFixed(2),
  };

  console.log('Sending to Focus NFe:', JSON.stringify(nfcePayload, null, 2));

  // Make request to Focus NFe
  const referenceId = `REF_${sale_id}_${Date.now()}`;
  const response = await fetch(`${baseUrl}/nfce?ref=${referenceId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(apiKey + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(nfcePayload),
  });

  const responseData = await response.json();
  console.log('Focus NFe response:', JSON.stringify(responseData, null, 2));

  // Parse response and save to database
  const status = response.ok ? 'processando' : 'erro';
  const errorMessage = !response.ok ? translateFocusError(responseData) : null;

  // Create invoice record
  const { data: nota, error: notaError } = await supabase
    .from('notas_fiscais')
    .insert({
      company_id,
      sale_id,
      tipo: 'nfce',
      numero: nextNumber,
      serie: config.serie || '1',
      chave: responseData.chave_nfe || null,
      status,
      referencia_focus: referenceId,
      xml: null, // Will be updated when authorized
      pdf_url: null,
      erro_sefaz: errorMessage,
      ambiente: config.ambiente,
    })
    .select()
    .single();

  if (notaError) {
    console.error('Error saving invoice:', notaError);
  }

  // Update config with next number
  await supabase
    .from('config_fiscal')
    .update({ numero_atual: nextNumber })
    .eq('company_id', company_id);

  if (!response.ok) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        nota_id: nota?.id,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'NFC-e enviada para processamento',
      nota_id: nota?.id,
      referencia: referenceId,
      numero: nextNumber,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function cancelarNota(supabase: any, payload: CancelRequest, apiKey: string) {
  const { company_id, nota_id, justificativa } = payload;

  const config = await getCompanyConfig(supabase, company_id);
  
  // Get the invoice
  const { data: nota, error } = await supabase
    .from('notas_fiscais')
    .select('*')
    .eq('id', nota_id)
    .single();

  if (error || !nota) {
    return new Response(
      JSON.stringify({ error: 'Nota fiscal não encontrada' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const baseUrl = config.ambiente === 'producao' 
    ? FOCUS_NFE_BASE_URL_PRODUCAO 
    : FOCUS_NFE_BASE_URL_HOMOLOGACAO;

  const response = await fetch(`${baseUrl}/nfce/${nota.referencia_focus}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Basic ${btoa(apiKey + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ justificativa }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    const errorMessage = translateFocusError(responseData);
    await supabase
      .from('notas_fiscais')
      .update({ erro_sefaz: errorMessage })
      .eq('id', nota_id);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update invoice status
  await supabase
    .from('notas_fiscais')
    .update({ status: 'cancelada' })
    .eq('id', nota_id);

  return new Response(
    JSON.stringify({ success: true, message: 'Nota cancelada com sucesso' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function consultarNota(supabase: any, payload: any, apiKey: string) {
  const { company_id, nota_id } = payload;

  const config = await getCompanyConfig(supabase, company_id);
  
  const { data: nota, error } = await supabase
    .from('notas_fiscais')
    .select('*')
    .eq('id', nota_id)
    .single();

  if (error || !nota) {
    return new Response(
      JSON.stringify({ error: 'Nota fiscal não encontrada' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const baseUrl = config.ambiente === 'producao' 
    ? FOCUS_NFE_BASE_URL_PRODUCAO 
    : FOCUS_NFE_BASE_URL_HOMOLOGACAO;

  const response = await fetch(`${baseUrl}/nfce/${nota.referencia_focus}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${btoa(apiKey + ':')}`,
    },
  });

  const responseData = await response.json();

  // Update local record with latest status
  const newStatus = mapFocusStatus(responseData.status);
  
  await supabase
    .from('notas_fiscais')
    .update({
      status: newStatus,
      chave: responseData.chave_nfe || nota.chave,
      xml: responseData.caminho_xml_nota_fiscal || nota.xml,
      pdf_url: responseData.caminho_danfe || nota.pdf_url,
    })
    .eq('id', nota_id);

  return new Response(
    JSON.stringify({ 
      success: true, 
      nota: {
        ...nota,
        status: newStatus,
        focus_data: responseData,
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function validarConfiguracao(supabase: any, companyId: string, apiKey: string) {
  try {
    const config = await getCompanyConfig(supabase, companyId);
    const company = await getCompany(supabase, companyId);

    const issues: string[] = [];

    // Validate company data
    if (!company.cnpj) issues.push('CNPJ da empresa não configurado');
    if (!company.razao_social) issues.push('Razão social não configurada');
    if (!company.inscricao_estadual) issues.push('Inscrição estadual não configurada');
    if (!company.logradouro) issues.push('Endereço incompleto');
    if (!company.uf) issues.push('UF não configurada');

    // Validate config
    if (!config.serie) issues.push('Série da nota não configurada');

    // Test Focus NFe connection
    const baseUrl = config.ambiente === 'producao' 
      ? FOCUS_NFE_BASE_URL_PRODUCAO 
      : FOCUS_NFE_BASE_URL_HOMOLOGACAO;

    try {
      const testResponse = await fetch(`${baseUrl}/nfce`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(apiKey + ':')}`,
        },
      });
      
      if (testResponse.status === 401) {
        issues.push('Chave da API Focus NFe inválida');
      }
    } catch (e) {
      issues.push('Não foi possível conectar ao Focus NFe');
    }

    return new Response(
      JSON.stringify({ 
        success: issues.length === 0,
        issues,
        config: {
          tipo_nota: config.tipo_nota,
          ambiente: config.ambiente,
          emitir_automatico: config.emitir_automatico,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false,
        issues: [errorMessage],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function mapPaymentMethod(method: string): string {
  const mapping: Record<string, string> = {
    'dinheiro': '01',
    'pix': '17',
    'credito': '03',
    'debito': '04',
  };
  return mapping[method] || '99'; // 99 = outros
}

function mapFocusStatus(focusStatus: string): string {
  const mapping: Record<string, string> = {
    'autorizado': 'autorizada',
    'cancelado': 'cancelada',
    'erro_autorizacao': 'rejeitada',
    'processando_autorizacao': 'processando',
  };
  return mapping[focusStatus] || focusStatus;
}

function translateFocusError(response: any): string {
  // Translate common Focus NFe errors to user-friendly messages
  const errorMessages: Record<string, string> = {
    'cnpj_emitente_invalido': 'CNPJ da empresa inválido',
    'inscricao_estadual_invalida': 'Inscrição estadual inválida',
    'certificado_invalido': 'Certificado digital inválido ou expirado',
    'duplicidade': 'Nota fiscal duplicada',
    'rejeicao_schema': 'Dados da nota fiscal inválidos',
  };

  if (response.erros && Array.isArray(response.erros)) {
    const translatedErrors = response.erros.map((err: any) => {
      const code = err.codigo || err.code;
      return errorMessages[code] || err.mensagem || err.message || 'Erro desconhecido';
    });
    return translatedErrors.join('; ');
  }

  if (response.mensagem) {
    return response.mensagem;
  }

  return 'Erro ao processar nota fiscal. Tente novamente.';
}
