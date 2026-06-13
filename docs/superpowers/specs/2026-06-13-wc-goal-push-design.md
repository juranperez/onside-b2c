# World Cup goal-push — design

**Date:** 2026-06-13
**Status:** Design COMPLETE, build QUEUED (sequenced after the WC-hub live-mode fix, per CTO call). Repo `~/onside-b2c`, branch `feat/sportmonks-integration`.
**Scope:** When a WC player scores, push opted-in users a goal alert ("⚽ Tyler Adams scores! USA 2–0 Paraguay") deep-linking the scorer's player page (value/club/market read) — an acquisition+education hook. Also builds the reusable web-push channel that later delivers Here We Go breaks and transfer-deadline pushes.

## Strategic frame (why build it now, mid-tournament)

The real asset is the **push channel**, not WC goals alone. Once built it's the delivery pipe for [[here-we-go-lane]] user-pushes, deadline day, and re-engagement. Judge ROI on the channel. WC goals are its first use case; the opt-in base accumulates gradually (cold-start is real), and at launch this is effectively an **Android + desktop** feature (iOS reach ≈ near-zero without a home-screen install — clear-eyed, and fine).

## Decisions (with Perez, 2026-06-13)

1. **Channel:** web push + an iOS "Add to Home Screen" nudge. Standard web push (instant, free) on Android/desktop; iOS users are prompted to install the PWA to unlock alerts.
2. **Scope:** all WC goals → all opted-in users (one "World Cup goal alerts" toggle), with one-tap mute.
3. **Latency:** a 1-minute live-gated cron (early-returns when no WC match is live) → ~1-min detection, with a confirmation buffer (see gap 2).
4. **Mapping:** clean — our `players.id` IS the API-Football player id, and WC fixtures are API-Football, so a goal event's `scorer.id` maps directly to `/players/{slug}`. No fuzzy matching.

## CTO gaps closed in this design

1. **Protect the channel from goal-spam (top risk).** OS-level "disable notifications" is permanent and kills ALL future pushes (Here We Go, deadline day) — the channel is worth more than the goals. Guards: brutally honest opt-in copy ("~5–10 alerts on busy match days"), one-tap mute, **goals-only** (zero non-goal noise). Rapid-goal **bundling** ("2 goals just now: …") is the escalation if fatigue data appears — not v1.
2. **Own goals + VAR.** A push can't be recalled. v1 **skips own goals**, and applies a **~60–90s confirmation buffer** before firing (the goal must still be present/valid on the next poll) — trading minor latency for never sending a VAR-retracted ping. API-Football event `detail` distinguishes "Normal Goal"/"Penalty"/"Own Goal" and disallowed-goal events.
3. **WC squad page completeness — prerequisite.** The feature skips a goal if the scorer has no player page, but obscure scorers are exactly who the education hook should teach. Before this matters, **verify/backfill all 48 WC squads as player profiles** so skip-if-not-in-DB is rare. (First build task.)
4. **Push-only service worker.** The SW handles `push` + `notificationclick` ONLY — no `fetch`/cache handlers (those would serve stale app pages — a classic footgun).
5. **Design the opt-in moment, don't gold-plate iOS.** An **event-triggered** prompt ("a goal just happened — get pinged for the next one") converts far better than a passive banner. A simple iOS install instruction suffices; do NOT build an elaborate iOS funnel (YAGNI).

## Architecture

Three parts.

