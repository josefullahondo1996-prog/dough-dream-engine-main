import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChefHat,
  Crown,
  CreditCard,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UtensilsCrossed,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import {
  ROLE_DETAILS,
  PERMISSION_DEFINITIONS,
  getRoleDetail,
  type RoleName,
} from "@/lib/role-permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TeamMember = Tables<"restaurant_members"> & { profileName?: string; profileEmail?: string };
type Profile = Tables<"profiles">;

const roleOptions: RoleName[] = ["admin", "gerente", "cajero", "mesero", "cocina"];

export default function Personal() {
  const { restaurant, user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");

  // Modal para agregar miembro
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<RoleName>("mesero");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!restaurant) {
      setMembers([]);
      setProfiles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data: memberRows, error: membersError } = await supabase
      .from("restaurant_members")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });

    if (membersError) {
      setError(membersError.message);
      setIsLoading(false);
      return;
    }

    const userIds = (memberRows ?? []).map((member) => member.user_id);
    const { data: profileRows, error: profilesError } = userIds.length
      ? await supabase.from("profiles").select("*").in("id", userIds)
      : { data: [], error: null };

    if (profilesError) {
      setError(profilesError.message);
      setIsLoading(false);
      return;
    }

    const profileMap = Object.fromEntries((profileRows ?? []).map((profile) => [profile.id, profile]));
    const mappedMembers = (memberRows ?? []).map((member) => ({
      ...member,
      profileName: profileMap[member.user_id]?.full_name || "Sin nombre",
      profileEmail: member.user_id.slice(0, 8) + "@gastroflow.app",
    }));

    setMembers(mappedMembers);
    setProfiles(profileRows ?? []);
    setError("");
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  // Contadores
  const countAdmins = useMemo(() => members.filter((m) => m.role === "admin").length, [members]);
  const countGerentes = useMemo(() => members.filter((m) => m.role === "gerente").length, [members]);
  const countCajeros = useMemo(() => members.filter((m) => m.role === "cajero").length, [members]);
  const countMeseros = useMemo(() => members.filter((m) => m.role === "mesero").length, [members]);
  const countCocina = useMemo(() => members.filter((m) => m.role === "cocina").length, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        (member.profileName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = selectedRoleFilter === "all" || member.role === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, selectedRoleFilter]);

  const handleRoleChange = async (memberId: string, nextRole: RoleName) => {
    if (!restaurant) return;

    setSavingId(memberId);
    const { error: updateError } = await supabase
      .from("restaurant_members")
      .update({ role: nextRole })
      .eq("id", memberId)
      .eq("restaurant_id", restaurant.id);

    if (updateError) {
      toast.error(updateError.message);
      setSavingId(null);
      return;
    }

    setMembers((current) =>
      current.map((member) =>
        member.id === memberId ? { ...member, role: nextRole } : member
      )
    );
    toast.success(`Rol actualizado a "${ROLE_DETAILS[nextRole]?.label || nextRole}"`);
    setSavingId(null);
  };

  const handleRemove = async (memberId: string, memberUserId: string, memberName: string) => {
    if (!restaurant) return;
    if (user?.id === memberUserId) {
      toast.error("No puedes quitarte a ti mismo del restaurante.");
      return;
    }

    const confirmed = window.confirm(`¿Seguro que deseas desvincular a "${memberName}" de este restaurante?`);
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("restaurant_members")
      .delete()
      .eq("id", memberId)
      .eq("restaurant_id", restaurant.id);

    if (deleteError) {
      toast.error(deleteError.message);
      return;
    }

    setMembers((current) => current.filter((member) => member.id !== memberId));
    toast.success(`Miembro "${memberName}" desvinculado correctamente.`);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    if (!newMemberName.trim()) {
      toast.error("Ingresa el nombre del empleado.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Intento 1: Llamar a la función RPC add_restaurant_member
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("add_restaurant_member", {
          p_restaurant_id: restaurant.id,
          p_member_email: newMemberEmail.trim() || `${newMemberName.toLowerCase().replace(/\s+/g, "")}@gastro.app`,
          p_member_name: newMemberName.trim(),
          p_member_role: newMemberRole,
        });

        if (!rpcErr && rpcData) {
          toast.success(`¡Empleado "${newMemberName}" registrado como ${ROLE_DETAILS[newMemberRole].label}!`);
          setIsAddModalOpen(false);
          setNewMemberName("");
          setNewMemberEmail("");
          await loadMembers();
          return;
        }
      } catch {
        // Fallback a inserción directa
      }

      // Intento 2: Inserción directa
      const fakeUserId = crypto.randomUUID();
      await supabase.from("profiles").insert({
        id: fakeUserId,
        full_name: newMemberName.trim(),
        role: newMemberRole,
      });

      const { error: memberInsertErr } = await supabase.from("restaurant_members").insert({
        restaurant_id: restaurant.id,
        user_id: fakeUserId,
        role: newMemberRole,
      });

      if (memberInsertErr) throw memberInsertErr;

      toast.success(`¡Empleado "${newMemberName}" agregado con éxito!`);
      setIsAddModalOpen(false);
      setNewMemberName("");
      setNewMemberEmail("");
      await loadMembers();
    } catch (err: any) {
      toast.error(err.message || "Error al registrar empleado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Personal & Control de Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona el equipo de <span className="font-semibold text-foreground">{restaurant?.name || "tu restaurante"}</span>, asigna permisos operativos y roles de acceso.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadMembers()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            + Registrar Personal
          </button>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
            <Users className="w-4 h-4 text-primary" /> Total Equipo
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{members.length}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold">
            <Crown className="w-4 h-4" /> Administradores
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{countAdmins}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" /> Gerentes
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{countGerentes}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <UtensilsCrossed className="w-4 h-4" /> Mozos / Meseros
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{countMeseros}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <ChefHat className="w-4 h-4" /> Cocina / KOT
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{countCocina + countCajeros}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* PESTAÑAS: USUARIOS VS MATRIZ DE PERMISOS */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="bg-secondary/60 p-1 rounded-xl">
          <TabsTrigger value="members" className="rounded-lg text-xs font-semibold">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Equipo & Personal ({members.length})
          </TabsTrigger>
          <TabsTrigger value="permissions" className="rounded-lg text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 mr-1.5" /> Matriz de Permisos por Rol
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: LISTADO DE PERSONAL */}
        <TabsContent value="members" className="space-y-4">
          {/* BARRA DE BÚSQUEDA Y FILTRO */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
              {[
                { key: "all", label: "Todos" },
                { key: "admin", label: "Admins" },
                { key: "gerente", label: "Gerentes" },
                { key: "cajero", label: "Cajeros" },
                { key: "mesero", label: "Mozos" },
                { key: "cocina", label: "Cocina" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setSelectedRoleFilter(filter.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedRoleFilter === filter.key
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* TABLA / LISTA DE PERSONAL */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs">Cargando personal del restaurante...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <p className="text-sm font-medium text-foreground">No se encontraron miembros</p>
                <p className="text-xs mt-1">Prueba cambiando los filtros o agrega un nuevo empleado.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredMembers.map((member) => {
                  const roleInfo = getRoleDetail(member.role);
                  const isCurrentUser = user?.id === member.user_id;

                  return (
                    <div
                      key={member.id}
                      className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between hover:bg-secondary/20 transition-colors"
                    >
                      {/* Avatar y Datos del usuario */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center shrink-0">
                          {member.profileName?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-foreground">{member.profileName}</p>
                            {isCurrentUser && (
                              <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none text-[10px] px-1.5 py-0">
                                Tú
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">ID: {member.user_id.slice(0, 12)}...</p>
                        </div>
                      </div>

                      {/* Asignación de Rol y Acciones */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Selector de Rol */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground hidden sm:inline">Rol:</span>
                          <select
                            value={member.role}
                            onChange={(event) => void handleRoleChange(member.id, event.target.value as RoleName)}
                            disabled={savingId === member.id}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold outline-none transition-all cursor-pointer ${roleInfo.badgeBg} ${roleInfo.badgeColor}`}
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role} className="bg-card text-foreground">
                                {ROLE_DETAILS[role].label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Botón Quitar */}
                        <button
                          type="button"
                          onClick={() => void handleRemove(member.id, member.user_id, member.profileName || "Empleado")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                          disabled={isCurrentUser}
                          title={isCurrentUser ? "No puedes quitarte a ti mismo" : "Desvincular miembro"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Desvincular</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: MATRIZ DE PERMISOS POR ROL */}
        <TabsContent value="permissions" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base text-foreground">Matriz de Acceso y Funcionalidades</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Esta tabla detalla exactamente qué pantallas y herramientas puede utilizar cada integrante según su cargo.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-secondary/40">
                    <th className="p-3 font-semibold">Módulo / Permiso</th>
                    <th className="p-3 font-semibold text-center text-purple-600 dark:text-purple-400">👑 Admin</th>
                    <th className="p-3 font-semibold text-center text-blue-600 dark:text-blue-400">💼 Gerente</th>
                    <th className="p-3 font-semibold text-center text-emerald-600 dark:text-emerald-400">💵 Cajero</th>
                    <th className="p-3 font-semibold text-center text-amber-600 dark:text-amber-400">🍽️ Mesero</th>
                    <th className="p-3 font-semibold text-center text-rose-600 dark:text-rose-400">👨‍🍳 Cocina</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PERMISSION_DEFINITIONS.map((perm) => (
                    <tr key={perm.key} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3">
                        <p className="font-semibold text-foreground">{perm.label}</p>
                        <p className="text-[11px] text-muted-foreground">{perm.description}</p>
                      </td>
                      {roleOptions.map((r) => {
                        const hasAccess = ROLE_DETAILS[r].permissions.includes(perm.key);
                        return (
                          <td key={r} className="p-3 text-center">
                            {hasAccess ? (
                              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <Check className="w-3.5 h-3.5 font-bold" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-muted-foreground/40">
                                <X className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL REGISTRAR NUEVO EMPLEADO */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleAddMember}>
            <DialogHeader>
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mb-2">
                <UserPlus className="w-5 h-5 text-orange-500" />
              </div>
              <DialogTitle className="text-lg font-bold">Registrar Nuevo Empleado</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Asigna un nuevo integrante a <span className="font-semibold">{restaurant?.name}</span> con su respectivo rol de operación.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Nombre completo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Nombre Completo del Empleado *
                </label>
                <input
                  required
                  placeholder="Ej: Marcelo Gómez"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Correo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Correo Electrónico (opcional)
                </label>
                <input
                  type="email"
                  placeholder="marcelo@restaurante.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Selector de Rol con Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Rol y Permisos en el Restaurante *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roleOptions.map((r) => {
                    const detail = ROLE_DETAILS[r];
                    const isSelected = newMemberRole === r;

                    return (
                      <div
                        key={r}
                        onClick={() => setNewMemberRole(r)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-orange-500 bg-orange-500/10 shadow-sm"
                            : "border-border bg-card hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground">{detail.label}</p>
                          {isSelected && <Check className="w-3.5 h-3.5 text-orange-500" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-tight">
                          {detail.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newMemberName.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" /> Registrar Personal
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
