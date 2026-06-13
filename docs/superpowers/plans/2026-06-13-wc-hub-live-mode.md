# WC Hub Live-Mode Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/worldcup` reflect the live tournament — replace the dead countdown with the current matchday, lead with today's fixtures + top-valued "players to watch" above the squads grid, make Schedule the primary CTA, and add breadcrumbs to the WC subpages.

**Architecture:** The hub stays a server component under ISR. A pure `matchdaySlate` helper (extending the existing `wc-day.ts`) picks the lead slate (today's fixtures, else the next calendar day's). A single bounded `getWatchPlayers` query fetches the top-valued players for just the slate's teams. A new `MatchdaySlate` server component renders the section; a tiny `WcBreadcrumb` goes on the subpages.

**Tech Stack:** Next 16 (App Router, server components, ISR), TypeScript, Tailwind 4 design tokens, Supabase reads via `src/lib/queries`, vitest (`src/**/*.test.ts`, node env). Reuses `wc-day.ts` (`todaysFixtures`, `dayKey`), `getWcFixtures`, `CodeTile`, `nationCode`, `getNationalTeamBySlug` patterns.

**Branch:** `feat/sportmonks-integration`. Commit after each task. **No deploy until Perez's word.**

**Verified facts (2026-06-13):**
- `wc-day.ts` already exports `todaysFixtures(fixtures, now)` and has a module-private `dayKey(d)` (ET, "en-CA" YYYY-MM-DD) + hoisted `etDayFmt`.
- `roundLabel` currently lives privately in `src/app/(app)/worldcup/schedule/page.tsx:27` as `(r) => r?.match(/Group Stage - (\d)/) ? "Matchday $1" : (r ?? "Fixtures")`.
- `WcFixture` (from `@/lib/queries`): `id, kickoff: string|null, round: string|null, status: "scheduled"|"live"|"finished"|"postponed", venue, city, home/away: {slug,name}, scoreHome/scoreAway: number|null, forecast: Forecast|null, live: Forecast|null, verdict: ForecastVerdict|null`. `Forecast = {home,draw,away: number(%), edge}`. `ForecastVerdict = {predicted, predictedPct, actual, hit}`.
- `getNationalTeamBySlug` fetches squad via `national_teams → national_team_squads(players(...)) ` nested select; maps with `toPlayerListItem(p, now)` and sorts by `val` desc. `PlayerListItem` has `slug, displayName, val (millions), pos`.
- `worldcup/page.tsx`: server component, `revalidate = 3600`, computes `daysToKickoff` from `const KICKOFF = new Date("2026-06-11T00:00:00Z")` (line 17, 33). Hero stat block at ~line 100-103; CTAs at ~line 114-129 (View all groups primary, Match schedule + Projected bracket outline, "Kicks off 11 June 2026" pill). "Most valuable squads" `SectionHead` + grid begins ~line 131.
- Subpage wrappers: schedule `<div className="max-w-[1100px] mx-auto px-6 py-8">` (line 198); groups `<div className="max-w-[1440px] mx-auto px-6 py-8">` (line 66); bracket (the main return ~line 106).

---

### Task 1: Extract `roundLabel` + add `matchdaySlate` to `wc-day.ts`

**Files:**
- Modify: `src/lib/wc-day.ts`
- Test: `src/lib/wc-day.test.ts` (extend existing)
- Modify: `src/app/(app)/worldcup/schedule/page.tsx` (import `roundLabel` from wc-day instead of local def)

- [ ] **Step 1: Write the failing tests** (append to `src/lib/wc-day.test.ts`)

