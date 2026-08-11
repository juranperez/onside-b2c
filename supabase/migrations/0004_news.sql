-- Onside News: automated data-backed transfer briefings.
-- Published briefings are public reading material; only the service role writes
-- them (generation runs in a cron with the service key, never from a client).

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  rumour_id uuid references public.rumours(id) on delete set null,
  -- players.id is TEXT (upstream provider ids), not uuid — match it exactly.
  player_id text references public.players(id) on delete set null,
  -- break | stage_advance | fee_divergence | confidence_swing | confirmed | dead
  event_type text not null,
  -- Stateless dedup key from src/lib/news/events.ts — one article per saga+angle.
  event_key text not null unique,
  title text not null,
  dek text not null,
  body jsonb not null,
  status text not null default 'published',
  -- Set when a saga later collapses: the article keeps its URL and gains a
  -- visible correction banner rather than being silently deleted.
  correction text,
  newsworthiness real not null default 0,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_articles_published_idx on public.news_articles (published_at desc);
create index if not exists news_articles_rumour_idx on public.news_articles (rumour_id);

alter table public.news_articles enable row level security;

drop policy if exists "news readable by anyone" on public.news_articles;
create policy "news readable by anyone" on public.news_articles for select using (true);
