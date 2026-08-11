-- Receipts & Reputation v1 (TRANSFER-ONLY; fixtures cut 2026-06-16).
-- NOT YET APPLIED — apply to prod (ygmxxveranmfcobcexon) via Supabase MCP on Perez's
-- per-action authorization. Spec: docs/superpowers/specs/2026-06-15-receipts-reputation-design.md

-- predictions: one public, auto-scored call per user per subject per call_type.
-- All WRITES are service-role only (the server-authoritative lock recomputes the house snapshot;
-- client values are never trusted) — so there is intentionally NO authenticated write policy.
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_type text not null default 'transfer_saga' check (subject_type = 'transfer_saga'), -- fixtures cut in v1
  subject_id text not null,                       -- rumour id (polymorphic text key, validated in app)
  call_type text not null check (call_type in ('outcome', 'fee')),
  pick text not null check (pick in ('will', 'wont', 'higher', 'lower')),
  house_confidence_pct int,                       -- Onside Confidence % snapshot at lock (outcome calls)
  house_value_eur bigint,                         -- Onside value (EUR) snapshot at lock (fee calls)
  earliness real not null default 0,              -- 0..1 from saga stage at lock
  status text not null default 'open' check (status in ('open', 'won', 'lost', 'push', 'void')),
  points int not null default 0,
  locked_at timestamptz not null default now(),
  resolved_at timestamptz,
  -- one call per user per subject per call_type: blocks calling both sides / flip-flopping.
  unique (user_id, subject_type, subject_id, call_type)
);
-- resolver scan: open predictions for a just-resolved subject.
create index if not exists predictions_subject_idx on public.predictions (subject_type, subject_id, status);
-- hub / per-user reads.
create index if not exists predictions_user_idx on public.predictions (user_id, status);

alter table public.predictions enable row level security;
-- Receipts are public; all writes are service-role only (server actions). No authenticated write policy.
create policy "predictions readable" on public.predictions for select using (true);

-- Append-only integrity: even the service-role resolver may only change status/points/resolved_at.
-- The user-supplied columns + the house snapshot are frozen at lock (a receipt is worthless if a
-- losing call can be edited/backdated).
create or replace function public.predictions_block_field_mutation()
returns trigger language plpgsql as $$
begin
  if (new.user_id is distinct from old.user_id
      or new.subject_type is distinct from old.subject_type
      or new.subject_id is distinct from old.subject_id
      or new.call_type is distinct from old.call_type
      or new.pick is distinct from old.pick
      or new.house_confidence_pct is distinct from old.house_confidence_pct
      or new.house_value_eur is distinct from old.house_value_eur
      or new.earliness is distinct from old.earliness
      or new.locked_at is distinct from old.locked_at) then
    raise exception 'predictions: locked columns are immutable (only status/points/resolved_at may change)';
  end if;
  return new;
end;
$$;
create trigger predictions_immutable before update on public.predictions
  for each row execute function public.predictions_block_field_mutation();

-- reputation: per-user rollup (recomputed by the resolver after each resolution). Public read.
create table if not exists public.reputation (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  wins int not null default 0,
  losses int not null default 0,
  pushes int not null default 0,            -- push + void (neutral)
  accuracy_pct int,                         -- wins/(wins+losses)*100, null if none scored
  streak int not null default 0,
  rank_score int,                           -- null = unranked (below the volume floor)
  scout_badge boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.reputation enable row level security;
create policy "reputation readable" on public.reputation for select using (true); -- writes service-role only
