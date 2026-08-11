import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { adminDb } from "@/lib/db/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Subscription statuses that still grant Pro access. past_due keeps access during
// Stripe's retry window; tier flips to free only on cancellation/unpaid.
const ACTIVE = new Set(["active", "trialing", "past_due"]);

/** Stripe subscription webhook → source of truth for profiles.tier. Verifies the
 *  signature, then maps subscription state onto the profile (service role). */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "billing-not-configured" }, { status: 503 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no-signature" }, { status: 400 });

  const raw = await req.text(); // raw body required for signature verification
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "bad-signature" }, { status: 400 });
  }

  const db = adminDb();

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    // current_period_end moved to the item level in recent API versions — read defensively.
    const periodEnd =
      (sub as unknown as { current_period_end?: number }).current_period_end ??
      sub.items?.data?.[0]?.current_period_end;
    await db
      .from("profiles")
      .update({
        tier: ACTIVE.has(sub.status) ? "pro" : "free",
        subscription_status: sub.status,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      })
      .eq("stripe_customer_id", customerId);
  } else if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    await db
      .from("profiles")
      .update({ tier: "free", subscription_status: "canceled" })
      .eq("stripe_customer_id", customerId);
  }

  return NextResponse.json({ received: true });
}
