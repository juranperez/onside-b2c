# The "Here We Go" lane — design

**Date:** 2026-06-13
**Status:** Approved design, pending implementation plan
**Repo:** `~/onside-b2c` · branch `feat/sportmonks-integration`
**Scope:** A tier-0 trusted-journalist instant-break lane for the Wire, flagship = Fabrizio Romano's "Here We Go". Watches his Bluesky feed in near-real-time, auto-publishes a clean break as a distinct journalist-confirmed state, with a kill-switch and auto-retract.

## Context & decisions

Perez's ask: when Romano breaks a deal, it must hit the Wire ~the same moment he posts it — even though the corroboration-based confidence engine can't verify a single instant source. Romano's "Here We Go" is itself the signal: he reserves the phrase for done-done deals, ~99% reliable, which is what makes it a safe trigger.

What already exists (built on, not rebuilt): the Wire ingest pipeline tags Romano/Ornstein as tier-1, greps "here we go", and has an auto-publish fast lane for trusted+resolved breaks — but every source is an **RSS echo** (Google News, Reddit, BBC, Guardian), 10–90 min behind his actual post, and a break just becomes a normal Wire row with no distinct treatment. Relevant modules: `src/lib/ingest/rumour-ingest.ts` (`decideIngest`, `tierFor`, TIER1/2/3, DEVELOPMENT keywords), `src/lib/ingest/match.ts` (`matchPlayer`, `stripJournalists`, club resolution + CLUB_GENERIC blocklist + CLUB_PHRASES), `src/lib/ingest/official-transfers.ts` (Sportmonks official deals → `confirmed`), `src/lib/rumours/stage.ts` (`stageOf`, `doneLanguage`, taxonomy Linked→Talks→Bid→Agreed→Medical→Done), `src/lib/rumours/confidence.ts`, `src/lib/rumours/notify.ts` (`notifyFollowers`). Tables: `rumours`, `rumour_sources` (URL dedup), `rumour_follows`, `notifications`. `/transfers` Wire (WireRow, stage chips, BREAKING badge, FilterRail) and owner-gated `/transfers/manage`.

Decisions made with Perez (2026-06-13):

1. **Source:** Bluesky firehose first (free, real-time, structured JSON, no scraping). Paid X API is the documented fallback if his Bluesky lags.
2. **Safety net:** clean-parse gate + instant kill-switch. Auto-publish only when player AND destination club resolve high-confidence; ambiguous → BREAKING review slot. Every auto-publish alerts the admin for one-tap retract; auto-retract if the post is deleted/edited.
3. **Scope:** Romano "Here We Go" only for v1. Architecture leaves a clean slot for Ornstein & co. (their own triggers/badges) in v2.
4. **State model:** journalist-confirmed → club-official **two-step** (HERE WE GO ~95% → DONE/Official 100% when Sportmonks confirms).
5. **Cadence:** 1-minute Vercel cron (≤60s latency, $0, zero new infra, zero LLM tokens). Jetstream always-on listener (sub-second, ~$5/mo Railway) is a scoped upgrade path, not v1.

**Token/compute note:** the entire path is deterministic — string-match trigger + existing `matchPlayer` entity resolution. No LLM in v1, so zero Groq/Gemini token cost. A Groq extraction fallback for weirdly-worded breaks is a future option (a few cheap calls/day, ambiguous-only) — explicitly out of scope here.

## 1. The watcher

New `src/lib/ingest/bluesky.ts`: fetches Romano's recent posts from Bluesky's free public AppView (`app.bsky.feed.getAuthorFeed`, `https://public.api.bsky.app/xrpc/...`, no auth) for his handle. Pure-ish module: `fetchRomanoPosts(): Promise<BskyPost[]>` returning `{ uri, text, createdAt, embedImageUrl?, edited?, deleted? }` (deletion/edit detected by comparing against last-seen state). Driven by a new `/api/cron/romano-watch` route on a **1-minute cron** (`vercel.json`), CRON_SECRET-guarded like the others.

**Step 0 of the build (verification):** confirm Romano's Bluesky handle is live and that his posts there fire promptly vs his X/IG. If Bluesky badly trails, escalate the source decision before building further. Documented as the first plan task.

Latency ceiling honesty: Vercel cron floors at 1/min, so v1 lands a break within ≤60s. Sub-second needs the Jetstream listener (out of scope).

## 2. The trigger + parser + clean-parse gate

New `src/lib/ingest/here-we-go.ts` — pure functions:
- `isHereWeGo(text): boolean` — matches Romano's trademark ("here we go", guarded against negation/quotes/questions the way `doneLanguage` already guards).
- `parseBreak(post): { playerToken, clubToken, feeText? } | null` — extracts the deal shape from his post text (and image-embed alt where useful).
- Resolution reuses `matchPlayer` (known_as tie-break) for the player and the existing club resolver (CLUB_PHRASES + CLUB_GENERIC blocklist) for the destination.

**Clean-parse gate (concrete):** the player must come back as a STRONG `matchPlayer` result (adjacent full-name tokens, known_as tie-break applied — not a bare-surname guess), AND the destination club must resolve via a real club token / CLUB_PHRASES entry, NOT anything on the CLUB_GENERIC blocklist. Both conditions true → eligible for auto-publish. Either fails → candidate with a BREAKING flag, admin-alerted, never auto-live.

## 3. The state model (journalist-confirmed ≠ club-official)

