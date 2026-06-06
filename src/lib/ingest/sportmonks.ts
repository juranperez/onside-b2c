// Sportmonks integration config — validated live against the API 2026-06-06
// (Pro + Advanced xG trial). Used by scripts/sync-sportmonks.ts.
//
// Architecture: xG is per-fixture (not season), so the sync is fixture-driven —
// pull a league season's finished fixtures with lineup details, aggregate each
// player's xG + minutes across appearances, compute season totals + per-90.

export const SPORTMONKS_BASE = "https://api.sportmonks.com/v3/football";

// B2C league slug → Sportmonks league id (disambiguated by country).
// The 14 currently-synced leagues. Phase-1 expansion leagues added when synced.
export const SPORTMONKS_LEAGUE: Record<string, number> = {
  "premier-league": 8,
  "la-liga": 564,
  "bundesliga": 82,
  "serie-a": 384,
  "ligue-1": 301,
  "eredivisie": 72,
  "primeira-liga": 462,
  "championship": 9,
  "super-lig": 600,
  "saudi-pro-league": 208, // "Pro League" — verify country before trusting Saudi clubs
  "primera-division-arg": 636, // "Liga Profesional de Fútbol"
  "liga-mx": 743,
  "mls": 779, // "Major League Soccer"
  "brasileirao": 648, // "Serie A" (Brazil)
};

// Sportmonks detailed_position_id → Onside canonical position code.
// This is the source-level fix for the LW/RW filter bug (152/156).
export const DETAILED_POSITION: Record<number, string> = {
  24: "GK",
  148: "CB",
  154: "RB",
  155: "LB",
  149: "CDM",
  153: "CM",
  157: "LM",
  158: "RM",
  150: "CAM",
  152: "LW",
  156: "RW",
  163: "SS",
  151: "ST", // Centre Forward
  // coarse fallbacks (when only position_id is present)
  25: "CB",
  26: "CM",
  27: "ST",
};

// Canonical code → coarse bucket (matches the existing players.position vocabulary).
export const COARSE_OF: Record<string, "GK" | "DEF" | "MID" | "FWD"> = {
  GK: "GK",
  CB: "DEF", RB: "DEF", LB: "DEF",
  CDM: "MID", CM: "MID", CAM: "MID", LM: "MID", RM: "MID",
  LW: "FWD", RW: "FWD", SS: "FWD", ST: "FWD",
};

// Sportmonks lineup-detail stat type ids (from /fixtures/{id}?include=lineups.details.type).
export const STAT = {
  GOALS: 52,
  ASSISTS: 79,
  MINUTES: 119,
  RATING: 118,
  XG: 5304, // Expected Goals (xG) — the real one
  XGOT: 5305, // Expected Goals on Target
  KEY_PASSES: 117,
  CHANCES_CREATED: 9706,
  BIG_CHANCES_CREATED: 580,
  // rich set → advanced JSONB (per-90 + %) for the profile radar
  DRIBBLE_ATTEMPTS: 108,
  SUCCESSFUL_DRIBBLES: 109,
  DUELS: 105,
  DUELS_WON: 106,
  AERIALS: 27274,
  AERIALS_WON: 107,
  INTERCEPTIONS: 100,
  TACKLES: 78,
  CLEARANCES: 101,
  BALL_RECOVERY: 27271,
  ACCURATE_PASSES: 116,
  PASSES: 80,
  // NOTE: no true "Expected Assists (xA)" exists in this plan — xa stays null (no floor-as-data).
} as const;

// Raw per-fixture sums we accumulate, then convert to per-90 / % for the radar.
export interface RawStatSums {
  mins: number; xg: number; keyPasses: number; chances: number;
  dribbleAtt: number; dribbleOk: number; duels: number; duelsWon: number;
  aerials: number; aerialsWon: number; interceptions: number; tackles: number;
  clearances: number; recoveries: number; accPasses: number; passes: number;
}

// Compute the radar payload (per-90 + percentages) from accumulated sums.
export function advancedFromSums(s: RawStatSums): Record<string, number> {
  const p90 = (v: number) => (s.mins > 0 ? Math.round((v / s.mins) * 90 * 100) / 100 : 0);
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
  return {
    mins: s.mins,
    xg_p90: p90(s.xg),
    chances_p90: p90(s.chances),
    key_passes_p90: p90(s.keyPasses),
    dribbles_p90: p90(s.dribbleOk),
    dribble_success_pct: pct(s.dribbleOk, s.dribbleAtt),
    duels_won_pct: pct(s.duelsWon, s.duels),
    aerials_won_pct: pct(s.aerialsWon, s.aerials),
    interceptions_p90: p90(s.interceptions),
    tackles_p90: p90(s.tackles),
    recoveries_p90: p90(s.recoveries || s.clearances),
    pass_accuracy_pct: pct(s.accPasses, s.passes),
  };
}

export function canonicalPosition(detailedId: number | null | undefined, coarseId: number | null | undefined): { detailed: string | null; coarse: "GK" | "DEF" | "MID" | "FWD" | null } {
  const detailed = (detailedId != null && DETAILED_POSITION[detailedId]) || (coarseId != null && DETAILED_POSITION[coarseId]) || null;
  const coarse = detailed ? COARSE_OF[detailed] ?? null : null;
  return { detailed, coarse };
}

export const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
