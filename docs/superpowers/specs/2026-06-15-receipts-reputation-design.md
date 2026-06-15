# Receipts & Reputation — v1 design (from brainstorm + research + adversarial review)

**Date:** 2026-06-15
**Status:** Design approved (Perez, 2026-06-15); hardened by a 4-critic adversarial review
(2026-06-15); **3 items still need Perez's call — tagged `NEEDS PEREZ`**
**Provenance:** brainstorm + 5-lens research (`wf_d91dd5dd-c2f`, `wf_c049b736-d88`) + spec
adversarial review (`wf_b79c5c1f-343`)

## Review pass (2026-06-15) — what changed from the first draft

A 4-critic review (product/cold-start · compliance · engineering · anti-abuse) found the v1
draft "not plan-ready" with code-verified blockers. The design decision held; the gaps were
specification gaps. This v2 patches them:
1. **Scored "interim credit" CUT** → a cosmetic, non-scoring "trending your way" label only
   (it was unbuildable, reversible, and a free-win farm — see §Mechanic).
2. **Lock is a SERVER action** — server recomputes & writes `house_snapshot`/`locked_at`;
   client values never trusted (closes the copy-the-house/earliness forgery hole).
3. **Immutability is enforced by trigger + grant**, not RLS alone.
4. **18+ / betting framing on WC calls: removed for v1** (`NEEDS PEREZ` — overrides the
   earlier "predictions, not betting, 18+" ask; reasoning below).
5. **Betting-coded structures purged**: no 1X2 triplet beside a pick; fee call reframed as
   "higher/lower than Onside's value" (no "over/under a line"); banned-token **lint gate**.
6. **Resolution Rules v1** is now a named, versioned, in-product **v1 deliverable**.
7. **Push/void + Sybil + late-call** integrity rules specified.
8. **Post-WC cadence cliff (Jul 19)** named as a milestone with a decision (`NEEDS PEREZ`).

## North star

Turn opinions into **receipts**: a user makes a public, auto-scored **call** on a transfer
saga (or fixture), it resolves against real outcomes, and a track record accrues = **social
clout earned with proof.** Makes the homepage COMMUNITY pillar (currently a `ComingSoon` stub)
real. The blended vision is **argue → prove → spread**; **C (receipts) is the wedge**, A
(arguing) falls out of it, B (Reddit) amplifies later.

## Phasing

- **v1 (this spec):** inline calls on house-number surfaces + a profile **receipts hub** + a
  fast-cadence **"Call of the Day."** Reputation = legible surface + hidden difficulty score.
- **Phase 2:** user-vs-user — **relative** themed mini-boards (per-league/per-saga, friends/
  cohort), ranked *beat-the-house*. NEVER a global money ladder.
- **Phase 3:** Reddit — share-receipt-to-r/soccer, then OAuth + sync behind a ToS review.

## Key decision: hybrid, inline-FIRST (all 5 research lenses converged)

Calls are **born inline** where the house number already renders (Wire rows, deal pages,
fixtures); the record **accrues in a profile hub** (record-only, never the front door). NOT a
standalone predictions destination/"trading floor" — worst cold-start shape AND the
FootballIndex/Sorare gambling silhouette. Evidence: inline lift (X polls 2–3×, Reddit ~5×, IG
+21–50%) vs 60–90% destination funnel decay + the 90-9-1 lurker ceiling; ESPN Streak / Super6
win by living *inside* an app users already open — Onside's identical position.

## Cold-start: "you vs the house"

