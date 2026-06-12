# Onside Pro — Monetization v1

**Principle:** credibility is free, personalization is paid. The data layer (Wire, tables,
profiles, valuations, match centres) stays open — it is the growth engine and the SEO
surface. What people pay for is Onside knowing THEM: their deals, their players, their
questions, first.

## The tiers

### Free (forever)
- Everything read-only: Wire, valuations, tables, match centres, compare, leaderboards
- Ask Onside: **10 questions/day**
- My Market: **3 tracked deals + 10 watchlist players**
- The Board: weekly edition (Sundays)

### Onside Pro — $5.99/mo · $49/yr
- **Ask Onside unlimited** (and Pro models first as they upgrade)
- **My Market unlimited** — every deal tracked, instant in-app alerts
- **The Board Pro cadence** — Deadline-Day live editions + window morning briefs
- **Early access** — new features ship Pro-first for 2 weeks
- Pro badge on discussions

Anchors: Scoutsland charges €4.99/€9.99 for less (no valuations, no rumour engine).
We price between their tiers with a categorically stronger product.

## What we deliberately do NOT gate
- The Wire and confidence scores (trust must be free to compound)
- Compare (shareable head-to-heads are acquisition, not retention)
- Live scores/standings (table stakes)

## Wiring (already half-built)
- `profiles.tier` column EXISTS (default Free) + `TierPill` component exists
- Gates: Ask route quota check reads tier; follow-action cap reads tier; digest cadence per tier
- Stripe Checkout + customer portal; webhook → `profiles.tier`
- Instrumentation live today: `track("board_subscribed")`, `track("deal_tracked")` — add
  `ask_question`, `paywall_view`, `upgrade_click` before launch

## Sequencing (the important part)
1. **Now → Jun 27 (group stage): NO paywall.** Maximize accounts, tracked deals, Board list.
2. **Jun 27–Jul 5:** soft-launch Pro (quota nudges only — never block reads). Founding-member
   price $39/yr for the first 500.
3. **Deadline-day Sep 1:** the Pro cadence proves itself; convert the window cohort.
4. **B2B rail (Q3+):** scout/agency seats off the same data (Scoutsland's €149.99 tier shows
   demand) — sequenced AFTER alignment with the SIOS B2B roadmap to avoid cannibalizing it.

## Honest math
WC traffic → accounts → habits → list. 5k accounts × 4% Pro × $6 ≈ $1.2k MRR as a SEED —
the real revenue events are transfer-window cycles and the B2B rail. The asset being built
in June is the audience, not the MRR.
