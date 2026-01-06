// =====================================================
// Invoice Modal - Modal de Recibo/Nota Fiscal
// =====================================================
import { useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Printer, Download, Receipt, Scissors, Hotel, Package, Gift, Dog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CartItem, PaymentMethod, paymentMethodLabels } from './types';
import { useModules } from '@/contexts/ModulesContext';

interface SaleData {
  id: string;
  created_at: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  payments: { method: PaymentMethod; amount: number }[];
  change: number;
  client?: { name: string; whatsapp: string; email?: string };
  pet?: { name: string; species: string };
  employee?: { name: string };
}

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  sale: SaleData | null;
}

const typeIcons = {
  product: Package,
  service_banho: Scissors,
  service_hotel: Hotel,
  service_consulta: Package,
  extra: Package,
};

export function InvoiceModal({ open, onClose, sale }: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { config } = useModules();

  if (!sale) return null;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo #${sale.id.slice(-8)}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; font-size: 14px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formattedDate = format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Recibo de Venda
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="space-y-4 p-4 bg-white rounded-lg">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-lg font-bold">{config?.business_name || 'PetSaaS'}</h2>
            <p className="text-sm text-muted-foreground">Recibo #{sale.id.slice(-8).toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>

          <Separator />

          {/* Client/Pet info */}
          {(sale.client || sale.pet) && (
            <>
              <div className="space-y-1 text-sm">
                {sale.client && (
                  <p><strong>Cliente:</strong> {sale.client.name}</p>
                )}
                {sale.pet && (
                  <p className="flex items-center gap-1">
                    <Dog className="w-3 h-3" />
                    <strong>Pet:</strong> {sale.pet.name} ({sale.pet.species})
                  </p>
                )}
                {sale.employee && (
                  <p><strong>Atendente:</strong> {sale.employee.name}</p>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Items */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">ITENS</p>
            {sale.items.map((item, index) => {
              const Icon = typeIcons[item.type] || Package;
              return (
                <div key={index} className="flex justify-between items-start text-sm">
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      <span>{item.description}</span>
                    </div>
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground ml-4">
                        {item.quantity}x R$ {item.unit_price.toFixed(2)}
                      </p>
                    )}
                    {item.covered_by_plan && (
                      <Badge variant="outline" className="text-xs ml-4 mt-1">
                        <Gift className="w-2 h-2 mr-1" />
                        Plano
                      </Badge>
                    )}
                  </div>
                  <span className={item.covered_by_plan ? 'text-green-600' : ''}>
                    {item.covered_by_plan ? 'R$ 0,00' : `R$ ${item.total_price.toFixed(2)}`}
                  </span>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>R$ {sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Desconto:</span>
                <span>- R$ {sale.discount.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>TOTAL:</span>
              <span className="text-primary">R$ {sale.total.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Payment info */}
          <div className="space-y-1 text-sm">
            <p className="text-xs font-medium text-muted-foreground">PAGAMENTO</p>
            {sale.payments.map((p, index) => (
              <div key={index} className="flex justify-between">
                <span>{paymentMethodLabels[p.method]}:</span>
                <span>R$ {p.amount.toFixed(2)}</span>
              </div>
            ))}
            {sale.change > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Troco:</span>
                <span>R$ {sale.change.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4">
            <p>Obrigado pela preferência!</p>
            <p>Volte sempre 🐾</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
