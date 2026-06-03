# Onside B2C — Plan 02: Data Ingestion Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Pull real football data (leagues, clubs, players, season stats) from licensed sources into Supabase, on a schedule, with provenance and honest empty states.

**Architecture:** A pure normalizer (TDD) maps API-Football responses to our DB row shapes; a rate-limited fetch client pages through `/players?league&season`; a sync orchestrator upserts via the service-role `adminDb`; a Vercel Cron route triggers it. football-data.org + ASA are added as enrichment in later passes.

**Tech Stack:** API-Football (`x-apisports-key`, Pro 7,500/day), Supabase service-role client, Vercel Cron, Zod, Vitest.

**Note on granularity:** This plan is written at task level (not every bite-sized step) because it is being self-executed under deadline. The correctness-critical normalizer gets full TDD; fetch/sync are integration code verified against fixtures and a live dry-run.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/ingest/leagues.ts` | League config (id, season, name, slug, country) + the launch subset |
| `src/lib/ingest/normalize.ts` | Pure transforms: API-Football response to player/club/stat rows (TDD) |
| `src/lib/ingest/normalize.test.ts` | Unit tests against a recorded fixture |
| `src/lib/ingest/__fixtures__/players-sample.json` | Real recorded `/players` response slice |
| `src/lib/ingest/api-football.ts` | Rate-limited fetch client + `fetchAllPlayers(leagueId, season)` |
| `src/lib/ingest/sync.ts` | Orchestrator: leagues to clubs/players/stats, slug de-dup, batched upserts, summary |
| `src/app/api/cron/sync/route.ts` | Vercel Cron entry (Bearer CRON_SECRET) |
| `vercel.json` | Cron schedule (daily) |

## Tasks

### Task 1 — League config
Port `API_FOOTBALL_LEAGUES` from B2B (PL 39, BL1 78, PD 140, SA 135, FL1 61 @2025; MLS 253, Brasileiro 71 @2026; plus Eredivisie 88, Primeira 94, Championship 40, Saudi 307, Liga MX 262, Argentina 128 @2025). Export `LEAGUES` (full) and `LAUNCH_LEAGUES` (the subset to sync at launch). Each: `{ apiId, season, name, slug, country }`.

### Task 2 — Normalizer (TDD)
`normalizePosition` (Goalkeeper to GK, Defender to DEF, Midfielder to MID, Attacker to FWD, default MID), `pickLeagueStat` (entry matching swept league, else max minutes), `per90`, `fullName`, `normalizePlayer(raw, leagueId)` returning `{ player, club, stat }` insert rows. Write tests first against the recorded fixture, run red, implement, run green.

### Task 3 — Fetch client
`apiFetch(endpoint, params)` with `x-apisports-key` from `serverEnv()`, in-process rate counters (conservative: 400/min, 7,000/day), exponential backoff on 429/5xx, returns `{ response, paging }`. `fetchAllPlayers(leagueId, season)` pages until `paging.current >= paging.total`. No external cache (single job run).

### Task 4 — Sync orchestrator
`syncLeague(db, league)`: upsert league row, `fetchAllPlayers`, normalize, de-dup club + player slugs (append `-id` on collision), batched upsert (chunks of 500) into clubs, players, player_stats. `syncAll(db, leagues = LAUNCH_LEAGUES)` loops, returns `{ leagues, clubs, players, errors }`. Recompute `clubs.squad_value` after valuations (Plan 03), not here.

### Task 5 — Cron route + schedule
`GET /api/cron/sync` guarded by `Authorization: Bearer ${CRON_SECRET}`; runs `syncAll(adminDb())`; returns the summary JSON. `vercel.json` runs it daily at 05:00 UTC. Add `CRON_SECRET` to env.

### Task 6 — Live dry-run + verify
With the service-role key set, run the sync against the live DB for one league first (`syncLeague` PL), verify rows via `list_tables`/`execute_sql count`, then run the full launch set. Confirm provenance (`data_source='api-football'`) and that `xg` stays null (honest "limited data").

## Verification
- Normalizer unit tests green (positions, p90 math, league pick, slug).
- One-league dry-run inserts ~600 players with stats; no nulls in required columns.
- `select count(*)` on players, clubs, player_stats is non-zero and sane.
- `npm run build` + `npx tsc --noEmit` pass.
