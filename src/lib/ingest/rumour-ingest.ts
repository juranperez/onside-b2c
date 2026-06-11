import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/types";
import { fold, buildPlayerIndex, buildClubIndex, matchPlayer, matchDestClub, stripJournalists, type MatchStrength } from "./match";

export interface FeedSource {
  name: string; // fallback source label
  url: string;
  tier: number; // fallback tier when the per-item source is unknown
  kind: "outlet" | "google" | "reddit";
}

const UA = "Mozilla/5.0 (compatible; OnsideBot/1.0; +https://onsidemarket.com)";

const gnews = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:2d`)}&hl=en-GB&gl=GB&ceid=GB:en`;

// Free multi-source firehose. Replaces the paid X API: the tier-1 journalist signal
// comes from Reddit r/soccer (the community names the reporting journalist) + Google
// News attribution. Used only when RUMOUR_INGEST_ENABLED=1. New sagas from trusted
// sources with a STRONG name match auto-publish; corroborations of known sagas merge
// into the existing rumour; everything else lands as a human-review candidate.
export const DEFAULT_FEEDS: FeedSource[] = [
  { name: "r/soccer", tier: 3, kind: "reddit", url: "https://www.reddit.com/r/soccer/search.rss?q=flair%3ATransfers&restrict_sr=on&sort=new&limit=75" },
  { name: "Google News", tier: 3, kind: "google", url: gnews("Premier League transfer") },
  { name: "Google News", tier: 3, kind: "google", url: gnews("La Liga OR Serie A OR Bundesliga OR Ligue 1 transfer") },
  { name: "Google News", tier: 3, kind: "google", url: gnews('football transfer "here we go" OR "agreement reached" OR "medical"') },
  { name: "BBC Football", tier: 3, kind: "outlet", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
  { name: "Guardian Football", tier: 3, kind: "outlet", url: "https://www.theguardian.com/football/rss" },
];

const TRANSFER_KEYWORDS = [
  "transfer", "sign", "signing", "bid", "deal", "agree", "joins", "move", "loan",
  "talks", "interested", "target", "swoop", "linked", "fee", "release clause",
  "here we go", "medical", "contract",
];

const TIER1 = ["fabrizio romano", "romano", "david ornstein", "ornstein"];
const TIER2 = [
  "sky sports", "the athletic", "bbc", "guardian", "telegraph", "espn", "l'equipe",
  "lequipe", "bild", "gazzetta", "di marzio", "matteo moretto", "florian plettenberg",
  "santi aouna", "rmc", "relevo", "the times", "reuters",
];
const TIER3 = [
  "mirror", "the sun", "daily mail", "express", "teamtalk", "caughtoffside",
  "givemesport", "football insider", "90min", "football365", "fichajes",
  "calciomercato", "tuttomercato", "evening news", "transferfeed",
];

function tierFor(source: string): number {
  const s = fold(source);
  if (TIER1.some((k) => s.includes(k))) return 1;
  if (TIER2.some((k) => s.includes(k))) return 2;
  if (TIER3.some((k) => s.includes(k))) return 3;
  return 3;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&amp;/g, "&");
}

// Parse both RSS (<item><link>url</link>) and Atom (<entry><link href="url"/>).
function parseFeed(xml: string): { title: string; link: string }[] {
  const out: { title: string; link: string }[] = [];
  for (const block of xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? []) {
    const rawTitle = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    const title = decodeEntities(rawTitle.replace(/<!\[CDATA\[|\]\]>/g, "").trim());
    let link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    if (!link) link = decodeEntities(block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1] ?? "").trim();
    if (title) out.push({ title, link });
  }
  return out;
}

