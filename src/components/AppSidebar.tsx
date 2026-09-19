import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  Bell,
  CalendarCheck,
  ClipboardList,
  Users,
  UserCheck,
  Truck,
  Wallet,
  CreditCard,
  BarChart3,
  Settings,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pizza,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RestaurantSwitcher } from "@/components/RestaurantSwitcher";
import { useAuth } from "@/contexts/useAuth";
import { canAccessPermission, getRoleDetail, type PermissionKey } from "@/lib/role-permissions";

interface SubItem {
  label: string;
  path: string;
  icon?: React.ElementType;
  permission?: PermissionKey;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  permission?: PermissionKey;
  subItems?: SubItem[];
}

const allMenuItems: MenuItem[] = [
  { label: "Panel", icon: LayoutDashboard, path: "/", permission: "reports-pnl" },
  {
    label: "Menú",
    icon: UtensilsCrossed,
    permission: "menu-management",
    subItems: [
      { label: "Menús", path: "/menus", permission: "menu-management" },
      { label: "Elementos de menú", path: "/menu-items", permission: "menu-management" },
      { label: "Categorías", path: "/categorias", permission: "menu-management" },
      { label: "Modificadores", path: "/modificadores", permission: "menu-management" },
      { label: "Unidades de medida", path: "/unidades", permission: "menu-management" },
      { label: "Combos y Paquetes", path: "/combos", permission: "menu-management" },
    ],
  },
  {
    label: "Mesas",
    icon: Grid3X3,
    permission: "tables-management",
    subItems: [
      { label: "Áreas", path: "/areas", permission: "tables-management" },
      { label: "Mesas", path: "/mesas", permission: "tables-management" },
      { label: "Códigos QR", path: "/codigos-qr", permission: "tables-management" },
    ],
  },
  { label: "Solicitudes", icon: Bell, path: "/solicitudes", permission: "tables-management" },
  { label: "Reservaciones", icon: CalendarCheck, path: "/reservaciones", permission: "tables-management" },
  {
    label: "Órdenes",
    icon: ClipboardList,
    permission: "orders-kot",
    subItems: [
      { label: "Órdenes", path: "/ordenes", permission: "orders-kot" },
      { label: "Facturación", path: "/facturacion", permission: "billing" },
      { label: "Kot", path: "/kot", permission: "orders-kot" },
    ],
  },
  { label: "Clientes", icon: Users, path: "/clientes", permission: "billing" },
  { label: "Personal", icon: UserCheck, path: "/personal", permission: "staff-management" },
  { label: "Delivery", icon: Truck, path: "/delivery", permission: "orders-kot" },
  {
    label: "Gastos",
    icon: Wallet,
    permission: "expenses",
    subItems: [
      { label: "Gastos", path: "/gastos", permission: "expenses" },
      { label: "Categorías de gastos", path: "/categorias-gastos", permission: "expenses" },
    ],
  },
  {
    label: "Pagos & Caja",
    icon: CreditCard,
    permission: "cash-register",
    subItems: [
      { label: "Caja", path: "/caja", permission: "cash-register" },
      { label: "Pagos", path: "/pagos", permission: "billing" },
      { label: "Debidos", path: "/debidos", permission: "billing" },
    ],
  },
  {
    label: "Informes",
    icon: BarChart3,
    permission: "reports-pnl",
    subItems: [
      { label: "Ganancias y Pérdidas", path: "/informe-perdidas-ganancias", permission: "reports-pnl" },
      { label: "Ventas", path: "/informe-ventas", permission: "reports-pnl" },
      { label: "Artículos", path: "/informe-articulos", permission: "reports-pnl" },
      { label: "Categorías", path: "/informe-categorias", permission: "reports-pnl" },
      { label: "Gastos", path: "/informe-gastos", permission: "reports-pnl" },
      { label: "Auditoría", path: "/auditoria", permission: "reports-pnl" },
    ],
  },
  { label: "Ajustes", icon: Settings, path: "/ajustes", permission: "restaurant-config" },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const { membership, profile } = useAuth();
  const [openMenus, setOpenMenus] = useState<string[]>(["Menú", "Pagos & Caja", "Órdenes"]);

  const userRole = membership?.role || profile?.role || "cajero";
  const roleDetail = getRoleDetail(userRole);

  // Filtrar menús según los permisos reales del rol
  const allowedMenuItems = useMemo(() => {
    return allMenuItems
      .map((item) => {
        if (item.subItems) {
          const validSubs = item.subItems.filter(
            (sub) => !sub.permission || canAccessPermission(userRole, sub.permission)
          );
          if (validSubs.length === 0) return null;
          return { ...item, subItems: validSubs };
        }
        if (item.permission && !canAccessPermission(userRole, item.permission)) {
          return null;
        }
        return item;
      })
      .filter(Boolean) as MenuItem[];
  }, [userRole]);

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
          <div className="flex flex-col truncate">
            <span className="text-base font-bold text-sidebar-accent-foreground truncate leading-tight">
              GastroFlow
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              POS & Gastronomía
            </span>
          </div>
        )}
      </div>

      {/* Selector de Restaurante */}
      {!collapsed && (
        <div className="px-3 py-2.5 border-b border-sidebar-border shrink-0">
          <RestaurantSwitcher variant="sidebar" />
          {/* Badge del Rol Activo */}
          <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/60 text-xs">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] text-muted-foreground">Rol:</span>
            <span className="text-[11px] font-semibold text-foreground capitalize">
              {roleDetail.label}
            </span>
          </div>
        </div>
      )}

      {/* Navegación Filtrada por Rol */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-thin">
        {allowedMenuItems.map((item) => {
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
                      ? "bg-sidebar-accent text-primary font-medium"
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
            <span>Menú Digital</span>
          </a>
        </div>
      )}

      {/* Botón expandir/colapsar */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
}
