import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { syncInjuries } from "@/lib/ingest/injuries";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Daily sidelined/injury refresh from Sportmonks. CRON_SECRET-guarded. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncInjuries(adminDb());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
