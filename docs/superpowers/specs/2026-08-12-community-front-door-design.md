# Onside Community v2 — the front door (design)

**Date:** 2026-08-12
**Status:** Design APPROVED by Perez. Ready for implementation plan.
**Repo:** `~/onside-b2c`
**Builds on:** `2026-08-08-community-receipts-design.md` (v1 — shipped in PR #4), `2026-06-15-receipts-reputation-design.md` (the scoring engine)

## The problem in one sentence

v1 made receipts **exist**. Nothing makes them the thing you **land in**.

Verified 2026-08-11, on the live site:

| Surface | Community presence |
|---|---|
| Homepage — 8 sections (news, hero, ticker, value props, movers, squads, pricing) | none |
| Main nav — World Cup, Ask, News, Today, Players, Clubs, Competitions, Transfers | none |
| `/community` — the one word a person clicks looking for people | a "launching soon" stub |
| `/record` | account menu only, signed-in only |

A logged-out visitor — currently everyone — sees excellent data and no evidence another human exists. And they cannot act: `CallChip` shows *"Sign in to put your call on the record"*. The front door is a wall.

Substrate: **11 calls from 2 people, 2 comments from 1 person, 0 claimed handles, 487 live deals.**

## The core insight

At two users, a feed of **people** is empty. A board of **deals** is full — we have 487, each carrying a house number that is an opinion a stranger can disagree with on arrival.

So the front door is deal-led, not activity-led. Human activity layers on as it appears; it never holds the page up. This is the v1 "you vs the house" cold-start principle, finally used where it matters.

## Decisions

1. **A visitor can call before having an account.** One tap, locked against the house number, claimed on signup. This is the only option that delivers "immersed on arrival" — the alternatives either throw the receipt away or leave the wall standing.
2. **`/community` becomes a board of open calls**, not an activity tape. A tape at 11 calls advertises emptiness more loudly than having no page.
3. **Unclaimed anonymous calls are private.** Invisible to others, absent from every public tally, until an account claims them. On a product whose moat is that receipts are true, a publicly-visible count that anyone can inflate with an incognito window undermines the one thing being sold.
4. **Anonymous calls live in their own table**, merged into `predictions` on signup — not stored as `predictions` with a null `user_id`, and not held client-side.

### Why a separate table

- **Null `user_id` in `predictions`** breaks `unique (user_id, subject_type, subject_id, call_type)` — nulls don't collide in Postgres, so one visitor could hold unlimited calls on the same deal. It also puts unclaimed rows inside a table with a public-read policy and an append-only trigger built around a real user. That weakens exactly what migrations 0005/0006 hardened.
- **Client-side (localStorage)** ends server-authoritative locking. The browser would hold the house number, so a user could edit what they claim the house said. `lockCall` recomputes server-side precisely because the client is never trusted with that snapshot.

## Surfaces

### 1. `/community` — the board

Replaces the `ComingSoon` stub. Rows are live deals: player → club, the house's Confidence %, one-tap Will / Won't.

**Ranking:** argument (calls + comments) first, then **contestedness** — `|50 − confidence|` ascending. A deal the model puts at 51% is an argument worth having; one at 97% is not. With no human activity to sort by, "where is Onside least sure" is the honest proxy for "where is your opinion worth something."

**Anonymous calls must not enter that argument count.** It reads from `predictions` only. Feeding `anon_calls` into it would make a publicly-visible ordering respond to an inflatable signal, which is decision 3 broken by the back door — the ranking is public even though the individual calls are not.

After calling, the row flips to *"You said Won't · the house says 64%"* with a prompt to claim.

Cannot render empty — 487 deals back it.

### 2. Homepage — Call of the Day

One deal, the most contested live one, placed after the hero and before the movers. House number, two buttons. One tap and the visitor is in the conversation before scrolling past the fold.

Today the homepage runs hero → data → data → pricing with nothing to *do*. This is the missing conversion moment.

### 3. Nav — "Community" as a first-class item

It cannot be front and center while absent from the navigation. Keeping the word "Community" rather than inventing one: it is the word people hunt for and what the pricing card already promises.

### 4. `CallChip` gains the same anonymous path

A visitor arriving from a share link must be able to act too — otherwise we fix the front door and leave the side entrance walled.

## Mechanics

**Identity.** Server-set `onside_anon` cookie: httpOnly, SameSite=Lax, Secure, 90 days, random UUID minted on first anonymous call. HttpOnly because the client never needs to read it, and not exposing it means it cannot be forged from the page.

**The lock stays server-authoritative.** An anonymous call runs the same path as a member call — the house Confidence %, value and earliness are all recomputed on the server. Only the identity column written differs. A stranger's browser is trusted no more than a member's.

**Claiming.** On signup a server action reads the cookie, finds unclaimed rows, and inserts them into `predictions` **preserving the original `locked_at`, house snapshot and earliness**. Resetting `locked_at` to signup time would silently destroy "I called it in July", which is the entire value of the receipt. Where the user already has a call on that deal, the existing prediction wins and the anonymous row is discarded. Anon rows are then deleted and the cookie cleared.

**Table.** `anon_calls` — no public read policy at all, service-role only, unique on `(session_id, subject_type, subject_id, call_type)`, plus a per-session rate limit so a script cannot fill it. Private by construction, which is what makes decision 3 enforceable rather than merely intended.

## Failure modes that need explicit handling

- **Cookies blocked.** The call cannot persist. Say so — *"we can't save this unless you sign in"* — rather than appear to work and vanish. A silently dropped receipt is worse than a refused one here.
- **Merge fails during signup.** Signup still succeeds; the merge retries on next visit. A database hiccup must never cost someone their account.
- **Deal resolves while a call is unclaimed.** The anon call is scored on claim using the same resolver, from its preserved lock time — it does not become a free win or a silent loss.

## Scope

**IN (v2):** `anon_calls` table + migration; anonymous call path through the existing lock; claim-on-signup merge; `/community` board replacing the stub; Call of the Day on the homepage; Community in the nav; `CallChip` anonymous path; removal of the `/community/[id]` sub-stub.

**OUT:** the activity tape; global leaderboards; follower graphs; notifications on calls; anything requiring a population we do not have.

## Build order

1. `anon_calls` migration + the anonymous lock path (nothing renders without it)
2. Claim-on-signup merge (must exist before anonymous calls are collectable, or we accrue orphans)
3. `/community` board + nav entry
4. Call of the Day on the homepage
5. `CallChip` anonymous path

## Testing

The contested-ranking function and the merge's conflict resolution are pure and unit-tested — the merge especially, since `locked_at` preservation is silently wrong if broken rather than loudly broken. Existing suite (381 tests, 50 files) stays green.

## Seeding

There is no clever substitute for someone going first. Perez claims a handle and makes the opening calls publicly. This is a launch step, not a build step, but the release is not finished without it.

## Open questions for the plan

1. **Rate limit shape** — per session, per IP, or both, and what threshold. Needs to stop a script without blocking a genuinely engaged first-time visitor.
2. **Call of the Day selection** — recomputed per request, or pinned for a UTC day so that everyone argues about the same deal? Pinning is likely better for shared conversation; it needs a cache key or a stored pick.
3. **Cookie consent** — whether `onside_anon` is functionally necessary (arguably yes: it exists solely to deliver a user-initiated action) or requires a banner under the site's current privacy posture. Check `/privacy` before building.
