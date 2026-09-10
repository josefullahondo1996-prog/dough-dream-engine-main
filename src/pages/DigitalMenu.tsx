import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Minus, Plus, Send, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export default function DigitalMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get("mesa");
  const [table, setTable] = useState<Tables<"restaurant_tables"> | null>(null);
  const [restaurant, setRestaurant] = useState<Tables<"restaurants"> | null>(null);
  const [categories, setCategories] = useState<Tables<"menu_categories">[]>([]);
  const [items, setItems] = useState<Tables<"menu_items">[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMenu = async () => {
      if (!slug) return;
      const { data: restaurantData, error: restaurantError } = await supabase.from("restaurants").select("*").eq("slug", slug).maybeSingle();
      if (restaurantError || !restaurantData) {
        setError("No encontramos este menú digital.");
        setIsLoading(false);
        return;
      }
      const [categoriesResult, itemsResult] = await Promise.all([
        supabase.from("menu_categories").select("*").eq("restaurant_id", restaurantData.id).order("name"),
        supabase.from("menu_items").select("*").eq("restaurant_id", restaurantData.id).eq("available", true).order("name"),
      ]);
      if (tableId) {
        const { data: tableData } = await supabase.from("restaurant_tables").select("*").eq("id", tableId).eq("restaurant_id", restaurantData.id).maybeSingle();
        setTable(tableData);
      }
      if (categoriesResult.error || itemsResult.error) setError("No se pudo cargar el menú.");
      setRestaurant(restaurantData);
      setCategories(categoriesResult.data ?? []);
      setItems(itemsResult.data ?? []);
      setIsLoading(false);
    };
    void loadMenu();
  }, [slug, tableId]);

  const itemsByCategory = useMemo(() => {
    const grouped = new Map<string, Tables<"menu_items">[]>();
    items.forEach((item) => {
      const key = item.category_id ?? "uncategorized";
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    });
    return grouped;
  }, [items]);

  const cartLines = useMemo(() => items.filter((item) => cart[item.id]).map((item) => ({ item, quantity: cart[item.id] })), [items, cart]);
  const cartTotal = cartLines.reduce((total, line) => total + line.item.price * line.quantity, 0);
  const updateCart = (itemId: string, change: number) => setCart((current) => {
    const nextQuantity = (current[itemId] ?? 0) + change;
    if (nextQuantity <= 0) {
      const next = { ...current };
      delete next[itemId];
      return next;
    }
    return { ...current, [itemId]: nextQuantity };
  });

  const submitOrder = async () => {
    if (!tableId || !cartLines.length || isSubmitting) return;
    setIsSubmitting(true);
    const { data, error: submitError } = await supabase.rpc("submit_public_table_order", {
      p_table_id: tableId,
      p_customer_name: customerName.trim() || "Cliente QR",
      p_notes: notes.trim(),
      p_items: cartLines.map((line) => ({ product_id: line.item.id, quantity: line.quantity })),
    });
    if (submitError || !data?.[0]) {
      setError(submitError?.message || "No se pudo enviar el pedido.");
    } else {
      setSubmittedOrder(data[0].order_id.slice(0, 8));
      setCart({});
      setCustomerName("");
      setNotes("");
    }
    setIsSubmitting(false);
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Cargando menú...</div>;
  if (error || !restaurant) return <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center"><div><AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" /><p className="font-medium">{error || "Menú no disponible"}</p></div></div>;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground"><UtensilsCrossed className="h-7 w-7" /></div>
          <h1 className="font-display text-4xl font-bold">{restaurant.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Menú digital{table ? ` · ${table.name}` : ""}</p>
        </header>

        <div className="space-y-10">
          {categories.map((category) => {
            const categoryItems = itemsByCategory.get(category.id) ?? [];
            if (categoryItems.length === 0) return null;
            return <section key={category.id}><div className="mb-4 border-b border-border pb-2"><h2 className="font-display text-2xl font-bold">{category.name}</h2>{category.description && <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>}</div><div className="space-y-3">{categoryItems.map((item) => <article key={item.id} className="flex gap-3 border-b border-border/60 pb-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-2xl">{item.emoji || "🍽️"}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{item.name}</h3>{item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}</div><span className="whitespace-nowrap font-bold text-primary">Gs. {item.price.toLocaleString()}</span></div>{tableId && <button onClick={() => updateCart(item.id, 1)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"><Plus className="h-3.5 w-3.5" />Agregar</button>}</div></article>)}</div></section>;
          })}
          {itemsByCategory.get("uncategorized")?.length ? <section><h2 className="mb-4 border-b border-border pb-2 font-display text-2xl font-bold">Otros</h2><div className="space-y-3">{itemsByCategory.get("uncategorized")?.map((item) => <article key={item.id} className="flex justify-between gap-4 border-b border-border/60 pb-4"><span className="font-semibold">{item.emoji || "🍽️"} {item.name}</span><span className="whitespace-nowrap font-bold text-primary">Gs. {item.price.toLocaleString()}</span></article>)}</div></section> : null}
          {items.length === 0 && <p className="py-10 text-center text-muted-foreground">El menú está siendo actualizado.</p>}
        </div>

        {tableId && !submittedOrder && <section className="mt-12 rounded-xl border border-border bg-card p-5 shadow-card"><div className="mb-4 flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" /><h2 className="font-semibold">Tu pedido</h2><span className="ml-auto text-sm font-bold text-primary">Gs. {cartTotal.toLocaleString()}</span></div>{cartLines.length === 0 ? <p className="text-sm text-muted-foreground">Agrega productos para enviar una orden a la cocina.</p> : <div className="space-y-3">{cartLines.map((line) => <div key={line.item.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3"><span className="text-sm">{line.item.name}</span><div className="flex items-center gap-2"><button onClick={() => updateCart(line.item.id, -1)} className="rounded-md bg-secondary p-1.5"><Minus className="h-3.5 w-3.5" /></button><span className="w-5 text-center text-sm font-medium">{line.quantity}</span><button onClick={() => updateCart(line.item.id, 1)} className="rounded-md bg-secondary p-1.5"><Plus className="h-3.5 w-3.5" /></button></div></div>)}<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Tu nombre (opcional)" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" /><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas para cocina (opcional)" rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" /><button onClick={() => void submitOrder()} disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-60"><Send className="h-4 w-4" />{isSubmitting ? "Enviando..." : "Enviar pedido a cocina"}</button></div>}</section>}
        {submittedOrder && <section className="mt-12 rounded-xl border border-success/30 bg-success/10 p-6 text-center"><h2 className="font-display text-2xl font-bold text-success">Pedido enviado</h2><p className="mt-2 text-sm text-muted-foreground">La cocina recibió tu pedido #{submittedOrder}.</p></section>}
      </div>
    </main>
  );
}
