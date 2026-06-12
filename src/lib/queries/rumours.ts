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
  lastUpdate: string;
  url: string | null;
  player: {
    id: string;
    slug: string;
    name: string;
    photoUrl: string | null;
    pos: string;
    fromClub: string;
    clubBg: string;
    clubColor: string;
    clubShort: string;
  };
  league: string | null; // player's current league
  leagueSlug: string | null;
  confidence: ConfidenceResult;
}

const RUMOUR_SELECT =
  "id,to_club,reported_fee_eur,status,summary,primary_source,source_tier,corroborations,first_seen,last_update,url, players(id,slug,name,known_as,photo_url,position,contract_until, clubs(name,short_name,slug, leagues(name,slug)), player_valuations(value_eur))";

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
  last_update: string | null;
  url: string | null;
  players: {
    id: string;
    slug: string;
    name: string;
    known_as: string | null;
    photo_url: string | null;
    position: string | null;
    contract_until: number | null;
    clubs: { name: string; short_name: string | null; slug: string; leagues: { name: string; slug: string } | null } | null;
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
    summary: r.summary,
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
    lastUpdate: r.last_update ?? r.first_seen,
    url: r.url,
    league: r.players?.clubs?.leagues?.name ?? null,
    leagueSlug: r.players?.clubs?.leagues?.slug ?? null,
    player: {
      id: p.id,
      slug: p.slug,
      name: p.known_as ?? p.name,
      photoUrl: p.photo_url ?? null,
      pos: p.position ?? "—",
      fromClub: p.clubs?.name ?? "Free agent",
      clubBg: style.bg,
      clubColor: style.color,
      clubShort: p.clubs?.short_name ?? monogram(p.clubs?.name ?? "FC"),
    },
    confidence: conf,
  };
}

export interface WireFilters {
  status?: "rumour" | "confirmed" | "dead";
  league?: string; // league slug
  club?: string; // free text — matches the player's club OR the destination
  credibleOnly?: boolean; // confidence ≥ 70 (confirmed always passes)
}

const foldLite = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Pure filter for the Wire — applied post-compute because confidence is read-time. */
export function filterWire(items: RumourItem[], filters: WireFilters): RumourItem[] {
  return items.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (filters.league && r.leagueSlug !== filters.league) return false;
    if (filters.club) {
      const needle = foldLite(filters.club);
      const hay = `${foldLite(r.player.fromClub)} ${foldLite(r.toClub)}`;
      if (!hay.includes(needle)) return false;
    }
    if (filters.credibleOnly && r.status === "rumour" && r.confidence.pct < 70) return false;
    return true;
  });
}

/** The Wire: newest-first feed with URL-driven filters. */
export async function getWire(filters: WireFilters = {}, limit = 100): Promise<RumourItem[]> {
  return filterWire(await getRumours(limit), filters);
}

/** Comment counts per rumour id — one cheap scan while volumes are small. */
export async function getCommentCounts(): Promise<Map<string, number>> {
  const { data } = await readDb().from("rumour_comments").select("rumour_id").limit(5000);
  const counts = new Map<string, number>();
  for (const c of data ?? []) counts.set(c.rumour_id, (counts.get(c.rumour_id) ?? 0) + 1);
  return counts;
}

/** Live rumour feed, newest first. Excludes unreviewed ingestion candidates. */
export async function getRumours(limit = 60): Promise<RumourItem[]> {
  const { data, error } = await readDb()
    .from("rumours")
    .select(RUMOUR_SELECT)
    .neq("status", "candidate")
    .order("last_update", { ascending: false })
    .limit(limit);
  if (error) return [];
  const now = new Date();
  return (data ?? [])
    .map((r) => toItem(r as unknown as RumourRow, now))
    .filter((x): x is RumourItem => x !== null);
}

/** Unreviewed ingestion candidates (for the curation queue). */
export async function getCandidates(limit = 50): Promise<RumourItem[]> {
  const { data } = await readDb()
    .from("rumours")
    .select(RUMOUR_SELECT)
    .eq("status", "candidate")
    .order("first_seen", { ascending: false })
    .limit(limit);
  const now = new Date();
  return (data ?? [])
    .map((r) => toItem(r as unknown as RumourRow, now))
    .filter((x): x is RumourItem => x !== null);
}

/** A single rumour by id (for the detail page). */
export async function getRumourById(id: string): Promise<RumourItem | null> {
  const { data } = await readDb().from("rumours").select(RUMOUR_SELECT).eq("id", id).neq("status", "candidate").maybeSingle();
  if (!data) return null;
  return toItem(data as unknown as RumourRow, new Date());
}

export interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  author: string;
}

/** Discussion thread for a rumour. */
export async function getRumourComments(rumourId: string): Promise<CommentItem[]> {
  const { data } = await readDb()
    .from("rumour_comments")
    .select("id,body,created_at,author_name")
    .eq("rumour_id", rumourId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.created_at,
    author: c.author_name || "Member",
  }));
}

/** Active rumours involving one player (for the profile "rumour status" strip). */
export async function getRumoursForPlayer(playerId: string): Promise<RumourItem[]> {
  const { data } = await readDb()
    .from("rumours")
    .select(RUMOUR_SELECT)
    .eq("player_id", playerId)
    .neq("status", "candidate")
    .order("last_update", { ascending: false });
  const now = new Date();
  return (data ?? [])
    .map((r) => toItem(r as unknown as RumourRow, now))
    .filter((x): x is RumourItem => x !== null);
}
