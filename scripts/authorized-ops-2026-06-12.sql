-- AUTHORIZED OPS BUNDLE — 2026-06-12
-- Staged by Claude; run only on Perez's explicit go, AFTER deploying the branch
-- (the live 5-min ingest cron must be on the new matcher before cleanup, or it
-- can re-create deleted phantoms from still-fresh feed items).
--
-- Order: 1) deploy  2) section A  3) section B  4) section C (apply_migration)
--        5) npm run sync:transfers  (flips Senesi via official record sm-569234)

-- ============================================================================
-- A. WIRE CLEANUP — phantom destinations + audited junk (2026-06-12 audit)
-- ============================================================================

-- A1. Park the Anderson junk-row URLs on the real →Man City saga first
--     (durable dedup, belt and braces against re-ingest).
insert into rumour_sources (url, rumour_id, source, tier)
select r.url, '0e32f170-424c-4d2c-adf5-68719c66e124', r.primary_source, r.source_tier
from rumours r
where r.id in (
  '5a5b202f-7d20-472e-aa58-4794ac36fc38', -- Anderson → "New England Revolution" (LIVE phantom)
  '37128a44-065a-4b66-bc8c-e0ac0fa00041', -- Anderson → "RED Star FC 93" (candidate)
  'e5005d74-94ae-484f-8e82-ff061d77b16b'  -- Anderson → Liverpool fan-angle (candidate)
) and r.url is not null
on conflict (url) do nothing;

-- A2. Delete the junk rows (3 live phantoms + audited candidate noise; each
--     verified against its summary in the audit).
with junk(id) as (values
  ('5a5b202f-7d20-472e-aa58-4794ac36fc38'), -- LIVE: Anderson → NE Revolution ("England mainstay")
  ('0dae279a-5b86-4b1a-93a1-3f6f73fd3c01'), -- LIVE: James Trafford ← "Old Trafford" stadium
  ('7455ce92-f458-4311-b9cd-a77c576687bd'), -- LIVE: Rashford Barcelona→Barcelona self-loop
  ('37128a44-065a-4b66-bc8c-e0ac0fa00041'), -- Anderson → RED Star ("Real Madrid star")
  ('e5005d74-94ae-484f-8e82-ff061d77b16b'), -- Anderson → Liverpool fan-angle
  ('20fa0d9c-8270-4920-a571-878d28352053'), -- Goretzka → club "Leon" (token)
  ('ad4d8cc5-17bb-4465-8e59-55fba3b0edbd'), -- Lewis Hall → NE Revolution
  ('917fef5d-f10d-4b1e-92c8-507c29111a3e'), -- D. Schmid → Austria Vienna ("move to Austria")
  ('a453ac9f-4287-4766-a8f0-9720653f1bf7'), -- Cucurella → RED Star ("£35m star")
  ('4d6f2ca1-ac29-4752-b3ac-04e41cbd9419'), -- "God Power" ← "star power" headline
  ('74121ca5-e5a1-4e97-80d1-564bd19a013a'), -- Waldo Madrid → San Jose ("Jose Mourinho")
  ('431fac65-2747-44ad-95bf-56818ee7a97b'), -- Waldo Madrid → GO Ahead Eagles ("Super Eagles")
  ('e360168e-54ba-4aad-a23e-8dc50758cac2'), -- "Surprise" Manthosi ← "surprise transfer message"
  ('48f2390c-6917-4d2e-9ecf-32c0faadd4d5'), -- Aston Oxborough ← "Aston Villa" headline
  ('4433cefb-61eb-4487-a3a2-2233afe1e8bb'), -- Unai Bilbao ← Arsenal/Alvarez headline
  ('290b3320-d3da-4ed1-8d52-08219af66eab'), -- Calixte Ligue ← "Ligue 1"
  ('a1e402a8-21ef-43ce-bac5-8620835254b3'), -- Calixte Ligue ← "Ligue 1" (2nd)
  ('962a9d2e-deea-4972-867f-85593f3aee65'), -- Robert Holding ← "'holding out'"
  ('5f1e911a-15f9-41c7-b673-eb694348573c'), -- Genino Palace ← "Crystal Palace" (1)
  ('e673ef33-aef5-4386-9ec4-d8fac026cdc2'), -- Genino Palace ← "Crystal Palace" (2)
  ('9c8b8294-0eb9-4dd0-96b1-e24cadce9bbb'), -- Castro Sevilla ← "Sevilla's Llorente"
  ('23e78b18-6b3f-4b22-b89a-5cc908311cbb'), -- Manuel Mónaco ← "AS Monaco"
  ('577e7251-de41-4666-95e3-5c80ccfe310d'), -- Harry French ← "French striker"
  ('04358178-54e8-46ee-9fc5-64ef5818c621'), -- player Ronald Koeman ← coach story
  ('68af6dbb-786f-4a00-943b-b19a40a4b90b'), -- Chase Adams ← "transfer chase"
  ('b69e15a3-c6e4-4d9a-81bc-afea732e3d60'), -- Law McCabe ← Katie McCabe story
  ('37e040b8-b9cb-40c9-b34a-82c855a3f84e'), -- Gorosabel ← Iraola headline
  ('d203c53b-c1af-48a0-be7b-8b681494db9d'), -- B. Davies ← Wyness/Nygren story
  ('9fbe59f0-4c7b-4369-8b34-fa7087316f0f'), -- Cengiz Ünder ← "medical team under Flick"
  ('b79757d8-5280-473c-8fc0-916cca36adbb'), -- Manhoef ← "20 million apart" (Gordon)
  ('9f8da4dc-5dcd-4706-8396-bb22c1b86c3e'), -- Pape Diop ← 2011 Demba Ba resurfaced item
  ('095daf78-040f-4ef4-b52e-d76c93b4fc8c'), -- Altimira ← Sergi Canos story
  ('d2ad38bf-5eea-4beb-a88b-a5eee615cdf7'), -- Mathys Tel ← Mathys Detourbet story
  ('16aab109-4cb0-47b7-b142-19af3495ccad'), -- Dønnum ← Prescott story
  ('cd078a29-2aaf-41ac-a1b3-c4ec18384131'), -- Dani Pérez ← "Florentino Perez confirms"
  ('8c41371d-293c-4012-94a5-113ecb8883f8'), -- Dragsnes ← "Spain winger Munoz"
  ('39e64e87-6e5c-4762-a1e1-8bcbe8c968c1'), -- Dragsnes ← "World Cup winger"
  ('914e4999-39c5-438b-95bb-7fd6fed51e91'), -- Palmer ← reddit garbage source
  ('f980fb63-4b87-4ff7-9c00-95e1a4d79d12')  -- Preston Judd ← Boy Kemper item
)
, gone_sources as (
  delete from rumour_sources where rumour_id in (select id from junk)
    and url not in (select url from rumour_sources where rumour_id = '0e32f170-424c-4d2c-adf5-68719c66e124')
  returning 1
)
delete from rumours where id in (select id from junk);

