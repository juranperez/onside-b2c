import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "../db/types";
import { SPORTMONKS_BASE, SPORTMONKS_LEAGUE } from "./sportmonks";

/**
 * League tables (data build #3): Sportmonks standings per covered league's
 * current season → league_standings, clubs linked by folded name so rows click
 * through to our hubs. Full replace per league; daily cron (live matchday
 * cadence can ride the same code later).
 */

interface SmDetail {
  value: number | null;
  type?: { name?: string | null } | null;
}
interface SmStandingRow {
  position: number | null;
  points: number | null;
  participant?: { name?: string | null } | null;
  group?: { name?: string | null } | null; // conference/group leagues (MLS East/West)
  details?: SmDetail[] | null;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Sportmonks type names → our columns ("Overal Goals Scored" typo is theirs).
function detail(row: SmStandingRow, prefix: string): number | null {
  const d = (row.details ?? []).find((x) => x.type?.name?.toLowerCase().startsWith(prefix));
  return d?.value ?? null;
}

export interface StandingsSyncResult {
  leagues: number;
  rows: number;
  clubsLinked: number;
}

export async function syncStandings(db: SupabaseClient<Database>): Promise<StandingsSyncResult> {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) throw new Error("SPORTMONKS_API_TOKEN is not set");
  const auth = { headers: { Authorization: token, Accept: "application/json" } };

  // Our league ids by slug + clubs by folded name for linkage.
  const { data: leagueRows } = await db.from("leagues").select("id,slug");
  const leagueIdBySlug = new Map((leagueRows ?? []).map((l) => [l.slug, l.id]));
  const { data: clubRows } = await db.from("clubs").select("id,name");
  const clubByFold = new Map((clubRows ?? []).map((c) => [fold(c.name), c.id]));

  const out: StandingsSyncResult = { leagues: 0, rows: 0, clubsLinked: 0 };

  for (const [slug, smLeagueId] of Object.entries(SPORTMONKS_LEAGUE)) {
    const ourLeagueId = leagueIdBySlug.get(slug);
    if (!ourLeagueId) continue;
    try {
      const lr = await fetch(`${SPORTMONKS_BASE}/leagues/${smLeagueId}?include=currentSeason`, auth);
      if (!lr.ok) continue;
      const lj = (await lr.json()) as { data?: { currentseason?: { id?: number }; currentSeason?: { id?: number } } };
      const sid = lj.data?.currentseason?.id ?? lj.data?.currentSeason?.id;
      if (!sid) continue;

      const sr = await fetch(`${SPORTMONKS_BASE}/standings/seasons/${sid}?include=participant;details.type;group`, auth);
      if (!sr.ok) continue;
      const sj = (await sr.json()) as { data?: SmStandingRow[] };
      const rows: TablesInsert<"league_standings">[] = [];
      for (const r of sj.data ?? []) {
        if (!r.position || !r.participant?.name) continue;
        const clubId = clubByFold.get(fold(r.participant.name)) ?? null;
        if (clubId) out.clubsLinked++;
        rows.push({
          league_id: ourLeagueId,
          position: r.position,
          club_id: clubId,
          club_name: r.participant.name,
          group_name: r.group?.name ?? null,
          played: detail(r, "overall matches"),
          won: detail(r, "overall won"),
          draw: detail(r, "overall draw"),
          lost: detail(r, "overall lost"),
          gf: detail(r, "overal goals scored") ?? detail(r, "overall goals scored"),
          ga: detail(r, "overall goals conceded"),
          points: r.points,
        });
      }
      if (!rows.length) continue;
      await db.from("league_standings").delete().eq("league_id", ourLeagueId);
      const { error } = await db.from("league_standings").insert(rows);
      if (!error) {
        out.leagues++;
        out.rows += rows.length;
      }
    } catch {
      // one league failing must not sink the sweep — daily run self-heals
    }
  }
  return out;
}
