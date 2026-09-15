import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

export type ReservationStatus = "pendiente" | "confirmada" | "cancelada";

export interface Reservation {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  client_name: string;
  client_phone: string | null;
  party_size: number;
  reservation_time: string;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
}

export type InsertReservation = Omit<Reservation, "id" | "created_at" | "restaurant_id">;

export function useReservations(date?: Date) {
  const { restaurant } = useAuth();
  const queryClient = useQueryClient();

  const getStartAndEndOfDay = (date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const query = useQuery({
    queryKey: ["reservations", restaurant?.id, date?.toISOString()],
    queryFn: async () => {
      if (!restaurant?.id) return [];

      let query = supabase
        .from("reservations" as any)
        .select("*, restaurant_tables(name)")
        .eq("restaurant_id", restaurant.id)
        .order("reservation_time", { ascending: true });

      if (date) {
        const { start, end } = getStartAndEndOfDay(date);
        query = query.gte("reservation_time", start).lte("reservation_time", end);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data as (Reservation & { restaurant_tables: { name: string } | null })[];
    },
    enabled: !!restaurant?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (newReservation: InsertReservation) => {
      if (!restaurant?.id) throw new Error("No restaurant selected");
      const { data, error } = await supabase
        .from("reservations" as any)
        .insert([{ ...newReservation, restaurant_id: restaurant.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data as Reservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations", restaurant?.id] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReservationStatus }) => {
      const { data, error } = await supabase
        .from("reservations" as any)
        .update({ status })
        .eq("id", id)
        .select()
        .single();
        
      if (error) throw error;
      return data as Reservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations", restaurant?.id] });
    },
  });

  return {
    reservations: query.data ?? [],
    isLoading: query.isLoading,
    createReservation: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateStatus: updateStatusMutation.mutateAsync,
  };
}
