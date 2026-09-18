import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

export type DateRange = "7d" | "30d" | "90d" | "365d";

function getDateRange(range: DateRange) {
  const days = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 }[range];
  const from = startOfDay(subDays(new Date(), days));
  const to = endOfDay(new Date());
  return { from: from.toISOString(), to: to.toISOString() };
}

export function useSalesReport(range: DateRange) {
  const { restaurant } = useAuth();
  return useQuery({
    queryKey: ["report-sales", restaurant?.id, range],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const { from, to } = getDateRange(range);
      const { data, error } = await supabase
        .from("invoices")
        .select("created_at, total, subtotal, iva, discount")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: true });
      if (error) throw error;
      // Group by day
      const grouped = new Map<string, { total: number; count: number }>();
      for (const row of data ?? []) {
        const day = format(new Date(row.created_at), "yyyy-MM-dd");
        const prev = grouped.get(day) ?? { total: 0, count: 0 };
        grouped.set(day, { total: prev.total + Number(row.total), count: prev.count + 1 });
      }
      return Array.from(grouped.entries()).map(([date, val]) => ({
        date,
        label: format(new Date(date), "dd/MM"),
        total: val.total,
        count: val.count,
      }));
    },
    enabled: !!restaurant?.id,
  });
}

export function useExpensesReport(range: DateRange) {
  const { restaurant } = useAuth();
  return useQuery({
    queryKey: ["report-expenses", restaurant?.id, range],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const { from, to } = getDateRange(range);
      const { data, error } = await supabase
        .from("expenses")
        .select("expense_date, amount, description, expense_categories(name)")
        .eq("restaurant_id", restaurant.id)
        .gte("expense_date", from.slice(0, 10))
        .lte("expense_date", to.slice(0, 10))
        .order("expense_date", { ascending: true });
      if (error) throw error;

      // Group by day
      const grouped = new Map<string, number>();
      for (const row of data ?? []) {
        const day = row.expense_date;
        grouped.set(day, (grouped.get(day) ?? 0) + Number(row.amount));
      }

      return Array.from(grouped.entries()).map(([date, amount]) => ({
        date,
        label: format(new Date(date + "T12:00:00"), "dd/MM"),
        amount,
      }));
    },
    enabled: !!restaurant?.id,
  });
}

export function useTopItemsReport(range: DateRange) {
  const { restaurant } = useAuth();
  return useQuery({
    queryKey: ["report-items", restaurant?.id, range],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const { from, to } = getDateRange(range);
      const { data, error } = await supabase
        .from("order_items")
        .select("quantity, price_at_order, menu_items(name), orders!inner(created_at, restaurant_id, status)")
        .eq("orders.restaurant_id", restaurant.id)
        .neq("orders.status", "cancelado")
        .gte("orders.created_at", from)
        .lte("orders.created_at", to);
      if (error) throw error;

      const grouped = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const row of data ?? []) {
        const name = (row.menu_items as any)?.name ?? "Desconocido";
        const prev = grouped.get(name) ?? { name, quantity: 0, revenue: 0 };
        grouped.set(name, {
          name,
          quantity: prev.quantity + Number(row.quantity),
          revenue: prev.revenue + Number(row.quantity) * Number(row.price_at_order),
        });
      }
      return Array.from(grouped.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    },
    enabled: !!restaurant?.id,
  });
}

export function useCategoriesReport(range: DateRange) {
  const { restaurant } = useAuth();
  return useQuery({
    queryKey: ["report-categories", restaurant?.id, range],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const { from, to } = getDateRange(range);
      const { data, error } = await supabase
        .from("order_items")
        .select("quantity, price_at_order, menu_items(name, menu_categories(name)), orders!inner(created_at, restaurant_id, status)")
        .eq("orders.restaurant_id", restaurant.id)
        .neq("orders.status", "cancelado")
        .gte("orders.created_at", from)
        .lte("orders.created_at", to);
      if (error) throw error;

      const grouped = new Map<string, { name: string; revenue: number }>();
      for (const row of data ?? []) {
        const categoryName = (row.menu_items as any)?.menu_categories?.name ?? "Sin categoría";
        const prev = grouped.get(categoryName) ?? { name: categoryName, revenue: 0 };
        grouped.set(categoryName, {
          name: categoryName,
          revenue: prev.revenue + Number(row.quantity) * Number(row.price_at_order),
        });
      }
      return Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue);
    },
    enabled: !!restaurant?.id,
  });
}

export function useExpensesByCategoryReport(range: DateRange) {
  const { restaurant } = useAuth();
  return useQuery({
    queryKey: ["report-expenses-by-category", restaurant?.id, range],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const { from, to } = getDateRange(range);
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, description, category_id, expense_categories(id, name)")
        .eq("restaurant_id", restaurant.id)
        .gte("expense_date", from.slice(0, 10))
        .lte("expense_date", to.slice(0, 10));
      if (error) throw error;

      const grouped = new Map<string, { name: string; amount: number; count: number }>();
      for (const row of data ?? []) {
        const catName = (row.expense_categories as any)?.name ?? "Sin categoría";
        const prev = grouped.get(catName) ?? { name: catName, amount: 0, count: 0 };
        grouped.set(catName, {
          name: catName,
          amount: prev.amount + Number(row.amount || 0),
          count: prev.count + 1,
        });
      }

      return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount);
    },
    enabled: !!restaurant?.id,
  });
}

export function useSalesBreakdownReport(range: DateRange) {
  const { restaurant } = useAuth();
  return useQuery({
    queryKey: ["report-sales-breakdown", restaurant?.id, range],
    queryFn: async () => {
      if (!restaurant?.id) return { subtotal: 0, discount: 0, iva: 0, total: 0, count: 0 };
      const { from, to } = getDateRange(range);
      const { data, error } = await supabase
        .from("invoices")
        .select("subtotal, discount, iva, total")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;

      let subtotal = 0;
      let discount = 0;
      let iva = 0;
      let total = 0;
      for (const row of data ?? []) {
        subtotal += Number(row.subtotal || 0);
        discount += Number(row.discount || 0);
        iva += Number(row.iva || 0);
        total += Number(row.total || 0);
      }

      return {
        subtotal,
        discount,
        iva,
        total,
        count: data?.length || 0,
      };
    },
    enabled: !!restaurant?.id,
  });
}

