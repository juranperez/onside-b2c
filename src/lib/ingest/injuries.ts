import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "../db/types";
import { SPORTMONKS_BASE, SPORTMONKS_LEAGUE } from "./sportmonks";

/**
 * Sidelined/injury sync (data build #2): every covered league's current-season
 * teams with their sidelined lists → current injury state per known player.
 * Full daily refresh: rows are replaced, reads filter to active spells.
 * Budget: 14 league lookups + ~1 page of teams per season — trivial vs 3000/hr.
 */

interface SmSidelined {
  player_id: number | null;
  category?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  type?: { name?: string | null } | null;
}
interface SmTeam {
  id: number;
  name: string;
  sidelined?: SmSidelined[] | null;
}

export interface InjurySyncResult {
  leagues: number;
  teams: number;
  sidelinedRows: number;
  matchedPlayers: number;
  inserted: number;
}

export async function syncInjuries(db: SupabaseClient<Database>): Promise<InjurySyncResult> {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) throw new Error("SPORTMONKS_API_TOKEN is not set");
  const auth = { headers: { Authorization: token, Accept: "application/json" } };

  const out: InjurySyncResult = { leagues: 0, teams: 0, sidelinedRows: 0, matchedPlayers: 0, inserted: 0 };
  const today = new Date().toISOString().slice(0, 10);

  // League → current season id.
  const seasonIds: number[] = [];
  for (const leagueId of Object.values(SPORTMONKS_LEAGUE)) {
    try {
      const r = await fetch(`${SPORTMONKS_BASE}/leagues/${leagueId}?include=currentSeason`, auth);
      if (!r.ok) continue;
      const j = (await r.json()) as { data?: { currentseason?: { id?: number }; currentSeason?: { id?: number } } };
      const sid = j.data?.currentseason?.id ?? j.data?.currentSeason?.id;
      if (sid) {
        seasonIds.push(sid);
        out.leagues++;
      }
    } catch {
      // league lookup failed — skip, the daily run self-heals
    }
  }

  // Teams (with sidelined) per season.
  const spells: SmSidelined[] = [];
  for (const sid of seasonIds) {
    for (let page = 1; page <= 3; page++) {
      let j: { data?: SmTeam[]; pagination?: { has_more?: boolean } };
      try {
        const r = await fetch(`${SPORTMONKS_BASE}/teams/seasons/${sid}?include=sidelined&per_page=50&page=${page}`, auth);
        if (!r.ok) break;
        j = (await r.json()) as typeof j;
      } catch {
        break;
      }
      for (const team of j.data ?? []) {
        out.teams++;
        for (const s of team.sidelined ?? []) {
          // Only current spells: open-ended or ending today/later.
          if (!s.player_id) continue;
          if (s.end_date && s.end_date < today) continue;
          spells.push(s);
        }
      }
      if (!j.pagination?.has_more) break;
    }
  }
  out.sidelinedRows = spells.length;
  if (!spells.length) return out;

  // Map to our players via sportmonks_id.
  const smIds = [...new Set(spells.map((s) => String(s.player_id)))];
  const bynSm = new Map<string, string>();
  for (let i = 0; i < smIds.length; i += 200) {
    const { data } = await db.from("players").select("id,sportmonks_id").in("sportmonks_id", smIds.slice(i, i + 200));
    for (const p of data ?? []) if (p.sportmonks_id) bynSm.set(p.sportmonks_id, p.id);
  }

  const rows: TablesInsert<"player_injuries">[] = [];
  const seen = new Set<string>();
  for (const s of spells) {
    const ours = bynSm.get(String(s.player_id));
    if (!ours) continue;
    const category = (s.category ?? s.type?.name ?? "injury").toLowerCase().slice(0, 60);
    const start = s.start_date ?? today;
    const key = `${ours}|${category}|${start}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ player_id: ours, category, start_date: start, end_date: s.end_date ?? null, source: "sportmonks" });
  }
  out.matchedPlayers = new Set(rows.map((r) => r.player_id)).size;

  // Full refresh: yesterday's state out, today's in.
  await db.from("player_injuries").delete().eq("source", "sportmonks");
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from("player_injuries").insert(rows.slice(i, i + 500));
    if (!error) out.inserted += Math.min(500, rows.length - i);
  }
  return out;
}
