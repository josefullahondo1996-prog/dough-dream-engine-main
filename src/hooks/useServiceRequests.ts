import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type NotificationRequest = Tables<"service_requests"> & { tableName: string };

export function useServiceRequests() {
  const { restaurant } = useAuth();

  return useQuery({
    queryKey: ["service_requests", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return [];

      const [requestResult, tableResult] = await Promise.all([
        supabase
          .from("service_requests")
          .select("*")
          .eq("restaurant_id", restaurant.id)
          .eq("status", "pendiente")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("restaurant_tables").select("id, name").eq("restaurant_id", restaurant.id),
      ]);

      if (requestResult.error) throw requestResult.error;
      if (tableResult.error) throw tableResult.error;

      const tableNames = Object.fromEntries(
        (tableResult.data ?? []).map((table) => [table.id, table.name])
      );

      return (requestResult.data ?? []).map((request) => ({
        ...request,
        tableName: tableNames[request.table_id] || "Mesa",
      })) as NotificationRequest[];
    },
    enabled: !!restaurant?.id,
  });
}
