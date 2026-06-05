import { slugify } from "../format";
import type { TablesInsert } from "../db/types";

// ── Input shape (API-Football /players response item) ───────────────────────
export interface RawStat {
  team: { id: number | null; name: string | null };
  league: { id: number; season: number };
  games: {
    appearences?: number | null;
    minutes?: number | null;
    number?: number | null;
    position?: string | null;
    rating?: string | null;
  };
  goals: { total?: number | null; assists?: number | null };
}

export interface RawPlayer {
  player: {
    id: number;
    name: string;
    firstname?: string | null;
    lastname?: string | null;
    age?: number | null;
    birth?: { date?: string | null } | null;
    nationality?: string | null;
    height?: string | null;
  };
  statistics: RawStat[];
}

export interface NormalizedPlayer {
  player: TablesInsert<"players">;
  club: TablesInsert<"clubs">;
  stat: TablesInsert<"player_stats">;
}

const POSITION_MAP: Record<string, "GK" | "DEF" | "MID" | "FWD"> = {
  Goalkeeper: "GK",
  Defender: "DEF",
  Midfielder: "MID",
  Attacker: "FWD",
};

export function normalizePosition(apiPos: string | null | undefined): "GK" | "DEF" | "MID" | "FWD" {
  return POSITION_MAP[apiPos ?? ""] ?? "MID";
}

/** Pick the statistics entry for the swept league; fall back to the one with most minutes. */
export function pickLeagueStat(stats: RawStat[], leagueId: number): RawStat | null {
  if (!stats || stats.length === 0) return null;
  const inLeague = stats.filter((s) => s.league?.id === leagueId);
  const pool = inLeague.length ? inLeague : stats;
  return pool.reduce((best, s) => ((s.games?.minutes ?? 0) > (best.games?.minutes ?? 0) ? s : best), pool[0]);
}

/** Per-90 rate, rounded to 2 dp. Returns null when minutes are zero/absent. */
export function per90(value: number | null | undefined, minutes: number | null | undefined): number | null {
  if (!value || !minutes || minutes <= 0) return null;
  return Math.round((value / minutes) * 90 * 100) / 100;
}

export function fullName(p: RawPlayer["player"]): string {
  const joined = [p.firstname, p.lastname].filter(Boolean).join(" ").trim();
  return joined || p.name || "";
}

// Name particles that are never a distinguishing surname token.
const NAME_PARTICLES = new Set([
  "da","de","di","do","dos","das","van","von","der","den",
  "del","della","le","la","el","al","bin","ibn","ter","af","y",
]);

/**
 * Fan-facing display name: firstname + first non-particle word of lastname.
 * e.g. firstname="Kylian", lastname="Mbappé Lottin" → "Kylian Mbappé"
 *      firstname="Cody Mathès", lastname="Gakpo"     → "Cody Mathès Gakpo" (short)
 *      firstname="Alisson", lastname="Becker"         → "Alisson Becker"
 *      firstname="Vinicius", lastname=null            → "Vinicius"
 *
 * Falls back to fullName() when firstname/lastname are absent (API abbreviation).
 * Wikidata integration will override this with the authoritative known name later.
 */
export function knownAs(p: RawPlayer["player"]): string {
  const first = p.firstname?.trim() ?? "";
  const last = p.lastname?.trim() ?? "";

  if (!first && !last) return p.name?.trim() ?? "";
  if (!last) return first;
  if (!first) return last.split(/\s+/)[0]; // single-name player

  // Take first word of lastname, skipping leading particles.
  const lastWords = last.split(/\s+/);
  const meaningful = lastWords.find((w) => !NAME_PARTICLES.has(w.toLowerCase())) ?? lastWords[0];

  // If the firstname already ends with the meaningful last word (e.g. "Alisson Becker"
  // where firstname="Alisson" lastname="Becker"), avoid duplication.
  const firstWords = first.split(/\s+/);
  if (firstWords[firstWords.length - 1].toLowerCase() === meaningful.toLowerCase()) return first;

  return `${first} ${meaningful}`;
}

/** Map one API-Football player to player/club/stat insert rows. Null if no usable stats. */
export function normalizePlayer(
  raw: RawPlayer,
  leagueId: number,
  source = "api-football",
): NormalizedPlayer | null {
  const stat = pickLeagueStat(raw.statistics, leagueId);
  if (!stat) return null;
  if (!stat.team?.id || !stat.team?.name) return null; // skip players with no valid club

  const name = fullName(raw.player);
  if (!name) return null; // skip players with no usable name (no fabrication)
  const playerId = String(raw.player.id);
  const clubId = String(stat.team.id);
  const minutes = stat.games?.minutes ?? 0;
  const goals = stat.goals?.total ?? 0;
  const assists = stat.goals?.assists ?? 0;
  const heightCm = raw.player.height ? parseInt(raw.player.height, 10) || null : null;
  const rating = stat.games?.rating ? parseFloat(stat.games.rating) || null : null;

  return {
    player: {
      id: playerId,
      slug: `${slugify(name)}-${playerId}`,
      name,
      known_as: knownAs(raw.player),
      position: normalizePosition(stat.games?.position),
      detailed_pos: null,
      age: raw.player.age ?? null,
      dob: raw.player.birth?.date ?? null,
      nationality: raw.player.nationality ?? null,
      club_id: clubId,
      height_cm: heightCm,
      shirt_no: stat.games?.number ?? null,
      data_source: source,
    },
    club: {
      id: clubId,
      slug: `${slugify(stat.team.name)}-${clubId}`,
      name: stat.team.name,
      league_id: String(leagueId),
      data_source: source,
    },
    stat: {
      player_id: playerId,
      season: stat.league.season,
      apps: stat.games?.appearences ?? 0,
      minutes,
      goals,
      assists,
      goals_p90: per90(goals, minutes),
      assists_p90: per90(assists, minutes),
      rating,
      data_source: source,
    },
  };
}
