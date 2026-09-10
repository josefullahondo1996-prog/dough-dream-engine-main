import { useMemo } from "react";
import { Activity, Clock3, ShieldCheck, UserCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/useAuth";
import { getAuditLog } from "@/lib/audit-log";

export default function AuditLog() {
  const { restaurant, membership } = useAuth();

  const logs = useMemo(() => {
    if (!restaurant) return [];
    return getAuditLog(restaurant.id).slice(0, 20);
  }, [restaurant]);

  const canViewAudit = membership?.role === "admin" || membership?.role === "gerente";

  if (!canViewAudit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoría</h1>
          <p className="mt-1 text-sm text-muted-foreground">Consulta las acciones sensibles del restaurante.</p>
        </div>
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
          Solo administradores y gerentes pueden ver esta auditoría.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auditoría</h1>
        <p className="mt-1 text-sm text-muted-foreground">Seguimiento de acciones sensibles y cambios de sistema.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {logs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No hay eventos registrados aún.</div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-card-foreground">{log.action}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
                        <ShieldCheck className="h-3 w-3" />
                        {log.role}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{log.details}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-sm text-muted-foreground md:items-end">
                  <div className="inline-flex items-center gap-1">
                    <UserCircle2 className="h-3.5 w-3.5" />
                    <span>{log.userName}</span>
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{new Date(log.createdAt).toLocaleString("es-ES")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
