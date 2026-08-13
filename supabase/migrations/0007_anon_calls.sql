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
