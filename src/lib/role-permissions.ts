export type RoleName = "admin" | "gerente" | "cajero" | "mesero" | "cocina";
export type PermissionKey =
  | "restaurant-config"
  | "staff-management"
  | "billing"
  | "cash-register"
  | "menu-management"
  | "reports";

const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  admin: [
    "restaurant-config",
    "staff-management",
    "billing",
    "cash-register",
    "menu-management",
    "reports",
  ],
  gerente: [
    "restaurant-config",
    "staff-management",
    "billing",
    "cash-register",
    "menu-management",
    "reports",
  ],
  cajero: ["billing", "cash-register", "reports"],
  mesero: ["billing"],
  cocina: [],
};

const ROLE_LABELS: Record<RoleName, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  cajero: "Cajero",
  mesero: "Mesero",
  cocina: "Cocina",
};

export function canAccessPermission(role: string | null | undefined, permission: PermissionKey) {
  if (!role) return false;
  const normalized = role as RoleName;
  return ROLE_PERMISSIONS[normalized]?.includes(permission) ?? false;
}

export function getRoleLabel(role: string | null | undefined) {
  if (!role) return "Sin rol";
  return ROLE_LABELS[role as RoleName] ?? role;
}
