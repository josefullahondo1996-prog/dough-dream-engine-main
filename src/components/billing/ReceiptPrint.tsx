import { forwardRef } from "react";

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface ReceiptData {
  invoiceNumber: string;
  orderNumber: string;
  tableName: string;
  clientName: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount: number;
  iva: number;
  total: number;
  payments: { method: string; amount: number }[];
  change: number;
}

const methodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  qr: "QR",
};

const ReceiptPrint = forwardRef<HTMLDivElement, { data: ReceiptData }>(({ data }, ref) => {
  const formatGs = (v: number) => `Gs. ${v.toLocaleString()}`;

  return (
    <div ref={ref} className="hidden print:block p-4 font-mono text-xs max-w-[300px] mx-auto text-black bg-white">
      {/* Header */}
      <div className="text-center mb-3">
        <p className="text-base font-bold">🍕 GastroApp</p>
        <p className="text-[10px]">Sucursal Principal</p>
        <p className="text-[10px]">Tel: +595 21 123456</p>
        <p className="text-[10px]">RUC: 80012345-6</p>
      </div>

      <div className="border-t border-dashed border-black pt-2 mb-2">
        <p className="font-bold text-center">{data.invoiceNumber}</p>
        <p className="text-[10px]">Fecha: {data.date}</p>
        <p className="text-[10px]">Orden: {data.orderNumber}</p>
        {data.tableName && <p className="text-[10px]">Mesa: {data.tableName}</p>}
        {data.clientName && <p className="text-[10px]">Cliente: {data.clientName}</p>}
      </div>

      {/* Items */}
      <div className="border-t border-dashed border-black pt-2 mb-2">
        <div className="flex justify-between font-bold mb-1">
          <span>Producto</span>
          <span>Total</span>
        </div>
        {data.items.map((item, i) => (
          <div key={i} className="mb-1">
            <div className="flex justify-between">
              <span className="truncate max-w-[180px]">{item.name}</span>
              <span>{formatGs(item.subtotal)}</span>
            </div>
            <p className="text-[10px] text-gray-600 pl-2">
              {item.quantity} x {formatGs(item.unitPrice)}
            </p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-dashed border-black pt-2 mb-2 space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatGs(data.subtotal)}</span>
        </div>
        {data.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>Descuento:</span>
            <span>-{formatGs(data.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>IVA (10%):</span>
          <span>{formatGs(data.iva)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm border-t border-dashed border-black pt-1">
          <span>TOTAL:</span>
          <span>{formatGs(data.total)}</span>
        </div>
      </div>

      {/* Payments */}
      <div className="border-t border-dashed border-black pt-2 mb-2">
        <p className="font-bold mb-1">Pagos:</p>
        {data.payments.map((p, i) => (
          <div key={i} className="flex justify-between">
            <span>{methodLabels[p.method] || p.method}</span>
            <span>{formatGs(p.amount)}</span>
          </div>
        ))}
        {data.change > 0 && (
          <div className="flex justify-between font-bold mt-1">
            <span>Vuelto:</span>
            <span>{formatGs(data.change)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-dashed border-black pt-2 text-center">
        <p className="text-[10px]">¡Gracias por su preferencia!</p>
        <p className="text-[10px]">Vuelva pronto 🍕</p>
      </div>
    </div>
  );
});

ReceiptPrint.displayName = "ReceiptPrint";
export default ReceiptPrint;
export type { ReceiptData, ReceiptItem };
