import { useEffect, useState } from "react";
import { Bell, Maximize2, Search, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface TopBarProps {
  collapsed: boolean;
}

type NotificationRequest = Tables<"service_requests"> & { tableName: string };

let notificationAudioContext: AudioContext | null = null;

const requestLabels: Record<string, string> = {
  camarero: "Llamar al camarero",
  cuenta: "Solicitar la cuenta",
  ayuda: "Solicitar ayuda",
};

function playNotificationSound() {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;

  notificationAudioContext ??= new AudioContextClass();
  void notificationAudioContext.resume().then(() => {
    const audioContext = notificationAudioContext;
    if (!audioContext) return;

    const now = audioContext.currentTime;
    [880, 1174, 1568].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = now + index * 0.14;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.24, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.34);
    });
  });
}

export default function TopBar({ collapsed }: TopBarProps) {
  const { profile, user, restaurant, signOut } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRequest[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    if (!restaurant) return;

    let isMounted = true;
    const loadNotifications = async () => {
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

      if (!isMounted) return;
      const tableNames = Object.fromEntries((tableResult.data ?? []).map((table) => [table.id, table.name]));
      setNotifications((requestResult.data ?? []).map((request) => ({ ...request, tableName: tableNames[request.table_id] || "Mesa" })));
    };

    void loadNotifications();

    const channel = supabase
      .channel(`staff-notifications-${restaurant.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurant.id}` }, () => {
        playNotificationSound();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_requests", filter: `restaurant_id=eq.${restaurant.id}` }, () => {
        playNotificationSound();
        void loadNotifications();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_requests", filter: `restaurant_id=eq.${restaurant.id}` }, () => {
        void loadNotifications();
      })
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [restaurant]);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-card border-b border-border flex items-center justify-between px-6 transition-all duration-300 shadow-card",
        collapsed ? "left-[68px]" : "left-[250px]"
      )}
    >
      {/* Left: Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-2 text-sm bg-secondary rounded-lg border-none outline-none focus:ring-2 focus:ring-primary/30 w-64 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Cart */}
        <button className="relative p-2.5 rounded-lg hover:bg-secondary transition-colors">
          <ShoppingCart className="w-5 h-5 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            0
          </span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((current) => !current)}
            aria-label="Abrir solicitudes"
            className="relative rounded-lg p-2.5 transition-colors hover:bg-secondary"
          >
          <Bell className="w-5 h-5 text-muted-foreground" />
            {notifications.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px] font-bold text-success-foreground">{notifications.length}</span>}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-card p-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-2 pb-2">
                <p className="text-sm font-semibold text-foreground">Solicitudes pendientes</p>
                <span className="text-xs text-muted-foreground">{notifications.length}</span>
              </div>
              {notifications.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">No hay solicitudes nuevas.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((notification) => (
                    <a key={notification.id} href="/solicitudes" className="block border-b border-border px-2 py-3 last:border-0 hover:bg-secondary">
                      <p className="text-sm font-medium text-foreground">{notification.tableName}</p>
                      <p className="mt-0.5 text-xs text-warning">{requestLabels[notification.request_type] || "Solicitud"}</p>
                    </a>
                  ))}
                </div>
              )}
              <a href="/solicitudes" className="mt-2 block rounded-lg bg-secondary px-3 py-2 text-center text-xs font-medium text-secondary-foreground">Ver todas las solicitudes</a>
            </div>
          )}
        </div>

        {/* Fullscreen */}
        <button className="p-2.5 rounded-lg hover:bg-secondary transition-colors hidden md:flex">
          <Maximize2 className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-border mx-1" />

        {/* User */}
        <button onClick={() => void signOut()} title="Cerrar sesión" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-foreground leading-tight">{profile?.full_name || user?.email || "Usuario"}</p>
            <p className="text-xs text-muted-foreground leading-tight">{restaurant?.name || profile?.role || "Staff"}</p>
          </div>
        </button>
      </div>
    </header>
  );
}
