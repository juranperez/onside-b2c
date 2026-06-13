/**
 * Onside Pro entitlements — the single source of truth for what each tier gets.
 *
 * Principle (monetization-v1): credibility is free, personalization is paid. The
 * data layer (Wire, valuations, tables, compare, match centres) is NEVER gated —
 * it is the growth + SEO engine. Paid = Onside knowing YOU: your deals, your
 * players, your questions, first.
 *
 * NOTE ON SEQUENCING: these limits are the model, not the switch. Enforcement
 * stays OFF until the Jun-27 soft launch (see monetization-v1.md). Call sites
 * should gate behind the launch flag, not flip the instant this ships.
 */

export type Tier = "free" | "pro";

/** profiles.tier is a free-text column; treat anything that isn't "pro" as free. */
export function normalizeTier(tier: string | null | undefined): Tier {
  return tier === "pro" ? "pro" : "free";
}

export function isPro(tier: string | null | undefined): boolean {
  return normalizeTier(tier) === "pro";
}

export interface Limits {
  /** Ask Onside questions per day. */
  askPerDay: number;
  /** Tracked Wire deals (My Market). */
  trackedDeals: number;
  /** Watchlist players. */
  watchlistPlayers: number;
}

export const FREE_LIMITS: Limits = { askPerDay: 10, trackedDeals: 3, watchlistPlayers: 10 };
export const PRO_LIMITS: Limits = {
  askPerDay: Infinity,
  trackedDeals: Infinity,
  watchlistPlayers: Infinity,
};

export function limitsFor(tier: string | null | undefined): Limits {
  return isPro(tier) ? PRO_LIMITS : FREE_LIMITS;
}

/** True when `count` is already at/over the tier's limit for that quota. */
export function isOverLimit(
  tier: string | null | undefined,
  quota: keyof Limits,
  count: number,
): boolean {
  return count >= limitsFor(tier)[quota];
}
