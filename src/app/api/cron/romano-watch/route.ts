import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { watchRomano } from "@/lib/ingest/romano-watch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Polls Fabrizio Romano's feed (via the X-mirror) once and acts on any new
 * "Here We Go". Guarded by CRON_SECRET. Armed at 1-minute cadence in vercel.json
 * (the ≤60s latency ceiling — Vercel cron floors at 1/min). RUMOUR_WATCH_ENABLED
 * gates it so it ships dark and is turned on by env without a redeploy.
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
    const result = await watchRomano(adminDb());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
