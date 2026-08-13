# Community v2 — The Front Door Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a stranger argue with Onside in one tap, from the homepage or a board, and keep that call as a real receipt when they sign up.

**Architecture:** The server-authoritative snapshot logic inside `lockCall` is extracted once and shared by two thin insert paths — `predictions` for members, a new `anon_calls` table for visitors keyed by an httpOnly cookie. On signup the auth callback merges anon rows into `predictions`, preserving the original lock time. `/community` becomes a deal-led board ranked by argument then by how contested the house number is, so it can never render empty at two users.

**Tech Stack:** Next.js 16 (App Router, `params` is a `Promise`), React 19 server components + `useActionState`, Supabase Postgres with RLS, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-12-community-front-door-design.md`

---

## Ground truth (verified 2026-08-11/12 — do not re-derive)

| Fact | Value |
|---|---|
| Substrate | 11 calls / 2 callers / 2 comments / 0 handles / 487 live deals |
| `/community` | `ComingSoon` stub; a `[id]` sub-stub also exists |
| Nav (`src/lib/nav-items.ts`) | World Cup, Ask, News, Today, Players, Clubs, Competitions, Transfers — **no community** |
| Homepage sections | NewsLead, Hero, TickerStrip, ValueProps, MoversPreview, SquadsPreview, PricingTeaser — **nothing to do** |
| Logged-out `CallChip` | renders "Sign in to put your call on the record" |
| Auth callback | `src/app/auth/callback/route.ts`, after `exchangeCodeForSession` |
| Rate limiter | `rateLimit(key, max, windowMs)` in `src/lib/ratelimit.ts` — in-memory, per serverless instance |
| Privacy policy | essential cookies "keep you signed in and the service functioning… required and can't be switched off" |
| Baselines | build clean · **381 tests / 50 files** · lint **73 problems (67 errors, 6 warnings)** |

**Always `cd /Users/perezmoodley/onside-b2c` with the absolute path — the shell's working directory resets between turns.**

## Decisions resolved before this plan

- **Rate limit:** keyed on client IP, via the existing `rateLimit`. It is per-instance and resets on cold start — an imperfect burst guard, not a quota. That is acceptable because the real integrity control is that anon calls are *private*: flooding the table buys an attacker nothing visible. Do not build a durable limiter for this.
- **Call of the Day:** pinned per **UTC day**, not per request. Everyone arguing about the same deal is the point; a per-request pick would give two visitors different "today" deals.
- **Cookie consent:** `onside_anon` is set only when a user deliberately taps a call, solely to deliver that call. That is essential, not analytics — no banner change. The privacy page must still name it (Task 10).

## File structure

| File | Responsibility |
|---|---|
| `supabase/migrations/0007_anon_calls.sql` | **Create** — the table, private by construction |
| `src/lib/receipts/lock-action.ts` | **Modify** — extract `snapshotCall`, keep `lockCall` thin |
| `src/lib/receipts/snapshot.ts` | **Create** — the shared server-authoritative snapshot |
| `src/lib/receipts/anon-session.ts` | **Create** — cookie mint/read |
| `src/lib/receipts/anon-lock.ts` | **Create** — `lockAnonCall` |
| `src/lib/receipts/claim-anon.ts` | **Create** — merge on signup |
| `src/lib/receipts/claim-anon.test.ts` | **Create** — merge conflict + `locked_at` preservation |
| `src/lib/community/contested.ts` | **Create** — pure ranking |
| `src/lib/community/contested.test.ts` | **Create** |
| `src/lib/community/queries.ts` | **Create** — board + call of the day |
| `src/app/(app)/community/page.tsx` | **Modify** — replace the stub |
| `src/app/(app)/community/[id]/page.tsx` | **Delete** |
| `src/components/community/CallBoard.tsx` | **Create** |
| `src/components/community/CallOfTheDay.tsx` | **Create** |
| `src/components/transfers/CallChip.tsx` | **Modify** — anonymous path |
| `src/app/(marketing)/page.tsx` | **Modify** — insert Call of the Day |
| `src/lib/nav-items.ts` | **Modify** — add Community |
| `src/app/auth/callback/route.ts` | **Modify** — claim hook |
| `src/app/(app)/privacy/page.tsx` | **Modify** — name the cookie |

---

## Task 1: Migration 0007 — `anon_calls`

Written but **not applied**. Applying is Task 2 and needs Perez's explicit word.

**Files:**
- Create: `supabase/migrations/0007_anon_calls.sql`

- [ ] **Step 1: Write the migration**

Read `supabase/migrations/0005_public_profiles.sql` first to match the house style — heavily commented, explaining *why*.

```sql
-- Community v2 — anonymous calls.
-- NOT YET APPLIED. Apply to prod (ygmxxveranmfcobcexon) via Supabase MCP on Perez's
-- per-action authorization. Spec: docs/superpowers/specs/2026-08-12-community-front-door-design.md
--
-- rollback (order matters — the trigger depends on the function, so RESTRICT blocks
-- dropping the function first; the table drop takes the trigger with it automatically,
-- which is what frees the function to drop cleanly on the next line):
--   drop table if exists public.anon_calls;   -- DESTROYS unclaimed visitor calls
--   drop function if exists public.anon_calls_block_field_mutation();

-- A call made before the caller had an account.
--
-- Deliberately NOT stored in `predictions` with a null user_id. That table's
-- `unique (user_id, subject_type, subject_id, call_type)` does not constrain nulls —
-- Postgres treats every null as distinct — so one visitor could hold unlimited calls on
-- the same deal. It also carries a public-read policy and an append-only trigger built
-- around a real user. Keeping unclaimed calls out preserves both.
create table if not exists public.anon_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,                       -- the onside_anon cookie
  subject_type text not null default 'transfer_saga' check (subject_type = 'transfer_saga'),
  subject_id text not null,
  call_type text not null check (call_type in ('outcome', 'fee')),
  pick text not null check (pick in ('will', 'wont', 'higher', 'lower')),
  -- The same server-recomputed house snapshot a member's call gets. Frozen here so a
  -- claim months later produces the receipt the visitor actually earned.
  house_confidence_pct int,
  house_value_eur bigint,
  earliness real not null default 0,
  locked_at timestamptz not null default now(),
  -- One call per session per subject per call_type. session_id is NOT NULL, so unlike
  -- the nullable-user_id approach this constraint actually bites.
  unique (session_id, subject_type, subject_id, call_type)
);

-- No separate index on session_id: the unique constraint's btree already leads with
-- session_id, so it serves the claim path's `where session_id = $1` as a leftmost-prefix
-- scan (confirmed via EXPLAIN). A duplicate single-column index would only cost writes
-- on this feature's hottest write path. Do not re-add it.

-- RLS on with NO policy at all: every row is private by construction — SELECT returns
-- none and INSERT/UPDATE/DELETE touch none, for anon and authenticated alike. That is
-- a row-level guarantee only; see the revoke immediately below for what it does not
-- reach.
alter table public.anon_calls enable row level security;

-- RLS closes every row to client roles — but it does NOT close everything, and the
-- comment this replaces was wrong to imply it did.
--
-- Postgres has no FOR TRUNCATE policy: TRUNCATE is a table-privilege check only, and
-- Supabase's default ACL for schema public hands anon and authenticated arwdDxt on every
-- new relation — that `D` is TRUNCATE. Proven against a real instance: with RLS on and
-- zero policies, `truncate public.anon_calls` as anon still succeeded.
--
-- Separately, PostgREST publishes the schema of any relation a role holds privileges on,
-- so without this revoke the table's existence and every column, type and default leak
-- via GET /rest/v1/ to anyone with the publishable key that ships in the browser bundle.
--
-- service_role keeps its own grant and BYPASSRLS, so every server action still works.
revoke all on public.anon_calls from anon, authenticated;

