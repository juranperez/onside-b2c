import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/types";
import { fold, buildPlayerIndex, buildClubIndex, matchPlayer, matchDestClub } from "./match";

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
// News attribution. Used only when RUMOUR_INGEST_ENABLED=1; everything inserts as a
// human-review candidate, never live.
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
  return { source: feed.name, tier: feed.tier, summary: title };
}

export interface IngestResult {
  feeds: number;
  items: number;
  matched: number;
  inserted: number;
  tier1: number;
  skippedResolved: number; // player already has a confirmed move — saga over
}

/**
 * Free multi-source ingestion → candidate rumours (never auto-published). Resolves
 * each headline to a player with the precision matcher (src/lib/ingest/match.ts),
 * extracts a destination club, suppresses stale stories for players whose move is
 * already confirmed, and dedupes by URL + (player → club). Source → reliability tier.
 */
export async function ingestRumours(db: SupabaseClient<Database>, feeds: FeedSource[]): Promise<IngestResult> {
  // Top players (precision matcher + current-club lookup for destination exclusion).
  const { data: pv } = await db
    .from("player_valuations")
    .select("value_eur, players!inner(id,name_norm, clubs(name))")
    .order("value_eur", { ascending: false })
    .limit(5000);
  const players = ((pv ?? []) as unknown as { players: { id: string; name_norm: string | null; clubs: { name: string } | null } }[]).map((r) => r.players);
  const playerIndex = buildPlayerIndex(players);
  const currentClub = new Map(players.map((p) => [p.id, p.clubs?.name ?? null]));

  const { data: clubRows } = await db.from("clubs").select("id,name,name_norm,short_name");
  const clubIndex = buildClubIndex((clubRows ?? []) as { id: string; name: string; name_norm: string | null; short_name: string | null }[]);

  // Existing state for dedup + saga suppression.
  const { data: existing } = await db.from("rumours").select("url,player_id,status,to_club").limit(5000);
  const seenUrls = new Set<string>();
  const confirmedPlayers = new Set<string>();
  const seenPairs = new Set<string>(); // player_id|toClub
  for (const r of existing ?? []) {
    if (r.url) seenUrls.add(r.url);
    if (r.status === "confirmed") confirmedPlayers.add(r.player_id);
    seenPairs.add(`${r.player_id}|${r.to_club}`);
  }

  let items = 0, matched = 0, inserted = 0, tier1 = 0, skippedResolved = 0;
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
      items++;
      const folded = fold(resolved.summary);
      if (!TRANSFER_KEYWORDS.some((k) => folded.includes(k))) continue;

      const hit = matchPlayer(resolved.summary, playerIndex);
      if (!hit) continue; // no confident player match — skip rather than guess
      matched++;

      if (confirmedPlayers.has(hit.playerId)) {
        skippedResolved++; // their move is already confirmed — don't queue stale chatter
        continue;
      }
      if (it.link && seenUrls.has(it.link)) continue;

      const toClub = matchDestClub(resolved.summary, clubIndex, currentClub.get(hit.playerId) ?? null) ?? "—";
      if (seenPairs.has(`${hit.playerId}|${toClub}`)) continue;

      const { error } = await db.from("rumours").insert({
        player_id: hit.playerId,
        to_club: toClub,
        reported_fee_eur: extractFeeEur(resolved.summary),
        status: "candidate",
        summary: resolved.summary.slice(0, 280),
        primary_source: resolved.source.slice(0, 80),
        source_tier: resolved.tier,
        corroborations: 1,
        first_seen: now,
        last_update: now,
        url: it.link || null,
      });
      if (!error) {
        inserted++;
        if (resolved.tier === 1) tier1++;
        if (it.link) seenUrls.add(it.link);
        seenPairs.add(`${hit.playerId}|${toClub}`);
      }
    }
  }
  return { feeds: feeds.length, items, matched, inserted, tier1, skippedResolved };
}

/**
 * X / Twitter filtered-stream layer — OPTIONAL paid upgrade. The free Reddit + Google
 * News sources already surface the tier-1 journalist signal, so this is no longer
 * required. Enable only for the raw journalist firehose: set X_API_BEARER + clear legal.
 */
export async function ingestFromX(): Promise<IngestResult> {
  const empty = { feeds: 0, items: 0, matched: 0, inserted: 0, tier1: 0, skippedResolved: 0 };
  if (!process.env.X_API_BEARER) return empty;
  return empty;
}
