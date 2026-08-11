import "server-only";
import { unstable_cache } from "next/cache";
import { readDb } from "@/lib/db/server";
import { adminDb } from "@/lib/db/admin";
import { normalizeUsername } from "@/lib/profiles/username";

/**
 * A public profile shows calls the moment they lock, so the default 30-minute read
 * cache would make the page look broken to the person who just called. 60s still
 * absorbs a share spike, which is the only traffic shape this page sees.
 */
const PROFILE_REVALIDATE = 60;

/**
 * `.in()` values are serialized into the request URL, and PostgREST has a URL length
 * limit — a big enough id list overruns it and the request silently comes back with
 * zero rows (no thrown error, nothing to catch). This repo has already been bitten by
 * exactly this: see the chunked `.in()` and its comment in
 * src/lib/ingest/official-transfers.ts. 100 per chunk mirrors that fix.
 */
const IN_CHUNK_SIZE = 100;

/**
 * Runs `fetchChunk` over `ids` in batches of `IN_CHUNK_SIZE` and concatenates the rows.
 * Throws on the first chunk that errors, rather than folding a failed chunk into `[]`
 * and quietly under-returning — a caller merging this into a "no call on record" map
 * needs to be able to tell "no call" apart from "the read failed". `label` identifies
 * which read broke, matching the `"<label> read failed: ..."` shape already used in
 * src/lib/ingest/wc-fixtures.ts and src/lib/ingest/sync.ts.
 *
 * This function only calls out here — the only caller is `getAuthorReceiptsCached`
 * below, wrapped in `unstable_cache` — so what actually happens to this throw depends on
 * Next's cache state, not just on this code:
 *  - Cold miss (no cache entry yet): `unstable_cache` awaits the callback directly
 *    (node_modules/next/dist/server/web/spec-extension/unstable-cache.js:206, no catch
 *    around that await), so the throw propagates straight to `getAuthorReceipts`'s caller.
 *    The failed attempt is never written to the cache (`cacheNewResult`, the write at line
 *    214, sits strictly downstream of that same await and is only reached on success), so
 *    the next request tries again from scratch — no error ever gets cached.
 *  - Stale entry (past its 60s revalidate window but not evicted): the refresh runs in the
 *    background; if it throws, `unstable-cache.js`'s own `.catch` (lines 179-184) logs it
 *    with `console.error` and resolves to the *old* stale value instead of re-throwing —
 *    and outside static generation (true for this force-dynamic route), the caller doesn't
 *    even wait on that background attempt: it already got the stale value back at line 201
 *    before the refresh was even attempted. So on a stale-triggered failure, this throw
 *    never reaches `getAuthorReceipts` at all — the caller sees old-but-plausible receipts,
 *    not an error. Someone debugging "why didn't this throw during the outage" is looking
 *    at this case, not a bug in the throw itself.
 *  - No request coalescing on the cold-miss path: if many requests race a cold cache during
 *    an outage, each one independently re-runs all three chunked reads (and each one
 *    throws) rather than sharing one attempt. That's the right trade-off versus caching an
 *    error, but it means an outage multiplies read load rather than dampening it — worth
 *    knowing before treating a spike in Supabase errors here as one failure.
 */
async function chunkedIn<T>(
  label: string,
  ids: string[],
  fetchChunk: (chunk: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    const { data, error } = await fetchChunk(ids.slice(i, i + IN_CHUNK_SIZE));
    if (error) throw new Error(`${label} read failed: ${error.message}`);
    out.push(...(data ?? []));
  }
  return out;
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string | null;
  favouriteClub: string | null;
  createdAt: string;
}

/**
 * A profile by handle, or null when the handle is unclaimed or does not exist.
 *
 * Throws on a genuine read failure rather than folding it into `null`. This URL is
 * shareable and search-indexed, and the two outcomes read very differently to a crawler:
 * Google de-indexes a 404 but retries a 500. Collapsing a transient failure into "not
 * found" would turn a momentary blip into durable SEO damage on the exact pages that
 * exist to be shared. `maybeSingle()` itself returns `{ data: null, error: null }` for a
 * real zero-row miss, so `error` and "unclaimed handle" are already distinguishable.
 */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const { data, error } = await readDb({ revalidate: PROFILE_REVALIDATE })
    .from("public_profiles")
    .select("id, username, display_name, favourite_club, created_at")
    .eq("username", normalizeUsername(username))
    .maybeSingle();
  if (error) throw new Error(`public_profiles read failed: ${error.message}`);
  // Every public_profiles column comes back nullable in the generated types — Postgres
  // does not carry a NOT NULL constraint through a view, even for `id` (profiles' primary
  // key) or `username` (guaranteed by this view's own `where username is not null`).
  // `created_at` genuinely can be null (profiles.created_at has a default, not a NOT NULL
  // constraint), so this guard is real, not just satisfying the compiler. Narrowing all
  // three here is what lets the object below match `PublicProfile` without a cast.
  if (!data?.username || !data?.id || !data?.created_at) return null;
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    favouriteClub: data.favourite_club,
    createdAt: data.created_at,
  };
}

