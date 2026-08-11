import { NextResponse } from "next/server";
import { searchAll } from "@/lib/queries";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** JSON search for the ⌘K palette — same accent-insensitive search the site uses. */
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const gate = rateLimit(`search:${ip}`, 30, 60_000);
  if (!gate.ok) return NextResponse.json({ error: "rate-limited" }, { status: 429 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ players: [], clubs: [], leagues: [] });

  try {
    const r = await searchAll(q);
    return NextResponse.json({
      players: r.players.slice(0, 6).map((p) => ({ slug: p.slug, name: p.displayName, sub: `${p.club} · €${Math.round(p.val)}M` })),
      clubs: r.clubs.slice(0, 4).map((c) => ({ slug: c.slug, name: c.name, sub: c.league ?? "" })),
      leagues: r.leagues.slice(0, 3).map((l) => ({ slug: l.slug, name: l.name, sub: l.country ?? "" })),
    });
  } catch {
    return NextResponse.json({ players: [], clubs: [], leagues: [] });
  }
}
