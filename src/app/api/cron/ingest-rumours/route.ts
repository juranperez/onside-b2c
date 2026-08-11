import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { ingestRumours, ingestFromX, DEFAULT_FEEDS } from "@/lib/ingest/rumour-ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Automated rumour ingestion → review queue. CRON_SECRET-guarded. DORMANT by default:
 * set RUMOUR_INGEST_ENABLED=1 to turn on RSS candidate ingestion (after accepting the
 * source/IP terms). The X filtered-stream layer additionally needs X_API_BEARER + a
 * legal sign-off. Nothing ingested is published — it lands as a candidate for review.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (process.env.RUMOUR_INGEST_ENABLED !== "1") {
    return NextResponse.json({
      ok: true,
      enabled: false,
      reason: "set RUMOUR_INGEST_ENABLED=1 to enable RSS candidate ingestion; X streaming also needs X_API_BEARER + legal sign-off",
    });
  }
  try {
    const rss = await ingestRumours(adminDb(), DEFAULT_FEEDS);
    const x = await ingestFromX();
    return NextResponse.json({ ok: true, enabled: true, rss, x });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
