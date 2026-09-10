import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Armchair, Loader2, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Area = Tables<"restaurant_areas">;
type Table = Tables<"restaurant_tables">;

const statusConfig = {
  libre: { label: "Libre", bg: "bg-success/10", text: "text-success", border: "border-success/30" },
  ocupada: { label: "Ocupada", bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" },
  reservada: { label: "Reservada", bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" },
  limpieza: { label: "Limpieza", bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
} as const;

export default function Tables() {
  const { restaurant } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeArea, setActiveArea] = useState("Todas");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", seats: "4", areaId: "" });

  const loadTables = useCallback(async () => {
    if (!restaurant) { setAreas([]); setTables([]); setIsLoading(false); return; }
    setIsLoading(true);
    const [areasResult, tablesResult] = await Promise.all([
      supabase.from("restaurant_areas").select("*").eq("restaurant_id", restaurant.id).order("name"),
      supabase.from("restaurant_tables").select("*").eq("restaurant_id", restaurant.id).order("name"),
    ]);
    if (areasResult.error || tablesResult.error) setError(areasResult.error?.message || tablesResult.error?.message || "No se pudo cargar el salón.");
    else { setAreas(areasResult.data ?? []); setTables(tablesResult.data ?? []); }
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => { void loadTables(); }, [loadTables]);

  const visibleTables = useMemo(() => activeArea === "Todas" ? tables : tables.filter((table) => table.area_id === activeArea), [activeArea, tables]);
  const areaName = (areaId: string | null) => areas.find((area) => area.id === areaId)?.name || "Sin área";

  const createTable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant || !form.name.trim()) return;
    const seats = Number(form.seats);
    if (!Number.isInteger(seats) || seats < 1) { setError("Los asientos deben ser un número entero mayor que cero."); return; }
    setIsSaving(true);
    const { data, error: insertError } = await supabase.from("restaurant_tables").insert({ restaurant_id: restaurant.id, name: form.name.trim(), seats, area_id: form.areaId || null }).select("*").single();
    if (insertError) setError(insertError.message);
    else if (data) { setTables((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name))); setForm({ name: "", seats: "4", areaId: "" }); setIsOpen(false); }
    setIsSaving(false);
  };

  const changeStatus = async (table: Table) => {
    const statuses = Object.keys(statusConfig) as Table["status"][];
    const nextStatus = statuses[(statuses.indexOf(table.status) + 1) % statuses.length];
    const { error: updateError } = await supabase.from("restaurant_tables").update({ status: nextStatus }).eq("id", table.id).eq("restaurant_id", restaurant?.id || "");
    if (updateError) setError(updateError.message);
    else setTables((current) => current.map((item) => item.id === table.id ? { ...item, status: nextStatus } : item));
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-foreground">Mesas</h1><p className="mt-1 text-sm text-muted-foreground">Vista general del salón de {restaurant?.name || "tu restaurante"}.</p></div><button disabled={!restaurant} onClick={() => { setError(""); setIsOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" /> Agregar mesa</button></div>
    {error && <div className="flex justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><span>{error}</span><button onClick={() => void loadTables()}><RefreshCw className="h-4 w-4" /></button></div>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(statusConfig).map(([key, config]) => <div key={key} className={cn("rounded-xl border p-4 text-center", config.bg, config.border)}><p className={cn("text-2xl font-bold", config.text)}>{tables.filter((table) => table.status === key).length}</p><p className="mt-1 text-xs text-muted-foreground">{config.label}</p></div>)}</div>
    <div className="flex flex-wrap gap-2"><button onClick={() => setActiveArea("Todas")} className={cn("rounded-lg border px-3 py-2 text-sm font-medium", activeArea === "Todas" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>Todas</button>{areas.map((area) => <button key={area.id} onClick={() => setActiveArea(area.id)} className={cn("rounded-lg border px-3 py-2 text-sm font-medium", activeArea === area.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>{area.name}</button>)}</div>
    {isLoading ? <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{visibleTables.map((table) => { const config = statusConfig[table.status]; return <button key={table.id} onClick={() => void changeStatus(table)} title="Cambiar estado" className={cn("rounded-xl border p-4 text-center transition-all hover:shadow-elevated", config.bg, config.border)}><p className="font-bold text-card-foreground">{table.name}</p><div className="mt-1 flex items-center justify-center gap-1"><Armchair className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">{table.seats} asientos</span></div><span className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium", config.text, config.bg)}>{config.label}</span><p className="mt-1.5 text-xs text-muted-foreground">{areaName(table.area_id)}</p></button>; })}</div>}
    {!isLoading && visibleTables.length === 0 && <div className="rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">No hay mesas en esta vista.</div>}
    {isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={createTable} className="w-full max-w-md space-y-4 rounded-2xl bg-card p-6 shadow-elevated"><h2 className="text-xl font-bold text-card-foreground">Agregar mesa</h2><div className="grid grid-cols-2 gap-4"><label className="text-sm font-medium text-card-foreground">Nombre *<input required autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Mesa 1" className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><label className="text-sm font-medium text-card-foreground">Asientos *<input required min="1" step="1" type="number" value={form.seats} onChange={(event) => setForm({ ...form, seats: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label></div><label className="block text-sm font-medium text-card-foreground">Área<select value={form.areaId} onChange={(event) => setForm({ ...form, areaId: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring"><option value="">Sin área</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><div className="flex justify-end gap-3 border-t border-border pt-4"><button type="button" onClick={() => setIsOpen(false)} className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground">Cancelar</button><button disabled={isSaving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">Guardar mesa</button></div></form></div>}
  </div>;
}
