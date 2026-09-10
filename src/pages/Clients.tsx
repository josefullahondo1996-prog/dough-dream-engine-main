import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Mail, Pencil, Phone, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;
const emptyForm = { name: "", phone: "", email: "", favorite: false };

export default function Clients() {
  const { restaurant } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadClients = useCallback(async () => {
    if (!restaurant) { setClients([]); setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error: queryError } = await supabase.from("clients").select("*").eq("restaurant_id", restaurant.id).order("name");
    if (queryError) setError(queryError.message);
    else setClients(data ?? []);
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => { void loadClients(); }, [loadClients]);

  const filtered = useMemo(() => clients.filter((client) => client.name.toLowerCase().includes(search.toLowerCase()) || (client.phone || "").includes(search) || (client.email || "").toLowerCase().includes(search.toLowerCase())), [clients, search]);

  const openCreate = () => { setEditingClient(null); setForm(emptyForm); setError(""); setIsOpen(true); };
  const openEdit = (client: Client) => { setEditingClient(client); setForm({ name: client.name, phone: client.phone || "", email: client.email || "", favorite: client.favorite }); setError(""); setIsOpen(true); };

  const saveClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant || !form.name.trim()) return;
    setIsSaving(true);
    const payload = { name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, favorite: form.favorite };
    const result = editingClient
      ? await supabase.from("clients").update(payload).eq("id", editingClient.id).eq("restaurant_id", restaurant.id).select("*").single()
      : await supabase.from("clients").insert({ ...payload, restaurant_id: restaurant.id }).select("*").single();
    if (result.error) setError(result.error.message);
    else if (result.data) {
      setClients((current) => editingClient ? current.map((client) => client.id === result.data.id ? result.data : client) : [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)));
      setIsOpen(false);
      setForm(emptyForm);
    }
    setIsSaving(false);
  };

  const toggleFavorite = async (client: Client) => {
    const { error: updateError } = await supabase.from("clients").update({ favorite: !client.favorite }).eq("id", client.id).eq("restaurant_id", restaurant?.id || "");
    if (updateError) setError(updateError.message);
    else setClients((current) => current.map((item) => item.id === client.id ? { ...item, favorite: !client.favorite } : item));
  };

  const deleteClient = async (client: Client) => {
    if (!restaurant || !window.confirm(`¿Eliminar el cliente "${client.name}"?`)) return;
    const { error: deleteError } = await supabase.from("clients").delete().eq("id", client.id).eq("restaurant_id", restaurant.id);
    if (deleteError) setError(deleteError.message);
    else setClients((current) => current.filter((item) => item.id !== client.id));
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-foreground">Clientes</h1><p className="mt-1 text-sm text-muted-foreground">{clients.length} clientes registrados</p></div><button disabled={!restaurant} onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md disabled:opacity-50"><Plus className="h-4 w-4" /> Agregar cliente</button></div>
    {error && <div className="flex justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><span>{error}</span><button onClick={() => void loadClients()}><RefreshCw className="h-4 w-4" /></button></div>}
    <div className="relative max-w-md"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, teléfono o email..." className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div>
    {isLoading ? <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{filtered.map((client) => <div key={client.id} className="rounded-xl border border-border bg-card p-5 shadow-card"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{client.name.split(" ").map((part) => part[0]).join("")}</div><div><p className="font-semibold text-card-foreground">{client.name}</p><p className="text-xs text-muted-foreground">{client.visits} visitas</p></div></div><button onClick={() => void toggleFavorite(client)} title="Marcar favorito" className="rounded p-1"><Star className={client.favorite ? "h-4 w-4 fill-warning text-warning" : "h-4 w-4 text-muted-foreground"} /></button></div><div className="my-4 space-y-2 text-sm text-muted-foreground"><div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{client.phone || "Sin teléfono"}</div><div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{client.email || "Sin email"}</div></div><div className="flex items-center justify-between border-t border-border pt-3"><span className="font-bold text-primary">Gs. {client.total_spent.toLocaleString()}</span><div className="flex gap-1"><button onClick={() => openEdit(client)} title="Editar cliente" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"><Pencil className="h-4 w-4" /></button><button onClick={() => void deleteClient(client)} title="Eliminar cliente" className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div></div></div>)}</div>}
    {!isLoading && filtered.length === 0 && <div className="rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">No se encontraron clientes.</div>}
    {isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={saveClient} className="w-full max-w-md space-y-4 rounded-2xl bg-card p-6 shadow-elevated"><h2 className="text-xl font-bold text-card-foreground">{editingClient ? "Editar cliente" : "Agregar cliente"}</h2><label className="block text-sm font-medium text-card-foreground">Nombre *<input required autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><label className="block text-sm font-medium text-card-foreground">Teléfono<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><label className="block text-sm font-medium text-card-foreground">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><label className="flex items-center gap-2 text-sm text-card-foreground"><input type="checkbox" checked={form.favorite} onChange={(event) => setForm({ ...form, favorite: event.target.checked })} /> Cliente favorito</label><div className="flex justify-end gap-3 border-t border-border pt-4"><button type="button" onClick={() => setIsOpen(false)} className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground">Cancelar</button><button disabled={isSaving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">Guardar</button></div></form></div>}
  </div>;
}