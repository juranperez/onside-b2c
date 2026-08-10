# Public Profile + Thread Receipts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the public profile `/u/[username]` and render each commenter's receipt inside the discussion thread, so that "I called it" / "I don't see your evidence" becomes an argument Onside settles.

**Architecture:** One migration adds a `public_profiles` view (the column list is the security boundary — `profiles` itself stays locked because it carries billing data) plus `favourite_club` and a case-insensitive unique handle. A pure `username.ts` module owns the handle rules and is mirrored by a DB check constraint. The existing `/record` page is refactored so its record UI becomes shared components rendered by both `/record` (your own view, with edit affordances) and `/u/[username]` (the public view). Thread receipts are a batched three-read join, not a new feature.

**Tech Stack:** Next.js 16.2.6 (App Router, `params` is a `Promise`), React 19 server components + `useActionState`, Supabase Postgres with RLS, `next/og` via Satori, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-08-community-receipts-design.md`
**Builds on:** `docs/superpowers/specs/2026-06-15-receipts-reputation-design.md` (scoring engine — already shipped)

---

## Ground truth (verified against prod `ygmxxveranmfcobcexon`, 2026-08-09)

Do not re-derive these; they were checked directly.

| Fact | State | Consequence |
|---|---|---|
| `predictions` RLS | `predictions readable [SELECT] USING (true)` | **Open question 5 is answered.** All calls, including the 9 open ones, are already readable by strangers. No RLS work needed. |
| `profiles` RLS | `own profile [ALL] USING (auth.uid() = id)` | Nothing can read another user's row today. The view is genuinely required. |
| `profiles` columns | `id, username, display_name, tier, created_at, stripe_customer_id, subscription_status, current_period_end` | `favourite_club` **does not exist** — this plan adds it. |
| `reputation` RLS | `reputation readable [SELECT] USING (true)` | Already public. |
| `rumour_comments` | has `profile_id uuid NOT NULL` + denormalised `author_name` | The receipts join is possible; `getRumourComments` just doesn't select `profile_id` yet. |
| Data | 31 profiles / **0 usernames** · 11 predictions from **2 distinct callers** (9 open, 2 settled) · 2 comments from **1 commenter** | Every surface here must survive being empty. Treated as a first-class case in Tasks 7, 9 and 11. |
| `public_profiles` view | does not exist | Task 2. |

### Verification baseline (measured 2026-08-09, before any task ran)

Every task below says "build and lint clean". Read that as **"introduces no new problems"**, not "reports zero" — the repo does not start clean:

| Command | Baseline |
|---|---|
| `npx vitest run` | 49 files / 361 tests passing (Task 1 raised this to 373) |
| `npm run build` | succeeds |
| `npm run lint` | **74 problems (67 errors, 7 warnings) — all pre-existing** |

If `npm run lint` reports 74 problems and none are in the files you touched, that is a pass. Confirm with `git stash` → re-lint → `git stash pop` if the count looks different. Do not "fix" pre-existing lint errors as a side effect of an unrelated task.

**Existing code to reuse, not rebuild:** `getMyCalls` / `getReputation` (`src/lib/receipts/queries.ts`), the `/record` page UI (`src/app/(app)/record/page.tsx`), `OgFrame` / `OG_SIZE` / `Wordmark` (`src/lib/og.tsx`), `readDb` (`src/lib/db/server.ts`), `adminDb` (`src/lib/db/admin.ts`), `getSessionUser` (`src/lib/db/supabase-server.ts`).

## Decisions locked before this plan (do not re-litigate)

1. **Scope** = spec items 1 + 2. Club page rebuild (item 3) is a separate plan.
2. **Handles are permanent.** No rename, no redirect table. With 0 handles claimed there is no migration debt, and relaxing later is easy.
3. **`/record` becomes "your profile, as others see it"** — one shared render, plus edit affordances. Avoids two call-log implementations drifting.
4. From the spec: anyone may comment (non-callers marked); favourite players **cut**; favourite club **kept**; calls public from lock.

## File structure

| File | Responsibility |
|---|---|
| `supabase/migrations/0005_public_profiles.sql` | **Create** — view, `favourite_club`, handle uniqueness + format |
| `src/lib/profiles/username.ts` | **Create** — handle rules (pure, no DB) |
| `src/lib/profiles/username.test.ts` | **Create** — rules under test |
| `src/lib/profiles/queries.ts` | **Create** — public profile reads + the thread receipt join |
| `src/lib/profiles/actions.ts` | **Create** — claim handle, set favourite club |
| `src/components/profile/RecordStats.tsx` | **Create** — stat tiles + badge line (extracted from `/record`) |
| `src/components/profile/CallLog.tsx` | **Create** — call rows + open/settled sections (extracted from `/record`) |
| `src/components/profile/ClaimHandle.tsx` | **Create** — the permanent-handle claim form |
| `src/components/profile/FavouriteClub.tsx` | **Create** — favourite club control |
| `src/app/(app)/u/[username]/page.tsx` | **Create** — the public profile |
| `src/app/(app)/u/[username]/opengraph-image.tsx` | **Create** — the share artefact |
| `src/app/(app)/record/page.tsx` | **Modify** — render shared components + claim UI |
| `src/lib/receipts/queries.ts` | **Modify** — rename `getMyCalls` → `getCallsFor` |
| `src/lib/queries/rumours.ts` | **Modify** — `CommentItem` gains `profileId` |
| `src/components/transfers/discussion-thread.tsx` | **Modify** — render the receipt line |
| `src/app/(app)/transfers/[id]/page.tsx` | **Modify** — pass receipts into the thread |

---

## Task 1: Handle rules

Pure functions, no DB. Everything downstream depends on these being right, and because handles are permanent this is the only gate a bad handle passes through.

> **AMENDED during code review (2026-08-09).** The interface below returns a verdict (`validateUsername` → error code or `null`) while normalizing internally and discarding the canonical string. That lets a caller validate one value and persist another — on a permanent handle, an unfixable row. The shipped version instead returns the safe value, matching `src/lib/auth/safe-redirect.ts`:
>
> ```ts
> export type UsernameCheck =
>   | { ok: true; username: string }
>   | { ok: false; error: UsernameError };
>
> export function checkUsername(raw: unknown): UsernameCheck;
> ```
>
> Also changed: `RESERVED_USERNAMES` is a `ReadonlySet<string>`; check order is `too_short → bad_charset → too_long → bad_start → bad_end → reserved` (`too_short` stays first so an empty field does not report a charset error); non-string input returns a validation error rather than throwing; and two tests now enforce the "keep in sync" comments — one sweeping the app rules against the migration's regex, one reading `src/app/(app)` to confirm every route is reserved. **Task 5 below already uses `checkUsername`.**

**Files:**
- Create: `src/lib/profiles/username.ts`
- Test: `src/lib/profiles/username.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/profiles/username.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateUsername, normalizeUsername, RESERVED_USERNAMES } from "./username";

describe("normalizeUsername", () => {
  it("lowercases, trims and drops a leading @", () => {
    expect(normalizeUsername("  @Perez  ")).toBe("perez");
  });
});

