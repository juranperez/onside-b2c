import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { syncOfficialTransfers } from "@/lib/ingest/official-transfers";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Official confirmed transfers from Sportmonks → transfers table + Wire reflection.
 * Daily via Vercel Cron; CRON_SECRET-guarded like the other cron routes.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncOfficialTransfers(adminDb());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
