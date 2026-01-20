import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wrench, 
  RefreshCw, 
  Trash2, 
  AlertTriangle, 
  Database,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
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

interface ActionResult {
  success: boolean;
  message: string;
}

export default function AdminActions() {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    title: string;
    description: string;
    action: () => Promise<ActionResult>;
  } | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, ActionResult>>({});

  const executeAction = async (actionId: string, action: () => Promise<ActionResult>) => {
    setIsExecuting(actionId);
    try {
      const result = await action();
      setLastResults(prev => ({ ...prev, [actionId]: result }));
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setLastResults(prev => ({ ...prev, [actionId]: { success: false, message: errorMessage } }));
      toast.error(errorMessage);
    } finally {
      setIsExecuting(null);
      setConfirmAction(null);
    }
  };

  const actions = [
    {
      id: 'clear-pending-payments',
      title: 'Limpar Pagamentos Pendentes',
      description: 'Marca todos os pagamentos pendentes como cancelados.',
      icon: RefreshCw,
      dangerous: true,
      action: async (): Promise<ActionResult> => {
        const { error } = await supabase
          .from('sales')
          .update({ payment_status: 'cancelado' })
          .eq('payment_status', 'pendente');

        if (error) throw new Error(error.message);
        return { success: true, message: 'Pagamentos atualizados com sucesso' };
      }
    },
    {
      id: 'reset-kanban-status',
      title: 'Resetar Status Kanban',
      description: 'Reseta o status kanban de todos os agendamentos de hoje para "espera".',
      icon: RefreshCw,
      dangerous: false,
      action: async (): Promise<ActionResult> => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { error } = await supabase
          .from('bath_grooming_appointments')
          .update({ kanban_status: 'espera' })
          .gte('start_datetime', today.toISOString())
          .lt('start_datetime', tomorrow.toISOString());

        if (error) throw new Error(error.message);
        return { success: true, message: 'Agendamentos resetados com sucesso' };
      }
    },
    {
      id: 'cleanup-old-reminders',
      title: 'Limpar Lembretes Antigos',
      description: 'Remove lembretes resolvidos com mais de 30 dias.',
      icon: Trash2,
      dangerous: true,
      action: async (): Promise<ActionResult> => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { error } = await supabase
          .from('health_reminders')
          .delete()
          .eq('status', 'resolvido')
          .lt('resolved_at', thirtyDaysAgo.toISOString());

        if (error) throw new Error(error.message);
        return { success: true, message: 'Lembretes removidos com sucesso' };
      }
    },
    {
      id: 'recalculate-stock',
      title: 'Recalcular Estoque',
      description: 'Recalcula o estoque de todos os produtos com base nas movimentações.',
      icon: Database,
      dangerous: false,
      action: async (): Promise<ActionResult> => {
        // Get all products
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, stock_quantity');

        if (productsError) throw new Error(productsError.message);

        // For each product, calculate stock from movements
        let updated = 0;
        for (const product of products || []) {
          const { data: movements, error: movError } = await supabase
            .from('stock_movements')
            .select('quantity, type')
            .eq('product_id', product.id);

          if (movError) continue;

          const calculatedStock = (movements || []).reduce((acc, mov) => {
            if (mov.type === 'entrada') return acc + mov.quantity;
            if (mov.type === 'saida') return acc - mov.quantity;
            return acc;
          }, 0);

          if (calculatedStock !== product.stock_quantity) {
            await supabase
              .from('products')
              .update({ stock_quantity: calculatedStock })
              .eq('id', product.id);
            updated++;
          }
        }

        return { success: true, message: `${updated} produtos atualizados` };
      }
    },
    {
      id: 'clear-test-data',
      title: 'Limpar Dados de Teste',
      description: 'Remove todos os clientes, pets e agendamentos. AÇÃO IRREVERSÍVEL.',
      icon: Trash2,
      dangerous: true,
      action: async (): Promise<ActionResult> => {
        // Delete in order due to foreign keys
        await supabase.from('bath_grooming_appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('hotel_stays').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('client_plans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('pets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        return { success: true, message: 'Todos os dados de teste foram removidos' };
      }
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1F2933]">Ações de Fundador</h1>
        <p className="text-[#64748B] mt-1">
          Debug, testes e correções de dados
        </p>
      </div>

      {/* Warning Banner */}
      <Card className="border-[#F59E0B] bg-[#FFFBEB]">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-[#92400E]">Área restrita</p>
            <p className="text-sm text-[#B45309]">
              Estas ações afetam diretamente o banco de dados. Algumas são irreversíveis.
              Confirme antes de executar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {actions.map((action) => (
          <Card key={action.id} className="border-[#E2E8F0] bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#1F2933] flex items-center gap-2">
                <action.icon className={`w-5 h-5 ${action.dangerous ? 'text-red-500' : 'text-[#64748B]'}`} />
                {action.title}
              </CardTitle>
              <CardDescription className="text-[#64748B]">
                {action.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <Button
                  variant={action.dangerous ? 'destructive' : 'outline'}
                  size="sm"
                  disabled={isExecuting === action.id}
                  onClick={() => {
                    if (action.dangerous) {
                      setConfirmAction({
                        id: action.id,
                        title: action.title,
                        description: action.description,
                        action: action.action
                      });
                    } else {
                      executeAction(action.id, action.action);
                    }
                  }}
                  className={action.dangerous ? 'bg-red-500 hover:bg-red-600' : 'border-[#E2E8F0]'}
                >
                  {isExecuting === action.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <Wrench className="w-4 h-4 mr-2" />
                      Executar
                    </>
                  )}
                </Button>

                {lastResults[action.id] && (
                  <div className="flex items-center gap-2 text-sm">
                    {lastResults[action.id].success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={lastResults[action.id].success ? 'text-green-600' : 'text-red-600'}>
                      {lastResults[action.id].message}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="bg-white border-[#E2E8F0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#1F2933]">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {confirmAction?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#64748B]">
              {confirmAction?.description}
              <br /><br />
              <strong>Essa ação não pode ser desfeita.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E2E8F0]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && executeAction(confirmAction.id, confirmAction.action)}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Confirmar e executar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
