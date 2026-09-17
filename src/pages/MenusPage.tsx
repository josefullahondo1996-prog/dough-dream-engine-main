import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Plus, Clock, Utensils, CheckCircle2, XCircle, Edit, Trash2, Calendar, Search, Loader2, Upload, Image as ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type MenuSchedule = Tables<"menu_schedules">;

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const PRESET_MENU_IMAGES = [
  { name: "Desayuno", url: "https://images.unsplash.com/photo-1504630083234-14187a9df0f5?w=600&auto=format&fit=crop&q=80" },
  { name: "Café", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80" },
  { name: "Brunch", url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&auto=format&fit=crop&q=80" },
  { name: "Almuerzo", url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80" },
  { name: "Parrilla", url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80" },
  { name: "Pasta", url: "https://images.unsplash.com/photo-1621996346565-e3d5d6281270?w=600&auto=format&fit=crop&q=80" },
  { name: "Cena", url: "https://images.unsplash.com/photo-1592861956120-e524fc739696?w=600&auto=format&fit=crop&q=80" },
  { name: "Cócteles", url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80" },
  { name: "Postres", url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80" },
  { name: "Sushi", url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=80" },
  { name: "Pizza", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80" },
  { name: "Ensalada", url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80" },
];

const defaultForm = {
  name: "",
  description: "",
  start_time: "08:00",
  end_time: "16:00",
  active_days: ["Lun", "Mar", "Mié", "Jue", "Vie"] as string[],
  is_active: true,
  cover_image: "",
};

export default function MenusPage() {
  const { restaurant } = useAuth();
  const [menus, setMenus] = useState<MenuSchedule[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuSchedule | null>(null);
  const [form, setForm] = useState(defaultForm);

  const loadMenus = useCallback(async () => {
    if (!restaurant) { setMenus([]); setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error: err } = await supabase
      .from("menu_schedules")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order")
      .order("created_at");
    if (err) setError(err.message);
    else setMenus(data ?? []);
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => { void loadMenus(); }, [loadMenus]);

  // Realtime sync
  const loadRef = useRef(loadMenus);
  useEffect(() => { loadRef.current = loadMenus; }, [loadMenus]);
  useEffect(() => {
    if (!restaurant?.id) return;
    const channel = supabase
      .channel(`menu-schedules-sync-${restaurant.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_schedules", filter: `restaurant_id=eq.${restaurant.id}` }, () => { void loadRef.current(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [restaurant?.id]);

  const filtered = menus.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingMenu(null);
    setForm(defaultForm);
    setError("");
    setIsModalOpen(true);
  };

  const openEdit = (menu: MenuSchedule) => {
    setEditingMenu(menu);
    setForm({
      name: menu.name,
      description: menu.description ?? "",
      start_time: menu.start_time,
      end_time: menu.end_time,
      active_days: menu.active_days,
      is_active: menu.is_active,
      cover_image: menu.cover_image ?? "",
    });
    setError("");
    setIsModalOpen(true);
  };

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      active_days: prev.active_days.includes(day)
        ? prev.active_days.filter((d) => d !== day)
        : [...prev.active_days, day],
    }));
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setForm((prev) => ({ ...prev, cover_image: ev.target!.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !form.name.trim()) return;
    setIsSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      start_time: form.start_time,
      end_time: form.end_time,
      active_days: form.active_days,
      is_active: form.is_active,
      cover_image: form.cover_image.trim() || null,
    };

    if (editingMenu) {
      const { error: err } = await supabase
        .from("menu_schedules")
        .update(payload)
        .eq("id", editingMenu.id)
        .eq("restaurant_id", restaurant.id);
      if (err) { setError(err.message); setIsSaving(false); return; }
    } else {
      const { error: err } = await supabase
        .from("menu_schedules")
        .insert({ restaurant_id: restaurant.id, ...payload, sort_order: menus.length });
      if (err) { setError(err.message); setIsSaving(false); return; }
    }

    setIsSaving(false);
    setIsModalOpen(false);
    void loadMenus();
  };

  const toggleStatus = async (menu: MenuSchedule) => {
    await supabase.from("menu_schedules").update({ is_active: !menu.is_active }).eq("id", menu.id);
    void loadMenus();
  };

  const deleteMenu = async (id: string) => {
    if (!confirm("¿Seguro que querés eliminar este turno de menú?")) return;
    await supabase.from("menu_schedules").delete().eq("id", id);
    void loadMenus();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Utensils className="w-7 h-7 text-amber-500" />
            Menús por Turno
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Creá turnos con imagen de portada y asignales platos. Los clientes los ven agrupados en el menú digital.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={!restaurant}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium shadow-sm transition disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Nuevo Turno
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-card p-3 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar turno por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent text-sm border-none focus:outline-none text-foreground"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Utensils className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay turnos de menú todavía.</p>
          <p className="text-sm mt-1">Creá tu primer turno para organizar la carta de tus clientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((menu) => (
            <div
              key={menu.id}
              className={cn(
                "bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col",
                menu.is_active ? "border-border" : "border-border opacity-60"
              )}
            >
              {/* Cover Image */}
              {menu.cover_image ? (
                <div className="relative h-36 w-full overflow-hidden">
                  <img src={menu.cover_image} alt={menu.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-4 text-white">
                    <h3 className="font-bold text-lg drop-shadow">{menu.name}</h3>
                    <span className="text-xs text-white/80">{menu.start_time} – {menu.end_time}</span>
                  </div>
                </div>
              ) : (
                <div className="h-20 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/30 dark:to-orange-900/20 flex items-center px-5 gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold text-xl">
                    {menu.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{menu.name}</h3>
                    <span className="text-xs text-muted-foreground">{menu.start_time} – {menu.end_time}</span>
                  </div>
                </div>
              )}

              <div className="p-5 flex flex-col flex-1 justify-between space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => void toggleStatus(menu)}
                      className={cn(
                        "px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 transition",
                        menu.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {menu.is_active ? <><CheckCircle2 className="w-3.5 h-3.5" /> Activo</> : <><XCircle className="w-3.5 h-3.5" /> Inactivo</>}
                    </button>
                    {menu.cover_image && (
                      <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" /> Con imagen
                      </span>
                    )}
                  </div>

                  {menu.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{menu.description}</p>
                  )}

                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-foreground">Horario:</span>
                      {menu.start_time} – {menu.end_time}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-medium text-foreground">Días:</span>
                      <div className="flex gap-1 flex-wrap">
                        {DAYS_OF_WEEK.map((day) => (
                          <span
                            key={day}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold",
                              menu.active_days.includes(day)
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                                : "bg-muted text-muted-foreground/40"
                            )}
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button onClick={() => openEdit(menu)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition" title="Editar">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => void deleteMenu(menu.id)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-rose-500 transition" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl my-8">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {editingMenu ? "Editar Turno" : "Nuevo Turno de Menú"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form onSubmit={(e) => void handleSave(e)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nombre del Turno *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Desayuno, Almuerzo Ejecutivo, Cena..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Descripción (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Platos matutinos con café incluido..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                />
              </div>

              {/* === IMAGEN DE PORTADA === */}
              <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-500" /> Imagen de Portada del Turno
                  </label>
                  {form.cover_image && (
                    <button type="button" onClick={() => setForm({ ...form, cover_image: "" })} className="text-xs text-muted-foreground hover:text-destructive">
                      Quitar imagen
                    </button>
                  )}
                </div>

                {/* Preview */}
                <div className="flex items-start gap-4">
                  <div className="h-24 w-36 shrink-0 rounded-xl border-2 border-dashed border-border bg-background overflow-hidden flex items-center justify-center">
                    {form.cover_image ? (
                      <img src={form.cover_image} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-amber-600 transition shadow-sm">
                      <Upload className="w-3.5 h-3.5" /> Subir foto
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <input
                      type="text"
                      placeholder="O pega una URL de imagen (https://...)"
                      value={form.cover_image}
                      onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                      className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500 text-foreground"
                    />
                  </div>
                </div>

                {/* Imágenes sugeridas */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> O elige una foto sugerida:
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {PRESET_MENU_IMAGES.map((img) => (
                      <button
                        key={img.name}
                        type="button"
                        onClick={() => setForm({ ...form, cover_image: img.url })}
                        title={img.name}
                        className={cn(
                          "relative h-12 w-16 shrink-0 rounded-lg overflow-hidden border hover:scale-105 transition shadow-sm",
                          form.cover_image === img.url ? "ring-2 ring-amber-500 border-amber-500" : "border-border"
                        )}
                      >
                        <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5 truncate px-1">{img.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Horarios */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Hora Inicio</label>
                  <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Hora Fin</label>
                  <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
              </div>

              {/* Días */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Días Activos</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition border",
                        form.active_days.includes(day)
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activo */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded border-border focus:ring-amber-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-foreground">
                  Turno activo (visible en el menú digital)
                </label>
              </div>

              {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl text-sm transition disabled:opacity-60 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingMenu ? "Guardar Cambios" : "Crear Turno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
