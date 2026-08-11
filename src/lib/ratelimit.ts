/**
 * In-memory fixed-window rate limiter. Per serverless instance — a warm lambda
 * shares the map across requests, a cold start resets it. Good enough as a
 * burst guard for auth-gated endpoints; durable per-user quotas can move to
 * Postgres if abuse shows up in practice.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const SWEEP_AT = 5_000; // entries; sweep expired buckets when the map grows past this

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, max: number, windowMs: number, now: number = Date.now()): RateResult {
  if (buckets.size > SWEEP_AT) {
    for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfterSec: 0 };
  }
  if (b.count >= max) {
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true, remaining: max - b.count, retryAfterSec: 0 };
}

/** Test hook — clears all buckets. */
export function resetRateLimits() {
  buckets.clear();
}
