import { Search, ShoppingCart, User, Bell, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/useAuth";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RestaurantSwitcher } from "@/components/RestaurantSwitcher";

interface TopBarProps {
  collapsed: boolean;
}

const requestLabels: Record<string, string> = {
  camarero: "Llamar al camarero",
  cuenta: "Solicitar la cuenta",
  ayuda: "Solicitar ayuda",
};

export default function TopBar({ collapsed }: TopBarProps) {
  const { profile, user, restaurant, signOut } = useAuth();
  const { data: notifications = [] } = useServiceRequests();
  const { playNotificationSound } = useNotificationSound();
  
  // Activa las suscripciones en tiempo real
  useRealtimeNotifications();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-card border-b border-border flex items-center justify-between px-6 transition-all duration-300 shadow-card",
        collapsed ? "left-[68px]" : "left-[250px]"
      )}
    >
      {/* Left: Search & Test */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-2 text-sm bg-secondary rounded-lg border-none outline-none focus:ring-2 focus:ring-primary/30 w-64 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <button 
          onClick={playNotificationSound}
          className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-lg font-medium hover:bg-primary/30 transition-colors"
          title="Botón temporal para probar el sonido"
        >
          Probar Sonido
        </button>
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

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label="Abrir solicitudes"
              className="relative rounded-lg p-2.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {notifications.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px] font-bold text-success-foreground">
                  {notifications.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="end">
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
            <a href="/solicitudes" className="mt-2 block rounded-lg bg-secondary px-3 py-2 text-center text-xs font-medium text-secondary-foreground hover:bg-secondary/80">
              Ver todas las solicitudes
            </a>
          </PopoverContent>
        </Popover>

        {/* Fullscreen */}
        <button className="p-2.5 rounded-lg hover:bg-secondary transition-colors hidden md:flex">
          <Maximize2 className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Restaurant Switcher */}
        <RestaurantSwitcher variant="topbar" />

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
