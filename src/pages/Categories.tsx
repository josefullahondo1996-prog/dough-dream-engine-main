import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { FolderPlus, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"menu_categories">;

export default function Categories() {
  const { restaurant, workspaceError, refreshWorkspace } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadCategories = useCallback(async () => {
    if (!restaurant) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("name");

    if (queryError) {
      setError(queryError.message);
    } else {
      setCategories(data ?? []);
    }
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  );

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant) {
      setError("No se encontró el restaurante activo. Cierra sesión, vuelve a entrar e inténtalo de nuevo.");
      setIsCreateOpen(false);
      return;
    }
    if (!name.trim()) return;

    setIsSaving(true);
    setError("");
    const { data: createdCategory, error: insertError } = await supabase.from("menu_categories").insert({
      restaurant_id: restaurant.id,
      name: name.trim(),
      description: description.trim() || null,
    }).select("*").single();

    if (insertError) {
      setError(insertError.message);
      setIsSaving(false);
      return;
    }

    setName("");
    setDescription("");
    setIsCreateOpen(false);
    setIsSaving(false);
    if (createdCategory) setCategories((current) => [...current, createdCategory].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleDelete = async (category: Category) => {
    if (!restaurant || !window.confirm(`¿Eliminar la categoría "${category.name}"?`)) return;

    const { error: deleteError } = await supabase
      .from("menu_categories")
      .delete()
      .eq("id", category.id)
      .eq("restaurant_id", restaurant.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setCategories((current) => current.filter((item) => item.id !== category.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categorías de artículos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organiza los productos de {restaurant?.name || "tu restaurante"}.</p>
        </div>
        <button disabled={!restaurant} onClick={() => { setError(""); setIsCreateOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          <FolderPlus className="h-4 w-4" /> Nueva categoría
        </button>
      </div>

        {(error || workspaceError) && <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><span>{error || workspaceError}</span><button onClick={() => { void refreshWorkspace(); void loadCategories(); }} className="inline-flex items-center gap-1 font-medium hover:underline"><RefreshCw className="h-4 w-4" /> Reintentar</button></div>}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar categorías..." className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {isLoading ? <div className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : filteredCategories.length === 0 ? <div className="py-16 text-center text-muted-foreground">No hay categorías creadas.</div> : <div className="divide-y divide-border">{filteredCategories.map((category) => <div key={category.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium text-card-foreground">{category.name}</p><p className="mt-1 text-sm text-muted-foreground">{category.description || "Sin descripción"}</p></div><button onClick={() => void handleDelete(category)} title={`Eliminar ${category.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>)}</div>}
      </div>

      {isCreateOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="create-category-title"><form onSubmit={handleCreate} className="w-full max-w-md space-y-4 rounded-2xl bg-card p-6 shadow-elevated"><div><h2 id="create-category-title" className="text-xl font-bold text-card-foreground">Nueva categoría</h2><p className="mt-1 text-sm text-muted-foreground">Crea una categoría para organizar tu menú.</p></div><label className="block text-sm font-medium text-card-foreground">Nombre *<input required autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><label className="block text-sm font-medium text-card-foreground">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><div className="flex justify-end gap-3 border-t border-border pt-4"><button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground">Cancelar</button><button disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar categoría</button></div></form></div>}
    </div>
  );
}