describe("validateUsername", () => {
  it("accepts an ordinary handle", () => {
    expect(validateUsername("perez")).toBeNull();
    expect(validateUsername("perez_99")).toBeNull();
  });
  it("accepts the boundary lengths", () => {
    expect(validateUsername("abc")).toBeNull();
    expect(validateUsername("a".repeat(20))).toBeNull();
  });
  it("rejects handles outside the length bounds", () => {
    expect(validateUsername("ab")).toBe("too_short");
    expect(validateUsername("a".repeat(21))).toBe("too_long");
  });
  it("rejects anything outside [a-z0-9_]", () => {
    expect(validateUsername("perez-99")).toBe("bad_charset");
    expect(validateUsername("perez.99")).toBe("bad_charset");
    expect(validateUsername("pérez")).toBe("bad_charset");
  });
  it("requires a leading letter so handles never read as numbers", () => {
    expect(validateUsername("9perez")).toBe("bad_start");
    expect(validateUsername("_perez")).toBe("bad_start");
  });
  it("rejects a trailing underscore", () => {
    expect(validateUsername("perez_")).toBe("bad_end");
  });
  it("rejects route collisions and impersonation traps", () => {
    expect(validateUsername("transfers")).toBe("reserved");
    expect(validateUsername("admin")).toBe("reserved");
    expect(validateUsername("Onside")).toBe("reserved");
    expect(validateUsername("record")).toBe("reserved");
  });
  it("validates the normalized form, so case never smuggles a reserved word through", () => {
    expect(validateUsername("  @ADMIN ")).toBe("reserved");
  });
  it("every reserved word is itself rejected", () => {
    for (const w of RESERVED_USERNAMES) expect(validateUsername(w)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ~/onside-b2c && npx vitest run src/lib/profiles/username.test.ts
```

Expected: FAIL — `Failed to resolve import "./username"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/profiles/username.ts`:

```ts
/**
 * Handle rules.
 *
 * Handles are PERMANENT once claimed (no rename, no redirect table), so this is the
 * only gate a bad handle ever passes through. Mirrored by a check constraint in
 * migration 0005 — the app is the friendly gate, the database is the one that cannot
 * be bypassed. Keep the two in sync.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/**
 * Top-level routes plus identity traps. Route names matter because a handle that
 * shadows a route is confusing in every share link; the identity words matter because
 * the thread receipt line renders a handle next to a claim, and "@admin called it"
 * trades on authority we never granted.
 *
 * Keep the first block in sync with the directories in `src/app/(app)`.
 */
export const RESERVED_USERNAMES = new Set([
  // top-level app routes
  "ask", "clubs", "coach", "community", "compare", "contracts", "data-sources",
  "discover", "free-agents", "insights", "leagues", "login", "managers", "matches",
  "methodology", "news", "notifications", "players", "pricing", "privacy", "record",
  "search", "stats", "terms", "the-board", "transfers", "watchlist", "worldcup",
  // infrastructure
  "api", "u", "www", "assets", "static", "public", "sitemap", "robots", "favicon",
  // identity / impersonation
  "admin", "administrator", "mod", "moderator", "staff", "team", "official",
  "support", "help", "onside", "onsidemarket", "me", "you", "null", "undefined",
  "anonymous", "deleted",
]);

export type UsernameError =
  | "too_short"
  | "too_long"
  | "bad_charset"
  | "bad_start"
  | "bad_end"
  | "reserved";

export const USERNAME_ERROR_MESSAGE: Record<UsernameError, string> = {
  too_short: `Handles are at least ${USERNAME_MIN} characters.`,
  too_long: `Handles are at most ${USERNAME_MAX} characters.`,
  bad_charset: "Letters, numbers and underscores only.",
  bad_start: "Handles start with a letter.",
  bad_end: "Handles can't end with an underscore.",
  reserved: "That handle is reserved.",
};

/** Canonical storage form. Handles are stored and compared lowercase. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

/** `null` when the handle is claimable; otherwise the reason. Runs on the normalized form. */
export function validateUsername(raw: string): UsernameError | null {
  const u = normalizeUsername(raw);
  if (u.length < USERNAME_MIN) return "too_short";
  if (u.length > USERNAME_MAX) return "too_long";
  if (!/^[a-z0-9_]+$/.test(u)) return "bad_charset";
  if (!/^[a-z]/.test(u)) return "bad_start";
  if (u.endsWith("_")) return "bad_end";
  if (RESERVED_USERNAMES.has(u)) return "reserved";
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd ~/onside-b2c && npx vitest run src/lib/profiles/username.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
cd ~/onside-b2c && git add src/lib/profiles/username.ts src/lib/profiles/username.test.ts && git commit -m "feat(profiles): handle rules — permanent, lowercase, route- and impersonation-safe"
```

---

## Task 2: Migration — `public_profiles` view, `favourite_club`, handle uniqueness

Written but **not applied**. Applying is Task 3 and needs Perez's explicit word.

This is also where the app↔DB agreement sweep from Task 1 gets its teeth: the regex stops being hypothetical here, so the two gates genuinely have to agree from this commit onward.

**Files:**
- Create: `supabase/migrations/0005_public_profiles.sql`
- Modify: `src/lib/profiles/username.test.ts` (close the sweep's upper-bound blind spot — Step 3)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_public_profiles.sql`:

```sql
-- Community v1 — public profiles.
-- NOT YET APPLIED. Apply to prod (ygmxxveranmfcobcexon) via Supabase MCP on Perez's
-- per-action authorization. Spec: docs/superpowers/specs/2026-08-08-community-receipts-design.md
--
-- rollback: drop trigger if exists profiles_username_permanent on public.profiles;
-- rollback: drop function if exists public.profiles_block_username_change();
-- rollback: drop view if exists public.public_profiles;
-- rollback: alter table public.profiles drop constraint if exists profiles_username_format;
-- rollback: alter table public.profiles drop constraint if exists profiles_favourite_club_len;
-- rollback: drop index if exists public.profiles_username_lower_key;
-- rollback: alter table public.profiles drop column if exists favourite_club;  -- DESTROYS DATA

-- Favourite club is load-bearing, not decoration: it powers the club leaderboard and
-- "your club's window" in the next plan, and it is the tribal-identity hook that drives
-- return visits. Free text to match rumours.to_club; deliberately no FK, because clubs
-- are keyed by slug elsewhere and a hard reference would break on renames.
alter table public.profiles add column if not exists favourite_club text;

-- Handles are PERMANENT and case-insensitively unique. The app normalizes to lowercase
-- before every write; this functional index makes that a database guarantee rather than
-- a convention, and it is what makes a concurrent double-claim fail loudly (23505).
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username)) where username is not null;

-- Mirror of checkUsername() in src/lib/profiles/username.ts: 3-20 chars, leading
-- letter, [a-z0-9_], no trailing underscore. The reserved-word list stays in the app —
-- it changes with the route table, and a check constraint is the wrong place for it.
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z][a-z0-9_]{1,18}[a-z0-9]$');

-- The public face of a profile. These columns, and only these, ever leave the table.
--
-- profiles itself stays locked to `own profile [ALL]` because it carries
-- stripe_customer_id / subscription_status / tier / current_period_end — opening SELECT
-- on it would leak billing data to anyone who asked.
--
-- This view is deliberately NOT `security_invoker`. It runs as owner so it can read
-- past the profiles RLS policy, which is the entire mechanism: the column list above is
-- the security boundary. Supabase's advisor flags this pattern as `security_definer_view`
-- — expected here. Do NOT "fix" it by adding security_invoker = on, which would make the
-- view return zero rows to exactly the strangers it exists to serve.
--
-- `id` is included because the thread receipt join maps profile_id -> handle. That UUID
-- is already public via `predictions.user_id` (policy: predictions readable USING true),
-- so this exposes nothing new.
--
-- No username, no public page: the WHERE clause is what makes an unclaimed profile invisible.
--
-- drop+create rather than `create or replace`: CREATE OR REPLACE VIEW can only APPEND
-- columns, so the first migration that drops or reorders one fails outright. Replace's
-- usual advantage (it preserves grants) does not apply, because privileges below are set
-- explicitly rather than inherited.
drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, username, display_name, favourite_club, created_at
  from public.profiles
  where username is not null;

-- ⚠️ The grant does NOT establish this view's privileges — it ADDS to them.
-- Supabase's default ACL for schema public (pg_default_acl, objtype 'r' — which covers
-- views) already hands anon and authenticated `arwdDxtm` on every new relation. A view
-- has no RLS of its own; this one is auto-updatable; and it executes as its owner
-- (postgres), who bypasses RLS on profiles because relforcerowsecurity is false.
-- Without the revoke, `delete from public.public_profiles` using the publishable key
-- that ships in the browser bundle cascades through eight ON DELETE CASCADE foreign
-- keys and erases predictions, reputation and comments.
-- The column list bounds SELECT. It does nothing for DELETE. This revoke is the boundary.
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- Handles are permanent, and the claim action runs as service_role — which bypasses RLS,
-- policies and grants alike. Client UPDATE on profiles is already impossible (authenticated
-- holds ardDxtm, no `w`), so this exists to stop a future SERVER-side edit from silently
-- allowing renames and breaking every shared link and OG card. Same pattern as
-- predictions_block_field_mutation in 0003_receipts.sql.
create or replace function public.profiles_block_username_change()
returns trigger language plpgsql as $$
begin
  if old.username is not null and new.username is distinct from old.username then
    raise exception 'profiles: username is permanent once claimed';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_username_permanent on public.profiles;
create trigger profiles_username_permanent before update on public.profiles
  for each row execute function public.profiles_block_username_change();

-- favourite_club is client-settable and rendered publicly next to a handle. 80 matches
-- the .slice(0, 80) in setFavouriteClub — a mismatch would surface as a raw 23514
-- instead of a friendly message.
alter table public.profiles drop constraint if exists profiles_favourite_club_len;
alter table public.profiles add constraint profiles_favourite_club_len
  check (favourite_club is null or length(favourite_club) <= 80);
```

**No `begin;`/`commit;` wrapper, deliberately.** This is applied through Supabase's `apply_migration`, which may already run the batch in a transaction; a nested `BEGIN` warns and the inner `COMMIT` would end the outer transaction early. On first apply every `drop ... if exists` is a no-op, so the partial-failure window a wrapper would protect does not exist here.

- [ ] **Step 2: Verify the format regex matches the TypeScript rules**

Reason through it rather than guessing: `^[a-z]` + `[a-z0-9_]{1,18}` + `[a-z0-9]$` gives 1+1+1 = 3 minimum and 1+18+1 = 20 maximum characters, requires a leading letter, and forbids a trailing underscore. That is exactly `checkUsername` minus the reserved list.

- [ ] **Step 3: Close the sweep's upper-bound blind spot**

Task 1's "agreement with the database check constraint" test generates candidates only up to 4 characters, so it cannot reach the 20-char ceiling. This was proven, not theorised: setting `USERNAME_MAX = 24` and making the one accompanying edit anybody would naturally make left the suite fully green while the app accepted handles the regex rejects.

In `src/lib/profiles/username.test.ts`, extend the sweep's candidate list so the boundaries are **derived from the constant** rather than hardcoded — a guard that can be edited out of relevance is not a guard:

```ts
const candidates = [
  ...combinations(CHARSET, 4),
  ...[USERNAME_MAX - 1, USERNAME_MAX, USERNAME_MAX + 1].flatMap((n) => [
    "a".repeat(n),
    "a".repeat(n - 1) + "_",
    "a".repeat(n - 1) + "9",
  ]),
];
```

Verify it is now live: temporarily set `USERNAME_MAX = 24`, confirm the sweep **fails**, then restore it and confirm green.

- [ ] **Step 4: Commit**

```bash
cd ~/onside-b2c && git add supabase/migrations/0005_public_profiles.sql src/lib/profiles/username.test.ts && git commit -m "feat(db): migration 0005 — public_profiles view, favourite_club, permanent handles"
```

---

## Task 3: Apply the migration and regenerate types

**⛔ GATE — STOP HERE.** This writes to production. Per the project's standing rule, migrations run only on Perez's explicit per-action authorization. Ask, show him the file, and wait. Do not proceed on assumed approval.

Everything after this task fails to typecheck until it is done, because `public_profiles` and `favourite_club` do not exist in `src/lib/db/types.ts` yet.

**Files:**
- Modify: `src/lib/db/types.ts` (regenerated, not hand-edited)

- [ ] **Step 1: Ask for authorization**

Show Perez `supabase/migrations/0005_public_profiles.sql` and confirm he wants it applied to `ygmxxveranmfcobcexon`.

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool (not `execute_sql` — this is DDL):
- `project_id`: `ygmxxveranmfcobcexon`
- `name`: `public_profiles_v1`
- `query`: the full contents of `supabase/migrations/0005_public_profiles.sql`

- [ ] **Step 3: Verify the view exists and hides unclaimed profiles**

Run via Supabase MCP `execute_sql` on `ygmxxveranmfcobcexon`:

```sql
select
  (select count(*) from public.public_profiles) as visible_profiles,
  (select count(*) from public.profiles) as total_profiles,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='public_profiles') as view_columns,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='profiles' and column_name='favourite_club') as favourite_club_added;
```

Expected: `visible_profiles = 0` (nobody has claimed a handle yet — this is the correct empty state, not a failure), `total_profiles = 31`, `view_columns = 5`, `favourite_club_added = 1`.

- [ ] **Step 4: Verify the view does not leak billing columns**

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='public_profiles' order by ordinal_position;
```

Expected exactly: `id`, `username`, `display_name`, `favourite_club`, `created_at`. If `stripe_customer_id`, `subscription_status`, `tier` or `current_period_end` appears, stop and fix the view before going further.

- [ ] **Step 4b: Verify the view is read-only to client roles**

The single most important post-apply check. Supabase's default ACL grants `anon`/`authenticated` full `arwdDxtm` on every new relation including views, and a view has no RLS to fall back on:

```sql
select grantee, string_agg(privilege_type, ', ' order by privilege_type) as privs
from information_schema.role_table_grants
where table_schema='public' and table_name='public_profiles'
  and grantee in ('anon','authenticated')
group by grantee;
```

Expected: exactly `SELECT` for each of `anon` and `authenticated`. **If `DELETE`, `UPDATE`, `INSERT` or `TRUNCATE` appears for either role, stop immediately** — writes through this view execute as the view owner and bypass RLS on `profiles`, and `profiles` is the parent of eight `ON DELETE CASCADE` foreign keys. Re-run the `revoke all` and re-check before doing anything else.

Then confirm the permanence trigger actually fires:

```sql
select tgname from pg_trigger
where tgrelid = 'public.profiles'::regclass and not tgisinternal;
```

Expected: `profiles_username_permanent` present.

- [ ] **Step 5: Regenerate the database types**

Use the Supabase MCP `generate_typescript_types` tool with `project_id: ygmxxveranmfcobcexon`, and write the result over `src/lib/db/types.ts`.

- [ ] **Step 6: Verify the build still typechecks**

```bash
cd ~/onside-b2c && npm run build
```

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
cd ~/onside-b2c && git add src/lib/db/types.ts && git commit -m "chore(db): regenerate types after 0005 (public_profiles, favourite_club)"
```

---

## Task 4: Public profile queries

Three reads, all batched. `getCallsFor` is the existing `getMyCalls` renamed — the body is already user-id-parameterised, and the old name invites `getMyCalls(someoneElse.id)` on a public page.

**Files:**
- Create: `src/lib/profiles/queries.ts`
- Modify: `src/lib/receipts/queries.ts:82` (rename `getMyCalls` → `getCallsFor`)
- Modify: `src/app/(app)/record/page.tsx:7` (update the import)

- [ ] **Step 1: Rename `getMyCalls` to `getCallsFor`**

In `src/lib/receipts/queries.ts`, change the doc comment and signature at line 81-82 from:

```ts
/** Every call a user has made, newest first, joined to the saga for display. Powers the receipts hub. */
export async function getMyCalls(userId: string): Promise<ReceiptCall[]> {
```

to:

```ts
/**
 * Every call a user has made, newest first, joined to the saga for display.
 * Powers both the private `/record` view and the public `/u/[username]` profile —
 * the calls are identical, only the viewer differs.
 */
export async function getCallsFor(userId: string): Promise<ReceiptCall[]> {
```

Leave the function body unchanged.

- [ ] **Step 2: Update the one existing call site**

In `src/app/(app)/record/page.tsx`, line 7, change:

```ts
import { getReputation, getMyCalls, type ReceiptCall } from "@/lib/receipts/queries";
```

to:

```ts
import { getReputation, getCallsFor, type ReceiptCall } from "@/lib/receipts/queries";
```

and at line 90 change `getMyCalls(user.id)` to `getCallsFor(user.id)`.

- [ ] **Step 3: Verify nothing else referenced the old name**

```bash
cd ~/onside-b2c && grep -rn "getMyCalls" src/ || echo "clean"
```

Expected: `clean`.

- [ ] **Step 4: Write the profile queries**

Create `src/lib/profiles/queries.ts`:

```ts
import "server-only";
import { readDb } from "@/lib/db/server";
import { adminDb } from "@/lib/db/admin";

/**
 * A public profile shows calls the moment they lock, so the default 30-minute read
 * cache would make the page look broken to the person who just called. 60s still
 * absorbs a share spike, which is the only traffic shape this page sees.
 */
const PROFILE_REVALIDATE = 60;

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string | null;
  favouriteClub: string | null;
  createdAt: string;
}

/** A profile by handle, or null when the handle is unclaimed or does not exist. */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const { data } = await readDb({ revalidate: PROFILE_REVALIDATE })
    .from("public_profiles")
    .select("id, username, display_name, favourite_club, created_at")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();
  if (!data?.username) return null;
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
 * Receipts for a set of comment authors on one deal, keyed by profile id.
 *
 * Three batched reads, never per-author — a thread with 40 comments must not become
 * 120 queries. Authors with no claimed handle and no call still get an entry, so the
 * thread can render "No call on record" without a second lookup.
 */
export async function getAuthorReceipts(
  rumourId: string,
  profileIds: string[],
): Promise<Map<string, AuthorReceipt>> {
  const out = new Map<string, AuthorReceipt>();
  const ids = [...new Set(profileIds)].filter(Boolean);
  if (!ids.length) return out;

  const db = readDb({ revalidate: PROFILE_REVALIDATE });
  const [profiles, calls, reps] = await Promise.all([
    db.from("public_profiles").select("id, username").in("id", ids),
    db
      .from("predictions")
      .select("user_id, pick, house_confidence_pct, locked_at, status")
      .eq("subject_id", rumourId)
      .eq("call_type", "outcome")
      .in("user_id", ids),
    db.from("reputation").select("user_id, wins, losses, accuracy_pct").in("user_id", ids),
  ]);

  const handleBy = new Map((profiles.data ?? []).map((p) => [p.id, p.username] as const));
  const callBy = new Map((calls.data ?? []).map((c) => [c.user_id, c] as const));
  const repBy = new Map((reps.data ?? []).map((r) => [r.user_id, r] as const));

  for (const id of ids) {
    const call = callBy.get(id);
    const rep = repBy.get(id);
    out.set(id, {
      username: handleBy.get(id) ?? null,
      pick: call?.pick ?? null,
      houseConfidencePct: call?.house_confidence_pct ?? null,
      lockedAt: call?.locked_at ?? null,
      status: call?.status ?? null,
      wins: rep?.wins ?? 0,
      losses: rep?.losses ?? 0,
      accuracyPct: rep?.accuracy_pct ?? null,
    });
  }
  return out;
}
```

- [ ] **Step 5: Verify the build typechecks**

```bash
cd ~/onside-b2c && npm run build && npm run lint
```

Expected: both clean. (If `public_profiles` is unknown to TypeScript, Task 3 Step 5 was skipped.)

- [ ] **Step 6: Commit**

```bash
cd ~/onside-b2c && git add src/lib/profiles/queries.ts src/lib/receipts/queries.ts "src/app/(app)/record/page.tsx" && git commit -m "feat(profiles): public profile reads + batched thread receipt join"
```

---

## Task 5: Claim a handle, set a favourite club

**Files:**
- Create: `src/lib/profiles/actions.ts`

- [ ] **Step 1: Write the actions**

Create `src/lib/profiles/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/db/admin";
import { getSessionUser } from "@/lib/db/supabase-server";
import { checkUsername, USERNAME_ERROR_MESSAGE } from "./username";

export type ProfileActionState = { ok?: boolean; error?: string; username?: string };

/**
 * Claim a permanent handle.
 *
 * Permanent by design (see the plan's decisions): if one is already set this refuses
 * rather than updating, so a shared link or OG card can never point at a handle that
 * has moved. The unique index on lower(username) is what actually settles a race —
 * two people claiming the same handle at once means one of them gets 23505, and the
 * pre-check below is only there to produce a nicer message in the common case.
 */
export async function claimUsername(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return { error: "Sign in first." };

  // checkUsername takes `unknown` and hands back the canonical string, so there is no
  // way to validate one value and persist another — which on a permanent handle would
  // produce a row nobody can fix.
  const check = checkUsername(formData.get("username"));
  if (!check.ok) return { error: USERNAME_ERROR_MESSAGE[check.error] };
  const username = check.username;

  const db = adminDb();
  // Idempotent: if they already hold the exact handle being claimed, that is a success,
  // not an error. The outcome must not depend on which of this check and the write's
  // zero-row branch happens to catch a duplicate submit — they are milliseconds apart.
  const { data: existing } = await db
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (existing?.username) {
    return existing.username === username
      ? { ok: true, username }
      : { error: `Your handle is already set to @${existing.username} and can't be changed.` };
  }

  // .eq, NOT .ilike — `_` is a legal handle character AND an ILIKE single-character
  // wildcard, so `.ilike` would match `perez_99` against `perezA99` and falsely tell a
  // user that a free handle is taken. Plain equality is already case-insensitive in
  // effect, because checkUsername lowercases and nothing else writes this column.
  // Excluding the caller's own row keeps a double-submit from reporting "taken" to the
  // person who just took it.
  const { data: taken } = await db
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) return { error: "That handle is taken." };

  // .is("username", null) makes the profiles_username_permanent trigger unreachable by
  // construction rather than merely unlikely: this statement can only ever touch rows
  // whose username is already NULL, so OLD.username is never non-null.
  const { data: written, error } = await db
    .from("profiles")
    .update({ username })
    .eq("id", user.id)
    .is("username", null)
    .select("username")
    .maybeSingle();
  if (error) {
    // 23505 = unique_violation on profiles_username_lower_key: someone claimed it
    // between the check above and this write.
    if (error.code === "23505") return { error: "That handle is taken." };
    // Never surface a raw Postgres message to a user.
    return { error: "Couldn't claim that handle. Try again." };
  }
  // No error but no row means someone else already wrote this account's handle —
  // a double-click, or a second tab. Report what is now TRUE for the account rather
  // than what this particular request did: if the row already holds the exact handle
  // being claimed, the desired end state is true regardless of which request won, so
  // this is a SUCCESS. Returning an error here is how a double-click ends up telling
  // a user their permanent claim failed after it succeeded, naming no handle and
  // linking nowhere.
  if (!written) {
    const { data: now } = await db
      .from("profiles").select("username").eq("id", user.id).maybeSingle();
    if (now?.username === username) {
      revalidatePath("/record");
      revalidatePath(`/u/${username}`);
      return { ok: true, username };
    }
    if (now?.username) {
      // Name the handle they hold — "you can't change it" without saying what it is
      // leaves the user at a dead end, and we already have the value.
      return { error: `Your handle is already set to @${now.username} and can't be changed.` };
    }
    return { error: "Couldn't claim that handle. Try again." };
  }

  revalidatePath("/record");
  revalidatePath(`/u/${username}`);
  return { ok: true, username };
}

/** Set (or clear) the favourite club. Unlike the handle, this is freely changeable. */
export async function setFavouriteClub(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return { error: "Sign in first." };

  const club = String(formData.get("favourite_club") ?? "").trim().slice(0, 80);
  const db = adminDb();
  const { error } = await db
    .from("profiles")
    .update({ favourite_club: club || null })
    .eq("id", user.id);
  if (error) return { error: error.message };

  const { data: me } = await db.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidatePath("/record");
  if (me?.username) revalidatePath(`/u/${me.username}`);
  return { ok: true };
}
```

- [ ] **Step 2: Verify build and lint**

```bash
cd ~/onside-b2c && npm run build && npm run lint
```

Expected: both clean.

- [ ] **Step 3: Commit**

```bash
cd ~/onside-b2c && git add src/lib/profiles/actions.ts && git commit -m "feat(profiles): claim a permanent handle, set a favourite club"
```

---

## Task 6: Extract the record UI into shared components

`/record` and `/u/[username]` render the same record and the same call log. Extract once so they cannot drift. Lifted from `src/app/(app)/record/page.tsx` with the copy made viewer-neutral.

**Files:**
- Create: `src/components/profile/RecordStats.tsx`
- Create: `src/components/profile/CallLog.tsx`

- [ ] **Step 1: Create the stats component**

Create `src/components/profile/RecordStats.tsx`:

```tsx
import { BadgeCheck, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReputationView } from "@/lib/receipts/queries";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="flex-1 min-w-[88px] rounded-xl border border-line bg-ink-850 px-4 py-3.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-mute-soft num mb-1.5">{label}</div>
      <div className={cn("num display text-[26px] leading-none", tone === "up" && "text-up", tone === "down" && "text-down")}>
        {value}
      </div>
    </div>
  );
}

/**
 * The record: four tiles plus the standing line beneath them.
 *
 * `self` switches the standing line between second person ("Make 3 more calls") and
 * third ("Not yet ranked") — the numbers are identical either way, which is the point
 * of sharing this component between /record and /u/[username].
 */
export function RecordStats({
  rep,
  openCount,
  self,
}: {
  rep: ReputationView;
  openCount: number;
  self: boolean;
}) {
  const scored = rep.wins + rep.losses;
  const remaining = 5 - scored;

  return (
    <>
      <div className="flex flex-wrap gap-2.5 mb-3">
        <Stat label="Record" value={`${rep.wins}–${rep.losses}`} />
        <Stat label="Accuracy" value={rep.accuracyPct != null ? `${rep.accuracyPct}%` : "—"} />
        <Stat
          label="Streak"
          value={rep.streak > 0 ? `W${rep.streak}` : rep.streak < 0 ? `L${-rep.streak}` : "—"}
          tone={rep.streak > 0 ? "up" : rep.streak < 0 ? "down" : undefined}
        />
        <Stat label="Open" value={String(openCount)} />
      </div>
      <div className="flex items-center gap-2 mb-8 text-[11.5px] text-mute-soft">
        {rep.scoutBadge ? (
          <span className="inline-flex items-center gap-1.5 text-acc font-semibold">
            <BadgeCheck size={14} /> Verified scout
          </span>
        ) : scored < 5 ? (
          <span>
            {self
              ? `Make ${remaining} more scored ${remaining === 1 ? "call" : "calls"} to enter the rankings.`
              : "Not yet ranked — fewer than five scored calls."}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Trophy size={13} className="text-mute" /> Ranked
          </span>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create the call log component**

Create `src/components/profile/CallLog.tsx`:

```tsx
import Link from "next/link";
import { Check, X, Lock, ArrowRight } from "lucide-react";
import { Card, Avatar } from "@/components/ui";
import type { ReceiptCall } from "@/lib/receipts/queries";

const PICK_LABEL: Record<string, string> = {
  will: "Will happen",
  wont: "Won't happen",
  higher: "Fee higher than value",
  lower: "Fee lower than value",
};

function timeAgo(iso: string): string {
  const mins = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (mins < 60) return `${Math.max(1, Math.floor(mins))}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  const days = Math.floor(mins / (60 * 24));
  return days < 14 ? `${days}d` : `${Math.floor(days / 7)}w`;
}

function CallRow({ c, self }: { c: ReceiptCall; self: boolean }) {
  const pick = PICK_LABEL[c.pick] ?? c.pick;
  const s = c.subject;
  const inner = (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 border-b border-line last:border-0 hover:bg-overlay/[0.03] transition">
      <Avatar name={s?.player ?? "?"} src={s?.photoUrl ?? undefined} size={34} />
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold truncate">{s?.player ?? "Unknown saga"}</div>
        <div className="text-[11.5px] text-mute truncate">
          {s ? (
            <>
              {s.fromClub} <ArrowRight size={10} className="inline -mt-0.5 text-mute-soft" /> {s.toClub}
            </>
          ) : (
            c.subject?.id
          )}
          <span className="text-mute-soft"> · </span>
          {self ? "you called" : "called"} <span className="text-fg font-medium">{pick}</span>
          {c.houseConfidencePct != null && (
            <span className="text-mute-soft num"> · house {c.houseConfidencePct}%</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {c.status === "won" ? (
          <span className="inline-flex items-center gap-1 text-up text-[12px] font-bold">
            <Check size={13} /> Called it <span className="num">+{c.points}</span>
          </span>
        ) : c.status === "lost" ? (
          <span className="inline-flex items-center gap-1 text-down text-[12px] font-bold">
            <X size={13} /> Missed <span className="num">{c.points}</span>
          </span>
        ) : c.status === "open" ? (
          <span className="inline-flex items-center gap-1 text-mute-soft text-[11px] num">
            <Lock size={11} /> open · {timeAgo(c.lockedAt)}
          </span>
        ) : (
          <span className="text-mute-soft text-[11px]">no result</span>
        )}
      </div>
    </div>
  );
  return s ? (
    <Link href={`/transfers/${s.id}`} className="block">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}

/** Open calls then settled calls. Renders nothing when there are none — callers own the empty state. */
export function CallLog({ calls, self }: { calls: ReceiptCall[]; self: boolean }) {
  const open = calls.filter((c) => c.status === "open");
  const resolved = calls.filter((c) => c.status !== "open");

  return (
    <>
      {open.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[12px] uppercase tracking-[0.14em] text-mute-soft num mb-2.5">
            Open calls <span className="text-mute">· settle when each saga does</span>
          </h2>
          <Card className="overflow-hidden">
            {open.map((c) => (
              <CallRow key={c.id} c={c} self={self} />
            ))}
          </Card>
        </section>
      )}
      {resolved.length > 0 && (
        <section>
          <h2 className="text-[12px] uppercase tracking-[0.14em] text-mute-soft num mb-2.5">Settled calls</h2>
          <Card className="overflow-hidden">
            {resolved.map((c) => (
              <CallRow key={c.id} c={c} self={self} />
            ))}
          </Card>
        </section>
      )}
    </>
  );
}
```

- [ ] **Step 3: Verify build and lint**

```bash
cd ~/onside-b2c && npm run build && npm run lint
```

Expected: both clean. The components are not yet imported anywhere — that is fine.

- [ ] **Step 4: Commit**

```bash
cd ~/onside-b2c && git add src/components/profile/ && git commit -m "refactor(profile): extract shared record stats + call log"
```

---

## Task 7: The public profile page

**Files:**
- Create: `src/app/(app)/u/[username]/page.tsx`

Before writing: this is Next 16 and `params` is a `Promise` (see `src/app/(app)/transfers/[id]/page.tsx:32`). Per `AGENTS.md`, check `node_modules/next/dist/docs/` if any routing API is unfamiliar.

- [ ] **Step 1: Write the page**

Create `src/app/(app)/u/[username]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { getPublicProfile } from "@/lib/profiles/queries";
import { getReputation, getCallsFor } from "@/lib/receipts/queries";
import { RecordStats } from "@/components/profile/RecordStats";
import { CallLog } from "@/components/profile/CallLog";

export const revalidate = 60;

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username).catch(() => null);
  if (!profile) return { title: "Profile — Onside" };

  const rep = await getReputation(profile.id).catch(() => null);
  const record = rep && rep.wins + rep.losses > 0 ? `${rep.wins}–${rep.losses}` : "no settled calls yet";
  return {
    title: `@${profile.username} — ${record} on Onside`,
    description: `${profile.displayName ?? profile.username}'s transfer calls on Onside: every call timestamped against the house number at the moment it locked.`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const [rep, calls] = await Promise.all([getReputation(profile.id), getCallsFor(profile.id)]);
  const openCount = calls.filter((c) => c.status === "open").length;
  const scored = rep.wins + rep.losses;

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">
          @{profile.username}
          {profile.favouriteClub && <span className="text-mute"> · {profile.favouriteClub}</span>}
          <span className="text-mute-soft"> · since {memberSince(profile.createdAt)}</span>
        </div>
        <h1 className="display text-[clamp(26px,4vw,38px)] leading-[1] tracking-[-0.04em]">
          {scored === 0 ? (
            <>
              {profile.displayName ?? `@${profile.username}`}{" "}
              <span className="font-serif italic text-mute">
                {calls.length > 0 ? "has calls on the record." : "hasn't called yet."}
              </span>
            </>
          ) : (
            <>
              <span className="num">{rep.wins}</span>–<span className="num">{rep.losses}</span>
              {rep.accuracyPct != null && (
                <span className="font-serif italic text-up"> · {rep.accuracyPct}% called right.</span>
              )}
            </>
          )}
        </h1>
      </div>

      <RecordStats rep={rep} openCount={openCount} self={false} />

      {calls.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-[15px] font-semibold mb-1.5">No calls on record.</div>
          <p className="text-mute text-[13px] max-w-[420px] mx-auto mb-6">
            Every story on the Wire shows Onside&apos;s Confidence % — that&apos;s the house. Make your own
            call and it locks now, scoring itself when the saga settles.
          </p>
          <Link href="/transfers">
            <Button kind="primary">Find a saga to call</Button>
          </Link>
        </Card>
      ) : (
        <CallLog calls={calls} self={false} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build and lint**

```bash
cd ~/onside-b2c && npm run build && npm run lint
```

Expected: both clean, and `/u/[username]` appears in the route list as a dynamic route.

- [ ] **Step 3: Verify the page in the browser**

Start the dev server via the preview tool (never `npm run dev` in Bash), then check two cases:
1. `/u/nobody` → renders the 404 page (nobody has a handle yet, so every handle is a miss until Task 9 claims one).
2. `/u/ADMIN` → also 404, confirming the lookup lowercases rather than erroring.

Read the console for errors; there should be none.

- [ ] **Step 4: Commit**

```bash
cd ~/onside-b2c && git add "src/app/(app)/u" && git commit -m "feat(profile): public profile at /u/[username]"
```

---

## Task 8: The profile OG card

The share artefact the virality study identified as the uncopyable viral asset. OG routes must never throw — fall back to a branded card (see `src/app/(app)/clubs/[id]/opengraph-image.tsx:11`).

**Files:**
- Create: `src/app/(app)/u/[username]/opengraph-image.tsx`

- [ ] **Step 1: Write the OG route**

Create `src/app/(app)/u/[username]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OG_CONTENT_TYPE, OgFrame, Eyebrow } from "@/lib/og";
import { getPublicProfile } from "@/lib/profiles/queries";
import { getReputation } from "@/lib/receipts/queries";

export const runtime = "nodejs";
export const alt = "Onside — transfer call record";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  // OG generation must never throw — fall back to the generic branded card.
  let handle: string | null = null;
  let wins = 0;
  let losses = 0;
  let accuracy: number | null = null;
  let streak = 0;

  try {
    const { username } = await params;
    const profile = await getPublicProfile(username);
    if (profile) {
      handle = profile.username;
      const rep = await getReputation(profile.id);
      wins = rep.wins;
      losses = rep.losses;
      accuracy = rep.accuracyPct;
      streak = rep.streak;
    }
  } catch {
    handle = null;
  }

  if (!handle) {
    return new ImageResponse(
      (
        <OgFrame>
          <Eyebrow>RECEIPTS</Eyebrow>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 16 }}>
            Every call, on the record.
          </div>
        </OgFrame>
      ),
      { ...OG_SIZE },
    );
  }

  const scored = wins + losses;

  return new ImageResponse(
    (
      <OgFrame>
        <Eyebrow>TRANSFER CALLS</Eyebrow>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginTop: 14,
            color: OG.white,
          }}
        >
          @{handle}
        </div>

        {scored === 0 ? (
          <div style={{ display: "flex", fontSize: 40, color: OG.mute, marginTop: 20 }}>
            Calls locked. Nothing settled yet.
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 28, marginTop: 24 }}>
            <div style={{ display: "flex", fontSize: 132, fontWeight: 800, letterSpacing: "-0.04em", color: OG.up, lineHeight: 1 }}>
              {wins}–{losses}
            </div>
            {accuracy != null && (
              <div style={{ display: "flex", fontSize: 44, color: OG.cream, paddingBottom: 14 }}>
                {accuracy}% called right
              </div>
            )}
          </div>
        )}

        {streak > 0 && (
          <div style={{ display: "flex", fontSize: 34, color: OG.acc, marginTop: 18 }}>
            {streak} in a row
          </div>
        )}
      </OgFrame>
    ),
    { ...OG_SIZE },
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd ~/onside-b2c && npm run build && npm run lint
```

Expected: both clean.

- [ ] **Step 3: Verify the card renders**

With the dev server running, open `/u/<a claimed handle>/opengraph-image` in the preview browser and confirm a 1200×630 card renders. Also open `/u/nobody/opengraph-image` and confirm it returns the fallback card rather than a 500 — every flex container needs an explicit `display: "flex"` under Satori, and a missing one is the usual cause of a blank card.

- [ ] **Step 4: Commit**

```bash
cd ~/onside-b2c && git add "src/app/(app)/u/[username]/opengraph-image.tsx" && git commit -m "feat(profile): OG share card for public profiles"
```

---

## Task 9: `/record` becomes "your profile, as others see it"

Same render, plus the handle claim and favourite club. This is also where the 31 existing profiles get prompted — in-app only, no unsolicited email.

**Files:**
- Modify: `src/app/(app)/record/page.tsx` (full rewrite)
- Create: `src/components/profile/ClaimHandle.tsx`
- Create: `src/components/profile/FavouriteClub.tsx`

- [ ] **Step 1: Create the claim form**

Create `src/components/profile/ClaimHandle.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { claimUsername, type ProfileActionState } from "@/lib/profiles/actions";

/**
 * The handle claim. Shown only to users who have not claimed one — a handle is
 * permanent, so there is no edit mode to fall back to.
 */
export function ClaimHandle() {
  const [state, formAction, pending] = useActionState<ProfileActionState, FormData>(claimUsername, {});

  if (state.ok && state.username) {
    return (
      <div className="mb-8 rounded-xl border border-line bg-ink-850 p-4 text-[13px]">
        Your public profile is live at{" "}
        <Link href={`/u/${state.username}`} className="text-acc hover:underline">
          /u/{state.username}
        </Link>
        .
      </div>
    );
  }

  return (
    <form action={formAction} className="mb-8 rounded-xl border border-line bg-ink-850 p-4">
      <div className="text-[13.5px] font-semibold mb-1">Claim your handle</div>
      <p className="text-[12.5px] text-mute mb-3">
        Your record is only an argument if someone can look it up. Pick a handle and this page becomes
        your public profile. It&apos;s permanent — shared links and cards have to keep working.
      </p>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg bg-ink-800 border border-line px-3 h-9">
          <span className="text-mute-soft text-[13px]">onsidemarket.com/u/</span>
          <input
            name="username"
            autoComplete="off"
            maxLength={20}
            placeholder="yourhandle"
            className="bg-transparent text-[13px] outline-none w-[130px] ml-0.5"
          />
        </div>
        <button
          disabled={pending}
          className="h-9 px-3.5 rounded-lg bg-acc text-ink-900 text-[12px] font-semibold disabled:opacity-60 cursor-pointer"
        >
          {pending ? "Claiming…" : "Claim"}
        </button>
      </div>
      {state.error && <div className="text-[12px] text-down mt-2">{state.error}</div>}
    </form>
  );
}
```

- [ ] **Step 2: Create the favourite club control**

Without this, `setFavouriteClub` from Task 5 has no caller and the profile header in Task 7 renders a club nobody can ever set. The club-page prompt the spec leans towards is still the acquisition path — this is the settings-shaped fallback that makes the field real today.

Create `src/components/profile/FavouriteClub.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { setFavouriteClub, type ProfileActionState } from "@/lib/profiles/actions";

/**
 * Favourite club — free text, matching the club names carried on rumours.
 *
 * Freely changeable, unlike the handle: nothing links to it, so there is no shared
 * artefact to break.
 */
export function FavouriteClub({ current }: { current: string | null }) {
  const [state, formAction, pending] = useActionState<ProfileActionState, FormData>(
    setFavouriteClub,
    {},
  );

  return (
    <form action={formAction} className="mb-8 flex items-center gap-2">
      <label htmlFor="favourite_club" className="text-[12px] text-mute-soft shrink-0">
        Your club
      </label>
      <input
        id="favourite_club"
        name="favourite_club"
        defaultValue={current ?? ""}
        maxLength={80}
        autoComplete="off"
        placeholder="e.g. Manchester United"
        className="h-9 px-3 rounded-lg bg-ink-800 border border-line text-[13px] outline-none focus:border-mute transition w-[220px]"
      />
      <button
        disabled={pending}
        className="h-9 px-3 rounded-lg border border-line text-[12px] font-semibold text-mute hover:text-fg disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state.ok && <span className="text-[12px] text-up">Saved</span>}
      {state.error && <span className="text-[12px] text-down">{state.error}</span>}
    </form>
  );
}
```

- [ ] **Step 3: Rewrite the record page**

Replace the entire contents of `src/app/(app)/record/page.tsx` with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { getSessionUser } from "@/lib/db/supabase-server";
import { getReputation, getCallsFor } from "@/lib/receipts/queries";
import { getMyProfileBasics } from "@/lib/profiles/queries";
import { RecordStats } from "@/components/profile/RecordStats";
import { CallLog } from "@/components/profile/CallLog";
import { ClaimHandle } from "@/components/profile/ClaimHandle";
import { FavouriteClub } from "@/components/profile/FavouriteClub";

// Personal, signed-in record — never cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your record — Onside",
  description:
    "Your public, auto-scored track record of transfer calls — wins, accuracy, streak, and every call you've made.",
};

function SignInPrompt() {
  return (
    <div className="max-w-[560px] mx-auto px-6 py-24 text-center">
      <h1 className="display text-[30px] mb-2">Your record</h1>
      <p className="text-mute mb-6">
        Sign in to make calls on transfer sagas and build a public, auto-scored track record — your
        receipts, settled when each saga does.
      </p>
      <Link href="/login">
        <Button kind="primary">Sign in</Button>
      </Link>
    </div>
  );
}

export default async function RecordPage() {
  const user = await getSessionUser().catch(() => null);
  if (!user) return <SignInPrompt />;

  const [rep, calls, me] = await Promise.all([
    getReputation(user.id),
    getCallsFor(user.id),
    getMyProfileBasics(user.id),
  ]);
  const { username, favouriteClub } = me;
  const openCount = calls.filter((c) => c.status === "open").length;
  const scored = rep.wins + rep.losses;

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">
          Your record
          {username && (
            <>
              <span className="text-mute-soft"> · </span>
              <Link href={`/u/${username}`} className="text-acc hover:underline">
                @{username}
              </Link>
            </>
          )}
        </div>
        <h1 className="display text-[clamp(26px,4vw,38px)] leading-[1] tracking-[-0.04em]">
          {scored === 0 ? (
            <>
              Your record <span className="font-serif italic text-mute">starts here.</span>
            </>
          ) : (
            <>
              <span className="num">{rep.wins}</span>–<span className="num">{rep.losses}</span>
              {rep.accuracyPct != null && (
                <span className="font-serif italic text-up"> · {rep.accuracyPct}% called right.</span>
              )}
            </>
          )}
        </h1>
      </div>

      {!username && <ClaimHandle />}
      <FavouriteClub current={favouriteClub} />

      <RecordStats rep={rep} openCount={openCount} self />

      {calls.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-[15px] font-semibold mb-1.5">No calls yet.</div>
          <p className="text-mute text-[13px] max-w-[420px] mx-auto mb-6">
            Every story on the Wire shows Onside&apos;s Confidence % — that&apos;s the house. Make your call
            on whether a deal happens; it locks now and scores itself when the saga settles.
          </p>
          <Link href="/transfers">
            <Button kind="primary">Find a saga to call</Button>
          </Link>
        </Card>
      ) : (
        <CallLog calls={calls} self />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify build and lint**

```bash
cd ~/onside-b2c && npm run build && npm run lint
```

Expected: both clean.

- [ ] **Step 5: Verify the claim flow end to end**

With the dev server running and signed in:
1. Visit `/record` — the claim form shows (0 handles exist).
2. Submit `admin` — expect "That handle is reserved."
3. Submit `ab` — expect "Handles are at least 3 characters."
4. Submit `Perez_99` — expect success, and the link to read `/u/perez_99` (normalized to lowercase).
5. Follow that link — the public profile renders with the same record.
6. Reload `/record` — the claim form is gone and the header links to the handle.
7. Set a favourite club, save, and reload `/u/<handle>` — the club shows in the profile header.

Confirm in the database that exactly one handle was written, lowercase, with the club attached:

```sql
select id, username, favourite_club from public.public_profiles;
```

- [ ] **Step 6: Commit**

```bash
cd ~/onside-b2c && git add "src/app/(app)/record/page.tsx" src/components/profile/ClaimHandle.tsx src/components/profile/FavouriteClub.tsx && git commit -m "feat(profile): /record renders the public profile, handle claim and favourite club"
```

---

## Task 10: Carry the author's identity into the thread

`getRumourComments` currently selects only the denormalised `author_name`. The receipt join needs `profile_id`.

**Files:**
- Modify: `src/lib/queries/rumours.ts:227-232` (`CommentItem`) and `:260-272` (`getRumourComments`)

- [ ] **Step 1: Extend the comment type**

In `src/lib/queries/rumours.ts`, replace the `CommentItem` interface at lines 227-232:

```ts
export interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  author: string;
}
```

with:

```ts
export interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  /** Denormalised display name captured at post time. */
  author: string;
  /** Author identity — the key the receipt join hangs off. */
  profileId: string;
}
```

- [ ] **Step 2: Select the author id**

Replace `getRumourComments` at lines 259-272 with:

```ts
/** Discussion thread for a rumour. `profileId` is what the receipt line joins on. */
export async function getRumourComments(rumourId: string): Promise<CommentItem[]> {
  const { data } = await readDb()
    .from("rumour_comments")
    .select("id,body,created_at,author_name,profile_id")
    .eq("rumour_id", rumourId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.created_at,
    author: c.author_name || "Member",
    profileId: c.profile_id,
  }));
}
```

- [ ] **Step 3: Verify build and lint**

```bash
cd ~/onside-b2c && npm run build && npm run lint
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
cd ~/onside-b2c && git add src/lib/queries/rumours.ts && git commit -m "feat(rumours): carry author profile id into comment items"
```

---

## Task 11: Receipts inside the argument

The cheapest item in the design and the one that carries the product.

**Files:**
- Modify: `src/components/transfers/discussion-thread.tsx`
- Modify: `src/app/(app)/transfers/[id]/page.tsx` (pass receipts to the thread)

- [ ] **Step 1: Render the receipt line**

In `src/components/transfers/discussion-thread.tsx`, add the import and receipt renderer. Replace the import block at lines 3-6:

```tsx
import { useActionState } from "react";
import Link from "next/link";
import { postComment, type CommentActionState } from "@/lib/rumours/actions";
import type { CommentItem } from "@/lib/queries/rumours";
```

with:

```tsx
import { useActionState } from "react";
import Link from "next/link";
import { postComment, type CommentActionState } from "@/lib/rumours/actions";
import type { CommentItem } from "@/lib/queries/rumours";
import type { AuthorReceipt } from "@/lib/profiles/queries";

const PICK_LABEL: Record<string, string> = {
  will: "WILL",
  wont: "WON'T",
  higher: "FEE HIGHER",
  lower: "FEE LOWER",
};

/**
 * One line under a comment author: what they called on THIS deal, what the house said
 * at the time, and their overall record.
 *
 * "No call on record" is deliberately shown rather than hidden — the spec's decision is
 * that anyone may comment but non-callers are marked. The tag is a stronger prompt to
 * call than a gate would be, because the reader feels it and the fix is one tap away.
 */
function Receipt({ r }: { r: AuthorReceipt | undefined }) {
  if (!r || !r.pick) {
    return <span className="text-[11px] text-mute-soft">No call on record</span>;
  }
  const scored = r.wins + r.losses;
  const date = r.lockedAt
    ? new Date(r.lockedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;
  return (
    <span className="text-[11px] text-mute-soft">
      <span className="text-up font-semibold">Called {PICK_LABEL[r.pick] ?? r.pick.toUpperCase()}</span>
      {r.houseConfidencePct != null && <span className="num"> · house said {r.houseConfidencePct}%</span>}
      {date && <span className="num"> · {date}</span>}
      {scored > 0 && (
        <span className="num">
          {" · "}
          {r.wins}–{r.losses}
          {r.accuracyPct != null && ` · ${r.accuracyPct}%`}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Accept receipts and render them**

In the same file, change the component signature from:

```tsx
export function DiscussionThread({
  rumourId,
  comments,
  signedIn,
}: {
  rumourId: string;
  comments: CommentItem[];
  signedIn: boolean;
}) {
```

to:

```tsx
export function DiscussionThread({
  rumourId,
  comments,
  signedIn,
  receipts,
}: {
  rumourId: string;
  comments: CommentItem[];
  signedIn: boolean;
  /** Author profile id -> their receipt on this deal. */
  receipts: Record<string, AuthorReceipt>;
}) {
```

Then replace the comment rendering block (the `comments.map(...)` body at lines 59-71) with:

```tsx
          {comments.map((c) => {
            const r = receipts[c.profileId];
            return (
              <div key={c.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-acc/15 text-acc grid place-items-center text-[11px] font-bold uppercase shrink-0">
                  {c.author.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[12px]">
                    {r?.username ? (
                      <Link href={`/u/${r.username}`} className="font-semibold hover:underline">
                        {c.author}
                      </Link>
                    ) : (
                      <span className="font-semibold">{c.author}</span>
                    )}
                    <span className="text-mute-soft num">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="mt-0.5">
                    <Receipt r={r} />
                  </div>
                  <p className="text-[13px] text-mute mt-1 leading-relaxed break-words">{c.body}</p>
                </div>
              </div>
            );
          })}
```

- [ ] **Step 3: Fetch receipts on the deal page**

In `src/app/(app)/transfers/[id]/page.tsx`, add the import after line 18 (`import { getMyOutcomeCall } ...`):

```tsx
import { getAuthorReceipts } from "@/lib/profiles/queries";
```

The comments are fetched in the `Promise.all` at lines 48-53. Immediately after that block closes (line 53), add:

```tsx
  // Sequential by necessity: the receipt join is keyed by the comment authors, so it
  // cannot join the Promise.all above. One extra round trip, three batched reads.
  const receipts = Object.fromEntries(
    await getAuthorReceipts(id, comments.map((c) => c.profileId)).catch(() => new Map()),
  );
```

Then at line 159, change:

```tsx
<DiscussionThread rumourId={id} comments={comments} signedIn={!!user} />
```

to:

```tsx
<DiscussionThread rumourId={id} comments={comments} signedIn={!!user} receipts={receipts} />
```

(A `Map` cannot cross the server/client boundary as a prop, hence `Object.fromEntries`. The `.catch` keeps a receipt-join failure from taking down the whole deal page — the thread degrades to "No call on record", which is a correct-looking state rather than a 500.)

- [ ] **Step 4: Verify build and lint**

```bash
cd ~/onside-b2c && npm run build && npm run lint
```

Expected: both clean.

- [ ] **Step 5: Verify in the browser**

With the dev server running, open the deal page carrying the existing comments. Confirm:
1. A commenter with no call shows "No call on record".
2. After making a call on that deal with the `CallChip` and reloading, the same author's line becomes "Called WILL · house said N% · <date>".
3. An author with a claimed handle links to `/u/<handle>`; one without is plain text and does not 404.

Read the console for errors; there should be none.

- [ ] **Step 6: Commit**

```bash
cd ~/onside-b2c && git add src/components/transfers/discussion-thread.tsx "src/app/(app)/transfers/[id]/page.tsx" && git commit -m "feat(community): receipts inside the discussion thread"
```

---

## Task 12: Full verification

- [ ] **Step 1: Run the whole suite**

```bash
cd ~/onside-b2c && npm test
```

Expected: all tests pass. Baseline before this plan was **49 files / 361 tests** (measured 2026-08-09), plus the handle tests added in Task 1.

- [ ] **Step 2: Build and lint clean**

```bash
cd ~/onside-b2c && npm run build && npm run lint
```

- [ ] **Step 3: Check the security advisors**

Run the Supabase MCP `get_advisors` tool with `project_id: ygmxxveranmfcobcexon` and `type: security`.

Expected: one `security_definer_view` notice for `public_profiles`. That one is intentional and documented in the migration — the view's column list is the security boundary, and `security_invoker` would make it return nothing to strangers.

Applying 0005 also produced a second, unintended finding: `function_search_path_mutable` on `profiles_block_username_change`. Migration `0006_function_search_path.sql` pins it (and the same pre-existing gap on `predictions_block_field_mutation` from 0003). **Apply 0006 at this gate**, then re-run the advisors and confirm zero `function_search_path_mutable` findings remain.

These are pre-existing and out of scope — do not be alarmed by them, and do not fix them here: `rls_enabled_no_policy` on `board_subscribers` and `pushed_goals`, and `auth_leaked_password_protection`. **Any finding beyond those, and beyond the expected `security_definer_view`, is a real problem** and must be fixed before this ships.

- [ ] **Step 4: Confirm no billing column is publicly reachable**

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='public_profiles';
```

Expected exactly five rows: `id`, `username`, `display_name`, `favourite_club`, `created_at`.

- [ ] **Step 5: Do not deploy**

Deployment is Perez's per-action call. Stop here and report what was built.

---

## Deferred, deliberately

- **Club page rebuild** (spec item 3) — its own plan. Open question 4 (minimum callers before a club board renders) belongs there, not here.
- **Favourite club capture *prompt*** — the column, the action and a settings-shaped control on `/record` ship here. The spec's leaning is to *also* prompt in context on first club-page visit, which is club-page work and belongs with item 3.
- **Reddit OAuth / post sync** — Phase 3, behind a ToS review.
- **Global leaderboards, DMs, following, favourite players** — out of scope per the spec.

## Risk the plan does not remove

The keystone page is being built for a population of **2 callers and 1 commenter**. Every surface here has an explicit empty state, and Task 11's "No call on record" is designed to convert rather than embarrass — but nothing in this plan manufactures a community. The first real test is whether claiming a handle on `/record` is compelling enough to move the other 29 profiles, and that is a copy-and-prompt problem worth revisiting once there is a week of data.
