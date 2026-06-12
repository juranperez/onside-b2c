import posthog from "posthog-js";

/**
 * Product analytics, client-side. Thin wrappers so call sites never crash when
 * the key is absent (local dev, or before the PostHog project exists).
 *
 * Event taxonomy (keep this list current — it IS the measurement plan):
 *  - signup_completed        first session after account creation
 *  - magic_link_requested    login form submitted
 *  - ask_submitted           question sent to Ask Onside
 *  - deal_tracked            Wire saga followed (props: rumourId, on)
 *  - board_subscribed        digest signup
 */
const enabled = () => Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

export function track(event: string, props?: Record<string, unknown>): void {
  try {
    if (enabled()) posthog.capture(event, props);
  } catch {
    // analytics must never break the product
  }
}

export function identify(id: string, props?: Record<string, unknown>): void {
  try {
    if (enabled()) posthog.identify(id, props);
  } catch {}
}

export function resetIdentity(): void {
  try {
    if (enabled()) posthog.reset();
  } catch {}
}
