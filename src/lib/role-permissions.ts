export type RoleName = "admin" | "gerente" | "cajero" | "mesero" | "cocina";

export type PermissionKey =
  | "restaurant-config"
  | "staff-management"
  | "billing"
  | "cash-register"
  | "menu-management"
  | "tables-management"
  | "orders-kot"
  | "reports-pnl"
  | "expenses";

export interface RoleDetail {
  key: RoleName;
  label: string;
  badgeColor: string;
  badgeBg: string;
  description: string;
  permissions: PermissionKey[];
}

export const ROLE_DETAILS: Record<RoleName, RoleDetail> = {
  admin: {
    key: "admin",
    label: "Administrador",
    badgeColor: "text-purple-600 dark:text-purple-400 border-purple-500/30",
    badgeBg: "bg-purple-500/10",
    description: "Control total del restaurante, finanzas, personal, mesas, menús y ajustes globales.",
    permissions: [
      "restaurant-config",
      "staff-management",
      "billing",
      "cash-register",
      "menu-management",
      "tables-management",
      "orders-kot",
      "reports-pnl",
      "expenses",
    ],
  },
  gerente: {
    key: "gerente",
    label: "Gerente",
    badgeColor: "text-blue-600 dark:text-blue-400 border-blue-500/30",
    badgeBg: "bg-blue-500/10",
    description: "Supervisión operativa, control de caja, gestión de personal, menús y análisis de ventas.",
    permissions: [
      "restaurant-config",
      "staff-management",
      "billing",
      "cash-register",
      "menu-management",
      "tables-management",
      "orders-kot",
      "reports-pnl",
      "expenses",
    ],
  },
  cajero: {
    key: "cajero",
    label: "Cajero",
    badgeColor: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    badgeBg: "bg-emerald-500/10",
    description: "Apertura/cierre de caja, facturación, cobro de órdenes y registro de métodos de pago.",
    permissions: ["billing", "cash-register", "orders-kot", "tables-management"],
  },
  mesero: {
    key: "mesero",
    label: "Mesero / Mozo",
    badgeColor: "text-amber-600 dark:text-amber-400 border-amber-500/30",
    badgeBg: "bg-amber-500/10",
    description: "Toma de comandas en mesas, atención de solicitudes QR y emisión de precuentas.",
    permissions: ["tables-management", "orders-kot", "billing"],
  },
  cocina: {
    key: "cocina",
    label: "Cocina / Chef",
    badgeColor: "text-rose-600 dark:text-rose-400 border-rose-500/30",
    badgeBg: "bg-rose-500/10",
    description: "Visualización de comandas en pantalla KOT, preparación y despacho de platos.",
    permissions: ["orders-kot"],
  },
};

export const PERMISSION_DEFINITIONS: { key: PermissionKey; label: string; description: string }[] = [
  {
    key: "reports-pnl",
    label: "Reportes & P&L Financiero",
    description: "Ver ganancias, costos de mercadería, ingresos y gráficos financieros",
  },
  {
    key: "restaurant-config",
    label: "Configuración del Restaurante",
    description: "Editar nombre comercial, slug, monedas e información del negocio",
  },
  {
    key: "staff-management",
    label: "Gestión de Personal & Roles",
    description: "Agregar empleados, cambiar roles y gestionar accesos",
  },
  {
    key: "menu-management",
    label: "Menús, Platos, Costos & Combos",
    description: "Crear categorías, platos, combos y configurar precios de costo/venta",
  },
  {
    key: "cash-register",
    label: "Caja y Movimientos de Dinero",
    description: "Apertura, cierre de caja diaria y registro de egresos/ingresos",
  },
  {
    key: "billing",
    label: "Facturación & Cobros",
    description: "Emitir tickets, registrar pagos en efectivo/tarjeta y cobrar cuentas",
  },
  {
    key: "tables-management",
    label: "Mesas, Salones & QR",
    description: "Gestionar mesas, cambiar estados y generar códigos QR de mesa",
  },
  {
    key: "orders-kot",
    label: "Órdenes & Pantalla de Cocina (KOT)",
    description: "Tomar pedidos y marcar platos como en preparación o listos",
  },
  {
    key: "expenses",
    label: "Gastos Operativos",
    description: "Registrar compras a proveedores, suministros y gastos fijos",
  },
];

export function canAccessPermission(role: string | null | undefined, permission: PermissionKey) {
  if (!role) return false;
  const normalized = role as RoleName;
  return ROLE_DETAILS[normalized]?.permissions.includes(permission) ?? false;
}

export function getRoleLabel(role: string | null | undefined) {
  if (!role) return "Sin rol";
  return ROLE_DETAILS[role as RoleName]?.label ?? role;
}

export function getRoleDetail(role: string | null | undefined): RoleDetail {
  if (!role || !ROLE_DETAILS[role as RoleName]) {
    return {
      key: "mesero",
      label: role || "Personal",
      badgeColor: "text-slate-600 border-slate-300",
      badgeBg: "bg-slate-100",
      description: "Miembro del equipo operativo",
      permissions: [],
    };
  }
  return ROLE_DETAILS[role as RoleName];
}
