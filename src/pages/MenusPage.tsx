import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Clock, Utensils, CheckCircle2, XCircle, Edit, Trash2, Calendar, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type MenuSchedule = Tables<"menu_schedules">;

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const defaultForm = {
  name: "",
  description: "",
  start_time: "08:00",
  end_time: "16:00",
  active_days: ["Lun", "Mar", "Mié", "Jue", "Vie"],
  is_active: true,
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !form.name.trim()) return;
    setIsSaving(true);
    setError("");

    if (editingMenu) {
      const { error: err } = await supabase
        .from("menu_schedules")
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          start_time: form.start_time,
          end_time: form.end_time,
          active_days: form.active_days,
          is_active: form.is_active,
        })
        .eq("id", editingMenu.id)
        .eq("restaurant_id", restaurant.id);
      if (err) { setError(err.message); setIsSaving(false); return; }
    } else {
      const { error: err } = await supabase
        .from("menu_schedules")
        .insert({
          restaurant_id: restaurant.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          start_time: form.start_time,
          end_time: form.end_time,
          active_days: form.active_days,
          is_active: form.is_active,
          sort_order: menus.length,
        });
      if (err) { setError(err.message); setIsSaving(false); return; }
    }

    setIsSaving(false);
    setIsModalOpen(false);
    void loadMenus();
  };

  const toggleStatus = async (menu: MenuSchedule) => {
    await supabase
      .from("menu_schedules")
      .update({ is_active: !menu.is_active })
      .eq("id", menu.id);
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
            Creá turnos (Desayuno, Almuerzo, Cena…) y asignale platos. Tus clientes los verán agrupados en el menú digital.
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
                "bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4",
                menu.is_active ? "border-border" : "border-border opacity-60"
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                      {menu.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{menu.name}</h3>
                      <span className="text-xs text-muted-foreground font-medium">
                        {menu.start_time} hs – {menu.end_time} hs
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => void toggleStatus(menu)}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 transition",
                      menu.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {menu.is_active ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Activo</>
                    ) : (
                      <><XCircle className="w-3.5 h-3.5" /> Inactivo</>
                    )}
                  </button>
                </div>

                {menu.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{menu.description}</p>
                )}

                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-foreground">Horario:</span>
                    {menu.start_time} – {menu.end_time}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-4 h-4 text-amber-500" />
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
                <button
                  onClick={() => openEdit(menu)}
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => void deleteMenu(menu.id)}
                  className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-rose-500 transition"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {editingMenu ? "Editar Turno" : "Nuevo Turno de Menú"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form onSubmit={(e) => void handleSave(e)} className="p-6 space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Hora Fin</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Días Activos</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const selected = form.active_days.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold transition border",
                          selected
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
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
