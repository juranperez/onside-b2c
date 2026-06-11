import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { syncClubFixtures } from "@/lib/ingest/club-fixtures";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Daily club fixtures/results refresh from Sportmonks schedules. CRON_SECRET-guarded. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncClubFixtures(adminDb());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