function extractFeeEur(title: string): number | null {
  const m = title.match(/[€£]\s?(\d+(?:\.\d+)?)\s?(m|million|bn|billion)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return /b/i.test(m[2]) ? Math.round(n * 1e9) : Math.round(n * 1e6);
}

// Per-item {source, tier, summary} depending on the feed kind.
function resolveItem(feed: FeedSource, title: string): { source: string; tier: number; summary: string } | null {
  if (feed.kind === "reddit") {
    const m = title.match(/^\[([^\]]+)\]\s*/);
    const source = m ? m[1].trim() : feed.name;
    // Strip the "[Journalist]" prefix before it becomes the match text — otherwise
    // the reporter's name (e.g. "Romano") can match a player with that name.
    return { source, tier: tierFor(source), summary: m ? title.slice(m[0].length).trim() : title };
  }
  if (feed.kind === "google") {
    const i = title.lastIndexOf(" - ");
    if (i <= 0) return { source: feed.name, tier: feed.tier, summary: title };
    const source = title.slice(i + 3).trim();
    if (fold(source) === "google news") return null; // self-referential feed row
    return { source, tier: tierFor(source), summary: title.slice(0, i).trim() };
  }
  // Outlet feeds: rate the outlet itself (BBC/Guardian are tier 2, not the feed default).
  return { source: feed.name, tier: Math.min(feed.tier, tierFor(feed.name)), summary: title };
}

// ---- Ingest decision (pure — unit-tested) -----------------------------------

export interface ExistingRumour {
  id: string;
  status: string;
  to_club: string;
  corroborations: number;
  source_tier: number;
  reported_fee_eur: number | null;
}

export type IngestAction =
  | { kind: "skip"; reason: "saga-over" | "ambiguous-target" }
  | { kind: "merge"; target: ExistingRumour; promote: boolean }
  | { kind: "publish" }
  | { kind: "candidate" };

/**
 * What to do with a freshly matched headline:
 * - An existing rumour for the same player+destination (or the player's single
 *   live saga when the destination is unknown) absorbs it as corroboration —
 *   confidence rises through corroborations/tier/freshness, no human needed.
 *   A strong trusted corroboration also promotes a queued candidate to live.
 * - A NEW saga from a trusted source (tier ≤ 2) with a STRONG full-name match
 *   and a resolved destination publishes immediately (fast lane).
 * - Everything else queues for human review, exactly as before.
 */
export function decideIngest(args: {
  toClub: string;
  tier: number;
  strength: MatchStrength;
  byPair: ExistingRumour | undefined;
  forPlayer: ExistingRumour[];
}): IngestAction {
  const { toClub, tier, strength } = args;
  let target = args.byPair;
  if (toClub === "—") {
    // Destination-less chatter belongs to the player's PUBLISHED saga first —
    // otherwise a lingering "—" candidate row absorbs updates the live rumour
    // should be getting (the Anderson failure mode).
    const published = args.forPlayer.filter((r) => r.status === "rumour");
    if (published.length === 1) target = published[0];
    else if (published.length > 1) return { kind: "skip", reason: "ambiguous-target" };
    else if (!target) {
      const live = args.forPlayer.filter((r) => r.status !== "dead" && r.status !== "confirmed");
      if (live.length === 1) target = live[0];
      else if (live.length > 1) return { kind: "skip", reason: "ambiguous-target" };
    }
  }
  if (target) {
    if (target.status === "confirmed" || target.status === "dead") return { kind: "skip", reason: "saga-over" };
    const promote = target.status === "candidate" && tier <= 2 && strength === "strong" && target.to_club !== "—";
    return { kind: "merge", target, promote };
  }
  if (tier <= 2 && strength === "strong" && toClub !== "—") return { kind: "publish" };
  return { kind: "candidate" };
}

export interface IngestResult {
  feeds: number;
  items: number;
  matched: number;
  inserted: number;
  merged: number;
  autoPublished: number;
  promoted: number;
  tier1: number;
  skippedResolved: number; // player already has a confirmed move — saga over
}

const EMPTY_RESULT: IngestResult = { feeds: 0, items: 0, matched: 0, inserted: 0, merged: 0, autoPublished: 0, promoted: 0, tier1: 0, skippedResolved: 0 };