The board is never empty because Onside already renders a house call on every object (Confidence
% on Wire rows/deals, Onside Forecast on fixtures) — a new user always has a credible
counterparty on pick one (ESPN "Beat the Expert", Super6 "beat Carragher", GJ Open Relative
Brier). Two mechanics: (1) **pace the streak on FAST-resolving fixtures** (resolution lag was
the #1 risk in 4/5 lenses); (2) one curated daily **Call of the Day**, never 50 open sagas.
Seed the benchmark with the **anonymous "Onside house"** record published openly.

### ⚠️ Post-WC cadence cliff (Jul 19) — `NEEDS PEREZ`
The fast-cadence engine is **WC-fixture-only** in the current code (`syncWcFixtures` is
hard-coded to `WC_LEAGUE_ID=1 / WC_SEASON=2026`; the 30+ domestic leagues are *player/valuation*
ingest, not fixture ingest). The day after the final the "Call of the Day" has no fixtures and
the streak loop goes dark — exactly when retention should compound. **Pick one:**
- **(a) Recommended — generalize the fixture resolver to a domestic "Match of the Day"** (same
  resolver, new `subject_type`; leagues already exist; needs a domestic fixture sync). Summer-
  calendar leagues (MLS/Brazil/Liga MX/Argentina) restart ~Jul 16, so this dovetails.
- **(b)** Re-scope to "Call of the Week" / saga-driven daily; streak counts **participation-
  days**, not fixture-days.
- **(c)** Ship the streak as a **documented WC-window experiment** with a sunset on Jul 19.

This must be a named milestone in the plan, not an unstated assumption.

## The mechanic — one engine, pluggable resolvers

**Predict → lock → auto-resolve against an Onside outcome → score.** Substrates (v1):
- **Transfer outcome** — `Will / Won't happen`. Resolves on confirm-or-terminal.
- **Transfer fee** — **`higher / lower than Onside's value`** (a directional confidence
  judgment vs Onside's *own published valuation* — **never "over/under a line"**). Resolves
  on the **first officially-recorded fee, then frozen** (later restatements/add-ons ignored;
  published rule). Free transfer → push; undisclosed → void.
- **Fixture result** — `home / draw / away`. The fast-cadence substrate that powers the daily
  streak. **Structurally identical to a transfer call** — no betting-adjacent self-labeling.

**Parked (NOT v1):** standalone "undervalued vs market" valuation call.

### "Won't happen" semantics (review-critical)
A saga "killed by a competing confirm" means the player **moved elsewhere** — that is the
**opposite** of "won't happen." The resolver MUST receive a `killed-by-competing` flag and
resolve such a "Won't" call as **LOSS/VOID, never a win.** A genuine terminal "won't happen"
requires an explicit **`expired`** event (a dormant `status='rumour'` saga at window-close).
If `expired` isn't built in v1, the "Won't happen" pick is **disabled** for sagas with no
terminal signal — do not ship a free-win.

### "Trending your way" is cosmetic, never scored
Scored interim credit is **cut**. Saga progress may render a clearly-labeled **non-scoring**
"leaning correct / trending your way" indicator that carries **zero points** and never touches
W-L, accuracy, streak, hidden score, rank, or the shareable receipt card until **terminal
resolution.** (Sagas pause/revive — `romano-break.ts` revives dead sagas in place — so any
"provisional point" could silently reverse on a public receipt. Cosmetic-only removes the hole.)

### Call UI — protect the one tap
- **Binary is one tap** (Will/Won't, or H/D/A). The **higher/lower-than-value** fee dimension is
  an **optional second tap / progressive disclosure** (a forced 2-step can halve participation).
- **Lock is a SERVER action.** On lock the server **recomputes** `confidence()` /
  `onsideForecast()` and writes `house_snapshot` (the computed **result**: pct + band, since the
  inputs are time-varying and non-reproducible) and `locked_at` (DB clock). **Client-supplied
  snapshot/timestamp are never trusted** (a forged snapshot would fake max divergence credit).
- **Anti-late-call over persisted columns:** reject/zero-credit a "Will" call if
  `status != 'rumour'`, `source_tier == 0` (Here We Go ≈ closed even while status is rumour),
  `resolved_at` set, or server-recomputed house confidence ≥ a high ceiling (e.g. 85) or within
  a cooldown after the last stage advance. Fixture calls lock at kickoff. Test the
  "call lands in the same ingest tick as the resolving event" race.

## Reputation & scoring ("C hybrid")

**Surface (legible):** W–L, accuracy %, current streak, resolved timeline, one human-readable
**signature win**. No Brier/calibration math on the consumer surface (expert-repellent).

**Hidden (difficulty-weighted) — drives rank + badges.** Defeats the named exploits:
- **Copy-the-house → ~0 credit.** A call echoing a *confident* house number scores near-zero
  (Metaculus Peer logic); divergent-and-right scores most. "Confident house" = the published
  band `high ≥ 70` per `confidence.ts band()`.
- **Small-sample guardrail:** minimum-volume floor + shrink-to-mean + participation-rate
  multiplier, so a 2-for-2 streak can't top a 40–15 grinder.
- **Difficulty weight** = f(distance of pick from house, earliness/stage at lock, value-gap),
  **capped + abuse-monitored from day one.**
- **Push/void are streak-neutral, excluded from the accuracy denominator, and zero hidden-score**
  — for *every* metric. Cap deliberate void-farming (a record dominated by push/void on
  free/undisclosed-prone subjects → those subjects drop out of streak eligibility).
- **Surface still rewards correct agreeing calls** (the early-dopamine W-L/accuracy), while
  **rank** is the slow-burn expert surface where copy-the-house earns nothing — product copy
  must not over-promise ranking to novices.

**Verified-scout badge** — recognition only (no money/prize/discount/entitlement, costs
nothing, **not** obtainable via the paid `tier`). Gated behind **subject diversity + minimum
elapsed calendar time + volume × accuracy** (not volume×accuracy alone — Sybil defense).

## Surfaces (v1)

1. **Inline call chip** on Wire rows, deal/story pages, fixture pages — beside the Confidence
   %/Forecast. One-tap binary + optional higher/lower-than-value.
2. **Profile receipts hub** (record-only): W–L, accuracy %, streak, resolved timeline, badges,
   shareable **receipt card**. **First-run/empty-state spec:** an **open-calls** state showing
   pending calls with their `house_snapshot` + a **countdown-to-reveal** (so the hub has
   *something* the instant a first call locks), a "your record starts here" line, a seeded
   **"Onside is N% on these — beat it"** comparison row, and an explicit **inline→hub handoff**
   after the first lock. Discharges the homepage "public + permanent track record + verified
   scout badges" promise.
3. **Call of the Day** — one **auto-curated** fixture (objective rule: most-balanced or
   highest-stakes forecast in today's slate — no daily manual editorial dependency). On
   no-fixture days **roll to the next match day** (reuse `matchdaySlate`) or substitute a saga
   call; **empty days pause the streak, never break it.** Spoiler-safe shareable result.

## Share → acquisition (the only v1 distribution; Reddit is Phase 3)

Every shareable artifact (receipt card, daily result) **deep-links to a logged-out-viewable
fixture/saga with a one-tap "make your own call"** that **survives the auth wall** (call
captured → sign in → locked). Define the auth-deferral behavior explicitly so a share is an
acquisition surface, not a vanity export. This is the only new-user pull in v1 and the WC is a
once-only acquisition spike — don't waste it.

## Hard compliance guardrails (enforced in design review + a lint gate)

Gambling-adjacency is **existential** (founder's MLS employment). FootballIndex/Sorare died on
**monetary stake + tradable value**, not on predicting.
- **Zero stakes/prizes/entry fees/tradable position.** Reputation is the only currency:
  non-monetary, non-transferable, non-cashable, no operator-controlled value knob.
- **Banned vocabulary** — bet, stake, odds, payout, wager, buy, sell, shares, **line**,
  over/under. Use *call / prediction / track record / confidence / higher-lower-than-value.*
  **Scope extends to:** UI copy, push copy, share-card/OG text + alt text, **code
  identifiers/enum values**, and the Resolution Rules page. Enforce as a **build-failing
  denylist lint check** (the repo already has a lint gate).
- **Banned visuals** — order book, share price, price chart, portfolio, buy/sell, **and a
  1X2 probability triplet beside a pickable outcome.** On the call surface render the house
  **lean qualitatively** ("Onside leans HOME") — keep the full forecast triplet on analysis
  pages only.
- **WC/fixture calls** — `NEEDS PEREZ`: **v1 drops the "18+ / predictions-not-betting" self-
  label** and makes fixture calls structurally identical to transfer calls. *Why:* `profiles`
  has **no DOB field** and there's no age gate, so a self-applied "18+" is **unenforceable** —
  and an unenforced age-restriction label is *worse* than none to a compliance reviewer (it
  proves you classified the activity as restricted, then didn't restrict it). The free-prediction
  framing (no stakes/odds/payouts) stays; the age-restriction language goes. **If you want real
  age-gating instead, that's option (b): add a DOB affirmation to `profiles` + server-side gate
  at lock — a v1 build item.** Pick one.
- **Editorial seeding = the anonymous institutional "Onside house" account only.** **No named
  human staff or the founder publishing personal match/fee predictions** (league
  integrity/gambling policy hazard for an employee, money or not).
- **Publish "Resolution Rules v1"** (below) — a rule you haven't written can't be enforced, and
  ad-hoc resolution is the Romano credibility-crater.

### Jurisdiction — `NEEDS PEREZ` (counsel)
- The Terms governing-law is a literal placeholder (`terms/page.tsx:178`); no geo/IP infra
  exists. Gambling-adjacency is jurisdiction-specific and exposure runs through a **US MLS**
  club; US state DFS/contest law varies. **Before fixture calls go live:** fill the governing-law
  clause, get the founder's MLS-side counsel a one-line written read on US exposure, and decide
  whether fixture-outcome calls are offered to US users (a geo carve-out would be a v1 build —
  none exists today).

## Resolution Rules v1 (named, versioned, in-product — a v1 deliverable)

Rules are **frozen at lock** and never changed retroactively for an open call. Enumerate at
minimum:
- **Transfers:** free transfer → outcome *win* if it happened, **fee call push**; undisclosed
  fee → fee **void**; loan / loan-with-obligation / swap / part-exchange → define whether each
  counts as the saga "happening" for the outcome call; add-ons/bonuses **excluded** (resolve on
  the **first official base fee, frozen**); window-closes-without-confirmation → **`expired`**
  (outcome: "won't happen" wins, "will" loses); collapse-then-revive → the revived terminal
  outcome governs (cosmetic "trending" never banked, so nothing reverses on a shared receipt).
- **Fixtures:** knockout decided on penalties resolves to the **regulation/ET result shown to
  users** (a drawn-then-penalties match = **draw** on H/D/A); **PST / CANC / ABD / SUSP / AWD /
  WO → void + streak-neutral.**
- v1 does **not** model a "paused" saga state honestly — a dormant saga resolves only on
  confirm / death / `expired`. Say so.
- Founder's MLS-side counsel signs off the page text before the WC.

## Data model (finalize column types in the plan)

- **`predictions`**: `id`, `user_id`, `subject_type` (`transfer_saga` | `fixture`),
  `subject_id` (**polymorphic text key, no FK** — rumour ids vs `wc2026-…` fixture ids live in
  different tables, validated in app code; index `(subject_type, subject_id, status)` for the
  resolver scan; confirm id namespaces can't collide), `call_type` (`outcome` | `fee`), `pick`,
  **`house_snapshot`** (server-computed pct+band at lock), `locked_at` (DB clock), `status`
  (`open` | `won` | `lost` | `push` | `void` | `expired`), `resolved_at`, `difficulty_weight`,
  `points`.
- **Immutability (not RLS alone):** RLS = `INSERT with check(auth.uid()=user_id)` +
  `SELECT(true)` + **no** authenticated UPDATE/DELETE policy; all status/points mutation via
  **service-role resolvers**; **plus a `BEFORE UPDATE` trigger (or column-level GRANT revoke)
  that rejects any change to `pick`/`locked_at`/`house_snapshot`/`subject_*` even from the
  resolver.** State per-column which are append-only vs resolver-mutable.
- **Reputation rollup table** (not a materialized view — `REFRESH` is full-table): per-user
  surface stats (W-L, accuracy, streak) update **incrementally** on resolve; **rank +
  population-relative shrink recompute as a batch** after each resolver run. Ranks are
  **eventually-consistent**, not per-write.
- `profiles` already has `username`/`display_name`/`tier`; badges/score key on `user_id`.

## Architecture — existing pieces to build on (verified this session)

- **House calls live:** `confidence.ts` (Confidence %, published weights), `onside-forecast.ts`
  + `liveForecast`.
- **Resolution events:** the official-transfers ingest flips sagas to confirmed-with-fee
  (`transfers`) + kills competing rumours (pass the **killed-by-competing** flag through);
  fixture sync writes results; `stage.ts` derives stage (read-time regex — **no persisted stage
  column**, so anti-late-call/expiry must key on `status`/`source_tier`/`resolved_at`, not
  derived stage).
- **Reveal loop:** `broadcast()` is a **GLOBAL fan-out** — targeting the *caller* is **net-new**
  (predictions → user → that user's `push_subscriptions` → targeted send). **v1: in-app
  notifications** (the existing `notifications` table) for reveals; **targeted push-to-caller is
  a small new build** (don't claim "reuses existing push infra"). Drop the global-broadcast idea.
- **Cadence reality:** `sync-transfers` cron runs **daily 06:30** → transfer/fee reveals are
  ~24h, **not** "hours." Fixtures/goals run per-minute. State this; either bump `sync-transfers`
  during the window (mind the API-Football daily budget guard) or set expectations.
- **Sybil surface:** signup is `signInWithOtp` magic-link, `shouldCreateUser` on, **no captcha**;
  `ratelimit.ts` is **in-memory per-instance** (resets on cold start). See Anti-abuse.

## Anti-abuse & integrity (new section)

- **Sybil/sock-puppets:** require **verified email + minimum account-age/activity before a call
  counts toward hidden score or badges**; add **captcha/Turnstile at signup**; **durable
  per-user (Postgres) rate limit on locks** (not the in-memory burst guard); **correlated-pick /
  shared-IP monitoring** for opposing calls on the same subject.
- **Cover-all-outcomes:** make the streak **skill-weighted (beat-the-Forecast)** rather than
  mere correctness, so spreading H/D/A across accounts manufactures nothing; the single curated
  Call-of-the-Day makes naive covering cheap otherwise.
- **Late-lock race / house-snapshot forgery / immutability:** covered above (server-authoritative
  lock, persisted-column gate, trigger-enforced append-only).

## Activation & instrumentation (new section — measure the decisive window)

Define up front, wired to the reveal/lock events from day one:
- **Activation event** = ≥N calls placed AND ≥1 reveal seen.
- **WC daily-streak retention target** (D1/D7).
- **Per-saga active-caller threshold** that gates turning on Phase 2.
- An explicit **Jul-19 decision gate** (build domestic cadence vs sunset the streak), tied to
  the activation/retention numbers so the call is data-driven, not a guess.

## Testing strategy

Pure scoring fns unit-tested (vitest, co-located like `map.test.ts` / `fallback-target.test.ts`):
difficulty weight (copy-the-house→~0 at band boundaries, e.g. house 68 vs 72; divergent-and-right
high), volume-floor/shrink, fee push/void/freeze, outcome scoring incl. killed-by-competing→loss,
`expired` logic. Resolver tests: idempotency (no double-score on re-run), anti-late-call rejection,
same-ingest-tick race, immutability trigger rejects forged updates. Build + lint (incl. the
banned-token denylist) gate. Deploy only on Perez's per-action word.

## Scope / boundaries (YAGNI)

**In v1:** transfer outcome + fee (higher/lower-than-value) calls, fixture calls, inline chip
(one-tap binary + optional fee), receipts hub (with empty-state), Call-of-the-Day (auto-curated),
hidden difficulty score + verified-scout badge, in-app reveal loop, share→acquisition deep-links,
Resolution Rules v1 page, compliance lint gate, Sybil controls, activation instrumentation.

**Explicitly NOT v1:** user-vs-user leaderboard (Phase 2, relative only), Reddit (Phase 3),
standalone valuation call, scored interim credit, any global ranking, any monetary/tradable
element, named-human editorial predictions.

## Open decisions for Perez (resolve before the plan)

1. **Post-WC cadence** — (a) domestic Match-of-the-Day [recommended], (b) participation-day
   streak, or (c) WC-window experiment with a sunset.
2. **Fixture-call age framing** — (a) drop the 18+ self-label [recommended], or (b) build a real
   DOB gate.
3. **Jurisdiction/counsel** — governing-law clause + a one-line MLS-counsel read on US exposure
   + whether fixture calls are offered to US users (geo carve-out = a build).

## Risks (carried + review-confirmed)

1. **Resolution lag** (#1) — fast-fixture pacing; transfer reveals are ~24h (daily cron), stated.
2. **Copy-the-house / forged snapshot** — server-authoritative lock + ~0 credit.
3. **Small-sample noise** — volume floor / shrink / participation multiplier.
4. **One-tap fragility** — binary one tap, fee optional.
5. **Integrity/tamper** — server lock + append-only trigger + auto-resolve.
6. **Gambling-adjacency optics** — non-monetary currency, banned vocab/visual **lint gate**,
   no 1X2 triplet, no named-human predictions, published rules, jurisdiction read.
7. **Sybil farming** — verified-email + account-age + durable rate limit + skill-weighted streak.
8. **Post-WC cliff** — named milestone + decision gate.
