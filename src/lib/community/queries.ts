import "server-only";
import { readDb } from "@/lib/db/server";
import { getRumours, type RumourItem } from "@/lib/queries/rumours";
import { rankForBoard, callOfTheDay } from "./contested";

/** A row on the board: a live deal plus the member engagement behind it. */
export interface BoardDeal extends RumourItem {
  argument: number;
  calls: number;
  comments: number;
}

/** How many deals the board shows. */
const BOARD_SIZE = 30;

/**
 * Ceiling on deals pulled before ranking — must exceed the live-deal count (487 at time
 * of writing), NOT be a display-sized page.
 *
 * `getRumours` orders by last_update desc, so a smaller number here would silently make
 * this a recency filter: the board would rank only the newest N and a genuinely contested
 * deal from three months ago could never surface, however much argument it carried. That
 * exact bug shipped on the club page — it called `getRumours()` with the default 60 and
 * filtered afterwards, leaving 130 of the 159 clubs that had live deals showing an empty
 * section. Ranking must see the whole population.
 */
const LIVE_DEAL_CEILING = 800;

/**
 * The board: live deals ranked by argument, then by how contested the house number is.
 *
 * Deal-led on purpose. An activity feed at 11 calls from 2 people renders as an empty
 * room; this is backed by every live deal and cannot.
 *
 * The two reads inside this function (`getRumours` and `memberArgumentCounts`) go through
 * `readDb()`'s fetch-level cache, which Next.js shares by fetch URL+options across every
 * caller — a homepage render and a `/community` render that both end up here converge on
 * the SAME cache entries, so this being called from two routes does not double the read
 * count. What it does change is the homepage's own regeneration cadence: see the
 * `revalidate: 60` note on `memberArgumentCounts` below.
 */
export async function getBoardDeals(limit = BOARD_SIZE): Promise<BoardDeal[]> {
  const deals = await getRumours(LIVE_DEAL_CEILING).catch(() => [] as RumourItem[]);
  if (!deals.length) return [];

  const counts = await memberArgumentCounts(deals.map((d) => d.id));
  const withArgument = deals.map((d) => {
    const c = counts.get(d.id) ?? { calls: 0, comments: 0 };
    return {
      ...d,
      calls: c.calls,
      comments: c.comments,
      argument: c.calls + c.comments,
      confidencePct: d.confidence.pct,
    };
  });

  // No cast: `withArgument`'s elements carry every `BoardDeal` field plus `confidencePct`
  // (which `rankForBoard` needs and `BoardDeal` doesn't declare). A wider object flowing
  // into a narrower declared return type is a plain structural-subtyping check, not an
  // excess-property-literal check — the latter only fires on object literals written
  // directly at the typed call site, and this value has already passed through
  // `rankForBoard`'s generic return. `tsc` confirms this holds by building clean.
  return rankForBoard(withArgument).slice(0, limit);
}

/**
 * The day's shared argument. `utcDate` is a date string such as "2026-08-12"; a full ISO
 * timestamp is also safe, since callOfTheDay normalizes to the calendar day.
 */
export async function getCallOfTheDay(utcDate: string): Promise<BoardDeal | null> {
  const deals = await getBoardDeals(BOARD_SIZE);
  if (!deals.length) return null;
  // Same no-cast reasoning as getBoardDeals: the mapped array is BoardDeal plus
  // confidencePct, which is a structural superset of BoardDeal, not a literal assigned
  // where BoardDeal was expected.
  return callOfTheDay(
    deals.map((d) => ({ ...d, confidencePct: d.confidence.pct })),
    utcDate,
  );
}

/**
 * `.in()` chunk size for `memberArgumentCounts`, matching `IN_CHUNK_SIZE` in
 * src/lib/profiles/queries.ts — same id shape (36-char uuids: `rumours.id`,
 * `predictions.subject_id`), same reason: PostgREST serializes `.in()` into the request
 * URL as `col=in.(v1,v2,...)`, and a long enough list overruns the URL limit and comes
 * back with zero rows silently — no thrown error, nothing to catch. This repo has hit
 * that exact failure mode twice already: the 1,500-marker `.in()` in
 * src/lib/ingest/official-transfers.ts, and the `chunkedIn` helper added in
 * src/lib/profiles/queries.ts to batch the same shape of id list.
 *
 * The arithmetic for THIS call site: `memberArgumentCounts` receives one id per deal
 * `getBoardDeals` pulled, up to `LIVE_DEAL_CEILING` (800). 800 36-character uuids plus
 * 799 separating commas is ~29,600 characters for the value of a single query parameter
 * — the same order of magnitude as the 1,500-marker case already proven to break, and far
 * past any reverse-proxy or PostgREST URL-length ceiling worth gambling on. Even at
 * today's real count (487 live deals, ~18,000 characters) this is already ~5x past the
 * 100-id/~3,700-character chunk this codebase has already established as its safe
 * watermark. There is no unchunked version of this call that is defensible, so it chunks
 * at the same 100 profiles/queries.ts uses rather than a new number.
 */