/**
 * The signed-in user's own editable fields.
 *
 * Reads `profiles` directly rather than the view, because a user who has not claimed a
 * handle does not appear in `public_profiles` at all — and they are exactly the user who
 * needs the claim form. Service role, own row only; callers must pass their own id.
 */
export async function getMyProfileBasics(
  userId: string,
): Promise<{ username: string | null; favouriteClub: string | null }> {
  const { data } = await adminDb()
    .from("profiles")
    .select("username, favourite_club")
    .eq("id", userId)
    .maybeSingle();
  return { username: data?.username ?? null, favouriteClub: data?.favourite_club ?? null };
}

/** What a commenter's receipt line shows: their call on THIS deal, plus their overall record. */
export interface AuthorReceipt {
  username: string | null;
  pick: string | null; // will | wont | higher | lower — null means no call on record
  houseConfidencePct: number | null;
  lockedAt: string | null;
  status: string | null;
  wins: number;
  losses: number;
  accuracyPct: number | null;
}

/**
 * The actual batched-read implementation, cached via `unstable_cache` rather than
 * `readDb()`'s own fetch-level cache.
 *
 * Why `unstable_cache` and not just `readDb({ revalidate: 60 })` on its own: this caches
 * the *assembled* result — three sources merged into one map — as a single entry,
 * instead of three separate fetch-cache entries that would each still need re-merging
 * on every request. It also caches unconditionally regardless of what happens to the
 * fetch layer: any `fetch()` issued from inside an `unstable_cache` callback is forced to
 * `force-no-store` by Next itself (node_modules/next/dist/server/lib/patch-fetch.js:303-308,
 * `workUnitStore.type === 'unstable-cache'` → `pageFetchCacheMode = 'force-no-store'`), so
 * `readDb()`'s own `revalidate` option is moot for the calls inside this function either way
 * — `unstable_cache` is the only thing doing any caching here, by construction.
 *
 * Earlier revision of this comment claimed `force-dynamic` on `/transfers/[id]` overrides
 * `readDb()`'s per-call `revalidate` — that was wrong, sourced from the prose guide instead
 * of the implementation. It doesn't: `create-component-tree.js:170-171` sets
 * `workStore.fetchCache` only from an explicit `export const fetchCache` on the page or a
 * layout (the `dynamic` branch a few lines above, ~150-168, never touches it — confirmed
 * neither `/transfers/[id]/page.tsx` nor either layout in its chain exports `fetchCache`),
 * and `patch-fetch.js:349`'s force-dynamic-implies-no-store default
 * (`noFetchConfigAndForceDynamic`) is gated on `!currentFetchRevalidate`, which is false
 * once a fetch sets its own `next.revalidate` — which `readDb()` always does. So the
 * original `readDb({ revalidate: 60 })` reads were not actually inert on this route. They
 * would have kept working — but only via that unlisted interaction between two files, which
 * is too fragile to knowingly depend on. `unstable_cache` rests on documented, direct
 * behaviour instead.
 *
 * The one real fragility of *this* approach: `unstable-cache.js:146` only attempts the
 * cache **read** when `workStore.fetchCache !== 'force-no-store'`; when that condition is
 * false it falls straight through to unconditionally regenerating and rewriting the entry
 * (line ~205-216, `cacheNewResult`, gated on nothing). Reads and writes are therefore not
 * symmetric: if `export const fetchCache` is ever added to this page or a parent layout,
 * this cache stops being read (every call recomputes) while it keeps being written —
 * silently, no error, just a cache that never hits. It is currently unset on both, so this
 * doesn't fire today; it's a trap for whoever touches the segment config next.
 *
 * `unstable_cache` persists its return value across requests, so it must be plain and
 * serializable — a `Map` does not survive that. This inner function returns an array of
 * `[id, AuthorReceipt]` tuples; the exported `getAuthorReceipts` below rebuilds the `Map`
 * from it on every call (cheap, and keeps the public return type unchanged).
 *
 * Tagged `supabase-read` so the existing "flush every Supabase read" call
 * (`revalidateTag("supabase-read", ...)` in the news-generate cron route) also clears
 * this cache instead of leaving it as a silent exception.
 *
 * Cache key is `(rumourId, ids)` — both are plain arguments, which `unstable_cache`
 * folds into the key by default. `getAuthorReceipts` de-dupes AND sorts `ids` before
 * calling in, so the same set of authors in a different comment order still hits the
 * same cache entry instead of minting a new one per ordering.
 *
 * `getPublicProfile` above is unaffected by any of this and keeps using `readDb()`'s cache
 * directly: `/u/[username]` is not `force-dynamic`, and it was never wrapped in
 * `unstable_cache`, so its fetch never falls inside the `workUnitStore.type ===
 * 'unstable-cache'` branch above — its own `revalidate: 60` applies exactly as written.
 */
