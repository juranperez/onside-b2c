import { readDb } from "../db/server";
import { clubStyle, monogram } from "../club-style";

export interface ValueGap {
  slug: string;
  name: string;
  pos: string;
  club: string;
  clubSlug: string;
  clubBg: string;
  clubColor: string;
  clubShort: string;
  onsideM: number;
  marketM: number;
  gapM: number;
  gapPct: number;
}

interface GapRow {
  value_eur: number;
  pillar_scores: { market_value_eur?: number } | null;
  players: {
    slug: string;
    name: string;
    position: string | null;
    clubs: { name: string; slug: string; short_name: string | null } | null;
  } | null;
}

const POS_ORDER = ["GK", "DEF", "MID", "FWD"] as const;
const FORMATION: Record<string, number> = { GK: 1, DEF: 4, MID: 3, FWD: 3 }; // 4-3-3
const MIN_ONSIDE_M = 12; // keep it to notable players, not €1M long-tail blips

/**
 * The "Onside vs. the market" XI — players the model values furthest *above* their
 * reported market value, by position. Uses the market_value_eur we hold alongside
 * each Onside valuation, so it's a genuine data-driven take only Onside can write.
 */
export async function getUndervaluedXI(): Promise<{ pos: string; players: ValueGap[] }[]> {
  // Fetch the high-value pool and filter for a market anchor in JS — PostgREST
  // jsonb-key filters are fragile, and the notable gaps live among high values anyway.
  const { data } = await readDb()
    .from("player_valuations")
    .select("value_eur, pillar_scores, players!inner(slug,name,position, clubs(name,slug,short_name))")
    .order("value_eur", { ascending: false })
    .limit(1500);

  const rows = (data ?? []) as unknown as GapRow[];
  const gaps: ValueGap[] = [];
  for (const r of rows) {
    const market = r.pillar_scores?.market_value_eur;
    const p = r.players;
    if (!market || market <= 0 || !p) continue;
    const gap = r.value_eur - market;
    if (gap <= 0) continue; // only where Onside sees more than the market
    const onsideM = Math.round(r.value_eur / 1e6);
    if (onsideM < MIN_ONSIDE_M) continue;
    const style = clubStyle(p.clubs?.slug ?? p.slug);
    gaps.push({
      slug: p.slug,
      name: p.name,
      pos: p.position ?? "—",
      club: p.clubs?.name ?? "—",
      clubSlug: p.clubs?.slug ?? "",
      clubBg: style.bg,
      clubColor: style.color,
      clubShort: p.clubs?.short_name ?? monogram(p.clubs?.name ?? "FC"),
      onsideM,
      marketM: Math.round(market / 1e6),
      gapM: Math.round(gap / 1e6),
      gapPct: Math.round((gap / market) * 100),
    });
  }

  return POS_ORDER.map((pos) => ({
    pos,
    players: gaps
      .filter((g) => g.pos === pos)
      .sort((a, b) => b.gapPct - a.gapPct)
      .slice(0, FORMATION[pos]),
  }));
}
