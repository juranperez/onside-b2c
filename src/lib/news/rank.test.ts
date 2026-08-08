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
});
