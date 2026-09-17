import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  Clock3,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  UtensilsCrossed,
  X,
  ChevronUp,
  Info,
  Heart,
  Share2
} from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const isImageUrl = (val?: string | null) => {
  if (!val) return false;
  const clean = val.trim();
  return (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("data:image/") ||
    clean.startsWith("/") ||
    clean.includes("https://images.unsplash.com")
  );
};

const extractImageUrl = (val?: string | null) => {
  if (!val) return null;
  const match = val.match(/(https?:\/\/[^\s]+|data:image\/[^\s]+)/);
  return match ? match[0] : null;
};

const getDishImage = (item: Tables<"menu_items">) => {
  if (isImageUrl(item.emoji)) return extractImageUrl(item.emoji) || item.emoji;
  if (isImageUrl(item.description)) return extractImageUrl(item.description) || item.description;
  if (isImageUrl(item.name)) return extractImageUrl(item.name) || item.name;
  return null;
};

const getCleanName = (name: string) => {
  if (!name) return "Sin nombre";
  const urlMatch = name.match(/(https?:\/\/[^\s]+|data:image\/[^\s]+)/);
  if (urlMatch) {
    const clean = name.replace(urlMatch[0], "").trim();
    return clean || "Producto con imagen";
  }
  return name;
};

export default function DigitalMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get("mesa");
  const [table, setTable] = useState<Tables<"restaurant_tables"> | null>(null);
  const [restaurant, setRestaurant] = useState<Tables<"restaurants"> | null>(null);
  const [categories, setCategories] = useState<Tables<"menu_categories">[]>([]);
  const [items, setItems] = useState<Tables<"menu_items">[]>([]);
  const [schedules, setSchedules] = useState<Tables<"menu_schedules">[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callSent, setCallSent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal de detalle del producto
  const [selectedItem, setSelectedItem] = useState<Tables<"menu_items"> | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

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

      const [categoriesResult, itemsResult, schedulesResult] = await Promise.all([
        supabase.from("menu_categories").select("*").eq("restaurant_id", restaurantData.id).order("name"),
        supabase.from("menu_items").select("*").eq("restaurant_id", restaurantData.id).eq("available", true).order("name"),
        supabase.from("menu_schedules").select("*").eq("restaurant_id", restaurantData.id).eq("is_active", true).order("sort_order"),
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
      setSchedules(schedulesResult.data ?? []);
      setIsLoading(false);
    };

    void loadMenu();
  }, [slug, tableId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory = activeCategory === "all" || item.category_id === activeCategory;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchQuery, items]);

  // Helper: is a schedule currently active?
  const isScheduleNowActive = (schedule: Tables<"menu_schedules">) => {
    const now = new Date();
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const todayName = dayNames[now.getDay()];
    if (!schedule.active_days.includes(todayName)) return false;
    const [sh, sm] = schedule.start_time.split(":").map(Number);
    const [eh, em] = schedule.end_time.split(":").map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
  };

  // Group filtered items by schedule
  const groupedBySchedule = useMemo(() => {
    const groups: { schedule: Tables<"menu_schedules"> | null; items: typeof filteredItems }[] = [];
    // Items with a schedule
    for (const schedule of schedules) {
      const scheduleItems = filteredItems.filter((i) => i.menu_schedule_id === schedule.id);
      if (scheduleItems.length > 0) groups.push({ schedule, items: scheduleItems });
    }
    // Items without schedule => "Carta General"
    const unassigned = filteredItems.filter((i) => !i.menu_schedule_id);
    if (unassigned.length > 0) groups.push({ schedule: null, items: unassigned });
    // If no schedules configured at all, show everything flat
    if (schedules.length === 0) return [{ schedule: null, items: filteredItems }];
    return groups;
  }, [filteredItems, schedules]);

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

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
      const newOrderId = data[0].order_id;
      setSubmittedOrder(newOrderId.slice(0, 8));
      
      // Marcar la mesa como ocupada automáticamente
      if (tableId) {
        try {
          await supabase.from("restaurant_tables").update({ status: "ocupada" }).eq("id", tableId);
        } catch (err) {
          console.error("No se pudo actualizar el estado de la mesa:", err);
        }
      }

      // Notificar en tiempo real por Broadcast a KOT, Mesas y Cocina
      if (restaurantData?.id) {
        try {
          const liveChannel = supabase.channel(`restaurant-live-${restaurantData.id}`);
          void liveChannel.send({
            type: "broadcast",
            event: "new_qr_order",
            payload: { orderId: newOrderId, tableName: tableData?.name || "Mesa QR", tableId },
          });
        } catch (err) {
          console.error("Error al transmitir orden:", err);
        }
      }

      setCart({});
      setCustomerName("");
      setNotes("");
      setIsCartOpen(false);
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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fff7ed,_#fff,_#fff)] text-sm font-medium text-orange-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span>Cargando menú digital interactivo...</span>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fff7ed,_#fff,_#fff)] px-6 text-center">
        <div className="max-w-sm rounded-3xl border border-orange-100 bg-white p-8 shadow-2xl">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <p className="font-semibold text-gray-900">{error || "Menú no disponible"}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_28%),linear-gradient(180deg,_#fff7ed_0%,_#fff_30%,_#fffaf5_100%)] px-3 py-4 text-foreground sm:px-6 sm:py-6 pb-32">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[2.5rem] border border-orange-100 bg-white/90 shadow-[0_25px_80px_rgba(120,53,15,0.12)] backdrop-blur-md">
          {/* Cover Header */}
          <header className="relative overflow-hidden bg-gradient-to-br from-[#1c0d0a] via-[#3d1811] to-[#592318] px-4 pb-6 pt-5 text-white sm:px-8">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_right,_rgba(251,146,60,0.4),_transparent_30%)]" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 shadow-inner">
                  <UtensilsCrossed className="h-6 w-6 text-orange-300" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-200/80">Menú Interactivo</span>
                  <h1 className="font-display text-xl font-extrabold sm:text-2xl text-white">{restaurant.name}</h1>
                </div>
              </div>

              {table && (
                <div className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-orange-100 shadow-sm backdrop-blur-md">
                  📍 {table.name}
                </div>
              )}
            </div>

            {/* Banner Experience */}
            <div className="relative mt-5 rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-md shadow-inner">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-200">Sabor Auténtico</span>
                  <h2 className="mt-1 max-w-md font-display text-xl font-bold leading-tight sm:text-2xl text-white">
                    ¡Pide directamente desde tu mesa con atención express!
                  </h2>
                </div>
                <div className="rounded-2xl bg-orange-500/20 p-2.5 text-orange-300 ring-1 ring-orange-400/30">
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-orange-100">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium">
                  <Clock3 className="h-3.5 w-3.5 text-orange-300" />
                  Prep. 15-20 min
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-orange-300" />
                  {table ? `Mesa ${table.name}` : "Mesa libre"}
                </span>
              </div>

              {tableId && (
                <button
                  onClick={() => void callWaiter()}
                  disabled={isCalling || callSent}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {callSent ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  {callSent ? "Camarero avisado ✓" : isCalling ? "Enviando aviso..." : "Llamar al Mozo / Camarero"}
                </button>
              )}
            </div>
          </header>

          {/* Search & Category Filter */}
          <div className="px-4 pt-5 sm:px-6">
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
              <input
                type="text"
                placeholder="Buscar tu comida o bebida favorita..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-orange-200 bg-[#fffaf5] pl-10 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                  activeCategory === "all"
                    ? "bg-orange-500 text-white"
                    : "bg-orange-50 text-orange-900 hover:bg-orange-100"
                }`}
              >
                Todas las categorías
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                    activeCategory === category.id
                      ? "bg-orange-500 text-white"
                      : "bg-orange-50 text-orange-900 hover:bg-orange-100"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Menu Items — grouped by schedule */}
            <div className="mt-5 space-y-8 pb-8">
              {groupedBySchedule.length === 0 && (
                <div className="rounded-3xl border border-dashed border-orange-200 bg-[#fffaf5] p-8 text-center text-sm text-gray-500">
                  No se encontraron platos que coincidan con la búsqueda.
                </div>
              )}

              {groupedBySchedule.map(({ schedule, items: groupItems }) => {
                const isActive = schedule ? isScheduleNowActive(schedule) : false;
                return (
                  <section key={schedule?.id ?? "general"}>
                    {/* Schedule Banner */}
                    {schedule ? (
                      <div
                        className={`mb-4 relative flex items-center justify-between gap-3 rounded-2xl px-5 py-4 overflow-hidden ${
                          isActive
                            ? "text-white shadow-lg"
                            : "border border-orange-200 text-orange-900"
                        }`}
                        style={
                          isActive
                            ? { background: "linear-gradient(135deg, #f97316, #f59e0b)" }
                            : { background: "#fff7ed" }
                        }
                      >
                        {/* Cover image background */}
                        {schedule.cover_image && (
                          <>
                            <img
                              src={schedule.cover_image}
                              alt={schedule.name}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className={`absolute inset-0 ${isActive ? "bg-black/50" : "bg-white/70"}`} />
                          </>
                        )}
                        <div className="relative z-10">
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? "text-orange-200" : "text-orange-500"}`}>
                            {isActive ? "⏰ Disponible ahora" : "🕒 Próximamente"}
                          </p>
                          <h3 className={`font-bold text-base mt-0.5 ${schedule.cover_image && isActive ? "text-white" : ""}`}>{schedule.name}</h3>
                          {schedule.description && (
                            <p className={`text-xs mt-0.5 ${isActive ? "text-orange-100" : "text-orange-700"}`}>
                              {schedule.description}
                            </p>
                          )}
                        </div>
                        <div className={`relative z-10 text-right shrink-0 ${isActive ? "text-orange-100" : "text-orange-600"}`}>
                          <p className="text-sm font-semibold">{schedule.start_time} – {schedule.end_time}</p>
                          <p className="text-[10px] mt-0.5">{schedule.active_days.join(", ")}</p>
                        </div>
                      </div>

                    ) : schedules.length > 0 ? (
                      <div className="mb-4 flex items-center gap-2">
                        <div className="h-px flex-1 bg-orange-200" />
                        <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Carta General</span>
                        <div className="h-px flex-1 bg-orange-200" />
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      {groupItems.map((item) => {
                        const inCartQty = cart[item.id] || 0;
                        const isFav = favorites[item.id];
                        const dishImg = getDishImage(item);
                        const cleanName = getCleanName(item.name);
                        const cleanDesc = item.description ? item.description.replace(/(https?:\/\/[^\s]+|data:image\/[^\s]+)/g, "").trim() : "";
                        return (
                          <article
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className="group relative cursor-pointer rounded-2xl border border-orange-100 bg-white p-3.5 shadow-sm transition hover:shadow-md hover:border-orange-300 flex gap-3.5 items-center justify-between"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 shadow-inner overflow-hidden">
                                {dishImg ? (
                                  <img
                                    src={dishImg}
                                    alt={cleanName}
                                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                                    className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                                  />
                                ) : (
                                  <span className="text-3xl">{item.emoji || "🍽️"}</span>
                                )}
                                <button
                                  onClick={(e) => toggleFavorite(item.id, e)}
                                  className="absolute top-1 left-1 p-1 rounded-full bg-white/90 shadow text-rose-500 hover:scale-110 transition"
                                >
                                  <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-rose-500 text-rose-500" : "text-gray-300"}`} />
                                </button>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="truncate text-base font-bold text-gray-900 group-hover:text-orange-600 transition">{cleanName}</h3>
                                </div>
                                {cleanDesc && <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">{cleanDesc}</p>}
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-sm font-extrabold text-orange-600">Gs. {item.price.toLocaleString()}</span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.9
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {inCartQty > 0 ? (
                                <div className="flex items-center gap-2 bg-orange-50 rounded-2xl p-1 border border-orange-200">
                                  <button type="button" onClick={() => updateCart(item.id, -1)} className="h-8 w-8 rounded-xl bg-white text-orange-600 font-bold shadow-sm flex items-center justify-center hover:bg-orange-100"><Minus className="h-3.5 w-3.5" /></button>
                                  <span className="w-4 text-center text-xs font-bold text-orange-900">{inCartQty}</span>
                                  <button type="button" onClick={() => updateCart(item.id, 1)} className="h-8 w-8 rounded-xl bg-orange-500 text-white font-bold shadow-sm flex items-center justify-center hover:bg-orange-600"><Plus className="h-3.5 w-3.5" /></button>
                                </div>
                              ) : (
                                <button type="button" onClick={() => updateCart(item.id, 1)} className="inline-flex items-center gap-1.5 rounded-2xl bg-orange-500 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 active:scale-95">
                                  <Plus className="h-4 w-4" /> Pedir
                                </button>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-3 z-40 mx-auto max-w-xl px-4 animate-in slide-in-from-bottom duration-300">
          <div
            onClick={() => setIsCartOpen(true)}
            className="cursor-pointer rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 p-3.5 text-white shadow-2xl flex items-center justify-between gap-3 border border-orange-400/30 backdrop-blur-lg hover:brightness-105 transition"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white font-bold">
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white text-orange-600 text-xs font-extrabold flex items-center justify-center shadow">
                  {cartCount}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-orange-100">Ver tu pedido</p>
                <p className="text-sm font-bold text-white">{cartCount} producto{cartCount === 1 ? "" : "s"} seleccionados</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-base font-extrabold text-white">
                Gs. {cartTotal.toLocaleString()}
              </span>
              <div className="bg-white/20 p-2 rounded-xl text-white">
                <ChevronUp className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-orange-100">
            <div className="relative h-56 w-full bg-gradient-to-br from-orange-100 to-amber-100 flex flex-col items-center justify-center overflow-hidden">
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center shadow-lg hover:bg-black/60 backdrop-blur-sm transition"
              >
                <X className="w-5 h-5" />
              </button>

              {getDishImage(selectedItem) ? (
                <img
                  src={getDishImage(selectedItem)!}
                  alt={getCleanName(selectedItem.name)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-7xl mb-2 animate-bounce">{selectedItem.emoji || "🍽️"}</div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col justify-end">
                <h2 className="text-2xl font-extrabold text-white">{getCleanName(selectedItem.name)}</h2>
                <span className="text-lg font-bold text-orange-400">Gs. {selectedItem.price.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {selectedItem.description && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Descripción</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedItem.description}</p>
                </div>
              )}

              <div className="flex items-center justify-between py-3 border-t border-b border-gray-100">
                <span className="text-sm font-bold text-gray-900">Cantidad deseada</span>
                <div className="flex items-center gap-3 bg-orange-50 p-1.5 rounded-2xl border border-orange-200">
                  <button
                    onClick={() => updateCart(selectedItem.id, -1)}
                    className="h-9 w-9 rounded-xl bg-white text-orange-600 font-bold shadow-sm flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-extrabold text-orange-900">{cart[selectedItem.id] || 0}</span>
                  <button
                    onClick={() => updateCart(selectedItem.id, 1)}
                    className="h-9 w-9 rounded-xl bg-orange-500 text-white font-bold shadow-sm flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg transition text-sm"
              >
                Listo / Volver al Menú
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-orange-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-lg text-gray-900">Tu Pedido Actual</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {cartLines.map((line) => {
                const lineImg = getDishImage(line.item);
                const cleanLineName = getCleanName(line.item.name);

                return (
                  <div key={line.item.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-100 overflow-hidden shadow-xs">
                        {lineImg ? (
                          <img
                            src={lineImg}
                            alt={cleanLineName}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">{line.item.emoji || "🍽️"}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-gray-900 truncate">{cleanLineName}</h4>
                        <span className="text-xs font-semibold text-orange-600">Gs. {(line.item.price * line.quantity).toLocaleString()}</span>
                      </div>
                    </div>

                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                    <button
                      onClick={() => updateCart(line.item.id, -1)}
                      className="h-7 w-7 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-4 text-center text-xs font-bold text-gray-900">{line.quantity}</span>
                    <button
                      onClick={() => updateCart(line.item.id, 1)}
                      className="h-7 w-7 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

              <div className="pt-3 space-y-2">
                <label className="block text-xs font-bold text-gray-700">Tu Nombre (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-orange-500"
                />

                <label className="block text-xs font-bold text-gray-700 pt-1">Notas para la cocina</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Sin cebolla, extra aderezo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-white space-y-3">
              <div className="flex items-center justify-between text-base font-extrabold text-gray-900">
                <span>Total a Pagar</span>
                <span className="text-xl text-orange-600">Gs. {cartTotal.toLocaleString()}</span>
              </div>

              <button
                onClick={() => void submitOrder()}
                disabled={isSubmitting || cartLines.length === 0}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white font-extrabold rounded-2xl shadow-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4" />
                {isSubmitting ? "Enviando Pedido a Cocina..." : "Confirmar y Enviar Pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
