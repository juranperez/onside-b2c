/**
 * The Onside Pro plans, addressed by Stripe price lookup_key (so the checkout route
 * resolves the live Price at request time instead of hardcoding price_… ids). Keep
 * these lookup keys in sync with the Stripe dashboard (prices created 2026-06-13).
 */

export type PlanKey = "plus_monthly" | "plus_annual" | "pro_monthly" | "pro_annual";

export interface Plan {
  key: PlanKey;
  /** Stripe Price lookup_key. */
  lookupKey: string;
  label: string;
  amountCents: number;
  interval: "month" | "year";
}

export const PLANS: Record<PlanKey, Plan> = {
  plus_monthly: { key: "plus_monthly", lookupKey: "plus_monthly", label: "Plus Monthly", amountCents: 400, interval: "month" },
  plus_annual: { key: "plus_annual", lookupKey: "plus_annual", label: "Plus Annual", amountCents: 3600, interval: "year" },
  pro_monthly: { key: "pro_monthly", lookupKey: "pro_monthly", label: "Pro Monthly", amountCents: 2000, interval: "month" },
  pro_annual: { key: "pro_annual", lookupKey: "pro_annual", label: "Pro Annual", amountCents: 18000, interval: "year" },
};

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PLANS, value);
}
