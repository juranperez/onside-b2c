import "server-only";
import { readDb } from "../db/server";
import { toPlayerListItem, type PlayerListItem, type PlayerRowDB } from "./map";

const PLAYER_EMBED = "id,slug,name,position,age, clubs(slug,name,short_name, leagues(slug,name))";

function reshape(r: { value_eur: number; players: unknown }): PlayerRowDB | null {
  const p = r.players as Omit<PlayerRowDB, "player_valuations"> | null;
  if (!p) return null;
  return { ...p, player_valuations: { value_eur: r.value_eur } };
}

/** Most valuable players, by model anchor (descending). */
export async function getTopPlayers(limit = 60): Promise<PlayerListItem[]> {
  const { data, error } = await readDb()
    .from("player_valuations")
    .select(`value_eur, players!inner(${PLAYER_EMBED})`)
    .order("value_eur", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const now = new Date();
  return (data ?? [])
    .map((r) => reshape(r as unknown as { value_eur: number; players: unknown }))
    .filter((x): x is PlayerRowDB => x !== null)
    .map((row) => toPlayerListItem(row, now));
}

/**
 * Biggest movers over the last week. The weekly delta is derived from the Pulse
 * at read time, so we rank a value-relevant pool in JS rather than in SQL.
 */
export async function getMovers(limit = 8, dir: "up" | "down" | "all" = "all"): Promise<PlayerListItem[]> {
  const pool = await getTopPlayers(400);
  let items = pool;
  if (dir === "up") items = items.filter((i) => i.dWeek > 0);
  if (dir === "down") items = items.filter((i) => i.dWeek < 0);
  return [...items].sort((a, b) => Math.abs(b.dWeek) - Math.abs(a.dWeek)).slice(0, limit);
}

/** Coverage counts — used for empty-state handling and the data-coverage badge. */
export async function getCounts(): Promise<{ players: number; clubs: number; leagues: number }> {
  const db = readDb();
  const [players, clubs, leagues] = await Promise.all([
    db.from("players").select("id", { count: "exact", head: true }),
    db.from("clubs").select("id", { count: "exact", head: true }),
    db.from("leagues").select("id", { count: "exact", head: true }),
  ]);
  return { players: players.count ?? 0, clubs: clubs.count ?? 0, leagues: leagues.count ?? 0 };
}
