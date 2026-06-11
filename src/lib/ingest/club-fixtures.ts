import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "../db/types";
import { SPORTMONKS_BASE, SPORTMONKS_LEAGUE } from "./sportmonks";

/**
 * Club fixtures & results (data build #4): each covered league's current-season
 * schedule (stages → rounds → fixtures) flattened into club_fixtures. Daily
 * refresh keeps scores/postponements honest; the match centre reads from here.
 */

interface SmScore {
  description?: string | null;
  score?: { goals?: number | null; participant?: string | null } | null;
}
interface SmParticipant {
  name?: string | null;
  meta?: { location?: string | null } | null;
}
interface SmFixture {
  id: number;
  starting_at?: string | null;
  state_id?: number | null;
  participants?: SmParticipant[] | null;
  scores?: SmScore[] | null;
}
interface SmRound {
  name?: string | number | null;
  fixtures?: SmFixture[] | null;
}
interface SmStage {
  name?: string | null;
  rounds?: SmRound[] | null;
  fixtures?: SmFixture[] | null; // cup stages sometimes carry fixtures directly
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Sportmonks state_id → coarse lifecycle. Unknown ids degrade by kickoff time.
function stateOf(stateId: number | null | undefined, kickoffIso: string | null): string {
  if (stateId != null) {
    if (stateId === 1) return "scheduled";
    if ([5, 7, 8].includes(stateId)) return "finished";
    if ([2, 3, 4, 6, 9, 22].includes(stateId)) return "live";
    if ([10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 25, 26].includes(stateId)) return "postponed";
  }
  if (kickoffIso && new Date(kickoffIso).getTime() < Date.now() - 3 * 3600_000) return "finished";
  return "scheduled";
}

function finalGoals(scores: SmScore[] | null | undefined, side: "home" | "away"): number | null {
  if (!scores?.length) return null;
  const pick = (desc: string) => scores.find((s) => s.description === desc && s.score?.participant === side)?.score?.goals;
  return pick("CURRENT") ?? pick("FT") ?? pick("2ND_HALF") ?? null;
}

export interface ClubFixtureSyncResult {
  leagues: number;
  fixtures: number;
  clubsLinked: number;
}

export async function syncClubFixtures(db: SupabaseClient<Database>): Promise<ClubFixtureSyncResult> {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) throw new Error("SPORTMONKS_API_TOKEN is not set");
  const auth = { headers: { Authorization: token, Accept: "application/json" } };

  const { data: leagueRows } = await db.from("leagues").select("id,slug");
  const leagueIdBySlug = new Map((leagueRows ?? []).map((l) => [l.slug, l.id]));
  const { data: clubRows } = await db.from("clubs").select("id,name");
  const clubByFold = new Map((clubRows ?? []).map((c) => [fold(c.name), c.id]));

  const out: ClubFixtureSyncResult = { leagues: 0, fixtures: 0, clubsLinked: 0 };

  for (const [slug, smLeagueId] of Object.entries(SPORTMONKS_LEAGUE)) {
    const ourLeagueId = leagueIdBySlug.get(slug);
    if (!ourLeagueId) continue;
    try {
      const lr = await fetch(`${SPORTMONKS_BASE}/leagues/${smLeagueId}?include=currentSeason`, auth);
      if (!lr.ok) continue;
      const lj = (await lr.json()) as { data?: { currentseason?: { id?: number }; currentSeason?: { id?: number } } };
      const sid = lj.data?.currentseason?.id ?? lj.data?.currentSeason?.id;
      if (!sid) continue;

      const sr = await fetch(`${SPORTMONKS_BASE}/schedules/seasons/${sid}`, auth);
      if (!sr.ok) continue;
      const sj = (await sr.json()) as { data?: SmStage[] };

      const rows: TablesInsert<"club_fixtures">[] = [];
      for (const stage of sj.data ?? []) {
        const buckets: { round: string | null; fixtures: SmFixture[] }[] = [];
        for (const r of stage.rounds ?? []) buckets.push({ round: r.name != null ? String(r.name) : null, fixtures: r.fixtures ?? [] });
        if (stage.fixtures?.length) buckets.push({ round: stage.name ?? null, fixtures: stage.fixtures });

        for (const b of buckets) {
          for (const f of b.fixtures) {
            const home = f.participants?.find((p) => p.meta?.location === "home");
            const away = f.participants?.find((p) => p.meta?.location === "away");
            if (!home?.name || !away?.name) continue;
            const kickoff = f.starting_at ? new Date(`${f.starting_at.replace(" ", "T")}Z`).toISOString() : null;
            const homeId = clubByFold.get(fold(home.name)) ?? null;
            const awayId = clubByFold.get(fold(away.name)) ?? null;
            if (homeId) out.clubsLinked++;
            if (awayId) out.clubsLinked++;
            rows.push({
              id: `sm-${f.id}`,
              league_id: ourLeagueId,
              kickoff,
              status: stateOf(f.state_id, kickoff),
              round: b.round,
              home_club_id: homeId,
              away_club_id: awayId,
              home_name: home.name,
              away_name: away.name,
              score_home: finalGoals(f.scores, "home"),
              score_away: finalGoals(f.scores, "away"),
              sm_id: f.id,
            });
          }
        }
      }
      if (!rows.length) continue;
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db.from("club_fixtures").upsert(rows.slice(i, i + 500), { onConflict: "id" });
        if (error) throw new Error(error.message);
      }
      out.leagues++;
      out.fixtures += rows.length;
    } catch {
      // one league failing must not sink the sweep
    }
  }
  return out;
}
