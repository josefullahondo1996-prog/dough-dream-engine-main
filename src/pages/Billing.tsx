import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Banknote, CheckCircle, Clock, DollarSign, Lock, Receipt, Search, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import BillingModal from "@/components/billing/BillingModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { appendAuditLog } from "@/lib/audit-log";
import { canRefundPayment, canProcessPayment } from "@/lib/payment-guard";

type Order = Tables<"orders">;
type OrderLine = Tables<"order_items">;
type Product = Tables<"menu_items">;
type Table = Tables<"restaurant_tables">;
type Client = Tables<"clients">;
type BillingOrder = { id: string; orderNumber: string; tableName: string; clientName: string; items: { id: string; name: string; quantity: number; unitPrice: number }[]; total: number; status: "listo" | "entregado" | "pagada"; createdAt: string; waiter: string };
type Invoice = { invoiceNumber: string; orderId: string; total: number };

const statusConfig = { listo: { label: "Listo para cobrar", color: "bg-warning/10 text-warning", icon: Clock }, entregado: { label: "Entregado", color: "bg-primary/10 text-primary", icon: CheckCircle }, pagada: { label: "Pagada", color: "bg-success/10 text-success", icon: DollarSign } } as const;

export default function Billing() {
  const { restaurant, membership, user, profile } = useAuth();
  const [orders, setOrders] = useState<BillingOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("pending");
  const [selectedOrder, setSelectedOrder] = useState<BillingOrder | null>(null);
  const [isCashOpen, setIsCashOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBilling = useCallback(async () => {
    if (!restaurant) { setOrders([]); setInvoices([]); setIsLoading(false); return; }
    setIsLoading(true);
    const [ordersResult, linesResult, productsResult, tablesResult, clientsResult, invoicesResult] = await Promise.all([
      supabase.from("orders").select("*").eq("restaurant_id", restaurant.id).in("status", ["listo", "entregado", "pagada"]).order("created_at", { ascending: false }),
      supabase.from("order_items").select("*").eq("restaurant_id", restaurant.id),
      supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id),
      supabase.from("restaurant_tables").select("*").eq("restaurant_id", restaurant.id),
      supabase.from("clients").select("*").eq("restaurant_id", restaurant.id),
      supabase.from("invoices").select("id, invoice_number, order_id, total").eq("restaurant_id", restaurant.id),
    ]);
    const queryError = ordersResult.error || linesResult.error || productsResult.error || tablesResult.error || clientsResult.error || invoicesResult.error;
    if (queryError) { setError(queryError.message); setIsLoading(false); return; }
    const products = Object.fromEntries((productsResult.data ?? []).map((item: Product) => [item.id, item]));
    const tables = Object.fromEntries((tablesResult.data ?? []).map((table: Table) => [table.id, table]));
    const clients = Object.fromEntries((clientsResult.data ?? []).map((client: Client) => [client.id, client]));
    const linesByOrder = (linesResult.data ?? []).reduce<Record<string, OrderLine[]>>((result, line) => { (result[line.order_id] ||= []).push(line); return result; }, {});
    setOrders((ordersResult.data ?? []).map((order: Order) => ({ id: order.id, orderNumber: `#${order.id.slice(0, 8)}`, tableName: order.table_id ? tables[order.table_id]?.name || "Sin mesa" : "Sin mesa", clientName: order.client_id ? clients[order.client_id]?.name || "Sin cliente" : "Sin cliente", items: (linesByOrder[order.id] || []).map((line) => ({ id: line.id, name: products[line.menu_item_id || ""]?.name || "Producto eliminado", quantity: line.quantity, unitPrice: line.price_at_order })), total: order.total, status: order.status === "pagada" ? "pagada" : order.status === "entregado" ? "entregado" : "listo", createdAt: order.created_at, waiter: order.waiter_name || "Sin asignar" })));
    setInvoices((invoicesResult.data ?? []).map((invoice) => ({ invoiceNumber: invoice.invoice_number, orderId: invoice.order_id, total: invoice.total })));
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => { void loadBilling(); }, [loadBilling]);

  const filtered = useMemo(() => orders.filter((order) => { const matchesSearch = order.orderNumber.includes(search) || order.clientName.toLowerCase().includes(search.toLowerCase()); const matchesFilter = filter === "all" || (filter === "pending" && order.status !== "pagada") || (filter === "paid" && order.status === "pagada"); return matchesSearch && matchesFilter; }), [orders, search, filter]);
  const pendingCount = orders.filter((order) => order.status !== "pagada").length;
  const paidCount = orders.filter((order) => order.status === "pagada").length;
  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const formatGs = (value: number) => `Gs. ${value.toLocaleString()}`;
  const canCancelOrder = canRefundPayment(membership?.role);
  const canChargeOrder = canProcessPayment(membership?.role);

  const handleConfirmBilling = async (data: { subtotal: number; discountAmount: number; iva: number; total: number; payments: { method: string; amount: number }[]; change: number; invoiceNumber: string }) => {
    if (!selectedOrder || !canChargeOrder) return;
    const { data: charge, error: chargeError } = await supabase.rpc("charge_order", { p_order_id: selectedOrder.id, p_subtotal: data.subtotal, p_discount: data.discountAmount, p_discount_type: "percent", p_iva_rate: 10, p_iva: data.iva, p_total: data.total, p_payments: data.payments });
    if (chargeError || !charge?.[0]) { setError(chargeError?.message || "No se pudo completar el cobro."); return; }
    const result = charge[0];
    setOrders((current) => current.map((order) => order.id === selectedOrder.id ? { ...order, status: "pagada" } : order));
    setInvoices((current) => [...current, { invoiceNumber: result.invoice_number, orderId: selectedOrder.id, total: data.total }]);
    if (restaurant && user) appendAuditLog({ restaurantId: restaurant.id, userId: user.id, userName: profile?.full_name || user.email || "Usuario", role: membership?.role || "sin-rol", action: "payment", details: `Cobro de ${selectedOrder.orderNumber} por ${formatGs(data.total)}` });
    return result.invoice_number;
  };

  const handleCancelOrder = async (order: BillingOrder, reason: string) => {
    if (!restaurant || !user || !canCancelOrder) return;
    const { error: cancelError } = await supabase.rpc("cancel_order", { p_order_id: order.id, p_reason: reason });
    if (cancelError) { setError(cancelError.message); throw cancelError; }
    setOrders((current) => current.filter((currentOrder) => currentOrder.id !== order.id));
    appendAuditLog({ restaurantId: restaurant.id, userId: user.id, userName: profile?.full_name || user.email || "Usuario", role: membership?.role || "sin-rol", action: "payment-refund", details: `Anulación de ${order.orderNumber}: ${reason}` });
    setError("");
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-foreground">Facturación y Cobro</h1><p className="mt-1 text-sm text-muted-foreground">Cobra órdenes reales del restaurante.</p></div><button onClick={() => setIsCashOpen((open) => !open)} className={cn("inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-md", isCashOpen ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground")}>{isCashOpen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}{isCashOpen ? "Caja abierta" : "Caja cerrada"}</button></div>
    {error && <div className="flex justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><span>{error}</span><button onClick={() => void loadBilling()}>Reintentar</button></div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4"><div className="rounded-xl border border-border bg-card p-4 text-center"><Receipt className="mx-auto mb-1 h-5 w-5 text-warning" /><p className="text-2xl font-bold">{pendingCount}</p><p className="text-xs text-muted-foreground">Pendientes de cobro</p></div><div className="rounded-xl border border-border bg-card p-4 text-center"><CheckCircle className="mx-auto mb-1 h-5 w-5 text-success" /><p className="text-2xl font-bold">{paidCount}</p><p className="text-xs text-muted-foreground">Cobradas</p></div><div className="rounded-xl border border-border bg-card p-4 text-center"><DollarSign className="mx-auto mb-1 h-5 w-5 text-primary" /><p className="text-2xl font-bold text-primary">{formatGs(totalRevenue)}</p><p className="text-xs text-muted-foreground">Ingresos registrados</p></div><div className="rounded-xl border border-border bg-card p-4 text-center">{isCashOpen ? <Unlock className="mx-auto mb-1 h-5 w-5 text-success" /> : <Lock className="mx-auto mb-1 h-5 w-5 text-destructive" />}<p className="font-bold">{isCashOpen ? "Abierta" : "Cerrada"}</p><p className="text-xs text-muted-foreground">Estado de caja</p></div></div>
    <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por orden o cliente..." className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div><div className="flex gap-2">{([["pending", "Pendientes"], ["paid", "Pagadas"], ["all", "Todas"]] as const).map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={cn("rounded-lg border px-3 py-2 text-sm font-medium", filter === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>{label}</button>)}</div></div>
    {isLoading ? <div className="py-16 text-center">Cargando facturación...</div> : <div className="space-y-3">{filtered.map((order) => { const status = statusConfig[order.status]; const StatusIcon = status.icon; const invoice = invoices.find((item) => item.orderId === order.id); return <div key={order.id} onClick={() => order.status !== "pagada" && setSelectedOrder(order)} className={cn("rounded-xl border border-border bg-card p-5 shadow-card", order.status !== "pagada" && "cursor-pointer")}><div className="flex items-center justify-between gap-4"><div className="min-w-0 flex-1"><div className="mb-1.5 flex items-center gap-3"><span className="font-bold">{order.orderNumber}</span><span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", status.color)}><StatusIcon className="h-3 w-3" />{status.label}</span></div><p className="text-sm text-muted-foreground">{order.tableName} · {order.clientName} · {order.waiter}</p><div className="mt-2 flex flex-wrap gap-1.5">{order.items.map((item) => <span key={item.id} className="rounded-md bg-secondary px-2 py-0.5 text-xs">{item.name} x{item.quantity}</span>)}</div></div><div className="text-right"><p className="text-lg font-bold">{formatGs(order.total)}</p>{order.status !== "pagada" ? <button onClick={(event) => { event.stopPropagation(); setSelectedOrder(order); }} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-sm font-bold text-success-foreground"><Banknote className="h-4 w-4" /> COBRAR</button> : <p className="mt-1 text-xs font-medium text-success">{invoice?.invoiceNumber}</p>}</div></div></div>; })}</div>}
    {!isLoading && filtered.length === 0 && <div className="rounded-xl border border-border bg-card py-12 text-center text-muted-foreground"><AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />No se encontraron órdenes.</div>}
    {selectedOrder && <BillingModal order={selectedOrder} isCashOpen={isCashOpen} canCancelOrder={canCancelOrder} onCancelOrder={(reason) => handleCancelOrder(selectedOrder, reason)} onClose={() => setSelectedOrder(null)} onConfirm={handleConfirmBilling} />}
  </div>;
}
