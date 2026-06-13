import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { detectAndPushGoals } from "@/lib/ingest/wc-goals";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (process.env.GOAL_PUSH_ENABLED !== "1") return NextResponse.json({ ok: true, disabled: true });
  try {
    return NextResponse.json({ ok: true, ...(await detectAndPushGoals(adminDb())) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
