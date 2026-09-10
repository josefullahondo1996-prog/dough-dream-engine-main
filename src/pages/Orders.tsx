import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ChefHat, CheckCircle, Clock, Eye, Loader2, Plus, RefreshCw, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;
type Product = Tables<"menu_items">;
type Table = Tables<"restaurant_tables">;
type Client = Tables<"clients">;
type OrderStatus = Order["status"];

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: typeof Clock }> = {
  pendiente: { label: "Pendiente", color: "bg-warning/10 text-warning", icon: Clock },
  preparando: { label: "Preparando", color: "bg-info/10 text-info", icon: ChefHat },
  listo: { label: "Listo", color: "bg-primary/10 text-primary", icon: CheckCircle },
  entregado: { label: "Entregado", color: "bg-success/10 text-success", icon: CheckCircle },
  cancelado: { label: "Cancelado", color: "bg-destructive/10 text-destructive", icon: Clock },
  pagada: { label: "Pagada", color: "bg-success/10 text-success", icon: CheckCircle },
};

const statusOrder: OrderStatus[] = ["pendiente", "preparando", "listo", "entregado"];

function getStatusConfig(status: string) {
  return statusConfig[status as OrderStatus] ?? statusConfig.pendiente;
}

type DraftLine = { productId: string; quantity: number };