const getAuthorReceiptsCached = unstable_cache(
  async (rumourId: string, ids: string[]): Promise<Array<[string, AuthorReceipt]>> => {
    const db = readDb({ revalidate: PROFILE_REVALIDATE });
    const [profileRows, callRows, repRows] = await Promise.all([
      chunkedIn("public_profiles", ids, (chunk) => db.from("public_profiles").select("id, username").in("id", chunk)),
      chunkedIn("predictions", ids, (chunk) =>
        db
          .from("predictions")
          .select("user_id, pick, house_confidence_pct, locked_at, status")
          .eq("subject_id", rumourId)
          // Matches predictions_subject_idx (subject_type, subject_id, status) so the
          // planner can use it instead of falling back to predictions_user_idx and
          // probing once per author. v1 has exactly one possible value (0003_receipts.sql
          // constrains subject_type = 'transfer_saga' via CHECK), so this also anchors
          // the "at most one row per author" assumption below on the real unique
          // constraint `unique (user_id, subject_type, subject_id, call_type)` rather
          // than on that constraint being v1-only.
          .eq("subject_type", "transfer_saga")
          .eq("call_type", "outcome")
          .in("user_id", chunk),
      ),
      chunkedIn("reputation", ids, (chunk) =>
        db.from("reputation").select("user_id, wins, losses, accuracy_pct").in("user_id", chunk),
      ),
    ]);

    const handleBy = new Map(profileRows.map((p) => [p.id, p.username] as const));
    const callBy = new Map(callRows.map((c) => [c.user_id, c] as const));
    const repBy = new Map(repRows.map((r) => [r.user_id, r] as const));

    const out: Array<[string, AuthorReceipt]> = [];
    for (const id of ids) {
      const call = callBy.get(id);
      const rep = repBy.get(id);
      out.push([
        id,
        {
          username: handleBy.get(id) ?? null,
          pick: call?.pick ?? null,
          houseConfidencePct: call?.house_confidence_pct ?? null,
          lockedAt: call?.locked_at ?? null,
          status: call?.status ?? null,
          wins: rep?.wins ?? 0,
          losses: rep?.losses ?? 0,
          accuracyPct: rep?.accuracy_pct ?? null,
        },
      ]);
    }
    return out;
  },
  ["profiles-author-receipts"],
  { revalidate: PROFILE_REVALIDATE, tags: ["supabase-read"] },
);

/**
 * Receipts for a set of comment authors on one deal, keyed by profile id.
 *
 * Three batched reads, never per-author — a thread with 40 comments must not become
 * 120 queries, and each of the three is itself chunked at 100 ids so a viral thread's
 * author list can't overrun PostgREST's URL limit either (see `chunkedIn` above).
 * Authors with no claimed handle and no call still get an entry, so the thread can
 * render "No call on record" without a second lookup — but a failed read throws instead
 * of quietly producing that same "no call on record" for everyone, since those two
 * situations must not look identical on a product whose premise is receipts. That holds
 * on a cold cache miss; see `chunkedIn`'s doc comment for the narrower stale-refresh case
 * where `unstable_cache` itself serves the old value instead of letting this throw surface.
 */
export async function getAuthorReceipts(
  rumourId: string,
  profileIds: string[],
): Promise<Map<string, AuthorReceipt>> {
  const ids = [...new Set(profileIds)].filter(Boolean).sort();
  if (!ids.length) return new Map();
  return new Map(await getAuthorReceiptsCached(rumourId, ids));
}
