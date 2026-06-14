import { NextResponse } from "next/server";
import { getStripe } from "@/lib/billing/stripe";
import { getSessionUser } from "@/lib/db/supabase-server";
import { adminDb } from "@/lib/db/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Open the Stripe billing portal so a subscriber can manage/cancel. Auth required. */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "billing-not-configured" }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "sign-in-required" }, { status: 401 });

  const db = adminDb();
  const { data: profile } = await db
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "no-subscription" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? "https://onsidemarket.com";
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/discover`,
  });

  return NextResponse.json({ url: session.url });
}
