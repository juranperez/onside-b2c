import { describe, it, expect } from "vitest";
import { valueOnDay, dayDelta, series, dayIndexFor, PULSE_EPOCH_MS } from "./pulse";

const ANCHOR = 50_000_000;
const ID = "247";

describe("valueOnDay", () => {
  it("is deterministic", () => {
    expect(valueOnDay(ANCHOR, ID, 100)).toBe(valueOnDay(ANCHOR, ID, 100));
  });

  it("stays bounded within [0.7, 1.4] of the anchor over a long horizon", () => {
    for (let d = 0; d < 800; d++) {
      const v = valueOnDay(ANCHOR, ID, d);
      expect(v).toBeGreaterThanOrEqual(Math.round(ANCHOR * 0.7));
      expect(v).toBeLessThanOrEqual(Math.round(ANCHOR * 1.4));
    }
  });

  it("moves modestly day to day (no wild jumps)", () => {
    let maxStep = 0;
    for (let d = 1; d < 400; d++) {
      const step = Math.abs(valueOnDay(ANCHOR, ID, d) - valueOnDay(ANCHOR, ID, d - 1)) / ANCHOR;
      maxStep = Math.max(maxStep, step);
    }
    expect(maxStep).toBeLessThan(0.12);
  });

  it("different players move differently", () => {
    const a = series(ANCHOR, "100", 0, 20).map((p) => p.value);
    const b = series(ANCHOR, "200", 0, 20).map((p) => p.value);
    expect(a).not.toEqual(b);
  });

  it("applies and decays an event re-rate", () => {
    const day = 50;
    const withEvent = valueOnDay(ANCHOR, ID, day, [{ dayIndex: day, pct: 0.2 }]);
    const without = valueOnDay(ANCHOR, ID, day, []);
    expect(withEvent).toBeGreaterThan(without);
    const later = valueOnDay(ANCHOR, ID, day + 60, [{ dayIndex: day, pct: 0.2, halfLifeDays: 21 }]);
    const baselineLater = valueOnDay(ANCHOR, ID, day + 60, []);
    expect(later - baselineLater).toBeLessThan(0.2 * ANCHOR); // decayed
  });
});

describe("dayDelta", () => {
  it("is a bounded signed number", () => {
    const d = dayDelta(ANCHOR, ID, new Date("2026-06-03"));
    expect(Math.abs(d)).toBeLessThan(0.12 * ANCHOR);
  });
});

describe("dayIndexFor", () => {
  it("is zero at the epoch and increases by one per day", () => {
    expect(dayIndexFor(new Date(PULSE_EPOCH_MS))).toBe(0);
    expect(dayIndexFor(new Date(PULSE_EPOCH_MS + 86_400_000 * 10))).toBe(10);
  });
});

describe("series", () => {
  it("has inclusive length", () => {
    expect(series(ANCHOR, ID, 0, 89)).toHaveLength(90);
  });
});
