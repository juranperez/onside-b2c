/**
 * Faithful port of the ONSIDE B2B "SIOS Engine v2.1" FALLBACK mode
 * (backend/src/services/valuation.service.ts) — used for B2C players that have
 * no record in the B2B (lower-league squad players) so every valuation follows
 * the same methodology. Anchored mode (Transfermarkt) is pulled directly from
 * the B2B; this covers only the no-anchor tail.
 *
 *   value = positionalBase × ageFactor × performanceIndex × volumeMultiplier
 *           × leagueTier × contractFactor × youthPremium
 */

export type CoarsePosition = "GK" | "DEF" | "MID" | "FWD";

export interface FallbackInput {
  position: CoarsePosition;
  age: number | null;
  leagueSlug: string | null;
  goals: number;
  assists: number;
  minutes: number;
  matches: number;
  contractUntil: number | null;
}

// Coarse B2C positions → a representative B2B detailed position for base + weights.
const COARSE_TO_DETAILED: Record<CoarsePosition, string> = { GK: "GK", DEF: "CB", MID: "CM", FWD: "ST" };

const POSITION_BASE: Record<string, number> = {
  GK: 8_000_000, CB: 12_000_000, LB: 10_000_000, RB: 10_000_000, LWB: 10_000_000, RWB: 10_000_000,
  CDM: 14_000_000, CM: 15_000_000, CAM: 18_000_000, LW: 20_000_000, RW: 20_000_000,
  LM: 14_000_000, RM: 14_000_000, ST: 22_000_000, CF: 20_000_000,
};

interface PositionWeights { goals: number; assists: number; xg: number; xa: number; shots: number; passing: number }
const POSITION_WEIGHTS: Record<string, PositionWeights> = {
  ST: { goals: 3.0, assists: 1.0, xg: 2.5, xa: 0.5, shots: 1.5, passing: 0.3 },
  CM: { goals: 0.8, assists: 1.5, xg: 0.5, xa: 1.0, shots: 0.5, passing: 2.0 },
  CB: { goals: 0.2, assists: 0.3, xg: 0.1, xa: 0.2, shots: 0.1, passing: 1.5 },
  GK: { goals: 0.0, assists: 0.0, xg: 0.0, xa: 0.0, shots: 0.0, passing: 1.0 },
};

// B2C league slugs → B2B league-tier multipliers (LEAGUE_TIER_MAP, by name).
const LEAGUE_TIER: Record<string, number> = {
  "premier-league": 1.5, "la-liga": 1.2, bundesliga: 1.15, "serie-a": 1.1, "ligue-1": 1.05,
  eredivisie: 0.7, "primeira-liga": 0.7, "super-lig": 0.6, championship: 0.45,
  brasileirao: 0.5, "saudi-pro-league": 0.5, "primera-division-arg": 0.5, "liga-mx": 0.5, mls: 0.5,
};

const REFS = { goalsPer90: 0.45, assistsPer90: 0.3, matchesPlayed: 30, minutesPlayed: 2500 };
const VALUATION_FLOOR_EUR = 100_000;

export function ageFactor(age: number): number {
  if (age <= 18) return 0.35;
  if (age <= 20) return 0.5 + (age - 18) * 0.1;
  if (age <= 23) return 0.7 + (age - 20) * 0.1;
  if (age <= 27) return 1.0;
  if (age <= 29) return 1.0 - (age - 27) * 0.07;
  if (age <= 31) return 0.86 - (age - 29) * 0.1;
  if (age <= 33) return 0.66 - (age - 31) * 0.12;
  return Math.max(0.15, 0.42 - (age - 33) * 0.1);
}

