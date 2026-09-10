import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, type Profile, type Restaurant, type RestaurantMembership } from "@/contexts/auth-context";

async function loadProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

async function loadWorkspace(userId: string) {
  const { data, error } = await supabase
    .from("restaurant_members")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: restaurantId, error: provisionError } = await supabase.rpc("ensure_user_workspace");
    if (provisionError) throw provisionError;
    const { data: provisionedMembership, error: membershipError } = await supabase
      .from("restaurant_members")
      .select("*")
      .eq("user_id", userId)
      .eq("restaurant_id", restaurantId)
      .single();
    if (membershipError) throw membershipError;
    return loadWorkspaceFromMembership(provisionedMembership);
  }

  return loadWorkspaceFromMembership(data);
}

async function loadWorkspaceFromMembership(data: RestaurantMembership) {

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", data.restaurant_id)
    .single();
  if (restaurantError) throw restaurantError;

  return {
    membership: data as RestaurantMembership,
    restaurant: restaurant as Restaurant,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [membership, setMembership] = useState<RestaurantMembership | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWorkspace = async () => {
    if (!session?.user) {
      setWorkspaceError("No hay una sesión activa.");
      return;
    }

    try {
      const workspace = await loadWorkspace(session.user.id);
      setRestaurant(workspace.restaurant);
      setMembership(workspace.membership);
      setWorkspaceError(workspace.membership ? null : "Tu usuario no tiene un restaurante asignado.");
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "No se pudo cargar el restaurante activo.");
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(sessionData.session);

      if (sessionData.session?.user) {
        try {
          setProfile(await loadProfile(sessionData.session.user.id));
          const workspace = await loadWorkspace(sessionData.session.user.id);
          setRestaurant(workspace.restaurant);
          setMembership(workspace.membership);
          setWorkspaceError(workspace.membership ? null : "Tu usuario no tiene un restaurante asignado.");
        } catch (error) {
          setWorkspaceError(error instanceof Error ? error.message : "No se pudo cargar el restaurante activo.");
          console.error("Unable to load the authenticated user's profile", error);
        }
      }
      setIsLoading(false);
    };

    void initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (event === "SIGNED_OUT" || !nextSession?.user) {
        setProfile(null);
        setRestaurant(null);
        setMembership(null);
        setWorkspaceError(null);
        return;
      }
      void Promise.all([loadProfile(nextSession.user.id), loadWorkspace(nextSession.user.id)])
        .then(([nextProfile, workspace]) => {
          setProfile(nextProfile);
          setRestaurant(workspace.restaurant);
          setMembership(workspace.membership);
          setWorkspaceError(workspace.membership ? null : "Tu usuario no tiene un restaurante asignado.");
        })
        .catch((error) => {
          setWorkspaceError(error instanceof Error ? error.message : "No se pudo cargar el restaurante activo.");
          console.error("Unable to load the authenticated user's workspace", error);
        });
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return {
      error: error ? new Error(error.message) : null,
      needsEmailConfirmation: Boolean(data.user && !data.session),
    };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error ? new Error(error.message) : null };
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, restaurant, membership, workspaceError, refreshWorkspace, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

