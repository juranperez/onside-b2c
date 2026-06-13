import { describe, it, expect } from "vitest";
import { decideRomanoBreak, type BreakInput } from "./romano-break";

const base: BreakInput = {
  playerId: "p1",
  toClub: "Liverpool",
  strength: "strong",
  existingForPlayer: [],
};

describe("decideRomanoBreak", () => {
  it("publishes a NEW break on a clean parse with no existing saga", () => {
    expect(decideRomanoBreak(base)).toEqual({ kind: "publish-break" });
  });
  it("holds for review when the player is unresolved", () => {
    expect(decideRomanoBreak({ ...base, playerId: null }).kind).toBe("hold");
  });
  it("holds for review when the club is unresolved", () => {
    expect(decideRomanoBreak({ ...base, toClub: "—" }).kind).toBe("hold");
  });
  it("holds when the player match is only weak/unique, not strong", () => {
    expect(decideRomanoBreak({ ...base, strength: "unique" }).kind).toBe("hold");
  });
  it("upgrades an existing live saga for that player instead of duplicating", () => {
    const d = decideRomanoBreak({
      ...base,
      existingForPlayer: [{ id: "r1", status: "rumour", to_club: "Liverpool" }],
    });
    expect(d).toEqual({ kind: "upgrade-break", targetId: "r1" });
  });
  it("does nothing if the saga is already confirmed (official beat Romano)", () => {
    const d = decideRomanoBreak({
      ...base,
      existingForPlayer: [{ id: "r1", status: "confirmed", to_club: "Liverpool" }],
    });
    expect(d.kind).toBe("skip");
  });
});
