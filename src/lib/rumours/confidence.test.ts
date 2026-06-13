import { describe, it, expect } from "vitest";
import { confidence } from "./confidence";

const tier0 = {
  status: "rumour" as const,
  summary: "Here we go! Liverpool sign Florian Wirtz.",
  sourceTier: 0,
  corroborations: 1,
  reportedFeeEur: 130_000_000,
  onsideValueEur: 120_000_000,
  contractUntil: null,
  firstSeen: new Date("2026-06-13T14:00:00Z"),
  now: new Date("2026-06-13T14:05:00Z"),
};

describe("confidence — Romano Here We Go (tier 0)", () => {
  it("pins a live Romano break to 95 / high", () => {
    const r = confidence(tier0);
    expect(r.pct).toBe(95);
    expect(r.band).toBe("high");
    expect(r.factors[0].key).toBe("here_we_go");
  });
  it("a CONFIRMED break still reads 100 (official supersedes)", () => {
    expect(confidence({ ...tier0, status: "confirmed" }).pct).toBe(100);
  });
  it("a RETRACTED break (dead) reads 0, NOT 95", () => {
    expect(confidence({ ...tier0, status: "dead" }).pct).toBe(0);
  });
});