-- Append-only integrity, mirroring predictions_block_field_mutation in 0003_receipts.sql.
-- There is no legitimate UPDATE path for this table at all — service_role only ever
-- INSERTs a lock or DELETEs a claimed/expired row — so every column is locked here, not
-- a status/points/resolved_at subset like predictions has. locked_at is the product: it
-- is what makes "I called it in July" true. 0003 made this argument once ("a receipt is
-- worthless if a losing call can be edited/backdated") and 0005 made it again
-- ("'Permanent' only means something if the database enforces it against every writer,
-- not just the untrusted one"). service_role bypasses RLS, so without this trigger the
-- obvious implementation of a future "change your pick before signing up" feature — an
-- upsert on the (session_id, subject_type, subject_id, call_type) unique key — would
-- silently rewrite locked_at and earliness instead of erroring.
--
-- search_path pinned to '' at creation, for the same reason 0006_function_search_path.sql
-- pinned the other two trigger functions after the fact: the body touches only OLD/NEW
-- fields and raises, no unqualified table/type/operator lookup to shadow, so the empty
-- path is safe as-is. Pinning it here avoids adding a third function to that lint debt.
create or replace function public.anon_calls_block_field_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.session_id is distinct from old.session_id
      or new.subject_type is distinct from old.subject_type
      or new.subject_id is distinct from old.subject_id
      or new.call_type is distinct from old.call_type
      or new.pick is distinct from old.pick
      or new.house_confidence_pct is distinct from old.house_confidence_pct
      or new.house_value_eur is distinct from old.house_value_eur
      or new.earliness is distinct from old.earliness
      or new.locked_at is distinct from old.locked_at) then
    raise exception 'anon_calls: locked columns are immutable (delete and reinsert instead)';
  end if;
  return new;
end;
$$;
drop trigger if exists anon_calls_immutable on public.anon_calls;
create trigger anon_calls_immutable before update on public.anon_calls
  for each row execute function public.anon_calls_block_field_mutation();

-- Housekeeping: a session cookie lives 90 days, so anything older can never be claimed.
-- Not scheduled here — run manually or wire to a cron if the table ever grows.
-- delete from public.anon_calls where locked_at < now() - interval '90 days';
```

- [ ] **Step 2: Verify the constraint reasoning**

Reason it through rather than guessing: `session_id` is `not null`, so `unique (session_id, subject_type, subject_id, call_type)` genuinely blocks a second call on the same deal from the same cookie — which is exactly what a nullable `user_id` on `predictions` would *fail* to do, since Postgres treats each null as distinct.

- [ ] **Step 3: Commit**

```bash
cd /Users/perezmoodley/onside-b2c && git add supabase/migrations/0007_anon_calls.sql && git commit -m "feat(db): migration 0007 — anon_calls, private by construction"
```

---

## Task 2: Apply migration 0007 and regenerate types

**⛔ GATE — STOP HERE.** This writes to production. Ask Perez, show him the file, and wait.

**Note:** the Supabase MCP connection dropped during planning. If its tools are unavailable, stop and tell Perez rather than seeking another write path.

**Files:**
- Modify: `src/lib/db/types.ts` (regenerated, not hand-edited)

- [ ] **Step 1: Ask for authorization**, showing `supabase/migrations/0007_anon_calls.sql`.

- [ ] **Step 2: Apply**

Supabase MCP `apply_migration` (not `execute_sql` — this is DDL): `project_id` `ygmxxveranmfcobcexon`, `name` `anon_calls_v1`, `query` = the file contents.

- [ ] **Step 3: Verify the table is private**

```sql
select
  (select count(*) from pg_policies where schemaname='public' and tablename='anon_calls') as policies,
  (select relrowsecurity from pg_class where oid='public.anon_calls'::regclass) as rls_enabled,
  (select count(*) from information_schema.role_table_grants
     where table_schema='public' and table_name='anon_calls'
       and grantee in ('anon','authenticated')) as client_grants;
```

Expected: `policies = 0`, `rls_enabled = true`, `client_grants = 0`. The migration's own `revoke all on public.anon_calls from anon, authenticated;` should already have zeroed this out — this step confirms the revoke landed, it does not decide whether one is needed. **If `client_grants > 0`, stop** — the table is not private yet. Do not proceed to Task 3 until it reads zero.

This checks every privilege type, not just SELECT, because any nonzero count here is dangerous on its own: Postgres has no `FOR TRUNCATE` policy, so RLS does not cover it — `truncate public.anon_calls` succeeds as `anon` even with RLS on and zero policies, because TRUNCATE (`D` in `arwdDxt`) is a table-privilege check only. Separately, PostgREST publishes the full schema — every column, type, default — of any relation a role holds any privilege on, regardless of RLS. (This is the same default-ACL trap that made migration 0005 dangerous — see `0005_public_profiles.sql:113`.)

- [ ] **Step 4: Regenerate types**

Supabase MCP `generate_typescript_types` for `ygmxxveranmfcobcexon`; write the result over `src/lib/db/types.ts`.

- [ ] **Step 5: Verify**

```bash
cd /Users/perezmoodley/onside-b2c && npm run build
```
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /Users/perezmoodley/onside-b2c && git add src/lib/db/types.ts && git commit -m "chore(db): regenerate types after 0007 (anon_calls)"
```

---

## Task 3: Extract the shared snapshot

`lockCall` currently fetches the rumour, the valuation and the contract, computes confidence, earliness and eligibility, then inserts. The anonymous path needs every one of those steps identical. Duplicating them would let member and anonymous calls drift — and a claimed call would then carry a house number no member would ever have been given.

**Refactor + two latent-bug fixes surfaced by review; existing tests stay green.** The extraction itself changes no behaviour. Two things inside it do change behaviour on purpose: a failed read (rumour/valuation/contract) now returns `snapshot_unavailable` instead of silently defaulting `onsideValueEur` to 0 and freezing a wrong, unfixable reference number into a fee call's immutable `house_value_eur`; and the outcome/fee column projection now happens once, inside the shared function, instead of being re-derived at every insert site.

**Files:**
- Create: `src/lib/receipts/snapshot.ts`
- Modify: `src/lib/receipts/lock-action.ts`

- [ ] **Step 1: Create the shared module**

Create `src/lib/receipts/snapshot.ts`:

```ts
import "server-only";
import { adminDb } from "@/lib/db/admin";
import { confidence, type RumourStatus } from "@/lib/rumours/confidence";
import { stageOf } from "@/lib/rumours/stage";
import { lockEligibility, type LockReason } from "./lock";
import { earlinessOf } from "./earliness";
import type { CallType, OutcomePick, FeePick } from "./types";

/** Every way a call attempt can fail before it becomes a snapshot. `"ok"` is excluded — a
 *  passed eligibility check is not itself a failure reason. */
export type SnapshotReason = "bad_pick" | "subject_not_found" | "snapshot_unavailable" | Exclude<LockReason, "ok">;

export type SnapshotResult =
  | { ok: true; houseConfidencePct: number | null; houseValueEur: number | null; earliness: number }
  | { ok: false; reason: SnapshotReason };

/**
 * The server-authoritative half of making a call.
 *
 * Shared by the member path (`lockCall`) and the visitor path (`lockAnonCall`) so the two
 * can never diverge. If they computed the house number differently, claiming an anonymous
 * call would mint a receipt no member could have earned — and the receipt is the product.
 *
 * The client sends only subject + pick. Everything here is recomputed server-side and
 * never read from the request.
 *
 * Two things a caller must not redo: the `ok: true` values are already projected onto the
 * two DB columns (`houseConfidencePct` is null for a fee call, `houseValueEur` is null for
 * an outcome call, per `callType`) — write all three fields unconditionally, never re-test
 * `callType` at the insert site. And the eligibility gate lives in here too — there is no
 * valid reason to insert a prediction/anon_call without going through this function first.
 */
export async function snapshotCall(input: {
  subjectId: string;
  callType: CallType;
  pick: OutcomePick | FeePick;
}): Promise<SnapshotResult> {
  const validOutcome = input.pick === "will" || input.pick === "wont";
  const validFee = input.pick === "higher" || input.pick === "lower";
  if ((input.callType === "outcome") !== validOutcome || (input.callType === "fee") !== validFee) {
    return { ok: false, reason: "bad_pick" };
  }

  const db = adminDb();
  const { data: r, error: rumourErr } = await db
    .from("rumours")
    .select("id, status, summary, source_tier, corroborations, reported_fee_eur, first_seen, resolved_at, player_id")
    .eq("id", input.subjectId)
    .maybeSingle();
  if (rumourErr) return { ok: false, reason: "snapshot_unavailable" };
  if (!r) return { ok: false, reason: "subject_not_found" };

  const [{ data: val, error: valErr }, { data: pl, error: plErr }] = await Promise.all([
    db.from("player_valuations").select("value_eur").eq("player_id", r.player_id).maybeSingle(),
    db.from("players").select("contract_until").eq("id", r.player_id).maybeSingle(),
  ]);
  // A swallowed error here must not fall through to the `?? 0` default below: for a fee call
  // that 0 gets frozen into the immutable house_value_eur column (migration 0003's
  // predictions_immutable trigger), and a wrong reference of 0 makes every future "higher"
  // settle a free win and every "lower" a free loss — see resolveFee/feePoints.
  if (valErr || plErr) return { ok: false, reason: "snapshot_unavailable" };
  const onsideValueEur = val?.value_eur ?? 0;

  // r.status's real domain is wider than RumourStatus — a "candidate" row hasn't been
  // promoted to a live rumour yet. lockEligibility sees that full domain below and rejects
  // a candidate via "not_live"; confidence()/stageOf() are typed against the narrower
  // RumourStatus that deliberately excludes it, so the extra cast at those two call sites is
  // a deliberate narrowing of this one shared value, not an independent guess at r.status.
  const status = r.status as RumourStatus | "candidate";

  const conf = confidence({
    status: status as RumourStatus,
    summary: r.summary,
    sourceTier: r.source_tier,
    corroborations: r.corroborations,
    reportedFeeEur: r.reported_fee_eur,
    onsideValueEur,
    contractUntil: pl?.contract_until ?? null,
    firstSeen: new Date(r.first_seen),
  });
  const earliness = earlinessOf(stageOf(r.summary, status as RumourStatus));

  // Not-live / here-we-go / resolved block every call; "house already certain" only blocks
  // a 'will' (a near-free win) — a contrarian 'wont' or a fee call may still proceed.
  const elig = lockEligibility({
    status,
    sourceTier: r.source_tier,
    confidencePct: conf.pct,
    resolved: r.resolved_at != null,
  });
  if (!elig.ok && !(elig.reason === "house_certain" && input.pick !== "will")) {
    // lockEligibility's return type doesn't encode that ok:false always pairs with a real
    // (non-"ok") reason, but its implementation does — every ok:false branch returns a
    // concrete LockReason. Safe to narrow.
    return { ok: false, reason: elig.reason as Exclude<LockReason, "ok"> };
  }

  return {
    ok: true,
    houseConfidencePct: input.callType === "outcome" ? conf.pct : null,
    houseValueEur: input.callType === "fee" ? onsideValueEur : null,
    earliness,
  };
}
```

- [ ] **Step 2: Rewrite `lockCall` to use it**

Replace the entire body of `lockCall` in `src/lib/receipts/lock-action.ts` (keep the `"use server"` directive) with:

```ts
/** Every reason `lockCall` can fail: the shared snapshot reasons, plus this path's own. */
export type LockFailureReason = SnapshotReason | "not_signed_in" | "already_called" | "insert_failed";

export type LockResult = { ok: true; id: string } | { ok: false; reason: LockFailureReason };

/**
 * Lock a transfer call. SERVER-AUTHORITATIVE: the client sends only the subject + pick; the
 * house snapshot (confidence / value / earliness) is recomputed in `snapshotCall` (./snapshot.ts)
 * and never trusted from the client, so the anti-copy-the-house and earliness credit can't be
 * forged. That snapshot logic — including the eligibility gate and the outcome/fee column
 * projection — is shared with the anonymous call path so the two can never diverge on the house
 * number. The insert runs as service-role (predictions has no authenticated write policy); the
 * unique constraint blocks a second call on the same subject + call_type.
 */
export async function lockCall(input: {
  subjectId: string;
  callType: CallType;
  pick: OutcomePick | FeePick;
}): Promise<LockResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "not_signed_in" };

  const snap = await snapshotCall(input);
  if (!snap.ok) return { ok: false, reason: snap.reason };

  const { data, error } = await adminDb()
    .from("predictions")
    .insert({
      user_id: user.id,
      subject_id: input.subjectId,
      call_type: input.callType,
      pick: input.pick,
      house_confidence_pct: snap.houseConfidencePct,
      house_value_eur: snap.houseValueEur,
      earliness: snap.earliness,
    })
    .select("id")
    .single();

  if (error) return { ok: false, reason: error.code === "23505" ? "already_called" : "insert_failed" };
  return { ok: true, id: data.id };
}
```

Note the insert now writes `snap.houseConfidencePct` / `snap.houseValueEur` unconditionally — no `input.callType === "outcome" ? … : null` at the insert site. `snapshotCall` already projected them.

Update the imports at the top of the file: remove `confidence`, `RumourStatus`, `stageOf`, `lockEligibility`, `earlinessOf` (now used only inside `snapshot.ts`) and add:

```ts
import { snapshotCall, type SnapshotReason } from "./snapshot";
```

- [ ] **Step 3: Verify nothing changed behaviourally**

```bash
cd /Users/perezmoodley/onside-b2c && npx vitest run && npm run build && npm run lint
```
Expected: **381 tests / 50 files**, build clean, lint at the **73-problem** baseline. A refactor that changes a test result is not a refactor — investigate before continuing. (The `snapshot_unavailable` behaviour change has no test coverage today because nothing in the suite mocks a Supabase read failure — that's a coverage gap, not a contradiction of "381/50 unchanged".)

- [ ] **Step 4: Commit**

```bash
cd /Users/perezmoodley/onside-b2c && git add src/lib/receipts/snapshot.ts src/lib/receipts/lock-action.ts && git commit -m "refactor(receipts): share the server-authoritative snapshot between call paths"
```

---

## Task 4: Anonymous session cookie and the anonymous lock

**Files:**
- Create: `src/lib/receipts/anon-session.ts`
- Create: `src/lib/receipts/anon-lock.ts`

- [ ] **Step 1: The cookie**

Create `src/lib/receipts/anon-session.ts`:

```ts
import "server-only";
import { cookies } from "next/headers";

export const ANON_COOKIE = "onside_anon";
const NINETY_DAYS_SEC = 90 * 24 * 60 * 60;

/**
 * The visitor's anonymous identity.
 *
 * httpOnly because the page never needs to read it — not exposing it to script means it
 * cannot be forged or harvested from the client. Set only when someone deliberately taps
 * a call, and only to deliver that call, which is what makes it an essential cookie
 * rather than tracking (see /privacy).
 */
export async function readAnonSession(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ANON_COOKIE)?.value ?? null;
}

/** Existing id, or a fresh one written to the jar. Call only from a server action. */
export async function ensureAnonSession(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(ANON_COOKIE)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  jar.set(ANON_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: NINETY_DAYS_SEC,
  });
  return id;
}

/** Called after a successful claim — the rows are gone, the id is spent. */
export async function clearAnonSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ANON_COOKIE);
}
```

- [ ] **Step 2: The anonymous lock action**

Create `src/lib/receipts/anon-lock.ts`:

```ts
"use server";

import { headers } from "next/headers";
import { adminDb } from "@/lib/db/admin";
import { rateLimit } from "@/lib/ratelimit";
import { snapshotCall, type SnapshotReason } from "./snapshot";
import { ensureAnonSession } from "./anon-session";
import type { CallType, OutcomePick, FeePick } from "./types";

/** Every reason `lockAnonCall` can fail: the shared snapshot reasons, plus this path's own. */
export type AnonLockReason = SnapshotReason | "rate_limited" | "already_called" | "insert_failed";

export type AnonLockResult =
  | { ok: true }
  | { ok: false; reason: AnonLockReason };

/** Burst guard only. See the plan: the real control is that anon calls are private. */
const MAX_PER_IP = 20;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Lock a call for someone who has no account yet.
 *
 * Identical server-authoritative snapshot to a member's call — only the destination row
 * differs. The call is invisible to everyone, including the caller's own future public
 * profile, until an account claims it.
 */
export async function lockAnonCall(input: {
  subjectId: string;
  callType: CallType;
  pick: OutcomePick | FeePick;
}): Promise<AnonLockResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`anon-call:${ip}`, MAX_PER_IP, WINDOW_MS).ok) {
    return { ok: false, reason: "rate_limited" };
  }

  const snap = await snapshotCall(input);
  if (!snap.ok) return { ok: false, reason: snap.reason };

  // Minting the cookie AFTER the snapshot passes means a rejected call leaves no trace.
  const sessionId = await ensureAnonSession();

  // NOTE for this task: `snapshotCall` must also gain the no-house-value guard below
  // before fee calls are reachable. See "Additional fix" at the end of this task.

  const { error } = await adminDb().from("anon_calls").insert({
    session_id: sessionId,
    subject_id: input.subjectId,
    call_type: input.callType,
    pick: input.pick,
    house_confidence_pct: snap.houseConfidencePct,
    house_value_eur: snap.houseValueEur,
    earliness: snap.earliness,
  });

  if (error) return { ok: false, reason: error.code === "23505" ? "already_called" : "insert_failed" };
  return { ok: true };
}
```

Note the insert writes `snap.houseConfidencePct` / `snap.houseValueEur` unconditionally, same as the member path — `snapshotCall` already projected them, so there is exactly one place (`snapshot.ts`) that knows which column is null for which `callType`.

- [ ] **Step 3: Additional fix — refuse a fee call with no house value**

**Also modify: `src/lib/receipts/snapshot.ts`.**

Task 3 stopped the snapshot swallowing read *errors*, but a successful query returning **no row** still falls through to `onsideValueEur = 0`. That is not hypothetical: `player_valuations` is modelled as optional everywhere (`queries/rumours.ts:62`, `queries/map.ts:52`), and `queries/map.test.ts:33` has a fixture named `orphan` for exactly this case. Freshly-ingested players are simultaneously the least likely to be valued and the most likely to be rumoured.

For a **fee** call that 0 freezes into the immutable `house_value_eur`, and at settlement `resolveFee(pick, 0, confirmedFee, "disclosed")` makes every "higher" a free win and every "lower" a free loss — worth 0 points, because `feePoints`' `onsideValueEur > 0` guard fails, while still moving `wins`, `accuracy_pct`, `streak` and `scout_badge`. Uncorrectable, because `0003`'s trigger blocks any later UPDATE.

No UI sends `callType: "fee"` today (`CallChip.tsx` hardcodes `"outcome"`), but `lockCall` is a server action — its endpoint accepts a crafted `{callType: "fee", pick: "higher"}` regardless.

Guard the **value**, not the mechanism, so the absent-row and failed-read causes both land in one place. Add after `onsideValueEur` is computed and before the eligibility gate:

```ts
  // A fee call is an argument with Onside's published value. With no value there is
  // nothing to argue with — and freezing 0 into the immutable house_value_eur would make
  // every future "higher" a free win (see resolveFee / feePoints). A genuine €0 Onside
  // value is not a callable fee subject either, so this cannot misfire.
  if (input.callType === "fee" && !(onsideValueEur > 0)) {
    return { ok: false, reason: "no_house_value" };
  }
```

Add `"no_house_value"` to `SnapshotReason`, and a `REASON_COPY` entry in `CallChip.tsx` — something like "We don't have a value for this player yet, so there's no fee to call." The closed union will refuse to compile until you do.

The **outcome** path keeps tolerating `0`: it only perturbs the weight-0.15 alignment factor inside `confidence()`, which is the same treatment unvalued players have always had.

- [ ] **Step 4: Verify**

```bash
cd /Users/perezmoodley/onside-b2c && npm run build && npx vitest run && npm run lint
```
Expected: build clean, 393 tests / 51 files, lint at 73.

- [ ] **Step 5: Commit**

```bash
cd /Users/perezmoodley/onside-b2c && git add src/lib/receipts/anon-session.ts src/lib/receipts/anon-lock.ts src/lib/receipts/snapshot.ts src/components/transfers/CallChip.tsx && git commit -m "feat(receipts): anonymous call path, and refuse a fee call with no house value"
```

---

## Task 5: Claim on signup

The highest-risk task in the plan. If `locked_at` is not preserved, claiming silently resets "I called it in July" to today — the receipt still exists, still scores, and is quietly worthless. Nothing fails loudly. Hence TDD.

**Files:**
- Create: `src/lib/receipts/claim-anon.ts`
- Test: `src/lib/receipts/claim-anon.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/receipts/claim-anon.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { planClaim, type AnonRow, type ExistingCall } from "./claim-anon";

const row = (over: Partial<AnonRow> & { subject_id: string }): AnonRow => ({
  id: "a1",
  session_id: "s1",
  subject_type: "transfer_saga",
  call_type: "outcome",
  pick: "will",
  house_confidence_pct: 31,
  house_value_eur: null,
  earliness: 0.8,
  locked_at: "2026-07-03T10:00:00.000Z",
  ...over,
});

describe("planClaim", () => {
  it("carries the ORIGINAL locked_at onto the claimed prediction", () => {
    const { inserts } = planClaim([row({ subject_id: "deal-1" })], [], "user-1");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].locked_at).toBe("2026-07-03T10:00:00.000Z");
  });

  it("carries the frozen house snapshot and earliness across unchanged", () => {
    const { inserts } = planClaim([row({ subject_id: "deal-1" })], [], "user-1");
    expect(inserts[0].house_confidence_pct).toBe(31);
    expect(inserts[0].earliness).toBe(0.8);
    expect(inserts[0].user_id).toBe("user-1");
    expect(inserts[0].pick).toBe("will");
  });

  it("drops an anon call when the user already called that deal", () => {
    const existing: ExistingCall[] = [{ subject_id: "deal-1", call_type: "outcome" }];
    const { inserts, dropped } = planClaim([row({ subject_id: "deal-1" })], existing, "user-1");
    expect(inserts).toHaveLength(0);
    expect(dropped).toEqual(["a1"]);
  });

  it("treats the same deal's outcome and fee calls as independent", () => {
    const existing: ExistingCall[] = [{ subject_id: "deal-1", call_type: "outcome" }];
    const anon = [row({ subject_id: "deal-1", id: "a2", call_type: "fee", pick: "higher" })];
    const { inserts } = planClaim(anon, existing, "user-1");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].call_type).toBe("fee");
  });

  it("claims every row it can and reports every id to delete", () => {
    const anon = [
      row({ subject_id: "deal-1", id: "a1" }),
      row({ subject_id: "deal-2", id: "a2" }),
      row({ subject_id: "deal-3", id: "a3" }),
    ];
    const existing: ExistingCall[] = [{ subject_id: "deal-2", call_type: "outcome" }];
    const { inserts, dropped, consumedIds } = planClaim(anon, existing, "user-1");
    expect(inserts.map((i) => i.subject_id).sort()).toEqual(["deal-1", "deal-3"]);
    expect(dropped).toEqual(["a2"]);
    // Everything is consumed — claimed or dropped — so nothing is left to re-claim later.
    expect(consumedIds.sort()).toEqual(["a1", "a2", "a3"]);
  });

  it("is a no-op on an empty set", () => {
    const { inserts, consumedIds } = planClaim([], [], "user-1");
    expect(inserts).toHaveLength(0);
    expect(consumedIds).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /Users/perezmoodley/onside-b2c && npx vitest run src/lib/receipts/claim-anon.test.ts
```
Expected: FAIL — cannot resolve `./claim-anon`.

- [ ] **Step 3: Implement**

Create `src/lib/receipts/claim-anon.ts`:

```ts
import "server-only";
import { adminDb } from "@/lib/db/admin";
import { clearAnonSession, readAnonSession } from "./anon-session";
import { resolveSubject } from "./resolve-subject";
import type { SubjectOutcome } from "./resolver";

export interface AnonRow {
  id: string;
  session_id: string;
  subject_type: string;
  subject_id: string;
  call_type: string;
  pick: string;
  house_confidence_pct: number | null;
  house_value_eur: number | null;
  earliness: number;
  locked_at: string;
}

export interface ExistingCall {
  subject_id: string;
  call_type: string;
}

export interface ClaimPlan {
  inserts: {
    user_id: string;
    subject_type: string;
    subject_id: string;
    call_type: string;
    pick: string;
    house_confidence_pct: number | null;
    house_value_eur: number | null;
    earliness: number;
    locked_at: string;
  }[];
  /** Anon ids discarded because the user already called that deal. */
  dropped: string[];
  /** Every anon id handled — claimed or dropped. All get deleted. */
  consumedIds: string[];
}

/**
 * Pure: decide what a claim writes, given the visitor's anon rows and the calls the
 * account already holds.
 *
 * `locked_at` is copied across deliberately. Letting it default to now() would reset
 * "I called it in July" to the signup date — the receipt would still exist and still
 * score, just quietly worthless. Nothing would fail; that is why this is tested.
 */
export function planClaim(anon: AnonRow[], existing: ExistingCall[], userId: string): ClaimPlan {
  const taken = new Set(existing.map((e) => `${e.subject_id}:${e.call_type}`));
  const inserts: ClaimPlan["inserts"] = [];
  const dropped: string[] = [];

  for (const a of anon) {
    if (taken.has(`${a.subject_id}:${a.call_type}`)) {
      // The account's own call wins — it was made knowingly, as themselves.
      dropped.push(a.id);
      continue;
    }
    taken.add(`${a.subject_id}:${a.call_type}`);
    inserts.push({
      user_id: userId,
      subject_type: a.subject_type,
      subject_id: a.subject_id,
      call_type: a.call_type,
      pick: a.pick,
      house_confidence_pct: a.house_confidence_pct,
      house_value_eur: a.house_value_eur,
      earliness: a.earliness,
      locked_at: a.locked_at,
    });
  }

  return { inserts, dropped, consumedIds: anon.map((a) => a.id) };
}

/**
 * Merge this browser's anonymous calls into a real account.
 *
 * Never throws. A failure here must not cost someone their signup — the rows stay put
 * and the next visit retries, because the cookie is only cleared on success.
 */
export async function claimAnonCalls(userId: string): Promise<{ claimed: number }> {
  try {
    const sessionId = await readAnonSession();
    if (!sessionId) return { claimed: 0 };

    const db = adminDb();
    const { data: anon } = await db.from("anon_calls").select("*").eq("session_id", sessionId);
    if (!anon?.length) {
      await clearAnonSession();
      return { claimed: 0 };
    }

    const { data: existing } = await db
      .from("predictions")
      .select("subject_id, call_type")
      .eq("user_id", userId);

    const plan = planClaim(anon as AnonRow[], (existing ?? []) as ExistingCall[], userId);

    if (plan.inserts.length) {
      const { error } = await db.from("predictions").insert(plan.inserts);
      // Leave the rows for the next attempt rather than deleting work we failed to save.
      if (error) return { claimed: 0 };

      // A deal can settle while a call sits unclaimed. resolveSubject only runs at the
      // moment a saga confirms or dies (see official-transfers.ts:286,296), so a
      // prediction inserted AFTER that event would sit 'open' forever — a correct,
      // early call that silently never scores.
      //
      // This can only ever be the called-while-open, settled-while-unclaimed case:
      // lockEligibility already refuses a call on a resolved saga, so nobody can call
      // an outcome they have already seen.
      //
      // The outcome is reconstructed exactly as the ingest builds it — same terminal
      // values, same feeKind derivation (official-transfers.ts:198-202).
      const subjects = [...new Set(plan.inserts.map((i) => i.subject_id))];
      const { data: settled } = await db
        .from("rumours")
        .select("id, status, reported_fee_eur")
        .in("id", subjects)
        .not("resolved_at", "is", null);

      for (const s of settled ?? []) {
        const fee = s.reported_fee_eur;
        const outcome: SubjectOutcome =
          s.status === "confirmed"
            ? {
                terminal: "confirmed",
                confirmedFeeEur: fee,
                feeKind: fee === 0 ? "free" : fee != null ? "disclosed" : "undisclosed",
              }
            : { terminal: "killed_by_competing", confirmedFeeEur: null, feeKind: "undisclosed" };
        // Idempotent — resolveSubject only scores rows still 'open'.
        await resolveSubject(s.id, outcome, db).catch(() => {});
      }
    }

    await db.from("anon_calls").delete().in("id", plan.consumedIds);
    await clearAnonSession();
    return { claimed: plan.inserts.length };
  } catch {
    return { claimed: 0 };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/perezmoodley/onside-b2c && npx vitest run src/lib/receipts/claim-anon.test.ts
```
Expected: PASS, 6 tests.

- [ ] **Step 5: Wire it into the auth callback**

In `src/app/auth/callback/route.ts`, add the import:

```ts
import { claimAnonCalls } from "@/lib/receipts/claim-anon";
```

Then immediately after the `if (error || !data?.user) return fail();` line and before the `const u = data.user;` line, add:

```ts
  // Any calls made before signing up become real receipts now, keeping their original
  // lock time. claimAnonCalls never throws — a failed merge must not cost a signup.
  await claimAnonCalls(data.user.id);
```

- [ ] **Step 6: Verify**

```bash
cd /Users/perezmoodley/onside-b2c && npx vitest run && npm run build && npm run lint
```
Expected: **387 tests / 51 files**, build clean, lint at 73.

- [ ] **Step 7: Commit**

```bash
cd /Users/perezmoodley/onside-b2c && git add src/lib/receipts/claim-anon.ts src/lib/receipts/claim-anon.test.ts src/app/auth/callback/route.ts && git commit -m "feat(receipts): claim anonymous calls on signup, preserving the original lock time"
```

---

## Task 6: Contested ranking

**Files:**
- Create: `src/lib/community/contested.ts`
- Test: `src/lib/community/contested.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/community/contested.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { contestedness, rankForBoard, type BoardSortable } from "./contested";

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
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /Users/perezmoodley/onside-b2c && npx vitest run src/lib/community/contested.test.ts
```
Expected: FAIL — cannot resolve `./contested`.

- [ ] **Step 3: Implement**

Create `src/lib/community/contested.ts`:

```ts
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
 * the same deal, or there is no shared conversation to join. Returns null on an empty list.
 */
export function callOfTheDay<T extends BoardSortable>(deals: T[], utcDate: string): T | null {
  if (!deals.length) return null;
  const ranked = rankForBoard(deals);
  // Rotate deterministically by date so the pick changes daily without a stored choice.
  const top = ranked.slice(0, 10);
  let h = 0;
  for (let i = 0; i < utcDate.length; i++) h = (h * 31 + utcDate.charCodeAt(i)) >>> 0;
  return top[h % top.length];
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/perezmoodley/onside-b2c && npx vitest run src/lib/community/contested.test.ts
```
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/perezmoodley/onside-b2c && git add src/lib/community/contested.ts src/lib/community/contested.test.ts && git commit -m "feat(community): contested ranking — argument first, then where the house is least sure"
```

---

## Task 7: Board queries

**Files:**
- Create: `src/lib/community/queries.ts`

- [ ] **Step 1: Write the query module**

`getRumours(limit)` already returns `RumourItem[]` with `confidence.pct` and `lastUpdate`, deduped by saga. Reuse it — do not write a second rumour reader.

Create `src/lib/community/queries.ts`:

```ts
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

const BOARD_SIZE = 30;

/**
 * The board: live deals ranked by argument, then by how contested the house number is.
 *
 * Deal-led on purpose. An activity feed at 11 calls from 2 people renders as an empty
 * room; this is backed by 487 deals and cannot.
 */
export async function getBoardDeals(limit = BOARD_SIZE): Promise<BoardDeal[]> {
  const deals = await getRumours(120).catch(() => [] as RumourItem[]);
  if (!deals.length) return [];

  const counts = await memberArgumentCounts(deals.map((d) => d.id));
  const withArgument = deals.map((d) => {
    const c = counts.get(d.id) ?? { calls: 0, comments: 0 };
    return { ...d, calls: c.calls, comments: c.comments, argument: c.calls + c.comments };
  });

  return rankForBoard(
    withArgument.map((d) => ({ ...d, confidencePct: d.confidence.pct })),
  ).slice(0, limit) as BoardDeal[];
}

/** The day's shared argument. `utcDate` is an ISO date string, e.g. "2026-08-12". */
export async function getCallOfTheDay(utcDate: string): Promise<BoardDeal | null> {
  const deals = await getBoardDeals(BOARD_SIZE);
  return callOfTheDay(
    deals.map((d) => ({ ...d, confidencePct: d.confidence.pct })),
    utcDate,
  ) as BoardDeal | null;
}

/**
 * Calls + comments per deal, MEMBERS ONLY.
 *
 * `anon_calls` is deliberately absent. The individual calls are private, but this
 * ordering is public — feeding an inflatable signal into it would break that privacy
 * through the back door.
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
    db.from("rumour_comments").select("rumour_id").in("rumour_id", ids),
    db.from("predictions").select("subject_id").eq("subject_type", "transfer_saga").in("subject_id", ids),
  ]);
  for (const c of comments.data ?? []) at(c.rumour_id).comments += 1;
  for (const p of calls.data ?? []) at(p.subject_id).calls += 1;
  return counts;
}
```

- [ ] **Step 2: Verify**

```bash
cd /Users/perezmoodley/onside-b2c && npm run build && npm run lint
```
Expected: build clean, lint at 73.

- [ ] **Step 3: Commit**

```bash
cd /Users/perezmoodley/onside-b2c && git add src/lib/community/queries.ts && git commit -m "feat(community): board queries — member argument only"
```

---

## Task 8: The board UI, the page, and the nav

**Files:**
- Create: `src/components/community/CallBoard.tsx`
- Modify: `src/app/(app)/community/page.tsx` (full rewrite)
- Delete: `src/app/(app)/community/[id]/page.tsx`
- Modify: `src/lib/nav-items.ts`

- [ ] **Step 1: The board component**

Create `src/components/community/CallBoard.tsx`:

```tsx
import Link from "next/link";
import { MessageSquare, Lock } from "lucide-react";
import { Card, Avatar } from "@/components/ui";
import { CallChip } from "@/components/transfers/CallChip";
import type { BoardDeal } from "@/lib/community/queries";

/**
 * One row per live deal: who is moving where, what Onside thinks, and a one-tap
 * disagreement. The chip is the point — a board you can only read is a list.
 */
export function CallBoard({ deals, signedIn }: { deals: BoardDeal[]; signedIn: boolean }) {
  return (
    <div className="space-y-2.5">
      {deals.map((d) => (
        <Card key={d.id} className="p-4">
          <div className="flex items-start gap-3">
            <Avatar name={d.player.name} clubBg={d.player.clubBg} clubColor={d.player.clubColor} src={d.player.photoUrl} size={38} />
            <div className="min-w-0 flex-1">
              <Link href={`/transfers/${d.id}`} className="block">
                <div className="text-[14px] font-semibold truncate hover:text-acc transition">
                  {d.player.name} → {d.toClub}
                </div>
                <div className="text-[12px] text-mute truncate mt-0.5">{d.summary}</div>
              </Link>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-mute-soft num">
                <span>Onside says {d.confidence.pct}%</span>
                {d.calls > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Lock size={10} /> {d.calls}
                  </span>
                )}
                {d.comments > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare size={10} /> {d.comments}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <CallChip subjectId={d.id} houseConfidencePct={d.confidence.pct} signedIn={signedIn} myCall={null} />
          </div>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace the stub page**

Replace the entire contents of `src/app/(app)/community/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/db/supabase-server";
import { getBoardDeals } from "@/lib/community/queries";
import { CallBoard } from "@/components/community/CallBoard";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Community — call it before it happens | Onside",
  description:
    "Every live transfer with Onside's Confidence % attached. Disagree in one tap; your call locks now and scores itself when the saga settles.",
};

export default async function CommunityPage() {
  const [user, deals] = await Promise.all([
    getSessionUser().catch(() => null),
    getBoardDeals(),
  ]);

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Community</div>
        <h1 className="display text-[clamp(26px,4vw,38px)] leading-[1] tracking-[-0.04em]">
          Onside has a number. <span className="font-serif italic text-acc">Disagree with it.</span>
        </h1>
        <p className="text-mute text-[14px] mt-3 max-w-[560px] leading-relaxed">
          Every live deal carries an Onside Confidence %. Call it now — your call locks against
          that number and scores itself when the saga settles. No account needed to start.
        </p>
      </div>

      <CallBoard deals={deals} signedIn={!!user} />
    </div>
  );
}
```

Note there is no empty state: 487 live deals back this. If `getBoardDeals` ever returns nothing the page renders a heading and no rows, which is the correct signal that data is broken — not something to paper over with a friendly message.

- [ ] **Step 3: Delete the sub-stub**

```bash
cd /Users/perezmoodley/onside-b2c && git rm -r "src/app/(app)/community/[id]"
```

- [ ] **Step 4: Add Community to the nav**

In `src/lib/nav-items.ts`, add an entry immediately after the `{ href: "/transfers", label: "Transfers" }` item in the primary nav array:

```ts
  { href: "/community", label: "Community" },
```

Read the file first — it contains more than one array (a primary nav and at least one condensed variant). Add it to the primary desktop nav only; the condensed variants are deliberately short.

- [ ] **Step 5: Verify**

```bash
cd /Users/perezmoodley/onside-b2c && npm run build && npx vitest run && npm run lint
```
Expected: build clean with `/community` in the route table, **394 tests / 52 files**, lint at 73.

- [ ] **Step 6: Verify in the browser**

Start the preview server via the preview tooling (never `npm run dev` in Bash). Check:
1. `/community` renders a list of deals, each with a percentage and a call control — **not** the old "launching soon" screen.
2. Logged out, the chip offers to call rather than only offering to sign in (this depends on Task 9; if Task 9 is not yet done, confirm the board renders and note the chip still shows the sign-in prompt).
3. "Community" appears in the top nav and routes correctly.
4. `/community/anything` 404s rather than rendering the deleted stub.

- [ ] **Step 7: Commit**

```bash
cd /Users/perezmoodley/onside-b2c && git add src/components/community "src/app/(app)/community" src/lib/nav-items.ts && git commit -m "feat(community): the board replaces the stub, and Community enters the nav"
```

---

## Task 9: `CallChip` learns the anonymous path

**Files:**
- Modify: `src/components/transfers/CallChip.tsx`

- [ ] **Step 1: Read the component**

Read `src/components/transfers/CallChip.tsx` in full first. It is a client component using `useTransition`, holding `call`/`error`/`pending` state, and currently renders a sign-in prompt when `signedIn` is false (around line 67).

- [ ] **Step 2: Route the call by auth state**

Add the imports (widening `REASON_COPY` to cover both paths' reason types — Task 3 already typed it `Record<LockFailureReason, string>` with no index signature, so a reason either path can return but this map doesn't cover is a compile error, not a silent fallback):

```tsx
import { lockCall, type LockFailureReason } from "@/lib/receipts/lock-action";
import { lockAnonCall, type AnonLockReason } from "@/lib/receipts/anon-lock";
```

Widen the `REASON_COPY` declaration and add the one new key (`rate_limited`) the anonymous path can return that the member path can't:

```tsx
const REASON_COPY: Record<LockFailureReason | AnonLockReason, string> = {
  not_signed_in: "Sign in to make a call.",
  here_we_go: "This one's as good as done — too late to call.",
  not_live: "This saga has already settled.",
  resolved: "This saga has already settled.",
  house_certain: "Onside already rates this near-certain — pick the other side or sit it out.",
  already_called: "You've already called this one.",
  bad_pick: "Something went wrong — try again.",
  subject_not_found: "Couldn't find this saga.",
  insert_failed: "Couldn't save your call — try again.",
  snapshot_unavailable: "Something went wrong reading this saga. Try again.",
  rate_limited: "Too many calls from this connection. Try again shortly.",
};
```

In `makeCall`, send signed-out users down the anonymous path. Replace the existing `lockCall(...)` invocation inside `startTransition` with:

```tsx
      const res = signedIn
        ? await lockCall({ subjectId, callType: "outcome", pick })
        : await lockAnonCall({ subjectId, callType: "outcome", pick });

      if (!res.ok) {
        // Every well-understood rejection routes through the shared REASON_COPY — same
        // wording a signed-in member sees for the same reason. The one carve-out: an
        // anonymous insert_failed, reached only after snapshotCall already passed eligibility,
        // has no better explanation left than "the session cookie didn't take" — that's the
        // one case the cookies-blocked message actually describes. Scope it to !signedIn so a
        // signed-in member (for whom "sign in" is nonsensical) never sees it.
        setError(
          !signedIn && res.reason === "insert_failed"
            ? "We couldn't save that call. If your browser blocks cookies, sign in and it'll stick."
            : REASON_COPY[res.reason],
        );
        return;
      }
      setCall({ pick, status: "open", points: 0 });
```

This replaces Task 3's `REASON_COPY[res.reason] ?? "Couldn't save your call — try again."` fallback lookup — with the type now closed over both paths' reasons, `REASON_COPY[res.reason]` is total (always a `string`, never `undefined`), so the `??` fallback is no longer reachable and should be dropped here.

- [ ] **Step 3: Replace the signed-out prompt with a post-call nudge**

Replace the `) : !signedIn ? (` branch (the block rendering "Sign in to put your call on the record") so that a signed-out visitor sees the call buttons instead. After they call, show:

```tsx
        <p className="text-[12px] text-mute mt-2">
          Held against Onside&apos;s {houseConfidencePct}% on this browser.{" "}
          <Link href="/login" className="text-acc hover:underline">Create an account</Link> to make it
          permanent — it keeps the date you called.
        </p>
```

The phrase "it keeps the date you called" is load-bearing: it is the promise Task 5's `locked_at` preservation actually delivers. Do not soften it to "save your call".

"**Held … on this browser**" is equally deliberate, and replaces an earlier draft that said "Locked". An anonymous call is only as durable as the cookie, so claiming it is locked is false in the blocked case — see Step 3b.

- [ ] **Step 3b: Confirm the cookie actually stuck**

**There is no in-request signal for "cookies are blocked."** Within the request that serves an anonymous call, a visitor whose cookie will stick and one whose cookie will be dropped are byte-identical: no inbound cookie, mint one, insert, respond. The insert succeeds either way.

If the cookie is dropped, the row is written against a session id no browser will ever present again — orphaned, invisible, unclaimable — while the user was shown a success state. That is precisely the silently-dropped receipt the spec says is worse than a refusal, and it is worse here than elsewhere because `anon_calls` is private by construction, so nobody will ever notice those rows accumulating.

Detection does not have to happen *in* the request. It happens on the **next** one. Add a read-only server action:

```ts
"use server";
import { readAnonSession } from "@/lib/receipts/anon-session";

/**
 * Did THIS request arrive carrying onside_anon?
 *
 * Called once after a successful anonymous call. Because it is a separate HTTP request,
 * it carries the cookie if and only if the browser actually stored it — which is the only
 * way to distinguish a durable anonymous call from an orphaned one.
 *
 * MUST use readAnonSession, never ensureAnonSession: minting here would set a fresh
 * cookie and make this always report success, which is worse than not checking at all.
 */
export async function anonSessionPresent(): Promise<boolean> {
  return (await readAnonSession()) !== null;
}
```

In `CallChip`, after a successful `lockAnonCall`, await it once. On `false`, downgrade the success state to an honest one rather than showing the nudge above:

```tsx
          Your browser isn&apos;t keeping this call.{" "}
          <Link href="/login" className="text-acc hover:underline">Sign in</Link> and it&apos;ll stick.
```

Cost is one extra round-trip on the anonymous path only. Considered and **rejected**: pre-minting the cookie when the chip renders would give a genuine signal at tap time, but it sets a cookie on every visitor who never calls — destroying the essential-cookie position the spec argues ("set only when someone deliberately taps a call, and only to deliver that call") and plausibly pulling the consent banner into scope.

- [ ] **Step 4: Verify**

```bash
cd /Users/perezmoodley/onside-b2c && npm run build && npx vitest run && npm run lint
```

- [ ] **Step 5: Verify in the browser, signed out**

With the preview running and **no session** (use a fresh private window or clear the session cookie):
1. Open `/community`, tap "Won't happen" on a deal → the chip flips to a locked state, no sign-in wall.
2. Reload → the call is still shown (proving the cookie and row persisted).
3. Confirm `onside_anon` exists as an httpOnly cookie in devtools.
4. Tap the same deal again → "You've already called this one." (the unique constraint).
5. Open a deal page `/transfers/<id>` signed out → the chip offers to call there too.

Report what you actually observed for each.

- [ ] **Step 6: Commit**

```bash
cd /Users/perezmoodley/onside-b2c && git add src/components/transfers/CallChip.tsx && git commit -m "feat(receipts): let a signed-out visitor call, and tell them what claiming preserves"
```

---

## Task 10: Call of the Day on the homepage, and the privacy note

**Files:**
- Create: `src/components/community/CallOfTheDay.tsx`
- Modify: `src/app/(marketing)/page.tsx`
- Modify: `src/app/(app)/privacy/page.tsx`

- [ ] **Step 1: The component**

Create `src/components/community/CallOfTheDay.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui";
import { CallChip } from "@/components/transfers/CallChip";
import type { BoardDeal } from "@/lib/community/queries";

/**
 * The homepage's one thing to DO.
 *
 * Everything else above and below it is something to read. This is the only place a
 * first-time visitor can act, and it needs no account — which is the entire point.
 */
export function CallOfTheDay({ deal, signedIn }: { deal: BoardDeal; signedIn: boolean }) {
  return (
    <section className="border-b border-line">
      <div className="max-w-[1440px] mx-auto px-6 py-12">
        <div className="max-w-[720px] mx-auto rounded-2xl border border-acc/30 bg-ink-850 p-7">
          <div className="text-[11px] uppercase tracking-[0.18em] text-acc/90 num mb-4">
            Today&apos;s call
          </div>
          <div className="flex items-start gap-4">
            <Avatar name={deal.player.name} clubBg={deal.player.clubBg} clubColor={deal.player.clubColor} src={deal.player.photoUrl} size={48} />
            <div className="min-w-0 flex-1">
              <Link href={`/transfers/${deal.id}`} className="block">
                <div className="display text-[22px] leading-tight tracking-tight hover:text-acc transition">
                  {deal.player.name} → {deal.toClub}
                </div>
              </Link>
              <p className="text-[13px] text-mute mt-1.5 leading-relaxed line-clamp-2">{deal.summary}</p>
              <div className="num text-[13px] mt-3">
                Onside says <span className="text-acc font-semibold">{deal.confidence.pct}%</span> this happens.
              </div>
            </div>
          </div>

          <div className="mt-5">
            <CallChip subjectId={deal.id} houseConfidencePct={deal.confidence.pct} signedIn={signedIn} myCall={null} />
          </div>

          <Link href="/community" className="inline-flex items-center gap-1.5 text-[12px] text-mute hover:text-acc transition mt-5">
            See every live deal <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Put it on the homepage**

In `src/app/(marketing)/page.tsx`, add the imports:

```tsx
import { getCallOfTheDay } from "@/lib/community/queries";
import { CallOfTheDay } from "@/components/community/CallOfTheDay";
import { getSessionUser } from "@/lib/db/supabase-server";
```

Inside `LandingPage`, after the `articles` try/catch block, add:

```tsx
  // The homepage's only interactive element. Degrades to absent, never to a broken card.
  let todaysCall = null;
  let signedIn = false;
  try {
    const utcDate = new Date().toISOString().slice(0, 10);
    [todaysCall, signedIn] = await Promise.all([
      getCallOfTheDay(utcDate),
      getSessionUser().then((u) => !!u).catch(() => false),
    ]);
  } catch (e) {
    console.error("[landing] call of the day unavailable:", e);
  }
```

Then render it between `<TickerStrip />` and `<ValueProps />`:

```tsx
      <TickerStrip />
      {todaysCall && <CallOfTheDay deal={todaysCall} signedIn={signedIn} />}
      <ValueProps />
```

**Note:** the page currently has `export const revalidate = 1800`. Leave it — the pick is pinned per UTC day, so a 30-minute cache serves the same deal all day. Do not lower it.

- [ ] **Step 3: Name the cookie in the privacy policy**

In `src/app/(app)/privacy/page.tsx`, find the sentence "Essential cookies keep you signed in and the service functioning — these are required and can't be switched off." Extend it:

```
Essential cookies keep you signed in and the service functioning — these are required and
can't be switched off. One of them, onside_anon, is set only if you make a call before
creating an account: it exists solely so that call can be saved and attached to your
record when you sign up, and it is deleted once that happens.
```

Match the file's existing JSX and escaping conventions — read the surrounding markup first.

- [ ] **Step 4: Verify**

```bash
cd /Users/perezmoodley/onside-b2c && npm run build && npx vitest run && npm run lint
```

- [ ] **Step 5: Verify in the browser**

1. Homepage shows "Today's call" between the ticker and the value props, with a percentage and two buttons.
2. Signed out, tapping a button locks the call without a sign-in wall.
3. Reload — the same deal is shown (pinned per UTC day, not re-rolled per request).
4. `/privacy` mentions `onside_anon`.

- [ ] **Step 6: Commit**

```bash
cd /Users/perezmoodley/onside-b2c && git add src/components/community/CallOfTheDay.tsx "src/app/(marketing)/page.tsx" "src/app/(app)/privacy/page.tsx" && git commit -m "feat(community): Call of the Day on the homepage, and name the anon cookie in /privacy"
```

---

## Task 11: Full verification

- [ ] **Step 1: Suite, build, lint**

```bash
cd /Users/perezmoodley/onside-b2c && npx vitest run && npm run build && npm run lint
```
Expected: **394 tests / 52 files**, build clean, lint at the **73-problem** baseline (67 errors, 6 warnings) with nothing in the new files.

- [ ] **Step 2: Confirm anonymous calls are invisible**

Signed out, make a call. Then, in a different browser (or signed in as someone else), open that deal page and the board.

Expected: the call does **not** appear in the deal's call count, does not appear in the discussion thread, and does not change the board ordering. If any of those move, decision 3 in the spec is broken and must be fixed before this ships.

- [ ] **Step 3: Confirm a claim preserves the date**

Make an anonymous call, note the day. Sign up with a fresh account in that same browser. Open `/record`.

Expected: the call is listed with its **original** lock date, not today's. This is the single behaviour the whole design turns on.

- [ ] **Step 4: Check the security advisors**

Supabase MCP `get_advisors`, `type: security`, project `ygmxxveranmfcobcexon`.

Expected: the one known, documented `security_definer_view` notice for `public_profiles`. **Any new finding relating to `anon_calls` is a real problem** — that table should have no policies and no client grants.

- [ ] **Step 5: Do not deploy**

Deployment is Perez's per-action call. Stop and report.

---

## Deferred, deliberately

- **Activity tape, global leaderboards, follower graphs, call notifications** — all need a population we do not have.
- **A durable rate limiter.** The in-memory one is a burst guard; the real control is that anon calls are private, so flooding buys nothing visible.
- **Sweeping expired `anon_calls`.** The delete is written as a comment in the migration. Wire it to a cron when the table is big enough to matter, not before.

## Risk the plan does not remove

This makes the front door open. It does not make the room full. At 2 callers, a visitor who calls will still be the only voice on that deal, and the board's argument counts will read zero for a long time. The design's answer — that the house is always a counterparty — is real but it is not the same as other people being there. Seeding is a launch step, not a build step: **Perez claims a handle and makes the opening calls**, and this release is not finished without it.
