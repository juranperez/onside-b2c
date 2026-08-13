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
  it("pins the boundaries exactly", () => {
    expect(contestedness(50)).toBe(1);
    expect(contestedness(0)).toBe(0);
    expect(contestedness(100)).toBe(0);
  });
  it("is bounded to [0,1], including out-of-range input", () => {
    for (const p of [0, 1, 25, 50, 75, 99, 100, 120, -5]) {
      expect(contestedness(p)).toBeGreaterThanOrEqual(0);
      expect(contestedness(p)).toBeLessThanOrEqual(1);
    }
  });
  it("clamps out-of-range input to its nearest boundary rather than extrapolating", () => {
    expect(contestedness(120)).toBe(contestedness(100));
    expect(contestedness(-5)).toBe(contestedness(0));
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

// callOfTheDay draws its pool by CONTESTEDNESS ALONE — see the doc comment on the function
// in ./contested.ts for why it deliberately does not call rankForBoard (a promotion ->
// engagement -> permanent-argument -> permanent-pool feedback loop that seals the pool
// shut). The "ignores argument" test below is the regression lock for that; everything
// else here is the rest of the pure-function contract: determinism per calendar day, the
// empty-input case, the closed-world guarantee, and the top-N cutoff.
const byContestedness = <T extends BoardSortable>(deals: T[]): T[] =>
  [...deals].sort(
    (a, b) =>
      contestedness(b.confidencePct) - contestedness(a.confidencePct) ||
      new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime(),
  );

describe("callOfTheDay", () => {
  it("returns null on an empty list", () => {
    expect(callOfTheDay([], new Date("2026-08-12T00:00:00.000Z"))).toBeNull();
  });

  it("is stable for a given day — same input, same day, same pick", () => {
    const deals = [d("a", 51), d("b", 78), d("c", 97), d("e", 60)];
    const first = callOfTheDay(deals, new Date("2026-08-12T00:00:00.000Z"));
    const second = callOfTheDay(deals, new Date("2026-08-12T00:00:00.000Z"));
    expect(second).toBe(first);
  });

  it("agrees for any two times on the same UTC calendar day", () => {
    const deals = [d("a", 51), d("b", 78), d("c", 97), d("e", 60)];
    const midnight = callOfTheDay(deals, new Date("2026-08-12T00:00:00.000Z"));
    const midMorning = callOfTheDay(deals, new Date("2026-08-12T09:41:07.123Z"));
    const lastInstant = callOfTheDay(deals, new Date("2026-08-12T23:59:59.999Z"));
    expect(midMorning).toBe(midnight);
    expect(lastInstant).toBe(midnight);
  });

  it("ignores argument entirely when building its pool — the fix for the promotion feedback loop", () => {
    // A "veteran" deal: huge argument (as if it had been Call of the Day many times and
    // accumulated engagement from it) but a house number nobody would seriously dispute.
    // rankForBoard (argument-first) would put it in slot 0; callOfTheDay must not follow.
    const healthy: BoardSortable[] = [];
    for (let pct = 51; pct <= 69; pct += 2) healthy.push(d(`healthy-${pct}`, pct));
    const veteran = d("veteran", 95, 500);
    const mixed = [...healthy, veteran];

    // Sanity check on the trap this guards against: rankForBoard really would promote it.
    expect(rankForBoard(mixed)[0].id).toBe("veteran");

    const days = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 7, i + 1)));
    const picks = days.map((date) => callOfTheDay(mixed, date)?.id);
    expect(picks).not.toContain("veteran");
  });

  it("walks the pool one position per day and wraps at the pool size — a full cycle is a permutation, not a repeat", () => {
    const deals = Array.from({ length: 10 }, (_, i) => d(`deal-${i}`, 50 + i));
    const days = Array.from({ length: 10 }, (_, i) => new Date(Date.UTC(2026, 7, 1 + i)));
    const picks = days.map((date) => callOfTheDay(deals, date)?.id);
    expect(new Set(picks).size).toBe(10); // every deal exactly once over one full cycle
  });

  it("never returns a deal outside the input, including for a pre-epoch date", () => {
    const deals = [d("a", 51), d("b", 78), d("c", 97)];
    const dates = [new Date("2026-01-01"), new Date("2026-06-15"), new Date("2026-12-31"), new Date("2020-01-01")];
    for (const date of dates) {
      const pick = callOfTheDay(deals, date);
      expect(deals).toContain(pick);
    }
  });

  it("only rotates through the top 10 most-contested deals, never the long tail", () => {
    // 15 deals, all one-sided (51..79) so contestedness ranks them with no ties and no
    // tiebreak ambiguity: p51 is the closest to a coin flip, p79 the furthest.
    const deals: BoardSortable[] = [];
    for (let pct = 51; pct <= 79; pct += 2) deals.push(d(`p${pct}`, pct));
    const tail = byContestedness(deals).slice(10).map((x) => x.id); // p71, p73, p75, p77, p79
    const days = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 7, i + 1)));
    const picks = days.map((date) => callOfTheDay(deals, date)?.id);
    expect(picks.some((id) => tail.includes(id!))).toBe(false);
  });
});
