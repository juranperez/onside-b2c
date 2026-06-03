import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { syncWcFixtures } from "@/lib/ingest/wc-fixtures";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Refreshes the World Cup schedule + live scores from API-Football into `fixtures`.
 * Guarded by CRON_SECRET (Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`).
 * Wire a cron in vercel.json (e.g. every 5 min during the tournament window).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncWcFixtures(adminDb());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
