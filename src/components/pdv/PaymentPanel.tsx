// =====================================================
// Payment Panel - Painel de Pagamento com Múltiplas Formas
// =====================================================
import { useState } from 'react';
import { CreditCard, Banknote, Smartphone, Check, Percent, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PaymentMethod } from './types';

interface PaymentItem {
  id: string;
  method: PaymentMethod;
  amount: number;
}

interface PaymentPanelProps {
  totalToPay: number;
  onFinalize: (payments: PaymentItem[], change: number) => void;
  isLoading: boolean;
  disabled: boolean;
}

const paymentMethods: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'PIX', icon: Smartphone },
  { value: 'credito', label: 'Crédito', icon: CreditCard },
  { value: 'debito', label: 'Débito', icon: CreditCard },
];

export function PaymentPanel({ totalToPay, onFinalize, isLoading, disabled }: PaymentPanelProps) {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [inputAmount, setInputAmount] = useState('');
  const [cashReceived, setCashReceived] = useState('');

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = totalToPay - totalPaid;
  const hasCash = payments.some(p => p.method === 'dinheiro');
  const cashAmount = payments.filter(p => p.method === 'dinheiro').reduce((sum, p) => sum + p.amount, 0);
  const cashReceivedValue = parseFloat(cashReceived.replace(',', '.')) || 0;
  const change = hasCash ? Math.max(0, cashReceivedValue - cashAmount) : 0;

  const addPayment = (method: PaymentMethod, amount?: number) => {
    const value = amount || parseFloat(inputAmount.replace(',', '.'));
    if (!value || value <= 0) return;

    const effectiveAmount = Math.min(value, remainingAmount);
    if (effectiveAmount <= 0) return;

    setPayments(prev => [...prev, {
      id: `pay_${Date.now()}`,
      method,
      amount: effectiveAmount,
    }]);
    setInputAmount('');
  };

  const removePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const addRemainingAmount = () => {
    if (remainingAmount > 0) {
      addPayment(selectedMethod, remainingAmount);
    }
  };

  const handleFinalize = () => {
    if (payments.length === 0) {
      // Single payment with full amount
      onFinalize([{
        id: 'single',
        method: selectedMethod,
        amount: totalToPay,
      }], change);
    } else if (remainingAmount <= 0.01) {
      onFinalize(payments, change);
    }
  };

  const canFinalize = payments.length > 0 ? remainingAmount <= 0.01 : true;

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment method selector */}
        <div className="grid grid-cols-4 gap-2">
          {paymentMethods.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                onClick={() => setSelectedMethod(m.value)}
                className={cn(
                  'p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all',
                  selectedMethod === m.value 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/30'
                )}
              >
                <Icon className={cn(
                  'w-5 h-5',
                  selectedMethod === m.value ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-xs font-medium',
                  selectedMethod === m.value ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Multiple payments section */}
        {payments.length > 0 && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-xl">
            <p className="text-xs font-medium text-muted-foreground">Pagamentos adicionados:</p>
            {payments.map(p => {
              const method = paymentMethods.find(m => m.value === p.method);
              return (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {method?.icon && <method.icon className="w-4 h-4 text-muted-foreground" />}
                    {method?.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">R$ {p.amount.toFixed(2)}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-6 h-6 text-red-500 hover:text-red-700"
                      onClick={() => removePayment(p.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total pago:</span>
              <span className="text-primary">R$ {totalPaid.toFixed(2)}</span>
            </div>
            {remainingAmount > 0.01 && (
              <div className="flex justify-between text-amber-600">
                <span>Falta:</span>
                <span>R$ {remainingAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Add partial payment */}
        {totalToPay > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Adicionar pagamento parcial</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Valor"
                value={inputAmount}
                onChange={e => setInputAmount(e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={() => addPayment(selectedMethod)}
                disabled={!inputAmount}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button 
                variant="secondary"
                onClick={addRemainingAmount}
                disabled={remainingAmount <= 0}
              >
                Restante
              </Button>
            </div>
          </div>
        )}

        {/* Cash received (for change calculation) */}
        {hasCash && (
          <div className="space-y-2">
            <Label className="text-xs">Valor recebido (dinheiro)</Label>
            <Input
              type="text"
              placeholder="0,00"
              value={cashReceived}
              onChange={e => setCashReceived(e.target.value)}
            />
            {change > 0 && (
              <div className="flex justify-between text-green-600 font-medium p-2 bg-green-50 rounded-lg">
                <span>Troco:</span>
                <span>R$ {change.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Finalize button */}
        <Button
          className="w-full h-14 text-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          onClick={handleFinalize}
          disabled={isLoading || disabled || !canFinalize}
        >
          <Check className="w-5 h-5 mr-2" />
          {isLoading ? 'Registrando...' : `Finalizar R$ ${totalToPay.toFixed(2)}`}
        </Button>
      </CardContent>
    </Card>
  );
}
