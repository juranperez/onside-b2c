import type { FixtureStatus } from "@/lib/queries";

/** Structural subset of WcFixture that the day/ticker helpers need. */
export interface DayFixture {
  kickoff: string | null;
  status: FixtureStatus;
}

const ET = "America/New_York"; // site-wide match time convention (see worldcup/schedule)
const etDayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: ET }); // YYYY-MM-DD; hoisted — construction is the costly part
const dayKey = (d: Date) => etDayFmt.format(d);

/** Fixtures kicking off on the same ET calendar day as `now`, in input order. */
export function todaysFixtures<T extends DayFixture>(fixtures: T[], now: Date): T[] {
  const today = dayKey(now);
  return fixtures.filter((f) => f.kickoff && dayKey(new Date(f.kickoff)) === today);
}

/** "Group Stage - 1" → "Matchday 1"; otherwise the round name (or "Fixtures"). */
export function roundLabel(round: string | null): string {
  const m = round?.match(/Group Stage - (\d)/);
  return m ? `Matchday ${m[1]}` : (round ?? "Fixtures");
}

export interface MatchdaySlate<T> {
  label: string;
  isToday: boolean;
  fixtures: T[];
}

/** The hub's lead slate: today's fixtures (ET), else the next calendar day (ET) that has fixtures. */
export function matchdaySlate<T extends DayFixture & { round: string | null }>(
  fixtures: T[],
  now: Date,
): MatchdaySlate<T> {
  const today = todaysFixtures(fixtures, now);
  if (today.length > 0) {
    return { label: roundLabel(today[0].round), isToday: true, fixtures: today };
  }
  const upcoming = fixtures
    .filter((f) => f.kickoff && new Date(f.kickoff).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.kickoff ?? 0).getTime() - new Date(b.kickoff ?? 0).getTime());
  if (upcoming.length === 0) return { label: "", isToday: false, fixtures: [] };
  const nextDay = dayKey(new Date(upcoming[0].kickoff as string));
  const slate = upcoming.filter((f) => dayKey(new Date(f.kickoff as string)) === nextDay);
  return { label: roundLabel(slate[0].round), isToday: false, fixtures: slate };
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
