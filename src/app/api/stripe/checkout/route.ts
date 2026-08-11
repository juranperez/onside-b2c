import { NextResponse } from "next/server";
import { getStripe } from "@/lib/billing/stripe";
import { isPlanKey, PLANS } from "@/lib/billing/plans";
import { getSessionUser } from "@/lib/db/supabase-server";
import { adminDb } from "@/lib/db/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create a Stripe Checkout Session for a Pro plan. Auth required; resolves the live
 *  Price by lookup_key; reuses (or creates + stores) the customer's stripe id. */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "billing-not-configured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const plan = body?.plan;
  if (!isPlanKey(plan)) return NextResponse.json({ error: "bad-plan" }, { status: 400 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "sign-in-required" }, { status: 401 });

  const db = adminDb();
  const { data: profile } = await db
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { profile_id: user.id },
    });
    customerId = customer.id;
    await db.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  // Resolve the live Price by lookup_key so we never hardcode price_… ids.
  const prices = await stripe.prices.list({
    lookup_keys: [PLANS[plan].lookupKey],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) return NextResponse.json({ error: "price-not-found" }, { status: 500 });

  const origin = req.headers.get("origin") ?? "https://onsidemarket.com";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: price.id, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: user.id,
    subscription_data: { metadata: { profile_id: user.id } },
    success_url: `${origin}/discover?upgraded=1`,
    cancel_url: `${origin}/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
