// Contested — pure ranking for the community board and its one daily highlight.
//
// Two different questions, two different functions, on purpose:
//   rankForBoard  — "what IS being argued about" (argument-led; the board, every deal)
//   callOfTheDay  — "what SHOULD we argue about today" (contestedness-led only; one pick)
// callOfTheDay does not call rankForBoard and does not look at `argument`. See its doc
// comment for why that separation is load-bearing, not a style choice.
//
// Guarantees: both ranking functions are total orders over their input with no gaps, and
// neither mutates it. callOfTheDay is a pure function of (deals, calendar day) alone —
// same day, same deals in, same deal out, for every caller, forever — and never returns
// anything outside its input.

import { dayIndexFor } from "@/lib/valuation/pulse";

export interface BoardSortable {
  id: string;
  confidencePct: number;
  /** Calls + comments from MEMBERS only. Anonymous calls never feed this — see the spec. */
  argument: number;
  lastUpdate: string;
}

/**
 * How arguable the house number is, in [0,1].
 *
 * 1 at a coin flip (50), 0 at total certainty (0 or 100). A deal the model puts at 51% is
 * worth disagreeing with; one at 97% is not an argument, it is an announcement.
 *
 * The exact curve is currently ordering-irrelevant: every caller uses this only as a
 * strict sort / tie-break key over a finite set, so any strictly monotonic transform of
 * |50-p| would produce a bit-identical board and pool — this specific linear shape has no
 * behavioural consequence today. It starts to matter the moment a caller renders the
 * number itself or blends it into a composite score; only then does the curve's shape
 * stop being free to change without visibly changing that output.
 */
export function contestedness(confidencePct: number): number {
  const p = Math.min(100, Math.max(0, confidencePct));
  return 1 - Math.abs(50 - p) / 50;
}

/**
 * Board order: what people are arguing about, then what is worth arguing about, then
 * what is newest.
 *
 * The second key is what carries the product today. With 11 calls across 487 deals the
 * argument count is zero almost everywhere, so "where is Onside least sure" is the honest
 * proxy for "where is your opinion worth something".
 */
export function rankForBoard<T extends BoardSortable>(deals: T[]): T[] {
  return [...deals].sort(
    (a, b) =>
      b.argument - a.argument ||
      contestedness(b.confidencePct) - contestedness(a.confidencePct) ||
      new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime(),
  );
}

/**
 * Size of the pool `callOfTheDay` rotates through — deliberately its own number, not
 * `BOARD_SIZE` (defined in `queries.ts`, currently 30). The board shows what people are
 * arguing about across the whole live set; the daily pick draws from a much tighter ring
 * of "most arguable right now" so the rotation stays meaningful. The two are unrelated on
 * purpose and should not be made to match by coincidence or by a future refactor.
 */
const ROTATION_POOL = 10;

/**
 * The day's shared argument — one deal, the same for every visitor on a given UTC
 * calendar day.
 *
 * Takes a `Date`, not a date string: `dayIndexFor` (the repo's existing calendar-day-index
 * primitive, from `valuation/pulse`) works in epoch milliseconds, so there is no string
 * format for a caller to get subtly wrong — no "2026-8-12" vs "2026-08-12" landing on
 * different picks for the same day, no `.toDateString()` silently dropping the year. A
 * `Date` normalizes itself; a string only ever looks like it does.
 *
 * The pool is chosen by CONTESTEDNESS ALONE — never `rankForBoard`, never `argument`. This
 * is the one piece of this file that must not be "simplified" back to reusing the board's
 * ranking. `argument` is a running total of member engagement (see `queries.ts`); if it
 * gated pool membership, being picked as Call of the Day would itself generate argument,
 * which would keep that same deal in the pool, which would win it the pick again.
 * Simulated over 60 days at a realistic promotion rate: the pool seals shut around 10
 * deals out of 487, permanently, and a brand-new 50/50 saga — argument zero by definition
 * — can never enter it to earn its way out. Sorting the pool by contestedness instead
 * keeps every close call eligible regardless of how much or little anyone has said about
 * it yet, which is the actual point of a daily pick: it is where the conversation should
 * start, not a trophy for where it already happened.
 *
 * The rotation itself is an explicit day-index walk — one position per day, wrapping
 * every `ROTATION_POOL` days — not a hash standing in for one. That is intended, not a
 * simplification to fix later: with a pool this small, "looks random" and "is
 * predictable" are the same three-word bug report, so the honest version is the plain
 * one. Returns null on an empty list.
 */
export function callOfTheDay<T extends BoardSortable>(deals: T[], date: Date): T | null {
  if (!deals.length) return null;
  const pool = [...deals]
    .sort(
      (a, b) =>
        contestedness(b.confidencePct) - contestedness(a.confidencePct) ||
        new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime(),
    )
    .slice(0, ROTATION_POOL);
  const dayIndex = dayIndexFor(date);
  const idx = ((dayIndex % pool.length) + pool.length) % pool.length; // guard a pre-epoch date
  return pool[idx];
}
