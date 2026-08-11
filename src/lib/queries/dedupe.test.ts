import { describe, it, expect } from "vitest";
import { dedupeSagas } from "./dedupe";
import type { RumourItem } from "./rumours";

const item = (over: Partial<RumourItem> & { id: string; playerId: string }): RumourItem =>
  ({
    id: over.id,
    status: over.status ?? "rumour",
    summary: over.summary ?? "s",
    source: over.source ?? "BBC",
    sourceTier: over.sourceTier ?? 2,
    corroborations: over.corroborations ?? 1,
    toClub: over.toClub ?? "Leeds",
    reportedFeeM: over.reportedFeeM ?? null,
    onsideValueM: over.onsideValueM ?? 20,
    firstSeen: over.firstSeen ?? "2026-08-01T00:00:00Z",
    lastUpdate: over.lastUpdate ?? "2026-08-01T00:00:00Z",
    url: null,
    player: {
      id: over.playerId, slug: "p", name: "P", photoUrl: null, pos: "GK",
      fromClub: "Man City", clubBg: "#000", clubColor: "#fff", clubShort: "MCI",
    },
    league: null,
    leagueSlug: null,
    confidence: { pct: 50, band: "medium", factors: [] },
  }) as RumourItem;

describe("dedupeSagas", () => {
  it("collapses the same player+destination into ONE card", () => {
    const out = dedupeSagas([
      item({ id: "a", playerId: "trafford" }),
      item({ id: "b", playerId: "trafford" }),
      item({ id: "c", playerId: "trafford" }),
    ]);
    expect(out).toHaveLength(1);
  });

  it("keeps the furthest-along status as the survivor", () => {
    const out = dedupeSagas([
      item({ id: "live", playerId: "t", status: "rumour" }),
      item({ id: "done", playerId: "t", status: "confirmed" }),
    ]);
    expect(out[0].id).toBe("done");
  });

  it("prefers the more corroborated row at equal status", () => {
    const out = dedupeSagas([
      item({ id: "thin", playerId: "t", corroborations: 1 }),
      item({ id: "thick", playerId: "t", corroborations: 9 }),
    ]);
    expect(out[0].id).toBe("thick");
  });

  it("prefers the more credible source when status and weight tie", () => {
    const out = dedupeSagas([
      item({ id: "tier3", playerId: "t", sourceTier: 3 }),
      item({ id: "tier0", playerId: "t", sourceTier: 0 }),
    ]);
    expect(out[0].id).toBe("tier0");
  });

  it("sums corroborations so the card reflects the real weight of reporting", () => {
    const out = dedupeSagas([
      item({ id: "a", playerId: "t", corroborations: 4 }),
      item({ id: "b", playerId: "t", corroborations: 3 }),
    ]);
    expect(out[0].corroborations).toBe(7);
  });

  it("keeps genuinely different destinations apart — those are rival sagas", () => {
    const out = dedupeSagas([
      item({ id: "a", playerId: "t", toClub: "Leeds" }),
      item({ id: "b", playerId: "t", toClub: "Newcastle" }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("drops an unresolved-destination row when the player already has a real one", () => {
    const out = dedupeSagas([
      item({ id: "open", playerId: "t", toClub: "—" }),
      item({ id: "real", playerId: "t", toClub: "Chelsea" }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["real"]);
  });

  it("keeps an unresolved row when it is all we have", () => {
    expect(dedupeSagas([item({ id: "open", playerId: "t", toClub: "—" })])).toHaveLength(1);
  });

  it("leaves different players alone and preserves feed order", () => {
    const out = dedupeSagas([
      item({ id: "first", playerId: "a" }),
      item({ id: "second", playerId: "b" }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["first", "second"]);
  });
});
