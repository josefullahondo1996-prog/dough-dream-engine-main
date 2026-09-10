import { useState, useRef, useMemo, useCallback } from "react";
import { X, Banknote, CreditCard, ArrowRightLeft, QrCode, Printer, CheckCircle, AlertCircle, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import ReceiptPrint from "./ReceiptPrint";
import type { ReceiptData } from "./ReceiptPrint";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface BillingOrder {
  id: string;
  orderNumber: string;
  tableName: string;
  clientName: string;
  items: OrderItem[];
  createdAt: string;
}

interface PaymentEntry {
  method: "efectivo" | "tarjeta" | "transferencia" | "qr";
  amount: number;
}

interface BillingModalProps {
  order: BillingOrder;
  onClose: () => void;
  onCancelOrder: (reason: string) => Promise<void>;
  onConfirm: (data: {
    subtotal: number;
    discountAmount: number;
    iva: number;
    total: number;
    payments: PaymentEntry[];
    change: number;
    invoiceNumber: string;
  }) => Promise<string | void> | string | void;
  isCashOpen: boolean;
  canCancelOrder: boolean;
}

const paymentMethods = [
  { key: "efectivo" as const, label: "Efectivo", icon: Banknote },
  { key: "tarjeta" as const, label: "Tarjeta", icon: CreditCard },
  { key: "transferencia" as const, label: "Transferencia", icon: ArrowRightLeft },
  { key: "qr" as const, label: "QR", icon: QrCode },
];

export default function BillingModal({ order, onClose, onCancelOrder, onConfirm, isCashOpen, canCancelOrder }: BillingModalProps) {
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [activeMethod, setActiveMethod] = useState<PaymentEntry["method"]>("efectivo");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [cancelling, setCancelling] = useState(false);
    const [confirmedInvoiceNumber, setConfirmedInvoiceNumber] = useState("");
  const receiptRef = useRef<HTMLDivElement>(null);

  const ivaRate = 10;

  const subtotal = useMemo(
    () => order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [order.items]
  );

  const discountAmount = useMemo(() => {
    if (discountType === "percent") return Math.min(subtotal, Math.round(subtotal * (discountValue / 100)));
    return Math.min(subtotal, discountValue);
  }, [subtotal, discountType, discountValue]);

  const subtotalAfterDiscount = subtotal - discountAmount;
  const iva = Math.round(subtotalAfterDiscount * (ivaRate / 100));
  const total = subtotalAfterDiscount + iva;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = total - totalPaid;
  const change = totalPaid > total ? totalPaid - total : 0;
  const canConfirm = totalPaid >= total && total > 0 && isCashOpen;

  const addPayment = useCallback(() => {
    const amt = parseInt(paymentAmount) || 0;
    if (amt <= 0) return;
    setPayments((prev) => [...prev, { method: activeMethod, amount: amt }]);
    setPaymentAmount("");
  }, [paymentAmount, activeMethod]);

  const removePayment = (index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const payFull = () => {
    const rem = remaining > 0 ? remaining : total;
    setPayments((prev) => [...prev, { method: activeMethod, amount: rem }]);
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setConfirming(true);
    try {
      const returnedInvoiceNumber = await onConfirm({
        subtotal,
        discountAmount,
        iva,
        total,
        payments,
        change,
        invoiceNumber: "",
      });
      setConfirmedInvoiceNumber(typeof returnedInvoiceNumber === "string" ? returnedInvoiceNumber : "Pendiente");
      setShowReceipt(true);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!canCancelOrder || cancelling) return;
    const reason = window.prompt("Motivo de la anulación:")?.trim();
    if (!reason) return;
    setCancelling(true);
    try {
      await onCancelOrder(reason);
      onClose();
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatGs = (v: number) => `Gs. ${v.toLocaleString()}`;

  const receiptData: ReceiptData = {
    invoiceNumber: confirmedInvoiceNumber || "Pendiente",
    orderNumber: order.orderNumber,
    tableName: order.tableName,
    clientName: order.clientName,
    date: new Date().toLocaleString("es-PY"),
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.quantity * i.unitPrice,
    })),
    subtotal,
    discountAmount,
    iva,
    total,
    payments,
    change,
  };

  if (showReceipt) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-elevated max-w-md w-full p-6 space-y-4 animate-fade-in">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-card-foreground">¡Venta completada!</h2>
            <p className="text-sm text-muted-foreground mt-1">Factura generada exitosamente</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">Total cobrado</p>
            <p className="text-2xl font-bold text-primary">{formatGs(total)}</p>
            {change > 0 && (
              <p className="text-sm font-medium text-success mt-1">Vuelto: {formatGs(change)}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir ticket
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Cerrar
            </button>
          </div>
        </div>
        <ReceiptPrint ref={receiptRef} data={receiptData} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 print:hidden">
      <div className="bg-card rounded-2xl shadow-elevated max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-card-foreground">Facturación — {order.orderNumber}</h2>
            <p className="text-sm text-muted-foreground">
              {order.tableName} · {order.clientName || "Sin cliente"} · {new Date(order.createdAt).toLocaleString("es-PY")}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isCashOpen && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>La caja está cerrada. Debe abrir la caja antes de facturar.</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
          {/* Left - Products */}
          <div className="flex-1 p-6 border-r border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Productos</h3>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 px-3 bg-secondary/30 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-card-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatGs(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-card-foreground">{formatGs(item.quantity * item.unitPrice)}</p>
                </div>
              ))}
            </div>

            {/* Discount */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Descuento</h3>
              <div className="flex gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                  className="px-3 py-2 text-sm bg-secondary rounded-lg border border-border text-foreground"
                >
                  <option value="percent">%</option>
                  <option value="fixed">Gs.</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={discountType === "percent" ? 100 : subtotal}
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="flex-1 px-3 py-2 text-sm bg-secondary rounded-lg border border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="mt-6 space-y-2 p-4 bg-secondary/50 rounded-xl">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-card-foreground">{formatGs(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Descuento</span>
                  <span className="text-destructive">-{formatGs(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA ({ivaRate}%)</span>
                <span className="text-card-foreground">{formatGs(iva)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span className="text-card-foreground">TOTAL</span>
                <span className="text-primary">{formatGs(total)}</span>
              </div>
            </div>
          </div>

          {/* Right - Payment */}
          <div className="flex-1 p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Método de pago</h3>

            {/* Methods */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {paymentMethods.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => setActiveMethod(m.key)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-colors",
                      activeMethod === m.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Amount input */}
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Monto a pagar..."
                className="flex-1 px-3 py-2.5 text-sm bg-secondary rounded-lg border border-border text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => e.key === "Enter" && addPayment()}
              />
              <button
                onClick={addPayment}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick pay button */}
            <button
              onClick={payFull}
              className="w-full mb-4 py-2.5 text-sm font-medium bg-accent/10 text-accent border border-accent/30 rounded-xl hover:bg-accent/20 transition-colors"
            >
              Pagar total restante ({formatGs(remaining > 0 ? remaining : total)})
            </button>

            {/* Payment entries */}
            {payments.length > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Pagos registrados</h4>
                {payments.map((p, i) => {
                  const m = paymentMethods.find((pm) => pm.key === p.method);
                  return (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-success/5 border border-success/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        {m && <m.icon className="w-3.5 h-3.5 text-success" />}
                        <span className="text-sm text-card-foreground">{m?.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-success">{formatGs(p.amount)}</span>
                        <button onClick={() => removePayment(i)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Payment summary */}
            <div className="p-4 bg-secondary/50 rounded-xl space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total a pagar</span>
                <span className="font-bold text-card-foreground">{formatGs(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto pagado</span>
                <span className={cn("font-bold", totalPaid >= total ? "text-success" : "text-warning")}>{formatGs(totalPaid)}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Falta</span>
                  <span className="font-bold text-destructive">{formatGs(remaining)}</span>
                </div>
              )}
              {change > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vuelto</span>
                  <span className="font-bold text-success">{formatGs(change)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors">
            Cancelar
          </button>
          {canCancelOrder && (
            <button onClick={() => void handleCancelOrder()} disabled={cancelling || confirming} className="flex-1 py-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 disabled:opacity-60">
              {cancelling ? "Anulando..." : "Anular orden"}
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || confirming}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2",
              canConfirm
                ? "bg-success text-success-foreground hover:opacity-90 shadow-md"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Banknote className="w-5 h-5" />
            COBRAR {formatGs(total)}
          </button>
        </div>
      </div>
    </div>
  );
}
