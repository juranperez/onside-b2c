import { describe, it, expect } from "vitest";
import { newsworthiness, selectForPublication, type RumourSignals } from "./rank";
import type { ArticleEvent } from "./events";

const ev = (id: string, type: ArticleEvent["type"] = "stage_advance", key?: string): ArticleEvent => ({
  type,
  rumourId: id,
  eventKey: key ?? `${id}:${type}`,
  angle: "x",
});

const sig = (over: Partial<RumourSignals> = {}): RumourSignals => ({
  sourceTier: 2,
  onsideValueM: 40,
  confidencePct: 60,
  reportedFeeM: 40,
  ...over,
});

describe("newsworthiness", () => {
  it("ranks a tier-0 break above a mid-tier stage move", () => {
    expect(newsworthiness(ev("a", "break"), sig({ sourceTier: 0 }))).toBeGreaterThan(
      newsworthiness(ev("b", "stage_advance"), sig({ sourceTier: 3 })),
    );
  });

  it("ranks a bigger player higher, all else equal", () => {
    expect(newsworthiness(ev("a"), sig({ onsideValueM: 150 }))).toBeGreaterThan(
      newsworthiness(ev("b"), sig({ onsideValueM: 5 })),
    );
  });

  it("treats a confirmed deal as top-weight", () => {
    expect(newsworthiness(ev("a", "confirmed"), sig())).toBeGreaterThan(
      newsworthiness(ev("b", "confidence_swing"), sig()),
    );
  });
});

describe("selectForPublication", () => {
  const scored = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ event: ev(`r${i}`), score: 100 - i }));

  it("applies the global cap, keeping the highest-scoring", () => {
    const out = selectForPublication(scored(40), { globalCap: 25, perSagaCap: 4, publishedPerSaga: new Map() });
    expect(out).toHaveLength(25);
    expect(out[0].rumourId).toBe("r0");
  });

  it("caps per saga so one deal cannot spam the index", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      event: ev("same", "stage_advance", `same:k${i}`),
      score: 50 - i,
    }));
    const out = selectForPublication(many, { globalCap: 25, perSagaCap: 4, publishedPerSaga: new Map() });
    expect(out).toHaveLength(4);
  });

  it("counts already-published articles toward the per-saga cap", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      event: ev("same", "stage_advance", `same:k${i}`),
      score: 50 - i,
    }));
    const out = selectForPublication(many, {
      globalCap: 25,
      perSagaCap: 4,
      publishedPerSaga: new Map([["same", 3]]),
    });
    expect(out).toHaveLength(1);
  });

  describe("diversity", () => {
    // Breaks outscore everything (35 type + 40 tier), so without a quota a whole
    // run is one reporter saying the same thing.
    const mixed = () => [
      ...Array.from({ length: 20 }, (_, i) => ({
        event: ev(`b${i}`, "break", `b${i}:break`),
        score: 90 - i,
        source: "Fabrizio Romano",
      })),
      ...Array.from({ length: 20 }, (_, i) => ({
        event: ev(`f${i}`, "fee_divergence", `f${i}:fee`),
        score: 50 - i,
        source: "The Athletic",
      })),
    ];

    it("stops one event type from taking the whole run", () => {
      const out = selectForPublication(mixed(), { globalCap: 10, perSagaCap: 4, publishedPerSaga: new Map() });
      const breaks = out.filter((e) => e.type === "break").length;
      expect(out).toHaveLength(10);
      expect(breaks).toBeLessThan(10);
      expect(out.some((e) => e.type === "fee_divergence")).toBe(true);
    });

    it("stops one lead source from taking the whole run", () => {
      const out = selectForPublication(mixed(), { globalCap: 10, perSagaCap: 4, publishedPerSaga: new Map() });
      // 40% share of 10 => at most 4 from Romano in the quota pass.
      const romanoKeys = new Set(mixed().filter((c) => c.source === "Fabrizio Romano").map((c) => c.event.eventKey));
      expect(out.filter((e) => romanoKeys.has(e.eventKey)).length).toBeLessThanOrEqual(10);
      expect(out.filter((e) => !romanoKeys.has(e.eventKey)).length).toBeGreaterThan(0);
    });

    it("still fills the run on a one-note day rather than publishing less", () => {
      const onlyBreaks = Array.from({ length: 12 }, (_, i) => ({
        event: ev(`b${i}`, "break", `b${i}:break`),
        score: 90 - i,
        source: "Fabrizio Romano",
      }));
      const out = selectForPublication(onlyBreaks, { globalCap: 10, perSagaCap: 4, publishedPerSaga: new Map() });
      expect(out).toHaveLength(10); // variety is a preference, not a constraint
    });

    it("keeps the highest-scoring item overall, quotas notwithstanding", () => {
      const out = selectForPublication(mixed(), { globalCap: 10, perSagaCap: 4, publishedPerSaga: new Map() });
      expect(out[0].eventKey).toBe("b0:break");
    });

    it("never returns the same event twice across the two passes", () => {
      const out = selectForPublication(mixed(), { globalCap: 25, perSagaCap: 4, publishedPerSaga: new Map() });
      expect(new Set(out.map((e) => e.eventKey)).size).toBe(out.length);
    });
  });
});
