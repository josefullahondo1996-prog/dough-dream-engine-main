import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, type Profile, type Restaurant, type RestaurantMembership } from "@/contexts/auth-context";

const ACTIVE_RESTAURANT_STORAGE_KEY = "gastro_active_restaurant_id";

async function loadProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

interface LoadedWorkspaces {
  restaurants: Restaurant[];
  memberships: RestaurantMembership[];
  activeRestaurant: Restaurant | null;
  activeMembership: RestaurantMembership | null;
}

async function loadAllWorkspaces(userId: string): Promise<LoadedWorkspaces> {
  // 1. Obtener todas las membresías del usuario
  let { data: memberships, error: memberError } = await supabase
    .from("restaurant_members")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (memberError) throw memberError;

  // Si no tiene ningún restaurante asignado, autoprovisionar
  if (!memberships || memberships.length === 0) {
    const { error: provisionError } = await supabase.rpc("ensure_user_workspace");
    if (provisionError) {
      console.warn("ensure_user_workspace RPC falló o no existe:", provisionError);
    }
    const { data: refetched, error: refetchErr } = await supabase
      .from("restaurant_members")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (refetchErr) throw refetchErr;
    memberships = refetched || [];
  }

  if (memberships.length === 0) {
    return {
      restaurants: [],
      memberships: [],
      activeRestaurant: null,
      activeMembership: null,
    };
  }

  // 2. Obtener los restaurantes correspondientes
  const restaurantIds = memberships.map((m) => m.restaurant_id);
  const { data: restaurants, error: restError } = await supabase
    .from("restaurants")
    .select("*")
    .in("id", restaurantIds);

  if (restError) throw restError;

  const validRestaurants = restaurants || [];
  const storedId = localStorage.getItem(ACTIVE_RESTAURANT_STORAGE_KEY);

  let activeRestaurant = validRestaurants.find((r) => r.id === storedId) || validRestaurants[0] || null;
  let activeMembership = activeRestaurant
    ? memberships.find((m) => m.restaurant_id === activeRestaurant?.id) || memberships[0] || null
    : memberships[0] || null;

  if (activeRestaurant) {
    localStorage.setItem(ACTIVE_RESTAURANT_STORAGE_KEY, activeRestaurant.id);
  }

  return {
    restaurants: validRestaurants,
    memberships,
    activeRestaurant,
    activeMembership,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [membership, setMembership] = useState<RestaurantMembership | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [userMemberships, setUserMemberships] = useState<RestaurantMembership[]>([]);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncWorkspaces = async (userId: string) => {
    try {
      const data = await loadAllWorkspaces(userId);
      setRestaurants(data.restaurants);
      setUserMemberships(data.memberships);
      setRestaurant(data.activeRestaurant);
      setMembership(data.activeMembership);
      setWorkspaceError(data.activeRestaurant ? null : "No se encontró ningún restaurante asociado a tu cuenta.");
    } catch (error) {
      console.error("Error sincronizando restaurantes:", error);
      setWorkspaceError(error instanceof Error ? error.message : "Error al cargar restaurantes.");
    }
  };

  const refreshWorkspace = async () => {
    if (!session?.user) {
      setWorkspaceError("No hay una sesión activa.");
      return;
    }
    await syncWorkspaces(session.user.id);
  };

  const switchRestaurant = async (restaurantId: string) => {
    const target = restaurants.find((r) => r.id === restaurantId);
    if (!target) return;

    localStorage.setItem(ACTIVE_RESTAURANT_STORAGE_KEY, restaurantId);
    setRestaurant(target);
    const targetMember = userMemberships.find((m) => m.restaurant_id === restaurantId) || null;
    setMembership(targetMember);
  };

  const createRestaurant = async (name: string, slug?: string): Promise<Restaurant> => {
    if (!session?.user) {
      throw new Error("Debes iniciar sesión para registrar una empresa.");
    }

    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error("El nombre de la empresa gastronómica es obligatorio.");
    }

    const generatedSlug =
      slug?.trim() ||
      `rest-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).substring(2, 7)}`;

    // Intento 1: Llamar RPC create_restaurant_workspace
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("create_restaurant_workspace", {
        restaurant_name: cleanName,
        restaurant_slug: generatedSlug,
      });

      if (!rpcError && rpcData) {
        const createdRest = rpcData as unknown as Restaurant;
        localStorage.setItem(ACTIVE_RESTAURANT_STORAGE_KEY, createdRest.id);
        await syncWorkspaces(session.user.id);
        return createdRest;
      }
    } catch {
      // Continuar al fallback directo
    }

    // Intento 2: Inserción directa en restaurantes y membresías
    const { data: newRest, error: insertError } = await supabase
      .from("restaurants")
      .insert({
        name: cleanName,
        slug: generatedSlug,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Asignar al usuario como admin
    const { error: memberInsertErr } = await supabase.from("restaurant_members").insert({
      restaurant_id: newRest.id,
      user_id: session.user.id,
      role: "admin",
    });

    if (memberInsertErr) console.warn("Error vinculando membresía:", memberInsertErr);

    // Crear área por defecto
    await supabase.from("restaurant_areas").insert({
      name: "Salón Principal",
      restaurant_id: newRest.id,
    });

    localStorage.setItem(ACTIVE_RESTAURANT_STORAGE_KEY, newRest.id);
    await syncWorkspaces(session.user.id);

    return newRest as Restaurant;
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
          await syncWorkspaces(sessionData.session.user.id);
        } catch (error) {
          setWorkspaceError(error instanceof Error ? error.message : "No se pudo cargar el restaurante activo.");
          console.error("Unable to load profile/workspaces", error);
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
        setRestaurants([]);
        setUserMemberships([]);
        setWorkspaceError(null);
        return;
      }

      void Promise.all([loadProfile(nextSession.user.id), syncWorkspaces(nextSession.user.id)]).then(
        ([nextProfile]) => {
          setProfile(nextProfile);
        }
      );
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

  const signUp = async (email: string, password: string, fullName: string, restaurantName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          restaurant_name: restaurantName?.trim() || fullName || "Mi restaurante",
        },
      },
    });
    return {
      error: error ? new Error(error.message) : null,
      needsEmailConfirmation: Boolean(data.user && !data.session),
    };
  };

  const signOut = async () => {
    localStorage.removeItem(ACTIVE_RESTAURANT_STORAGE_KEY);
    const { error } = await supabase.auth.signOut();
    return { error: error ? new Error(error.message) : null };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        restaurant,
        membership,
        restaurants,
        userMemberships,
        workspaceError,
        refreshWorkspace,
        switchRestaurant,
        createRestaurant,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
