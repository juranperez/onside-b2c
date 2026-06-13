-- Web push (goal-push + future Here We Go user-pushes).
-- Applied to prod (ygmxxveranmfcobcexon) 2026-06-13 via Supabase MCP on Perez's authorization.

-- push_subscriptions: one row per browser push endpoint, owned by a profile.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
-- Owner can manage their own subscriptions; service role (cron) bypasses RLS.
create policy "own subs" on public.push_subscriptions
  for all using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);

-- pushed_goals: dedup ledger so a goal is pushed at most once.
create table if not exists public.pushed_goals (
  signature text primary key, -- fixtureId:scorerId:minute
  pushed_at timestamptz not null default now()
);
alter table public.pushed_goals enable row level security; -- no public policies; service-role only
