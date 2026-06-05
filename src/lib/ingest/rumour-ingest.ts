import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/types";

export interface FeedSource {
  name: string;
  url: string;
  tier: number;
}

// Public football RSS feeds (free). Tiers approximate reliability. Used only when
// RUMOUR_INGEST_ENABLED=1 — re-publishing has IP nuance, so candidates land in a
// human review queue (status='candidate') and never publish automatically.
export const DEFAULT_FEEDS: FeedSource[] = [
  { name: "BBC Football", url: "https://feeds.bbci.co.uk/sport/football/rss.xml", tier: 3 },
  { name: "Sky Sports", url: "https://www.skysports.com/rss/12040", tier: 3 },
  { name: "Guardian Football", url: "https://www.theguardian.com/football/rss", tier: 3 },
];

const TRANSFER_KEYWORDS = [
  "transfer", "sign", "signing", "bid", "deal", "agree", "joins", "move", "loan",
  "talks", "interested", "target", "swoop", "linked", "fee", "release clause",
];

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function parseItems(xml: string): { title: string; link: string }[] {
  const out: { title: string; link: string }[] = [];
  for (const block of xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []) {
    const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
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

export interface IngestResult {
  feeds: number;
  items: number;
  matched: number;
  inserted: number;
}

/**
 * RSS ingestion → candidate rumours (never auto-published). Matches headlines to
 * notable players by surname, gated on a transfer keyword, deduped by URL.
 */
export async function ingestRumours(db: SupabaseClient<Database>, feeds: FeedSource[]): Promise<IngestResult> {
  const { data: players } = await db
    .from("player_valuations")
    .select("value_eur, players!inner(id,name_norm)")
    .order("value_eur", { ascending: false })
    .limit(2500);

  // surname → player id (highest-value player wins, since rows are value-desc)
  const index = new Map<string, string>();
  for (const row of (players ?? []) as unknown as { players: { id: string; name_norm: string | null } }[]) {
    const norm = row.players?.name_norm;
    if (!norm) continue;
    const parts = norm.split(/\s+/).filter((w) => w.length >= 4);
    const surname = parts[parts.length - 1];
    if (surname && !index.has(surname)) index.set(surname, row.players.id);
  }

  const { data: existing } = await db.from("rumours").select("url").not("url", "is", null).limit(1000);
  const seenUrls = new Set((existing ?? []).map((r) => r.url));

  let items = 0;
  let matched = 0;
  let inserted = 0;
  const now = new Date().toISOString();

  for (const feed of feeds) {
    let xml = "";
    try {
      const res = await fetch(feed.url, { headers: { "user-agent": "OnsideBot/1.0 (+https://onsidemarket.com)" } });
      if (!res.ok) continue;
      xml = await res.text();
    } catch {
      continue;
    }
    for (const it of parseItems(xml)) {
      items++;
      const folded = fold(it.title);
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
        reported_fee_eur: extractFeeEur(it.title),
        status: "candidate",
        summary: it.title.slice(0, 280),
        primary_source: feed.name,
        source_tier: feed.tier,
        corroborations: 1,
        first_seen: now,
        last_update: now,
        url: it.link || null,
      });
      if (!error) {
        inserted++;
        if (it.link) seenUrls.add(it.link);
      }
    }
  }
  return { feeds: feeds.length, items, matched, inserted };
}

/**
 * X / Twitter filtered-stream layer — the tier-1 journalist signal (Romano, Ornstein…).
 * Paid (Pro/Enterprise tier) + legal review required. Dormant until X_API_BEARER is set.
 */
export async function ingestFromX(): Promise<IngestResult> {
  if (!process.env.X_API_BEARER) return { feeds: 0, items: 0, matched: 0, inserted: 0 };
  // TODO once budget + legal land: subscribe to the filtered stream with account +
  // keyword rules for tier-1 journalists, classify + extract, insert tier-1 candidates.
  return { feeds: 0, items: 0, matched: 0, inserted: 0 };
}