export default function Orders() {
  const { restaurant, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"Todas" | OrderStatus>("Todas");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [form, setForm] = useState({ tableId: "", clientId: "", notes: "" });

  const loadOrders = useCallback(async () => {
    if (!restaurant) { setOrders([]); setOrderItems([]); setIsLoading(false); return; }
    setIsLoading(true);
    const [ordersResult, itemsResult, productsResult, tablesResult, clientsResult] = await Promise.all([
      supabase.from("orders").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }),
      supabase.from("order_items").select("*").eq("restaurant_id", restaurant.id),
      supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).eq("available", true).order("name"),
      supabase.from("restaurant_tables").select("*").eq("restaurant_id", restaurant.id).order("name"),
      supabase.from("clients").select("*").eq("restaurant_id", restaurant.id).order("name"),
    ]);
    const queryError = ordersResult.error || itemsResult.error || productsResult.error || tablesResult.error || clientsResult.error;
    if (queryError) setError(queryError.message);
    else { setOrders(ordersResult.data ?? []); setOrderItems(itemsResult.data ?? []); setProducts(productsResult.data ?? []); setTables(tablesResult.data ?? []); setClients(clientsResult.data ?? []); }
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  const productById = useMemo(() => Object.fromEntries(products.map((product) => [product.id, product])), [products]);
  const tableById = useMemo(() => Object.fromEntries(tables.map((table) => [table.id, table])), [tables]);
  const clientById = useMemo(() => Object.fromEntries(clients.map((client) => [client.id, client])), [clients]);
  const itemsByOrder = useMemo(() => orderItems.reduce<Record<string, OrderItem[]>>((result, item) => { (result[item.order_id] ||= []).push(item); return result; }, {}), [orderItems]);
  const filtered = orders.filter((order) => {
    const clientName = order.client_id ? clientById[order.client_id]?.name || "" : "";
    return (activeFilter === "Todas" || order.status === activeFilter) && (order.id.toLowerCase().includes(search.toLowerCase()) || clientName.toLowerCase().includes(search.toLowerCase()));
  });

  const createOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant || !draftLines.length) { setError("Agrega al menos un producto a la orden."); return; }
    setIsSaving(true);
    const total = draftLines.reduce((sum, line) => sum + (productById[line.productId]?.price || 0) * line.quantity, 0);
    const { data: order, error: orderError } = await supabase.from("orders").insert({ restaurant_id: restaurant.id, table_id: form.tableId || null, client_id: form.clientId || null, notes: form.notes.trim() || null, waiter_name: user?.email || null, total }).select("*").single();
    if (orderError || !order) { setError(orderError?.message || "No se pudo crear la orden."); setIsSaving(false); return; }
    const { data: lines, error: linesError } = await supabase.from("order_items").insert(draftLines.map((line) => ({ restaurant_id: restaurant.id, order_id: order.id, menu_item_id: line.productId, quantity: line.quantity, price_at_order: productById[line.productId].price }))).select("*");
    if (linesError) { setError(linesError.message); await supabase.from("orders").delete().eq("id", order.id); setIsSaving(false); return; }
    setOrders((current) => [order, ...current]);
    setOrderItems((current) => [...current, ...(lines ?? [])]);
    setDraftLines([]); setForm({ tableId: "", clientId: "", notes: "" }); setIsOpen(false); setIsSaving(false);
  };

  const advanceStatus = async (order: Order) => {
    const index = statusOrder.indexOf(order.status);
    if (index < 0 || index === statusOrder.length - 1) return;
    const nextStatus = statusOrder[index + 1];
    const { error: updateError } = await supabase.from("orders").update({ status: nextStatus }).eq("id", order.id).eq("restaurant_id", restaurant?.id || "");
    if (updateError) setError(updateError.message);
    else setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: nextStatus } : item));
  };

  const addLine = (productId: string) => setDraftLines((current) => { const existing = current.find((line) => line.productId === productId); return existing ? current.map((line) => line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { productId, quantity: 1 }]; });
  const removeLine = (productId: string) => setDraftLines((current) => current.flatMap((line) => line.productId === productId && line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : line.productId === productId ? [] : [line]));

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-foreground">Órdenes</h1><p className="mt-1 text-sm text-muted-foreground">{orders.length} órdenes registradas</p></div><button disabled={!restaurant} onClick={() => { setError(""); setIsOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md disabled:opacity-50"><Plus className="h-4 w-4" /> Nueva orden</button></div>
    {error && <div className="flex justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><span>{error}</span><button onClick={() => void loadOrders()}><RefreshCw className="h-4 w-4" /></button></div>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{statusOrder.map((status) => <div key={status} className="rounded-xl border border-border bg-card p-4 text-center"><p className="text-2xl font-bold text-card-foreground">{orders.filter((order) => order.status === status).length}</p><p className="text-xs text-muted-foreground">{statusConfig[status].label}</p></div>)}</div>
    <div className="flex flex-col gap-3 sm:flex-row"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por orden o cliente..." className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" /><div className="flex flex-wrap gap-2"><button onClick={() => setActiveFilter("Todas")} className={cn("rounded-lg border px-3 py-2 text-sm font-medium", activeFilter === "Todas" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>Todas</button>{statusOrder.map((status) => <button key={status} onClick={() => setActiveFilter(status)} className={cn("rounded-lg border px-3 py-2 text-sm font-medium", activeFilter === status ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>{statusConfig[status].label}</button>)}</div></div>
    {isLoading ? <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : <div className="space-y-3">{filtered.map((order) => { const status = getStatusConfig(order.status); const StatusIcon = status.icon; const clientName = order.client_id ? clientById[order.client_id]?.name : "Sin cliente"; const tableName = order.table_id ? tableById[order.table_id]?.name : "Sin mesa"; return <div key={order.id} className="rounded-xl border border-border bg-card p-4 shadow-card"><div className="flex items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="mb-2 flex items-center gap-3"><span className="font-bold text-card-foreground">#{order.id.slice(0, 8)}</span><span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", status.color)}><StatusIcon className="h-3 w-3" />{status.label}</span></div><p className="text-sm text-muted-foreground">{clientName} · {tableName} · {new Date(order.created_at).toLocaleString("es-PY")}</p><div className="mt-2 flex flex-wrap gap-1.5">{(itemsByOrder[order.id] || []).map((line) => <span key={line.id} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{line.quantity} × {productById[line.menu_item_id || ""]?.name || "Producto eliminado"}</span>)}</div></div><div className="text-right"><p className="text-lg font-bold text-card-foreground">Gs. {order.total.toLocaleString()}</p>{order.status !== "entregado" && order.status !== "cancelado" && order.status !== "pagada" && <button onClick={() => void advanceStatus(order)} className="mt-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Avanzar estado</button>}</div></div></div>; })}</div>}
    {!isLoading && filtered.length === 0 && <div className="rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">No se encontraron órdenes.</div>}
    {isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"><form onSubmit={createOrder} className="my-8 w-full max-w-2xl space-y-4 rounded-2xl bg-card p-6 shadow-elevated"><div><h2 className="text-xl font-bold text-card-foreground">Nueva orden</h2><p className="mt-1 text-sm text-muted-foreground">Selecciona productos para crear la orden.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-card-foreground">Mesa<select value={form.tableId} onChange={(event) => setForm({ ...form, tableId: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal"><option value="">Sin mesa</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}</select></label><label className="text-sm font-medium text-card-foreground">Cliente<select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal"><option value="">Sin cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label></div><div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">{products.map((product) => <button type="button" key={product.id} onClick={() => addLine(product.id)} className="rounded-lg border border-border bg-background p-3 text-left hover:border-primary"><span className="text-lg">{product.emoji || "🍽️"}</span><p className="text-sm font-medium">{product.name}</p><p className="text-xs text-muted-foreground">Gs. {product.price.toLocaleString()}</p></button>)}</div><div className="space-y-2">{draftLines.map((line) => <div key={line.productId} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm"><span>{line.quantity} × {productById[line.productId]?.name}</span><div className="flex gap-2"><button type="button" onClick={() => removeLine(line.productId)} className="rounded bg-background px-2">−</button><button type="button" onClick={() => addLine(line.productId)} className="rounded bg-background px-2">+</button></div></div>)}</div><label className="block text-sm font-medium text-card-foreground">Notas<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 font-normal" /></label><div className="flex justify-end gap-3 border-t border-border pt-4"><button type="button" onClick={() => setIsOpen(false)} className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground">Cancelar</button><button disabled={isSaving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">Crear orden</button></div></form></div>}
  </div>;
}