```ts
import { roundLabel, matchdaySlate } from "./wc-day";

const sf = (kickoff: string | null, status: "scheduled" | "live" | "finished" | "postponed", round: string | null) =>
  ({ kickoff, status, round });

describe("roundLabel", () => {
  it("maps group-stage rounds to Matchday N", () => {
    expect(roundLabel("Group Stage - 1")).toBe("Matchday 1");
    expect(roundLabel("Group Stage - 3")).toBe("Matchday 3");
  });
  it("passes through knockout round names; falls back to Fixtures", () => {
    expect(roundLabel("Round of 16")).toBe("Round of 16");
    expect(roundLabel(null)).toBe("Fixtures");
  });
});

describe("matchdaySlate", () => {
  const NOW = new Date("2026-06-12T18:00:00Z"); // ET Jun 12

  it("returns today's fixtures with the matchday label when there are any today", () => {
    const a = sf("2026-06-12T16:00:00Z", "finished", "Group Stage - 1");
    const b = sf("2026-06-13T01:00:00Z", "scheduled", "Group Stage - 1"); // 9pm ET Jun 12
    const tomorrow = sf("2026-06-13T16:00:00Z", "scheduled", "Group Stage - 1");
    const s = matchdaySlate([a, b, tomorrow], NOW);
    expect(s.isToday).toBe(true);
    expect(s.label).toBe("Matchday 1");
    expect(s.fixtures).toEqual([a, b]);
  });

  it("falls back to the next calendar day's fixtures when today has none", () => {
    const d1 = sf("2026-06-14T16:00:00Z", "scheduled", "Group Stage - 2");
    const d1b = sf("2026-06-14T20:00:00Z", "scheduled", "Group Stage - 2");
    const d2 = sf("2026-06-15T16:00:00Z", "scheduled", "Group Stage - 2");
    const s = matchdaySlate([d1, d1b, d2], NOW);
    expect(s.isToday).toBe(false);
    expect(s.label).toBe("Matchday 2");
    expect(s.fixtures).toEqual([d1, d1b]); // only the next day with fixtures, not the whole round
  });

  it("is empty when there are no fixtures at all", () => {
    expect(matchdaySlate([], NOW)).toEqual({ label: "", isToday: false, fixtures: [] });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/wc-day.test.ts`
Expected: FAIL — `roundLabel`/`matchdaySlate` not exported.

- [ ] **Step 3: Implement in `src/lib/wc-day.ts`**

Add (the file already has `dayKey`, `todaysFixtures`, `DayFixture`):

```ts
/** "Group Stage - 1" → "Matchday 1"; otherwise the round name (or "Fixtures"). */
export function roundLabel(round: string | null): string {
  const m = round?.match(/Group Stage - (\d)/);
  return m ? `Matchday ${m[1]}` : (round ?? "Fixtures");
}

export interface MatchdaySlate<T> {
  label: string;
  isToday: boolean;
  fixtures: T[];
}

/** The hub's lead slate: today's fixtures (ET), else the next calendar day (ET) that has fixtures. */
export function matchdaySlate<T extends DayFixture & { round: string | null }>(
  fixtures: T[],
  now: Date,
): MatchdaySlate<T> {
  const today = todaysFixtures(fixtures, now);
  if (today.length > 0) {
    return { label: roundLabel(today[0].round), isToday: true, fixtures: today };
  }
  const upcoming = fixtures
    .filter((f) => f.kickoff && new Date(f.kickoff).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.kickoff ?? 0).getTime() - new Date(b.kickoff ?? 0).getTime());
  if (upcoming.length === 0) return { label: "", isToday: false, fixtures: [] };
  const nextDay = dayKey(new Date(upcoming[0].kickoff as string));
  const slate = upcoming.filter((f) => dayKey(new Date(f.kickoff as string)) === nextDay);
  return { label: roundLabel(slate[0].round), isToday: false, fixtures: slate };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/wc-day.test.ts`
Expected: PASS (existing + new).

- [ ] **Step 5: Point the schedule page at the shared `roundLabel`**

In `src/app/(app)/worldcup/schedule/page.tsx`: delete the local `function roundLabel(...)` (line ~27-30) and add `roundLabel` to the existing `@/lib/wc-day` import if present, else add `import { roundLabel } from "@/lib/wc-day";`. (The page already imports `getWcFixtures`/`WcFixture` from `@/lib/queries` and may import from wc-day — check; add the named import.)

- [ ] **Step 6: Verify build + full suite**

Run: `npm run build 2>&1 | tail -4` — compiles. `npx vitest run` — all green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/wc-day.ts src/lib/wc-day.test.ts "src/app/(app)/worldcup/schedule/page.tsx"
git commit -m "feat(wc-hub): roundLabel + matchdaySlate helpers (shared with schedule)"
```

---

### Task 2: `getWatchPlayers` query

**Files:**
- Modify: `src/lib/queries/index.ts`

- [ ] **Step 1: Add the query**

Mirror `getNationalTeamBySlug`'s nested select, but for many teams in one call, returning the top-`perTeam` value-sorted players per team. Read `getNationalTeamBySlug` (in the same file) for the exact nested-select string, the `PlayerRowDB` type, and `toPlayerListItem` — reuse them verbatim.

```ts
/** Top-valued players for a set of national teams, in ONE query. Keyed by team slug.
 *  Powers the WC hub "players to watch" strips — bounded to the current slate's teams. */
