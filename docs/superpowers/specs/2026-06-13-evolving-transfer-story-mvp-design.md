# Evolving interactive transfer-story page — MVP design (from brainstorm)

**Date:** 2026-06-13
**Status:** Agreed DIRECTION from a framing/decomposition brainstorm with Perez. NOT yet a full build spec — this captures the MVP shape so a fresh session can refine it into spec → plan → build. Repo `~/onside-b2c`.
**Source vision:** `[[onside-interactive-content-strategy]]` (memory) — WSJ "Trillions Game"-style scrollytelling transfer articles that EVOLVE with the deal; dual-register (expert + digestible) to expand the audience beyond Transfermarkt experts.
**Research backing:** `2026-06-13-evolving-transfer-story-research.md` (companion) — competitive/format/UX research + the strategic take. Drove the decisions folded in below (SEO architecture, the returning-visitor diff module, persisting stage events) and the guardrails. **Key reframe from research:** WSJ-grade scrollytelling per deal is the *trap*, not the spec — build the evolving **data** page; let "interactive" be a few earned beats, not the thesis.

## The decomposition (the vision is 4 layers, not one feature)

1. **Format** — the interactive, scroll-driven story (charts, reveals, the WSJ feel).
2. **Evolution** — the *same* story growing as the deal moves Linked → Talks → Bid → Agreed → Medical → Done (+ Here We Go).
3. **Generation** — how the words/analysis are created (templated from our data, AI-written, or human).
4. **Re-engagement** — pulling people back when a watched deal moves (the push/follow shipped 2026-06-13).

## The key insight (what makes the MVP buildable + safe)

**Evolution (layer 2) is nearly free, and generation (layer 3) is NOT a prerequisite.** If the story page renders from the live rumour's current stage + data we already have, it automatically shows more as the deal progresses — no regeneration, no AI, **no fabrication risk** (important: Perez is a DC United/MLS employee — accuracy/integrity matters). This reframes "AI content generation at scale" (expensive, slow, risky) into "a great interactive page that reflects live data" (buildable now). **AI-written narrative is a later enhancement to one module, not a blocker.**

## MVP DECISION (Perez, 2026-06-13)

Build the **data-driven evolving "transfer story" page** — no AI in v1. Decision was: data-driven evolving page > one hand-crafted flagship > AI-narrative-first.

**Where it lives:** UPGRADE the existing `src/app/(app)/transfers/[id]/page.tsx` (rumour detail) into the scroll-driven evolving story — it already carries OnsideBrief, SourceTrail, the confidence breakdown, and the discussion thread. Do NOT build a parallel route. Every rumour detail page becomes a "story"; richness scales with the deal's data/stage (marquee deals → more data → richer story).

## The story = a stack of data-driven modules (thin at "Linked", full at "Done")

All modules render from data we already have. Stage-aware: early stages render thin; later stages reveal more.

