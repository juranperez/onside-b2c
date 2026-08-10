-- Community v1 — public profiles.
-- NOT YET APPLIED. Apply to prod (ygmxxveranmfcobcexon) via Supabase MCP on Perez's
-- per-action authorization. Spec: docs/superpowers/specs/2026-08-08-community-receipts-design.md

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
create or replace view public.public_profiles as
  select id, username, display_name, favourite_club, created_at
  from public.profiles
  where username is not null;

grant select on public.public_profiles to anon, authenticated;
