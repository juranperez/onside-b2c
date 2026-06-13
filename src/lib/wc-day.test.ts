import { describe, it, expect } from "vitest";
import { todaysFixtures, tickerFixtures, roundLabel, matchdaySlate, type DayFixture } from "./wc-day";

// 2026-06-12 in ET spans 04:00Z Jun 12 → 03:59Z Jun 13.
const NOW = new Date("2026-06-12T18:00:00Z");

const fx = (kickoff: string | null, status: DayFixture["status"]): DayFixture => ({ kickoff, status });

describe("todaysFixtures", () => {
  it("keeps only fixtures on the same ET calendar day", () => {
    const todayEarly = fx("2026-06-12T16:00:00Z", "finished");
    const todayLate = fx("2026-06-13T02:00:00Z", "scheduled"); // 10pm ET Jun 12
    const tomorrow = fx("2026-06-13T16:00:00Z", "scheduled");
    const yesterday = fx("2026-06-11T20:00:00Z", "finished");
    const noKickoff = fx(null, "scheduled");
    expect(todaysFixtures([todayEarly, todayLate, tomorrow, yesterday, noKickoff], NOW)).toEqual([
      todayEarly, todayLate,
    ]);
  });
});

describe("tickerFixtures", () => {
  it("orders live > scheduled > finished and caps the list", () => {
    const finished = fx("2026-06-12T14:00:00Z", "finished");
    const live = fx("2026-06-12T17:00:00Z", "live");
    const up1 = fx("2026-06-12T20:00:00Z", "scheduled");
    const up2 = fx("2026-06-12T22:00:00Z", "scheduled");
    const up3 = fx("2026-06-13T01:00:00Z", "scheduled");
    const picks = tickerFixtures([finished, up1, live, up2, up3], NOW, 4);
    expect(picks).toEqual([live, up1, up2, up3]);
    expect(picks).not.toContain(finished);
  });
  it("returns empty when no fixtures today", () => {
    expect(tickerFixtures([fx("2026-06-20T16:00:00Z", "scheduled")], NOW)).toEqual([]);
  });
});

const sf = (kickoff: string | null, status: "scheduled" | "live" | "finished" | "postponed", round: string | null) =>
  ({ kickoff, status, round });

describe("roundLabel", () => {
  it("maps group-stage rounds to Matchday N", () => {
    expect(roundLabel("Group Stage - 1")).toBe("Matchday 1");
    expect(roundLabel("Group Stage - 3")).toBe("Matchday 3");
  });
  it("passes through knockout round names; falls back to Fixtures", () => {
    expect(roundLabel("Round of 16")).toBe("Round of 16");
    expect(roundLabel(null)).toBe("Fixtures");
  });
});

describe("matchdaySlate", () => {
  const NOW = new Date("2026-06-12T18:00:00Z"); // ET Jun 12

  it("returns today's fixtures with the matchday label when there are any today", () => {
    const a = sf("2026-06-12T16:00:00Z", "finished", "Group Stage - 1");
    const b = sf("2026-06-13T01:00:00Z", "scheduled", "Group Stage - 1"); // 9pm ET Jun 12
    const tomorrow = sf("2026-06-13T16:00:00Z", "scheduled", "Group Stage - 1");
    const s = matchdaySlate([a, b, tomorrow], NOW);
    expect(s.isToday).toBe(true);
    expect(s.label).toBe("Matchday 1");
    expect(s.fixtures).toEqual([a, b]);
  });

  it("falls back to the next calendar day's fixtures when today has none", () => {
    const d1 = sf("2026-06-14T16:00:00Z", "scheduled", "Group Stage - 2");
    const d1b = sf("2026-06-14T20:00:00Z", "scheduled", "Group Stage - 2");
    const d2 = sf("2026-06-15T16:00:00Z", "scheduled", "Group Stage - 2");
    const s = matchdaySlate([d1, d1b, d2], NOW);
    expect(s.isToday).toBe(false);
    expect(s.label).toBe("Matchday 2");
    expect(s.fixtures).toEqual([d1, d1b]); // only the next day with fixtures, not the whole round
  });

  it("is empty when there are no fixtures at all", () => {
    expect(matchdaySlate([], NOW)).toEqual({ label: "", isToday: false, fixtures: [] });
  });
});
