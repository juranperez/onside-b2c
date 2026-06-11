import "server-only";
import { readDb } from "../db/server";
import { clubStyle, monogram } from "../club-style";
import { onsideForecast, type Forecast } from "../forecast/onside-forecast";
import {
  toPlayerListItem,
  toPlayerProfile,
  type PlayerListItem,
  type PlayerRowDB,
  type PlayerProfile,
  type PlayerProfileRow,
} from "./map";

const PLAYER_EMBED = "id,slug,name,known_as,photo_url,position,detailed_pos,age, clubs(slug,name,short_name, leagues(slug,name))";
const PROFILE_SELECT =
  "id,slug,name,known_as,photo_url,position,detailed_pos,age,dob,nationality,height_cm,foot,shirt_no,contract_until, clubs(slug,name,short_name, leagues(slug,name)), player_valuations(value_eur,pillar_scores,confidence_pct,band_low,band_high), player_stats(season,apps,minutes,goals,assists,rating,xg,advanced)";

function reshape(r: { value_eur: number; players: unknown }): PlayerRowDB | null {
  const p = r.players as Omit<PlayerRowDB, "player_valuations"> | null;
  if (!p) return null;
  return { ...p, player_valuations: { value_eur: r.value_eur } };
}

// ─────────────────────────── Players ───────────────────────────

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

/** Top-valued players in a single position. */
export async function getPlayersByPosition(position: string, limit = 200): Promise<PlayerListItem[]> {
  const { data, error } = await readDb()
    .from("player_valuations")
    .select(`value_eur, players!inner(${PLAYER_EMBED})`)
    .eq("players.position", position)
    .order("value_eur", { ascending: false })
    .limit(limit);
  if (error) return [];
  const now = new Date();
  return (data ?? [])
    .map((r) => reshape(r as unknown as { value_eur: number; players: unknown }))
    .filter((x): x is PlayerRowDB => x !== null)
    .map((row) => toPlayerListItem(row, now));
}

/**
 * Position-balanced pool for the players browser. Loading by overall value alone
 * starved the GK/DEF filters (keepers are modelled lower, so almost none made the
 * global top-N); pulling each position's top tier guarantees every filter has depth.
 */
export async function getBrowsePlayers(): Promise<PlayerListItem[]> {
  const [fwd, mid, def, gk] = await Promise.all([
    getPlayersByPosition("FWD", 200),
    getPlayersByPosition("MID", 200),
    getPlayersByPosition("DEF", 200),
    getPlayersByPosition("GK", 200),
  ]);
  return [...fwd, ...mid, ...def, ...gk];
}

/** Biggest movers over the last week (Pulse-derived; ranked in JS over a value pool). */
export async function getMovers(limit = 8, dir: "up" | "down" | "all" = "all"): Promise<PlayerListItem[]> {
  const pool = await getTopPlayers(400);
  let items = pool;
  if (dir === "up") items = items.filter((i) => i.dWeek > 0);
  if (dir === "down") items = items.filter((i) => i.dWeek < 0);
  return [...items].sort((a, b) => Math.abs(b.dWeek) - Math.abs(a.dWeek)).slice(0, limit);
}

export async function getPlayerBySlug(slug: string): Promise<PlayerProfile | null> {
  const { data, error } = await readDb().from("players").select(PROFILE_SELECT).eq("slug", slug).limit(1).maybeSingle();
  if (error || !data) return null;
  return toPlayerProfile(data as unknown as PlayerProfileRow);
}

/** Players in the same position within a value band (for "similar players"). */
export async function getSimilarPlayers(profile: PlayerProfile, limit = 6): Promise<PlayerListItem[]> {
  const anchorM = profile.value / 1e6;
  const { data, error } = await readDb()
    .from("player_valuations")
    .select(`value_eur, players!inner(${PLAYER_EMBED})`)
    .eq("players.position", profile.position)
    .gte("value_eur", Math.round(profile.value * 0.55))
    .lte("value_eur", Math.round(profile.value * 1.9))
    .limit(40);
  if (error) return [];
  return (data ?? [])
    .map((r) => reshape(r as unknown as { value_eur: number; players: unknown }))
    .filter((x): x is PlayerRowDB => x !== null)
    .map((row) => toPlayerListItem(row))
    .filter((p) => p.slug !== profile.slug)
    .sort((a, b) => Math.abs(a.val - anchorM) - Math.abs(b.val - anchorM))
    .slice(0, limit);
}

// ─────────────────────────── Clubs ───────────────────────────

