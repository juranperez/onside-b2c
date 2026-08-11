import { describe, it, expect } from "vitest";
import {
  normalizeTier,
  isPaid,
  limitsFor,
  isOverLimit,
  limitMessage,
  FREE_LIMITS,
  PLUS_LIMITS,
  PRO_LIMITS,
} from "./entitlements";

describe("entitlements", () => {
  it("normalises any unrecognised value to free", () => {
    expect(normalizeTier("pro")).toBe("pro");
    expect(normalizeTier("plus")).toBe("plus");
    expect(normalizeTier("free")).toBe("free");
    expect(normalizeTier(null)).toBe("free");
    expect(normalizeTier(undefined)).toBe("free");
    expect(normalizeTier("PRO")).toBe("free"); // case-sensitive on purpose
    expect(normalizeTier("founder")).toBe("free");
  });

  it("treats plus and pro as paid", () => {
    expect(isPaid("plus")).toBe(true);
    expect(isPaid("pro")).toBe(true);
    expect(isPaid("free")).toBe(false);
    expect(isPaid(null)).toBe(false);
  });

  // These must match what /pricing advertises, or the page is lying.
  it("matches the published tier table", () => {
    expect(FREE_LIMITS).toEqual({ askPerDay: 10, trackedDeals: 3, watchlistPlayers: 10 });
    // Plus buys unlimited personalisation but NOT unlimited Ask — that is Pro's headline.
    expect(PLUS_LIMITS.watchlistPlayers).toBe(Infinity);
    expect(PLUS_LIMITS.trackedDeals).toBe(Infinity);
    expect(PLUS_LIMITS.askPerDay).toBe(10);
    expect(PRO_LIMITS.askPerDay).toBe(Infinity);
  });

  it("gates free at the cap and never gates paid personalisation", () => {
    expect(isOverLimit("free", "watchlistPlayers", 9)).toBe(false);
    expect(isOverLimit("free", "watchlistPlayers", 10)).toBe(true);
    expect(isOverLimit("free", "trackedDeals", 3)).toBe(true);
    expect(isOverLimit("plus", "watchlistPlayers", 9999)).toBe(false);
    expect(isOverLimit("pro", "trackedDeals", 9999)).toBe(false);
  });

  it("still caps Ask for plus, not for pro", () => {
    expect(isOverLimit("plus", "askPerDay", 10)).toBe(true);
    expect(isOverLimit("pro", "askPerDay", 9999)).toBe(false);
  });

  it("points the user at the tier that actually removes the limit", () => {
    expect(limitMessage("watchlistPlayers", "free")).toMatch(/Plus/);
    expect(limitMessage("trackedDeals", "free")).toMatch(/Plus/);
    expect(limitMessage("askPerDay", "plus")).toMatch(/Pro/);
  });
});
