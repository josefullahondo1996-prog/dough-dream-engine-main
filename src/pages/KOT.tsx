import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, ChefHat, Clock, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type Line = Tables<"order_items">;
type Product = Tables<"menu_items">;
const columns = [
  { status: "pendiente" as const, label: "Pendientes", icon: Clock, tone: "border-warning/30 bg-warning/5" },
  { status: "preparando" as const, label: "Preparando", icon: ChefHat, tone: "border-info/30 bg-info/5" },
  { status: "listo" as const, label: "Listos", icon: CheckCircle, tone: "border-success/30 bg-success/5" },
];

export default function KOT() {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadKitchen = useCallback(async () => {
    if (!restaurant) { setOrders([]); setLines([]); setIsLoading(false); return; }
    setIsLoading(true);
    const [ordersResult, linesResult, productsResult] = await Promise.all([
      supabase.from("orders").select("*").eq("restaurant_id", restaurant.id).in("status", ["pendiente", "preparando", "listo"]).order("created_at"),
      supabase.from("order_items").select("*").eq("restaurant_id", restaurant.id),
      supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id),
    ]);
    const queryError = ordersResult.error || linesResult.error || productsResult.error;
    if (queryError) setError(queryError.message);
    else { setOrders(ordersResult.data ?? []); setLines(linesResult.data ?? []); setProducts(Object.fromEntries((productsResult.data ?? []).map((product) => [product.id, product]))); }
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => {
    void loadKitchen();
    if (!restaurant?.id) return;

    const channel = supabase
      .channel(`kot-live-sync-${restaurant.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurant.id}` },
        () => {
          void loadKitchen();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items", filter: `restaurant_id=eq.${restaurant.id}` },
        () => {
          void loadKitchen();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadKitchen, restaurant?.id]);

  const linesByOrder = useMemo(() => lines.reduce<Record<string, Line[]>>((result, line) => { (result[line.order_id] ||= []).push(line); return result; }, {}), [lines]);
  const advance = async (order: Order) => {
    const nextStatus = order.status === "pendiente" ? "preparando" : order.status === "preparando" ? "listo" : "entregado";
    const { error: updateError } = await supabase.from("orders").update({ status: nextStatus }).eq("id", order.id).eq("restaurant_id", restaurant?.id || "");
    if (updateError) setError(updateError.message);
    else setOrders((current) => current.filter((item) => item.id !== order.id));
  };

  return <div className="space-y-6"><div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-foreground">KOT · Cocina</h1><p className="mt-1 text-sm text-muted-foreground">Órdenes activas de {restaurant?.name || "tu restaurante"}.</p></div><button onClick={() => void loadKitchen()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium"><RefreshCw className="h-4 w-4" /> Actualizar</button></div>
    {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    {isLoading ? <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{columns.map((column) => { const ColumnIcon = column.icon; const columnOrders = orders.filter((order) => order.status === column.status); return <section key={column.status} className={cn("min-h-[280px] rounded-xl border p-4", column.tone)}><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><ColumnIcon className="h-4 w-4" />{column.label}</h2><span className="rounded-full bg-card px-2 py-0.5 text-xs font-bold">{columnOrders.length}</span></div><div className="space-y-3">{columnOrders.map((order) => <article key={order.id} className="rounded-xl border border-border bg-card p-4 shadow-card"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">Orden #{order.id.slice(0, 8)}</p><p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}</p></div><span className="text-sm font-bold">Gs. {order.total.toLocaleString()}</span></div><div className="my-3 space-y-2">{(linesByOrder[order.id] || []).map((line) => <div key={line.id} className="flex justify-between rounded-lg bg-secondary/60 px-3 py-2 text-sm"><span>{products[line.menu_item_id || ""]?.name || "Producto eliminado"}</span><strong>x{line.quantity}</strong></div>)}</div>{order.notes && <p className="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">Nota: {order.notes}</p>}<button onClick={() => void advance(order)} className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">{column.status === "pendiente" ? "Empezar preparación" : column.status === "preparando" ? "Marcar listo" : "Entregar orden"}</button></article>)}</div>{columnOrders.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Sin órdenes</p>}</section>; })}</div>}
  </div>;
}