export interface ClubSummary {
  slug: string;
  name: string;
  short: string;
  bg: string;
  color: string;
  squadValueM: number;
  league: string;
  leagueSlug: string;
}

export interface ClubProfile extends Omit<ClubSummary, never> {
  country: string | null;
  stadium: string | null;
  squad: PlayerListItem[];
}

function toClubSummary(c: {
  slug: string;
  name: string;
  short_name: string | null;
  squad_value: number | null;
  leagues: { slug: string; name: string } | null;
}): ClubSummary {
  const style = clubStyle(c.slug);
  return {
    slug: c.slug,
    name: c.name,
    short: c.short_name ?? monogram(c.name),
    bg: style.bg,
    color: style.color,
    squadValueM: Math.round((c.squad_value ?? 0) / 1e6),
    league: c.leagues?.name ?? "—",
    leagueSlug: c.leagues?.slug ?? "",
  };
}

export async function getClubsRanked(limit = 120): Promise<ClubSummary[]> {
  const { data, error } = await readDb()
    .from("clubs")
    .select("slug,name,short_name,squad_value, leagues(slug,name)")
    .order("squad_value", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => toClubSummary(c as never));
}

export async function getClubBySlug(slug: string): Promise<ClubProfile | null> {
  const { data, error } = await readDb()
    .from("clubs")
    .select(
      "id,slug,name,short_name,country,stadium,squad_value, leagues(slug,name), players(id,slug,name,position,age, player_valuations(value_eur))",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  const c = data as never as {
    slug: string;
    name: string;
    short_name: string | null;
    country: string | null;
    stadium: string | null;
    squad_value: number | null;
    leagues: { slug: string; name: string } | null;
    players: Array<Omit<PlayerRowDB, "clubs">>;
  };
  const now = new Date();
  const squad = (c.players ?? [])
    .map((p) =>
      toPlayerListItem(
        { ...p, clubs: { slug: c.slug, name: c.name, short_name: c.short_name, leagues: c.leagues } },
        now,
      ),
    )
    .sort((a, b) => b.val - a.val);
  return { ...toClubSummary(c as never), country: c.country, stadium: c.stadium, squad };
}

// ─────────────────────────── Leagues ───────────────────────────

export interface LeagueSummary {
  slug: string;
  name: string;
  country: string | null;
  totalValueM: number;
  clubCount: number;
}

export interface LeagueProfile extends LeagueSummary {
  clubs: ClubSummary[];
}

function toLeagueSummary(l: { slug: string; name: string; country: string | null; total_value: number | null; club_count: number | null }): LeagueSummary {
  return {
    slug: l.slug,
    name: l.name,
    country: l.country,
    totalValueM: Math.round((l.total_value ?? 0) / 1e6),
    clubCount: l.club_count ?? 0,
  };
}

export async function getLeagues(): Promise<LeagueSummary[]> {
  const { data, error } = await readDb()
    .from("leagues")
    .select("slug,name,country,total_value,club_count")
    .order("total_value", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => toLeagueSummary(l as never));
}

export async function getLeagueBySlug(slug: string): Promise<LeagueProfile | null> {
  const { data, error } = await readDb()
    .from("leagues")
    .select("id,slug,name,country,total_value,club_count")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  const l = data as never as { id: string; slug: string; name: string; country: string | null; total_value: number | null; club_count: number | null };
  const { data: clubsData } = await readDb()
    .from("clubs")
    .select("slug,name,short_name,squad_value, leagues(slug,name)")
    .eq("league_id", l.id)
    .order("squad_value", { ascending: false });
  const clubs = (clubsData ?? []).map((c) => toClubSummary(c as never));
  return { ...toLeagueSummary(l as never), clubs };
}

// ─────────────────────────── Search ───────────────────────────

export interface SearchResults {
  players: PlayerListItem[];
  clubs: ClubSummary[];
  leagues: LeagueSummary[];
}

/**
 * Normalize a query for matching against the folded `name_norm` columns: strip
 * accents (so "mbappe" matches "Mbappé"), fold a few non-decomposable letters,
 * lowercase, and escape LIKE wildcards so literal "%"/"_" don't act as globs.
 */
function normalizeSearchTerm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/gi, "o")
    .replace(/ł/gi, "l")
    .replace(/đ/gi, "d")
    .replace(/æ/gi, "ae")
    .replace(/œ/gi, "oe")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function searchAll(q: string): Promise<SearchResults> {
  const term = normalizeSearchTerm(q.trim());
  if (!term) return { players: [], clubs: [], leagues: [] };
  const pat = `%${term}%`;
  const db = readDb();
  const [pl, cl, lg] = await Promise.all([
    db.from("players").select(`${PLAYER_EMBED}, player_valuations(value_eur)`).ilike("name_norm", pat).limit(24),
    db.from("clubs").select("slug,name,short_name,squad_value, leagues(slug,name)").ilike("name_norm", pat).limit(8),
    db.from("leagues").select("slug,name,country,total_value,club_count").ilike("name_norm", pat).limit(5),
  ]);
  const now = new Date();
  return {
    // Rank players by live value so the most notable matches surface first.
    players: (pl.data ?? [])
      .map((r) => toPlayerListItem(r as unknown as PlayerRowDB, now))
      .sort((a, b) => b.val - a.val)
      .slice(0, 12),
    clubs: (cl.data ?? []).map((c) => toClubSummary(c as never)),
    leagues: (lg.data ?? []).map((l) => toLeagueSummary(l as never)),
  };
}

