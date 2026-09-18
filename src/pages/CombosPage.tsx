import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from "react";
import {
  Package, Plus, Edit, Trash2, Search, Loader2, Sparkles,
  AlertCircle, ShoppingBag, Check, Upload, Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type MenuItem = Tables<"menu_items">;

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

const getDishImage = (item?: MenuItem | { emoji?: string | null; description?: string | null; name?: string | null } | null) => {
  if (!item) return null;
  if (isImageUrl(item.emoji)) return extractImageUrl(item.emoji) || item.emoji;
  if (isImageUrl(item.description)) return extractImageUrl(item.description) || item.description;
  if (isImageUrl(item.name)) return extractImageUrl(item.name) || item.name;
  return null;
};

const getCleanName = (name?: string | null) => {
  if (!name) return "Sin nombre";
  const urlMatch = name.match(/(https?:\/\/[^\s]+|data:image\/[^\s]+)/);
  if (urlMatch) {
    const clean = name.replace(urlMatch[0], "").trim();
    return clean || "Producto con imagen";
  }
  return name;
};

const PRESET_COMBO_IMAGES = [
  { name: "Combo Burger", url: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&auto=format&fit=crop&q=80" },
  { name: "Combo Pizza", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80" },
  { name: "Combo Lomito", url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80" },
  { name: "Combo Amigos", url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80" },
  { name: "Combo Bebidas", url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80" },
];

interface ComboItemWithDetails {
  id: string;
  child_menu_item_id: string;
  quantity: number;
  child_name?: string;
  child_price?: number;
  child_emoji?: string;
  child_item?: MenuItem;
}

interface ComboFull {
  item: MenuItem;
  components: ComboItemWithDetails[];
}

export default function CombosPage() {
  const { restaurant } = useAuth();
  const [combos, setCombos] = useState<ComboFull[]>([]);
  const [availableProducts, setAvailableProducts] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [error, setError] = useState("");
  const [dbTableMissing, setDbTableMissing] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboFull | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    name: "",
    price: "",
    costPrice: "",
    description: "",
    emoji: "🍔🍟🥤",
    category_id: "",
    stock: "50",
  });

  const [selectedComponents, setSelectedComponents] = useState<{ productId: string; quantity: number }[]>([]);

  const loadCombosData = useCallback(async () => {
    if (!restaurant) return;
    setIsLoading(true);
    setError("");
    setDbTableMissing(false);

    try {
      const [catRes, itemsRes] = await Promise.all([
        supabase.from("menu_categories").select("id, name").eq("restaurant_id", restaurant.id).order("name"),
        supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).order("name"),
      ]);

      if (catRes.error) throw catRes.error;
      if (itemsRes.error) throw itemsRes.error;

      const allItems = itemsRes.data ?? [];
      setCategories(catRes.data ?? []);
      setAvailableProducts(allItems.filter((i) => !i.is_combo));

      const comboMenuItems = allItems.filter((i) => i.is_combo);

      const { data: comboComponents, error: comboCompErr } = await supabase
        .from("combo_items")
        .select("*")
        .eq("restaurant_id", restaurant.id);

      if (comboCompErr) {
        if (comboCompErr.code === "42P01" || comboCompErr.message.includes("does not exist")) {
          setDbTableMissing(true);
        }
      }

      const productsById = Object.fromEntries(allItems.map((p) => [p.id, p]));

      const fullCombos: ComboFull[] = comboMenuItems.map((combo) => {
        const comps = (comboComponents ?? [])
          .filter((c) => c.parent_menu_item_id === combo.id)
          .map((c) => {
            const child = productsById[c.child_menu_item_id];
            return {
              id: c.id,
              child_menu_item_id: c.child_menu_item_id,
              quantity: c.quantity,
              child_name: getCleanName(child?.name) || "Producto",
              child_price: child?.price || 0,
              child_emoji: child?.emoji || "🍽️",
              child_item: child,
            };
          });

        return {
          item: combo,
          components: comps,
        };
      });

      setCombos(fullCombos);
    } catch (e: any) {
      setError(e.message || "Error al cargar los combos.");
    } finally {
      setIsLoading(false);
    }
  }, [restaurant]);

  useEffect(() => {
    void loadCombosData();
  }, [loadCombosData]);

  const openCreateModal = () => {
    setEditingCombo(null);
    setForm({
      name: "",
      price: "",
      costPrice: "",
      description: "",
      emoji: "🍔🍟🥤",
      category_id: "",
      stock: "50",
    });
    setSelectedComponents([]);
    setProductSearch("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (combo: ComboFull) => {
    setEditingCombo(combo);
    setForm({
      name: combo.item.name,
      price: combo.item.price.toString(),
      costPrice: combo.item.cost_price != null ? combo.item.cost_price.toString() : "",
      description: combo.item.description || "",
      emoji: combo.item.emoji || "🍔🍟🥤",
      category_id: combo.item.category_id || "",
      stock: (combo.item.stock ?? 50).toString(),
    });
    setSelectedComponents(
      combo.components.map((c) => ({ productId: c.child_menu_item_id, quantity: c.quantity }))
    );
    setProductSearch("");
    setFormError("");
    setIsModalOpen(true);
  };

  const addComponentToSelection = (productId: string) => {
    if (!productId) return;
    setSelectedComponents((prev) => {
      const existing = prev.find((p) => p.productId === productId);
      if (existing) {
        return prev.map((p) => (p.productId === productId ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const updateComponentQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setSelectedComponents((prev) => prev.filter((p) => p.productId !== productId));
    } else {
      setSelectedComponents((prev) =>
        prev.map((p) => (p.productId === productId ? { ...p, quantity: qty } : p))
      );
    }
  };

  const removeComponent = (productId: string) => {
    setSelectedComponents((prev) => prev.filter((p) => p.productId !== productId));
  };

  // Calculate sum of individual prices for selected components
  const componentsOriginalTotal = useMemo(() => {
    const productsById = Object.fromEntries(availableProducts.map((p) => [p.id, p]));
    return selectedComponents.reduce((sum, item) => {
      const price = productsById[item.productId]?.price || 0;
      return sum + price * item.quantity;
    }, 0);
  }, [selectedComponents, availableProducts]);

  // Calculate estimated total cost of components
  const componentsCostTotal = useMemo(() => {
    const productsById = Object.fromEntries(availableProducts.map((p) => [p.id, p]));
    return selectedComponents.reduce((sum, item) => {
      const cost = Number(productsById[item.productId]?.cost_price || 0);
      return sum + cost * item.quantity;
    }, 0);
  }, [selectedComponents, availableProducts]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setForm((prev) => ({ ...prev, emoji: e.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    if (!form.name.trim()) {
      setFormError("Ingresa un nombre para el combo.");
      return;
    }

    const price = Number(form.price);
    if (isNaN(price) || price < 0) {
      setFormError("Ingresa un precio válido.");
      return;
    }

    if (selectedComponents.length === 0) {
      setFormError("Debes agregar al menos 1 producto componente al combo.");
      return;
    }

    const finalCost = form.costPrice !== "" ? Number(form.costPrice) : componentsCostTotal;

    setIsSaving(true);
    setFormError("");

    try {
      let comboId = editingCombo?.item.id;

      if (editingCombo) {
        const { error: updateErr } = await supabase
          .from("menu_items")
          .update({
            name: form.name.trim(),
            price,
            cost_price: finalCost,
            description: form.description.trim() || null,
            emoji: form.emoji.trim() || "🍔🍟🥤",
            category_id: form.category_id || null,
            stock: Number(form.stock) || 50,
            is_combo: true,
          })
          .eq("id", comboId)
          .eq("restaurant_id", restaurant.id);

        if (updateErr) throw updateErr;

        await supabase
          .from("combo_items")
          .delete()
          .eq("parent_menu_item_id", comboId)
          .eq("restaurant_id", restaurant.id);
      } else {
        const { data: newCombo, error: insertErr } = await supabase
          .from("menu_items")
          .insert({
            restaurant_id: restaurant.id,
            name: form.name.trim(),
            price,
            cost_price: finalCost,
            description: form.description.trim() || null,
            emoji: form.emoji.trim() || "🍔🍟🥤",
            category_id: form.category_id || null,
            stock: Number(form.stock) || 50,
            is_combo: true,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        comboId = newCombo.id;
      }

      const comboItemsInserts = selectedComponents.map((c) => ({
        restaurant_id: restaurant.id,
        parent_menu_item_id: comboId!,
        child_menu_item_id: c.productId,
        quantity: c.quantity,
      }));

      const { error: itemsInsErr } = await supabase.from("combo_items").insert(comboItemsInserts);
      if (itemsInsErr) throw itemsInsErr;

      setIsModalOpen(false);
      await loadCombosData();
    } catch (err: any) {
      setFormError(err.message || "Error al guardar el combo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCombo = async (comboId: string) => {
    if (!restaurant || !confirm("¿Eliminar este combo?")) return;
    try {
      const { error: delErr } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", comboId)
        .eq("restaurant_id", restaurant.id);
      if (delErr) throw delErr;
      await loadCombosData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredCombos = combos.filter((c) =>
    c.item.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAvailableProducts = useMemo(() => {
    if (!productSearch.trim()) return availableProducts;
    const q = productSearch.toLowerCase();
    return availableProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [availableProducts, productSearch]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-7 h-7 text-primary" />
            Combos y Paquetes
          </h1>
          <p className="text-muted-foreground text-sm">
            Agrupa varios productos en combos promocionales (ej: Hamburguesa + Papas + Gaseosa)
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition text-sm shadow-md"
        >
          <Plus className="w-4 h-4" />
          Nuevo Combo
        </button>
      </div>

      {/* SQL Migration Alert if missing */}
      {dbTableMissing && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold">La tabla 'combo_items' aún no está creada en Supabase.</p>
            <p>
              Ejecuta el script <code className="px-1.5 py-0.5 bg-amber-500/20 rounded font-mono text-xs">supabase_units_combos.sql</code> en el Editor SQL de tu proyecto Supabase.
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-card p-4 rounded-xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar combo por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredCombos.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center space-y-4">
          <Package className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">No hay combos registrados</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Crea tu primer combo combinando hamburguesas, pizzas, papas y gaseosas con un precio promocional.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-medium transition shadow-md"
          >
            Crear Primer Combo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCombos.map((combo) => {
            const originalVal = combo.components.reduce(
              (s, c) => s + (c.child_price || 0) * c.quantity,
              0
            );
            const savings = originalVal - combo.item.price;
            const comboImg = getDishImage(combo.item);
            const cleanComboName = getCleanName(combo.item.name);

            return (
              <div
                key={combo.item.id}
                className="bg-card rounded-2xl border border-border hover:border-primary/50 transition shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {/* Top */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {comboImg ? (
                        <img
                          src={comboImg}
                          alt={cleanComboName}
                          className="h-14 w-14 rounded-xl object-cover border border-border shadow-xs shrink-0"
                        />
                      ) : (
                        <span className="text-2xl h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          {combo.item.emoji || "🎁"}
                        </span>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-foreground text-base">{cleanComboName}</h3>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400">
                            Combo
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {combo.item.description || "Combo promocional"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Included Items */}
                  <div className="space-y-2 bg-muted/40 p-3 rounded-xl border border-border/50">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Incluye {combo.components.length} productos:
                    </span>
                    <div className="space-y-2">
                      {combo.components.map((comp) => {
                        const childImg = getDishImage(comp.child_item);
                        return (
                          <div
                            key={comp.id}
                            className="flex items-center justify-between text-xs text-foreground bg-background/80 px-2.5 py-2 rounded-lg border border-border/40 shadow-2xs"
                          >
                            <span className="flex items-center gap-2 font-medium truncate pr-2">
                              {childImg ? (
                                <img
                                  src={childImg}
                                  alt={comp.child_name || "item"}
                                  className="w-7 h-7 rounded-md object-cover border border-border shrink-0"
                                />
                              ) : (
                                <span className="text-base shrink-0">{comp.child_emoji || "🍽️"}</span>
                              )}
                              <span className="truncate">{comp.child_name}</span>
                            </span>
                            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
                              x{comp.quantity}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pricing info */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-xs text-muted-foreground block">Precio Combo</span>
                      <span className="text-xl font-black text-primary">
                        {combo.item.price.toLocaleString("es-PY")} Gs.
                      </span>
                    </div>

                    {savings > 0 && (
                      <div className="text-right">
                        <span className="text-[11px] text-emerald-600 font-semibold block">
                          Ahorro del cliente
                        </span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          -{savings.toLocaleString("es-PY")} Gs.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-3.5 bg-muted/20 border-t border-border flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(combo)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteCombo(combo.item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Combo Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {editingCombo ? "Editar Combo" : "Nuevo Combo Promocional"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Combina hamburguesas, pizzas, papas y bebidas con sus fotos y precio especial.
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border border-border shrink-0">
                {isImageUrl(form.emoji) ? (
                  <img src={form.emoji} alt="Combo" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl">{form.emoji || "🎁"}</span>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveCombo} className="p-6 space-y-5 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20">
                  {formError}
                </div>
              )}

              {/* Main Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Nombre del Combo *</label>
                  <input
                    type="text"
                    placeholder="Ej: Combo Burger Doble + Papas + Coca Cola"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Stock Disponible</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="50"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Precio de Venta del Combo (Gs.) *</label>
                  <input
                    type="number"
                    placeholder="Ej: 45000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Categoría del Menú</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Combo Image Selection */}
              <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" /> Foto o Imagen del Combo
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer hover:opacity-90 transition shadow-xs">
                    <Upload className="w-3.5 h-3.5" /> Subir foto
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto flex-1 pb-0.5">
                    {PRESET_COMBO_IMAGES.map((img) => (
                      <button
                        key={img.name}
                        type="button"
                        onClick={() => setForm({ ...form, emoji: img.url })}
                        className={cn(
                          "relative h-8 w-8 shrink-0 rounded-lg overflow-hidden border border-border hover:scale-105 transition",
                          form.emoji === img.url && "ring-2 ring-primary border-primary"
                        )}
                        title={img.name}
                      >
                        <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visual Product Component Picker */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                      Productos Incluidos en el Combo
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      Suma individual: <strong className="text-foreground">{componentsOriginalTotal.toLocaleString("es-PY")} Gs.</strong>
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toca cualquier producto de la lista con su foto para agregarlo al combo:
                  </p>
                </div>

                {/* Search in products */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar hamburguesa, pizza, papa, gaseosa..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Available Products Visual Grid with Dish Images */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 border border-border/60 rounded-xl p-2 bg-muted/20">
                  {filteredAvailableProducts.length === 0 ? (
                    <p className="col-span-2 text-center text-xs text-muted-foreground py-6">
                      No se encontraron productos disponibles.
                    </p>
                  ) : (
                    filteredAvailableProducts.map((p) => {
                      const dishImg = getDishImage(p);
                      const cleanName = getCleanName(p.name);
                      const isSelected = selectedComponents.some((c) => c.productId === p.id);

                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg border transition-all text-xs bg-card hover:border-primary/50",
                            isSelected && "border-primary/60 bg-primary/5"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-1">
                            {dishImg ? (
                              <img
                                src={dishImg}
                                alt={cleanName}
                                className="w-9 h-9 rounded-lg object-cover border border-border shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-lg shrink-0">
                                {p.emoji || "🍽️"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{cleanName}</p>
                              <p className="text-[11px] text-muted-foreground">
                                Gs. {p.price.toLocaleString("es-PY")}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => addComponentToSelection(p.id)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shrink-0",
                              isSelected
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                            )}
                          >
                            <Plus className="w-3 h-3" />
                            Agregar
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Selected Products List */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Componentes seleccionados ({selectedComponents.length}):
                  </p>
                  {selectedComponents.length === 0 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 text-center">
                      Aún no has agregado componentes. Toca "Agregar" en los productos arriba.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedComponents.map((comp) => {
                        const prod = availableProducts.find((p) => p.id === comp.productId);
                        if (!prod) return null;
                        const dishImg = getDishImage(prod);
                        const cleanName = getCleanName(prod.name);

                        return (
                          <div
                            key={comp.productId}
                            className="flex items-center justify-between bg-muted/60 p-2.5 rounded-xl border border-border text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              {dishImg ? (
                                <img
                                  src={dishImg}
                                  alt={cleanName}
                                  className="w-8 h-8 rounded-lg object-cover border border-border shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-base shrink-0">
                                  {prod.emoji || "🍽️"}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{cleanName}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  Gs. {prod.price.toLocaleString("es-PY")} c/u
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <div className="flex items-center border border-input rounded-lg overflow-hidden bg-background">
                                <button
                                  type="button"
                                  onClick={() => updateComponentQuantity(comp.productId, comp.quantity - 1)}
                                  className="px-2 py-1 text-xs font-bold hover:bg-muted"
                                >
                                  -
                                </button>
                                <span className="px-2.5 text-xs font-bold">{comp.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateComponentQuantity(comp.productId, comp.quantity + 1)}
                                  className="px-2 py-1 text-xs font-bold hover:bg-muted"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeComponent(comp.productId)}
                                className="text-xs text-destructive hover:underline font-medium"
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-muted text-muted-foreground hover:bg-muted/80 rounded-xl text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition shadow"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingCombo ? "Guardar Cambios" : "Crear Combo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
