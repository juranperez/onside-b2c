import { describe, it, expect } from "vitest";
import { detectArticleEvents } from "./events";
import type { RumourItem } from "@/lib/queries/rumours";

const base = (over: Partial<RumourItem> = {}): RumourItem => ({
  id: "r1",
  status: "rumour",
  summary: "Chelsea open talks over a move for the midfielder",
  source: "The Athletic",
  sourceTier: 1,
  corroborations: 3,
  toClub: "Chelsea",
  reportedFeeM: 50,
  onsideValueM: 50,
  firstSeen: "2026-08-01T00:00:00Z",
  lastUpdate: "2026-08-02T00:00:00Z",
  url: "https://x.test/a",
  player: {
    id: "p1", slug: "joe-bloggs", name: "Joe Bloggs", photoUrl: null, pos: "CM",
    fromClub: "Brighton", clubBg: "#000", clubColor: "#fff", clubShort: "BHA",
  },
  league: "Premier League",
  leagueSlug: "premier-league",
  confidence: { pct: 60, band: "medium", factors: [] },
  ...over,
});
const none = new Set<string>();

describe("detectArticleEvents", () => {
  it("fires stage_advance with a per-stage key", () => {
    const e = detectArticleEvents(base(), none);
    expect(e.map((x) => x.type)).toContain("stage_advance");
    expect(e.find((x) => x.type === "stage_advance")!.eventKey).toBe("r1:stage:Talks");
  });

  it("never fires for the default Linked stage (arrival is not news)", () => {
    const e = detectArticleEvents(base({ summary: "linked with a summer move" }), none);
    expect(e.some((x) => x.type === "stage_advance")).toBe(false);
  });

  it("suppresses anything already published (stateless key dedup)", () => {
    const e = detectArticleEvents(base(), new Set(["r1:stage:Talks"]));
    expect(e.some((x) => x.type === "stage_advance")).toBe(false);
  });

  it("fires break only for a tier-0 journalist", () => {
    expect(detectArticleEvents(base({ sourceTier: 0 }), none).some((x) => x.type === "break")).toBe(true);
    expect(detectArticleEvents(base({ sourceTier: 1 }), none).some((x) => x.type === "break")).toBe(false);
  });

  it("fires fee_divergence keyed by verdict band, only when a fee exists", () => {
    const over = detectArticleEvents(base({ reportedFeeM: 120, onsideValueM: 50 }), none);
    expect(over.find((x) => x.type === "fee_divergence")!.eventKey).toBe("r1:fee:overpay");
    expect(detectArticleEvents(base({ reportedFeeM: null }), none).some((x) => x.type === "fee_divergence")).toBe(false);
  });

  it("buckets confidence so one article fires per 12-point band", () => {
    const a = detectArticleEvents(base({ confidence: { pct: 60, band: "medium", factors: [] } }), none);
    const b = detectArticleEvents(base({ confidence: { pct: 61, band: "medium", factors: [] } }), none);
    expect(a.find((x) => x.type === "confidence_swing")!.eventKey).toBe(
      b.find((x) => x.type === "confidence_swing")!.eventKey,
    );
    const c = detectArticleEvents(base({ confidence: { pct: 95, band: "high", factors: [] } }), none);
    expect(c.find((x) => x.type === "confidence_swing")!.eventKey).not.toBe(
      a.find((x) => x.type === "confidence_swing")!.eventKey,
    );
  });

  it("fires confirmed / dead terminal events", () => {
    expect(detectArticleEvents(base({ status: "confirmed" }), none).some((x) => x.type === "confirmed")).toBe(true);
    expect(detectArticleEvents(base({ status: "dead" }), none).some((x) => x.type === "dead")).toBe(true);
  });

  it("requires a resolved destination and a valuation — our angle needs both", () => {
    expect(detectArticleEvents(base({ toClub: "—" }), none)).toHaveLength(0);
    expect(detectArticleEvents(base({ onsideValueM: 0 }), none)).toHaveLength(0);
  });
});
