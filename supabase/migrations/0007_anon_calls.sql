-- Community v2 — anonymous calls.
-- NOT YET APPLIED. Apply to prod (ygmxxveranmfcobcexon) via Supabase MCP on Perez's
-- per-action authorization. Spec: docs/superpowers/specs/2026-08-12-community-front-door-design.md
--
-- rollback: drop table if exists public.anon_calls;   -- DESTROYS unclaimed visitor calls

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

-- The claim path reads every row for one session.
create index if not exists anon_calls_session_idx on public.anon_calls (session_id);

-- RLS on with NO policy at all: unclaimed calls are private by construction, which is
-- what makes "invisible until claimed" enforceable rather than merely intended. Every
-- read and write goes through the service-role client in server actions.
alter table public.anon_calls enable row level security;

-- Housekeeping: a session cookie lives 90 days, so anything older can never be claimed.
-- Not scheduled here — run manually or wire to a cron if the table ever grows.
-- delete from public.anon_calls where locked_at < now() - interval '90 days';
