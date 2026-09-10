import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Request = Tables<"service_requests">;
type Table = Tables<"restaurant_tables">;

const labels: Record<string, string> = { camarero: "Llamar al camarero", cuenta: "Solicitar la cuenta", ayuda: "Solicitar ayuda" };

export default function ServiceRequests() {
  const { restaurant } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [tables, setTables] = useState<Record<string, Table>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    if (!restaurant) return;
    setIsLoading(true);
    const [requestResult, tableResult] = await Promise.all([
      supabase.from("service_requests").select("*").eq("restaurant_id", restaurant.id).eq("status", "pendiente").order("created_at", { ascending: true }),
      supabase.from("restaurant_tables").select("*").eq("restaurant_id", restaurant.id),
    ]);
    if (requestResult.error || tableResult.error) setError(requestResult.error?.message || tableResult.error?.message || "No se pudieron cargar las solicitudes.");
    setRequests(requestResult.data ?? []);
    setTables(Object.fromEntries((tableResult.data ?? []).map((table) => [table.id, table])));
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const attend = async (request: Request) => {
    const { error: updateError } = await supabase.from("service_requests").update({ status: "atendida", attended_at: new Date().toISOString() }).eq("id", request.id).eq("restaurant_id", restaurant?.id || "");
    if (updateError) setError(updateError.message);
    else setRequests((current) => current.filter((item) => item.id !== request.id));
  };

  return <div className="space-y-6"><div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-foreground">Solicitudes</h1><p className="mt-1 text-sm text-muted-foreground">Avisos enviados desde el menú QR.</p></div><button onClick={() => void loadRequests()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium"><RefreshCw className="h-4 w-4" />Actualizar</button></div>{error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}{isLoading ? <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : requests.length === 0 ? <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground"><Bell className="mx-auto mb-2 h-8 w-8 opacity-40" />No hay solicitudes pendientes.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{requests.map((request) => <article key={request.id} className="rounded-xl border border-warning/30 bg-warning/5 p-5 shadow-card"><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-bold text-card-foreground">{tables[request.table_id]?.name || "Mesa"}</p><p className="mt-1 text-sm text-warning">{labels[request.request_type] || "Solicitud"}</p></div><Bell className="h-5 w-5 text-warning" /></div><p className="mt-4 text-xs text-muted-foreground">{new Date(request.created_at).toLocaleString("es-PY")}</p><button onClick={() => void attend(request)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-success px-3 py-2.5 text-sm font-semibold text-success-foreground"><Check className="h-4 w-4" />Marcar atendida</button></article>)}</div>}</div>;
}
