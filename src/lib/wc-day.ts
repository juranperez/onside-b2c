import type { FixtureStatus } from "@/lib/queries";

/** Structural subset of WcFixture that the day/ticker helpers need. */
export interface DayFixture {
  kickoff: string | null;
  status: FixtureStatus;
}

const ET = "America/New_York"; // site-wide match time convention (see worldcup/schedule)
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ET }).format(d); // YYYY-MM-DD

/** Fixtures kicking off on the same ET calendar day as `now`, in input order. */
export function todaysFixtures<T extends DayFixture>(fixtures: T[], now: Date): T[] {
  const today = dayKey(now);
  return fixtures.filter((f) => f.kickoff && dayKey(new Date(f.kickoff)) === today);
}

const STATUS_RANK: Record<FixtureStatus, number> = { live: 0, scheduled: 1, finished: 2, postponed: 3 };

/** Ticker picks: live first, then today's upcoming by kickoff, then finished — capped. */
export function tickerFixtures<T extends DayFixture>(fixtures: T[], now: Date, cap = 4): T[] {
  return [...todaysFixtures(fixtures, now)]
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        new Date(a.kickoff ?? 0).getTime() - new Date(b.kickoff ?? 0).getTime(),
    )
    .slice(0, cap);
}