-- ============================================================================
-- B. PHOTO INTEGRITY — 122 players whose ID-keyed CDN URL carries the WRONG id
--    (the Enzo Fernández class: id 5996 pointing at players/413143.png)
-- ============================================================================
update players
set photo_url = 'https://media.api-sports.io/football/players/' || id || '.png'
where photo_url like 'https://media.api-sports.io/football/players/%'
  and photo_url <> 'https://media.api-sports.io/football/players/' || id || '.png';

-- ============================================================================
-- C. ACCOUNTS AT SCALE — apply as migration `auth_perf_at_scale`
--    (advisor findings 2026-06-12: per-row auth.uid() re-evaluation + unindexed
--    hot FKs — the backend setup for new accounts as the site gets popular)
-- ============================================================================
alter policy "own profile" on public.profiles
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy "own watchlist" on public.watchlist_items
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
alter policy "own alerts" on public.alerts
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
alter policy "own notifs" on public.notifications
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
alter policy "own comment insert" on public.rumour_comments
  with check ((select auth.uid()) = profile_id);
alter policy "own comment delete" on public.rumour_comments
  using ((select auth.uid()) = profile_id);

create index if not exists watchlist_items_player_idx on public.watchlist_items (player_id);
create index if not exists alerts_profile_idx on public.alerts (profile_id);
create index if not exists alerts_player_idx on public.alerts (player_id);
create index if not exists rumour_comments_profile_idx on public.rumour_comments (profile_id);
create index if not exists board_subscribers_profile_idx on public.board_subscribers (profile_id);
create index if not exists transfers_from_club_idx on public.transfers (from_club_id);
create index if not exists transfers_to_club_idx on public.transfers (to_club_id);
create index if not exists league_standings_club_idx on public.league_standings (club_id);
create index if not exists nt_squads_player_idx on public.national_team_squads (player_id);