/** Every player (id, folded name, current club) — paginated past PostgREST's row cap so the match index covers the full population, not just the most valuable. */
async function loadAllPlayers(db: SupabaseClient<Database>): Promise<{ id: string; name_norm: string | null; clubs: { name: string } | null }[]> {
  const out: { id: string; name_norm: string | null; clubs: { name: string } | null }[] = [];
  const PAGE = 1000;
  for (let from = 0; from < 30_000; from += PAGE) {
    const { data, error } = await db.from("players").select("id,name_norm, clubs(name)").range(from, from + PAGE - 1);
    if (error || !data?.length) break;
    out.push(...(data as unknown as typeof out));
    if (data.length < PAGE) break;
  }
  return out;
}

/**
 * Free multi-source ingestion. Resolves each headline to a player with the
 * precision matcher (journalist bylines stripped, full player population indexed),
 * extracts a destination club, then routes via decideIngest: merge corroborations
 * into existing rumours, fast-lane strong trusted new sagas, queue the rest.
 */
export async function ingestRumours(db: SupabaseClient<Database>, feeds: FeedSource[]): Promise<IngestResult> {
  const players = await loadAllPlayers(db);
  const playerIndex = buildPlayerIndex(players);
  const currentClub = new Map(players.map((p) => [p.id, p.clubs?.name ?? null]));

  const { data: clubRows } = await db.from("clubs").select("id,name,name_norm,short_name");
  const clubIndex = buildClubIndex((clubRows ?? []) as { id: string; name: string; name_norm: string | null; short_name: string | null }[]);

  // Existing state for dedup, saga suppression, and corroboration-merge.
  const { data: existing } = await db
    .from("rumours")
    .select("id,url,player_id,status,to_club,corroborations,source_tier,reported_fee_eur")
    .limit(5000);
  const seenUrls = new Set<string>();
  // Durable per-article dedup — every url that ever fed a rumour, not just the primary.
  {
    const PAGE = 1000;
    for (let from = 0; from < 50_000; from += PAGE) {
      const { data, error } = await db.from("rumour_sources").select("url").range(from, from + PAGE - 1);
      if (error || !data?.length) break;
      for (const r of data) seenUrls.add(r.url);
      if (data.length < PAGE) break;
    }
  }
  const confirmedPlayers = new Set<string>();
  const byPair = new Map<string, ExistingRumour>();
  const forPlayer = new Map<string, ExistingRumour[]>();
  for (const r of existing ?? []) {
    if (r.url) seenUrls.add(r.url);
    if (r.status === "confirmed") confirmedPlayers.add(r.player_id);
    const row: ExistingRumour = {
      id: r.id,
      status: r.status ?? "rumour",
      to_club: r.to_club ?? "—",
      corroborations: r.corroborations ?? 1,
      source_tier: r.source_tier ?? 3,
      reported_fee_eur: r.reported_fee_eur,
    };
    byPair.set(`${r.player_id}|${row.to_club}`, row);
    const arr = forPlayer.get(r.player_id);
    if (arr) arr.push(row);
    else forPlayer.set(r.player_id, [row]);
  }

  const result: IngestResult = { ...EMPTY_RESULT, feeds: feeds.length };
  const now = new Date().toISOString();

  for (const feed of feeds) {
    let xml = "";
    try {
      const res = await fetch(feed.url, { headers: { "user-agent": UA, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } });
      if (!res.ok) continue;
      xml = await res.text();
    } catch {
      continue;
    }
    for (const it of parseFeed(xml).slice(0, 75)) {
      const resolved = resolveItem(feed, it.title);
      if (!resolved) continue;
      result.items++;
      const folded = fold(resolved.summary);
      if (!TRANSFER_KEYWORDS.some((k) => folded.includes(k))) continue;

      // Match on byline-stripped text; store the original summary.
      const matchText = stripJournalists(resolved.summary);
      const hit = matchPlayer(matchText, playerIndex);
      if (!hit) continue; // no confident player match — skip rather than guess
      result.matched++;

      if (confirmedPlayers.has(hit.playerId)) {
        result.skippedResolved++; // their move is already confirmed — don't queue stale chatter
        continue;
      }
      if (it.link && seenUrls.has(it.link)) continue;

      const toClub = matchDestClub(matchText, clubIndex, currentClub.get(hit.playerId) ?? null) ?? "—";
      const action = decideIngest({
        toClub,
        tier: resolved.tier,
        strength: hit.strength,
        byPair: byPair.get(`${hit.playerId}|${toClub}`),
        forPlayer: forPlayer.get(hit.playerId) ?? [],
      });

      if (action.kind === "skip") continue;

      if (action.kind === "merge") {
        const t = action.target;
        const bestTier = Math.min(t.source_tier, resolved.tier);
        const fee = extractFeeEur(resolved.summary);
        const fresherCredible = resolved.tier <= t.source_tier;
        const { error } = await db
          .from("rumours")
          .update({
            corroborations: t.corroborations + 1,
            last_update: now,
            source_tier: bestTier,
            reported_fee_eur: fee != null ? Math.max(fee, t.reported_fee_eur ?? 0) : t.reported_fee_eur,
            // A report at least as credible as the current source carries the saga's latest development.
            ...(fresherCredible ? { summary: resolved.summary.slice(0, 280), url: it.link || null, primary_source: resolved.source.slice(0, 80) } : {}),
            ...(action.promote ? { status: "rumour" } : {}),
          })
          .eq("id", t.id);
        if (!error) {
          result.merged++;
          if (action.promote) result.promoted++;
          t.corroborations += 1;
          t.source_tier = bestTier;
          if (action.promote) t.status = "rumour";
          if (it.link) {
            seenUrls.add(it.link);
            await db.from("rumour_sources").upsert(
              { url: it.link, rumour_id: t.id, source: resolved.source.slice(0, 80), tier: resolved.tier },
              { onConflict: "url", ignoreDuplicates: true },
            );
          }
        }
        continue;
      }

      const status = action.kind === "publish" ? "rumour" : "candidate";
      const { data: created, error } = await db
        .from("rumours")
        .insert({
          player_id: hit.playerId,
          to_club: toClub,
          reported_fee_eur: extractFeeEur(resolved.summary),
          status,
          summary: resolved.summary.slice(0, 280),
          primary_source: resolved.source.slice(0, 80),
          source_tier: resolved.tier,
          corroborations: 1,
          first_seen: now,
          last_update: now,
          url: it.link || null,
        })
        .select("id")
        .single();
      if (!error) {
        result.inserted++;
        if (action.kind === "publish") result.autoPublished++;
        if (resolved.tier === 1) result.tier1++;
        if (it.link) {
          seenUrls.add(it.link);
          if (created?.id) {
            await db.from("rumour_sources").upsert(
              { url: it.link, rumour_id: created.id, source: resolved.source.slice(0, 80), tier: resolved.tier },
              { onConflict: "url", ignoreDuplicates: true },
            );
          }
        }
        const row: ExistingRumour = {
          id: created?.id ?? "new",
          status,
          to_club: toClub,
          corroborations: 1,
          source_tier: resolved.tier,
          reported_fee_eur: extractFeeEur(resolved.summary),
        };
        byPair.set(`${hit.playerId}|${toClub}`, row);
        const arr = forPlayer.get(hit.playerId);
        if (arr) arr.push(row);
        else forPlayer.set(hit.playerId, [row]);
      }
    }
  }
  return result;
}

/**
 * X / Twitter filtered-stream layer — OPTIONAL paid upgrade. The free Reddit + Google
 * News sources already surface the tier-1 journalist signal, so this is no longer
 * required. Enable only for the raw journalist firehose: set X_API_BEARER + clear legal.
 */
export async function ingestFromX(): Promise<IngestResult> {
  if (!process.env.X_API_BEARER) return { ...EMPTY_RESULT };
  return { ...EMPTY_RESULT };
}
