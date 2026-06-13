import { describe, it, expect } from "vitest";
import { todaysFixtures, tickerFixtures, type DayFixture } from "./wc-day";

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
    expect(picks[0]).toBe(live);
    expect(picks).toHaveLength(4);
    expect(picks).not.toContain(finished);
  });
  it("returns empty when no fixtures today", () => {
    expect(tickerFixtures([fx("2026-06-20T16:00:00Z", "scheduled")], NOW)).toEqual([]);
  });
});
