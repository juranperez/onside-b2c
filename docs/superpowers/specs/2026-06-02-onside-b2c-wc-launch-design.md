# Onside B2C — World Cup Launch Design Spec

**Date:** 2026-06-02
**Owner:** Perez (juranperez) + Claude Code
**Repo:** `juranperez/onside-b2c`
**Deploy:** Vercel project `onside-b2c` (live)
**Status:** Approved in brainstorming; pending written-spec sign-off
**Supersedes/extends:** `ONSIDE B2C/Code/SPEC.md` (Phase 0 prototype spec) — this doc upgrades Phase 0 from a mock-data prototype to a real, production-grade World Cup launch.

---

## 1. Context & Vision

Onside B2C ("Onside Market") is the consumer surface of the Onside football-intelligence company — *"Every player. Every valuation. Live."* It opens the same valuation engine pro clubs pay six figures for to fans, bettors, and "football twitter." It directly takes on Transfermarkt, framed as a **Bloomberg terminal for football talent**.

**The habit loop:** watchlist/portfolio → values move on real events → alerts → debate with "receipts" (track-record accuracy). The launch wedge is the **2026 World Cup** — *"what's your squad worth?"* is the viral entry point, and nation pages are an SEO magnet during the tournament.

This is, by the company's own framing, a **brand + funnel + virality play**, not a near-term revenue line. The MVP therefore optimizes for **signups and sharing**, not monetization.

## 2. Goals & Non-Goals

### Goals
1. Ship a **real, production-grade, scalable core** before World Cup kickoff (June 11, 2026).
2. **Real data, real valuations** — no dummy data anywhere in the launch core.
3. A **viral, SEO-indexed public surface** (players, clubs, leagues, tournament) that can absorb a traffic spike.
4. **Real accounts + watchlist + alerts** — the habit loop, persisted.
5. **Legally clean** for a public consumer product at scale.

### Non-Goals (this launch)
- Payments/charging (entitlements scaffolded, everyone free).
- Community write/forum/receipts.
- AI Coach.
- Deep value-prediction UI.
- Native/PWA app.
- Real Big-5 xG / event-level data (deferred to a funded data deal).

## 3. Hard Constraints

| Constraint | Detail | Consequence |
|---|---|---|
| **Deadline** | World Cup kickoff June 11, 2026 (~9 days from spec date) | Ruthless scope; ship the core production-grade, harden/expand after |
| **FIFA/WC IP** | Official marks/emblem/trophy are sponsor-only (~$65–500M, sold out) | No FIFA logos/branding; **factual text references only** ("the 2026 World Cup"); brand 100% Onside |
| **Crests** | Trademarked per club; data feeds exclude marks; API-Football grants **no image rights** | **Design-led monogram tiles**, no real crests |
| **Player photos** | Photo copyright + likeness; editorial license attainable (~$575/mo Getty/IMAGO) | **Monograms at launch**, editorial photos as immediate fast-follow |
| **Advanced stats** | Big-5 xG/event data not cheaply licensed post-StatsBomb ruling | Honest "limited data" states; never fabricate |
| **Data rights** | "Buy at retail, never pirate" — no scraping in production | Only commercially-licensed sources (API-Football, football-data.org, ASA) |

## 4. Decisions Log (from brainstorming)

1. **Scope:** Viral SEO core + real accounts/watchlist. Defer payments, community, AI Coach.
2. **Data:** Reuse API-Football + free sources (football-data.org, American Soccer Analysis). ~$19–70/mo.
3. **Monetization:** Free launch; entitlements built now so Stripe flips on later with zero rework.
4. **IP — crests & branding:** Fully design-led (monograms, generic tournament naming).
5. **IP — player photos:** Monograms at launch; Getty/IMAGO editorial license as fast-follow.
6. **Priority:** **World Cup hub is the #1 priority** over the watchlist loop if a choice is forced.
7. **Architecture:** B2C runs its **own** ingestion + DB; does **not** wait on the B2B "public API."

