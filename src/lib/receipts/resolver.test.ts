import { describe, it, expect } from "vitest";
import { resolveTransferPrediction } from "./resolver";
import type { OutcomePick, FeePick } from "./types";

const outcome = (pick: OutcomePick, conf: number, earliness = 0) =>
  ({ callType: "outcome" as const, pick, houseConfidencePct: conf, houseValueEur: 0, earliness });
const fee = (pick: FeePick, valueEur: number) =>
  ({ callType: "fee" as const, pick, houseConfidencePct: 0, houseValueEur: valueEur, earliness: 0 });

describe("resolveTransferPrediction — outcome", () => {
  it("a divergent 'will' (house 30%) that confirms wins big", () => {
    const r = resolveTransferPrediction(outcome("will", 30), { terminal: "confirmed", confirmedFeeEur: null, feeKind: "free" });
    expect(r.status).toBe("won");
    expect(r.points).toBeGreaterThan(50); // divergence 0.7 -> ~70
  });
  it("a copy-the-house 'will' (house 84%) that confirms earns ~0", () => {
    const r = resolveTransferPrediction(outcome("will", 84), { terminal: "confirmed", confirmedFeeEur: null, feeKind: "free" });
    expect(r.status).toBe("won");
    expect(r.points).toBeLessThanOrEqual(16); // divergence 0.16 -> 16
  });
  it("killed_by_competing: a 'wont' voids with 0 points (no free win)", () => {
    const r = resolveTransferPrediction(outcome("wont", 40), { terminal: "killed_by_competing", confirmedFeeEur: null, feeKind: "free" });
    expect(r.status).toBe("void");
    expect(r.points).toBe(0);
  });
});

describe("resolveTransferPrediction — fee", () => {
  it("'higher' that lands above value wins with gap-scaled points", () => {
    const r = resolveTransferPrediction(fee("higher", 50_000_000), { terminal: "confirmed", confirmedFeeEur: 90_000_000, feeKind: "disclosed" });
    expect(r.status).toBe("won");
    expect(r.points).toBeGreaterThan(0);
  });
  it("a free transfer pushes a fee call with 0 points", () => {
    const r = resolveTransferPrediction(fee("higher", 50_000_000), { terminal: "confirmed", confirmedFeeEur: null, feeKind: "free" });
    expect(r.status).toBe("push");
    expect(r.points).toBe(0);
  });
});
