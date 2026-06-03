-- Onside B2C initial schema: football data + valuations + user data.
create extension if not exists pgcrypto;

-- ============ FOOTBALL ============
create table leagues (
  id            text primary key,          -- provider id (string-safe)
  slug          text unique not null,
  name          text not null,
  country       text,
  tier          int,
  season        int,
  total_value   bigint default 0,
  club_count    int default 0,
  data_source   text,
  fetched_at    timestamptz default now()
);

create table managers (
  id            text primary key,
  name          text not null,
  nationality   text,
  age           int,
  tenure_start  date,
  data_source   text,
  fetched_at    timestamptz default now()
);

create table clubs (
  id              text primary key,
  slug            text unique not null,
  name            text not null,
  short_name      text,
  league_id       text references leagues(id) on delete set null,
  country         text,
  primary_color   text,
  secondary_color text,
  stadium         text,
  manager_id      text references managers(id) on delete set null,
  squad_value     bigint default 0,
  founded         int,
  data_source     text,
  fetched_at      timestamptz default now()
);
create index clubs_league_idx on clubs(league_id);

create table players (
  id           text primary key,
  slug         text unique not null,
  name         text not null,
  position     text,                       -- GK/DEF/MID/FWD (normalized)
  detailed_pos text,                        -- ST/AM/CB etc.
  age          int,
  dob          date,
  nationality  text,
  club_id      text references clubs(id) on delete set null,
  height_cm    int,
  foot         text,
  shirt_no     int,
  data_source  text,
  fetched_at   timestamptz default now()
);
create index players_club_idx on players(club_id);

create table player_stats (
  player_id    text references players(id) on delete cascade,
  season       int not null,
  apps         int default 0,
  minutes      int default 0,
  goals        int default 0,
  assists      int default 0,
  goals_p90    real,
  assists_p90  real,
  xg           real,                        -- nullable: honest "limited data"
  xa           real,
  rating       real,
  data_source  text,
  fetched_at   timestamptz default now(),
  primary key (player_id, season)
);

create table fixtures (
  id           text primary key,
  competition  text,
  home_id      text references clubs(id) on delete set null,
  away_id      text references clubs(id) on delete set null,
  kickoff      timestamptz,
  status       text,                        -- scheduled/live/finished
  score_home   int,
  score_away   int,
  data_source  text,
  fetched_at   timestamptz default now()
);

create table transfers (
  id           text primary key,
  player_id    text references players(id) on delete set null,
  from_club_id text references clubs(id) on delete set null,
  to_club_id   text references clubs(id) on delete set null,
  fee          bigint,
  type         text,                        -- transfer/loan/free
  status       text,                        -- confirmed/rumored/official
  confidence   int,                         -- 0-100 for rumors
  date         date,
  source       text,
  data_source  text,
  fetched_at   timestamptz default now()
);
create index transfers_player_idx on transfers(player_id);

create table national_teams (
  id            text primary key,
  slug          text unique not null,
  name          text not null,
  confederation text,
  fifa_rank     int,
  group_letter  text,
  manager_id    text references managers(id) on delete set null,
  squad_value   bigint default 0,
  data_source   text,
  fetched_at    timestamptz default now()
);

create table national_team_squads (
  national_team_id text references national_teams(id) on delete cascade,
  player_id        text references players(id) on delete cascade,
  caps             int,
  primary key (national_team_id, player_id)
);

-- ============ VALUATIONS ============
create table player_valuations (
  player_id      text primary key references players(id) on delete cascade,
  value_eur      bigint not null,
  pillar_scores  jsonb not null default '{}',
  confidence_pct int not null default 50,
  band_low       bigint not null,
  band_high      bigint not null,
  model_version  text not null,
  computed_at    timestamptz default now()
);

create table valuation_history (
  player_id  text references players(id) on delete cascade,
  date       date not null,
  value_eur  bigint not null,
  primary key (player_id, date)
);
create index valhist_player_date_idx on valuation_history(player_id, date desc);

-- ============ USER ============
create table profiles (
  id           uuid primary key,            -- == auth.users.id
  username     text unique,
  display_name text,
  tier         text not null default 'free' check (tier in ('free','plus','pro')),
  created_at   timestamptz default now()
);

create table watchlist_items (
  profile_id      uuid references profiles(id) on delete cascade,
  player_id       text references players(id) on delete cascade,
  alert_threshold bigint,
  added_at        timestamptz default now(),
  primary key (profile_id, player_id)
);

create table alerts (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  player_id  text references players(id) on delete cascade,
  type       text not null,                 -- price_cross/rumor/injury
  condition  jsonb not null default '{}',
  active     boolean not null default true,
  created_at timestamptz default now()
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}',
  read       boolean not null default false,
  created_at timestamptz default now()
);
create index notifications_profile_idx on notifications(profile_id, created_at desc);

-- ============ RLS ============
-- Football + valuation tables are public-read (writes only via service-role key,
-- which bypasses RLS). User tables: RLS on, owner-only access.
alter table profiles        enable row level security;
alter table watchlist_items enable row level security;
alter table alerts          enable row level security;
alter table notifications   enable row level security;

create policy "own profile"   on profiles        for all using (auth.uid() = id)         with check (auth.uid() = id);
create policy "own watchlist" on watchlist_items for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "own alerts"    on alerts          for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "own notifs"    on notifications   for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
