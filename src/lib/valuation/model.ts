// Onside Valuation Model — deterministic, pure. Maps a player's real inputs to a
// euro valuation with a confidence band and a pillar breakdown. Labeled as a model
// estimate; confidence scales with data completeness. See /methodology.

export const MODEL_VERSION = "v1.0.0";

export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface ValuationInput {
  position: Position;
  age: number | null;
  leagueSlug: string;
  minutes: number;
  goals: number;
  assists: number;
  rating: number | null;
}

export interface PillarScores {
  performance: number;
  output: number;
  involvement: number;
  prestige: number;
  age: number;
}

export interface Valuation {
  value: number;
  score: number;
  confidence: number;
  bandLow: number;
  bandHigh: number;
  pillars: PillarScores;
}

const VALUE_FLOOR = 250_000;
const VALUE_CEIL = 250_000_000;
const FULL_SEASON_MINUTES = 3420; // 38 * 90

const BASE: Record<Position, number> = { GK: 10_000_000, DEF: 16_000_000, MID: 20_000_000, FWD: 24_000_000 };
const PEAK_AGE: Record<Position, number> = { GK: 28, DEF: 27, MID: 26, FWD: 25 };

const LEAGUE_Q: Record<string, number> = {
  "premier-league": 1.0,
  "la-liga": 0.95,
  bundesliga: 0.92,
  "serie-a": 0.9,
  "ligue-1": 0.78,
  eredivisie: 0.62,
  "primeira-liga": 0.58,
  brasileirao: 0.55,
  championship: 0.52,
  "super-lig": 0.5,
  "saudi-pro-league": 0.48,
  "primera-division-arg": 0.46,
  "liga-mx": 0.42,
  mls: 0.42,
};

// Position-conditional pillar weights (sum to 1).
const WEIGHTS: Record<Position, PillarScores> = {
  GK: { performance: 0.4, output: 0.02, involvement: 0.2, prestige: 0.2, age: 0.18 },
  DEF: { performance: 0.38, output: 0.1, involvement: 0.2, prestige: 0.2, age: 0.12 },
  MID: { performance: 0.32, output: 0.22, involvement: 0.16, prestige: 0.18, age: 0.12 },
  FWD: { performance: 0.3, output: 0.3, involvement: 0.15, prestige: 0.15, age: 0.1 },
};

// Expected (goals + 0.7*assists) per 90, by position — the denominator for output.
const OUTPUT_EXPECTATION: Record<Position, number> = { GK: 0.02, DEF: 0.18, MID: 0.45, FWD: 0.7 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function leagueQuality(slug: string): number {
  return LEAGUE_Q[slug] ?? 0.45;
}

/** Age multiplier — parabolic peak per position, range ~0.30..1.15. */
export function ageMultiplier(age: number | null, position: Position): number {
  if (age == null) return 0.85;
  const peak = PEAK_AGE[position];
  return clamp(1.15 - 0.008 * (age - peak) ** 2, 0.3, 1.15);
}

function performanceScore(rating: number | null): number {
  if (rating == null) return 50;
  return clamp(((rating - 6.0) / 2.0) * 65 + 30, 0, 100);
}

function outputScore(goals: number, assists: number, minutes: number, position: Position): number {
  if (minutes <= 0) return 10;
  const per90 = (goals + 0.7 * assists) / (minutes / 90);
  const ratio = per90 / OUTPUT_EXPECTATION[position];
  return clamp(ratio * 55 + 20, 0, 100);
}

function involvementScore(minutes: number): number {
  return clamp((minutes / FULL_SEASON_MINUTES) * 100, 0, 100);
}

/** Compute a full valuation for a player. Pure + deterministic. */
export function valuePlayer(input: ValuationInput): Valuation {
  const { position, age, leagueSlug, minutes, goals, assists, rating } = input;
  const q = leagueQuality(leagueSlug);
  const ageMult = ageMultiplier(age, position);

  const pillars: PillarScores = {
    performance: performanceScore(rating),
    output: outputScore(goals, assists, minutes, position),
    involvement: involvementScore(minutes),
    prestige: clamp(q * 100, 0, 100),
    age: clamp((ageMult / 1.15) * 100, 0, 100),
  };

  const w = WEIGHTS[position];
  const score = clamp(
    pillars.performance * w.performance +
      pillars.output * w.output +
      pillars.involvement * w.involvement +
      pillars.prestige * w.prestige +
      pillars.age * w.age,
    0,
    100,
  );

  const raw = BASE[position] * q * Math.exp(0.045 * (score - 50)) * ageMult;
  const value = Math.round(clamp(raw, VALUE_FLOOR, VALUE_CEIL));

  // Data completeness drives confidence + band width.
  let dq = 1.0;
  if (rating == null) dq -= 0.25;
  if (minutes < 450) dq -= 0.25;
  if (age == null) dq -= 0.15;
  dq = clamp(dq, 0.2, 1.0);

  const confidence = Math.round(35 + 55 * ((dq - 0.2) / 0.8));
  const f = 0.12 + 0.33 * (1 - dq);

  return {
    value,
    score: Math.round(score * 10) / 10,
    confidence,
    bandLow: Math.round(clamp(value * (1 - f), VALUE_FLOOR, VALUE_CEIL)),
    bandHigh: Math.round(clamp(value * (1 + f), VALUE_FLOOR, VALUE_CEIL)),
    pillars: {
      performance: Math.round(pillars.performance),
      output: Math.round(pillars.output),
      involvement: Math.round(pillars.involvement),
      prestige: Math.round(pillars.prestige),
      age: Math.round(pillars.age),
    },
  };
}
