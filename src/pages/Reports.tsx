import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { summarizeByDay } from "@/lib/report-utils";

type Invoice = {
  created_at: string;
  total: number;
};

type Expense = {
  expense_date: string;
  amount: number;
};

export default function Reports() {
  const { restaurant } = useAuth();
  const [sales, setSales] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    if (!restaurant) {
      setSales([]);
      setExpenses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const [salesResult, expensesResult] = await Promise.all([
      supabase.from("invoices").select("created_at, total").eq("restaurant_id", restaurant.id),
      supabase.from("expenses").select("expense_date, amount").eq("restaurant_id", restaurant.id),
    ]);

    if (salesResult.error) {
      setError(salesResult.error.message);
    }
    if (expensesResult.error) {
      setError((current) => current || expensesResult.error?.message || "");
    }

    setSales(salesResult.data ?? []);
    setExpenses(expensesResult.data ?? []);
    setIsLoading(false);
  }, [restaurant]);

  const salesSummary = useMemo(
    () => summarizeByDay(sales.map((item) => ({ date: new Date(item.created_at).toISOString().slice(0, 10), amount: item.total }))),
    [sales]
  );

  const expenseSummary = useMemo(
    () => summarizeByDay(expenses.map((item) => ({ date: item.expense_date, amount: item.amount }))),
    [expenses]
  );

  const totalSales = sales.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const net = totalSales - totalExpenses;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Informes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Compara ventas y gastos por día.</p>
        </div>
        <button onClick={() => void loadReports()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Ventas</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{totalSales.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Gastos</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{totalExpenses.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Beneficio neto</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{net.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Ventas por día</h2>
          </div>
          <div className="space-y-2">
            {salesSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay ventas para mostrar.</p>
            ) : (
              salesSummary.map((entry) => (
                <div key={entry.date} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                  <span>{entry.date}</span>
                  <span className="font-medium">{entry.amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Gastos por día</h2>
          </div>
          <div className="space-y-2">
            {expenseSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay gastos para mostrar.</p>
            ) : (
              expenseSummary.map((entry) => (
                <div key={entry.date} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                  <span>{entry.date}</span>
                  <span className="font-medium">{entry.amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
