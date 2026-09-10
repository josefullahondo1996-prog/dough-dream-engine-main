import { describe, expect, it } from "vitest";
import { canAccessPermission, getRoleLabel } from "@/lib/role-permissions";

describe("role permissions", () => {
  it("allows admins and managers to manage settings", () => {
    expect(canAccessPermission("admin", "restaurant-config")).toBe(true);
    expect(canAccessPermission("gerente", "restaurant-config")).toBe(true);
  });

  it("blocks non-manager roles from sensitive configuration", () => {
    expect(canAccessPermission("cajero", "restaurant-config")).toBe(false);
    expect(canAccessPermission("mesero", "staff-management")).toBe(false);
  });

  it("returns a human readable label", () => {
    expect(getRoleLabel("cocina")).toBe("Cocina");
  });
});
