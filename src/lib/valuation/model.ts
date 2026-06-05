// Onside Valuation Model — deterministic, pure. Maps a player's real inputs to a
// euro valuation with a confidence band and a pillar breakdown. Labeled as a model
// estimate; confidence scales with data completeness. See /methodology.

export const MODEL_VERSION = "v1.3.0";

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

// Position floors. The exp curve scales up from here; kept modest so a merely
// "solid full-season starter" doesn't float to €50M on minutes alone.
const BASE: Record<Position, number> = { GK: 7_000_000, DEF: 10_000_000, MID: 13_000_000, FWD: 15_000_000 };

// League strength. Beyond the top 5 the drop is steep — a strong stat line in the
// Saudi/Eredivisie/MLS market is not a top-5-league stat line, and the model must
// say so or those players pollute the top of the board.
const LEAGUE_Q: Record<string, number> = {
  "premier-league": 1.0,
  "la-liga": 0.95,
  bundesliga: 0.9,
  "serie-a": 0.88,
  "ligue-1": 0.74,
  eredivisie: 0.46,
  "primeira-liga": 0.44,
  brasileirao: 0.44,
  championship: 0.42,
  "super-lig": 0.4,
  "saudi-pro-league": 0.3,
  "primera-division-arg": 0.4,
  "liga-mx": 0.36,
  mls: 0.36,
};
const LEAGUE_Q_DEFAULT = 0.38;

// Where league strength sits "neutral" in the score adjustment. Top-5 leagues nudge
// the score up a little; weak leagues pull it down hard (then the exp curve does the rest).
const LEAGUE_NEUTRAL = 0.85;
const LEAGUE_SCORE_SWING = 38;

// Position-conditional pillar weights (sum to 1). Minutes (involvement) are mostly
// table stakes, so weighted lightly; performance + output drive the score so genuine
// quality separates from squad filler. League enters via a separate score adjustment
// (see below) + a sqrt(q) multiplier — not as a positive pillar (that inflated floors).
type ScoreWeights = { performance: number; output: number; involvement: number; age: number };
const WEIGHTS: Record<Position, ScoreWeights> = {
  GK: { performance: 0.62, output: 0.03, involvement: 0.15, age: 0.2 },
  DEF: { performance: 0.55, output: 0.15, involvement: 0.12, age: 0.18 },
  MID: { performance: 0.45, output: 0.35, involvement: 0.08, age: 0.12 },
  FWD: { performance: 0.4, output: 0.42, involvement: 0.06, age: 0.12 },
};

// Expected (goals + 0.7*assists) per 90, by position — the denominator for output.
const OUTPUT_EXPECTATION: Record<Position, number> = { GK: 0.02, DEF: 0.18, MID: 0.45, FWD: 0.7 };

const AGE_PEAK_MULT = 1.1;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function leagueQuality(slug: string): number {
  return LEAGUE_Q[slug] ?? LEAGUE_Q_DEFAULT;
}

/**
 * Age multiplier — a market-value curve: youth rising into a 21–25 prime plateau,
 * then decline that steepens past 30. Elite teenagers still rank via their score;
 * we don't hand every U-21 a blanket premium (that inflated raw prospects).
 */
export function ageMultiplier(age: number | null, _position?: Position): number {
  if (age == null) return 0.88;
  if (age <= 21) return clamp(0.92 + (age - 17) * 0.045, 0.85, AGE_PEAK_MULT); // 18:0.965 → 21:1.10
  if (age <= 25) return AGE_PEAK_MULT; // prime plateau
  if (age <= 30) return clamp(AGE_PEAK_MULT - (age - 25) * 0.045, 0.7, AGE_PEAK_MULT); // 27:1.01 → 30:0.875
  return clamp(0.875 - (age - 30) * 0.075, 0.3, 0.875); // 32:0.725 → 35:0.5
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

/**
 * Match-rating → 0-100, recentred so an average pro (~6.7) sits near the floor and
 * only genuinely high ratings (7.6+) reach the top. The old curve mapped a common
 * 7.2 to ~70, which the exp curve then turned into a star valuation.
 */
function performanceScore(rating: number | null): number {
  if (rating == null) return 45;
  return clamp((rating - 6.7) * 46 + 40, 0, 100);
}

function outputScore(goals: number, assists: number, minutes: number, position: Position): number {
  if (minutes <= 0) return 8;
  const per90 = (goals + 0.7 * assists) / (minutes / 90);
  // Sample-size shrinkage: a hot per-90 in few minutes is dampened toward the floor.
  const shrink = minutes / (minutes + 700);
  const ratio = (per90 * shrink) / OUTPUT_EXPECTATION[position];
  return clamp(ratio * 55 + 18, 0, 100);
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
    age: clamp((ageMult / AGE_PEAK_MULT) * 100, 0, 100),
  };

  const w = WEIGHTS[position];
  // League is folded into the score (centred, so weak leagues pull down hard) and
  // also applied as a gentler sqrt(q) value multiplier.
  const leagueAdj = (q - LEAGUE_NEUTRAL) * LEAGUE_SCORE_SWING;
  const score = clamp(
    pillars.performance * w.performance +
      pillars.output * w.output +
      pillars.involvement * w.involvement +
      pillars.age * w.age +
      leagueAdj,
    0,
    100,
  );

  const raw = BASE[position] * Math.sqrt(q) * Math.exp(0.046 * (score - 50)) * ageMult * contractMult;
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
