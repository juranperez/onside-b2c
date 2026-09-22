import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { watchBreaks } from "@/lib/ingest/romano-watch";

export const dynamic = "force-dynamic";
// Cost control (Sep 2026): at 1-minute cadence with a 60s ceiling this timed out
// ~340x/day and was billed the full 60s each time. Now every 15 min, 25s ceiling.
export const maxDuration = 25;

/**
 * Polls Fabrizio Romano's feed (via the X-mirror) once and acts on any new
 * "Here We Go". Guarded by CRON_SECRET. Cadence is set in vercel.json (15 min —
 * reduced from 1 min for cost; restore only with a hard duration budget).
 * RUMOUR_WATCH_ENABLED gates it so it ships dark and is turned on by env without a redeploy.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (process.env.RUMOUR_WATCH_ENABLED !== "1") {
    return NextResponse.json({ ok: true, disabled: true });
  }
  try {
    const result = await watchBreaks(adminDb());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