// ─────────────────────────── World Cup ───────────────────────────

export interface NationalTeamSummary {
  slug: string;
  name: string;
  confederation: string | null;
  fifaRank: number | null;
  group: string | null;
  squadValueM: number;
}

export interface NationalTeamProfile extends NationalTeamSummary {
  squad: PlayerListItem[];
}

function toNationSummary(t: { slug: string; name: string; confederation: string | null; fifa_rank: number | null; group_letter: string | null; squad_value: number | null }): NationalTeamSummary {
  return {
    slug: t.slug,
    name: t.name,
    confederation: t.confederation,
    fifaRank: t.fifa_rank,
    group: t.group_letter,
    squadValueM: Math.round((t.squad_value ?? 0) / 1e6),
  };
}

export async function getNationalTeams(): Promise<NationalTeamSummary[]> {
  const { data, error } = await readDb()
    .from("national_teams")
    .select("slug,name,confederation,fifa_rank,group_letter,squad_value")
    .order("squad_value", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => toNationSummary(t as never));
}

export async function getNationalTeamBySlug(slug: string): Promise<NationalTeamProfile | null> {
  const { data, error } = await readDb()
    .from("national_teams")
    .select(
      "slug,name,confederation,fifa_rank,group_letter,squad_value, national_team_squads(players(id,slug,name,position,age, clubs(slug,name,short_name, leagues(slug,name)), player_valuations(value_eur)))",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  const t = data as never as {
    slug: string;
    name: string;
    confederation: string | null;
    fifa_rank: number | null;
    group_letter: string | null;
    squad_value: number | null;
    national_team_squads: Array<{ players: PlayerRowDB | null }>;
  };
  const now = new Date();
  const squad = (t.national_team_squads ?? [])
    .map((s) => s.players)
    .filter((p): p is PlayerRowDB => p !== null)
    .map((p) => toPlayerListItem(p, now))
    .sort((a, b) => b.val - a.val);
  return { ...toNationSummary(t as never), squad };
}

// ─────────────────────────── Stat leaders ───────────────────────────

export interface StatLeader {
  slug: string;
  name: string;
  displayName: string;
  photoUrl: string | null;
  club: string;
  clubBg: string;
  clubColor: string;
  statValue: number;
  valueM: number;
}

export async function getStatLeaders(metric: "goals" | "assists" | "rating" | "xg", limit = 25): Promise<StatLeader[]> {
  const { data, error } = await readDb()
    .from("player_stats")
    .select(`${metric}, players!inner(slug,name,known_as,photo_url, clubs(slug,name), player_valuations(value_eur))`)
    .not(metric, "is", null)
    .order(metric, { ascending: false })
    .limit(limit);
  if (error) return [];
  const rows = (data ?? []) as unknown as Array<
    Record<string, number | null> & {
      players: { slug: string; name: string; known_as: string | null; photo_url: string | null; clubs: { slug: string; name: string } | null; player_valuations: { value_eur: number } | null };
    }
  >;
  return rows.map((row) => {
    const style = clubStyle(row.players.clubs?.slug ?? row.players.slug);
    return {
      slug: row.players.slug,
      name: row.players.name,
      displayName: row.players.known_as ?? row.players.name,
      photoUrl: row.players.photo_url ?? null,
      club: row.players.clubs?.name ?? "—",
      clubBg: style.bg,
      clubColor: style.color,
      statValue: Math.round((row[metric] ?? 0) * 100) / 100,
      valueM: Math.round((row.players.player_valuations?.value_eur ?? 0) / 1e6),
    };
  });
}

// ─────────────────────────── League tables & scorers ───────────────────────────

export interface StandingRow {
  position: number;
  clubSlug: string | null;
  clubName: string;
  played: number | null;
  won: number | null;
  draw: number | null;
  lost: number | null;
  gd: number | null;
  points: number | null;
  squadValueM: number | null;
}

/** The league table (Sportmonks, daily refresh), with each club's Onside squad value attached. */
export async function getLeagueStandings(leagueSlug: string): Promise<StandingRow[]> {
  const db = readDb();
  const { data: lg } = await db.from("leagues").select("id").eq("slug", leagueSlug).maybeSingle();
  if (!lg) return [];
  const { data } = await db
    .from("league_standings")
    .select("position,club_id,club_name,played,won,draw,lost,gf,ga,points, clubs(slug,squad_value)")
    .eq("league_id", lg.id)
    .order("position", { ascending: true });
  return (data ?? []).map((r) => {
    const c = r.clubs as unknown as { slug: string; squad_value: number | null } | null;
    return {
      position: r.position,
      clubSlug: c?.slug ?? null,
      clubName: r.club_name,
      played: r.played,
      won: r.won,
      draw: r.draw,
      lost: r.lost,
      gd: r.gf != null && r.ga != null ? r.gf - r.ga : null,
      points: r.points,
      squadValueM: c?.squad_value != null ? Math.round(c.squad_value / 1e6) : null,
    };
  });
}

export interface LeagueScorer {
  slug: string;
  displayName: string;
  club: string;
  goals: number;
  assists: number;
  valueM: number;
  photoUrl: string | null;
  clubBg: string;
  clubColor: string;
}

/** Top scorers from OUR stats (already synced) — stays consistent with profiles. */
export async function getLeagueTopScorers(leagueSlug: string, limit = 10): Promise<LeagueScorer[]> {
  const db = readDb();
  const { data: lg } = await db.from("leagues").select("id").eq("slug", leagueSlug).maybeSingle();
  if (!lg) return [];
  const { data } = await db
    .from("player_stats")
    .select("goals,assists, players!inner(slug,name,known_as,photo_url, player_valuations(value_eur), clubs!inner(name,slug,league_id))")
    .eq("players.clubs.league_id", lg.id)
    .not("goals", "is", null)
    .order("goals", { ascending: false })
    .limit(limit);
  type Row = {
    goals: number | null;
    assists: number | null;
    players: {
      slug: string;
      name: string;
      known_as: string | null;
      photo_url: string | null;
      player_valuations: { value_eur: number } | null;
      clubs: { name: string; slug: string } | null;
    };
  };
  return ((data ?? []) as unknown as Row[]).map((r) => {
    const style = clubStyle(r.players.clubs?.slug ?? r.players.slug);
    return {
      slug: r.players.slug,
      displayName: r.players.known_as ?? r.players.name,
      club: r.players.clubs?.name ?? "—",
      goals: r.goals ?? 0,
      assists: r.assists ?? 0,
      valueM: Math.round((r.players.player_valuations?.value_eur ?? 0) / 1e6),
      photoUrl: r.players.photo_url ?? null,
      clubBg: style.bg,
      clubColor: style.color,
    };
  });
}

// ─────────────────────────── Club fixtures ───────────────────────────

export interface ClubFixtureItem {
  id: string;
  kickoff: string | null;
  status: string;
  round: string | null;
  homeName: string;
  awayName: string;
  scoreHome: number | null;
  scoreAway: number | null;
  isHome: boolean;
  result: "W" | "D" | "L" | null; // from this club's perspective, finished games only
}

/** Last `past` results + next `next` fixtures for a club (Sportmonks schedules, daily refresh). */
export async function getClubFixtures(clubSlug: string, past = 5, next = 5): Promise<{ results: ClubFixtureItem[]; upcoming: ClubFixtureItem[] }> {
  const db = readDb();
  const { data: club } = await db.from("clubs").select("id").eq("slug", clubSlug).maybeSingle();
  if (!club) return { results: [], upcoming: [] };

  const base = () => db.from("club_fixtures").select("id,kickoff,status,round,home_club_id,home_name,away_name,score_home,score_away").or(`home_club_id.eq.${club.id},away_club_id.eq.${club.id}`);
  const [fin, up] = await Promise.all([
    base().eq("status", "finished").order("kickoff", { ascending: false }).limit(past),
    base().in("status", ["scheduled", "live"]).gte("kickoff", new Date(Date.now() - 6 * 3600_000).toISOString()).order("kickoff", { ascending: true }).limit(next),
  ]);

  const shape = (r: NonNullable<typeof fin.data>[number]): ClubFixtureItem => {
    const isHome = r.home_club_id === club.id;
    let result: ClubFixtureItem["result"] = null;
    if (r.status === "finished" && r.score_home != null && r.score_away != null) {
      const us = isHome ? r.score_home : r.score_away;
      const them = isHome ? r.score_away : r.score_home;
      result = us > them ? "W" : us < them ? "L" : "D";
    }
    return {
      id: r.id,
      kickoff: r.kickoff,
      status: r.status,
      round: r.round,
      homeName: r.home_name,
      awayName: r.away_name,
      scoreHome: r.score_home,
      scoreAway: r.score_away,
      isHome,
      result,
    };
  };
  return { results: (fin.data ?? []).map(shape), upcoming: (up.data ?? []).map(shape) };
}

// ─────────────────────────── Injuries ───────────────────────────

export interface ActiveInjury {
  category: string;
  startDate: string | null;
  endDate: string | null;
}

/** The player's current sidelined spell, if any (Sportmonks, refreshed daily). */
export async function getActiveInjury(playerId: string): Promise<ActiveInjury | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await readDb()
    .from("player_injuries")
    .select("category,start_date,end_date")
    .eq("player_id", playerId)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { category: data.category, startDate: data.start_date, endDate: data.end_date } : null;
}

