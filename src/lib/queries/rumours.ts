import { readDb } from "../db/server";
import { liveValue } from "../valuation/pulse";
import { clubStyle, monogram } from "../club-style";
import { confidence, type ConfidenceResult, type RumourStatus } from "../rumours/confidence";

export interface RumourItem {
  id: string;
  status: RumourStatus;
  summary: string;
  source: string;
  sourceTier: number;
  corroborations: number;
  toClub: string;
  reportedFeeM: number | null; // millions
  onsideValueM: number; // millions (live)
  firstSeen: string;
  url: string | null;
  player: {
    id: string;
    slug: string;
    name: string;
    pos: string;
    fromClub: string;
    clubBg: string;
    clubColor: string;
    clubShort: string;
  };
  confidence: ConfidenceResult;
}

const RUMOUR_SELECT =
  "id,to_club,reported_fee_eur,status,summary,primary_source,source_tier,corroborations,first_seen,url, players(id,slug,name,position,contract_until, clubs(name,short_name,slug), player_valuations(value_eur))";

interface RumourRow {
  id: string;
  to_club: string;
  reported_fee_eur: number | null;
  status: string;
  summary: string;
  primary_source: string;
  source_tier: number;
  corroborations: number;
  first_seen: string;
  url: string | null;
  players: {
    id: string;
    slug: string;
    name: string;
    position: string | null;
    contract_until: number | null;
    clubs: { name: string; short_name: string | null; slug: string } | null;
    player_valuations: { value_eur: number } | null;
  } | null;
}

function toItem(r: RumourRow, now: Date): RumourItem | null {
  const p = r.players;
  if (!p) return null;
  const anchor = p.player_valuations?.value_eur ?? 0;
  const value = liveValue(anchor, p.id, now);
  const style = clubStyle(p.clubs?.slug ?? p.id);
  const conf = confidence({
    status: r.status as RumourStatus,
    sourceTier: r.source_tier,
    corroborations: r.corroborations,
    reportedFeeEur: r.reported_fee_eur,
    onsideValueEur: value,
    contractUntil: p.contract_until,
    firstSeen: new Date(r.first_seen),
    now,
  });
  return {
    id: r.id,
    status: (r.status as RumourStatus) ?? "rumour",
    summary: r.summary,
    source: r.primary_source,
    sourceTier: r.source_tier,
    corroborations: r.corroborations,
    toClub: r.to_club,
    reportedFeeM: r.reported_fee_eur != null ? Math.round(r.reported_fee_eur / 1e6) : null,
    onsideValueM: Math.round(value / 1e6),
    firstSeen: r.first_seen,
    url: r.url,
    player: {
      id: p.id,
      slug: p.slug,
      name: p.name,
      pos: p.position ?? "—",
      fromClub: p.clubs?.name ?? "Free agent",
      clubBg: style.bg,
      clubColor: style.color,
      clubShort: p.clubs?.short_name ?? monogram(p.clubs?.name ?? "FC"),
    },
    confidence: conf,
  };
}

/** Live rumour feed, newest first. */
export async function getRumours(limit = 60): Promise<RumourItem[]> {
  const { data, error } = await readDb()
    .from("rumours")
    .select(RUMOUR_SELECT)
    .order("last_update", { ascending: false })
    .limit(limit);
  if (error) return [];
  const now = new Date();
  return (data ?? [])
    .map((r) => toItem(r as unknown as RumourRow, now))
    .filter((x): x is RumourItem => x !== null);
}

/** Active rumours involving one player (for the profile "rumour status" strip). */
export async function getRumoursForPlayer(playerId: string): Promise<RumourItem[]> {
  const { data } = await readDb()
    .from("rumours")
    .select(RUMOUR_SELECT)
    .eq("player_id", playerId)
    .order("last_update", { ascending: false });
  const now = new Date();
  return (data ?? [])
    .map((r) => toItem(r as unknown as RumourRow, now))
    .filter((x): x is RumourItem => x !== null);
}
