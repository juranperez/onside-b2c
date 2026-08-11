import { describe, it, expect } from "vitest";
import { clubWindowFrom } from "./window";
import type { RumourItem } from "@/lib/queries/rumours";

/** Minimal RumourItem — only the fields clubWindowFrom actually reads carry meaning. */
function deal(over: Partial<RumourItem> & { id: string }): RumourItem {
  return {
    status: "confirmed",
    summary: "",
    source: "",
    sourceTier: 1,
    corroborations: 1,
    toClub: "Arsenal",
    reportedFeeM: null,
    onsideValueM: 0,
    firstSeen: "2026-07-01T00:00:00Z",
    lastUpdate: "2026-07-01T00:00:00Z",
    url: null,
    league: null,
    leagueSlug: null,
    player: {
      id: "p",
      slug: "player",
      name: "Player",
      photoUrl: null,
      pos: "FWD",
      fromClub: "Elsewhere",
      clubBg: "#000",
      clubColor: "#fff",
      clubShort: "ELS",
    },
    confidence: { pct: 50, band: "medium", factors: [] },
    ...over,
  } as RumourItem;
}

describe("clubWindowFrom", () => {
  it("returns null when nothing is priced — the majority case", () => {
    expect(clubWindowFrom([], "Arsenal")).toBeNull();
    expect(clubWindowFrom([deal({ id: "a", reportedFeeM: null })], "Arsenal")).toBeNull();
  });

  it("ignores deals that are not confirmed incoming for this club", () => {
    const rumoured = deal({ id: "a", status: "rumour", reportedFeeM: 50, onsideValueM: 40 });
    const otherClub = deal({ id: "b", toClub: "Chelsea", reportedFeeM: 50, onsideValueM: 40 });
    expect(clubWindowFrom([rumoured, otherClub], "Arsenal")).toBeNull();
  });

  it("sums spend against our valuation and reports the net", () => {
    const w = clubWindowFrom(
      [
        deal({ id: "a", reportedFeeM: 60, onsideValueM: 45 }),
        deal({ id: "b", reportedFeeM: 20, onsideValueM: 35 }),
      ],
      "Arsenal",
    );
    expect(w).not.toBeNull();
    expect(w!.dealCount).toBe(2);
    expect(w!.spendM).toBe(80);
    expect(w!.valueM).toBe(80);
    expect(w!.netM).toBe(0);
  });

  it("picks the biggest overpay and the biggest bargain by absolute gap", () => {
    const w = clubWindowFrom(
      [
        deal({ id: "a", reportedFeeM: 60, onsideValueM: 45 }), // +15
        deal({ id: "b", reportedFeeM: 90, onsideValueM: 50 }), // +40  <- overpay
        deal({ id: "c", reportedFeeM: 10, onsideValueM: 35 }), // -25  <- bargain
        deal({ id: "d", reportedFeeM: 30, onsideValueM: 34 }), // -4
      ],
      "Arsenal",
    );
    expect(w!.biggestOverpay?.id).toBe("b");
    expect(w!.biggestOverpay?.diffM).toBe(40);
    expect(w!.biggestBargain?.id).toBe("c");
    expect(w!.biggestBargain?.diffM).toBe(-25);
  });

  it("treats a free transfer as a real bargain, not a missing fee", () => {
    const w = clubWindowFrom([deal({ id: "a", reportedFeeM: 0, onsideValueM: 40 })], "Arsenal");
    expect(w!.dealCount).toBe(1);
    expect(w!.spendM).toBe(0);
    expect(w!.biggestBargain?.diffM).toBe(-40);
  });

  it("excludes an unvalued signing from every figure and reports it separately", () => {
    // The Arsenal case that caught this: €52M Hincapié (valued €49M) alongside €40M
    // Tzolis (no valuation). Counting Tzolis's fee against a zero valuation reported
    // "+€43M over our number" when the honest figure is +€3M and one unpriceable signing.
    const w = clubWindowFrom(
      [
        deal({ id: "hincapie", reportedFeeM: 52, onsideValueM: 49 }),
        deal({ id: "tzolis", reportedFeeM: 40, onsideValueM: 0 }),
      ],
      "Arsenal",
    );
    expect(w!.dealCount).toBe(1);
    expect(w!.spendM).toBe(52);
    expect(w!.valueM).toBe(49);
    expect(w!.netM).toBe(3);
    expect(w!.unvaluedCount).toBe(1);
    expect(w!.unvaluedSpendM).toBe(40);
    expect(w!.biggestOverpay?.id).toBe("hincapie");
  });

  it("returns null when every priced signing is unvaluable", () => {
    // Nothing to compare — showing "€0M valuation" would be a fabricated finding.
    expect(clubWindowFrom([deal({ id: "a", reportedFeeM: 25, onsideValueM: 0 })], "Arsenal")).toBeNull();
  });

  it("leaves a superlative null when nothing qualifies in that direction", () => {
    const w = clubWindowFrom([deal({ id: "a", reportedFeeM: 60, onsideValueM: 45 })], "Arsenal");
    expect(w!.biggestOverpay?.id).toBe("a");
    expect(w!.biggestBargain).toBeNull();
  });
});