export async function getWatchPlayers(teamSlugs: string[], perTeam = 2): Promise<Record<string, PlayerListItem[]>> {
  if (teamSlugs.length === 0) return {};
  const { data, error } = await readDb()
    .from("national_teams")
    .select(
      "slug, national_team_squads(players(id,slug,name,position,age, clubs(slug,name,short_name, leagues(slug,name)), player_valuations(value_eur)))",
    )
    .in("slug", teamSlugs);
  if (error || !data) return {};
  const now = new Date();
  const out: Record<string, PlayerListItem[]> = {};
  for (const row of data as never as Array<{ slug: string; national_team_squads: Array<{ players: PlayerRowDB | null }> }>) {
    const players = (row.national_team_squads ?? [])
      .map((s) => s.players)
      .filter((p): p is PlayerRowDB => p !== null)
      .map((p) => toPlayerListItem(p, now))
      .sort((a, b) => b.val - a.val)
      .slice(0, perTeam);
    out[row.slug] = players;
  }
  return out;
}
```

If `PlayerRowDB`/`toPlayerListItem` are imported from `./map` in this file already, reuse those imports; otherwise import them the same way `getNationalTeamBySlug` does.

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -4` — compiles (the nested select + types match `getNationalTeamBySlug`).
Run: `npx vitest run` — green (no new tests; this is a thin query verified by build + manual QA, consistent with the other `get*` queries).

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/index.ts
git commit -m "feat(wc-hub): getWatchPlayers — top-valued players per team, one bounded query"
```

---

### Task 3: `WcBreadcrumb` + add to the three subpages

**Files:**
- Create: `src/components/worldcup/WcBreadcrumb.tsx`
- Modify: `src/app/(app)/worldcup/schedule/page.tsx`, `groups/page.tsx`, `bracket/page.tsx`

- [ ] **Step 1: Create the breadcrumb**

```tsx
// src/components/worldcup/WcBreadcrumb.tsx
import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";

/** Back-nav for the WC subpages: "World Cup › {current}". */
export function WcBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-mute-soft mb-4">
      <Link href="/worldcup" className="inline-flex items-center gap-1 hover:text-acc transition">
        <Trophy size={12} /> World Cup
      </Link>
      <ChevronRight size={12} className="opacity-50" />
      <span className="text-mute">{current}</span>
    </nav>
  );
}
```

- [ ] **Step 2: Add it to each subpage** as the first child inside the main page wrapper div (the `max-w-[...] mx-auto px-6 py-8` container):
  - `schedule/page.tsx` (wrapper at line ~198): `<WcBreadcrumb current="Schedule" />`
  - `groups/page.tsx` (wrapper at line ~66): `<WcBreadcrumb current="Groups" />`
  - `bracket/page.tsx` (main wrapper): `<WcBreadcrumb current="Bracket" />`
  Add `import { WcBreadcrumb } from "@/components/worldcup/WcBreadcrumb";` to each. Place the breadcrumb above each page's existing heading block.

- [ ] **Step 3: Verify**

Run: `npm run build 2>&1 | tail -4` — compiles. `npx vitest run` — green.
Manual: each subpage shows "World Cup › X" linking back to `/worldcup`.

- [ ] **Step 4: Commit**

```bash
git add src/components/worldcup/WcBreadcrumb.tsx "src/app/(app)/worldcup/schedule/page.tsx" "src/app/(app)/worldcup/groups/page.tsx" "src/app/(app)/worldcup/bracket/page.tsx"
git commit -m "feat(wc-hub): breadcrumbs on schedule/groups/bracket subpages"
```

---

### Task 4: `MatchdaySlate` section component

**Files:**
- Create: `src/components/worldcup/MatchdaySlate.tsx`

- [ ] **Step 1: Create the component**

A server component rendering the matchday header + a compact fixture row per match + the per-fixture "players to watch" chips. Reuses `CodeTile`, `nationCode`, design tokens. Forecast rendering is compact (favorite + verdict), NOT the full schedule `ForecastBar`.

```tsx
// src/components/worldcup/MatchdaySlate.tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHead, Card } from "@/components/ui";
import { CodeTile } from "./CodeTile";
import { nationCode } from "./nation-code";
import type { WcFixture } from "@/lib/queries";
import type { PlayerListItem } from "@/lib/queries/map";

const ET = "America/New_York";
const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: ET }).format(new Date(iso));

