# World Cup hub — "live tournament mode" restructure (BACKLOG)

**Captured 2026-06-13 from Perez. Queued AFTER the Here We Go lane + WC goal-push builds.** Not yet brainstormed/spec'd — this is the raw requirement set to design from. Reference: two screenshots Perez sent (the `/worldcup` hub hero, and the `/worldcup/schedule` matchday view).

**Core thesis (Perez's words):** the cup has already kicked off (opener was Jun 11; we're in Matchday 1). The hub still shows a dead "0 DAYS TO KICKOFF" and "Kicks off 11 June 2026" — stale. *"Think what the user is here for."* During the live tournament the hub must lead with the most relevant, immediate info — **the matchday schedule and next fixtures** — front and center, not the evergreen "most valuable squads."

## Requirements

1. **Kill the dead countdown.** Remove the "DAYS TO KICKOFF" counter (the `Countdown`-driven "0" block) from the `/worldcup` hub hero. The tournament is live — a 0-day counter is wrong/stale.
2. **Show the matchday instead.** Replace it with **what matchday it is** (e.g. "Matchday 1", with its date range), so the hero states the live state of the tournament.
3. **Remove the "Kicks off 11 June 2026" pill** next to the hero CTAs — also stale now that it has kicked off.
4. **Reorder the hero CTAs** so **"Match schedule" is the primary/highlighted button** (currently "View all groups" is primary). Schedule is what users want mid-tournament. Groups + Projected bracket become secondary.
5. **Breadcrumbs on the sub-pages.** After clicking View all groups / Match schedule / Projected bracket, show breadcrumb nav so the user can get back (e.g. `World Cup › Schedule`). Applies to `/worldcup/groups`, `/worldcup/schedule`, `/worldcup/bracket`.
6. **Surface the matchday schedule on the hub, above "Most valuable squads."** Right before the user would scroll into the squads section, lead with the **matchday schedule + next fixtures** (the layout in the 2nd screenshot: matchday header, recent results with "✓ ONSIDE CALLED IT" verdicts + forecast %, upcoming fixtures with kickoff times). Brings the immediate/relevant info to the front; the valuable-squads section moves below it.
7. **"Players to watch" per fixture (right-hand side).** Beside each upcoming fixture, a "Players to watch" panel that links directly to individual **player profile pages** — turning fixtures into an entry point to the player/valuation data (same acquisition+education thesis as the WC goal-push notification: a match is the hook, the player page is the payoff).

## Touchpoints (from current code)
- `src/app/(app)/worldcup/page.tsx` — the hub hero (countdown removal, matchday label, CTA reorder) + insert the matchday-schedule section above the squads section.
- `src/components/worldcup/countdown.tsx` — the `Countdown` component currently driving "DAYS TO KICKOFF"; may be retired from the hub or repurposed to a matchday label.
- `src/app/(app)/worldcup/{groups,schedule,bracket}/page.tsx` — add breadcrumbs.
- `src/app/(app)/worldcup/schedule/page.tsx` — already has the matchday + fixtures + "ONSIDE CALLED IT" layout; the hub section should reuse/extract that fixture-row rendering rather than duplicate it.
- Fixture data: `getWcFixtures()` (+ `todaysFixtures`/matchday helpers in `src/lib/wc-day.ts`) already exist. "Players to watch" needs a per-fixture player pick — likely the top-valued players from each squad (national-team squads via `getNationalTeamBySlug`), linking to `/players/[slug]`.

## Observation to verify at build time
The schedule page hero (2nd screenshot) says "The tournament opens at Levi's Stadium … Sat, Jun 13" with its own countdown — but the opener already happened Jun 11. Check whether that "tournament opens" framing is also stale and should become "next match" / matchday framing. Likely the same live-mode fix applies there.