## 5. Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Vercel Cron (scheduled jobs)                                    │
│   └─ Ingestion adapters: api-football · football-data.org · ASA  │
│        └─ upsert → Supabase (Postgres), with data_source/fetched │
│             └─ Valuation Engine (pure TS) recomputes values      │
│                  └─ writes player_valuations + valuation_history │
│                       └─ triggers ISR revalidation of pages      │
├────────────────────────────────────────────────────────────────┤
│  Next.js 16 (App Router, RSC)                                    │
│   • Public pages: Server Components read Supabase directly (ISR) │
│   • Auth: NextAuth v5 + Supabase adapter (email/Google/Apple)    │
│   • Mutations: server actions (watchlist, alerts, prefs)         │
│   • Entitlements: tier gate helper (free/plus/pro) — all free    │
│   • Analytics: PostHog · Errors: Sentry                          │
└────────────────────────────────────────────────────────────────┘
```

**Stack (keep current, deployed):** Next.js 16 / React 19 / Tailwind 4 / Recharts / lucide-react.
**Added:** `@supabase/supabase-js`, `next-auth@5`, `@sentry/nextjs`, `posthog-js`, `zod` (validation), `@upstash/ratelimit` or equivalent for public-route limits.

**Why these choices**
- **Supabase as single source of truth** — football data + valuations + user data in one Postgres; SSR reads are fast and cheap; the SPEC's chosen DB.
- **Server Components read DB directly** — no GraphQL/Apollo layer (that's B2B); fewer moving parts, better TTFB, simpler caching.
- **Own ingestion, not B2B API** — decouples the launch from the Futuralis/B2B timeline (the public API doesn't exist).
- **ISR** — public pages are statically served and revalidated when data refreshes; absorbs traffic spikes on Vercel's CDN.

## 6. Data Model (Supabase / Postgres)

Schemas: keep in `public` for launch simplicity; logical grouping below. All football/valuation rows carry `data_source TEXT` and `fetched_at TIMESTAMPTZ` for honest provenance.

**Football**
- `leagues` (id, slug, name, country, tier, season, total_value, club_count)
- `clubs` (id, slug, name, short_name, league_id, country, primary_color, secondary_color, stadium, manager_id, squad_value, founded)
- `players` (id, slug, name, position, age, dob, nationality, club_id, height, foot, shirt_no, data_source, fetched_at)
- `player_stats` (player_id, season, apps, minutes, goals, assists, per90 metrics…, xg nullable, data_source)
- `fixtures` (id, competition, home_id, away_id, kickoff, status, score_home, score_away)
- `transfers` (id, player_id, from_club_id, to_club_id, fee, type, status[confirmed|rumored], date, source, confidence)
- `national_teams` (id, slug, name, confederation, fifa_rank, group_letter, manager_id, squad_value)
- `national_team_squads` (national_team_id, player_id, caps nullable)
- `managers` (id, name, nationality, age, club_id nullable, national_team_id nullable, tenure_start)

**Valuations**
- `player_valuations` (player_id PK, value_eur, pillar_scores JSONB, confidence_pct, band_low, band_high, model_version, computed_at)
- `valuation_history` (player_id, date, value_eur) — daily snapshots; powers charts + the **movers** feed (top |Δ| over 24h)

**User**
- `profiles` (id → auth user, username, display_name, tier[free|plus|pro] default free, created_at)
- `watchlist_items` (profile_id, player_id, added_at, alert_threshold nullable)
- `alerts` (profile_id, player_id, type, condition, active)
- `notifications` (profile_id, type, payload JSONB, read, created_at)
- NextAuth tables: `accounts`, `sessions`, `verification_tokens`

**Indexing:** slug unique indexes; `valuation_history (player_id, date)`; `clubs (league_id)`; `players (club_id)`; movers query backed by a daily materialized delta or indexed window query. RLS on all user tables (profile owns its rows); football/valuation tables are public-read.

## 7. The Onside Valuation Engine

A pure, deterministic TypeScript module (`src/lib/valuation/`) implementing the white-paper methodology. **Real model, labeled estimates** — credibility weapon vs. Transfermarkt's crowdsourcing.

**Inputs:** real player attributes/stats where licensed (age, position, minutes, goals/assists per-90, league, contract years); position-conditional priors fill genuine gaps (and widen the confidence band).

**Computation (sketch, from white-paper synthesis):**
1. Nine pillar scores 0–100 (on-field, market, physical, age, tactical fit, brand, adaptability, scarcity, data-quality), drawn from real stats + position priors.
2. Weighted sum using **position-conditional weight tables** (ST vs GK etc.), sum = 1.
3. Map to euros: `BASE[pos] × LEAGUE_Q[league] × exp(0.045·(score−50)) × ageMult(age,pos) × contractMult(years)`.
4. **Confidence band** from data completeness: `band = value × (1 ± 0.18 / sqrt(dataQuality))` — incomplete data ⇒ wider band, shown honestly.
5. **Daily "Pulse" movement:** mean-reverting geometric walk + event jumps wired to real events (goal +0.5–2%, injury −3–8%, transfer rumor ±2–5%, contract-year tick-down, national-team result ±1–3%); daily |Δ| capped ~10%; reverts toward model value so prices stay sane across the tournament.

**Properties:** deterministic per `player_id` seed (reproducible), bounded (no NaN/blowups), versioned (`model_version`), unit-tested. Surfaced with a public **`/methodology`** page.

## 8. Data Flow

1. **Ingestion (cron):** adapters fetch → validate (zod) → upsert with provenance. Phased to respect rate limits (leagues → clubs → players → stats → fixtures → transfers).
2. **Valuation refresh (post-ingest):** engine recomputes `player_valuations`, appends `valuation_history` snapshot, recomputes movers.
3. **Publish:** ISR revalidates affected public pages.
4. **User actions:** server action writes Supabase (watchlist/alert/prefs); value crossings create `notifications`.

## 9. Honest-Data Policy (non-negotiable)

- **Real where licensed:** stats, fixtures, standings, transfers, contracts, valuations.
- **Honest empty states where not** (e.g. Big-5 xG): "limited data" — never fabricated numbers.
- **No silent mock fallbacks** — empty arrays / "no data yet", never invented placeholders.
- **Design-led imagery:** monogram tiles, initials/illustrations. No real crests/photos at launch.
- **Generic tournament naming:** factual text references only; no FIFA marks.
- **Confidence tied to data completeness** — never display 100% confidence.

## 10. Scope — In / Out (World Cup launch)

**IN (real, shippable core; WC surface prioritized):**
- Real ingestion pipeline + Onside Valuation Engine (every player valued, moving daily)
- **World Cup hub + national teams + groups + bracket** (generically branded) — *flagship/priority*
- Public SEO surface: players (directory + profile), clubs, leagues + league stats, compare, search
- Accounts + onboarding + account/settings (email + Google + Apple)
- Watchlist/portfolio + alerts + in-app notifications (core loop)
- Entitlement scaffolding (tiers visible, all unlocked free)
- Legal pages (privacy, terms, methodology, data-sources) + cookie consent
- Production hardening: caching/ISR, PostHog + Sentry, dynamic OG share cards, performance, a11y

**OUT (immediate fast-follow, scaffolds left in place):** Stripe charging · community write/receipts · AI Coach · prediction depth · real player photos (license teed up) · native/PWA · Big-5 xG.

## 11. Error Handling

- **Provider failure** → retry with backoff; persistent failure ⇒ serve last-good data labeled with freshness; **never 500 a public page**.
- **Rate limits** → phased sync + aggressive caching; backpressure on ingestion.
- **Missing data** → honest empty state.
- **Engine** → bounded math, NaN/zero guards, capped deltas, fail-safe to last-good valuation.
- **Auth/mutation errors** → graceful UI; Sentry capture; **zero PII in logs**.

## 12. Testing Strategy

- **TDD** on valuation engine (pillar math, age curve, euro map, confidence band, Pulse bounds — deterministic seeds) and entitlement gates.
- **Ingestion adapters** tested against **recorded HTTP fixtures** (no live calls in CI).
- **Integration:** signup → add to watchlist → set alert → notification appears.
- **E2E (Playwright):** core journeys (browse player, value moves, add to watchlist, sign up, WC nation page) + **post-deploy smoke**.
- **Gates:** Lighthouse ≥ 90 (perf/SEO), axe a11y clean, mobile verified on all launch screens.

## 13. SEO & Virality (the growth engine)

- **SSG/ISR** every public page; locked human-readable slugs (`/players/jude-bellingham`, `/clubs/manchester-united`, `/world-cup/england`).
- Per-page `<title>`/meta; **JSON-LD** (Person, SportsTeam).
- **Dynamic OG share images** — *"[Nation] squad: €X.XB. What's yours worth?"* — the unit that does the viral work during the tournament.
- Sitemap + robots; canonical URLs.

## 14. Build Sequencing (critical path to a shippable WC core)

1. **Foundation:** repo restructure (clean `lib/data` → `lib/db` + `lib/api`), env, **Supabase project + migrations**, design tokens/fonts confirmed.
2. **Ingestion adapters + first real sync** (api-football · football-data.org · ASA).
3. **Valuation engine + history seeding** (real values for every player).
4. **Minimal public read layer + player/club pages** (ISR + SEO + OG) — enough to support the WC surface.
5. **World Cup hub + nations + groups + bracket** — *priority flagship*.
6. **Leagues + league stats + compare + search** (round out public surface).
7. **Auth + onboarding + account.**
8. **Watchlist + alerts + in-app notifications** (core loop).
9. **Entitlement scaffold** (gated UI, all free).
10. **Hardening:** caching, PostHog + Sentry, legal/consent, perf, a11y.
11. **QA + E2E + load sanity → deploy → monitor.**

Items **1–5 + 7–8 are the must-ship core**; 6/9/10 round out and harden; depth (compare/stats breadth) trims before the WC surface or core loop does.

## 15. Dependencies & Risks

| Item | Owner | Mitigation |
|---|---|---|
| API-Football key (not on local disk; in Railway/Vercel B2B env) | Perez provides to B2C env | Needed at step 2, not blocking now; store location pointer in memory |
| Supabase project creation | Claude Code | New project separate from B2B |
| API call volume vs plan tier | Perez confirm | Phased sync + caching if limited |
| Valuation credibility | Design | `/methodology` + confidence bands + disclaimers; never 100% |
| GDPR at consumer scale | Design | Cookie consent + privacy/terms + data export/delete on account |
| 9-day timeline | Shared | Ship core production-grade; honest status at each checkpoint; extras follow |
| Moderation | N/A launch | No community write at launch — risk removed |

## 16. Open Questions

- API-Football plan tier & exact rate limits (confirm at step 2).
- Domain timing: when does B2C move to a custom domain vs the Vercel URL? (Deferred; not launch-blocking.)
- World Cup squad/group accuracy: use confirmed qualifiers as of June 2026; fill remaining with FIFA-ranking projections, labeled as projected.

---

*This spec is the source of truth for the World Cup launch. The implementation plan (next step) decomposes Section 14 into discrete, sequenced, testable tasks.*
