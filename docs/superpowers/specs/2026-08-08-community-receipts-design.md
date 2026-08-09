# Onside Community — receipts as the argument (design)

**Date:** 2026-08-08
**Status:** Design APPROVED by Perez. Ready for implementation plan.
**Repo:** `~/onside-b2c`
**Related:** `2026-06-15-receipts-reputation-design.md` (the scoring engine this builds on), `[[onside-community-engagement]]`, the 2026-08-08 virality study.

## The product in one exchange

> **@perez:** Called it in July.
> **@randomfan:** I don't see your evidence.

That is the whole feature. Onside can settle that argument; Reddit structurally cannot. Every design decision below serves that moment.

## Why not a forum

A general per-club forum competes with Reddit head-on — r/reddevils has ~500k members, established moderators and the habit. We would be asking fans to abandon a working forum for an empty one, and we would inherit a moderation burden with nobody to carry it.

But an opinion here can be **timestamped, locked before the fact, and auto-scored against the house**. On Reddit "Trafford's overpriced" evaporates; here it becomes a receipt with a record attached. So the community primitive is the **call**, not the post — discussion hangs off deals, and receipts decide who gets taken seriously.

**Decided (Perez):** anyone may comment; non-callers are visibly marked "No call on record". A locked door would be purer but is a cold-start killer — an empty room with a bouncer. The tag is a *stronger* prompt to call than a gate, because the user feels it first and the fix is one tap away.

## What already exists (do not rebuild)

| Piece | State |
|---|---|
| Calls, scoring, reputation rollup | ✅ `predictions` + `reputation` tables live; divergence-weighted, earliness-multiplied, volume-gated |
| `CallChip` on deal pages | ✅ shipped |
| Per-deal discussion | ✅ `rumour_comments` + `DiscussionThread` on `/transfers/[id]` |
| Private record page | ✅ `/record` |
| Usernames | ⚠️ `profiles.username` column exists, **0 of 31 populated** |
| `reputation` public read | ✅ policy `reputation readable [SELECT]` |

**Missing, and the whole job:** a public profile, receipts shown inside the argument, and a club page worth landing on.

## 1. Public profile — `/u/[username]`

The evidence surface, and the share destination.

**Contents:** handle, display name, member-since, favourite club; the **record** (W–L, accuracy, current streak, scout badge — all already computed by `aggregateReputation`); and the **call log** — per call: the deal, the side taken, **the house number at lock time**, and the outcome.

**Security — do NOT relax RLS on `profiles`.** That table now carries `stripe_customer_id`, `subscription_status` and `tier`; opening SELECT would leak billing data. Expose a **`public_profiles` view** carrying only `username`, `display_name`, `favourite_club`, `created_at`. Migration required.

**Calls are public from the moment they lock.** That is the point — "I called it *now*". Copying is already handled by the existing scoring: the earliness multiplier decays, so a late copycat scores less. No new mechanism.

**Username claim flow.** A handle is required for a public profile: prompted after signup and available in settings. Users without one have no public page — no generated fallback, and **never** an email-derived handle.

**OG card** per profile, reusing `lib/og.tsx` — this is the share artefact the virality study identified as the single uncopyable viral asset.

## 2. Receipts inside the argument

`DiscussionThread` gains one line under each comment author:

```
@perez        Called WILL · house said 31% · 3 Aug     14–6 · 70%
@randomfan    No call on record
```

Implementation is a join, not a feature: `predictions` keyed by `(subject_id, profile_id)` for the comment authors on that deal. Author names link to `/u/…`. This is the cheapest item in the design and the one that carries the product.

## 3. Club page — the front door

Today `/clubs/[id]` is a squad-value header and a "Full squad" table. It becomes:

1. **Live deals for this club** — ranked by argument (comments + calls), each with confidence, fee-vs-value and a call chip.
2. **Your club's window** — net spend vs our valuation; biggest overpay and biggest bargain.
3. **Club leaderboard** — the best callers *of this club's deals*. **Club-scoped, never global:** global boards reward the top 1% and depress everyone else, while a club board is small, tribal and winnable.
4. Squad table — kept, demoted.

## Decisions

- **Favourite players: CUT from v1.** The only available source is the watchlist, collected as a *private* tracking tool; republishing it publicly is a context collapse (privacy is breached by the flow, not the data type). It would also be empty — only 3 of 31 profiles have any watchlist rows — and an empty section on the keystone page is the day-1 failure mode. Revisit only as an explicit, opt-in, separately-collected field.
- **Favourite club: KEEP.** Load-bearing, not decoration — it powers the club leaderboard and "your club's window", costs one declaration at signup, and tribal identity is the mechanism that drives return visits.
- **Anyone can comment**, non-callers marked (above).
- **Club-scoped leaderboards only.**

## Scope

- **IN (v1):** `public_profiles` view + migration; username claim flow; `/u/[username]` with record, call log and OG card; receipts inside `DiscussionThread`; club page rebuild with live deals, window summary and club leaderboard; `favourite_club` on profiles.
- **OUT:** free-standing club threads (no anchor, needs moderation we cannot staff); global leaderboards; Reddit OAuth/sync (Phase 3, behind a ToS review); favourite players; DMs; following other users.

## Build order (hard dependency)

1. **Public profile** — everything else links to it.
2. **Receipts in the thread** — needs profiles to link to.
3. **Club page rebuild** — needs profiles for the leaderboard.

## Open questions for the plan

1. **Username rules** — length, charset, reserved words, case-insensitive uniqueness, and whether changing a handle is allowed (breaks shared links; leaning: allow once, keep the old as a redirect).
2. **Existing 31 profiles** — prompt on next sign-in, or a one-off email? Leaning in-app prompt only; no unsolicited mail.
3. **Favourite club capture** — signup step vs a prompt on first club-page visit. Leaning the latter: it is in context and skippable.
4. **Club leaderboard minimum** — how many callers before a club board is shown at all, so it never renders as a list of one.
5. **`predictions` RLS** — confirm public SELECT is allowed for locked/settled calls; the receipt has to be readable by strangers for the whole feature to work.
