import { describe, it, expect } from "vitest";
import { JOURNALISTS, isTransferBreak, tierForBreak } from "./journalists";
import type { BskyPost } from "./bluesky";

const post = (text: string): BskyPost => ({ uri: "at://x", text, createdAt: "2026-08-08T00:00:00Z" });
const romano = JOURNALISTS.find((j) => j.key === "romano")!;
const ornstein = JOURNALISTS.find((j) => j.key === "ornstein")!;

describe("registry", () => {
  it("brands lanes by journalist surname, never a borrowed catchphrase", () => {
    expect(JOURNALISTS.map((j) => j.surname)).toEqual(["ROMANO", "ORNSTEIN"]);
    for (const j of JOURNALISTS) expect(j.surname).not.toMatch(/here we go/i);
  });
});

describe("isTransferBreak", () => {
  // Real posts pulled from the live feed on 2026-08-08.
  it("accepts genuine transfer posts", () => {
    expect(isTransferBreak(post("🚨 EXCL: Nottingham Forest set to sign Ousmane Diomande from Sporting CP. Deal being finalised"))).toBe(true);
    expect(isTransferBreak(post("🚨 Barcelona offer Manchester City ~€45m + add-ons to sign Rodri"))).toBe(true);
    expect(isTransferBreak(post("🚨 Sasa Lukic completes medical before joining Ipswich Town from Fulham"))).toBe(true);
  });

  it("rejects the injury and contract-renewal posts these feeds also carry", () => {
    expect(isTransferBreak(post("🚨 Carlos Baleba doubtful for start of new campaign through injury"))).toBe(false);
    expect(isTransferBreak(post("🚨 Real Madrid reach agreement with Vinicius Junior to sign new contract"))).toBe(false);
  });
});

describe("tierForBreak", () => {
  it("gives Romano tier 0 only on a true here-we-go", () => {
    expect(tierForBreak(romano, post("Here we go! Chelsea sign X, deal completed."))).toBe(0);
    expect(tierForBreak(romano, post("Chelsea are pushing to sign X."))).toBe(1);
  });

  it("gives Ornstein tier 0 for agreed/finalising language", () => {
    expect(tierForBreak(ornstein, post("EXCL: Forest set to sign Diomande. Deal being finalised"))).toBe(0);
    expect(tierForBreak(ornstein, post("Sasa Lukic completes medical before joining Ipswich Town"))).toBe(0);
  });

  it("does NOT give Ornstein tier 0 for a mere offer or bid — 95% must mean effectively done", () => {
    expect(tierForBreak(ornstein, post("Barcelona offer Manchester City ~€45m + add-ons to sign Rodri"))).toBe(1);
    expect(tierForBreak(ornstein, post("Arsenal in talks over a move for the midfielder"))).toBe(1);
  });

  it("treats hedged or questioning phrasing as unsealed", () => {
    expect(tierForBreak(ornstein, post("Forest might be set to sign Diomande?"))).toBe(1);
    expect(tierForBreak(ornstein, post("Not yet agreement reached over the striker"))).toBe(1);
  });
});
