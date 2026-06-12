import { NextResponse } from "next/server";
import { readDb } from "@/lib/db/server";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Tiny live-state probe for the match centre ticker — score + status only. */
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`mstate:${ip}`, 60, 60_000).ok) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "missing-id" }, { status: 400 });

  const db = readDb();
  if (id.startsWith("wc2026-")) {
    const { data } = await db.from("fixtures").select("status,score_home,score_away").eq("id", id).maybeSingle();
    if (!data) return NextResponse.json({ error: "not-found" }, { status: 404 });
    return NextResponse.json(
      { status: data.status ?? "scheduled", scoreHome: data.score_home, scoreAway: data.score_away },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const { data } = await db.from("club_fixtures").select("status,score_home,score_away").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "not-found" }, { status: 404 });
  return NextResponse.json(
    { status: data.status, scoreHome: data.score_home, scoreAway: data.score_away },
    { headers: { "Cache-Control": "no-store" } },
  );
}
