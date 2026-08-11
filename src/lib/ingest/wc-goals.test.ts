// src/lib/ingest/wc-goals.test.ts
import { describe, it, expect } from "vitest";
import { extractGoals, goalSignature, matchMinute, goalConfirmed, type FixtureEvent } from "./wc-goals";

const ev = (type: string, detail: string, playerId: number | null, playerName: string, teamId: number, elapsed: number): FixtureEvent => ({
  type, detail,
  player: { id: playerId, name: playerName },
  team: { id: teamId, name: "T" },
  time: { elapsed },
});

describe("extractGoals", () => {
  it("keeps normal goals and penalties, drops own goals, cards, subs, VAR", () => {
    const events = [
      ev("Goal", "Normal Goal", 100, "Tyler Adams", 1, 23),
      ev("Goal", "Penalty", 200, "Kane", 2, 55),
      ev("Goal", "Own Goal", 300, "Smith", 1, 70),
      ev("Card", "Yellow Card", 400, "Doe", 2, 40),
      ev("subst", "Substitution 1", 500, "Sub", 1, 60),
      ev("Var", "Goal Disallowed - offside", 600, "Off", 2, 80),
    ];
    expect(extractGoals(events)).toEqual([
      { scorerId: "100", scorerName: "Tyler Adams", teamId: 1, minute: 23 },
      { scorerId: "200", scorerName: "Kane", teamId: 2, minute: 55 },
    ]);
  });
  it("drops goals with no identified scorer", () => {
    expect(extractGoals([ev("Goal", "Normal Goal", null, "", 1, 10)])).toEqual([]);
  });
});

describe("goalSignature", () => {
  it("is stable per fixture+scorer+minute (dedup key)", () => {
    expect(goalSignature("wc2026-123", "100", 23)).toBe("wc2026-123:100:23");
  });
});

describe("matchMinute", () => {
  const ko = "2026-06-13T18:00:00Z";
  it("is 0 before kickoff / with no kickoff", () => {
    expect(matchMinute(null, Date.parse("2026-06-13T19:00:00Z"))).toBe(0);
    expect(matchMinute(ko, Date.parse("2026-06-13T17:59:00Z"))).toBe(0);
  });
  it("tracks first-half minutes 1:1", () => {
    expect(Math.round(matchMinute(ko, Date.parse("2026-06-13T18:30:00Z")))).toBe(30);
  });
  it("subtracts the ~17' half-time gap in the second half", () => {
    // 65 wall-clock minutes in → ~48' of play (65 - 17).
    expect(Math.round(matchMinute(ko, Date.parse("2026-06-13T19:05:00Z")))).toBe(48);
  });
});

describe("goalConfirmed (VAR buffer)", () => {
  const ko = "2026-06-13T18:00:00Z";
  it("holds a too-fresh goal (just scored)", () => {
    // 23' wall-clock in, goal at 23' → 0 buffer elapsed → not yet confirmed.
    expect(goalConfirmed(ko, 23, Date.parse("2026-06-13T18:23:10Z"))).toBe(false);
  });
  it("confirms once ~90s of match time has passed", () => {
    // goal at 23', now 25' in → 2 match-min later → confirmed.
    expect(goalConfirmed(ko, 23, Date.parse("2026-06-13T18:25:00Z"))).toBe(true);
  });
});
