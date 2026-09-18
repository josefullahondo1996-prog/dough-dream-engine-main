import { useEffect, useState, type FormEvent } from "react";
import { Building2, Check, Loader2, Plus, Save, ShieldCheck, Store, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { canAccessPermission } from "@/lib/role-permissions";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Settings() {
  const { restaurant, membership, restaurants, userMemberships, switchRestaurant, createRestaurant } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal para nueva empresa
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

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

  const handleCreateNewCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    try {
      setIsCreatingCompany(true);
      await createRestaurant(newCompanyName.trim());
      toast.success(`Empresa "${newCompanyName}" creada con éxito.`);
      setNewCompanyName("");
      setIsNewModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al crear la empresa");
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const canEdit = canAccessPermission(membership?.role, "restaurant-config");

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajustes & Gestión de Empresas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configura los datos del restaurante actual y gestiona tus múltiples empresas gastronómicas.</p>
      </div>

      {/* SECCIÓN: MIS EMPRESAS GASTRONÓMICAS */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <Store className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Tus Empresas Gastronómicas & Sucursales</h2>
              <p className="text-xs text-muted-foreground">Alterna entre negocios o registra uno nuevo con datos 100% aislados.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            + Registrar Nueva Empresa
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {restaurants.map((rest) => {
            const isActive = rest.id === restaurant?.id;
            const mem = userMemberships.find((m) => m.restaurant_id === rest.id);

            return (
              <div
                key={rest.id}
                onClick={() => {
                  if (!isActive) {
                    void switchRestaurant(rest.id);
                    toast.success(`Cambiado a "${rest.name}"`);
                  }
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isActive
                    ? "border-orange-500 bg-orange-500/10 shadow-sm"
                    : "border-border bg-background hover:border-orange-500/40 hover:bg-secondary/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center font-bold text-xs text-foreground">
                      {rest.name.slice(0, 2).toUpperCase()}
                    </div>
                    {isActive ? (
                      <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Activo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Clic para entrar
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm text-foreground truncate">{rest.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">Rol: {mem?.role || "Admin"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
          <ShieldCheck className="h-4 w-4" />
          Solo administradores y gerentes pueden editar la configuración del restaurante activo.
        </div>
      )}

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{success}</div>}

      {isLoading ? (
        <div className="flex min-h-[250px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Configuración de: {restaurant?.name || "Empresa Actual"}</h2>
              <p className="text-xs text-muted-foreground">Modifica la información básica del local activo.</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium text-card-foreground md:col-span-2">
              <span className="mb-1.5 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Nombre comercial
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={!canEdit}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block text-sm font-medium text-card-foreground">
              Identificador (Slug)
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
                <option value="PYG">PYG (Guaraníes ₲)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="ARS">ARS ($)</option>
                <option value="BRL">BRL (R$)</option>
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

      {/* Modal para Crear Empresa desde Ajustes */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleCreateNewCompany}>
            <DialogHeader>
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mb-2">
                <Store className="w-5 h-5 text-orange-500" />
              </div>
              <DialogTitle className="text-lg font-bold">Registrar Nueva Empresa</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Crea una nueva empresa gastronómica o sucursal con sus propios menús, costos y reportes.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <label className="text-xs font-semibold text-foreground block">
                Nombre de la Empresa o Sucursal *
              </label>
              <input
                required
                placeholder="Ej: Hamburguesería Gourmet Centro"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreatingCompany || !newCompanyName.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {isCreatingCompany ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Crear Empresa
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

