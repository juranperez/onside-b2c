import { describe, it, expect } from "vitest";
import { divergence, outcomePoints, feePoints, aggregateReputation } from "./score";
import { BASE_POINTS, MIN_VOLUME } from "./types";

describe("divergence", () => {
  it("0 when the pick echoes a certain house, ~1 against a certain house", () => {
    expect(divergence("will", 100)).toBeCloseTo(0);   // house 100% will, user picks will
    expect(divergence("will", 0)).toBeCloseTo(1);      // house 0% will, user picks will
    expect(divergence("wont", 80)).toBeCloseTo(0.8);   // house 80% will, user picks wont
    expect(divergence("will", 50)).toBeCloseTo(0.5);
  });
});

describe("outcomePoints — symmetric in divergence", () => {
  it("high-d win is large positive; high-d loss is symmetric negative", () => {
    const d = 0.8;
    const win = outcomePoints({ won: true, d });
    const loss = outcomePoints({ won: false, d });
    expect(win).toBe(Math.round(BASE_POINTS * d));
    expect(loss).toBe(-win);
  });
  it("copy-the-house (d~0) earns ~0 either way", () => {
    expect(outcomePoints({ won: true, d: 0 })).toBe(0);
    expect(outcomePoints({ won: false, d: 0 })).toBe(0);
  });
  it("earliness multiplies up to 1.5x, still symmetric", () => {
    const win = outcomePoints({ won: true, d: 0.5, earliness: 1 });
    const loss = outcomePoints({ won: false, d: 0.5, earliness: 1 });
    expect(win).toBe(Math.round(BASE_POINTS * 0.5 * 1.5));
    expect(loss).toBe(-win);
  });
});

describe("feePoints — symmetric in value-gap", () => {
  it("a big mispricing called right pays more than a small one; loss is symmetric", () => {
    const big = feePoints({ won: true, onsideValueEur: 50_000_000, confirmedFeeEur: 100_000_000 });
    const small = feePoints({ won: true, onsideValueEur: 50_000_000, confirmedFeeEur: 55_000_000 });
    expect(big).toBeGreaterThan(small);
    expect(feePoints({ won: false, onsideValueEur: 50_000_000, confirmedFeeEur: 100_000_000 })).toBe(-big);
  });
});

describe("aggregateReputation", () => {
  const won = (d: number) => ({ status: "won" as const, points: outcomePoints({ won: true, d }) });
  const lost = (d: number) => ({ status: "lost" as const, points: outcomePoints({ won: false, d }) });

  it("computes W-L, accuracy excluding push/void, and a non-loss-breaking streak", () => {
    const r = aggregateReputation([
      won(0.5), won(0.5), { status: "push", points: 0 }, won(0.5), lost(0.5),
    ]);
    expect(r.wins).toBe(3);
    expect(r.losses).toBe(1);
    expect(r.pushes).toBe(1);
    expect(r.accuracyPct).toBe(75); // 3/(3+1), push excluded
  });

  it("is UNRANKED below the volume floor", () => {
    const calls = Array.from({ length: MIN_VOLUME - 1 }, () => won(0.8));
    expect(aggregateReputation(calls).rankScore).toBeNull();
  });

  it("FARMING REGRESSION: many high-divergence calls at house-miss-rate net NEGATIVE rank", () => {
    // House is ~75% accurate on its confident band, so betting against it wins ~25%.
    const calls = [
      ...Array.from({ length: 8 }, () => won(0.8)),   // 8 lucky wins
      ...Array.from({ length: 22 }, () => lost(0.8)), // 22 losses
    ];
    const r = aggregateReputation(calls);
    expect(r.rankScore).not.toBeNull();
    expect(r.rankScore as number).toBeLessThan(0); // variance-farming is punished, not rewarded
  });
});
