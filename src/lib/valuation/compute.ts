import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "../db/types";
import { valuePlayer, MODEL_VERSION, type Position } from "./model";

type DB = SupabaseClient<Database>;
type Log = (m: string) => void;

function chunk<T>(a: T[], n: number): T[][] {
  const o: T[][] = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
}

interface StatRow {
  season: number;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  rating: number | null;
}
interface PlayerRow {
  id: string;
  position: string | null;
  age: number | null;
  contract_until: number | null;
  club_id: string | null;
  player_stats: StatRow[];
}

function latestStat(rows: StatRow[]): StatRow | null {
  if (!rows || rows.length === 0) return null;
  return rows.reduce((b, s) => (s.season > b.season ? s : b), rows[0]);
}

/**
 * Value every player, store anchors in player_valuations, and roll up club
 * squad_value + league total_value/club_count. Anchors are stable; daily
 * movement is derived from the Pulse at read time (no cron needed).
 */
export async function computeAll(db: DB, log: Log = () => {}): Promise<{ valued: number; clubs: number; leagues: number }> {
  const { data: leagues } = await db.from("leagues").select("id,slug");
  const leagueSlug = new Map((leagues ?? []).map((l) => [l.id, l.slug]));
  const { data: clubs } = await db.from("clubs").select("id,league_id");
  const clubLeague = new Map((clubs ?? []).map((c) => [c.id, c.league_id]));

  const valuations: TablesInsert<"player_valuations">[] = [];
  const clubValue = new Map<string, number>();
  let from = 0;
  const PAGE = 1000;
  let valued = 0;

  for (;;) {
    const { data, error } = await db
      .from("players")
      .select("id,position,age,contract_until,club_id, player_stats(season,minutes,goals,assists,rating)")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const players = (data ?? []) as unknown as PlayerRow[];
    if (players.length === 0) break;

    for (const p of players) {
      const stat = latestStat(p.player_stats);
      const leagueId = p.club_id ? clubLeague.get(p.club_id) ?? null : null;
      const slug = leagueId ? leagueSlug.get(leagueId) ?? "" : "";
      const v = valuePlayer({
        position: (p.position as Position) ?? "MID",
        age: p.age,
        leagueSlug: slug,
        minutes: stat?.minutes ?? 0,
        goals: stat?.goals ?? 0,
        assists: stat?.assists ?? 0,
        rating: stat?.rating ?? null,
        contractUntil: p.contract_until,
      });
      valuations.push({
        player_id: p.id,
        value_eur: v.value,
        pillar_scores: { ...v.pillars, score: v.score },
        confidence_pct: v.confidence,
        band_low: v.bandLow,
        band_high: v.bandHigh,
        model_version: MODEL_VERSION,
      });
      if (p.club_id) clubValue.set(p.club_id, (clubValue.get(p.club_id) ?? 0) + v.value);
      valued++;
    }
    log(`[value] ${valued} players valued...`);
    from += PAGE;
  }

  for (const c of chunk(valuations, 500)) {
    const { error } = await db.from("player_valuations").upsert(c, { onConflict: "player_id" });
    if (error) throw new Error(error.message);
  }

  // Club squad values.
  for (const [clubId, total] of clubValue) {
    await db.from("clubs").update({ squad_value: total }).eq("id", clubId);
  }

  // League totals + club counts.
  const leagueTotal = new Map<string, number>();
  const leagueClubs = new Map<string, number>();
  for (const [clubId, total] of clubValue) {
    const lid = clubLeague.get(clubId);
    if (!lid) continue;
    leagueTotal.set(lid, (leagueTotal.get(lid) ?? 0) + total);
    leagueClubs.set(lid, (leagueClubs.get(lid) ?? 0) + 1);
  }
  for (const [lid, total] of leagueTotal) {
    await db.from("leagues").update({ total_value: total, club_count: leagueClubs.get(lid) ?? 0 }).eq("id", lid);
  }

  log(`[value] done: ${valued} valuations across ${clubValue.size} clubs, ${leagueTotal.size} leagues`);
  return { valued, clubs: clubValue.size, leagues: leagueTotal.size };
}
