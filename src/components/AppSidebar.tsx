import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ChefHat,
  Grid3X3,
  QrCode,
  Bell,
  CalendarCheck,
  ClipboardList,
  FileText,
  Users,
  UserCheck,
  Truck,
  Wallet,
  CreditCard,
  Receipt,
  BarChart3,
  TrendingUp,
  PieChart,
  Package,
  FileBarChart,
  DollarSign,
  Settings,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pizza,
  MapPin,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SubItem {
  label: string;
  path: string;
  icon?: React.ElementType;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  subItems?: SubItem[];
}

const menuItems: MenuItem[] = [
  { label: "Panel", icon: LayoutDashboard, path: "/" },
  {
    label: "Menú",
    icon: UtensilsCrossed,
    subItems: [
      { label: "Menús", path: "/menus" },
      { label: "Elementos de menú", path: "/menu-items" },
      { label: "Categorías", path: "/categorias" },
      { label: "Modificadores", path: "/modificadores" },
      { label: "Unidades de medida", path: "/unidades" },
      { label: "Combos y Paquetes", path: "/combos" },
    ],
  },
  {
    label: "Mesas",
    icon: Grid3X3,
    subItems: [
      { label: "Áreas", path: "/areas" },
      { label: "Mesas", path: "/mesas" },
      { label: "Códigos QR", path: "/codigos-qr" },
    ],
  },
  { label: "Solicitudes", icon: Bell, path: "/solicitudes" },
  { label: "Reservaciones", icon: CalendarCheck, path: "/reservaciones" },
  {
    label: "Órdenes",
    icon: ClipboardList,
    subItems: [
      { label: "Órdenes", path: "/ordenes" },
      { label: "Facturación", path: "/facturacion" },
      { label: "Kot", path: "/kot" },
    ],
  },
  { label: "Clientes", icon: Users, path: "/clientes" },
  { label: "Personal", icon: UserCheck, path: "/personal" },
  { label: "Delivery", icon: Truck, path: "/delivery" },
  {
    label: "Gastos",
    icon: Wallet,
    subItems: [
      { label: "Gastos", path: "/gastos" },
      { label: "Categorías de gastos", path: "/categorias-gastos" },
    ],
  },
  {
    label: "Pagos",
    icon: CreditCard,
    subItems: [
      { label: "Caja", path: "/caja" },
      { label: "Pagos", path: "/pagos" },
      { label: "Debidos", path: "/debidos" },
    ],
  },
  {
    label: "Informes",
    icon: BarChart3,
    subItems: [
      { label: "Ventas", path: "/informe-ventas" },
      { label: "Artículos", path: "/informe-articulos" },
      { label: "Categorías", path: "/informe-categorias" },
      { label: "Gastos", path: "/informe-gastos" },
      { label: "Auditoría", path: "/auditoria" },
    ],
  },
  { label: "Ajustes", icon: Settings, path: "/ajustes" },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>(["Menú"]);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    );
  };

  const isActive = (path?: string) => path === location.pathname;
  const isSubActive = (subItems?: SubItem[]) =>
    subItems?.some((sub) => sub.path === location.pathname);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col",
        collapsed ? "w-[68px]" : "w-[250px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Pizza className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-sidebar-accent-foreground truncate animate-fade-in">
            GastroApp
          </span>
        )}
      </div>

      {/* Branch selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-sidebar-border shrink-0">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-sidebar-border hover:bg-sidebar-accent transition-colors text-sm">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate text-sidebar-accent-foreground">Sucursal Principal</span>
            <Star className="w-3 h-3 text-primary ml-auto shrink-0" />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = openMenus.includes(item.label);
          const active = isActive(item.path) || isSubActive(item.subItems);

          if (hasSubItems) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 shrink-0 transition-transform duration-200",
                          isOpen && "rotate-180"
                        )}
                      />
                    </>
                  )}
                </button>
                {!collapsed && isOpen && (
                  <div className="ml-4 pl-4 border-l border-sidebar-border mt-1 mb-1 space-y-0.5 animate-fade-in">
                    {item.subItems!.map((sub) => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        className={cn(
                          "block px-3 py-2 rounded-md text-sm transition-colors",
                          location.pathname === sub.path
                            ? "text-primary bg-sidebar-accent font-medium"
                            : "text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.path!}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-sidebar-border shrink-0">
          <a
            href="#"
            className="flex items-center gap-2 px-3 py-2 text-sm text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Sitio de clientes</span>
          </a>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
}
