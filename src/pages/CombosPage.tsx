import { useState, useEffect, useCallback, useMemo } from "react";
import { Package, Plus, Edit, Trash2, Search, Loader2, Sparkles, AlertCircle, ShoppingBag, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type MenuItem = Tables<"menu_items">;

interface ComboItemWithDetails {
  id: string;
  child_menu_item_id: string;
  quantity: number;
  child_name?: string;
  child_price?: number;
  child_emoji?: string;
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
    description: "",
    emoji: "📦",
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
      // 1. Fetch categories & all menu items
      const [catRes, itemsRes] = await Promise.all([
        supabase.from("menu_categories").select("id, name").eq("restaurant_id", restaurant.id).order("name"),
        supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).order("name"),
      ]);

      if (catRes.error) throw catRes.error;
      if (itemsRes.error) throw itemsRes.error;

      const allItems = itemsRes.data ?? [];
      setCategories(catRes.data ?? []);
      // Products available to put inside combos (non-combo products)
      setAvailableProducts(allItems.filter((i) => !i.is_combo));

      // Filter combo items
      const comboMenuItems = allItems.filter((i) => i.is_combo);

      // Fetch combo_items table details
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
          .map((c) => ({
            id: c.id,
            child_menu_item_id: c.child_menu_item_id,
            quantity: c.quantity,
            child_name: productsById[c.child_menu_item_id]?.name || "Producto desconocido",
            child_price: productsById[c.child_menu_item_id]?.price || 0,
            child_emoji: productsById[c.child_menu_item_id]?.emoji || "🍽️",
          }));

        return {
          item: combo,
          components: comps,
        };
      });

      setCombos(fullCombos);
    } catch (e: any) {
      setError(e.message || "Error al cargar combos.");
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
      description: "Includes a special combination of items",
      emoji: "🎁",
      category_id: categories[0]?.id || "",
      stock: "50",
    });
    setSelectedComponents([]);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (combo: ComboFull) => {
    setEditingCombo(combo);
    setForm({
      name: combo.item.name,
      price: combo.item.price.toString(),
      description: combo.item.description || "",
      emoji: combo.item.emoji || "🎁",
      category_id: combo.item.category_id || "",
      stock: combo.item.stock.toString(),
    });
    setSelectedComponents(
      combo.components.map((c) => ({ productId: c.child_menu_item_id, quantity: c.quantity }))
    );
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

    setIsSaving(true);
    setFormError("");

    try {
      let comboId = editingCombo?.item.id;

      if (editingCombo) {
        // Update menu_items row
        const { error: updateErr } = await supabase
          .from("menu_items")
          .update({
            name: form.name.trim(),
            price,
            description: form.description.trim() || null,
            emoji: form.emoji.trim() || "🎁",
            category_id: form.category_id || null,
            stock: Number(form.stock) || 50,
            is_combo: true,
          })
          .eq("id", comboId)
          .eq("restaurant_id", restaurant.id);

        if (updateErr) throw updateErr;

        // Delete previous combo items
        await supabase
          .from("combo_items")
          .delete()
          .eq("parent_menu_item_id", comboId)
          .eq("restaurant_id", restaurant.id);
      } else {
        // Insert new menu_items row
        const { data: newCombo, error: insertErr } = await supabase
          .from("menu_items")
          .insert({
            restaurant_id: restaurant.id,
            name: form.name.trim(),
            price,
            description: form.description.trim() || null,
            emoji: form.emoji.trim() || "🎁",
            category_id: form.category_id || null,
            stock: Number(form.stock) || 50,
            is_combo: true,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        comboId = newCombo.id;
      }

      // Insert combo components into combo_items table
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

      if (delErr) {
        setError(delErr.message);
      } else {
        setCombos((prev) => prev.filter((c) => c.item.id !== comboId));
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredCombos = combos.filter((c) =>
    c.item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-7 h-7 text-primary" />
            Combos y Paquetes
          </h1>
          <p className="text-muted-foreground text-sm">
            Agrupa varios productos en combos promocionales (ej: Combo 2 Litros Gaseosa + Pizza)
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition text-sm shadow"
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
              Crea tu primer combo combinando productos individuales con un precio promocional.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition"
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

            return (
              <div
                key={combo.item.id}
                className="bg-card rounded-2xl border border-border hover:border-primary/50 transition shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {/* Top */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 bg-primary/10 rounded-xl">
                        {combo.item.emoji || "🎁"}
                      </span>
                      <div>
                        <h3 className="font-bold text-foreground text-lg">{combo.item.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">
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
                    <div className="space-y-1.5">
                      {combo.components.map((comp) => (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between text-xs text-foreground bg-background/60 px-2.5 py-1.5 rounded-lg border border-border/40"
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            <span>{comp.child_emoji}</span>
                            <span>{comp.child_name}</span>
                          </span>
                          <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            x{comp.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing info */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-xs text-muted-foreground block">Precio Combo</span>
                      <span className="text-2xl font-black text-primary">
                        {combo.item.price.toLocaleString("es-PY")} Gs.
                      </span>
                    </div>

                    {savings > 0 && (
                      <div className="text-right">
                        <span className="text-xs text-emerald-500 font-semibold block">
                          Ahorro del cliente
                        </span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          -{savings.toLocaleString("es-PY")} Gs.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end gap-2">
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
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden my-8">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {editingCombo ? "Editar Combo" : "Nuevo Combo Promocional"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ingresa los datos principales y selecciona los productos incluidos.
                </p>
              </div>
              <span className="text-3xl">{form.emoji || "🎁"}</span>
            </div>

            <form onSubmit={handleSaveCombo} className="p-6 space-y-6">
              {formError && (
                <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg">
                  {formError}
                </div>
              )}

              {/* Main Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Nombre del Combo</label>
                  <input
                    type="text"
                    placeholder="Ej: Combo 2 Litros Gaseosa + Pizza"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Emoji / Icono</label>
                  <input
                    type="text"
                    placeholder="🎁, 🍕, 🍺"
                    value={form.emoji}
                    onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Categoría del Menú</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Precio del Combo (Gs)</label>
                  <input
                    type="number"
                    placeholder="Ej: 45000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Detalles del combo para el cliente..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Combo Component Builder */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                      Productos Incluidos en el Combo
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Suma individual actual:{" "}
                      <span className="font-semibold text-foreground">
                        {componentsOriginalTotal.toLocaleString("es-PY")} Gs.
                      </span>
                    </p>
                  </div>
                </div>

                {/* Add product dropdown */}
                <div className="flex items-center gap-2">
                  <select
                    id="productSelect"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        addComponentToSelection(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="" disabled>
                      + Selecciona un producto para agregar al combo...
                    </option>
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.emoji || "🍽️"} {p.name} - ({p.price.toLocaleString("es-PY")} Gs.)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Products List */}
                {selectedComponents.length === 0 ? (
                  <p className="text-xs text-amber-500 italic bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    Aún no has agregado componentes. Selecciona productos arriba.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedComponents.map((comp) => {
                      const prod = availableProducts.find((p) => p.id === comp.productId);
                      if (!prod) return null;

                      return (
                        <div
                          key={comp.productId}
                          className="flex items-center justify-between bg-muted/50 p-2.5 rounded-xl border border-border text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{prod.emoji || "🍽️"}</span>
                            <div>
                              <p className="font-medium text-foreground">{prod.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {prod.price.toLocaleString("es-PY")} Gs. c/u
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center border border-input rounded-lg overflow-hidden bg-background">
                              <button
                                type="button"
                                onClick={() => updateComponentQuantity(comp.productId, comp.quantity - 1)}
                                className="px-2.5 py-1 text-xs font-bold hover:bg-muted"
                              >
                                -
                              </button>
                              <span className="px-3 text-xs font-bold">{comp.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateComponentQuantity(comp.productId, comp.quantity + 1)}
                                className="px-2.5 py-1 text-xs font-bold hover:bg-muted"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeComponent(comp.productId)}
                              className="text-xs text-destructive hover:underline"
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

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-muted text-muted-foreground hover:bg-muted/80 rounded-lg text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition shadow"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
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
