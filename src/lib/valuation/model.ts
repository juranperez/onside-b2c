// Onside Valuation Model — deterministic, pure. Maps a player's real inputs to a
// euro valuation with a confidence band and a pillar breakdown. Labeled as a model
// estimate; confidence scales with data completeness. See /methodology.

export const MODEL_VERSION = "v1.2.0";

// Reference year for contract-length math. The product targets the 2026 window.
const SEASON_YEAR = 2026;

export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface ValuationInput {
  position: Position;
  age: number | null;
  leagueSlug: string;
  minutes: number;
  goals: number;
  assists: number;
  rating: number | null;
  /** Reported contract end year (public fact). Null → contract factor is neutral. */
  contractUntil?: number | null;
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

const BASE: Record<Position, number> = { GK: 9_000_000, DEF: 14_000_000, MID: 17_000_000, FWD: 20_000_000 };

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

// Position-conditional pillar weights (sum to 1). League quality is applied as a value
// multiplier (LEAGUE_Q), so it is NOT also a score pillar — that double-counted league and
// inflated the floor for big-league squad players. Prestige is computed for display only.
type ScoreWeights = { performance: number; output: number; involvement: number; age: number };
const WEIGHTS: Record<Position, ScoreWeights> = {
  GK: { performance: 0.55, output: 0.03, involvement: 0.25, age: 0.17 },
  DEF: { performance: 0.5, output: 0.13, involvement: 0.25, age: 0.12 },
  MID: { performance: 0.42, output: 0.3, involvement: 0.18, age: 0.1 },
  FWD: { performance: 0.38, output: 0.37, involvement: 0.15, age: 0.1 },
};

// Expected (goals + 0.7*assists) per 90, by position — the denominator for output.
const OUTPUT_EXPECTATION: Record<Position, number> = { GK: 0.02, DEF: 0.18, MID: 0.45, FWD: 0.7 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function leagueQuality(slug: string): number {
  return LEAGUE_Q[slug] ?? 0.45;
}

/** Age multiplier — youth-friendly (the market pays for potential), steep veteran decline. */
export function ageMultiplier(age: number | null, _position?: Position): number {
  if (age == null) return 0.85;
  if (age <= 26) return clamp(1.15 - 0.006 * Math.max(0, 20 - age) ** 2, 0.85, 1.15);
  return clamp(1.15 - 0.02 * (age - 26) ** 1.6, 0.3, 1.15);
}

/**
 * Contract-length factor — the "running-down-the-deal" effect markets price in.
 * A player entering the final 18 months loses leverage (cheaper to prise away); a
 * long deal supports value. Neutral (1.0) when the contract year is unknown.
 */
export function contractMultiplier(contractUntil: number | null | undefined): number {
  if (!contractUntil) return 1.0;
  const yearsLeft = contractUntil - SEASON_YEAR;
  if (yearsLeft <= 0) return 0.8; // expiring / out of contract
  if (yearsLeft === 1) return 0.88;
  if (yearsLeft === 2) return 0.96;
  if (yearsLeft === 3) return 1.0;
  if (yearsLeft === 4) return 1.04;
  return 1.06; // 5+ years, locked down
}

function performanceScore(rating: number | null): number {
  if (rating == null) return 50;
  return clamp(((rating - 6.0) / 2.0) * 65 + 30, 0, 100);
}

function outputScore(goals: number, assists: number, minutes: number, position: Position): number {
  if (minutes <= 0) return 10;
  const per90 = (goals + 0.7 * assists) / (minutes / 90);
  // Sample-size shrinkage: a hot per-90 in few minutes is dampened toward the floor.
  const shrink = minutes / (minutes + 700);
  const ratio = (per90 * shrink) / OUTPUT_EXPECTATION[position];
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
  const contractMult = contractMultiplier(input.contractUntil);

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
      pillars.age * w.age,
    0,
    100,
  );

  const raw = BASE[position] * q * Math.exp(0.052 * (score - 50)) * ageMult * contractMult;
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
