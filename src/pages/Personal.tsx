import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type TeamMember = Tables<"restaurant_members"> & { profileName?: string };
type Profile = Tables<"profiles">;

const roleOptions = ["admin", "gerente", "cajero", "mesero", "cocina"] as const;

export default function Personal() {
  const { restaurant, user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

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
    }));

    setMembers(mappedMembers);
    setProfiles(profileRows ?? []);
    setError("");
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const totalAdmins = useMemo(
    () => members.filter((member) => member.role === "admin" || member.role === "gerente").length,
    [members]
  );

  const handleRoleChange = async (memberId: string, nextRole: string) => {
    if (!restaurant) return;

    setSavingId(memberId);
    const { error: updateError } = await supabase
      .from("restaurant_members")
      .update({ role: nextRole })
      .eq("id", memberId)
      .eq("restaurant_id", restaurant.id);

    if (updateError) {
      setError(updateError.message);
      setSavingId(null);
      return;
    }

    setMembers((current) =>
      current.map((member) =>
        member.id === memberId ? { ...member, role: nextRole as (typeof roleOptions)[number] } : member
      )
    );
    setSavingId(null);
  };

  const handleRemove = async (memberId: string, memberUserId: string) => {
    if (!restaurant) return;
    if (user?.id === memberUserId) {
      setError("No puedes quitarte a ti mismo del restaurante.");
      return;
    }

    const confirmed = window.confirm("¿Quitar a este miembro del restaurante?");
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("restaurant_members")
      .delete()
      .eq("id", memberId)
      .eq("restaurant_id", restaurant.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMembers((current) => current.filter((member) => member.id !== memberId));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Personal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestiona los miembros, roles y permisos del restaurante.</p>
        </div>
        <button onClick={() => void loadMembers()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Miembros</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{members.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Administración</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{totalAdmins}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Roles</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{roleOptions.length}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No hay miembros asignados a este restaurante.</div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => (
              <div key={member.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">{member.profileName}</p>
                    <p className="text-sm text-muted-foreground">{member.user_id.slice(0, 8)}...</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <select
                      value={member.role}
                      onChange={(event) => void handleRoleChange(member.id, event.target.value)}
                      disabled={savingId === member.id}
                      className="rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => void handleRemove(member.id, member.user_id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={user?.id === member.user_id}
                  >
                    <Trash2 className="h-4 w-4" />
                    {user?.id === member.user_id ? "Yo" : "Quitar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
