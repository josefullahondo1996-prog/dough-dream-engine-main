import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { useNotificationSound } from "./useNotificationSound";

export function useRealtimeNotifications() {
  const { restaurant } = useAuth();
  const queryClient = useQueryClient();
  const { playNotificationSound } = useNotificationSound();

  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel(`staff-notifications-${restaurant.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurant.id}` },
        () => {
          playNotificationSound();
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "service_requests", filter: `restaurant_id=eq.${restaurant.id}` },
        () => {
          playNotificationSound();
          void queryClient.invalidateQueries({ queryKey: ["service_requests", restaurant.id] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "service_requests", filter: `restaurant_id=eq.${restaurant.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["service_requests", restaurant.id] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurant?.id, playNotificationSound, queryClient]);
}
