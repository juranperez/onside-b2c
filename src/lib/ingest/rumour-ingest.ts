import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/types";

export interface FeedSource {
  name: string; // fallback source label
  url: string;
  tier: number; // fallback tier when the per-item source is unknown
  kind: "outlet" | "google" | "reddit";
}

const UA = "Mozilla/5.0 (compatible; OnsideBot/1.0; +https://onsidemarket.com)";

// Google News RSS query feed (free, no auth). Each item's source is attributed in
// the title as a trailing " - Source", which we map to a reliability tier.
const gnews = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:2d`)}&hl=en-GB&gl=GB&ceid=GB:en`;

// Free multi-source firehose. Replaces the paid X API: the tier-1 journalist signal
// comes from Reddit r/soccer (the community tags posts with the reporting journalist,
// e.g. "[Fabrizio Romano] …") + Google News attribution. Used only when
// RUMOUR_INGEST_ENABLED=1; everything inserts as a human-review candidate, never live.
export const DEFAULT_FEEDS: FeedSource[] = [
  // Reddit r/soccer — community-curated, journalist named in "[ ]" at the title start.
  { name: "r/soccer", tier: 3, kind: "reddit", url: "https://www.reddit.com/r/soccer/search.rss?q=flair%3ATransfers&restrict_sr=on&sort=new&limit=75" },
  // Google News — broad transfer queries across the top leagues + "done deal" phrasing.
  { name: "Google News", tier: 3, kind: "google", url: gnews("Premier League transfer") },
  { name: "Google News", tier: 3, kind: "google", url: gnews("La Liga OR Serie A OR Bundesliga OR Ligue 1 transfer") },
  { name: "Google News", tier: 3, kind: "google", url: gnews('football transfer "here we go" OR "agreement reached" OR "medical"') },
  // Reputable outlet RSS (general football — gated to transfer items below).
  { name: "BBC Football", tier: 3, kind: "outlet", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
  { name: "Guardian Football", tier: 3, kind: "outlet", url: "https://www.theguardian.com/football/rss" },
];

const TRANSFER_KEYWORDS = [
  "transfer", "sign", "signing", "bid", "deal", "agree", "joins", "move", "loan",
  "talks", "interested", "target", "swoop", "linked", "fee", "release clause",
  "here we go", "medical", "contract",
];

// Source → reliability tier. Tier 1 = the elite individual reporters; tier 2 = major
// outlets/known journalists; tier 3 = tabloids/aggregators. Unknown → 3 (neutral).
const TIER1 = ["fabrizio romano", "romano", "david ornstein", "ornstein"];
const TIER2 = [
  "sky sports", "the athletic", "bbc", "guardian", "telegraph", "espn", "l'equipe",
  "lequipe", "l'équipe", "bild", "gazzetta", "di marzio", "matteo moretto",
  "florian plettenberg", "santi aouna", "rmc", "relevo", "the times", "reuters",
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

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

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
    return { source, tier: tierFor(source), summary: title };
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
}

/**
 * Free multi-source ingestion → candidate rumours (never auto-published). Matches
 * headlines to notable players by surname, gated on a transfer keyword, deduped by
 * URL. The reporting source is extracted per item and mapped to a reliability tier
 * (so a Romano/Ornstein report lands as tier 1 — the signal the paid X API sold).
 */
export async function ingestRumours(db: SupabaseClient<Database>, feeds: FeedSource[]): Promise<IngestResult> {
  const { data: players } = await db
    .from("player_valuations")
    .select("value_eur, players!inner(id,name_norm)")
    .order("value_eur", { ascending: false })
    .limit(3000);

  // surname → player id (highest-value player wins, since rows are value-desc)
  const index = new Map<string, string>();
  for (const row of (players ?? []) as unknown as { players: { id: string; name_norm: string | null } }[]) {
    const norm = row.players?.name_norm;
    if (!norm) continue;
    const parts = norm.split(/\s+/).filter((w) => w.length >= 4);
    const surname = parts[parts.length - 1];
    if (surname && !index.has(surname)) index.set(surname, row.players.id);
  }

  const { data: existing } = await db.from("rumours").select("url").not("url", "is", null).limit(2000);
  const seenUrls = new Set((existing ?? []).map((r) => r.url));

  let items = 0;
  let matched = 0;
  let inserted = 0;
  let tier1 = 0;
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
      let playerId: string | undefined;
      for (const tok of folded.replace(/[^a-z\s]/g, " ").split(/\s+/)) {
        if (tok.length >= 4 && index.has(tok)) {
          playerId = index.get(tok);
          break;
        }
      }
      if (!playerId) continue;
      matched++;
      if (it.link && seenUrls.has(it.link)) continue;
      const { error } = await db.from("rumours").insert({
        player_id: playerId,
        to_club: "—", // not reliably extractable from a headline — editor sets on approval
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
      }
    }
  }
  return { feeds: feeds.length, items, matched, inserted, tier1 };
}

/**
 * X / Twitter filtered-stream layer — OPTIONAL paid upgrade. The free Reddit + Google
 * News sources above already surface the tier-1 journalist signal, so this is no longer
 * required to run the pipeline. Enable only if you later want the raw journalist
 * firehose: set X_API_BEARER (Pro/Enterprise tier) + clear the legal review.
 */
export async function ingestFromX(): Promise<IngestResult> {
  const empty = { feeds: 0, items: 0, matched: 0, inserted: 0, tier1: 0 };
  if (!process.env.X_API_BEARER) return empty;
  // TODO (paid upgrade): subscribe to the filtered stream with tier-1 journalist rules,
  // classify + extract, insert candidates. Free sources cover this for now.
  return empty;
}
