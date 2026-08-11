import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { syncAll, syncLeague } from "@/lib/ingest/sync";
import { LEAGUES } from "@/lib/ingest/leagues";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Incremental sync endpoint. Pass `?league=<slug>` to sync one league (fits
 * serverless time limits); no param runs the full set (use the local
 * `npm run sync` script for the authoritative bulk load). Guarded by CRON_SECRET
 * — Vercel Cron attaches `Authorization: Bearer ${CRON_SECRET}` automatically.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const slug = new URL(req.url).searchParams.get("league");
  if (slug) {
    const league = LEAGUES.find((l) => l.slug === slug);
    if (!league) return NextResponse.json({ error: "unknown league" }, { status: 404 });
    const r = await syncLeague(adminDb(), league);
    return NextResponse.json({ league: slug, ...r });
  }

  const summary = await syncAll(adminDb());
  return NextResponse.json(summary);
}
