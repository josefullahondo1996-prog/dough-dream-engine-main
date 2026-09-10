import { Bell, Maximize2, Search, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/useAuth";

interface TopBarProps {
  collapsed: boolean;
}

export default function TopBar({ collapsed }: TopBarProps) {
  const { profile, user, restaurant, signOut } = useAuth();

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
        <button className="relative p-2.5 rounded-lg hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-success text-success-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            0
          </span>
        </button>

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
