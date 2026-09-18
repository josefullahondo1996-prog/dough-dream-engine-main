import { useCallback, useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import { Search, Plus, Edit, Trash2, Eye, EyeOff, Loader2, RefreshCw, Upload, Image as ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type MenuItem = Tables<"menu_items">;
const fallbackEmoji = "🍽️";

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

const getDishImage = (item: MenuItem) => {
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

const PRESET_FOOD_IMAGES = [
  { name: "Hamburguesa", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80" },
  { name: "Pizza", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80" },
  { name: "Lomito", url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80" },
  { name: "Empanadas", url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=80" },
  { name: "Pasta", url: "https://images.unsplash.com/photo-1621996346565-e3d5d6281270?w=500&auto=format&fit=crop&q=80" },
  { name: "Asado / Carne", url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80" },
  { name: "Ensalada", url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80" },
  { name: "Sushi", url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=80" },
  { name: "Cerveza", url: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500&auto=format&fit=crop&q=80" },
  { name: "Café", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&auto=format&fit=crop&q=80" },
  { name: "Postre", url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80" },
  { name: "Gaseosa / Jugo", url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80" },
];

export default function MenuItems() {
  const { restaurant } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [categoriesById, setCategoriesById] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<{ id: string; name: string }[]>([]);
  const [unitsList, setUnitsList] = useState<{ id: string; name: string; symbol: string }[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, { name: string; symbol: string }>>({});
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "10",
    description: "",
    emoji: "🍽️",
    categoryId: "",
    scheduleId: "",
    unitId: "",
    unitValue: "1",
    available: true,
  });

  const loadMenu = useCallback(async () => {
    if (!restaurant) {
      setItems([]);
      setCategoryMap({});
      setCategoriesById({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    const [itemsResult, categoriesResult, schedulesResult, unitsResult] = await Promise.all([
      supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).order("name"),
      supabase.from("menu_categories").select("*").eq("restaurant_id", restaurant.id).order("name"),
      supabase.from("menu_schedules").select("id, name").eq("restaurant_id", restaurant.id).eq("is_active", true).order("sort_order"),
      supabase.from("units_of_measure").select("id, name, symbol").eq("restaurant_id", restaurant.id).order("name"),
    ]);

    if (itemsResult.error || categoriesResult.error) {
      setError(itemsResult.error?.message || categoriesResult.error?.message || "No se pudo cargar el menú.");
      setIsLoading(false);
      return;
    }

    setItems(itemsResult.data ?? []);
    setCategoryMap(Object.fromEntries((categoriesResult.data ?? []).map((category) => [category.id, category.name])));
    setCategoriesById(Object.fromEntries((categoriesResult.data ?? []).map((category) => [category.id, category.name])));
    setSchedules(schedulesResult.data ?? []);
    
    if (unitsResult.data) {
      setUnitsList(unitsResult.data);
      setUnitsById(Object.fromEntries(unitsResult.data.map((u) => [u.id, { name: u.name, symbol: u.symbol }])));
    }

    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  const categories = useMemo(() => ["Todas", ...Object.values(categoryMap).sort()], [categoryMap]);

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "Todas" || categoryMap[item.category_id ?? ""] === activeCategory;
    return matchSearch && matchCategory;
  });

  const toggleAvailability = async (item: MenuItem) => {
    const { error: updateError } = await supabase.from("menu_items").update({ available: !item.available }).eq("id", item.id).eq("restaurant_id", restaurant?.id ?? "");
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, available: !item.available } : currentItem));
  };

  const resetForm = () => {
    setForm({ name: "", price: "", stock: "10", description: "", emoji: "🍽️", categoryId: "", scheduleId: "", unitId: "", unitValue: "1", available: true });
    setFormError("");
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant) return;

    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim() || !Number.isInteger(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      setFormError("Indica un nombre, precio y cantidad en stock válidos (números enteros >= 0).");
      return;
    }

    setIsSaving(true);
    setFormError("");
    const { error: insertError } = await supabase.from("menu_items").insert({
      restaurant_id: restaurant.id,
      name: form.name.trim(),
      price,
      stock,
      description: form.description.trim() || null,
      emoji: form.emoji.trim() || fallbackEmoji,
      category_id: form.categoryId || null,
      menu_schedule_id: form.scheduleId || null,
      unit_id: form.unitId || null,
      unit_value: Number(form.unitValue) || 1,
      available: form.available,
    });

    if (insertError) {
      setFormError(insertError.message);
      setIsSaving(false);
      return;
    }

    await loadMenu();
    setIsSaving(false);
    setIsCreateOpen(false);
    resetForm();
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      price: String(item.price),
      stock: String(item.stock ?? 10),
      description: item.description || "",
      emoji: item.emoji || fallbackEmoji,
      categoryId: item.category_id || "",
      scheduleId: item.menu_schedule_id || "",
      unitId: item.unit_id || "",
      unitValue: String(item.unit_value ?? 1),
      available: item.available,
    });
    setFormError("");
  };

  const handleEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant || !editingItem) return;

    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim() || !Number.isInteger(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      setFormError("Indica un nombre, precio y cantidad en stock válidos (números enteros >= 0).");
      return;
    }

    setIsSaving(true);
    setFormError("");
    const { data, error: updateError } = await supabase
      .from("menu_items")
      .update({
        name: form.name.trim(),
        price,
        stock,
        description: form.description.trim() || null,
        emoji: form.emoji.trim() || fallbackEmoji,
        category_id: form.categoryId || null,
        menu_schedule_id: form.scheduleId || null,
        unit_id: form.unitId || null,
        unit_value: Number(form.unitValue) || 1,
        available: form.available,
      })
      .eq("id", editingItem.id)
      .eq("restaurant_id", restaurant.id)
      .select("*")
      .single();

    if (updateError) {
      setFormError(updateError.message);
      setIsSaving(false);
      return;
    }

    setItems((current) => current.map((item) => item.id === data.id ? data : item));
    setEditingItem(null);
    setIsSaving(false);
    resetForm();
  };

  const deleteItem = async (item: MenuItem) => {
    if (!restaurant || !window.confirm(`¿Eliminar el producto "${item.name}"?`)) return;
    const { error: deleteError } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", item.id)
      .eq("restaurant_id", restaurant.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Elementos de Menú</h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} productos registrados</p>
        </div>
        <button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-md">
          <Plus className="w-4 h-4" />
          Agregar producto
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <button onClick={() => void loadMenu()} className="inline-flex items-center gap-1 font-medium hover:underline"><RefreshCw className="w-4 h-4" /> Reintentar</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-2 text-sm rounded-lg border transition-colors font-medium",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-secondary"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Producto</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Categoría</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Precio</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Stock (Cant.)</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Estado</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : filtered.map((item) => {
                const dishImg = getDishImage(item);
                const cleanName = getCleanName(item.name);
                const itemStock = item.stock ?? 10;

                return (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0 max-w-md">
                        {dishImg ? (
                          <img
                            src={dishImg}
                            alt={cleanName}
                            className="h-12 w-12 rounded-xl object-cover border border-border shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                            {item.emoji || fallbackEmoji}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-bold text-card-foreground truncate">{cleanName}</p>
                            {item.is_combo && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400">
                                Combo
                              </span>
                            )}
                            {item.unit_id && unitsById[item.unit_id] && (
                              <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                {item.unit_value ?? 1} {unitsById[item.unit_id].symbol}
                              </span>
                            )}
                          </div>
                          {item.description && !isImageUrl(item.description) && (
                            <p className="text-xs text-muted-foreground truncate max-w-[240px]">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                      {categoryMap[item.category_id ?? ""] || "Sin categoría"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-card-foreground">
                    Gs. {item.price.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-full",
                        itemStock <= 0
                          ? "bg-destructive/15 text-destructive border border-destructive/20"
                          : itemStock <= 5
                          ? "bg-warning/15 text-warning border border-warning/20"
                          : "bg-secondary text-foreground"
                      )}
                    >
                      {itemStock <= 0 ? "Agotado (0)" : `${itemStock} un.`}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "text-xs font-medium px-2.5 py-1 rounded-full",
                        item.available && itemStock > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {item.available && itemStock > 0 ? "Disponible" : "Sin stock / Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => void toggleAvailability(item)} title={item.available ? "Marcar no disponible" : "Marcar disponible"} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                        {item.available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(item)} title="Editar producto" className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => void deleteItem(item)} title="Eliminar producto" className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p>No se encontraron productos</p>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="create-product-title">
          <form onSubmit={handleCreate} className="w-full max-w-lg space-y-4 rounded-2xl bg-card p-6 shadow-elevated my-8 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 id="create-product-title" className="text-xl font-bold text-card-foreground">Agregar producto</h2>
              <p className="mt-1 text-sm text-muted-foreground">El producto se guardará en {restaurant?.name}.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium text-card-foreground">Nombre *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
              <label className="text-sm font-medium text-card-foreground">Precio (Gs.) *<input required min="0" step="1" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
              <label className="text-sm font-medium text-card-foreground">Stock (Cant.) *<input required min="0" step="1" type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} placeholder="10" className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-card-foreground">
                Categoría
                <select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Sin categoría</option>
                  {Object.entries(categoriesById).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>

              <label className="block text-sm font-medium text-card-foreground">
                Turno del Menú
                <select value={form.scheduleId} onChange={(event) => setForm({ ...form, scheduleId: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Sin turno asignado</option>
                  {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            </div>

            {/* Unidad de Medida y Presentación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-3 rounded-xl border border-border">
              <label className="block text-sm font-medium text-card-foreground">
                Unidad de Medida
                <select value={form.unitId} onChange={(event) => setForm({ ...form, unitId: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-ring text-sm">
                  <option value="">Ninguna / Unidad por defecto</option>
                  {unitsList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-card-foreground">
                Presentación / Cantidad
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej: 1.5, 500, 1"
                  value={form.unitValue}
                  onChange={(event) => setForm({ ...form, unitValue: event.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </label>
            </div>

            {/* Imagen del Plato */}
            <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-card-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-primary" /> Imagen o Ilustración del Plato
                </label>
                {form.emoji && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, emoji: "🍽️" })}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 rounded-xl border-2 border-dashed border-border bg-background flex items-center justify-center overflow-hidden shadow-xs">
                  {isImageUrl(form.emoji) ? (
                    <img src={form.emoji} alt="Vista previa" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl">{form.emoji || "🍽️"}</span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer hover:opacity-90 transition shadow-xs">
                    <Upload className="w-3.5 h-3.5" /> Subir foto desde PC/Móvil
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <div>
                    <input
                      type="text"
                      placeholder="O pega una URL de imagen (https://...)"
                      value={form.emoji}
                      onChange={(event) => setForm({ ...form, emoji: event.target.value })}
                      className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> O elige una foto gastronómica sugerida:
                </p>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {PRESET_FOOD_IMAGES.map((img) => (
                    <button
                      key={img.name}
                      type="button"
                      onClick={() => setForm({ ...form, emoji: img.url })}
                      className={cn(
                        "relative h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-border hover:scale-105 transition shadow-xs group",
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

            <label className="block text-sm font-medium text-card-foreground">Descripción<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
            <label className="flex items-center gap-2 text-sm text-card-foreground"><input type="checkbox" checked={form.available} onChange={(event) => setForm({ ...form, available: event.target.checked })} className="h-4 w-4 accent-primary" /> Disponible para la venta</label>
            {formError && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-3 border-t border-border pt-4"><button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground">Cancelar</button><button disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar producto</button></div>
          </form>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="edit-product-title">
          <form onSubmit={handleEdit} className="w-full max-w-lg space-y-4 rounded-2xl bg-card p-6 shadow-elevated my-8 max-h-[90vh] overflow-y-auto">
            <div><h2 id="edit-product-title" className="text-xl font-bold text-card-foreground">Editar producto</h2><p className="mt-1 text-sm text-muted-foreground">Actualiza la información del producto.</p></div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium text-card-foreground">Nombre *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
              <label className="text-sm font-medium text-card-foreground">Precio (Gs.) *<input required min="0" step="1" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
              <label className="text-sm font-medium text-card-foreground">Stock (Cant.) *<input required min="0" step="1" type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-card-foreground">
                Categoría
                <select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Sin categoría</option>
                  {Object.entries(categoriesById).map(([id, categoryName]) => <option key={id} value={id}>{categoryName}</option>)}
                </select>
              </label>

              <label className="block text-sm font-medium text-card-foreground">
                Turno del Menú
                <select value={form.scheduleId} onChange={(event) => setForm({ ...form, scheduleId: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Sin turno asignado</option>
                  {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            </div>

            {/* Unidad de Medida y Presentación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-3 rounded-xl border border-border">
              <label className="block text-sm font-medium text-card-foreground">
                Unidad de Medida
                <select value={form.unitId} onChange={(event) => setForm({ ...form, unitId: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-ring text-sm">
                  <option value="">Ninguna / Unidad por defecto</option>
                  {unitsList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-card-foreground">
                Presentación / Cantidad
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej: 1.5, 500, 1"
                  value={form.unitValue}
                  onChange={(event) => setForm({ ...form, unitValue: event.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </label>
            </div>

            {/* Imagen del Plato */}
            <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-card-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-primary" /> Imagen o Ilustración del Plato
                </label>
                {form.emoji && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, emoji: "🍽️" })}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 rounded-xl border-2 border-dashed border-border bg-background flex items-center justify-center overflow-hidden shadow-xs">
                  {isImageUrl(form.emoji) ? (
                    <img src={form.emoji} alt="Vista previa" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl">{form.emoji || "🍽️"}</span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer hover:opacity-90 transition shadow-xs">
                    <Upload className="w-3.5 h-3.5" /> Subir foto desde PC/Móvil
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <div>
                    <input
                      type="text"
                      placeholder="O pega una URL de imagen (https://...)"
                      value={form.emoji}
                      onChange={(event) => setForm({ ...form, emoji: event.target.value })}
                      className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> O elige una foto gastronómica sugerida:
                </p>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {PRESET_FOOD_IMAGES.map((img) => (
                    <button
                      key={img.name}
                      type="button"
                      onClick={() => setForm({ ...form, emoji: img.url })}
                      className={cn(
                        "relative h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-border hover:scale-105 transition shadow-xs group",
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

            <label className="block text-sm font-medium text-card-foreground">Descripción<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
            <label className="flex items-center gap-2 text-sm text-card-foreground"><input type="checkbox" checked={form.available} onChange={(event) => setForm({ ...form, available: event.target.checked })} className="h-4 w-4 accent-primary" /> Disponible para la venta</label>
            {formError && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-3 border-t border-border pt-4"><button type="button" onClick={() => { setEditingItem(null); resetForm(); }} className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground">Cancelar</button><button disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar cambios</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
