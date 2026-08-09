import { describe, it, expect } from "vitest";
import { PLANS, isPlanKey } from "./plans";

describe("billing plans", () => {
  it("has exactly the three v1 plans with the published amounts", () => {
    expect(Object.keys(PLANS).sort()).toEqual(["plus_annual", "plus_monthly", "pro_annual", "pro_monthly"]);
    // Perez's prices: Plus $4/mo, Pro $20/mo, annual at -25%.
    expect(PLANS.plus_monthly.amountCents).toBe(400);
    expect(PLANS.pro_monthly.amountCents).toBe(2000);
    expect(PLANS.plus_annual.amountCents).toBe(3600);
    expect(PLANS.pro_annual.amountCents).toBe(18000);
  });

  it("each plan's lookupKey matches its Stripe lookup_key convention", () => {
    for (const [key, plan] of Object.entries(PLANS)) {
      expect(plan.lookupKey).toBe(key);
      expect(plan.key).toBe(key);
    }
  });

  it("isPlanKey accepts known plans and rejects everything else", () => {
    expect(isPlanKey("pro_monthly")).toBe(true);
    expect(isPlanKey("plus_monthly")).toBe(true);
    expect(isPlanKey("enterprise")).toBe(false);
    expect(isPlanKey("")).toBe(false);
    expect(isPlanKey(null)).toBe(false);
    expect(isPlanKey(undefined)).toBe(false);
    expect(isPlanKey(123)).toBe(false);
  });
});
