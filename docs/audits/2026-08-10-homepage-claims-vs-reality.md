# Homepage claims vs reality — audit

**Date:** 2026-08-10
**Scope:** every claim rendered on `/` (the marketing homepage), checked against the code and the production database (`ygmxxveranmfcobcexon`).
**Method:** claims were read off the *rendered* page, not the JSX, then verified individually. Nothing here is taken from marketing copy or from comments.

## Verdict

Three claims are false as written, one is stale, one overclaims, and six pricing features contradict our own `/pricing` page. The counts are all accurate.

The most serious finding is that **"Live valuations" — the first pillar and the product's central promise — is not what the homepage says it is.** The code is internally honest about this; only the marketing copy overclaims.

---

## Pillar 1 — Live valuations

| Claim | Verdict | Evidence |
|---|---|---|
| "18,756 players tracked" | ✅ True | `count(players)` = 18,756 |
| "523 clubs" | ✅ True | `count(clubs)` = 523 |
| "28 leagues" | ✅ True | `count(leagues)` = 28 |
| "Confidence bands on every player" | ❌ **False** | 11,111 of 18,756 players have a valuation at all (59%). Those that do all carry a band, but 7,645 players have neither. |
| "Ours update every time a player kicks a ball" | ❌ **False** | No match data participates in the displayed value. |
| "Live model valuations, updated continuously" | ❌ **False** | `player_valuations.computed_at` has **2 distinct dates ever**, most recent **2026-06-27** — 44 days before this audit. |
| "12-month valuation history" / "12-month trajectory" | ❌ **False** | `valuation_history` contains **0 rows**. The chart is generated, not recorded. |

### What actually produces the movement

`src/lib/valuation/pulse.ts` computes the displayed value as a deterministic function of player id and calendar day:

```
slow = sin(day/30 + phase) * 0.06      // ±6%  multi-week
med  = sin(day/7  + phase*1.7) * 0.025 // ±2.5% weekly
fast = hash(playerId:day) * 0.018      // ±1.8% daily
value = anchor * clamp(1 + slow + med + fast, 0.7, 1.4)
```

The module's own header says it plainly:

> "Lets values 'move' believably day to day **without live match data**, and never drifts away from the anchor. Labeled as a model estimate."

That is a deliberate, documented product decision, and defensible on its own terms. The problem is only that the homepage describes it as something else. "Every time a player kicks a ball" asserts a causal link to match events that does not exist in the code.

The same function generates the "12-month history" chart on player pages (`src/lib/queries/map.ts:196-201` runs `valueOnDay` backwards over twelve months) and the sparklines in the movers feed (`map.ts:62`). None of it is recorded history. The homepage's "+5.2M this week" figures are waveform output.

**Exposure.** This is the claim a journalist, a competitor, or a club would test first, and it is disprovable from the client bundle alone — `pulse.ts` ships to the browser. "Transfermarkt updates when a community admin remembers, ours update every time a player kicks a ball" invites exactly that comparison, and we would lose it.

---

## Pillar 2 — Community

| Claim | Verdict | Evidence |
|---|---|---|
| "Every prediction you make is on the record" | ✅ True | `predictions` table, server-authoritative lock, public read |
| "Call a wonderkid early, your reputation climbs" | ✅ True | earliness multiplier in `src/lib/receipts/score.ts` |
| "Verified scout reputation — launching soon" | ⚠️ **Stale** | Built and merged in PR #4 — `scout_badge`, `/u/[username]`, thread receipts. Undersells shipped work. |
| "Threads, reputation and receipts arrive with accounts" | ⚠️ Partly | Receipts and reputation: yes. Per-deal discussion: yes. But `/community` is still a `ComingSoon` stub. |

This pillar has flipped from overclaiming to **underclaiming**. It says "launching soon" for something now built.

---

## Pillar 3 — AI Coach

| Claim | Verdict | Evidence |
|---|---|---|
| "Ask in plain English" | ✅ True | `/ask` is live, streaming |
| "get charts, comparison tables and clickable player chips" | ❌ **Overclaim** | `src/components/ask/AskChat.tsx` renders streaming **markdown with inline links**. No chart rendering, no table component, no chips. Clickable player links are real — chips are not. |
| "Natural-language scouting across the full Onside dataset" | ⚠️ Unverified | Not assessed in this pass; needs a separate check of what the tool layer can actually reach. |

---

## Pricing cards contradict `/pricing`

`/pricing` deliberately marks unbuilt features "Coming" — its header comment says so. The homepage cards list the same features with **no status marker at all**.

| Feature on homepage card | `/pricing` says | Reality |
|---|---|---|
| Free · "Community forum" | Coming | `/community` is a `ComingSoon` stub |
| Plus · "Historical valuation graphs" | Coming | not built |
| Plus · "Premium forum badges" | Coming | no forum exists |
| Pro · "Scout-grade exports" | Coming | not built |
| Pro · "Predicted transfers" | Coming | not built |
| Pro · "Read-only API" | Coming | not built |

Six paid-tier features presented as included. This is the finding with the clearest commercial and legal exposure — a user can pay $4 or $20 on the strength of the homepage and find the feature absent, and our own pricing page already concedes it.

---

## Unverifiable business claim

> "The same valuation engine that top-flight clubs pay six figures for — now open to the fans"

Cannot be verified from the codebase, and it is the strongest claim on the page. It needs to be either substantiated by a real contract or softened. The related strapline "Built on the engine clubs already trust" carries the same problem in weaker form.

---

## Landmine: fabricated testimonials still in the file

`SocialProof()` at `src/app/(marketing)/page.tsx:516` holds three invented quotes attributed to plausible-looking handles (`@xG_Pedro`, `@bet_eng`). It is **not rendered**, and a comment at line 56 explains why.

Dead but loaded. One JSX line re-publishes fabricated endorsements. Delete rather than keep commented out.

---

## Recommended fixes, in priority order

1. **Pricing cards** — mark the six unbuilt features "Coming", matching `/pricing`. Smallest change, clearest exposure.
2. **"Every time a player kicks a ball"** — replace with a claim the code supports. The honest version is still strong: a live model estimate with a confidence band on every valued player, moving daily, versus a crowd-sourced number that changes when an admin gets round to it.
3. **"Confidence bands on every player"** → "on every valued player", or state the 11,111 figure.
4. **"12-month valuation history"** — either say "modelled 12-month trajectory", or start writing `valuation_history` and earn the claim.
5. **Community pillar** — drop "launching soon"; it shipped.
6. **AI Coach** — describe what it does (plain-English answers with clickable players), not charts and chips it does not render.
7. **Delete `SocialProof()`.**
8. **"Six figures"** — substantiate or soften. Perez's call; not a code question.

## Not assessed

Whether the valuation model itself is any good. This audit only checked whether the page describes what the code does — not whether the anchor values are accurate.
