import { readDb } from "../db/server";
import { liveValue } from "../valuation/pulse";
import { clubStyle, monogram } from "../club-style";
import { confidence, type ConfidenceResult, type RumourStatus } from "../rumours/confidence";
import { stageOf, type DealStage } from "../rumours/stage";
import { feeVerdict } from "../rumours/fee-verdict";
import { dedupeSagas } from "./dedupe";

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

export type WireSort = "new" | "conf" | "fee" | "value";
export type FeeVerdictKey = "bargain" | "fair" | "above" | "overpay";

export interface WireFilters {
  status?: "rumour" | "confirmed" | "dead";
  /** Deal stage, derived from the latest report's wording. */
  stage?: DealStage;
  league?: string; // league slug
  club?: string; // free text — matches the player's club OR the destination
  credibleOnly?: boolean; // confidence ≥ 70 (confirmed always passes)
  /** Minimum Onside Confidence % (confirmed deals always pass). */
  minConfidence?: number;
  /** Minimum reported fee in €M. Deals with no reported fee are excluded. */
  minFeeM?: number;
  /** Our fee-vs-value read — the filter no rival can offer. */
  verdict?: FeeVerdictKey;
}

/** Map a fee-vs-value verdict label onto its filter key. */
export function verdictKey(feeM: number | null, valueM: number): FeeVerdictKey | null {
  const v = feeVerdict(feeM, valueM);
  if (!v) return null;
  if (v.label.startsWith("Free")) return "bargain";
  if (v.label.startsWith("Fair")) return "fair";
  if (v.label.startsWith("Above")) return "above";
  return "overpay";
}

const foldLite = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Pure filter for the Wire — applied post-compute because confidence is read-time. */
export function filterWire(items: RumourItem[], filters: WireFilters): RumourItem[] {
  return items.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (filters.stage && stageOf(r.summary, r.status) !== filters.stage) return false;
    if (filters.league && r.leagueSlug !== filters.league) return false;
    if (filters.club) {
      const needle = foldLite(filters.club);
      const hay = `${foldLite(r.player.fromClub)} ${foldLite(r.toClub)}`;
      if (!hay.includes(needle)) return false;
    }
    // A confirmed deal is settled fact, so credibility floors never exclude it.
    const floor = filters.minConfidence ?? (filters.credibleOnly ? 70 : undefined);
    if (floor != null && r.status === "rumour" && r.confidence.pct < floor) return false;
    if (filters.minFeeM != null && (r.reportedFeeM ?? -1) < filters.minFeeM) return false;
    if (filters.verdict && verdictKey(r.reportedFeeM, r.onsideValueM) !== filters.verdict) return false;
    return true;
  });
}

/**
 * Pure sort for the Wire. Default is recency — a live feed leads with what just
 * moved. The other orders exist because "which deal is biggest / most credible /
 * involves the most valuable player" are the questions our data can answer and a
 * rumour aggregator cannot.
 */
export function sortWire(items: RumourItem[], sort: WireSort = "new"): RumourItem[] {
  const out = [...items];
  if (sort === "conf") return out.sort((a, b) => b.confidence.pct - a.confidence.pct);
  if (sort === "fee") return out.sort((a, b) => (b.reportedFeeM ?? -1) - (a.reportedFeeM ?? -1));
  if (sort === "value") return out.sort((a, b) => b.onsideValueM - a.onsideValueM);
  return out.sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());
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

/** Live rumour feed, newest first. Excludes unreviewed ingestion candidates, and
 *  (by default) retracted/dead sagas — those only surface on the curator desk. */
export async function getRumours(limit = 60, opts: { includeDead?: boolean } = {}): Promise<RumourItem[]> {
  let q = readDb().from("rumours").select(RUMOUR_SELECT).neq("status", "candidate");
  if (!opts.includeDead) q = q.neq("status", "dead");
  const { data, error } = await q.order("last_update", { ascending: false }).limit(limit);
  if (error) return [];
  const now = new Date();
  const items = (data ?? [])
    .map((r) => toItem(r as unknown as RumourRow, now))
    .filter((x): x is RumourItem => x !== null);
  // The Wire is a feed of STORIES, not articles — one card per saga, however many
  // rows the ingest paths produced for it.
  return dedupeSagas(items);
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
  /**
   * Display name denormalised at post time. Deliberately NOT re-resolved: a user who
   * claims a handle later will still show whatever name they posted under. The receipt
   * line links via `profileId`, so the link is always current even when this is stale.
   */
  author: string;
  /** Author identity — the key the receipt join hangs off. */
  profileId: string;
}

export interface RumourSourceItem {
  url: string;
  source: string;
  tier: number;
  seenAt: string;
}

/** The reporting trail behind a rumour — best sources first (tier, then recency). */
export async function getRumourSources(rumourId: string, limit = 6): Promise<RumourSourceItem[]> {
  const { data } = await readDb()
    .from("rumour_sources")
    .select("url,source,tier,seen_at")
    .eq("rumour_id", rumourId)
    .not("url", "like", "sm-transfer:%") // idempotency markers, not articles
    .order("tier", { ascending: true })
    .order("seen_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((s) => ({
    url: s.url,
    source: s.source ?? "Source",
    tier: s.tier ?? 3,
    seenAt: s.seen_at,
  }));
}

