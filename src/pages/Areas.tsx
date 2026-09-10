import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Area = Tables<"restaurant_areas">;

export default function Areas() {
  const { restaurant } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [name, setName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadAreas = useCallback(async () => {
    if (!restaurant) {
      setAreas([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error: queryError } = await supabase.from("restaurant_areas").select("*").eq("restaurant_id", restaurant.id).order("name");
    if (queryError) setError(queryError.message);
    else setAreas(data ?? []);
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => { void loadAreas(); }, [loadAreas]);

  const createArea = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant || !name.trim()) return;
    setIsSaving(true);
    const { data, error: insertError } = await supabase.from("restaurant_areas").insert({ restaurant_id: restaurant.id, name: name.trim() }).select("*").single();
    if (insertError) setError(insertError.message);
    else if (data) {
      setAreas((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setIsOpen(false);
    }
    setIsSaving(false);
  };

  const deleteArea = async (area: Area) => {
    if (!restaurant || !window.confirm(`¿Eliminar el área "${area.name}"?`)) return;
    const { error: deleteError } = await supabase.from("restaurant_areas").delete().eq("id", area.id).eq("restaurant_id", restaurant.id);
    if (deleteError) setError(deleteError.message);
    else setAreas((current) => current.filter((item) => item.id !== area.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-foreground">Áreas</h1><p className="mt-1 text-sm text-muted-foreground">Organiza el salón de {restaurant?.name || "tu restaurante"}.</p></div><button disabled={!restaurant} onClick={() => { setError(""); setIsOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" /> Nueva área</button></div>
      {error && <div className="flex justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><span>{error}</span><button onClick={() => void loadAreas()}><RefreshCw className="h-4 w-4" /></button></div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{isLoading ? <div className="col-span-full py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : areas.length === 0 ? <div className="col-span-full rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">No hay áreas creadas.</div> : areas.map((area) => <div key={area.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-card"><div><p className="font-semibold text-card-foreground">{area.name}</p><p className="mt-1 text-xs text-muted-foreground">Área del salón</p></div><button onClick={() => void deleteArea(area)} title="Eliminar área" className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>)}</div>
      {isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={createArea} className="w-full max-w-md space-y-4 rounded-2xl bg-card p-6 shadow-elevated"><h2 className="text-xl font-bold text-card-foreground">Nueva área</h2><label className="block text-sm font-medium text-card-foreground">Nombre *<input required autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><div className="flex justify-end gap-3 border-t border-border pt-4"><button type="button" onClick={() => setIsOpen(false)} className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground">Cancelar</button><button disabled={isSaving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">Guardar área</button></div></form></div>}
    </div>
  );
}
