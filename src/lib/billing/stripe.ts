import Stripe from "stripe";

let cached: Stripe | null = null;

/**
 * Lazy server-side Stripe client. Returns null when STRIPE_SECRET_KEY is unset so
 * routes can 503 gracefully instead of throwing at import time — the same dormant-
 * until-configured pattern as the LLM and push providers. Never import this from a
 * client component (it reads the secret key).
 */
export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cached = new Stripe(key);
  return cached;
}
