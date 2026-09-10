import { useEffect, useState, type FormEvent } from "react";
import { Building2, Loader2, Save, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { canAccessPermission } from "@/lib/role-permissions";

export default function Settings() {
  const { restaurant, membership } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!restaurant) {
      setName("");
      setSlug("");
      setIsLoading(false);
      return;
    }

    setName(restaurant.name ?? "");
    setSlug(restaurant.slug ?? "");
    setIsLoading(false);
  }, [restaurant]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant) {
      setError("No hay un restaurante activo para guardar la configuración.");
      return;
    }

    if (!name.trim()) {
      setError("El nombre del restaurante es obligatorio.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("restaurants")
      .update({
        name: name.trim(),
        slug: slug.trim() || restaurant.slug,
      })
      .eq("id", restaurant.id);

    if (updateError) {
      setError(updateError.message);
      setIsSaving(false);
      return;
    }

    setSuccess("Configuración guardada correctamente.");
    setIsSaving(false);
  };

  const canEdit = canAccessPermission(membership?.role, "restaurant-config");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajustes del restaurante</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configura los datos básicos de tu negocio.</p>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
          <ShieldCheck className="h-4 w-4" />
          Solo administradores y gerentes pueden editar la configuración.
        </div>
      )}

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{success}</div>}

      {isLoading ? (
        <div className="flex min-h-[250px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium text-card-foreground md:col-span-2">
              <span className="mb-1.5 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Nombre del restaurante
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={!canEdit}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block text-sm font-medium text-card-foreground">
              Slug
              <input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                disabled={!canEdit}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block text-sm font-medium text-card-foreground">
              Moneda
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                disabled={!canEdit}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="PYG">PYG</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={!canEdit || isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar cambios
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
