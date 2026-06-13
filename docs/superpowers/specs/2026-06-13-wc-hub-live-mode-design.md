# WC hub — live-tournament-mode restructure — design

**Date:** 2026-06-13
**Status:** Approved design, pending implementation plan. Repo `~/onside-b2c`, branch `feat/sportmonks-integration`.
**Scope:** Make the `/worldcup` hub reflect that the tournament is LIVE — kill the dead countdown, lead with the current matchday's fixtures + per-fixture "players to watch", reorder CTAs, and add breadcrumbs to the WC subpages. Backlog source: `docs/superpowers/notes/2026-06-13-wc-hub-live-mode-backlog.md`.

## Problem

It's Matchday 1 (opener was June 11) but the hub still shows "0 DAYS TO KICKOFF" and a "Kicks off 11 June 2026" pill — stale, and it buries the live action under "Most valuable squads." During the tournament the hub must lead with what's happening now. (Live degradation hitting every visitor at peak traffic — CTO-sequenced ahead of the goal-push build.)

## Decisions (with Perez, 2026-06-13)

1. **Players to watch = top Onside-valued players per squad, 2 per side**, linking to `/players/{slug}`. On-brand (the value angle), uses existing data, turns fixtures into doorways to player pages.
2. **Hub schedule section shows today's fixtures**, falling back to the next match day's when today has none (never empty mid-tournament).

## The page is a server component under ISR (`revalidate = 3600`)

All time/matchday logic is computed server-side at render (consistent with the existing `daysToKickoff` and the live ticker). No client date logic. The hourly ISR is fine for matchday granularity; live scores within the section come from the existing fixtures table (synced every 5 min by the existing cron).

## Changes

### 1. Hero — live state, not a dead countdown
`src/app/(app)/worldcup/page.tsx`:
- **Remove** the `daysToKickoff` stat block ("0 / Days to kickoff") and the `KICKOFF`/`daysToKickoff` computation.
- **Replace** with a **Matchday indicator**: e.g. "Matchday 1 · Group Stage" with its date range, derived from the fixtures (the matchday of today's, or the next upcoming, fixture). When the tournament has advanced to knockouts, the label reflects the round name (Round of 32, etc.).
- **Remove** the `<span>… Kicks off 11 June 2026</span>` pill.
- Keep the "48 nations · {money} · One trophy" headline and the Nations/Groups/Total-value stats.

### 2. Hero CTAs — Schedule first
Reorder: **Match schedule = `kind="primary"`** (Calendar icon); **View all groups** and **Projected bracket** become `kind="outline"`. Drop the date pill (above).

### 3. Matchday schedule section — above "Most valuable squads"
A new section between the hero and the squads grid. Title reflects the matchday ("Matchday 1 — today" / "Up next" when falling back). For each fixture in the slate it shows: both nations (CodeTile + name, each linking to `/worldcup/teams/{slug}`), kickoff time (ET) or live/final score, and the Onside forecast (compact win-prob + the "✓ Onside called it" verdict when finished) — reusing the data the `/schedule` page already renders (`WcFixture.forecast/live/verdict`). A "Full schedule →" link to `/worldcup/schedule`. Renders nothing (section omitted) only if there are no fixtures at all.

### 4. Players to watch — per fixture
Within each fixture row, a compact "Players to watch" strip: the **top 2 Onside-valued players from each side** (4 total), each a small chip (name + value) linking to `/players/{slug}`. Fetched via ONE bounded query for just the slate's teams — never a per-fixture loop.

### 5. Breadcrumbs on the WC subpages
A small `WcBreadcrumb` component (`World Cup › {Schedule|Groups|Bracket}`, the "World Cup" crumb links to `/worldcup`). Added to the top of `/worldcup/schedule`, `/worldcup/groups`, `/worldcup/bracket`.

## New units (clear boundaries)

- **`src/lib/wc-day.ts`** (extend the existing module): add `matchdaySlate(fixtures, now): { label: string; fixtures: WcFixture[] }` — pure. Reuses the existing `todaysFixtures`; returns today's fixtures with a matchday label, or the next match day's slate when today is empty. The "matchday label" derives from the fixtures' `round` (reuse the schedule page's `roundLabel` logic — extract it to a shared pure helper `roundLabel(round)` in wc-day.ts so both the hub and `/schedule` use one source). Unit-tested.
- **`src/lib/queries`** — add `getWatchPlayers(teamSlugs: string[], perTeam = 2): Promise<Record<string, PlayerListItem[]>>` — one query over `national_teams` (slug in list) with the squad nested select (same shape as `getNationalTeamBySlug`), returning the top-`perTeam` value-sorted players keyed by team slug. Bounded to the slate's teams.
- **`src/components/worldcup/MatchdaySlate.tsx`** — server component rendering the section (matchday header + fixture rows + players-to-watch). Compact; reuses `CodeTile`, `nationCode`, and the forecast formatting. Not a reuse of the heavier `/schedule` row (different shape — YAGNI on premature shared extraction; the shared bit is `roundLabel` + CodeTile).
- **`src/components/worldcup/WcBreadcrumb.tsx`** — tiny presentational breadcrumb.

## Data flow

`worldcup/page.tsx` (server) loads `getNationalTeams()` (already) + `getWcFixtures()` (add) → computes `matchdaySlate(fixtures, new Date())` → collects the slate's team slugs → `getWatchPlayers(slugs)` → passes slate + watch-players to `<MatchdaySlate>`. All before the squads grid. Each data fetch is independently `.catch`-guarded so a failure degrades that section, never the page (matches the existing empty-state discipline).

## Hard constraints (inherited)
- Design tokens only (`bg-ink-*`, `text-acc/mute/...`, Card/Chip/CodeTile/SectionHead); both themes hold.
- Server component; no `Date.now()` in any client render path; Next 16 async params on subpages preserved; ISR `revalidate` values kept.
- Crest-free tiles; no FIFA marks; no fabricated data (only real fixtures/forecasts/valuations); never name the data supplier.
- Tests stay green; build-verify must fail on type-check errors.

## Testing
- Pure unit tests for `matchdaySlate` (today's slate; fallback to next matchday when today empty; label from round; empty when no fixtures) and `roundLabel`.
- `getWatchPlayers` + the page/components verified by build + manual QA (both themes, desktop + 390px), matching how the other query/UI work is verified.

## Out of scope
- Changing the `/schedule`, `/groups`, `/bracket` page bodies beyond adding the breadcrumb (the schedule page's own stale "tournament opens" framing, if any, is a separate small fix — note it during build but don't expand scope here).
- Live in-section score polling (the section reflects the 5-min-synced fixtures table; good enough for the hub).
- The full multi-matchday schedule on the hub (stays on `/schedule`).

## Acceptance criteria
1. The hub hero shows the current **Matchday** (not "0 days to kickoff"); the "Kicks off 11 June 2026" pill is gone.
2. **Match schedule** is the primary CTA; groups + bracket are secondary.
3. A **matchday schedule section** appears ABOVE "Most valuable squads", showing today's fixtures (or the next matchday's if none today) with forecasts/verdicts, and a "Full schedule" link.
4. Each fixture shows **2 top-valued players per side**, each linking to its player page.
5. `/worldcup/{schedule,groups,bracket}` each show a **breadcrumb** back to the hub.
6. The page stays a server component under ISR; both themes hold; all tests green; the watch-players fetch is a single bounded query.
