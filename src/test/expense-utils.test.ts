import { describe, expect, it } from "vitest";
import { formatCurrency, sumExpenses } from "@/lib/expense-utils";

describe("expense utils", () => {
  it("sums expense amounts across entries", () => {
    expect(
      sumExpenses([
        { amount: 125.5 },
        { amount: 45 },
        { amount: 12.75 },
      ])
    ).toBe(183.25);
  });

  it("formats a value as locale currency", () => {
    expect(formatCurrency(125.5)).toContain("125,5");
  });
});