/** Discussion thread for a rumour. `profileId` is the key the receipt line joins on. */
export async function getRumourComments(rumourId: string): Promise<CommentItem[]> {
  const { data } = await readDb()
    .from("rumour_comments")
    .select("id,body,created_at,author_name,profile_id")
    .eq("rumour_id", rumourId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.created_at,
    author: c.author_name || "Member",
    profileId: c.profile_id,
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

/**
 * Same columns, but forcing an inner join through players → clubs so the club filter
 * actually constrains which RUMOURS come back. A plain embedded filter would filter the
 * embedded rows and still return every parent rumour with a nulled-out player.
 */
const RUMOUR_SELECT_BY_CLUB =
  "id,to_club,reported_fee_eur,status,summary,primary_source,source_tier,corroborations,first_seen,last_update,url, players!inner(id,slug,name,known_as,photo_url,position,contract_until, clubs!inner(name,short_name,slug, leagues(name,slug)), player_valuations(value_eur))";

/** A deal on a club's page, with the engagement behind it and which way it points. */
export interface ClubDealItem extends RumourItem {
  /** Incoming = this club is the destination. Outgoing = the player is currently here. */
  direction: "in" | "out";
  /** Calls made on this deal. */
  calls: number;
  /** Comments posted on this deal. */
  comments: number;
  /** calls + comments — the "argument" this page ranks by. */
  argument: number;
}

/**
 * Every live deal touching one club — incoming (this club is the destination) and
 * outgoing (the player is on this club's books), ranked by how much argument each has
 * attracted.
 *
 * Two targeted reads rather than the whole feed. The club page previously called
 * `getRumours()`, which caps at the 60 most recent rows across the entire site, and then
 * filtered by club name in JS. With 487 live rumours that window covered just 29 of the
 * 159 clubs that actually have deals — so 82% of club pages rendered an empty section
 * while holding live deals. Filtering has to happen in the query, not after it.
 */
export async function getClubDeals(clubName: string, clubSlug: string): Promise<ClubDealItem[]> {
  const db = readDb();
  const [incoming, outgoing] = await Promise.all([
    db.from("rumours").select(RUMOUR_SELECT).eq("to_club", clubName).not("status", "in", '("candidate","dead")'),
    db.from("rumours").select(RUMOUR_SELECT_BY_CLUB).eq("players.clubs.slug", clubSlug).not("status", "in", '("candidate","dead")'),
  ]);

  const now = new Date();
  const seen = new Set<string>();
  const items: { item: RumourItem; direction: "in" | "out" }[] = [];
  for (const [rows, direction] of [
    [incoming.data ?? [], "in" as const],
    [outgoing.data ?? [], "out" as const],
  ] as const) {
    for (const row of rows) {
      const item = toItem(row as unknown as RumourRow, now);
      // A player leaving for the club he already plays for is not a deal; and a row can
      // legitimately appear in both reads, in which case incoming wins (it arrived first).
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      items.push({ item, direction });
    }
  }

  const directionById = new Map(items.map((x) => [x.item.id, x.direction] as const));
  const sagas = dedupeSagas(items.map((x) => x.item));
  const argument = await getArgumentCounts(sagas.map((s) => s.id));

  return sagas
    .map((r) => {
      const a = argument.get(r.id) ?? { calls: 0, comments: 0 };
      return {
        ...r,
        direction: directionById.get(r.id) ?? ("in" as const),
        calls: a.calls,
        comments: a.comments,
        argument: a.calls + a.comments,
      };
    })
    .sort(
      (a, b) =>
        b.argument - a.argument ||
        b.confidence.pct - a.confidence.pct ||
        new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime(),
    );
}

/**
 * Comments + calls per deal — the "argument" a club page ranks by.
 *
 * Scoped to the ids passed in rather than scanning both tables whole, because this runs
 * on every club page. Degrades to all-zeros on a read failure, which just falls the sort
 * through to confidence and recency — a club page must not 500 because a count is
 * unavailable.
 */
async function getArgumentCounts(
  rumourIds: string[],
): Promise<Map<string, { calls: number; comments: number }>> {
  const counts = new Map<string, { calls: number; comments: number }>();
  if (!rumourIds.length) return counts;
  const at = (id: string) => {
    const c = counts.get(id) ?? { calls: 0, comments: 0 };
    counts.set(id, c);
    return c;
  };

  const db = readDb();
  const [comments, calls] = await Promise.all([
    db.from("rumour_comments").select("rumour_id").in("rumour_id", rumourIds),
    db.from("predictions").select("subject_id").eq("subject_type", "transfer_saga").in("subject_id", rumourIds),
  ]);
  for (const c of comments.data ?? []) at(c.rumour_id).comments += 1;
  for (const p of calls.data ?? []) at(p.subject_id).calls += 1;
  return counts;
}
