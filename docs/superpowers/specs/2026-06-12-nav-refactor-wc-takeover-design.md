# Nav refactor + World Cup homepage takeover — design

**Date:** 2026-06-12 (World Cup kickoff day)
**Status:** Approved design, pending implementation plan
**Scope:** Global navigation restructure (desktop + mobile), World Cup–first homepage during the tournament window, Insights consolidation, Compare relocation, SEO safeguards.

## Context

The top nav grew to 9 items during launch week, mixing database nouns (Players, Clubs, Leagues), content surfaces (Discover, Insights), tools (Compare), the AI surface (Ask), and a temporal campaign (World Cup 26) on one hierarchy level. No mobile design pass has ever been done — the mobile nav is a hamburger hiding a flat list of 9 — while World Cup traffic skews heavily mobile. Tournament window: **2026-06-11 → 2026-07-19**.

Decisions made with Perez (2026-06-12):

1. **World Cup:** homepage takeover during the tournament window, tab stays in nav **in first position** with a LIVE badge, plus a global live-score ticker. Demote to Competitions after the final.
2. **Discover/Insights:** fold the Insights index into Discover; report subpages keep their URLs. Nav label becomes "Today".
3. **Mobile:** bottom tab bar ships with this refactor.
4. **Compare:** out of the tab row; contextual entry points + utility icon. Page and shareable URLs stay.

## 1. Desktop header (≥768px)

Left cluster (semantic `header > nav > ul/li`), in order:

```
[Onside.]  World Cup ⟨LIVE⟩  Today  Players  Clubs  Competitions  Transfers  ✨Ask
```

Right cluster: search field (⌘K) · Compare icon button (scale icon → `/compare`) · theme toggle · bell · avatar / Sign in.

- 7 text tabs (down from 9). World Cup keeps the accent treatment; badge text changes `26` → `LIVE`.
- **Label-only renames, zero route churn:** "Today" → `/discover`; "Competitions" → `/leagues`. Page `<title>`/`<h1>` tags keep their existing keyword forms (e.g. "Premier League stats").
- **Config-driven nav:** `NAV_ITEMS` becomes a function of a server-computed `wcWindowActive` boolean (kickoff ≤ now ≤ 2026-07-19). The TopNav client component receives it as a prop — **no `Date.now()` in client render** (React 19 purity rule). When the window closes, the World Cup entry drops out and Today resumes first position with no code change.
- After the final, `/worldcup` remains reachable under Competitions (row/link on `/leagues`).

## 2. World Cup homepage takeover (window-gated)

During the window, `(marketing)/page.tsx` renders a new `WorldCupHero` server component in place of the current generic `HeroSection`:

- **Fixtures-first:** today's matches with kickoff times; live scores during match windows (reuses existing fixture queries; ISR-friendly revalidate).
- **Market angle:** "48 squads, valued live" strip using the existing crest-free `CodeTile`/`nationFlagSrc` system (IP-compliant: factual text references only, no FIFA marks).
- **Two CTAs:** Enter the World Cup hub (`/worldcup`) · Create free account (`/login`).
- Existing `ValueProps`, `MoversPreview`, `SquadsPreview`, `SocialProof`, `PricingTeaser` remain below — the evergreen pitch is one scroll down. After the final the original hero returns automatically (same window flag).

**Global live ticker:** slim strip under the header on both `(marketing)` and `(app)` layouts during match windows. Server-rendered in initial HTML (SEO + no hydration flash). Collapsible via an `X`; dismissal stored in a **cookie** (server-readable), scoped to the day — it reappears next match day.

## 3. Insights folds into Today

- `/insights` (index only) → **301** → `/discover` via `next.config` redirects.
- Report pages keep their URLs untouched: `/insights/undervalued-xi`, `/insights/biggest-movers`, `/insights/accuracy` — these are the SEO assets; only the thin index dies.
- Discover gains a **Reports rail**: four cards — Undervalued XI, Biggest Movers, Accuracy Report, The Board (`/the-board`).
- Nav label: **Today** (route stays `/discover`).

## 4. Compare goes contextual

- Tab removed from primary nav.
- Three entry points: scale-icon button in the right utility cluster (→ `/compare`); a **Compare button on every player profile header** deep-linking `/compare?p=<slug>`; a CmdK action ("Compare players").
- `/compare` page, `?p=` shareable URLs, and legacy `?a/?b` parsing unchanged.

## 5. Mobile bottom tab bar (<768px)

New `BottomNav` client component (rendered from both layout groups), fixed bottom with safe-area inset padding:

```
World Cup · Today · Players · Wire · Ask        (during window)
Today · Players · Wire · Competitions · Ask     (post-final)
```

- Window flag passed as prop from a server parent (same source as desktop).
- Active state from `usePathname`, same token styling as desktop (text-acc active, text-mute idle).
- Layouts get bottom padding (`pb-[calc(56px+env(safe-area-inset-bottom))]` or equivalent) on mobile so the bar never covers content.
- The hamburger **stays** but slims to secondary destinations: Clubs, Compare, Watchlist, Notifications, the report pages, Sign out — plus Competitions during the window (post-final it moves into the bar and leaves the hamburger).

## 6. SEO / routing safeguards

- 301 redirect (`/insights` → `/discover`) in `next.config`; nothing else moves, so nothing else redirects.
- `sitemap.ts`: drop `/insights` index, keep report pages, raise `/worldcup` priority during the window.
- Every nav element is a server-rendered Next `<Link>` (crawlable `href`); ticker and hero render in initial HTML.
- Semantic `<header>` / `<nav>` / `<ul>` / `<li>` skeleton.

## Hard constraints (inherited, do not violate)

- Design tokens only (`bg-ink-*`, `text-acc/mute/...`, `border-line`, Card/Chip/Avatar/Delta/SectionHead); both themes must hold.
- React 19 purity: window/date logic computed server-side and passed as props.
- Never name Sportmonks in UI; no FIFA marks (factual text only); no fabricated data or copy.
- Tests stay green (136+); build-verify greps must fail on type-check failures.
- Deploy only on Perez's explicit word.

## Out of scope (follow-ups)

- Homes for orphan routes (`/stats`, `/free-agents`, `/managers`, `/contracts`, `/community`, `/coach`) — footer/More-menu cleanup after the WC rush.
- Renaming the `/discover` route itself (label-only for now).
- Post-final nav demotion ships with this work via the window flag; no separate change needed.

## Acceptance criteria

1. Desktop nav shows exactly: World Cup (LIVE, first) · Today · Players · Clubs · Competitions · Transfers · Ask; right cluster gains the Compare icon.
2. `/` renders the WorldCupHero during the window (verify with a clock-independent prop, not a mocked system clock in render).
3. `/insights` 301s to `/discover`; the three report URLs return 200 and appear on Discover's Reports rail.
4. Player profile pages show a Compare entry point; `/compare?p=` flows unchanged.
5. At 390px: bottom tab bar visible on all primary pages, no content occluded, hamburger contains the secondary list.
6. Ticker present in server-rendered HTML during match windows; dismissal sets a cookie and survives navigation without flash.
7. All existing tests pass; both themes verified on nav, hero, ticker, and bottom bar.
