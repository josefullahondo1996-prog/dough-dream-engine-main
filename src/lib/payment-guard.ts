import { canAccessPermission } from "@/lib/role-permissions";

export function canProcessPayment(role: string | null | undefined) {
  return canAccessPermission(role, "billing") || canAccessPermission(role, "cash-register");
}

export function canRefundPayment(role: string | null | undefined) {
  return role === "admin" || role === "gerente" || role === "cajero";
}
