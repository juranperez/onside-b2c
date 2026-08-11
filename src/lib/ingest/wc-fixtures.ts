import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/types";
import { fetchFixtures } from "./api-football";

export const WC_LEAGUE_ID = 1;
export const WC_SEASON = 2026;
export const WC_COMPETITION = "World Cup 2026";

// API-Football names a handful of nations differently from our national_teams.name.
// Everything else maps by exact (case-insensitive) name.
const NAME_ALIASES: Record<string, string> = {
  "cape verde islands": "cape-verde",
  czechia: "czech-republic",
  "türkiye": "turkey",
  "turkiye": "turkey",
  "congo dr": "dr-congo",
  usa: "united-states",
};

/** API status code → coarse lifecycle bucket the UI renders against. */
export function normalizeStatus(short: string): "scheduled" | "live" | "finished" | "postponed" {
  if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"].includes(short)) return "live";
  if (["FT", "AET", "PEN", "WO"].includes(short)) return "finished";
  if (["PST", "CANC", "ABD", "AWD", "SUSP", "TBD"].includes(short)) return "postponed";
  return "scheduled";
}

export interface WcFixtureSyncResult {
  fetched: number;
  upserted: number;
  skipped: string[];
}

/**
 * Pulls the World Cup schedule from API-Football and upserts it into `fixtures`,
 * mapping team names → our national_teams slugs. Used by both the local backfill
 * script and the live-score cron. Service-role client required (bypasses RLS).
 */
export async function syncWcFixtures(
  db: SupabaseClient<Database>,
  season = WC_SEASON,
): Promise<WcFixtureSyncResult> {
  const { data: nations, error: nErr } = await db.from("national_teams").select("slug,name");
  if (nErr) throw new Error(`national_teams read failed: ${nErr.message}`);

  const slugByName = new Map<string, string>();
  for (const n of nations ?? []) {
    slugByName.set(n.name.toLowerCase().trim(), n.slug);
    slugByName.set(n.slug, n.slug);
  }
  for (const [name, slug] of Object.entries(NAME_ALIASES)) slugByName.set(name, slug);
  const toSlug = (name: string) => slugByName.get(name.toLowerCase().trim()) ?? null;

  const { response } = await fetchFixtures(WC_LEAGUE_ID, season);
  const now = new Date().toISOString();
  const skipped: string[] = [];
  const rows = [];

  for (const f of response) {
    const home = toSlug(f.teams.home.name);
    const away = toSlug(f.teams.away.name);
    if (!home || !away) {
      // Knockout placeholders ("Winner Group A") have no mapped nation yet — skip cleanly.
      skipped.push(`${f.teams.home.name} v ${f.teams.away.name}`);
      continue;
    }
    rows.push({
      id: `wc2026-${f.fixture.id}`,
      competition: WC_COMPETITION,
      home_id: home,
      away_id: away,
      kickoff: f.fixture.date,
      status: normalizeStatus(f.fixture.status.short),
      score_home: f.goals.home,
      score_away: f.goals.away,
      round: f.league.round,
      venue: f.fixture.venue?.name ?? null,
      city: f.fixture.venue?.city ?? null,
      data_source: "api-football",
      fetched_at: now,
    });
  }

  let upserted = 0;
  if (rows.length) {
    const { error } = await db.from("fixtures").upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`fixtures upsert failed: ${error.message}`);
    upserted = rows.length;
  }

  return { fetched: response.length, upserted, skipped };
}
