import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
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
    const result = await generateNews(adminDb());
    // Public reads go through the Next Data Cache (30-min window in readDb, which
    // exists to protect the Supabase egress quota). Without an explicit purge a
    // fresh briefing stays invisible for up to half an hour — unacceptable for a
    // news surface. Purge only when content actually changed, so the safeguard
    // still holds during quiet runs.
    // "seconds" = the shortest stale window (30s), so a new briefing is visible
    // almost immediately. This is a one-shot purge, not a standing policy, so it
    // costs nothing between publishing runs.
    if (result.published > 0 || result.corrected > 0) revalidateTag("supabase-read", "seconds");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
