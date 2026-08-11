"use client";

import type { PlanKey } from "./plans";

/**
 * Start a Stripe Checkout for the given plan: POST to our route, then redirect to
 * Stripe's hosted checkout. Signed-out users are routed to login first (then back
 * to /pricing). No-ops quietly if billing isn't configured server-side.
 */
export async function startCheckout(plan: PlanKey): Promise<void> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  if (res.status === 401) {
    window.location.href = "/login?next=/pricing";
    return;
  }
  const data = (await res.json().catch(() => null)) as { url?: string } | null;
  if (data?.url) window.location.href = data.url;
}
