import { describe, it, expect } from "vitest";
import { buildPlayerIndex, matchPlayer, stripJournalists } from "./match";

// A small population reproducing the real misfires from the 2026-06-11 queue audit.
const PLAYERS = [
  { id: "schmid", name_norm: "romano schmid" },
  { id: "osimhen", name_norm: "victor james osimhen" },
  { id: "raul", name_norm: "raul alonso jimenez rodriguez" },
  { id: "alejandro", name_norm: "alejandro jimenez" },
  { id: "anderson", name_norm: "elliot anderson" },
  { id: "baleba", name_norm: "carlos noom quomah baleba" },
];

const idx = buildPlayerIndex(PLAYERS);

describe("stripJournalists", () => {
  it("removes full journalist names but keeps bare surnames", () => {
    expect(stripJournalists("Fabrizio Romano confirms Liverpool boost")).not.toContain("romano");
    expect(stripJournalists("Romano Schmid agrees move")).toContain("romano schmid");
  });
});

describe("matchPlayer with byline stripping", () => {
  it("a Fabrizio Romano byline never matches Romano Schmid", () => {
    const h = stripJournalists("'Here we go': Crystal Palace reach agreement for Pierre Sage - Fabrizio Romano");
    expect(matchPlayer(h, idx)).toBeNull();
  });

  it("a real Romano Schmid story still matches him strongly", () => {
    const h = stripJournalists("Romano Schmid open to Premier League transfer this summer");
    expect(matchPlayer(h, idx)).toEqual({ playerId: "schmid", strength: "strong" });
  });

  it("Raul Jimenez resolves to Raul, not Alejandro, when both are indexed", () => {
    const h = stripJournalists("Raul Jimenez: Wolves re-sign Mexico striker from Fulham");
    expect(matchPlayer(h, idx)?.playerId).toBe("raul");
  });

  it("Osimhen resolves via his unique surname", () => {
    const h = stripJournalists("Victor Osimhen transfer: Atletico Madrid lead Chelsea in race");
    expect(matchPlayer(h, idx)?.playerId).toBe("osimhen");
  });

  it("Baleba resolves via his unique surname even though the headline lacks his other names", () => {
    const h = stripJournalists("Brighton midfielder Carlos Baleba discusses potential Old Trafford move");
    expect(matchPlayer(h, idx)?.playerId).toBe("baleba");
  });

  it("Anderson full-name match is strong", () => {
    const h = stripJournalists("Forest want British record for Elliot Anderson as Man City have bid rejected");
    expect(matchPlayer(h, idx)).toEqual({ playerId: "anderson", strength: "strong" });
  });
});
