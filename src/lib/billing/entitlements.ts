/**
 * Tier entitlements — the single source of truth for what each tier gets.
 *
 * Principle: credibility is free, personalisation is paid. The data layer (Wire,
 * valuations, tables, compare, match centres) is NEVER gated — it is the growth
 * and SEO engine. Paid buys depth: your deals, your players, your questions.
 *
 * These numbers must match what /pricing advertises. If they drift, the page is
 * lying about what the money buys.
 */

export type Tier = "free" | "plus" | "pro";

/** profiles.tier is free text; anything unrecognised is treated as free. */
export function normalizeTier(tier: string | null | undefined): Tier {
  return tier === "pro" ? "pro" : tier === "plus" ? "plus" : "free";
}

export function isPaid(tier: string | null | undefined): boolean {
  return normalizeTier(tier) !== "free";
}

export interface Limits {
  /** Ask Onside questions per day. */
  askPerDay: number;
  /** Tracked Wire deals (My Market). */
  trackedDeals: number;
  /** Watchlist players. */
  watchlistPlayers: number;
}

/** Free: everything readable, personalisation capped. */
export const FREE_LIMITS: Limits = { askPerDay: 10, trackedDeals: 3, watchlistPlayers: 10 };
/** Plus ($4): unlimited personalisation, Ask still capped — that is Pro's headline. */
export const PLUS_LIMITS: Limits = { askPerDay: 10, trackedDeals: Infinity, watchlistPlayers: Infinity };
/** Pro ($20): unlimited, subject only to the anti-abuse ceiling in the Ask route. */
export const PRO_LIMITS: Limits = { askPerDay: Infinity, trackedDeals: Infinity, watchlistPlayers: Infinity };

const BY_TIER: Record<Tier, Limits> = { free: FREE_LIMITS, plus: PLUS_LIMITS, pro: PRO_LIMITS };

export function limitsFor(tier: string | null | undefined): Limits {
  return BY_TIER[normalizeTier(tier)];
}

/** True when `count` is already at/over the tier's limit for that quota. */
export function isOverLimit(tier: string | null | undefined, quota: keyof Limits, count: number): boolean {
  return count >= limitsFor(tier)[quota];
}

/**
 * Enforcement switch.
 *
 * Deliberately OFF by default: limits without a way to pay are a dead end, and
 * billing is still dormant. Flip ENTITLEMENTS_ENABLED=1 in the same change that
 * opens checkout, never before — otherwise a user hits a wall with no door.
 */
export function enforcementEnabled(): boolean {
  return process.env.ENTITLEMENTS_ENABLED === "1";
}

/** The upgrade prompt shown when a limit bites. Copy lives here so it stays consistent. */
export function limitMessage(quota: keyof Limits, tier: Tier): string {
  const l = limitsFor(tier);
  if (quota === "watchlistPlayers") return `Free covers ${l.watchlistPlayers} watched players. Go Plus for unlimited.`;
  if (quota === "trackedDeals") return `Free covers ${l.trackedDeals} tracked deals. Go Plus for unlimited.`;
  return `That's your ${l.askPerDay} questions for today. Go Pro for unlimited.`;
}
