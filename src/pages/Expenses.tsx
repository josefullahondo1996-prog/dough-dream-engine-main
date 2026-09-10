import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { DollarSign, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { formatCurrency, sumExpenses } from "@/lib/expense-utils";

type Expense = Tables<"expenses">;
type ExpenseCategory = Tables<"expense_categories">;

const initialForm = {
  description: "",
  amount: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  categoryId: "",
  paymentMethod: "efectivo",
  notes: "",
};

export default function Expenses() {
  const { restaurant } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  const loadData = useCallback(async () => {
    if (!restaurant) {
      setExpenses([]);
      setCategories([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const [expensesResult, categoriesResult] = await Promise.all([
      supabase.from("expenses").select("*").eq("restaurant_id", restaurant.id).order("expense_date", { ascending: false }),
      supabase.from("expense_categories").select("*").eq("restaurant_id", restaurant.id).order("name"),
    ]);

    if (expensesResult.error) {
      setError(expensesResult.error.message);
    } else {
      setExpenses(expensesResult.data ?? []);
      setError("");
    }

    if (categoriesResult.error) {
      setError((current) => current || categoriesResult.error?.message || "");
    } else {
      setCategories(categoriesResult.data ?? []);
    }

    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const searchText = `${expense.description} ${expense.notes ?? ""} ${categoryMap[expense.category_id ?? ""] ?? ""}`.toLowerCase();
        return searchText.includes(search.toLowerCase());
      }),
    [categoryMap, expenses, search]
  );

  const totalExpenses = useMemo(() => sumExpenses(expenses), [expenses]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant) {
      setError("No se encontró el restaurante activo.");
      return;
    }

    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Introduce una descripción y un importe válido.");
      return;
    }

    setIsSaving(true);
    const { data, error: insertError } = await supabase
      .from("expenses")
      .insert({
        restaurant_id: restaurant.id,
        category_id: form.categoryId || null,
        description: form.description.trim(),
        amount,
        expense_date: form.expenseDate,
        payment_method: form.paymentMethod,
        notes: form.notes.trim() || null,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      setIsSaving(false);
      return;
    }

    if (data) {
      setExpenses((current) => [data, ...current]);
    }

    setForm(initialForm);
    setIsOpen(false);
    setIsSaving(false);
  };

  const handleDelete = async (expense: Expense) => {
    if (!restaurant || !window.confirm(`¿Eliminar el gasto "${expense.description}"?`)) return;

    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expense.id)
      .eq("restaurant_id", restaurant.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setExpenses((current) => current.filter((item) => item.id !== expense.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gastos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Controla los pagos y costes del restaurante.</p>
        </div>
        <button
          disabled={!restaurant}
          onClick={() => {
            setError("");
            setIsOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Nuevo gasto
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Total gastos</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Registros</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{expenses.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Categorías</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{categories.length}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <button onClick={() => void loadData()} className="rounded-md p-1 hover:bg-destructive/20">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar gastos..."
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No hay gastos registrados.</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-card-foreground">{expense.description}</p>
                      {expense.category_id && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          {categoryMap[expense.category_id] ?? "Sin categoría"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(expense.expense_date).toLocaleDateString("es-ES")} · {expense.payment_method}
                    </p>
                    {expense.notes && <p className="mt-1 text-xs text-muted-foreground">{expense.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-foreground">{formatCurrency(expense.amount)}</p>
                  <button
                    onClick={() => void handleDelete(expense)}
                    title="Eliminar gasto"
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-4 rounded-2xl bg-card p-6 shadow-elevated">
            <div>
              <h2 className="text-xl font-bold text-card-foreground">Nuevo gasto</h2>
              <p className="mt-1 text-sm text-muted-foreground">Registra los costes operativos del restaurante.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-card-foreground md:col-span-2">
                Descripción *
                <input
                  required
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="block text-sm font-medium text-card-foreground">
                Importe *
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="block text-sm font-medium text-card-foreground">
                Fecha
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="block text-sm font-medium text-card-foreground">
                Categoría
                <select
                  value={form.categoryId}
                  onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-card-foreground">
                Método de pago
                <select
                  value={form.paymentMethod}
                  onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="otros">Otros</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-card-foreground md:col-span-2">
                Notas
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground">
                Cancelar
              </button>
              <button disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar gasto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
