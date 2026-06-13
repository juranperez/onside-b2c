import { describe, it, expect } from "vitest";
import {
  normalizeTier,
  isPro,
  limitsFor,
  isOverLimit,
  FREE_LIMITS,
  PRO_LIMITS,
} from "./entitlements";

describe("entitlements", () => {
  it("normalizes any non-pro value to free", () => {
    expect(normalizeTier("pro")).toBe("pro");
    expect(normalizeTier("free")).toBe("free");
    expect(normalizeTier(null)).toBe("free");
    expect(normalizeTier(undefined)).toBe("free");
    expect(normalizeTier("plus")).toBe("free"); // legacy tier no longer exists in v1
    expect(normalizeTier("PRO")).toBe("free"); // case-sensitive on purpose
  });

  it("isPro is true only for an exact pro tier", () => {
    expect(isPro("pro")).toBe(true);
    expect(isPro("free")).toBe(false);
    expect(isPro(null)).toBe(false);
  });

  it("maps tiers to their limits", () => {
    expect(limitsFor("free")).toEqual(FREE_LIMITS);
    expect(limitsFor("pro")).toEqual(PRO_LIMITS);
    expect(limitsFor(null)).toEqual(FREE_LIMITS);
  });

  it("free limits are the published v1 numbers", () => {
    expect(FREE_LIMITS).toEqual({ askPerDay: 10, trackedDeals: 3, watchlistPlayers: 10 });
  });

  it("pro limits are effectively unlimited", () => {
    expect(PRO_LIMITS.askPerDay).toBe(Infinity);
    expect(PRO_LIMITS.trackedDeals).toBe(Infinity);
    expect(PRO_LIMITS.watchlistPlayers).toBe(Infinity);
  });

  it("isOverLimit gates free users at the cap and never gates pro", () => {
    expect(isOverLimit("free", "trackedDeals", 2)).toBe(false); // under 3
    expect(isOverLimit("free", "trackedDeals", 3)).toBe(true); // at cap
    expect(isOverLimit("free", "askPerDay", 10)).toBe(true);
    expect(isOverLimit("free", "watchlistPlayers", 9)).toBe(false);
    // Pro is never over the limit, at any count.
    expect(isOverLimit("pro", "trackedDeals", 9999)).toBe(false);
    expect(isOverLimit("pro", "askPerDay", 9999)).toBe(false);
  });
});
