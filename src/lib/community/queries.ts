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
 * count. Both reads also share the same 1800s default revalidate, deliberately — see the
 * note on `memberArgumentCounts` below for why it stays there instead of going shorter.
 */
export async function getBoardDeals(limit = BOARD_SIZE): Promise<BoardDeal[]> {
  const allDeals = await getRumours(LIVE_DEAL_CEILING).catch(() => [] as RumourItem[]);
  // Open calls only. `getRumours` already drops `candidate` and `dead`, but keeps
  // `confirmed` — a settled saga: pct 100, contestedness 0, yet it can carry real argument
  // from its run-up, which would otherwise let a closed, announced deal top a board of
  // "open calls". `RumourItem` carries no separate resolved-at marker, so `status` is the
  // only signal available here — and it is sufficient, since `RumourStatus` is exactly
  // "rumour" | "confirmed" | "dead", so "confirmed" is the one status left to exclude.
  const deals = allDeals.filter((d) => d.status !== "confirmed");
  if (!deals.length) return [];

  const counts = await memberArgumentCounts(deals.map((d) => d.id));
  const withArgument = deals.map((d) => {
    const c = counts.get(d.id) ?? { calls: 0, comments: 0 };
    return {
      ...d,
      calls: c.calls,
      comments: c.comments,
      // Equal weight, deliberately for now: a locked call carries real reputational risk
      // and a one-word comment doesn't, so 1:1 is arguably the wrong ratio. But at 11
      // calls and 2 comments platform-wide there is no usage data to fit a coefficient
      // from, and inventing one now would be a guess wearing a model's clothes. Revisit
      // once there's enough volume to justify a specific weighting over this default.
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
 * The day's shared argument. Takes a `Date`, not a date string — see the doc comment on
 * `callOfTheDay` in `./contested` for why a string signature can't be trusted to stay a
 * calendar day across every caller (no format for a caller to get subtly wrong). Callers
 * pass `new Date()`; there is nothing to format or truncate first.
 */
export async function getCallOfTheDay(date: Date): Promise<BoardDeal | null> {
  const deals = await getBoardDeals(BOARD_SIZE);
  if (!deals.length) return null;
  // Same no-cast reasoning as getBoardDeals: the mapped array is BoardDeal plus
  // confidencePct, which is a structural superset of BoardDeal, not a literal assigned
  // where BoardDeal was expected.
  return callOfTheDay(
    deals.map((d) => ({ ...d, confidencePct: d.confidence.pct })),
    date,
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

/** How far back "argument" looks — see the docstring on `memberArgumentCounts` for why this is windowed at all, and why 7 days specifically. */
const ARGUMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Calls + comments per deal, MEMBERS ONLY.
 *
 * `anon_calls` is deliberately absent, and must stay absent. The individual anonymous
 * calls are private, but this ordering is PUBLIC — feeding an inflatable signal into it
 * would break that privacy through the back door, since anyone could clear a cookie and
 * push a deal up the board.
 *
 * Windowed to the last `ARGUMENT_WINDOW_MS` (7 days) via `created_at` / `locked_at`, NOT a
 * lifetime count. `rankForBoard` (in `./contested`) sorts by this value first, and its own
 * doc comment claims present tense — "what people ARE arguing about" — which a
 * never-decaying total would make false. Worse than false: with `callOfTheDay` drawing its
 * rotation from the board's top ranks, an unwindowed count is a promotion engine with no
 * exit — once a deal earns enough argument to reach the pool, being picked earns it more,
 * which keeps it there. Simulated over 60 days at a realistic promotion rate: 10 deals out
 * of 487 end up holding 100% of the pool, permanently, and a brand-new 50/50 saga can never
 * enter it — it starts at zero argument and the pool has no opening left. (`callOfTheDay`
 * separately no longer trusts `argument` at all for its own pool selection — see its doc
 * comment in `./contested` — so this window is defense in depth for `rankForBoard`'s board
 * ordering specifically; it is not the only fix for the feedback loop.) Seven days is a
 * judgement call, not a measurement — there is no usage data yet to fit a window from.
 *
 * Deliberately NO `{ revalidate }` override here — this inherits `readDb()`'s 1800s
 * default. A shorter window looks appealing (fresher argument counts), but do not add
 * one; that was tried and reverted. Next.js sets a route's ENTIRE ISR regeneration
 * cadence to the LOWEST revalidate seen across any fetch in its render, not just the
 * page's own `export const revalidate` — confirmed against
 * node_modules/next/dist/server/lib/patch-fetch.js, where the aggregate revalidate value
 * (`revalidateStore.revalidate`) is only ever lowered, never raised, as each fetch
 * executes; the docs say the same thing ("individual fetch requests can set a lower
 * revalidate... to increase the revalidation frequency of the entire route"). The
 * homepage declares `export const revalidate = 1800`; a `readDb({ revalidate: 60 })`
 * here would silently become the binding constraint for that ENTIRE route the instant
 * `getCallOfTheDay` / `getBoardDeals` is wired into it (Task 10) — a ~30x increase in how
 * often the highest-traffic page on the site regenerates, not merely how often this one
 * count refreshes. `db/server.ts` set 1800s as the default specifically because an
 * uncached read path once exhausted this project's Supabase egress quota and took the
 * REST API offline (HTTP 402); this is exactly the shape of change that guard exists to
 * catch.
 *
 * And the freshness that trade would buy is worth approximately nothing today: 11 calls
 * and 2 comments across the whole platform. `rankForBoard` sorts by argument first, and
 * with argument at zero almost everywhere, the board is already sorted by contestedness
 * and recency regardless — up to 30 minutes of staleness on this count changes no
 * ordering. `/community` still regenerates on its own one-minute cadence
 * (`export const revalidate = 60` on that page) — it just does so against a cached count.
 * That split is deliberate: page freshness where it's cheap, data freshness where it's
 * expensive.
 *
 * If argument counts genuinely need to be fresher than 1800s later — once there's enough
 * volume that staleness is actually visible — reach for `unstable_cache` the way
 * src/lib/profiles/queries.ts does for its receipts read (it caches the assembled result
 * on its own schedule, independent of whatever page calls it), rather than lowering this
 * `readDb()` call's revalidate.
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

  // Computed once, up front — NOT inside chunkedIn's per-chunk callback. Calling
  // Date.now() there would let concurrent chunks, and comments vs. calls, get scored
  // against very slightly different instants for no benefit and a harder-to-reason-about
  // cutoff.
  const cutoff = new Date(Date.now() - ARGUMENT_WINDOW_MS).toISOString();

  const db = readDb();
  const [comments, calls] = await Promise.all([
    chunkedIn(ids, (chunk) =>
      db.from("rumour_comments").select("rumour_id").in("rumour_id", chunk).gte("created_at", cutoff),
    ),
    chunkedIn(ids, (chunk) =>
      db
        .from("predictions")
        .select("subject_id")
        .eq("subject_type", "transfer_saga")
        .in("subject_id", chunk)
        .gte("locked_at", cutoff),
    ),
  ]);
  for (const c of comments) at(c.rumour_id).comments += 1;
  for (const p of calls) at(p.subject_id).calls += 1;
  return counts;
}
