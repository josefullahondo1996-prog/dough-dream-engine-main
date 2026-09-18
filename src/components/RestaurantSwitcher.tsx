import { useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Plus,
  Store,
  Sparkles,
  Loader2,
  Utensils,
  Pizza,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const businessTypes = [
  { label: "Pizzería", icon: "🍕" },
  { label: "Hamburguesería", icon: "🍔" },
  { label: "Bar / Cervecería", icon: "🍹" },
  { label: "Cafetería / Bakery", icon: "☕" },
  { label: "Sushi & Nikkei", icon: "🍣" },
  { label: "Restaurante General", icon: "🍽️" },
  { label: "Fast Food", icon: "🍟" },
  { label: "Heladería / Postres", icon: "🍦" },
];

interface RestaurantSwitcherProps {
  variant?: "topbar" | "sidebar";
  className?: string;
}

export function RestaurantSwitcher({ variant = "topbar", className }: RestaurantSwitcherProps) {
  const { restaurant, restaurants, userMemberships, switchRestaurant, createRestaurant } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRestName, setNewRestName] = useState("");
  const [selectedType, setSelectedType] = useState("Pizzería");
  const [isCreating, setIsCreating] = useState(false);

  const activeMembership = userMemberships.find((m) => m.restaurant_id === restaurant?.id);

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestName.trim()) {
      toast.error("Ingresa el nombre de la empresa gastronómica");
      return;
    }

    try {
      setIsCreating(true);
      const fullName = `${newRestName.trim()}`;
      await createRestaurant(fullName);
      toast.success(`¡Empresa "${newRestName}" registrada con éxito!`);
      setNewRestName("");
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "No se pudo registrar la empresa");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectRestaurant = async (id: string, name: string) => {
    if (id === restaurant?.id) return;
    try {
      await switchRestaurant(id);
      toast.success(`Cambiando a "${name}"...`);
    } catch {
      toast.error("Error al cambiar de empresa");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === "sidebar" ? (
            <button
              className={cn(
                "w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/50 hover:bg-sidebar-accent transition-all text-sm group text-left",
                className
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                  <Store className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sidebar-accent-foreground text-xs leading-tight">
                    {restaurant?.name || "Seleccionar Empresa"}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize leading-tight mt-0.5">
                    {activeMembership?.role || "Admin"} · {restaurants.length > 1 ? `${restaurants.length} empresas` : "Sucursal"}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
            </button>
          ) : (
            <button
              className={cn(
                "flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-border bg-card/80 hover:bg-secondary/80 transition-all text-sm shadow-sm",
                className
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground text-xs truncate max-w-[150px]">
                    {restaurant?.name || "Empresa Gastronómica"}
                  </span>
                  {restaurants.length > 1 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                      {restaurants.length}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground capitalize leading-none mt-0.5">
                  Rol: {activeMembership?.role || "Admin"}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align={variant === "sidebar" ? "start" : "end"} className="w-72 p-2">
          <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground font-semibold flex items-center justify-between">
            <span>EMPRESAS GASTRONÓMICAS</span>
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-normal text-foreground">
              {restaurants.length} {restaurants.length === 1 ? "registrada" : "registradas"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="max-h-60 overflow-y-auto space-y-1">
            {restaurants.map((rest) => {
              const isSelected = rest.id === restaurant?.id;
              const mem = userMemberships.find((m) => m.restaurant_id === rest.id);

              return (
                <DropdownMenuItem
                  key={rest.id}
                  onClick={() => handleSelectRestaurant(rest.id, rest.name)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                    isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-bold",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {rest.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs truncate font-medium text-foreground">{rest.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {mem?.role || "Miembro"}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator className="my-1.5" />

          <DropdownMenuItem
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 p-2 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg cursor-pointer focus:bg-orange-500/20"
          >
            <Plus className="w-4 h-4 text-orange-500" />
            <span>+ Registrar Nueva Empresa / Sucursal</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* MODAL PARA REGISTRAR NUEVA EMPRESA */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleCreateRestaurant}>
            <DialogHeader>
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mb-2">
                <Store className="w-5 h-5 text-orange-500" />
              </div>
              <DialogTitle className="text-lg font-bold">Registrar Nueva Empresa Gastronómica</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Crea un espacio independiente con su propio menú, inventario, mesas, pedidos en vivo y reportes financieros (P&L).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Tipo de negocio chips */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Tipo de Establecimiento
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {businessTypes.map((item) => {
                    const isPicked = selectedType === item.label;
                    return (
                      <button
                        type="button"
                        key={item.label}
                        onClick={() => setSelectedType(item.label)}
                        className={cn(
                          "flex items-center gap-1.5 p-2 rounded-lg border text-xs transition-all text-left",
                          isPicked
                            ? "border-orange-500 bg-orange-500/10 text-foreground font-semibold shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nombre de la empresa */}
              <div className="space-y-1.5">
                <label htmlFor="rest-name" className="text-xs font-semibold text-foreground">
                  Nombre de la Empresa / Restaurante *
                </label>
                <input
                  id="rest-name"
                  required
                  placeholder={`Ej: ${selectedType} Don Giovanni`}
                  value={newRestName}
                  onChange={(e) => setNewRestName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Mini callout explicativo */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground">
                <Sparkles className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p>
                  Esta empresa funcionará de manera 100% aislada. Tú serás el Administrador y podrás invitar a tu personal o gestionar tus sucursales con 1 clic.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreating || !newRestName.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creando empresa...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5" /> Registrar y Entrar
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