// ─────────────────────────── Coverage ───────────────────────────

export async function getCounts(): Promise<{ players: number; clubs: number; leagues: number }> {
  const db = readDb();
  const [players, clubs, leagues] = await Promise.all([
    db.from("players").select("id", { count: "exact", head: true }),
    db.from("clubs").select("id", { count: "exact", head: true }),
    db.from("leagues").select("id", { count: "exact", head: true }),
  ]);
  return { players: players.count ?? 0, clubs: clubs.count ?? 0, leagues: leagues.count ?? 0 };
}

// ─────────────────────────── World Cup fixtures ───────────────────────────

export type FixtureStatus = "scheduled" | "live" | "finished" | "postponed";

export interface WcFixture {
  id: string;
  kickoff: string | null;
  round: string | null;
  status: FixtureStatus;
  venue: string | null;
  city: string | null;
  home: { slug: string; name: string };
  away: { slug: string; name: string };
  scoreHome: number | null;
  scoreAway: number | null;
  forecast: Forecast | null; // Onside Forecast (squad-value-led); null when teams unknown or played
}

/** The full World Cup 2026 schedule, chronological. Teams joined in JS (home/away → national_teams). */
export async function getWcFixtures(): Promise<WcFixture[]> {
  const db = readDb();
  const [fxRes, ntRes] = await Promise.all([
    db
      .from("fixtures")
      .select("id,kickoff,round,status,venue,city,home_id,away_id,score_home,score_away")
      .eq("competition", "World Cup 2026")
      .order("kickoff", { ascending: true }),
    db.from("national_teams").select("slug,name,squad_value,fifa_rank"),
  ]);
  if (fxRes.error) throw new Error(fxRes.error.message);
  const metaBySlug = new Map(
    (ntRes.data ?? []).map((n) => [n.slug, { name: n.name, value: n.squad_value, rank: n.fifa_rank }] as const),
  );
  const team = (slug: string | null) => ({ slug: slug ?? "", name: (slug && metaBySlug.get(slug)?.name) || "TBD" });
  return (fxRes.data ?? []).map((f) => {
    const h = f.home_id ? metaBySlug.get(f.home_id) : null;
    const a = f.away_id ? metaBySlug.get(f.away_id) : null;
    const status = (f.status as FixtureStatus) ?? "scheduled";
    // Forecast only for upcoming fixtures with both squads valued (neutral WC venues).
    const forecast =
      status !== "finished" && h?.value && a?.value
        ? onsideForecast({ homeValueEur: Number(h.value), awayValueEur: Number(a.value), homeRank: h.rank, awayRank: a.rank, neutral: true })
        : null;
    return {
      id: f.id,
      kickoff: f.kickoff,
      round: f.round,
      status,
      venue: f.venue,
      city: f.city,
      home: team(f.home_id),
      away: team(f.away_id),
      scoreHome: f.score_home,
      scoreAway: f.score_away,
      forecast,
    };
  });
}
