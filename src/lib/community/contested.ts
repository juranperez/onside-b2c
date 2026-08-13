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
 * 1 at a coin flip, 0 at total certainty. A deal the model puts at 51% is worth
 * disagreeing with; one at 97% is not an argument, it is an announcement.
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
 * The day's shared argument, pinned to a UTC date.
 *
 * Deliberately not "the most contested right now": everyone arriving today must land on
 * the same deal, or there is no shared conversation to join. `utcDate` is normalized to a
 * calendar day (its first 10 characters, "YYYY-MM-DD") before hashing, so a caller that
 * passes a full ISO timestamp — e.g. `new Date().toISOString()` — is handled correctly
 * rather than silently producing per-second picks; it lands on the same deal as a caller
 * that already truncated. Returns null on an empty list.
 */
export function callOfTheDay<T extends BoardSortable>(deals: T[], utcDate: string): T | null {
  if (!deals.length) return null;
  const ranked = rankForBoard(deals);
  // Rotate deterministically by date so the pick changes daily without a stored choice.
  const top = ranked.slice(0, 10);
  // Normalize to calendar day so every caller — whether it passes "YYYY-MM-DD" or a full
  // ISO timestamp — hashes the same string. Without this, two visitors seconds apart could
  // land on different deals with no error and no failing test.
  const day = utcDate.slice(0, 10);
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  return top[h % top.length];
}