A Romano break is its own state, honestly distinct from club-official:
- New tier value **0** ("verified trusted break") above the existing 1/2/3.
- New break marker columns on `rumours`: `break_kind text` (`'here_we_go'`), `break_source text` (`'fabrizio_romano'`), `break_url text` (the Bluesky post), `break_at timestamptz`. Presence of `break_kind` drives the badge + provenance; extensible to `'ornstein_agreed'` etc. in v2.
- New stage value **`here_we_go`** in `stage.ts`, positioned at the top of the journalist taxonomy (≈ Agreed/Done-by-journalist, below club-official Done).
- Confidence pinned high (~95), distinct from club-official `confirmed` (100).

**Two-step upgrade:** when `official-transfers.ts` (Sportmonks) later confirms the same player's move, the row upgrades in place — stage `here_we_go` → `Done`, status → `confirmed`, confidence 95 → 100, badge HERE WE GO → DONE/Official. No new mechanism: the official-transfers feed already performs the second step; it just needs to recognise and upgrade an existing `here_we_go` row rather than treating it as new.

## 4. The decision router

New pure, unit-tested `decideRomanoBreak(input): Decision` (sibling to `decideIngest`), where `input` carries the parsed break + whether a live saga already exists for the player:
- Clean parse, **no** existing live saga → publish NEW `here_we_go` (status `published`, tier 0, ~95%, break_* set, Bluesky URI stored as the primary `rumour_sources` row).
- Clean parse, **existing** live saga for that player → **upgrade** it to `here_we_go` (bump stage/confidence, attach Romano source + break_*), and fire `notifyFollowers` — the "Romano just confirmed the deal you're tracking" moment.
- Ambiguous parse → `candidate` + BREAKING flag + admin alert; never auto-live.
- **Idempotent** on the Bluesky post URI (same durable-dedup pattern as the `sm-transfer:` markers): a post already ingested is skipped on subsequent polls.

## 5. The kill-switch + auto-retract

- Every auto-published break writes an admin alert: a `notifications` row for ADMIN_EMAIL's profile **and** an email via Resend ("Romano break live: {player} → {club} — Retract?"). True phone push is deferred to the web-push infra (the goal-notification feature); this lane becomes its first push use case later.
- One-tap **Retract** action in `/transfers/manage` (owner-gated server action): sets the row to a terminal `retracted` status — off the live Wire *and* out of the review queue — while preserving the Bluesky URL in `rumour_sources` so the idempotent 1-min cron can't re-create it.
- **Auto-retract:** the watcher keeps reading his feed; if the source post is **deleted or materially edited away from a confirmed break**, the row is set to the same `retracted` status (off the live Wire) without human action.

## 6. The Wire surface

- A distinct **🚨 HERE WE GO** badge on WireRow (animated, accent — visually louder than the existing BREAKING chip), shown when `break_kind='here_we_go'`, attributed "Fabrizio Romano · broke {relative time}", linking out to the source Bluesky post.
- Pinned to the top of the feed (recency + tier-0) and surfaced in the `/transfers` market-pulse strip ("Latest break: {player} → {club} · Romano").
- Honesty affordance: a small "Reported by Fabrizio Romano — not yet club-official" tooltip/subtext that disappears once the row upgrades to DONE/Official.

## 7. Boundaries (out of scope for v1)

- **User-facing phone push** of a break — that's the web-push infrastructure from the WC-goal-notification idea; a "Romano break" push becomes its first use case when that ships. v1 surfaces the break in-app on the Wire and alerts the admin only.
- **Sub-second latency** (Jetstream always-on listener) — scoped upgrade if ≤60s proves too slow.
- **Ornstein / wider tier-0 set** — v2; the break_* columns and decision router are built to extend.
- **LLM extraction fallback** for weirdly-worded breaks — future option; v1 sends ambiguous parses to review.

## Hard constraints (inherited)

- Design tokens only (`bg-ink-*`, `text-acc/mute/...`, `border-line`, existing chip/badge components); both themes hold.
- React 19 purity; Next 16 async params; CRON_SECRET on the new route; tests stay green.
- **NEVER fabricate** a rumour — the lane only ever publishes a real, parsed Romano post; the clean-parse gate + idempotency prevent phantom or duplicate sagas.
- Never name the supplier ("Onside data engine"); no fabricated copy. The badge attributes Romano factually.
- Entity-matcher safety (CLUB_GENERIC blocklist, known_as tie-break, `stripJournalists`) is reused, not weakened.

## Testing

- `here-we-go.ts` (`isHereWeGo`, `parseBreak`) and `decideRomanoBreak` are pure, fixture-driven unit tests using real Romano post shapes: clean break → publish; ambiguous club → candidate+BREAKING; existing saga → upgrade + notify; deleted post → auto-retract; duplicate URI → skip. Mirrors `rumour-ingest.test.ts` structure.
- `bluesky.ts` fetch/parse tested against captured `getAuthorFeed` JSON fixtures (no live network in tests).

## Acceptance criteria

1. Step-0 verification of Romano's Bluesky handle + posting cadence is documented before further build.
2. A clean Romano "Here We Go" post is live on the Wire as a distinct HERE WE GO row within ≤60s, attributed + source-linked.
3. An ambiguous parse never auto-publishes — it lands in the BREAKING review slot and alerts the admin.
4. An existing tracked saga upgrades in place (not duplicated) and notifies followers.
5. The admin retract pulls a live break in one tap; a deleted source post auto-retracts.
6. When Sportmonks later confirms the deal, the same row upgrades HERE WE GO → DONE/Official (95→100), not duplicated.
7. Zero LLM tokens consumed by the lane; both themes hold on the new badge; all existing tests stay green.
