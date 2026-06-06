// The Onside Forecast — a deterministic, transparent match win-probability model.
// Unlike a bookmaker line, it is driven primarily by the squads' Onside VALUE
// (our differentiator: "the more valuable squad, weighted by FIFA rank"). Used for
// the World Cup, which Sportmonks doesn't cover — so this is our own forecast.
// No betting, no odds — pure analysis, on-brand with the Onside Confidence %.

export interface ForecastInput {
  homeValueEur: number;
  awayValueEur: number;
  homeRank?: number | null; // FIFA rank (1 = best); optional anchor
  awayRank?: number | null;
  neutral?: boolean; // true for most WC games; false gives the home side a small edge
}

export interface Forecast {
  home: number; // %
  draw: number; // %
  away: number; // %
  edge: "home" | "away" | "even"; // who the model favours
}

// Team strength: log of squad value (€m) is the dominant signal, FIFA rank a sanity anchor.
function strength(valueEur: number, rank?: number | null): number {
  const valueM = Math.max(valueEur, 1_000_000) / 1_000_000;
  const v = Math.log10(valueM + 1); // ~0.3 (€1m) .. ~3.1 (€1.2bn)
  const r = rank && rank > 0 ? 1 - Math.min(rank, 120) / 120 : 0.5; // rank 1 → ~0.99, 120 → 0
  return 0.72 * v + 0.55 * r;
}

/** Win/draw/loss probabilities (integers summing to 100), value-led. */
export function onsideForecast(i: ForecastInput): Forecast {
  const homeEdge = i.neutral === false ? 0.18 : 0;
  const diff = strength(i.homeValueEur, i.homeRank) + homeEdge - strength(i.awayValueEur, i.awayRank);

  // Logistic for home-vs-away (excluding draw), then carve a draw band that's
  // widest for even matches and shrinks as the gap grows.
  const pHomeRaw = 1 / (1 + Math.exp(-1.6 * diff));
  const draw = 0.30 * Math.exp(-(diff * diff) * 1.1);

  let home = (1 - draw) * pHomeRaw;
  let away = (1 - draw) * (1 - pHomeRaw);

  // round to integers summing to exactly 100
  let h = Math.round(home * 100);
  let d = Math.round(draw * 100);
  let a = 100 - h - d;
  if (a < 0) { h += a; a = 0; } // guard rounding edge

  const edge = h - a >= 8 ? "home" : a - h >= 8 ? "away" : "even";
  return { home: h, draw: d, away: a, edge };
}