/** Compact result/time + Onside line for one fixture. */
function resultLine(f: WcFixture, homeCode: string, awayCode: string): React.ReactNode {
  if (f.status === "finished" && f.verdict) {
    return (
      <span className={cn("text-[10px] uppercase tracking-[0.12em] font-bold num", f.verdict.hit ? "text-up" : "text-mute")}>
        {f.verdict.hit ? "✓ Onside called it" : "✗ Against the call"}
      </span>
    );
  }
  const fc = f.status === "live" ? f.live : f.forecast;
  if (!fc) return null;
  const fav = fc.home >= fc.away ? `${homeCode} ${fc.home}%` : `${awayCode} ${fc.away}%`;
  return <span className="text-[10.5px] text-mute-soft num">Onside: {fav}</span>;
}

function scoreOrTime(f: WcFixture): string {
  if (f.status === "scheduled") return f.kickoff ? fmtTime(f.kickoff) : "TBD";
  return `${f.scoreHome ?? 0}–${f.scoreAway ?? 0}`;
}

function WatchChips({ players }: { players: PlayerListItem[] }) {
  if (players.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {players.map((p) => (
        <Link
          key={p.slug}
          href={`/players/${p.slug}`}
          className="inline-flex items-center gap-1 rounded-md bg-overlay/5 border border-line px-2 py-1 text-[11px] text-mute hover:text-fg hover:border-mute transition"
        >
          <span className="truncate max-w-[110px]">{p.displayName}</span>
          <span className="num text-acc">€{p.val.toFixed(0)}M</span>
        </Link>
      ))}
    </div>
  );
}

