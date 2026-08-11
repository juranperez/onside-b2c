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

// ── Live forecast ─────────────────────────────────────────────────────────────
// In-play win probability: the pre-match lean sets each side's scoring rate for
// the REMAINING minutes (Poisson), conditioned on the current score. A 1-goal
// lead at half-time reads ~75% win; the same lead on 90' is near-certain; 0-0
// late collapses toward the draw. Deterministic — no odds feed involved.

const LAMBDA_TOTAL = 2.6; // expected goals in a full match, both sides combined

function pois(k: number, lambda: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

function pack(home: number, draw: number, away: number): Forecast {
  const sum = home + draw + away || 1;
  let h = Math.round((home / sum) * 100);
  let d = Math.round((draw / sum) * 100);
  let a = 100 - h - d;
  if (a < 0) { d += a; a = 0; }
  if (d < 0) { h += d; d = 0; }
  const edge = h - a >= 8 ? "home" : a - h >= 8 ? "away" : "even";
  return { home: h, draw: d, away: a, edge };
}

/** Win/draw/loss given the live score and minute, anchored on the pre-match forecast. */
export function liveForecast(pre: Forecast, scoreHome: number, scoreAway: number, minute: number): Forecast {
  const t = Math.min(Math.max(minute / 95, 0), 1);
  const remaining = 1 - t;
  const diff = scoreHome - scoreAway;
  if (remaining <= 0.02) {
    // Stoppage time: the scoreboard has all but decided it.
    return pack(diff > 0 ? 0.97 : 0.01, diff === 0 ? 0.97 : 0.02, diff < 0 ? 0.97 : 0.01);
  }
  const lean = pre.home + pre.away > 0 ? pre.home / (pre.home + pre.away) : 0.5;
  const lh = LAMBDA_TOTAL * remaining * lean;
  const la = LAMBDA_TOTAL * remaining * (1 - lean);
  let h = 0;
  let d = 0;
  let a = 0;
  for (let gh = 0; gh <= 8; gh++) {
    for (let ga = 0; ga <= 8; ga++) {
      const p = pois(gh, lh) * pois(ga, la);
      const final = diff + gh - ga;
      if (final > 0) h += p;
      else if (final === 0) d += p;
      else a += p;
    }
  }
  return pack(h, d, a);
}

// ── Post-match verdict ────────────────────────────────────────────────────────

export type MatchOutcome = "home" | "draw" | "away";

export interface ForecastVerdict {
  predicted: MatchOutcome; // the outcome the pre-match forecast favoured
  predictedPct: number; // its probability at kickoff
  actual: MatchOutcome;
  hit: boolean;
}

/** Grade the pre-match forecast against the full-time score. */
export function forecastVerdict(pre: Forecast, scoreHome: number, scoreAway: number): ForecastVerdict {
  const ranked: [MatchOutcome, number][] = [
    ["home", pre.home],
    ["away", pre.away],
    ["draw", pre.draw],
  ];
  ranked.sort((x, y) => y[1] - x[1]);
  const [predicted, predictedPct] = ranked[0];
  const actual: MatchOutcome = scoreHome > scoreAway ? "home" : scoreHome < scoreAway ? "away" : "draw";
  return { predicted, predictedPct, actual, hit: predicted === actual };
}