### 1. Web-push foundation (reusable)
- **`push_subscriptions` table** (migration; prod DB needs Perez's word): `profile_id`, `endpoint`, `p256dh`, `auth`, `created_at`, `last_seen`. RLS owner-scoped.
- **Service worker** `public/sw.js`: `push` → `showNotification(title, { body, icon, data.url })`; `notificationclick` → focus/open `data.url`. No fetch/cache.
- **Web app manifest** `public/manifest.json` (name, icons, `display: standalone`) so the site is installable (iOS prerequisite).
- **VAPID keypair** generated once → `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in Vercel env. Send via the `web-push` npm package (one new dependency).
- **Client subscribe flow**: a hook that requests `Notification.permission`, registers the SW, subscribes (`pushManager.subscribe` with the VAPID public key), and POSTs the subscription to a new API route → upsert into `push_subscriptions`.

### 2. Goal detection (the cron)
- Add `fetchFixtureEvents(fixtureId)` to `src/lib/ingest/api-football.ts` (`/fixtures/events?fixture=`) → events with `type`, `detail`, `time.elapsed`, `player.id`, `player.name`, `team.id`.
- New `src/lib/ingest/wc-goals.ts`: for each LIVE WC fixture (status live), fetch events, take confirmed scoring events (`type === "Goal"`, `detail !== "Own Goal"`, not later marked disallowed), apply the confirmation buffer, map `scorer.id → players.id`, dedup against a **`pushed_goals` marker** (migration; signature = fixtureId + scorer.id + elapsed), and emit only goals whose scorer resolves to a player page.
- New cron `/api/cron/wc-goals` (`* * * * *`, CRON_SECRET, `force-dynamic`, maxDuration 60), gated behind `GOAL_PUSH_ENABLED` so it ships dark. Early-returns when no WC fixture is live (cheap no-op). API budget: a handful of extra API-Football calls on match days, well within 7,500/day.
- Pure, unit-tested helpers: goal extraction (own-goal/disallowed filtering, dedup signature), the buffer gate.

### 3. Fan-out + notification
- For each new confirmed goal, build the copy (`⚽ {scorer} scores! {HOME} {h}–{a} {AWAY}`) and `data.url = /players/{slug}`, then send web push to all active `push_subscriptions` via `web-push`. Prune endpoints returning HTTP 410/404.
- Pure notification-copy builder (tested). The send + DB path verified by build + manual QA (matching the other ingest crons).

## Opt-in UX
- An event-triggered "Get goal alerts" prompt on the WC/match surfaces (e.g., after engaging with a live match). Android/desktop → native permission prompt → subscribe. iOS-Safari-not-installed (detect `navigator.standalone`/display-mode) → "Add to Home Screen to get goal alerts" instructions. Honest volume copy. Settings toggle to mute (delete subscription) anytime.

## Boundaries (out of scope for v1)
- Club-football goals (later, same pipe via Sportmonks events). Watchlist-scoped goals (v2). Here We Go user-push (rides this infra once shipped — explicitly deferred from the Here We Go spec to here). Rapid-goal bundling (escalation only if fatigue shows). Elaborate iOS onboarding.

## Hard constraints (inherited)
- Design tokens only; React 19 purity (cron/detection are server modules — dates fine; the subscribe hook uses effects/handlers only). No FIFA marks, no fabricated data (only real API-Football goal events). Never name the data supplier in UI. Tests stay green. Two migrations + VAPID env + `web-push` dep are the new prerequisites; migrations + env need Perez's word; ships dark behind `GOAL_PUSH_ENABLED`.

## Prerequisites checklist (Perez's actions, at build/arm time)
1. Apply two migrations (`push_subscriptions`, `pushed_goals`) to Supabase.
2. Set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (Claude generates the pair) + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel env.
3. Confirm WC squad player-page backfill ran (build task 1).
4. Deploy, then set `GOAL_PUSH_ENABLED=1` to arm. CRON_SECRET already shared.

## Acceptance criteria
1. An opted-in Android/desktop user gets a goal push within ~1–2 min of a confirmed WC goal, deep-linking the scorer's page.
2. Own goals are not pushed; a VAR-retracted goal does not produce a (wrong) push (confirmation buffer).
3. A goal by a scorer with no player page is skipped (no dead-link push) — and the squad backfill makes this rare.
4. One-tap mute stops all goal pushes; dead endpoints are pruned.
5. The service worker handles push only (no stale-page caching).
6. Ships dark behind `GOAL_PUSH_ENABLED`; cron no-ops when no match is live; zero LLM tokens; tests green.
7. The web-push foundation is reusable — a later Here We Go user-push uses the same `push_subscriptions` + send path.
