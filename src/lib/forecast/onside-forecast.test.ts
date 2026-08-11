import { describe, it, expect } from "vitest";
import { onsideForecast, liveForecast, forecastVerdict, type Forecast } from "./onside-forecast";

describe("onsideForecast", () => {
  it("probabilities always sum to 100", () => {
    for (const [hv, av] of [[1.2e9, 5e7], [6e8, 6e8], [5e7, 1.2e9], [3e8, 9e8]] as const) {
      const f = onsideForecast({ homeValueEur: hv, awayValueEur: av });
      expect(f.home + f.draw + f.away).toBe(100);
    }
  });

  it("favours the far more valuable squad", () => {
    const f = onsideForecast({ homeValueEur: 1.2e9, awayValueEur: 5e7, homeRank: 1, awayRank: 60 });
    expect(f.home).toBeGreaterThan(f.away);
    expect(f.home).toBeGreaterThan(60);
    expect(f.edge).toBe("home");
  });

  it("an even match is close, with a healthy draw share", () => {
    const f = onsideForecast({ homeValueEur: 6e8, awayValueEur: 6e8, homeRank: 8, awayRank: 9 });
    expect(Math.abs(f.home - f.away)).toBeLessThanOrEqual(8);
    expect(f.edge).toBe("even");
    expect(f.draw).toBeGreaterThan(20); // closeness → bigger draw band
  });

  it("draw share shrinks for lopsided games", () => {
    const even = onsideForecast({ homeValueEur: 6e8, awayValueEur: 6e8 });
    const lopsided = onsideForecast({ homeValueEur: 1.2e9, awayValueEur: 4e7 });
    expect(lopsided.draw).toBeLessThan(even.draw);
  });

  it("home edge tilts a neutral-even match when neutral=false", () => {
    const neutral = onsideForecast({ homeValueEur: 5e8, awayValueEur: 5e8, neutral: true });
    const hosted = onsideForecast({ homeValueEur: 5e8, awayValueEur: 5e8, neutral: false });
    expect(hosted.home).toBeGreaterThan(neutral.home);
  });
});

describe("liveForecast", () => {
  const even: Forecast = { home: 37, draw: 26, away: 37, edge: "even" };

  it("always sums to 100", () => {
    for (const [sh, sa, min] of [[0, 0, 10], [1, 0, 45], [0, 2, 70], [3, 3, 88]] as const) {
      const f = liveForecast(even, sh, sa, min);
      expect(f.home + f.draw + f.away).toBe(100);
    }
  });

  it("a half-time 1-goal lead reads around 75% for the leader", () => {
    const f = liveForecast(even, 1, 0, 47);
    expect(f.home).toBeGreaterThanOrEqual(68);
    expect(f.home).toBeLessThanOrEqual(82);
  });

  it("the same lead on 90' is near-certain", () => {
    const f = liveForecast(even, 1, 0, 90);
    expect(f.home).toBeGreaterThanOrEqual(88);
  });

  it("0-0 late collapses toward the draw", () => {
    const f = liveForecast(even, 0, 0, 85);
    expect(f.draw).toBeGreaterThanOrEqual(55);
  });

  it("a two-goal half-time lead is commanding", () => {
    const f = liveForecast(even, 2, 0, 46);
    expect(f.home).toBeGreaterThanOrEqual(88);
  });

  it("the favourite trailing early still carries real probability", () => {
    const fav: Forecast = { home: 62, draw: 20, away: 18, edge: "home" };
    const f = liveForecast(fav, 0, 1, 20);
    expect(f.home).toBeGreaterThanOrEqual(25);
  });

  it("stoppage time hands the scoreboard the verdict", () => {
    expect(liveForecast(even, 2, 1, 94).home).toBeGreaterThanOrEqual(95);
    expect(liveForecast(even, 1, 1, 94).draw).toBeGreaterThanOrEqual(95);
  });
});

describe("forecastVerdict", () => {
  const pre: Forecast = { home: 58, draw: 20, away: 22, edge: "home" };

  it("grades a called result as a hit with the kickoff probability", () => {
    const v = forecastVerdict(pre, 2, 0);
    expect(v).toMatchObject({ predicted: "home", predictedPct: 58, actual: "home", hit: true });
  });

  it("grades an upset honestly", () => {
    const v = forecastVerdict(pre, 0, 1);
    expect(v).toMatchObject({ predicted: "home", actual: "away", hit: false });
  });

  it("can predict (and grade) a draw when it is the modal outcome", () => {
    const drawish: Forecast = { home: 30, draw: 40, away: 30, edge: "even" };
    expect(forecastVerdict(drawish, 1, 1)).toMatchObject({ predicted: "draw", hit: true });
  });
});
