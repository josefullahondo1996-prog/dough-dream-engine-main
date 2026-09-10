import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export default function QrCodes() {
  const { restaurant } = useAuth();
  const [tables, setTables] = useState<Tables<"restaurant_tables">[]>([]);
  const [copiedTableId, setCopiedTableId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTables = useCallback(async () => {
    if (!restaurant) return;
    setIsLoading(true);
    const { data } = await supabase.from("restaurant_tables").select("*").eq("restaurant_id", restaurant.id).order("name");
    setTables(data ?? []);
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => { void loadTables(); }, [loadTables]);

  const getMenuUrl = (tableId: string) => `${window.location.origin}/menu/${restaurant?.slug}?mesa=${tableId}`;

  const copyUrl = async (tableId: string) => {
    const menuUrl = getMenuUrl(tableId);
    if (!menuUrl) return;
    await navigator.clipboard.writeText(menuUrl);
    setCopiedTableId(tableId);
    window.setTimeout(() => setCopiedTableId(null), 1800);
  };

  if (!restaurant) return <div className="py-16 text-center text-muted-foreground">Cargando restaurante...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Menú digital</h1>
        <p className="mt-1 text-sm text-muted-foreground">Los clientes escanean este código para consultar tu carta actualizada.</p>
      </div>

      {isLoading ? <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : tables.length === 0 ? <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">Crea una mesa para generar su código QR automáticamente.</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{tables.map((table) => { const menuUrl = getMenuUrl(table.id); const copied = copiedTableId === table.id; return <article key={table.id} className="rounded-xl border border-border bg-card p-5 text-center shadow-card"><div className="mb-3 flex items-center justify-center gap-2 font-semibold"><QrCode className="h-5 w-5 text-primary" />{table.name}</div><div className="mb-4 flex justify-center rounded-xl bg-white p-4"><QRCodeSVG value={menuUrl} size={170} includeMargin level="M" aria-label={`Código QR de ${table.name}`} /></div><p className="mb-3 text-xs text-muted-foreground">Este QR abre el menú asociado a esta mesa.</p><div className="flex justify-center gap-2"><button onClick={() => void copyUrl(table.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copiado" : "Copiar"}</button><a href={menuUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground"><ExternalLink className="h-3.5 w-3.5" />Abrir</a></div></article>; })}</div>}
    </div>
  );
}
