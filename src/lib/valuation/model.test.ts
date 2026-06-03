import { describe, it, expect } from "vitest";
import { valuePlayer, ageMultiplier, leagueQuality, MODEL_VERSION, type ValuationInput } from "./model";

const base: ValuationInput = {
  position: "FWD",
  age: 25,
  leagueSlug: "premier-league",
  minutes: 3000,
  goals: 20,
  assists: 8,
  rating: 7.6,
};

describe("valuePlayer", () => {
  it("is deterministic", () => {
    expect(valuePlayer(base)).toEqual(valuePlayer(base));
  });

  it("produces an ordered confidence band around the value", () => {
    const v = valuePlayer(base);
    expect(v.bandLow).toBeLessThan(v.value);
    expect(v.value).toBeLessThan(v.bandHigh);
    expect(v.confidence).toBeGreaterThan(0);
    expect(v.confidence).toBeLessThanOrEqual(92);
  });

  it("values a stronger player above a weaker one", () => {
    const strong = valuePlayer(base);
    const weak = valuePlayer({ ...base, goals: 2, assists: 1, rating: 6.3, minutes: 1200 });
    expect(strong.value).toBeGreaterThan(weak.value);
  });

  it("values EPL above Ligue 1 at equal inputs", () => {
    expect(valuePlayer(base).value).toBeGreaterThan(valuePlayer({ ...base, leagueSlug: "ligue-1" }).value);
  });

  it("values a prime-age player above a veteran", () => {
    expect(valuePlayer({ ...base, age: 25 }).value).toBeGreaterThan(valuePlayer({ ...base, age: 35 }).value);
  });

  it("clamps within [250k, 250M]", () => {
    const elite = valuePlayer({ position: "FWD", age: 23, leagueSlug: "premier-league", minutes: 3400, goals: 40, assists: 15, rating: 8.5 });
    const fringe = valuePlayer({ position: "GK", age: 38, leagueSlug: "mls", minutes: 90, goals: 0, assists: 0, rating: null });
    expect(elite.value).toBeLessThanOrEqual(250_000_000);
    expect(fringe.value).toBeGreaterThanOrEqual(250_000);
  });

  it("widens the band and lowers confidence when data is sparse", () => {
    const full = valuePlayer(base);
    const sparse = valuePlayer({ ...base, minutes: 120, rating: null, age: null });
    const fullWidth = (full.bandHigh - full.bandLow) / full.value;
    const sparseWidth = (sparse.bandHigh - sparse.bandLow) / sparse.value;
    expect(sparseWidth).toBeGreaterThan(fullWidth);
    expect(sparse.confidence).toBeLessThan(full.confidence);
  });

  it("returns sensible pillar scores in 0..100", () => {
    const v = valuePlayer(base);
    for (const p of Object.values(v.pillars)) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });
});

describe("ageMultiplier", () => {
  it("peaks at the position peak age and decays for veterans", () => {
    expect(ageMultiplier(25, "FWD")).toBeGreaterThan(ageMultiplier(34, "FWD"));
    expect(ageMultiplier(null, "FWD")).toBeGreaterThan(0);
  });
});

describe("leagueQuality", () => {
  it("ranks the Big 5 above minor leagues and defaults unknown", () => {
    expect(leagueQuality("premier-league")).toBeGreaterThan(leagueQuality("mls"));
    expect(leagueQuality("some-unknown-league")).toBeCloseTo(0.45);
  });
});

describe("MODEL_VERSION", () => {
  it("is a version string", () => {
    expect(MODEL_VERSION).toMatch(/^v\d/);
  });
});
