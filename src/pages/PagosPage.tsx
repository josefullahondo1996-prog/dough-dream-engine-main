import { useState } from "react";
import { CreditCard, DollarSign, Search, Calendar, Filter, ArrowUpRight, CheckCircle, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentRecord {
  id: string;
  invoiceNumber: string;
  orderId: string;
  clientName: string;
  amount: number;
  method: "Efectivo" | "Tarjeta de Débito" | "Tarjeta de Crédito" | "Transferencia" | "MercadoPago";
  date: string;
  status: "Completado" | "Reembolsado";
}

const INITIAL_PAYMENTS: PaymentRecord[] = [
  { id: "p1", invoiceNumber: "INV-00104", orderId: "ORD-8901", clientName: "Juan Pérez", amount: 15400, method: "Tarjeta de Crédito", date: "2026-09-15 20:45", status: "Completado" },
  { id: "p2", invoiceNumber: "INV-00103", orderId: "ORD-8900", clientName: "María García", amount: 8900, method: "Efectivo", date: "2026-09-15 20:12", status: "Completado" },
  { id: "p3", invoiceNumber: "INV-00102", orderId: "ORD-8898", clientName: "Carlos López", amount: 24500, method: "Transferencia", date: "2026-09-15 19:30", status: "Completado" },
  { id: "p4", invoiceNumber: "INV-00101", orderId: "ORD-8895", clientName: "Consumidor Final", amount: 6200, method: "MercadoPago", date: "2026-09-15 18:50", status: "Completado" },
  { id: "p5", invoiceNumber: "INV-00100", orderId: "ORD-8890", clientName: "Ana Martínez", amount: 12000, method: "Tarjeta de Débito", date: "2026-09-15 17:15", status: "Completado" },
];

export default function PagosPage() {
  const [payments] = useState<PaymentRecord[]>(INITIAL_PAYMENTS);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("Todos");

  const filtered = payments.filter((p) => {
    const matchSearch = p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.orderId.toLowerCase().includes(search.toLowerCase());
    const matchMethod = methodFilter === "Todos" || p.method === methodFilter;
    return matchSearch && matchMethod;
  });

  const totalAmount = filtered.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-500" />
            Registro de Pagos y Transacciones
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Consulta las cobros procesados, métodos de pago utilizados y comprobantes emitidos.
          </p>
        </div>
      </div>

      {/* KPI Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Recaudado (Seleccionado)</span>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            Gs. {totalAmount.toLocaleString()}
          </p>
          <span className="text-xs text-gray-400 mt-2 block">{filtered.length} transacciones registradas</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Método Principal</span>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">Tarjeta de Crédito</p>
          <span className="text-xs text-emerald-600 font-medium mt-2 block">42% del total recaudado</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Promedio por Pago</span>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            Gs. {filtered.length > 0 ? Math.round(totalAmount / filtered.length).toLocaleString() : 0}
          </p>
          <span className="text-xs text-gray-400 mt-2 block">Ticket de cobro promedio</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, factura u orden..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent text-sm border-none focus:outline-none dark:text-white"
          />
        </div>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm font-medium dark:text-white"
        >
          <option value="Todos">Todos los Métodos</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Tarjeta de Débito">Tarjeta de Débito</option>
          <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
          <option value="Transferencia">Transferencia</option>
          <option value="MercadoPago">MercadoPago</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">
                <th className="py-3.5 px-4">Factura / Orden</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Método de Pago</th>
                <th className="py-3.5 px-4">Fecha & Hora</th>
                <th className="py-3.5 px-4 text-right">Monto</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                    <div>{p.invoiceNumber}</div>
                    <span className="text-xs text-gray-400 font-normal">{p.orderId}</span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300 font-medium">{p.clientName}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300">
                      {p.method}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400">{p.date}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    Gs. {p.amount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                      <CheckCircle className="w-3 h-3" /> {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
