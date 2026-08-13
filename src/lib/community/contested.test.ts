import { describe, it, expect } from "vitest";
import { contestedness, rankForBoard, callOfTheDay, type BoardSortable } from "./contested";

const d = (id: string, pct: number, argument = 0, lastUpdate = "2026-08-01T00:00:00.000Z"): BoardSortable => ({
  id,
  confidencePct: pct,
  argument,
  lastUpdate,
});

describe("contestedness", () => {
  it("peaks at a coin flip and falls off toward certainty", () => {
    expect(contestedness(50)).toBeGreaterThan(contestedness(70));
    expect(contestedness(70)).toBeGreaterThan(contestedness(95));
  });
  it("is symmetric — 30% is as arguable as 70%", () => {
    expect(contestedness(30)).toBe(contestedness(70));
  });
  it("is bounded to [0,1]", () => {
    for (const p of [0, 1, 25, 50, 75, 99, 100]) {
      expect(contestedness(p)).toBeGreaterThanOrEqual(0);
      expect(contestedness(p)).toBeLessThanOrEqual(1);
    }
  });
});

describe("rankForBoard", () => {
  it("puts argued-about deals first, whatever the house number", () => {
    const out = rankForBoard([d("quiet", 50, 0), d("loud", 96, 5)]);
    expect(out[0].id).toBe("loud");
  });
  it("falls through to contestedness when nobody has spoken — the day-one case", () => {
    const out = rankForBoard([d("certain", 97), d("coinflip", 51), d("likely", 78)]);
    expect(out.map((x) => x.id)).toEqual(["coinflip", "likely", "certain"]);
  });
  it("breaks a remaining tie on recency, newest first", () => {
    const out = rankForBoard([
      d("older", 50, 0, "2026-07-01T00:00:00.000Z"),
      d("newer", 50, 0, "2026-08-01T00:00:00.000Z"),
    ]);
    expect(out[0].id).toBe("newer");
  });
  it("does not mutate its input", () => {
    const input = [d("a", 97), d("b", 51)];
    const before = input.map((x) => x.id);
    rankForBoard(input);
    expect(input.map((x) => x.id)).toEqual(before);
  });
});

// callOfTheDay has no test in the task's given suite. Adding coverage here for the
// pure-function contract the current implementation actually has: determinism, variation,
// the empty-input case, and the closed-world guarantee. NOT covering "privacy note"
// semantics — that's a separate, not-yet-implemented concern (tracked as its own later
// task) and inventing tests for it now would be testing behaviour that doesn't exist.
//
// utcDate is exercised here mostly as a plain "YYYY-MM-DD" string, but the function
// normalizes its input to the first 10 characters before hashing, so a caller that passes
// a full ISO timestamp lands on the same pick as one that passes the truncated date — see
// the "normalizes to calendar day" cases below, which lock that in (this used to be a
// caller-discipline footgun: same-day timestamps a few hours apart could hash to different
// picks. Now normalized inside the function so it can't be misused).
describe("callOfTheDay", () => {
  it("returns null on an empty list", () => {
    expect(callOfTheDay([], "2026-08-12")).toBeNull();
  });

  it("is stable for a given date — same input, same date, same pick", () => {
    const deals = [d("a", 51), d("b", 78), d("c", 97), d("e", 60)];
    const first = callOfTheDay(deals, "2026-08-12");
    const second = callOfTheDay(deals, "2026-08-12");
    expect(second).toBe(first);
  });

  it("normalizes to calendar day — a full ISO timestamp lands on the same pick as its truncated date", () => {
    const deals = [d("a", 51), d("b", 78), d("c", 97), d("e", 60)];
    const truncated = callOfTheDay(deals, "2026-08-12");
    const fullTimestamp = callOfTheDay(deals, "2026-08-12T00:00:00.000Z");
    expect(fullTimestamp).toBe(truncated);
  });

  it("normalizes to calendar day — two different times on the same day agree", () => {
    const deals = [d("a", 51), d("b", 78), d("c", 97), d("e", 60)];
    const midnight = callOfTheDay(deals, "2026-08-12T00:00:00.000Z");
    const midMorning = callOfTheDay(deals, "2026-08-12T09:41:07.123Z");
    expect(midMorning).toBe(midnight);
  });

  it("changes across dates once there is more than one candidate", () => {
    const deals = Array.from({ length: 10 }, (_, i) => d(`deal-${i}`, 50 + i));
    const dates = Array.from({ length: 30 }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")}`);
    const picks = new Set(dates.map((date) => callOfTheDay(deals, date)?.id));
    expect(picks.size).toBeGreaterThan(1);
  });

  it("never returns a deal outside the input", () => {
    const deals = [d("a", 51), d("b", 78), d("c", 97)];
    for (const date of ["2026-01-01", "2026-06-15", "2026-12-31"]) {
      const pick = callOfTheDay(deals, date);
      expect(deals).toContain(pick);
    }
  });

  it("only rotates through the top 10 most-contested deals, never the long tail", () => {
    // 15 deals, all one-sided (51..79) so contestedness ranks them with no ties and no
    // tiebreak ambiguity: p51 is the closest to a coin flip, p79 the furthest.
    const deals = [];
    for (let pct = 51; pct <= 79; pct += 2) deals.push(d(`p${pct}`, pct));
    const tail = rankForBoard(deals).slice(10).map((x) => x.id); // p71, p73, p75, p77, p79
    const dates = Array.from({ length: 30 }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")}`);
    const picks = dates.map((date) => callOfTheDay(deals, date)?.id);
    expect(picks.some((id) => tail.includes(id!))).toBe(false);
  });
});
