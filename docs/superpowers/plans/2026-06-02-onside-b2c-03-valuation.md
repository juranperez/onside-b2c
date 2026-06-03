# Onside B2C — Plan 03: Onside Valuation Engine

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Turn real player attributes/stats into a defensible euro valuation (with confidence band and pillar breakdown) that moves believably day to day. This is the product's core differentiator versus Transfermarkt.

**Architecture:** A pure, deterministic `model.ts` maps a player's real inputs to a valuation; a deterministic `pulse.ts` produces daily movement (mean-reverting walk + event jumps, seeded by player id + date) so values move without live match data; a `compute.ts` orchestrator reads players/stats from Supabase, writes `player_valuations` + seeds `valuation_history`, and recomputes club/league aggregates. A daily cron runs the pulse + history snapshot. Everything is labeled a model estimate (confidence tied to data completeness) and explained on a public `/methodology` page (built in Plan 04).

**Tech Stack:** Pure TypeScript (no deps), Supabase service-role for the compute job, Vercel Cron, Vitest (heavy TDD).

---

## The Model (model.ts)

Inputs we actually have from ingestion: `position` (GK/DEF/MID/FWD), `age`, `leagueSlug`, `minutes`, `goals`, `assists`, `rating`. Contract years are NOT available from the players endpoint, so the contract factor is neutral (1.0) and its absence widens the confidence band (honest).

```
score (0-100) = weighted blend of:
  performance (rating-derived, 6.0..8.0 -> 25..95)
  output      (position-adjusted goals+assists per 90; weighted up for FWD/MID)
  involvement (minutes played, durability proxy)
  prestige    (small league-quality nudge)
value_eur = BASE[pos] * LEAGUE_Q[league] * exp(0.045*(score-50)) * ageMult(age,pos) * contractMult
```

- `BASE`: GK 10M, DEF 16M, MID 20M, FWD 24M (anchors so a median top-5 player lands ~€25-40M, elite ~€150-200M).
- `LEAGUE_Q`: EPL 1.00, La Liga 0.95, Bundesliga 0.92, Serie A 0.90, Ligue 1 0.78, Eredivisie 0.62, Primeira 0.58, Brasileirao 0.55, Championship 0.52, Super Lig 0.50, Saudi 0.48, Primera (ARG) 0.46, Liga MX 0.42, MLS 0.42, default 0.45.
- `ageMult`: parabolic peak per position (FWD ~25, MID ~26, DEF ~27, GK ~29), range ~0.30..1.15; young players keep value via upside, older decline.
- Output: `value_eur` clamped to [€250k, €250M]; `pillar_scores` JSONB stores the named sub-scores; `confidence_pct` from data completeness (minutes/rating/age present); band = value * (1 +/- f) where f in [0.12, 0.45] (narrow when data complete, wide when sparse).

**Tests:** monotonic in score; EPL > Ligue 1 at equal score; peak-age > age-35 at equal inputs; clamps hold; zero-minutes player gets low confidence + wide band; bands ordered low < value < high; deterministic (same input, same output).

## The Pulse (pulse.ts)

`valueOnDay(modelValue, playerId, dayEpoch, events?)`: deterministic. Hash(playerId, dayEpoch) -> pseudo-random daily return in roughly +/-0.8%, plus mean-reversion toward `modelValue`, plus optional event jumps (goal +0.5..2%, injury -3..8%, transfer rumor +/-2..5%, national-team result +/-1..3%). Daily |change| capped at 10%. `seriesFor(modelValue, playerId, fromDay, toDay)` builds a history array; `moversBetween(...)` returns top absolute deltas.

**Tests:** deterministic for a fixed seed; never exceeds the daily cap; reverts toward model value over a long horizon (no runaway drift); series length correct.

## Compute orchestrator (compute.ts)

`computeAll(db)`: page players + latest `player_stats`, run `valuePlayer`, upsert `player_valuations`, seed `valuation_history` for the last N days via the pulse (so charts + movers have data immediately), then recompute `clubs.squad_value` (sum of squad valuations) and `leagues.total_value`. `runDailyPulse(db)`: append today's `valuation_history` row per player and refresh `player_valuations.value_eur` to today's pulse value.

## Cron + scripts

- `GET /api/cron/valuations` (CRON_SECRET guard): runs `runDailyPulse`. Daily 06:00 UTC in `vercel.json`. This is the daily "values move" engine (DB-only, fast, fits time limits).
- `scripts/value.ts` (`npm run value`): local one-shot `computeAll` for the initial valuation + history seed after the data sync.

## Verification
- `model.test.ts` + `pulse.test.ts` green (TDD).
- After `npm run sync` + `npm run value`: `player_valuations` populated for all players; `valuation_history` has ~90 days/player; club squad_value and league total_value non-zero and sane; spot-check a few stars land in believable ranges.
- `npm run build` + `tsc` pass.