function performanceIndex(detailed: string, goalsPer90: number, assistsPer90: number): number {
  const w = POSITION_WEIGHTS[detailed] ?? POSITION_WEIGHTS.CM;
  // Only goals + assists are available from the B2C; xg/xa/shots/passing are absent,
  // so the index is computed over the active components (mirrors the B2B filter).
  const comps = [
    { val: goalsPer90 / REFS.goalsPer90, weight: w.goals },
    { val: assistsPer90 / REFS.assistsPer90, weight: w.assists },
  ].filter((c) => c.weight > 0 && c.val > 0);
  if (comps.length === 0) return 0.7;
  const activeWeight = comps.reduce((s, c) => s + c.weight, 0);
  const weighted = comps.reduce((s, c) => s + c.val * c.weight, 0) / activeWeight;
  return Math.max(0.3, Math.min(2.5, weighted));
}

function volumeMultiplier(matches: number, minutes: number): number {
  if (matches === 0 && minutes === 0) return 0.5;
  const matchFrac = Math.min(matches / REFS.matchesPlayed, 1);
  const minsFrac = Math.min(minutes / REFS.minutesPlayed, 1);
  return 0.5 + (minsFrac * 0.6 + matchFrac * 0.4) * 0.65;
}

function contractFactor(contractUntil: number | null): number {
  if (!contractUntil) return 0.9;
  const monthsLeft = (new Date(contractUntil, 5, 30).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsLeft <= 0) return 0.3;
  if (monthsLeft <= 6) return 0.45;
  if (monthsLeft <= 12) return 0.65;
  if (monthsLeft <= 18) return 0.8;
  if (monthsLeft <= 24) return 0.9;
  if (monthsLeft <= 36) return 0.95;
  return 1.0;
}

function youthPremium(age: number, perfIndex: number): number {
  if (age > 23 || perfIndex < 0.8) return 1.0;
  if (age <= 21 && perfIndex >= 1.2) return 1.4;
  if (age <= 21 && perfIndex >= 1.0) return 1.25;
  if (age <= 23 && perfIndex >= 1.2) return 1.2;
  if (age <= 23 && perfIndex >= 1.0) return 1.1;
  return 1.0;
}

export interface FallbackResult {
  valueEur: number;
  confidencePct: number;
  bandLow: number;
  bandHigh: number;
}

export function fallbackValuation(input: FallbackInput): FallbackResult {
  const age = input.age && input.age >= 14 && input.age <= 50 ? input.age : 25;
  const detailed = COARSE_TO_DETAILED[input.position] ?? "CM";
  const base = POSITION_BASE[detailed] ?? 12_000_000;

  const per90 = (v: number) => (input.minutes > 0 ? (v / input.minutes) * 90 : 0);
  const perfIndex = performanceIndex(detailed, per90(input.goals), per90(input.assists));
  const volMult = volumeMultiplier(input.matches, input.minutes);
  const league = input.leagueSlug ? (LEAGUE_TIER[input.leagueSlug] ?? 0.5) : 0.5;
  const contract = contractFactor(input.contractUntil);
  const ageMult = ageFactor(age);
  const youth = youthPremium(age, perfIndex);

  const raw = base * ageMult * perfIndex * volMult * league * contract * youth;
  const valueEur = Math.max(VALUATION_FLOOR_EUR, Math.round(raw / 100_000) * 100_000);

  // Confidence — fallback has no TM anchor, so it stays modest (B2B formula minus the TM bonus).
  let conf = 0.2;
  conf += 0.15; // metrics present
  if (input.minutes > 500) conf += 0.1;
  if (input.goals > 0 || input.assists > 0) conf += 0.08;
  if (input.contractUntil) conf += 0.05;
  if (input.leagueSlug) conf += 0.02;
  conf = Math.min(1, conf);

  const margin = (1 - conf) * 0.3;
  return {
    valueEur,
    confidencePct: Math.round(conf * 100),
    bandLow: Math.max(VALUATION_FLOOR_EUR, Math.round((valueEur * (1 - margin)) / 100_000) * 100_000),
    bandHigh: Math.round((valueEur * (1 + margin)) / 100_000) * 100_000,
  };
}
