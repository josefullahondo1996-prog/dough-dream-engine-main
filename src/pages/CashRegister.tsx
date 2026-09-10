import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Banknote, Loader2, Lock, Plus, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { canAccessPermission } from "@/lib/role-permissions";
import { appendAuditLog } from "@/lib/audit-log";
import type { Tables } from "@/integrations/supabase/types";

type CashMove = Tables<"cash_movements">;
type CashSession = Tables<"cash_register">;

export default function CashRegister() {
  const { restaurant, membership, user, profile } = useAuth();
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [movements, setMovements] = useState<CashMove[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [initialAmount, setInitialAmount] = useState("0");
  const [saving, setSaving] = useState(false);

  const canManageCash = canAccessPermission(membership?.role, "cash-register");

  const loadData = useCallback(async () => {
    if (!restaurant) {
      setSessions([]);
      setMovements([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const [sessionsResult, movementsResult] = await Promise.all([
      supabase
        .from("cash_register")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("opened_at", { ascending: false }),
      supabase
        .from("cash_movements")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false }),
    ]);

    if (sessionsResult.error) {
      setError(sessionsResult.error.message);
      setIsLoading(false);
      return;
    }

    if (movementsResult.error) {
      setError(movementsResult.error.message);
      setIsLoading(false);
      return;
    }

    setSessions(sessionsResult.data ?? []);
    setMovements(movementsResult.data ?? []);
    setError("");
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currentSession = useMemo(
    () => sessions.find((session) => session.status === "open") ?? sessions[0] ?? null,
    [sessions]
  );

  const totalInCash = useMemo(
    () => movements.filter((movement) => movement.type === "in" || movement.type === "income").reduce((sum, movement) => sum + movement.amount, 0),
    [movements]
  );

  const totalOutCash = useMemo(
    () => movements.filter((movement) => movement.type === "out" || movement.type === "expense").reduce((sum, movement) => sum + movement.amount, 0),
    [movements]
  );

  const openingBalance = currentSession?.initial_amount ?? 0;
  const currentCash = openingBalance + totalInCash - totalOutCash;

  const handleOpenCash = async () => {
    if (!restaurant) return;
    if (!canManageCash) {
      setError("No tienes permisos para abrir la caja.");
      return;
    }

    const parsedAmount = Number(initialAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError("Introduce una cantidad válida para la apertura de caja.");
      return;
    }

    setSaving(true);
    setError("");

    const { error: insertError } = await supabase.from("cash_register").insert({
      restaurant_id: restaurant.id,
      initial_amount: parsedAmount,
      opened_at: new Date().toISOString(),
      status: "open",
      final_amount: null,
      closed_at: null,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    appendAuditLog({
      restaurantId: restaurant.id,
      userId: user?.id ?? "unknown",
      userName: profile?.full_name ?? "Usuario",
      role: membership?.role ?? "unknown",
      action: "cash-open",
      details: `Apertura de caja con importe inicial ${parsedAmount.toFixed(2)}€`,
    });

    setInitialAmount("0");
    await loadData();
  };

  const handleCloseCash = async () => {
    if (!currentSession || !restaurant) return;
    if (!canManageCash) {
      setError("No tienes permisos para cerrar la caja.");
      return;
    }

    setSaving(true);
    setError("");

    const finalAmount = currentCash;
    const { error: closeError } = await supabase
      .from("cash_register")
      .update({
        status: "closed",
        final_amount: finalAmount,
        closed_at: new Date().toISOString(),
      })
      .eq("id", currentSession.id)
      .eq("restaurant_id", restaurant.id);

    setSaving(false);
    if (closeError) {
      setError(closeError.message);
      return;
    }

    appendAuditLog({
      restaurantId: restaurant.id,
      userId: user?.id ?? "unknown",
      userName: profile?.full_name ?? "Usuario",
      role: membership?.role ?? "unknown",
      action: "cash-close",
      details: `Cierre de caja confirmado: ${finalAmount.toFixed(2)}€`,
    });

    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Caja</h1>
          <p className="mt-1 text-sm text-muted-foreground">Controla el estado de la caja del restaurante.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          {currentSession?.status === "open" ? <Unlock className="h-4 w-4 text-success" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
          <span>{currentSession?.status === "open" ? "Caja abierta" : "Caja cerrada"}</span>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <div className="flex min-h-[220px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Apertura</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{openingBalance.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Entradas</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{totalInCash.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Efectivo disponible</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{currentCash.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
            </div>
          </div>

          {!canManageCash && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
              No tienes permisos para gestionar la caja.
            </div>
          )}

          {currentSession?.status === "open" ? (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!canManageCash || saving}
                onClick={() => void handleCloseCash()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Banknote className="h-4 w-4" />
                Cerrar caja
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-lg font-semibold text-foreground">Abrir caja</h2>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <label className="flex-1 text-sm font-medium text-card-foreground">
                  Cantidad inicial
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={initialAmount}
                    onChange={(event) => setInitialAmount(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <button
                  type="button"
                  disabled={!canManageCash || saving}
                  onClick={() => void handleOpenCash()}
                  className="self-end rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-success-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Abrir</span>
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-lg font-semibold text-foreground">Movimientos</h2>
            <div className="mt-4 space-y-3">
              {movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay movimientos registrados aún.</p>
              ) : (
                movements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                    <div className="flex items-center gap-3">
                      {movement.type === "in" || movement.type === "income" ? (
                        <ArrowUpCircle className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{movement.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(movement.created_at).toLocaleString("es-ES")}
                        </p>
                      </div>
                    </div>
                    <span className={movement.type === "in" || movement.type === "income" ? "font-semibold text-success" : "font-semibold text-destructive"}>
                      {movement.amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
