import { describe, it, expect } from "vitest";
import { filterWire, sortWire, verdictKey, type RumourItem } from "./rumours";

const item = (over: Partial<RumourItem> & { id: string }): RumourItem =>
  ({
    id: over.id,
    status: over.status ?? "rumour",
    summary: over.summary ?? "Chelsea open talks over a move",
    source: "BBC",
    sourceTier: over.sourceTier ?? 2,
    corroborations: 1,
    toClub: over.toClub ?? "Chelsea",
    reportedFeeM: over.reportedFeeM ?? null,
    onsideValueM: over.onsideValueM ?? 40,
    firstSeen: "2026-08-01T00:00:00Z",
    lastUpdate: over.lastUpdate ?? "2026-08-01T00:00:00Z",
    url: null,
    player: {
      id: over.id, slug: "p", name: "P", photoUrl: null, pos: "CM",
      fromClub: over.player?.fromClub ?? "Brighton", clubBg: "#000", clubColor: "#fff", clubShort: "BHA",
    },
    league: null,
    leagueSlug: over.leagueSlug ?? "premier-league",
    confidence: over.confidence ?? { pct: 60, band: "medium", factors: [] },
  }) as RumourItem;

describe("verdictKey", () => {
  it("maps the fee-vs-value read onto a filter key", () => {
    expect(verdictKey(0, 40)).toBe("bargain");
    expect(verdictKey(40, 40)).toBe("fair");
    expect(verdictKey(60, 40)).toBe("above");
    expect(verdictKey(120, 40)).toBe("overpay");
    expect(verdictKey(null, 40)).toBeNull();
  });
});

describe("filterWire", () => {
  it("filters by deal stage", () => {
    const items = [
      item({ id: "a", summary: "Chelsea lodge a bid" }),
      item({ id: "b", summary: "player completes medical" }),
    ];
    expect(filterWire(items, { stage: "Medical" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("filters by minimum reported fee, excluding deals with no fee", () => {
    const items = [
      item({ id: "big", reportedFeeM: 80 }),
      item({ id: "small", reportedFeeM: 10 }),
      item({ id: "none", reportedFeeM: null }),
    ];
    expect(filterWire(items, { minFeeM: 50 }).map((r) => r.id)).toEqual(["big"]);
  });

  it("filters by our fee-vs-value verdict — the read no rival can offer", () => {
    const items = [
      item({ id: "overpay", reportedFeeM: 120, onsideValueM: 40 }),
      item({ id: "fair", reportedFeeM: 40, onsideValueM: 40 }),
    ];
    expect(filterWire(items, { verdict: "overpay" }).map((r) => r.id)).toEqual(["overpay"]);
  });

  it("applies a confidence floor but never hides a confirmed deal", () => {
    const items = [
      item({ id: "weak", confidence: { pct: 30, band: "low", factors: [] } }),
      item({ id: "strong", confidence: { pct: 90, band: "high", factors: [] } }),
      item({ id: "done", status: "confirmed", confidence: { pct: 20, band: "low", factors: [] } }),
    ];
    const out = filterWire(items, { minConfidence: 70 }).map((r) => r.id);
    expect(out).toContain("strong");
    expect(out).toContain("done"); // settled fact, not a credibility question
    expect(out).not.toContain("weak");
  });

  it("keeps credibleOnly working as the 70 floor it always was", () => {
    const items = [
      item({ id: "weak", confidence: { pct: 30, band: "low", factors: [] } }),
      item({ id: "strong", confidence: { pct: 90, band: "high", factors: [] } }),
    ];
    expect(filterWire(items, { credibleOnly: true }).map((r) => r.id)).toEqual(["strong"]);
  });

  it("combines filters rather than treating them as alternatives", () => {
    const items = [
      item({ id: "match", reportedFeeM: 90, onsideValueM: 40, summary: "Chelsea lodge a bid" }),
      item({ id: "wrongFee", reportedFeeM: 5, onsideValueM: 40, summary: "Chelsea lodge a bid" }),
      item({ id: "wrongStage", reportedFeeM: 90, onsideValueM: 40, summary: "linked with a move" }),
    ];
    expect(filterWire(items, { minFeeM: 50, stage: "Bid" }).map((r) => r.id)).toEqual(["match"]);
  });
});

describe("sortWire", () => {
  const items = [
    item({ id: "mid", reportedFeeM: 50, onsideValueM: 30, lastUpdate: "2026-08-02T00:00:00Z", confidence: { pct: 50, band: "medium", factors: [] } }),
    item({ id: "top", reportedFeeM: 90, onsideValueM: 10, lastUpdate: "2026-08-01T00:00:00Z", confidence: { pct: 95, band: "high", factors: [] } }),
    item({ id: "new", reportedFeeM: 5, onsideValueM: 80, lastUpdate: "2026-08-03T00:00:00Z", confidence: { pct: 20, band: "low", factors: [] } }),
  ];

  it("defaults to most recently moved", () => {
    expect(sortWire(items)[0].id).toBe("new");
  });
  it("sorts by confidence, fee and player value", () => {
    expect(sortWire(items, "conf")[0].id).toBe("top");
    expect(sortWire(items, "fee")[0].id).toBe("top");
    expect(sortWire(items, "value")[0].id).toBe("new");
  });
  it("does not mutate the input", () => {
    const before = items.map((i) => i.id);
    sortWire(items, "fee");
    expect(items.map((i) => i.id)).toEqual(before);
  });
});
