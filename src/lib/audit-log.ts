export type AuditAction =
  | "cash-open"
  | "cash-close"
  | "payment"
  | "payment-refund"
  | "role-change"
  | "settings-update";

export interface AuditLogEntry {
  id: string;
  restaurantId: string;
  userId: string;
  userName: string;
  role: string;
  action: AuditAction;
  details: string;
  createdAt: string;
}

const auditStore = new Map<string, AuditLogEntry[]>();

export function appendAuditLog(input: {
  restaurantId: string;
  userId: string;
  userName: string;
  role: string;
  action: AuditAction;
  details: string;
}) {
  const entry: AuditLogEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    restaurantId: input.restaurantId,
    userId: input.userId,
    userName: input.userName,
    role: input.role,
    action: input.action,
    details: input.details,
    createdAt: new Date().toISOString(),
  };

  const existing = auditStore.get(input.restaurantId) ?? [];
  auditStore.set(input.restaurantId, [entry, ...existing]);
  return entry;
}

export function getAuditLog(restaurantId: string) {
  return auditStore.get(restaurantId) ?? [];
}