1. **Hero** — player (photo/monogram), from → to clubs, live stage chip (incl. 🚨 Here We Go badge), confidence %, one-line state-of-play. *Data:* rumour + `stageOf` + `confidence` + OnsideBrief's `stateOfPlay`.
2. **The money read** — Onside valuation + confidence band; reported fee vs our value → bargain/fair/overpay verdict; **contextualized** ("X% of [buying club]'s squad value · their Nth-most-valuable signing"). One interactive fee-vs-value bar. *Data:* `player_valuations`, `reported_fee_eur`, clubs.squad_value, the existing `feeTone` logic.
3. **The journey** *(the evolving heart)* — the negotiation as a scroll timeline built from `rumour_sources` (tier-chipped, dated) + stage transitions: one entry at "Linked", the full arc by "Done". This is what literally grows as the deal advances. *Data:* `getRumourSources` + stage history (note: stage transitions aren't currently persisted — see open questions).
4. **Why we rate it** — the confidence factors (source / corroboration / stage / fee-vs-value / freshness) made visual + plain-language. *Data:* `ConfidenceResult.factors` (already computed).
5. **What it means** — data-grounded dual-register: the player (value trajectory, age), buying club (squad-value impact, position need), selling club (the hole). Every expert number gets a plain-language companion (the "vs budget → words beat glyphs" lesson). **This is where AI-written narrative layers in later; v1 is data-driven/templated (richer than today's OnsideBrief).** *Data:* valuations, squad values, age/position; some angles may need new derived calcs.
6. **The verdict** *(the "final form")* — at confirmation: "✓ Onside called it" (from the forecast/verdict pattern + official-transfers confirm), final fee-vs-value take, the player's new context. *Data:* status=confirmed, fee, the existing verdict treatment.
7. **Follow this deal** — wired to the existing follow/notify + the new push, so the page pulls people back when the saga moves. *Data:* `rumour_follows` + `notifyFollowers` + `push_subscriptions`/`broadcast`.
8. **What changed since you last looked** *(returning-visitor diff — added 2026-06-13)* — a strip at the top for returning visitors: "Since you last looked: Talks → Bid · fee updated · confidence +6." The mechanic that converts a *watched* page into a *return visit* (the part of Google's "Living Stories" users explicitly loved — research doc §1). *Data:* the new `rumour_stage_events` ledger (see resolved open-question #1) + a per-user last-seen marker (signed-in: stored; anon: localStorage).

**Evolution mechanic:** same URL, all modules render from live data; the page is richer every time the underlying saga advances → the re-engagement loop (push on stage change already exists via `notifyFollowers` from the ingest merge paths).

**Dual-register principle:** every expert metric pairs with a plain-language companion — implemented as **progressive disclosure** (novice-legible default, expert depth one tap away in tooltips/expandables), NOT a flattened middle voice. **Never surface a bare number** (valuation, confidence %) without a one-line *why* (the FiveThirtyEight "empty number" trap). This is the audience-expansion mechanism. (Research doc §4.)

## SEO & URL architecture (decided 2026-06-13 — closes open question #6)
The evolving page is an **acquisition channel**, not just metadata. Keep the single permanent route `/transfers/[id]` (the `[id]` is a stable, date-free rumour slug → the permanent-URL requirement is already met). Add **`LiveBlogPosting` JSON-LD** with lifecycle transitions as timestamped `liveBlogUpdate` entries, plus a **paired-update discipline** — move the headline/meta/structured-data timestamp on every stage change so the page can surface in Google **Top Stories** during transfer windows (a channel static-page competitors forfeit). (Research doc §4–§5.)

## Hard guardrails (decided 2026-06-13 — write into the plan)
- **Mobile-first; fully legible with zero animation/JS.** Interaction is progressive enhancement only. **No scrolljacking, ever** (measurably disorients, worst on mobile — Onside's stated gap).
- **The lifecycle stages ARE the scroll steps** — use them; don't hand-craft narrative structure.
- **Default to words + static/annotated charts; reserve one or two earned interactive beats.** Heavy interactivity slows comprehension ~30% with no proven benefit and repels the fast-signal power user.
- **Sequencing:** ship static evolving page + the "what changed" diff (module 8) + SEO wiring + follow/push loop FIRST (~80% of value, mostly built). Treat scrollytelling polish as a **later, surgical layer on marquee deals only**, concentrated on one high-impact beat at the "Done" state (the recap timeline). (Research doc §6.)

## Scope / boundaries
- **IN (v1):** the data-driven evolving story page (upgrade `/transfers/[id]`), the 8 modules (incl. the returning-visitor diff), the `LiveBlogPosting`/paired-update SEO wiring, the `rumour_stage_events` ledger + audit trail, scroll/interaction treatment (progressive enhancement, no scrolljacking), dual-register via progressive disclosure, re-engagement wiring (mostly exists).
- **OUT (later layers):** AI-written editorial narrative (module 5 enhancement); auto-generation-at-scale; bespoke per-deal hand-crafting.

## Existing pieces to build on (verified this session)
`src/app/(app)/transfers/[id]/page.tsx`; `src/components/transfers/onside-brief.tsx` (OnsideBrief, `stateOfPlay`, SourceTrail); `src/lib/rumours/confidence.ts` (`ConfidenceResult.factors`); `src/lib/rumours/stage.ts` (`stageOf`, stage taxonomy); `src/lib/queries/rumours.ts` (RumourItem, getRumourById, getRumourSources); `wire-row.tsx` (feeTone verdict, HERE WE GO badge); follow: `src/lib/rumours/follow-actions.ts` + `notify.ts`; push: `src/lib/push/*` + `push_subscriptions`. Design tokens only; both themes; no FIFA marks; never name the data supplier.

## Open questions for the fresh session (resolve in the full spec)
*(2 of 6 RESOLVED 2026-06-13 from the research pass — see `2026-06-13-evolving-transfer-story-research.md`.)*
1. **Stage-transition history — ✅ RESOLVED (2026-06-13, option b; research doc §6).** Add a lightweight **`rumour_stage_events` ledger** (rumour_id, stage, ts, source). Two needs converge on it: module 3's timeline *and* the **integrity/audit trail** — for a founder employed in pro sports (DC United/MLS), a collapsing rumour or a valuation shift near a deal must leave an auditable, timestamped, transparent trail (gambling-integrity). Module 8's diff also depends on it. (Still to detail in the full spec: how stage events get written — likely from the ingest merge paths that already call `notifyFollowers`.)
2. **Scrollytelling tech** — Framer Motion vs CSS scroll-driven animations vs IntersectionObserver reveals; reuse existing chart components (PerformanceRadar, forecast bars, sparklines) vs new.
3. **"What it means" (module 5) data calcs** — which derived stats (squad-value impact %, signing-rank, position need) are computable from current data vs need new queries.
4. **Which deals get the full treatment** — all rumour detail pages, or a richness threshold (e.g. tier/confidence) gating the heavier modules.
5. **Value trajectory chart** — `valuation_history` table exists but was empty (0 rows) as of launch; check if it's now populated, else use the `spark` array / `player_valuations` only.
6. **SEO — ✅ RESOLVED (2026-06-13; research doc §6 + the "SEO & URL architecture" section above).** Permanent date-free route (already met by `/transfers/[id]`) + `LiveBlogPosting` JSON-LD + paired-update discipline → Google Top Stories during windows. (Still to confirm in the full spec: per-saga OG-image treatment.)
