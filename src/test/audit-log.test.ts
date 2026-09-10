import { describe, expect, it } from "vitest";
import { appendAuditLog, getAuditLog } from "@/lib/audit-log";

describe("audit log", () => {
  it("stores entries with actor and timestamp for a restaurant", () => {
    const restaurantId = "restaurant-audit";

    const entry = appendAuditLog({
      restaurantId,
      userId: "user-1",
      userName: "Ana",
      role: "admin",
      action: "cash-close",
      details: "Caja cerrada con comprobación final",
    });

    expect(entry.action).toBe("cash-close");
    expect(entry.userName).toBe("Ana");
    expect(entry.createdAt).toBeTruthy();

    const logs = getAuditLog(restaurantId);
    expect(logs.length).toBeGreaterThan(0);
  });
});