const IN_CHUNK_SIZE = 100;

/**
 * Batches `ids` into `IN_CHUNK_SIZE`-sized `.in()` calls and concatenates the rows.
 *
 * Deliberately not imported from `src/lib/profiles/queries.ts` — that `chunkedIn` is
 * private to its module, and this file is the only one this task touches. Two intentional
 * differences from that version, both there to match `memberArgumentCounts`'s existing
 * contract (see below) rather than the receipts function's: chunks run concurrently
 * instead of one-at-a-time (this runs during a background ISR regeneration, not a request
 * a single user is blocked on, so there's no reason to serialize eight-plus round trips),
 * and a chunk that errors contributes zero rows instead of throwing.
 */
async function chunkedIn<T>(
  ids: string[],
  fetchChunk: (chunk: string[]) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) chunks.push(ids.slice(i, i + IN_CHUNK_SIZE));
  const pages = await Promise.all(chunks.map(fetchChunk));
  return pages.flatMap((p) => p.data ?? []);
}

/**
 * Calls + comments per deal, MEMBERS ONLY.
 *
 * `anon_calls` is deliberately absent, and must stay absent. The individual anonymous
 * calls are private, but this ordering is PUBLIC — feeding an inflatable signal into it
 * would break that privacy through the back door, since anyone could clear a cookie and
 * push a deal up the board.
 *
 * `revalidate: 60`, not the 1800s default: argument counts are the one thing on the board
 * that should move within the hour, the same freshness call `PROFILE_REVALIDATE` makes in
 * src/lib/profiles/queries.ts for the same reason (a member's own call should not look
 * ignored). The trade-off worth knowing about before this gets wired into a page: Next.js
 * sets a whole route's ISR regeneration cadence to the LOWEST revalidate seen across any
 * fetch in its render (route-segment-config doc, "individual fetch requests can set a
 * lower revalidate... to increase the revalidation frequency of the entire route"; enforced
 * in code at node_modules/next/dist/server/lib/patch-fetch.js, `revalidateStore.revalidate`
 * is only ever lowered, never raised, as each fetch executes). The homepage declares
 * `export const revalidate = 1800`; the moment a route calls `getCallOfTheDay` /
 * `getBoardDeals`, this fetch's `revalidate: 60` becomes the binding constraint for that
 * ENTIRE route, not just this data — a ~30x increase in how often the whole page
 * regenerates, not merely how often this one count refreshes. It does NOT mean every
 * table gets re-read on every request: `getRumours`'s own `readDb()` call keeps its
 * 1800s window and keeps serving from Next's shared Data Cache in between, since only
 * fetches whose OWN window has elapsed actually reach Supabase on any given regeneration.
 * `db/server.ts` set 1800s as the default specifically because an uncached read path once
 * exhausted this project's Supabase egress quota (HTTP 402) — a 30x-shorter cadence on the
 * homepage is exactly the shape of change that guard exists to catch, so it should be a
 * deliberate call by whoever wires this into a page, not an accidental side effect of
 * this function's own freshness need.
 */
async function memberArgumentCounts(
  ids: string[],
): Promise<Map<string, { calls: number; comments: number }>> {
  const counts = new Map<string, { calls: number; comments: number }>();
  if (!ids.length) return counts;
  const at = (id: string) => {
    const c = counts.get(id) ?? { calls: 0, comments: 0 };
    counts.set(id, c);
    return c;
  };

  const db = readDb({ revalidate: 60 });
  const [comments, calls] = await Promise.all([
    chunkedIn(ids, (chunk) => db.from("rumour_comments").select("rumour_id").in("rumour_id", chunk)),
    chunkedIn(ids, (chunk) =>
      db.from("predictions").select("subject_id").eq("subject_type", "transfer_saga").in("subject_id", chunk),
    ),
  ]);
  for (const c of comments) at(c.rumour_id).comments += 1;
  for (const p of calls) at(p.subject_id).calls += 1;
  return counts;
}
