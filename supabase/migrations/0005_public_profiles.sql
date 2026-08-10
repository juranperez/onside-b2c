-- Community v1 — public profiles.
-- NOT YET APPLIED. Apply to prod (ygmxxveranmfcobcexon) via Supabase MCP on Perez's
-- per-action authorization. Spec: docs/superpowers/specs/2026-08-08-community-receipts-design.md
--
-- No explicit begin/commit wrapper here: this migration is applied through Supabase's
-- apply_migration, which may already run the statement batch inside its own transaction.
-- A nested BEGIN only warns, but the inner COMMIT would end that outer transaction early
-- — and every `drop ... if exists` below is a no-op on first apply anyway, so there is no
-- real partial-failure window here for a wrapper to protect against. Do not add one back.
--
-- rollback (only if this must be reversed after applying — read before running):
--   drop trigger if exists profiles_username_permanent on public.profiles;
--   drop function if exists public.profiles_block_username_change();
--   drop view if exists public.public_profiles;
--   alter table public.profiles drop constraint if exists profiles_favourite_club_len;
--   alter table public.profiles drop constraint if exists profiles_username_format;
--   drop index if exists public.profiles_username_lower_key;
--   -- DESTROYS DATA — any favourite_club values written since apply are gone. Confirm
--   -- with Perez before running; every other rollback line above is non-destructive.
--   alter table public.profiles drop column if exists favourite_club;

-- Favourite club is load-bearing, not decoration: it powers the club leaderboard and
-- "your club's window" in the next plan, and it is the tribal-identity hook that drives
-- return visits. Free text to match rumours.to_club; deliberately no FK, because clubs
-- are keyed by slug elsewhere and a hard reference would break on renames.
alter table public.profiles add column if not exists favourite_club text;

-- Client-settable and rendered publicly next to a handle, so bound it. 80 matches the
-- .slice(0, 80) in the Task 5 claim action — keep the two in sync, or a save that relies
-- on the app-side truncation will 23514 against this instead of just being trimmed.
alter table public.profiles drop constraint if exists profiles_favourite_club_len;
alter table public.profiles add constraint profiles_favourite_club_len
  check (favourite_club is null or length(favourite_club) <= 80);

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

-- Belt under those braces: RLS alone does not block a same-user rename (the "own
-- profile" policy is FOR ALL USING (auth.uid() = id)) — what actually blocks it today
-- is that authenticated has no UPDATE grant on profiles, and anon is blocked by RLS.
-- But grants and RLS both protect only the browser key. Task 5's claim action runs on
-- the service-role client, which bypasses RLS and grants alike, so it is the one path
-- that could still rename a claimed handle through a future bug. "Permanent" only means
-- something if the database enforces it against every writer, not just the untrusted
-- one. Mirrors predictions_block_field_mutation in 0003_receipts.sql.
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
-- DROP + CREATE, not CREATE OR REPLACE: a replace can only ever append columns to an
-- existing view, so the first future migration that needs to drop or reorder one would
-- fail with "cannot drop columns from view". Nothing depends on this view yet — it does
-- not exist in prod — so the drop needs no CASCADE. The usual reason to prefer REPLACE,
-- that it preserves grants across a redefinition, does not apply here: the grants are
-- set explicitly below on every apply, regardless of how the view was (re)created.
drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, username, display_name, favourite_club, created_at
  from public.profiles
  where username is not null;

-- The grant below does NOT establish this view's privileges — GRANT only ever adds to
-- whatever a role already has. Supabase's default ACL for schema public (pg_default_acl,
-- objtype 'r', which covers views as well as tables) hands anon and authenticated
-- arwdDxtm on every new relation — full INSERT/UPDATE/DELETE/TRUNCATE, not just SELECT.
-- This view has no RLS of its own, is auto-updatable (one FROM entry, plain column
-- references, no DISTINCT/GROUP BY/aggregate/window/set-op/LIMIT), and runs as its
-- owner (postgres), who bypasses RLS on profiles because relforcerowsecurity is false.
-- Skip the revoke and `delete from public.public_profiles` — reachable with the
-- publishable key that ships in the browser bundle — rewrites into a delete on profiles
-- and cascades through eight ON DELETE CASCADE foreign keys (predictions, reputation,
-- rumour_comments, rumour_follows, push_subscriptions, watchlist_items, alerts,
-- notifications): the entire receipts-and-reputation corpus, gone. The column list above
-- bounds SELECT; it does nothing for DELETE. This revoke is the actual boundary.
-- service_role is left alone deliberately — that is the trusted server key.
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
