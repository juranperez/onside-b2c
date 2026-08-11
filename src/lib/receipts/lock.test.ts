import { describe, it, expect } from "vitest";
import { lockEligibility } from "./lock";

const base = { status: "rumour" as const, sourceTier: 3, confidencePct: 55, resolved: false };

describe("lockEligibility (outcome 'will')", () => {
  it("allows a live, uncertain rumour", () => {
    expect(lockEligibility({ ...base }).ok).toBe(true);
  });
  it("rejects a non-rumour subject (already confirmed/dead)", () => {
    expect(lockEligibility({ ...base, status: "confirmed" }).ok).toBe(false);
    expect(lockEligibility({ ...base, status: "dead" }).ok).toBe(false);
  });
  it("rejects a Here-We-Go (source_tier 0) even while status is still rumour", () => {
    expect(lockEligibility({ ...base, sourceTier: 0 }).ok).toBe(false);
  });
  it("rejects an already-resolved subject", () => {
    expect(lockEligibility({ ...base, resolved: true }).ok).toBe(false);
  });
  it("rejects when the house is already at/above the confidence ceiling (85)", () => {
    expect(lockEligibility({ ...base, confidencePct: 85 }).ok).toBe(false);
    expect(lockEligibility({ ...base, confidencePct: 90 }).ok).toBe(false);
  });
  it("returns a machine-reason for rejection", () => {
    expect(lockEligibility({ ...base, sourceTier: 0 }).reason).toBe("here_we_go");
  });
});
