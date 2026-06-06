import { describe, it, expect } from "vitest";
import { onsideForecast } from "./onside-forecast";

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