export function MatchdaySlate({
  label,
  isToday,
  fixtures,
  watch,
}: {
  label: string;
  isToday: boolean;
  fixtures: WcFixture[];
  watch: Record<string, PlayerListItem[]>;
}) {
  if (fixtures.length === 0) return null;
  return (
    <section className="mb-12">
      <SectionHead eyebrow={isToday ? `${label} · today` : `${label} · up next`} title="Match centre" action={
        <Link href="/worldcup/schedule" className="inline-flex items-center gap-1 text-[12px] text-acc hover:underline">
          Full schedule <ArrowRight size={12} />
        </Link>
      } />
      <div className="grid gap-2">
        {fixtures.map((f) => {
          const homeCode = nationCode(f.home.slug, f.home.name);
          const awayCode = nationCode(f.away.slug, f.away.name);
          const live = f.status === "live";
          return (
            <Card key={f.id} className={cn("p-4", live && "border-acc/40")}>
              <div className="flex items-center gap-3">
                <Link href={`/worldcup/teams/${f.home.slug}`} className="flex items-center gap-2 flex-1 min-w-0 justify-end group">
                  <span className="text-[13px] font-medium truncate group-hover:text-acc transition text-right">{f.home.name}</span>
                  <CodeTile slug={f.home.slug} name={f.home.name} size={24} />
                </Link>
                <div className="shrink-0 text-center min-w-[68px]">
                  <div className={cn("num text-[14px] font-bold", live ? "text-fg" : "text-mute")}>{scoreOrTime(f)}</div>
                  {live && <span className="text-[9px] uppercase tracking-wider text-acc font-bold">Live</span>}
                </div>
                <Link href={`/worldcup/teams/${f.away.slug}`} className="flex items-center gap-2 flex-1 min-w-0 group">
                  <CodeTile slug={f.away.slug} name={f.away.name} size={24} />
                  <span className="text-[13px] font-medium truncate group-hover:text-acc transition">{f.away.name}</span>
                </Link>
              </div>
              <div className="mt-2 flex items-center justify-center">{resultLine(f, homeCode, awayCode)}</div>
              {(watch[f.home.slug]?.length || watch[f.away.slug]?.length) ? (
                <div className="mt-3 pt-3 border-t border-line">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-mute-soft num mb-2">Players to watch</div>
                  <div className="flex items-start justify-between gap-3">
                    <WatchChips players={watch[f.home.slug] ?? []} />
                    <WatchChips players={watch[f.away.slug] ?? []} />
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -4` — compiles. `npx vitest run` — green.

- [ ] **Step 3: Commit**

```bash
git add src/components/worldcup/MatchdaySlate.tsx
git commit -m "feat(wc-hub): MatchdaySlate section — compact fixtures + players to watch"
```

---

### Task 5: Hero live-mode + wire the slate into the hub

**Files:**
- Modify: `src/app/(app)/worldcup/page.tsx`

- [ ] **Step 1: Load fixtures + watch players, compute the slate**

At the top of `src/app/(app)/worldcup/page.tsx`:
- Add imports: `import { getWcFixtures, type WcFixture } from "@/lib/queries";` (extend the existing `@/lib/queries` import), `import { matchdaySlate } from "@/lib/wc-day";`, `import { getWatchPlayers } from "@/lib/queries";`, `import { MatchdaySlate } from "@/components/worldcup/MatchdaySlate";`.
- Remove `const KICKOFF = new Date("2026-06-11T00:00:00Z");` and the `const daysToKickoff = ...` line.
- In the function body (after `nations` is loaded), add:

```tsx
  let fixtures: WcFixture[] = [];
  try {
    fixtures = await getWcFixtures();
  } catch (e) {
    console.error("[worldcup] fixtures unavailable:", e);
  }
  const slate = matchdaySlate(fixtures, new Date());
  const slateSlugs = [...new Set(slate.fixtures.flatMap((f) => [f.home.slug, f.away.slug]).filter(Boolean))];
  const watch = slateSlugs.length ? await getWatchPlayers(slateSlugs).catch(() => ({})) : {};
```

- [ ] **Step 2: Replace the dead countdown with the matchday indicator**

Replace the hero stat block (the `<div className="text-center"><div className="display text-[48px] num text-acc leading-none">{daysToKickoff}</div><div ...>Days to kickoff</div></div>`) with:

```tsx
            <div className="text-center">
              <div className="display text-[28px] num text-acc leading-none">{slate.label || "World Cup"}</div>
              <div className="text-[11px] text-mute-soft uppercase tracking-wider mt-1">{slate.isToday ? "Today" : slate.label ? "Up next" : "2026"}</div>
            </div>
```

- [ ] **Step 3: Reorder CTAs + drop the date pill**

Replace the CTA block so Match schedule is primary and the "Kicks off 11 June 2026" span is removed:

```tsx
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Link href="/worldcup/schedule">
              <Button kind="primary" icon={<Calendar size={14} />}>Match schedule</Button>
            </Link>
            <Link href="/worldcup/groups">
              <Button kind="outline" icon={<Globe size={14} />}>View all groups</Button>
            </Link>
            <Link href="/worldcup/bracket">
              <Button kind="outline" icon={<Trophy size={14} />}>Projected bracket</Button>
            </Link>
          </div>
```

- [ ] **Step 4: Render the slate above "Most valuable squads"**

Immediately AFTER the hero `</div>` (the `rounded-2xl ... mb-8` hero block close) and BEFORE the `<SectionHead eyebrow="Squad values" title="Most valuable squads" ...>`, insert:

```tsx
      <MatchdaySlate label={slate.label} isToday={slate.isToday} fixtures={slate.fixtures} watch={watch} />
```

- [ ] **Step 5: Verify**

Run: `npm run build 2>&1 | tail -6` — compiles, no type errors. `npx vitest run` — all green.
Manual (dev, both themes, desktop + 390px): hero shows the matchday (not "0 days to kickoff"), no "Kicks off 11 June" pill, Match schedule is the primary button; a Match-centre section with today's (or next day's) fixtures + forecasts + "players to watch" chips renders ABOVE the squads grid; chips link to player pages; team tiles link to team pages.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/worldcup/page.tsx"
git commit -m "feat(wc-hub): live matchday hero + match-centre slate above squads; Schedule primary CTA"
```

---

### Task 6: Full verification

**Files:** none.

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: ALL green (existing + the new wc-day cases).

- [ ] **Step 2: Build gate**

Run: `npm run build 2>&1 | tee /tmp/wchub-build.log | tail -3; grep -q "Failed to type check\|Failed to compile" /tmp/wchub-build.log && echo "GATE: FAIL" || echo "GATE: OK"`
Expected: `GATE: OK`.

- [ ] **Step 3: Manual QA checklist (dev, both themes, 1280px + 390px)**

- `/worldcup` hero: shows current Matchday (e.g. "Matchday 1 · Today"), NO "0 days to kickoff", NO "Kicks off 11 June 2026" pill. Match schedule = primary CTA.
- Match-centre section renders above "Most valuable squads": today's fixtures (or next day's if none today) with time/score, compact Onside forecast / "✓ Onside called it" verdict, and 2 players-to-watch per side linking to `/players/{slug}`; team tiles link to `/worldcup/teams/{slug}`; "Full schedule →" links to `/worldcup/schedule`.
- `/worldcup/schedule`, `/groups`, `/bracket`: each shows "World Cup › X" breadcrumb linking back.
- Empty-resilience: if fixtures fail to load, the section is omitted and the rest of the hub renders (no crash).
- Both themes legible; 390px layout holds (fixture rows + chips wrap cleanly).

- [ ] **Step 4: Report + stop (no deploy without Perez's word).**
