import { describe, expect, it } from "vitest";
import { canProcessPayment, canRefundPayment } from "@/lib/payment-guard";

describe("payment guard", () => {
  it("allows billing roles to process payments", () => {
    expect(canProcessPayment("cajero")).toBe(true);
    expect(canProcessPayment("mesero")).toBe(true);
  });

  it("restricts refunds to management-like roles", () => {
    expect(canRefundPayment("gerente")).toBe(true);
    expect(canRefundPayment("cajero")).toBe(true);
    expect(canRefundPayment("mesero")).toBe(false);
  });
});
