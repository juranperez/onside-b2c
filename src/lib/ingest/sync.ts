import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "../db/types";
import { fetchAllPlayers } from "./api-football";
import { normalizePlayer } from "./normalize";
import { LAUNCH_LEAGUES, type LeagueConfig } from "./leagues";

type DB = SupabaseClient<Database>;
type Log = (msg: string) => void;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface SyncSummary {
  leagues: number;
  clubs: number;
  players: number;
  stats: number;
  errors: string[];
}

export async function syncLeague(
  db: DB,
  league: LeagueConfig,
  log: Log = () => {},
): Promise<{ clubs: number; players: number; stats: number }> {
  log(`[sync] ${league.name} (${league.apiId}/${league.season})`);

  await db.from("leagues").upsert(
    {
      id: String(league.apiId),
      slug: league.slug,
      name: league.name,
      country: league.country,
      season: league.season,
      tier: 1,
      data_source: "api-football",
    } satisfies TablesInsert<"leagues">,
    { onConflict: "id" },
  );

  const raw = await fetchAllPlayers(league.apiId, league.season, (page, total, n) =>
    log(`[sync]   ${league.name} page ${page}/${total} (+${n})`),
  );

  const clubsById = new Map<string, TablesInsert<"clubs">>();
  const players: TablesInsert<"players">[] = [];
  const stats: TablesInsert<"player_stats">[] = [];
  for (const r of raw) {
    const n = normalizePlayer(r, league.apiId);
    if (!n) continue;
    clubsById.set(n.club.id, n.club);
    players.push(n.player);
    stats.push(n.stat);
  }

  const clubs = [...clubsById.values()];

  // Order matters for FKs: clubs before players, players before stats.
  // Slugs are globally unique (name + id), so upserts never collide on slug;
  // any error is surfaced rather than silently dropping a batch.
  for (const c of chunk(clubs, 500)) {
    const { error } = await db.from("clubs").upsert(c, { onConflict: "id" });
    if (error) throw new Error(`clubs upsert: ${error.message}`);
  }
  for (const p of chunk(players, 500)) {
    const { error } = await db.from("players").upsert(p, { onConflict: "id" });
    if (error) throw new Error(`players upsert: ${error.message}`);
  }
  for (const s of chunk(stats, 500)) {
    const { error } = await db.from("player_stats").upsert(s, { onConflict: "player_id,season" });
    if (error) throw new Error(`player_stats upsert: ${error.message}`);
  }

  log(`[sync]   ${league.name}: ${clubs.length} clubs, ${players.length} players`);
  return { clubs: clubs.length, players: players.length, stats: stats.length };
}

export async function syncAll(
  db: DB,
  leagues: LeagueConfig[] = LAUNCH_LEAGUES,
  log: Log = () => {},
): Promise<SyncSummary> {
  const summary: SyncSummary = { leagues: 0, clubs: 0, players: 0, stats: 0, errors: [] };
  for (const league of leagues) {
    try {
      const r = await syncLeague(db, league, log);
      summary.leagues++;
      summary.clubs += r.clubs;
      summary.players += r.players;
      summary.stats += r.stats;
    } catch (e) {
      const msg = `${league.name}: ${(e as Error).message}`;
      summary.errors.push(msg);
      log(`[sync] ERROR ${msg}`);
    }
  }
  return summary;
}
