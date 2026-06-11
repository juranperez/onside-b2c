/**
 * Historical season backfill (justifies the Historical Data add-on): for each
 * covered league, sweep the last N completed seasons' fixtures and aggregate
 * per-player apps/minutes/goals/assists/xG into player_stats keyed by season
 * start-year. Current-season rows are untouched (different season key).
 *
 *   npm run backfill:history -- --league premier-league --seasons 1
 *   npm run backfill:history -- --seasons 3            (all leagues, ~5h, overnight)
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";
import { SPORTMONKS_BASE, SPORTMONKS_LEAGUE } from "../src/lib/ingest/sportmonks";

const TOKEN = process.env.SPORTMONKS_API_TOKEN;
const DELAY = Number(process.env.SM_DELAY ?? 1250); // per-entity 3000/hr ⇒ ≥1.2s spacing
const args = process.argv.slice(2);
const argOf = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const ONLY_LEAGUE = argOf("league");
const SEASONS_BACK = Number(argOf("seasons") ?? 3);

const STAT = { MINUTES: 119, GOALS: 52, ASSISTS: 79, XG: 5304 } as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sm<T>(path: string): Promise<T> {
  const res = await fetch(`${SPORTMONKS_BASE}${path}`, { headers: { Authorization: TOKEN!, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

interface LineupPlayer {
  player_id: number;
  details?: { type_id: number; data?: { value?: number } }[];
}
interface Agg {
  apps: number;
  mins: number;
  goals: number;
  assists: number;
  xg: number;
}

async function main() {
  if (!TOKEN) throw new Error("SPORTMONKS_API_TOKEN missing");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE env");
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });

  // sportmonks player id → our player id (only players already crosswalked).
  const smToOurs = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from("players").select("id,sportmonks_id").not("sportmonks_id", "is", null).range(from, from + 999);
    if (!data?.length) break;
    for (const p of data) if (p.sportmonks_id) smToOurs.set(p.sportmonks_id, p.id);
    if (data.length < 1000) break;
  }
  console.log(`crosswalk: ${smToOurs.size} players`);

  const leagues = Object.entries(SPORTMONKS_LEAGUE).filter(([slug]) => !ONLY_LEAGUE || slug === ONLY_LEAGUE);

  for (const [slug, smLeagueId] of leagues) {
    let seasons: { id: number; name?: string | null; is_current?: boolean | null; finished?: boolean | null }[] = [];
    try {
      const lg = await sm<{ data?: { seasons?: typeof seasons } }>(`/leagues/${smLeagueId}?include=seasons`);
      seasons = (lg.data?.seasons ?? [])
        .filter((s) => !s.is_current)
        .sort((a, b) => String(b.name ?? "").localeCompare(String(a.name ?? "")))
        .slice(0, SEASONS_BACK);
    } catch (e) {
      console.warn(`${slug}: seasons lookup failed (${(e as Error).message})`);
      continue;
    }

    for (const season of seasons) {
      const startYear = Number(String(season.name ?? "").slice(0, 4)) || null;
      if (!startYear) continue;
      let fixtures: { id: number; state_id: number }[] = [];
      try {
        const sr = await sm<{ data?: { fixtures?: { id: number; state_id: number }[] } }>(`/seasons/${season.id}?include=fixtures`);
        fixtures = (sr.data?.fixtures ?? []).filter((f) => f.state_id === 5);
      } catch {
        continue;
      }
      console.log(`${slug} ${season.name} (season ${season.id}): ${fixtures.length} finished fixtures`);

      const agg = new Map<string, Agg>();
      for (let i = 0; i < fixtures.length; i++) {
        try {
          const d = await sm<{ data?: { lineups?: LineupPlayer[] } }>(`/fixtures/${fixtures[i].id}?include=lineups.details`);
          for (const lp of d.data?.lineups ?? []) {
            const ours = smToOurs.get(String(lp.player_id));
            if (!ours) continue;
            const dm = new Map((lp.details ?? []).map((x) => [x.type_id, x.data?.value]));
            const num = (id: number) => {
              const v = Number(dm.get(id) ?? 0);
              return isFinite(v) ? v : 0;
            };
            const a = agg.get(ours) ?? { apps: 0, mins: 0, goals: 0, assists: 0, xg: 0 };
            const mins = num(STAT.MINUTES);
            if (mins > 0) a.apps += 1;
            a.mins += mins;
            a.goals += num(STAT.GOALS);
            a.assists += num(STAT.ASSISTS);
            a.xg += num(STAT.XG);
            agg.set(ours, a);
          }
        } catch {
          // skip fixture; sweep continues
        }
        if (i % 25 === 24) process.stdout.write(`\r  ${i + 1}/${fixtures.length}`);
        await sleep(DELAY);
      }
      process.stdout.write("\n");

      const rows = [...agg.entries()].map(([player_id, a]) => ({
        player_id,
        season: startYear,
        apps: a.apps,
        minutes: a.mins,
        goals: a.goals,
        assists: a.assists,
        xg: Math.round(a.xg * 100) / 100,
        data_source: "sportmonks-historical",
        fetched_at: new Date().toISOString(),
      }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db.from("player_stats").upsert(rows.slice(i, i + 500), { onConflict: "player_id,season" });
        if (error) console.error(`  write error: ${error.message}`);
      }
      console.log(`  ${slug} ${season.name}: wrote ${rows.length} player-season rows`);
    }
  }
  console.log("backfill complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
