import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  Clock3,
  MapPin,
  Minus,
  Plus,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  UtensilsCrossed,
} from "lucide-react";
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
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callSent, setCallSent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMenu = async () => {
      if (!slug) return;
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

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
        const { data: tableData } = await supabase
          .from("restaurant_tables")
          .select("*")
          .eq("id", tableId)
          .eq("restaurant_id", restaurantData.id)
          .maybeSingle();
        setTable(tableData);
      }

      if (categoriesResult.error || itemsResult.error) {
        setError("No se pudo cargar el menú.");
      }

      setRestaurant(restaurantData);
      setCategories(categoriesResult.data ?? []);
      setItems(itemsResult.data ?? []);
      setIsLoading(false);
    };

    void loadMenu();
  }, [slug, tableId]);

  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return items;
    return items.filter((item) => item.category_id === activeCategory);
  }, [activeCategory, items]);

  const cartLines = useMemo(
    () => items.filter((item) => cart[item.id]).map((item) => ({ item, quantity: cart[item.id] })),
    [items, cart],
  );

  const cartTotal = cartLines.reduce((total, line) => total + line.item.price * line.quantity, 0);
  const cartCount = cartLines.reduce((total, line) => total + line.quantity, 0);

  const updateCart = (itemId: string, change: number) =>
    setCart((current) => {
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

  const callWaiter = async () => {
    if (!tableId || isCalling || callSent) return;
    setIsCalling(true);
    const { error: requestError } = await supabase.rpc("submit_service_request", {
      p_table_id: tableId,
      p_request_type: "camarero",
    });

    if (requestError) {
      setError(requestError.message);
    } else {
      setCallSent(true);
    }

    setIsCalling(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fff7ed,_#fff,_#fff)] text-sm text-muted-foreground">
        Cargando menú...
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fff7ed,_#fff,_#fff)] px-6 text-center">
        <div className="max-w-sm rounded-3xl border border-border bg-white p-8 shadow-card">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="font-medium text-foreground">{error || "Menú no disponible"}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_28%),linear-gradient(180deg,_#fff7ed_0%,_#fff_30%,_#fffaf5_100%)] px-3 py-4 text-foreground sm:px-6 sm:py-6">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[2rem] border border-orange-100 bg-white/85 shadow-[0_25px_80px_rgba(120,53,15,0.12)] backdrop-blur-sm">
          <header className="relative overflow-hidden bg-gradient-to-br from-[#2a120d] via-[#4a1d16] to-[#6b2b1d] px-4 pb-6 pt-4 text-white sm:px-6">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-400/25 blur-3xl" />
            <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_right,_rgba(251,146,60,0.4),_transparent_30%)]" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
                  <UtensilsCrossed className="h-6 w-6 text-orange-200" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-orange-100/80">Menú digital</p>
                  <h1 className="font-display text-xl font-bold sm:text-2xl">{restaurant.name}</h1>
                </div>
              </div>

              {table && (
                <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-orange-50">
                  {table.name}
                </div>
              )}
            </div>

            <div className="relative mt-5 rounded-[1.7rem] border border-white/10 bg-white/10 p-4 shadow-inner shadow-white/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-orange-100/70">Experiencia premium</p>
                  <h2 className="mt-2 max-w-sm font-display text-2xl font-bold leading-tight sm:text-3xl">
                    Todo lo que te gusta, sin filas ni esperas.
                  </h2>
                </div>
                <div className="rounded-2xl bg-[#fff3e7] p-2 text-orange-700">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-orange-50/85">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  Preparación rápida
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {table ? `Mesa ${table.name}` : "Mesa confirmada"}
                </span>
              </div>

              {tableId && (
                <button
                  onClick={() => void callWaiter()}
                  disabled={isCalling || callSent}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#fff3e7] px-4 py-2.5 text-sm font-semibold text-[#5d2c1b] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {callSent ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  {callSent ? "Camarero avisado" : isCalling ? "Enviando aviso..." : "Solicitar camarero"}
                </button>
              )}
            </div>
          </header>

          <div className="px-4 pb-28 pt-5 sm:px-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeCategory === "all"
                    ? "bg-[#f97316] text-white shadow-sm"
                    : "bg-[#fff7ed] text-[#7c3b1d]"
                }`}
              >
                Todo
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeCategory === category.id
                      ? "bg-[#f97316] text-white shadow-sm"
                      : "bg-[#fff7ed] text-[#7c3b1d]"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              {filteredItems.length === 0 && (
                <div className="rounded-3xl border border-dashed border-orange-200 bg-[#fffaf5] p-8 text-center text-sm text-muted-foreground">
                  El menú está siendo actualizado.
                </div>
              )}

              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.6rem] border border-orange-100 bg-[#fffdfb] p-3 shadow-[0_12px_30px_rgba(121,52,15,0.04)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffedd5] to-[#fed7aa] text-2xl shadow-inner shadow-orange-100">
                      {item.emoji || "🍽️"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-[#29150d]">{item.name}</h3>
                          {item.description && (
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <span className="whitespace-nowrap text-sm font-extrabold text-[#f97316]">
                          Gs. {item.price.toLocaleString()}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700">
                          <Star className="h-3 w-3 fill-current" />
                          Popular
                        </div>

                        <button
                          type="button"
                          onClick={() => updateCart(item.id, 1)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#f97316] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tableId && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-5xl px-3 pb-3 sm:px-6">
          <div className="rounded-[1.7rem] border border-orange-100 bg-white/90 p-3 shadow-[0_18px_50px_rgba(94,54,20,0.18)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Pedido</p>
                <p className="text-sm font-semibold text-[#2a120d]">{cartCount} producto{cartCount === 1 ? "" : "s"}</p>
              </div>
              <div className="rounded-full bg-orange-50 px-3 py-1.5 text-sm font-bold text-[#f97316]">
                Gs. {cartTotal.toLocaleString()}
              </div>
            </div>

            {cartLines.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-orange-100 pt-3">
                {cartLines.map((line) => (
                  <div key={line.item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#fffaf5] px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#2a120d]">{line.item.name}</p>
                      <p className="text-xs text-muted-foreground">Gs. {line.item.price.toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateCart(line.item.id, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#2a120d] shadow-sm"
                        aria-label={`Restar ${line.item.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCart(line.item.id, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#2a120d] shadow-sm"
                        aria-label={`Sumar ${line.item.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!submittedOrder && (
              <div className="mt-3 space-y-2">
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Tu nombre (opcional)"
                  className="w-full rounded-2xl border border-orange-100 bg-[#fffaf5] px-3 py-2.5 text-sm text-[#25150e] placeholder:text-muted-foreground outline-none ring-0 focus:border-orange-300"
                />
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Notas para cocina..."
                  rows={2}
                  className="w-full rounded-2xl border border-orange-100 bg-[#fffaf5] px-3 py-2.5 text-sm text-[#25150e] placeholder:text-muted-foreground outline-none ring-0 focus:border-orange-300"
                />
                <button
                  type="button"
                  onClick={() => void submitOrder()}
                  disabled={isSubmitting || cartLines.length === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:bg-orange-200"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {isSubmitting ? "Enviando pedido..." : "Enviar pedido"}
                </button>
              </div>
            )}

            {submittedOrder && (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center text-sm text-emerald-800">
                <div className="flex items-center justify-center gap-2 font-semibold">
                  <Check className="h-4 w-4" />
                  Pedido enviado
                </div>
                <p className="mt-1 text-xs text-emerald-700">Tu orden #{submittedOrder} ya fue recibida por la cocina.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
