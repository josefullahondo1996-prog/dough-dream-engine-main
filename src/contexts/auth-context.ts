import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Restaurant = Tables<"restaurants">;
export type RestaurantMembership = Tables<"restaurant_members">;

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  restaurant: Restaurant | null;
  membership: RestaurantMembership | null;
  workspaceError: string | null;
  refreshWorkspace: () => Promise<void>;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
