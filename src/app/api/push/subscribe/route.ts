import { NextResponse } from "next/server";
import { createSupabaseServer, getSessionUser } from "@/lib/db/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "bad-subscription" }, { status: 400 });
  }
  const user = await getSessionUser();
  // v1: goal alerts require sign-in (RLS ties a subscription to a profile). Return a
  // clean 401 so the client can route to sign-in — never a 500 from an RLS rejection.
  if (!user) return NextResponse.json({ error: "sign-in-required" }, { status: 401 });
  const db = await createSupabaseServer();
  const { error } = await db.from("push_subscriptions").upsert(
    { profile_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, last_seen: new Date().toISOString() },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
