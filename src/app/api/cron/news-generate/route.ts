import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { generateNews } from "@/lib/news/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (process.env.NEWS_ENGINE_ENABLED !== "1") {
    return NextResponse.json({ ok: true, disabled: true, reason: "set NEWS_ENGINE_ENABLED=1 to publish briefings" });
  }
  try {
    return NextResponse.json({ ok: true, ...(await generateNews(adminDb())) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
