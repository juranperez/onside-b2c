/**
 * The Onside Pro plans, addressed by Stripe price lookup_key (so the checkout route
 * resolves the live Price at request time instead of hardcoding price_… ids). Keep
 * these lookup keys in sync with the Stripe dashboard (prices created 2026-06-13).
 */

export type PlanKey = "pro_monthly" | "pro_annual" | "founding_annual";

export interface Plan {
  key: PlanKey;
  /** Stripe Price lookup_key. */
  lookupKey: string;
  label: string;
  amountCents: number;
  interval: "month" | "year";
}

export const PLANS: Record<PlanKey, Plan> = {
  pro_monthly: {
    key: "pro_monthly",
    lookupKey: "pro_monthly",
    label: "Pro Monthly",
    amountCents: 599,
    interval: "month",
  },
  pro_annual: {
    key: "pro_annual",
    lookupKey: "pro_annual",
    label: "Pro Annual",
    amountCents: 4900,
    interval: "year",
  },
  founding_annual: {
    key: "founding_annual",
    lookupKey: "founding_annual",
    label: "Founding Annual",
    amountCents: 3900,
    interval: "year",
  },
};

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PLANS, value);
}
