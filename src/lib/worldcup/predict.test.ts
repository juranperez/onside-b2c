import { describe, it, expect } from "vitest";
import type { Bracket, BracketSlot, BracketTeam, RoundName } from "./bracket";
import { resolveBracket, champion, isComplete, encodeSides, decodeSides, TIE_COUNT, type Side } from "./predict";

function team(slug: string): BracketTeam {
  return { slug, name: slug, valueM: 100 };
}
function slot(round: RoundName, index: number, home: string | null, away: string | null, sh: number | null = null, sa: number | null = null, status: BracketSlot["status"] = null): BracketSlot {
  return {
    round, index,
    home: home ? team(home) : null,
    away: away ? team(away) : null,
    scoreHome: sh, scoreAway: sa,
    status: status ?? (home && away ? "scheduled" : null),
    kickoff: null, forecast: null,
  };
}
function empty(round: RoundName, size: number): BracketSlot[] {
  return Array.from({ length: size }, (_, i) => slot(round, i, null, null));
}

/** 16 R32 ties with distinct teams a0..a15 (home) vs b0..b15 (away). */
function testBracket(mut?: (r32: BracketSlot[]) => void): Bracket {
  const r32 = Array.from({ length: 16 }, (_, i) => slot("Round of 32", i, `a${i}`, `b${i}`));
  mut?.(r32);
  return {
    rounds: [
      { name: "Round of 32", slots: r32 },
      { name: "Round of 16", slots: empty("Round of 16", 8) },
      { name: "Quarter-finals", slots: empty("Quarter-finals", 4) },
      { name: "Semi-finals", slots: empty("Semi-finals", 2) },
      { name: "Final", slots: empty("Final", 1) },
    ],
  };
}

describe("resolveBracket cascade", () => {
  it("advances every top seed when all picks are home", () => {
    const sides: Side[] = new Array(TIE_COUNT).fill(0);
    const resolved = resolveBracket(testBracket(), sides);
    expect(champion(resolved)?.slug).toBe("a0");
    expect(isComplete(resolved)).toBe(true);
    // R16 slot 0 is fed by R32 0 & 1, both home advancers.
    expect(resolved[16].home?.slug).toBe("a0");
    expect(resolved[16].away?.slug).toBe("a1");
  });

  it("advances every bottom seed when all picks are away", () => {
    const sides: Side[] = new Array(TIE_COUNT).fill(1);
    const resolved = resolveBracket(testBracket(), sides);
    expect(champion(resolved)?.slug).toBe("b15");
  });

  it("leaves later rounds unresolved until feeders are picked", () => {
    const sides: Side[] = new Array(TIE_COUNT).fill(null);
    const resolved = resolveBracket(testBracket(), sides);
    expect(champion(resolved)).toBeNull();
    expect(isComplete(resolved)).toBe(false);
    expect(resolved[0].pickable).toBe(true); // R32 ties are pickable immediately
    expect(resolved[16].pickable).toBe(false); // R16 has no teams yet
  });
});

describe("decisive results lock", () => {
  it("forces the real winner regardless of the user's side", () => {
    const bracket = testBracket((r32) => {
      r32[0] = slot("Round of 32", 0, "a0", "b0", 2, 1, "finished"); // a0 won
    });
    const sides: Side[] = new Array(TIE_COUNT).fill(0);
    sides[0] = 1; // user tries to pick the loser
    const resolved = resolveBracket(bracket, sides);
    expect(resolved[0].lockedWinner).toBe(0);
    expect(resolved[0].pickable).toBe(false);
    expect(resolved[0].advancer?.slug).toBe("a0");
  });

  it("keeps a drawn (penalty) result open to prediction", () => {
    const bracket = testBracket((r32) => {
      r32[0] = slot("Round of 32", 0, "a0", "b0", 1, 1, "finished"); // draw → pens
    });
    const resolved = resolveBracket(bracket, new Array(TIE_COUNT).fill(1));
    expect(resolved[0].lockedWinner).toBeNull();
    expect(resolved[0].pickable).toBe(true);
    expect(resolved[0].advancer?.slug).toBe("b0"); // user's pick stands
  });
});

describe("share code round-trip", () => {
  it("preserves every pick side", () => {
    const sides: Side[] = new Array(TIE_COUNT).fill(0);
    [0, 3, 7, 15, 16, 24, 28, 30].forEach((i) => (sides[i] = 1));
    const decoded = decodeSides(encodeSides(sides));
    for (let i = 0; i < TIE_COUNT; i++) {
      expect(decoded[i]).toBe(sides[i] === 1 ? 1 : 0);
    }
  });

  it("produces the same champion after a round-trip", () => {
    const sides: Side[] = new Array(TIE_COUNT).fill(0);
    [1, 5, 18, 30].forEach((i) => (sides[i] = 1));
    const before = champion(resolveBracket(testBracket(), sides));
    const after = champion(resolveBracket(testBracket(), decodeSides(encodeSides(sides))));
    expect(after?.slug).toBe(before?.slug);
  });

  it("handles an empty code", () => {
    expect(decodeSides("").every((s) => s === 0)).toBe(true);
  });
});
