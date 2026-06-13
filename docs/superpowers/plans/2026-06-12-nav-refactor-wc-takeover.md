# Nav Refactor + World Cup Homepage Takeover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure global navigation (7 desktop tabs, WC-first, mobile bottom bar), ship a window-gated World Cup homepage hero + global live ticker, fold the Insights index into Discover, and relocate Compare to contextual entry points.

**Architecture:** All date/window logic lives in pure, unit-tested modules (`src/lib/wc-window.ts`, `nav-items.ts`, `wc-day.ts`); server components (layouts, hero, ticker) compute `new Date()` at render time under existing ISR revalidation and pass booleans down as props — no `Date.now()` in client render paths (React 19 purity). Spec: `docs/superpowers/specs/2026-06-12-nav-refactor-wc-takeover-design.md`.

**Tech Stack:** Next 16 (App Router, ISR), React 19, Tailwind 4 design tokens (`bg-ink-*`, `text-acc/mute/...`, `border-line`), Supabase reads via `src/lib/queries`, vitest (node env, `src/**/*.test.ts` only — pure TS modules get tests; UI verified by build + manual QA).

**Branch:** work directly on `feat/sportmonks-integration` (established session pattern). Commit after every task. **No deploy** — that needs Perez's explicit word.

**Existing exports relied on (verified 2026-06-12):**
- `getWcFixtures(): Promise<WcFixture[]>`, `WcFixture` (has `id, kickoff, round, status, home/away {slug,name}, scoreHome, scoreAway`), `FixtureStatus = "scheduled" | "live" | "finished" | "postponed"` — `src/lib/queries/index.ts:627-656`
- `getNationalTeams(): Promise<NationalTeamSummary[]>`, `NationalTeamSummary` (has `slug, name, squadValueM: number`) — `src/lib/queries/index.ts:288-312`
- `nationCode`, `nationFlagSrc`, `nationStyle` — `src/components/worldcup/nation-code.ts`
- `Card` (accepts `className`), `Button` (`kind/size/icon`), `LiveDot` — `src/components/ui`
- Link-wraps-Button CTA pattern — `src/app/(marketing)/page.tsx:92-98`

---

### Task 1: WC tournament window module

**Files:**
- Create: `src/lib/wc-window.ts`
- Test: `src/lib/wc-window.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/wc-window.test.ts
import { describe, it, expect } from "vitest";
import { isWcWindow } from "./wc-window";

describe("isWcWindow", () => {
  it("is false before kickoff day", () => {
    expect(isWcWindow(new Date("2026-06-10T23:59:59Z"))).toBe(false);
  });
  it("is true on kickoff day", () => {
    expect(isWcWindow(new Date("2026-06-11T00:00:00Z"))).toBe(true);
  });
  it("is true mid-tournament", () => {
    expect(isWcWindow(new Date("2026-07-01T12:00:00Z"))).toBe(true);
  });
  it("is true through the final (July 19)", () => {
    expect(isWcWindow(new Date("2026-07-19T23:00:00Z"))).toBe(true);
  });
  it("is false after the final day", () => {
    expect(isWcWindow(new Date("2026-07-20T00:00:01Z"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/wc-window.test.ts`
Expected: FAIL — `Cannot find module './wc-window'` (or equivalent resolve error)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/wc-window.ts
/**
 * 2026 tournament window: kickoff day through the final, inclusive (UTC).
 * Callers compute `new Date()` server-side and pass the boolean down as a
 * prop — never call Date.now() in client render (React 19 purity rule).
 */
export const WC_START_ISO = "2026-06-11T00:00:00Z";
export const WC_END_ISO = "2026-07-19T23:59:59Z";

export function isWcWindow(now: Date): boolean {
  const t = now.getTime();
  return t >= new Date(WC_START_ISO).getTime() && t <= new Date(WC_END_ISO).getTime();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/wc-window.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/wc-window.ts src/lib/wc-window.test.ts
git commit -m "feat(nav): WC tournament window module"
```

---

### Task 2: Nav items config module

**Files:**
- Create: `src/lib/nav-items.ts`
- Test: `src/lib/nav-items.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/nav-items.test.ts
import { describe, it, expect } from "vitest";
import { getNavItems, getBottomNavItems, getSecondaryItems } from "./nav-items";

describe("getNavItems (desktop)", () => {
  it("leads with World Cup during the window, 7 tabs total", () => {
    const items = getNavItems(true);
    expect(items.map((i) => i.label)).toEqual([
      "World Cup", "Today", "Players", "Clubs", "Competitions", "Transfers", "Ask",
    ]);
    expect(items[0]).toMatchObject({ href: "/worldcup", special: true });
    expect(items[6]).toMatchObject({ href: "/ask", ai: true });
  });
  it("drops World Cup post-final, Today resumes first", () => {
    const items = getNavItems(false);
    expect(items.map((i) => i.label)).toEqual([
      "Today", "Players", "Clubs", "Competitions", "Transfers", "Ask",
    ]);
  });
  it("keeps label-only renames on existing routes", () => {
    const items = getNavItems(false);
    expect(items.find((i) => i.label === "Today")?.href).toBe("/discover");
    expect(items.find((i) => i.label === "Competitions")?.href).toBe("/leagues");
  });
  it("never links retired tabs", () => {
    for (const active of [true, false]) {
      const hrefs = getNavItems(active).map((i) => i.href);
      expect(hrefs).not.toContain("/insights");
      expect(hrefs).not.toContain("/compare");
    }
  });
});

describe("getBottomNavItems (mobile)", () => {
  it("is 5 slots, WC-first during the window", () => {
    expect(getBottomNavItems(true).map((i) => i.label)).toEqual([
      "World Cup", "Today", "Players", "Wire", "Ask",
    ]);
  });
  it("swaps WC for Competitions post-final", () => {
    expect(getBottomNavItems(false).map((i) => i.label)).toEqual([
      "Today", "Players", "Wire", "Competitions", "Ask",
    ]);
  });
});

describe("getSecondaryItems (hamburger)", () => {
  it("includes Competitions only during the window (it moves to the bar after)", () => {
    expect(getSecondaryItems(true).map((i) => i.label)).toContain("Competitions");
    expect(getSecondaryItems(false).map((i) => i.label)).not.toContain("Competitions");
  });
  it("always carries Clubs, Compare, Watchlist, Notifications", () => {
    for (const active of [true, false]) {
      const labels = getSecondaryItems(active).map((i) => i.label);
      for (const l of ["Clubs", "Compare", "Watchlist", "Notifications"]) {
        expect(labels).toContain(l);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/nav-items.test.ts`
Expected: FAIL — cannot find module './nav-items'

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/nav-items.ts
/**
 * Single source of truth for global navigation. Pure data — no React, no
 * dates. Callers pass wcActive (computed server-side from isWcWindow).
 * Labels are display-only renames; routes never change (SEO).
 */
export interface NavItem {
  href: string;
  label: string;
  special?: boolean; // accent + LIVE badge (World Cup during the window)
  ai?: boolean; // accent + sparkles (Ask)
}

const WORLD_CUP: NavItem = { href: "/worldcup", label: "World Cup", special: true };
const ASK: NavItem = { href: "/ask", label: "Ask", ai: true };

/** Primary desktop tabs, in render order. WC leads while the tournament runs. */
export function getNavItems(wcActive: boolean): NavItem[] {
  const core: NavItem[] = [
    { href: "/discover", label: "Today" },
    { href: "/players", label: "Players" },
    { href: "/clubs", label: "Clubs" },
    { href: "/leagues", label: "Competitions" },
    { href: "/transfers", label: "Transfers" },
  ];
  return wcActive ? [WORLD_CUP, ...core, ASK] : [...core, ASK];
}

/** Mobile bottom tab bar — exactly 5 slots. */
export function getBottomNavItems(wcActive: boolean): NavItem[] {
  return wcActive
    ? [
        WORLD_CUP,
        { href: "/discover", label: "Today" },
        { href: "/players", label: "Players" },
        { href: "/transfers", label: "Wire" },
        ASK,
      ]
    : [
        { href: "/discover", label: "Today" },
        { href: "/players", label: "Players" },
        { href: "/transfers", label: "Wire" },
        { href: "/leagues", label: "Competitions" },
        ASK,
      ];
}

/** Hamburger (mobile) secondary destinations. */
export function getSecondaryItems(wcActive: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: "/clubs", label: "Clubs" },
    { href: "/compare", label: "Compare" },
    { href: "/watchlist", label: "Watchlist" },
    { href: "/notifications", label: "Notifications" },
  ];
  if (wcActive) items.splice(1, 0, { href: "/leagues", label: "Competitions" });
  return items;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/nav-items.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav-items.ts src/lib/nav-items.test.ts
git commit -m "feat(nav): config-driven nav items with WC window gating"
```

---

### Task 3: Match-day fixture selection module

**Files:**
- Create: `src/lib/wc-day.ts`
- Test: `src/lib/wc-day.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/wc-day.test.ts
import { describe, it, expect } from "vitest";
import { todaysFixtures, tickerFixtures, type DayFixture } from "./wc-day";

// 2026-06-12 in ET spans 04:00Z Jun 12 → 03:59Z Jun 13.
const NOW = new Date("2026-06-12T18:00:00Z");

const fx = (kickoff: string | null, status: DayFixture["status"]): DayFixture => ({ kickoff, status });

describe("todaysFixtures", () => {
  it("keeps only fixtures on the same ET calendar day", () => {
    const todayEarly = fx("2026-06-12T16:00:00Z", "finished");
    const todayLate = fx("2026-06-13T02:00:00Z", "scheduled"); // 10pm ET Jun 12
    const tomorrow = fx("2026-06-13T16:00:00Z", "scheduled");
    const yesterday = fx("2026-06-11T20:00:00Z", "finished");
    const noKickoff = fx(null, "scheduled");
    expect(todaysFixtures([todayEarly, todayLate, tomorrow, yesterday, noKickoff], NOW)).toEqual([
      todayEarly, todayLate,
    ]);
  });
});

describe("tickerFixtures", () => {
  it("orders live > scheduled > finished and caps the list", () => {
    const finished = fx("2026-06-12T14:00:00Z", "finished");
    const live = fx("2026-06-12T17:00:00Z", "live");
    const up1 = fx("2026-06-12T20:00:00Z", "scheduled");
    const up2 = fx("2026-06-12T22:00:00Z", "scheduled");
    const up3 = fx("2026-06-13T01:00:00Z", "scheduled");
    const picks = tickerFixtures([finished, up1, live, up2, up3], NOW, 4);
    expect(picks[0]).toBe(live);
    expect(picks).toHaveLength(4);
    expect(picks).not.toContain(finished);
  });
  it("returns empty when no fixtures today", () => {
    expect(tickerFixtures([fx("2026-06-20T16:00:00Z", "scheduled")], NOW)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/wc-day.test.ts`
Expected: FAIL — cannot find module './wc-day'

- [ ] **Step 3: Write minimal implementation**

The sort in `tickerFixtures` must be stable on kickoff order within each status group; sort by `(statusRank, kickoff)`.

```ts
// src/lib/wc-day.ts
import type { FixtureStatus } from "@/lib/queries";

/** Structural subset of WcFixture that the day/ticker helpers need. */
export interface DayFixture {
  kickoff: string | null;
  status: FixtureStatus;
}

const ET = "America/New_York"; // site-wide match time convention (see worldcup/schedule)
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ET }).format(d); // YYYY-MM-DD

/** Fixtures kicking off on the same ET calendar day as `now`, in input order. */
export function todaysFixtures<T extends DayFixture>(fixtures: T[], now: Date): T[] {
  const today = dayKey(now);
  return fixtures.filter((f) => f.kickoff && dayKey(new Date(f.kickoff)) === today);
}

const STATUS_RANK: Record<FixtureStatus, number> = { live: 0, scheduled: 1, finished: 2, postponed: 3 };

/** Ticker picks: live first, then today's upcoming by kickoff, then finished — capped. */
export function tickerFixtures<T extends DayFixture>(fixtures: T[], now: Date, cap = 4): T[] {
  return [...todaysFixtures(fixtures, now)]
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        new Date(a.kickoff ?? 0).getTime() - new Date(b.kickoff ?? 0).getTime(),
    )
    .slice(0, cap);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/wc-day.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/wc-day.ts src/lib/wc-day.test.ts
git commit -m "feat(wc): match-day fixture selection helpers"
```

---

### Task 4: Shared reports module, kill the Insights index, 301 redirect

**Files:**
- Create: `src/lib/reports.ts`
- Delete: `src/app/(app)/insights/page.tsx` (subroutes `accuracy/`, `biggest-movers/`, `undervalued-xi/` STAY)
- Modify: `next.config.ts`

- [ ] **Step 1: Create the shared reports module**

Copy the `REPORTS` array out of the doomed index page (`src/app/(app)/insights/page.tsx:15-39`) verbatim, typed:

```ts
// src/lib/reports.ts
import { Gauge, TrendingUp, Target, CalendarDays, type LucideIcon } from "lucide-react";

/** Model-grounded editorial reports — surfaced on Today (Discover) and the mobile menu. */
export interface Report {
  href: string;
  title: string;
  dek: string;
  icon: LucideIcon;
}

export const REPORTS: Report[] = [
  {
    href: "/insights/undervalued-xi",
    title: "The Undervalued XI",
    dek: "Where the Onside model sees more than the market — the biggest valuation gaps, position by position.",
    icon: Gauge,
  },
  {
    href: "/insights/biggest-movers",
    title: "This Week's Biggest Movers",
    dek: "Who's rising and falling on the Onside board over the last week, and by how much.",
    icon: TrendingUp,
  },
  {
    href: "/insights/accuracy",
    title: "The Onside Accuracy Report",
    dek: "How the Confidence % performs — the share of rumours we rated highly that were confirmed.",
    icon: Target,
  },
  {
    href: "/the-board",
    title: "The Board — weekly digest",
    dek: "The week's biggest movers and the top rumours, in one place. In your inbox every Monday.",
    icon: CalendarDays,
  },
];
```

- [ ] **Step 2: Delete the index page and add the 301**

```bash
git rm "src/app/(app)/insights/page.tsx"
```

Replace `next.config.ts` content:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Insights index folded into Discover (2026-06 nav refactor). Report
      // subpages (/insights/*) keep their URLs — only the index moved.
      { source: "/insights", destination: "/discover", permanent: true },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 3: Verify**

Run: `npm run build 2>&1 | tail -5`
Expected: build succeeds (no "Failed to type check"). The `/insights` route disappears from the route manifest; `/insights/undervalued-xi`, `/insights/biggest-movers`, `/insights/accuracy` remain.

Run: `npx vitest run`
Expected: all existing tests still PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/reports.ts next.config.ts
git commit -m "feat(insights): fold index into Discover — shared reports module + 301"
```

---

### Task 5: TopNav rewrite (clusters, semantics, Compare icon, slim hamburger) + layouts pass wcActive

**Files:**
- Modify: `src/components/layout/top-nav.tsx` (full rewrite below)
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(marketing)/layout.tsx`

- [ ] **Step 1: Rewrite TopNav**

Replace the entire file with:

```tsx
// src/components/layout/top-nav.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, Bell, Menu, X, Sparkles, Scale } from "lucide-react";
import { OnsideMark } from "@/components/ui/logo";
import { createClient } from "@/lib/db/supabase-browser";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CmdK } from "./CmdK";
import { getNavItems, getSecondaryItems } from "@/lib/nav-items";
import { REPORTS } from "@/lib/reports";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <OnsideMark size={20} />
      <span className="text-[15px] font-bold tracking-[-0.03em] group-hover:text-acc transition">
        Onside<span className="text-up">.</span>
      </span>
    </Link>
  );
}

export function TopNav({ wcActive }: { wcActive: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);

  const navItems = getNavItems(wcActive);
  const secondaryItems = getSecondaryItems(wcActive);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => setUser(data.user ? { email: data.user.email ?? "" } : null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ? { email: session.user.email ?? "" } : null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const sb = createClient();
    await sb.auth.signOut();
    setUser(null);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink-900/80 backdrop-blur-xl">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Logo />
            <nav aria-label="Primary">
              <ul className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[13px] font-medium transition inline-flex items-center gap-1.5",
                          item.special || item.ai
                            ? active
                              ? "text-acc bg-acc/10"
                              : "text-acc hover:bg-acc/10"
                            : active
                              ? "text-fg bg-overlay/5"
                              : "text-mute hover:text-fg hover:bg-overlay/[0.03]"
                        )}
                      >
                        {item.ai && <Sparkles size={12} className="shrink-0" />}
                        {item.label}
                        {item.special && (
                          <span className="text-[9px] font-bold leading-none rounded bg-acc text-ink-950 px-1 py-[3px] num">
                            LIVE
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <form
              action="/search"
              className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg bg-overlay/5 border border-line focus-within:border-mute transition min-w-[200px]"
            >
              <Search size={13} className="text-mute-soft shrink-0" />
              <input
                type="text"
                name="q"
                placeholder="Search players, clubs…"
                autoComplete="off"
                aria-label="Search players, clubs and leagues"
                className="w-full bg-transparent outline-none text-[12px] text-fg placeholder:text-mute-soft"
              />
              <kbd className="text-[9px] num text-mute-soft border border-line rounded px-1 py-0.5 shrink-0">⌘K</kbd>
            </form>
            <CmdK />
            <Link
              href="/compare"
              title="Compare players"
              aria-label="Compare players"
              className="hidden md:block p-2 rounded-lg text-mute hover:text-fg hover:bg-overlay/5 transition"
            >
              <Scale size={16} />
            </Link>
            <ThemeToggle />
            <Link
              href="/notifications"
              className="p-2 rounded-lg text-mute hover:text-fg hover:bg-overlay/5 transition relative"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-acc" />
            </Link>
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/watchlist"
                  title={user.email}
                  className="w-8 h-8 rounded-full bg-acc/20 text-acc grid place-items-center text-[12px] font-bold uppercase"
                >
                  {user.email.slice(0, 1) || "U"}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-[12px] text-mute hover:text-fg transition cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden md:flex items-center h-8 px-3.5 rounded-lg bg-acc text-ink-950 text-[12px] font-semibold hover:bg-acc/90 transition"
              >
                Sign in
              </Link>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="md:hidden p-2 rounded-lg text-mute hover:text-fg hover:bg-overlay/5 transition"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-ink-900 px-4 py-3 space-y-1 fade-in">
          <form
            action="/search"
            onSubmit={() => setMobileOpen(false)}
            className="flex items-center gap-2 h-10 px-3 mb-2 rounded-lg bg-overlay/5 border border-line focus-within:border-mute transition"
          >
            <Search size={15} className="text-mute-soft shrink-0" />
            <input
              type="text"
              name="q"
              placeholder="Search players, clubs…"
              autoComplete="off"
              aria-label="Search"
              className="w-full bg-transparent outline-none text-[14px] text-fg placeholder:text-mute-soft"
            />
          </form>
          {secondaryItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2.5 rounded-lg text-[14px] font-medium transition",
                  active ? "text-fg bg-overlay/5" : "text-mute hover:text-fg"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-[0.14em] text-mute-soft num">Reports</div>
          {REPORTS.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-[14px] font-medium text-mute hover:text-fg transition"
            >
              {r.title}
            </Link>
          ))}
          <div className="border-t border-line pt-2 mt-2">
            {user ? (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  void handleSignOut();
                }}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-mute hover:text-fg transition cursor-pointer"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-[14px] font-semibold text-acc"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
```

Notes: outer element is now semantic `<header>` with `<nav><ul><li>` inside (SEO requirement); the badge text changed `26` → `LIVE`; primary mobile destinations move to the BottomNav (Task 6) so the hamburger lists only secondary items + reports + auth.

- [ ] **Step 2: Pass wcActive from both layouts**

Replace `src/app/(app)/layout.tsx`:

```tsx
import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { AnalyticsIdentity } from "@/components/layout/AnalyticsIdentity";
import { GoogleOneTap } from "@/components/auth/GoogleOneTap";
import { isWcWindow } from "@/lib/wc-window";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Server-computed once per ISR render; clients only ever see the boolean.
  const wcActive = isWcWindow(new Date());
  return (
    <>
      <AnalyticsIdentity />
      <GoogleOneTap />
      <TopNav wcActive={wcActive} />
      <main className="min-h-[calc(100vh-56px)]">{children}</main>
      <Footer />
    </>
  );
}
```

Replace `src/app/(marketing)/layout.tsx`:

```tsx
import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { isWcWindow } from "@/lib/wc-window";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const wcActive = isWcWindow(new Date());
  return (
    <>
      <TopNav wcActive={wcActive} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run build 2>&1 | tail -5` — succeeds, no type errors.
Run: `npx vitest run` — all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/top-nav.tsx "src/app/(app)/layout.tsx" "src/app/(marketing)/layout.tsx"
git commit -m "feat(nav): WC-first 7-tab header, semantic nav, Compare utility icon"
```

---

### Task 6: Mobile bottom tab bar

**Files:**
- Create: `src/components/layout/BottomNav.tsx`
- Modify: `src/app/(app)/layout.tsx`, `src/app/(marketing)/layout.tsx` (render + main padding)

- [ ] **Step 1: Create BottomNav**

```tsx
// src/components/layout/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Trophy, Home, Users, ArrowLeftRight, Sparkles, type LucideIcon } from "lucide-react";
import { getBottomNavItems } from "@/lib/nav-items";

const ICONS: Record<string, LucideIcon> = {
  "/worldcup": Trophy,
  "/discover": Home,
  "/players": Users,
  "/transfers": ArrowLeftRight,
  "/leagues": Trophy,
  "/ask": Sparkles,
};

/** App-style bottom tab bar — mobile only; desktop keeps the top nav. */
export function BottomNav({ wcActive }: { wcActive: boolean }) {
  const pathname = usePathname();
  const items = getBottomNavItems(wcActive);
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-line bg-ink-900/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {items.map((item) => {
          const Icon = ICONS[item.href] ?? Home;
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 pt-2 pb-1.5 text-[10px] font-medium transition",
                  active ? "text-acc" : "text-mute hover:text-fg"
                )}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Render it from both layouts and pad `<main>`**

In `src/app/(app)/layout.tsx`, add the import and change the body to:

```tsx
import { BottomNav } from "@/components/layout/BottomNav";
```

```tsx
      <TopNav wcActive={wcActive} />
      <main className="min-h-[calc(100vh-56px)] pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      <Footer />
      <BottomNav wcActive={wcActive} />
```

In `src/app/(marketing)/layout.tsx` likewise:

```tsx
      <TopNav wcActive={wcActive} />
      <main className="pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      <Footer />
      <BottomNav wcActive={wcActive} />
```

- [ ] **Step 3: Verify**

Run: `npm run build 2>&1 | tail -5` — succeeds.
Manual: `npm run dev`, open http://localhost:3000 at 390px width (devtools) — bar shows `World Cup · Today · Players · Wire · Ask`, active tab is accent-colored, footer content not occluded.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/BottomNav.tsx "src/app/(app)/layout.tsx" "src/app/(marketing)/layout.tsx"
git commit -m "feat(nav): mobile bottom tab bar with safe-area handling"
```

---

### Task 7: Global live-score ticker

**Files:**
- Create: `src/components/layout/LiveTicker.tsx` (server)
- Create: `src/components/layout/TickerClose.tsx` (client: dismiss + cookie re-hide)
- Modify: both layouts (render `{wcActive && <LiveTicker />}` between TopNav and main)

**Dismissal design:** the ticker is server-rendered for SEO and stays ISR-static (no `cookies()` read — that would force dynamic rendering site-wide). The client `TickerClose` component re-hides it on mount when the day's dismissal cookie is present. Soft navigations never remount the layout, so dismissal survives navigation with no flash; a hard reload may show the bar for one paint to already-dismissed users — accepted trade-off for keeping ISR.

- [ ] **Step 1: Create the dismiss component (client)**

```tsx
// src/components/layout/TickerClose.tsx
"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

const COOKIE = "wc_ticker_hidden=1";

function hideTicker() {
  document.getElementById("wc-ticker")?.style.setProperty("display", "none");
}

/** Hides the ticker for the rest of the local day via cookie (server stays static). */
export function TickerClose() {
  // Re-apply an existing dismissal on mount (DOM side-effect only — no state).
  useEffect(() => {
    if (document.cookie.split("; ").includes(COOKIE)) hideTicker();
  }, []);

  return (
    <button
      aria-label="Hide scores for today"
      onClick={() => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const maxAge = Math.max(60, Math.round((end.getTime() - Date.now()) / 1000));
        document.cookie = `${COOKIE}; max-age=${maxAge}; path=/`;
        hideTicker();
      }}
      className="p-1 rounded text-mute-soft hover:text-fg transition shrink-0 cursor-pointer"
    >
      <X size={12} />
    </button>
  );
}
```

(`Date` usage is inside an event handler / effect — allowed under the React 19 purity rule.)

- [ ] **Step 2: Create the ticker (server)**

```tsx
// src/components/layout/LiveTicker.tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWcFixtures, type WcFixture } from "@/lib/queries";
import { tickerFixtures } from "@/lib/wc-day";
import { nationCode } from "@/components/worldcup/nation-code";
import { TickerClose } from "./TickerClose";

const ET = "America/New_York";
const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: ET }).format(new Date(iso));

function score(f: WcFixture): string {
  if (f.status === "scheduled") return f.kickoff ? fmtTime(f.kickoff) : "TBD";
  return `${f.scoreHome ?? 0}–${f.scoreAway ?? 0}`;
}

/** Slim match-day strip under the header. Renders nothing on days without fixtures. */
export async function LiveTicker() {
  let fixtures: WcFixture[] = [];
  try {
    fixtures = await getWcFixtures();
  } catch {
    return null; // ticker is best-effort; never break the page
  }
  const picks = tickerFixtures(fixtures, new Date());
  if (picks.length === 0) return null;
  const anyLive = picks.some((f) => f.status === "live");

  return (
    <div id="wc-ticker" className="border-b border-line bg-ink-850/60">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-9 flex items-center gap-4 overflow-x-auto">
        <span className="flex items-center gap-1.5 shrink-0">
          <span className={cn("w-1.5 h-1.5 rounded-full", anyLive ? "bg-acc pulse-dot" : "bg-mute-soft")} />
          <span className="text-[10px] uppercase tracking-[0.14em] num font-semibold text-acc">
            {anyLive ? "Live" : "Today"}
          </span>
        </span>
        {picks.map((f) => (
          <Link
            key={f.id}
            href={`/matches/${f.id}`}
            className="flex items-center gap-1.5 shrink-0 text-[12px] text-mute hover:text-fg transition num"
          >
            <span className={cn(f.status === "live" && "text-fg font-medium")}>
              {nationCode(f.home.slug, f.home.name)} {score(f)} {nationCode(f.away.slug, f.away.name)}
            </span>
          </Link>
        ))}
        <Link
          href="/worldcup/schedule"
          className="ml-auto shrink-0 flex items-center gap-1 text-[11px] text-mute-soft hover:text-acc transition"
        >
          All matches <ArrowRight size={11} />
        </Link>
        <TickerClose />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Render from both layouts**

In both layout files, add `import { LiveTicker } from "@/components/layout/LiveTicker";` and insert between TopNav and main:

```tsx
      <TopNav wcActive={wcActive} />
      {wcActive && <LiveTicker />}
      <main ...>
```

- [ ] **Step 4: Verify**

Run: `npm run build 2>&1 | tail -5` — succeeds.
Manual on dev server: ticker shows today's WC fixtures; `curl -s localhost:3000 | grep -c wc-ticker` ≥ 1 (server-rendered); clicking X hides it; navigating keeps it hidden; ticker links route to `/matches/<id>`.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/LiveTicker.tsx src/components/layout/TickerClose.tsx "src/app/(app)/layout.tsx" "src/app/(marketing)/layout.tsx"
git commit -m "feat(wc): global match-day live ticker, SSR + cookie dismiss"
```

---

### Task 8: World Cup homepage hero (takeover)

**Files:**
- Create: `src/components/worldcup/CodeTile.tsx` (extracted from `src/app/(app)/worldcup/page.tsx:27-50`)
- Modify: `src/app/(app)/worldcup/page.tsx` (import CodeTile instead of local def)
- Create: `src/components/worldcup/WorldCupHero.tsx`
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: Extract CodeTile (DRY — hero needs it too)**

Create `src/components/worldcup/CodeTile.tsx` with the exact component currently defined inside `worldcup/page.tsx` (lines 27-50), unchanged except for imports:

```tsx
// src/components/worldcup/CodeTile.tsx
import { nationCode, nationStyle, nationFlagSrc } from "./nation-code";

/** A code/monogram tile on a neutral chip — crest-free, flag-free fallback. */
export function CodeTile({ slug, name, size = 40 }: { slug: string; name: string; size?: number }) {
  const flag = nationFlagSrc(slug);
  if (flag) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={flag}
        alt={name}
        width={size}
        height={size}
        className="rounded-full shrink-0 ring-1 ring-line/60 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const style = nationStyle(slug);
  return (
    <div
      className="rounded-full grid place-items-center font-bold num shrink-0 tracking-tight"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.3), background: style.bg, color: style.color }}
    >
      {nationCode(slug, name)}
    </div>
  );
}
```

In `src/app/(app)/worldcup/page.tsx`: delete the local `CodeTile` function and add `import { CodeTile } from "@/components/worldcup/CodeTile";`. Keep the imports the rest of the page still uses; remove any now-unused ones (`nationStyle`, `nationFlagSrc` only if nothing else on the page references them — check first).

- [ ] **Step 2: Create WorldCupHero**

```tsx
// src/components/worldcup/WorldCupHero.tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, LiveDot } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getWcFixtures, getNationalTeams, type WcFixture, type NationalTeamSummary } from "@/lib/queries";
import { todaysFixtures } from "@/lib/wc-day";
import { nationCode } from "./nation-code";
import { CodeTile } from "./CodeTile";

const ET = "America/New_York";
const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: ET }).format(new Date(iso));

/** €{m}M, or €{x.xx}B once past a billion (same convention as the WC hub). */
function money(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2)}B`;
  return `€${m.toFixed(0)}M`;
}

/** Tournament-window homepage hero: today's matches + the market angle. */
export async function WorldCupHero() {
  const [fixtures, nations] = await Promise.all([
    getWcFixtures().catch(() => [] as WcFixture[]),
    getNationalTeams().catch(() => [] as NationalTeamSummary[]),
  ]);

  const today = todaysFixtures(fixtures, new Date()).slice(0, 6);
  const topSquads = [...nations].sort((a, b) => b.squadValueM - a.squadValueM).slice(0, 5);
  const totalValueM = nations.reduce((s, n) => s + n.squadValueM, 0);

  return (
    <section className="relative overflow-hidden border-b border-line noise">
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
      <div className="max-w-[1440px] mx-auto px-6 pt-14 pb-12 relative">
        <div className="flex items-center gap-3 mb-8">
          <LiveDot />
          <span className="text-[11.5px] text-mute">
            World Cup 2026 &middot; 48 nations &middot; <span className="num">{money(totalValueM)}</span> in talent
          </span>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-start">
          <div>
            <h1 className="display tracking-[-0.045em] text-[clamp(44px,6vw,72px)] leading-[0.94]">
              The World Cup,
              <br />
              <span className="font-serif italic text-acc">valued live.</span>
            </h1>
            <p className="mt-5 text-mute text-[16px] max-w-[520px] leading-relaxed">
              Every squad priced by the Onside engine — match forecasts before kickoff, market movers after the
              whistle, and the tournament&rsquo;s real talent table.
            </p>
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <Link href="/worldcup">
                <Button kind="primary" size="lg" icon={<ArrowRight size={15} />}>
                  Enter the World Cup hub
                </Button>
              </Link>
              <Link href="/login">
                <Button kind="outline" size="lg">Create free account</Button>
              </Link>
            </div>
            {topSquads.length > 0 && (
              <div className="mt-9 flex items-center gap-5 flex-wrap">
                {topSquads.map((n) => (
                  <Link key={n.slug} href={`/worldcup/teams/${n.slug}`} className="flex items-center gap-2 group">
                    <CodeTile slug={n.slug} name={n.name} size={28} />
                    <span className="num text-[12px] text-mute group-hover:text-fg transition">
                      {money(n.squadValueM)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-ink-850/60 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft num mb-3">
              Today&rsquo;s matches
            </div>
            {today.length === 0 ? (
              <p className="text-[13px] text-mute py-4">
                No matches today — the board never sleeps.{" "}
                <Link href="/worldcup/schedule" className="text-acc hover:underline">
                  Full schedule
                </Link>
              </p>
            ) : (
              <div className="space-y-1">
                {today.map((f) => (
                  <Link
                    key={f.id}
                    href={`/matches/${f.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-overlay/5 transition"
                  >
                    <CodeTile slug={f.home.slug} name={f.home.name} size={24} />
                    <span className="text-[13px] font-medium flex-1 truncate">
                      {nationCode(f.home.slug, f.home.name)} v {nationCode(f.away.slug, f.away.name)}
                    </span>
                    <CodeTile slug={f.away.slug} name={f.away.name} size={24} />
                    <span className={cn("num text-[12px] w-14 text-right", f.status === "live" ? "text-fg font-medium" : "text-mute")}>
                      {f.status === "scheduled" && f.kickoff ? fmtTime(f.kickoff) : `${f.scoreHome ?? 0}–${f.scoreAway ?? 0}`}
                    </span>
                    {f.status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-acc pulse-dot shrink-0" />}
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/worldcup/schedule"
              className="mt-3 flex items-center gap-1 text-[12px] text-acc hover:underline"
            >
              All fixtures &amp; kickoff times <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
```

(All copy is factual-reference only — no FIFA marks; tiles come from the existing crest-free system.)

- [ ] **Step 3: Branch the landing page**

In `src/app/(marketing)/page.tsx`, add imports:

```tsx
import { isWcWindow } from "@/lib/wc-window";
import { WorldCupHero } from "@/components/worldcup/WorldCupHero";
```

In `LandingPage`, compute the flag and swap the hero (the rest of the page is untouched — evergreen pitch stays one scroll down):

```tsx
  const wcActive = isWcWindow(new Date());

  return (
    <div className="relative">
      {wcActive ? <WorldCupHero /> : <HeroSection counts={counts} />}
      <TickerStrip />
      <ValueProps />
      <MoversPreview risers={risers} fallers={fallers} />
      <SquadsPreview clubs={clubs} />
      <SocialProof />
      <PricingTeaser />
    </div>
  );
```

- [ ] **Step 4: Verify**

Run: `npm run build 2>&1 | tail -5` — succeeds.
Manual: `/` shows the WC hero (today's matches populated on a match day), CTAs route to `/worldcup` and `/login`; `/worldcup` still renders identically (CodeTile extraction is behavior-neutral). Check both themes.

- [ ] **Step 5: Commit**

```bash
git add src/components/worldcup/CodeTile.tsx src/components/worldcup/WorldCupHero.tsx "src/app/(app)/worldcup/page.tsx" "src/app/(marketing)/page.tsx"
git commit -m "feat(wc): window-gated World Cup homepage hero takeover"
```

---

### Task 9: Reports rail on Today (Discover)

**Files:**
- Create: `src/components/discover/ReportsRail.tsx`
- Modify: `src/app/(app)/discover/page.tsx`

- [ ] **Step 1: Create ReportsRail**

```tsx
// src/components/discover/ReportsRail.tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui";
import { REPORTS } from "@/lib/reports";

/** Editorial reports, folded in from the old /insights index (2026-06 nav refactor). */
export function ReportsRail() {
  return (
    <section className="mt-10">
      <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft num mb-3">
        Reports — the numbers, with a take
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href} className="group">
              <Card className="h-full p-4 hover:border-mute transition">
                <Icon size={16} className="text-acc mb-3" />
                <div className="text-[14px] font-semibold mb-1 group-hover:text-acc transition">{r.title}</div>
                <p className="text-[12px] text-mute leading-relaxed">{r.dek}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-mute-soft">
                  Read <ArrowRight size={11} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount it on Discover**

In `src/app/(app)/discover/page.tsx`: add `import { ReportsRail } from "@/components/discover/ReportsRail";` and insert `<ReportsRail />` as the **last child of the page wrapper div** (`<div className="max-w-[1440px] mx-auto px-6 py-8">`), i.e. immediately before its closing `</div>` at the end of the returned JSX (file is 213 lines; the wrapper closes on the last `</div>` before `);`).

- [ ] **Step 3: Verify**

Run: `npm run build 2>&1 | tail -5` — succeeds.
Manual: `/discover` shows the four report cards at the bottom; each links through (`/insights/undervalued-xi` etc. all 200); `/insights` itself redirects to `/discover` (check `curl -sI localhost:3000/insights | grep -i "location"` — Next emits a 308 for permanent redirects, equivalent for SEO).

- [ ] **Step 4: Commit**

```bash
git add src/components/discover/ReportsRail.tsx "src/app/(app)/discover/page.tsx"
git commit -m "feat(discover): reports rail — insights index folded into Today"
```

---

### Task 10: Compare contextual entry points

**Files:**
- Modify: `src/app/(app)/players/[id]/page.tsx` (action row at lines ~125-128)
- Modify: `src/components/layout/CmdK.tsx`

- [ ] **Step 1: Player profile Compare button**

In `src/app/(app)/players/[id]/page.tsx`: add `Scale` to the existing `lucide-react` import. Then in the action row, after the `ShareButton` line (currently line 127):

```tsx
              <div className="mt-4 flex items-center gap-2 justify-end">
                <WatchButton playerId={player.id} />
                <ShareButton title={`${player.displayName} — Onside valuation ${fmtVal(player.value)}`} />
                <Link href={`/compare?p=${player.slug}`}>
                  <Button kind="ghost" size="md" icon={<Scale size={14} />}>Compare</Button>
                </Link>
              </div>
```

(`Link` is already imported on this page; `player.slug` exists on `PlayerProfile` — `src/lib/queries/map.ts:31`. If `Button` is not already imported from `@/components/ui` on this page, add it to that import.)

- [ ] **Step 2: CmdK quick action**

In `src/components/layout/CmdK.tsx`: add `Scale` to the `lucide-react` import. Then, inside the palette panel, **after** the closing `</div>` of the scrollable results container (`<div className="max-h-[50vh] overflow-y-auto">…</div>`), insert a persistent footer action:

```tsx
        <div className="border-t border-line">
          <button
            onClick={() => go(first?.hits[0] ? `/compare?p=${first.hits[0].slug}` : "/compare")}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-overlay/[0.05] transition text-left cursor-pointer"
          >
            <Scale size={12} className="text-mute-soft shrink-0" />
            <span className="text-[13px] text-mute flex-1 truncate">
              Compare players{first?.hits[0] ? ` — start with ${first.hits[0].name}` : ""}
            </span>
          </button>
        </div>
```

(`go` and `first` already exist in the component; `first` is defined just above the return.)

- [ ] **Step 3: Verify**

Run: `npm run build 2>&1 | tail -5` — succeeds.
Manual: any player profile shows the Compare button and it lands on `/compare?p=<slug>` with that player pre-slotted; ⌘K shows "Compare players" at the palette foot, and with a search hit it deep-links the top result.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/players/[id]/page.tsx" src/components/layout/CmdK.tsx
git commit -m "feat(compare): contextual entry points — player profile + CmdK"
```

---

### Task 11: Sitemap + Competitions hub row

**Files:**
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/(app)/leagues/page.tsx`

- [ ] **Step 1: Sitemap**

In `STATIC_ROUTES` (`src/app/sitemap.ts:7-23`): bump `/worldcup` priority `0.9 → 0.95`, and add three missing primary surfaces:

```ts
  { path: "/discover", changeFrequency: "daily", priority: 0.85 },
  { path: "/transfers", changeFrequency: "daily", priority: 0.8 },
  { path: "/worldcup/schedule", changeFrequency: "daily", priority: 0.8 },
```

(`/insights` was never in the sitemap, so the 301 needs no sitemap change; report subpages can be a follow-up.)

- [ ] **Step 2: World Cup row on /leagues (permanent post-final home)**

In `src/app/(app)/leagues/page.tsx`: add `Trophy` to the `lucide-react` import (`ArrowRight` is already there). Insert directly **above the leagues list/grid**, after the page heading block:

```tsx
      <Link href="/worldcup" className="block mb-6 group">
        <Card className="p-4 flex items-center gap-4 hover:border-mute transition">
          <div className="w-10 h-10 rounded-full bg-acc/15 text-acc grid place-items-center shrink-0">
            <Trophy size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold group-hover:text-acc transition">World Cup 2026</div>
            <div className="text-[12px] text-mute truncate">
              48 national squads, valued live — groups, bracket and the full schedule
            </div>
          </div>
          <ArrowRight size={15} className="text-mute-soft group-hover:text-acc transition shrink-0" />
        </Card>
      </Link>
```

- [ ] **Step 3: Verify**

Run: `npm run build 2>&1 | tail -5` — succeeds.
Manual: `/leagues` shows the WC row above the league table; `curl -s localhost:3000/sitemap.xml | grep -c "discover\|transfers\|worldcup/schedule"` ≥ 3.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts "src/app/(app)/leagues/page.tsx"
git commit -m "feat(seo): sitemap surfaces + World Cup row under Competitions"
```

---

### Task 12: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: ALL tests pass — the original 136+ plus the ~15 new ones from Tasks 1-3.

- [ ] **Step 2: Production build with type-check gate**

Run: `npm run build 2>&1 | tee /tmp/build.log; grep -q "Failed to type check" /tmp/build.log && echo "BUILD GATE: FAIL" || echo "BUILD GATE: OK"`
Expected: `BUILD GATE: OK`, build completes.

- [ ] **Step 3: Manual QA checklist (dev server, both themes, 1280px + 390px)**

- Desktop nav reads exactly: `World Cup LIVE · Today · Players · Clubs · Competitions · Transfers · ✨Ask`; right cluster has search · scale icon · theme · bell · avatar/sign-in.
- `/` shows the WC hero; evergreen sections below; both CTAs work.
- Ticker visible on `/`, `/players`, `/discover`; X dismisses; navigation keeps it dismissed; ticker absent only when no fixtures today.
- `/insights` redirects to `/discover` (308/301); the three report URLs return 200; Reports rail renders on `/discover`.
- Player profile → Compare button → `/compare?p=<slug>`; ⌘K foot action present.
- 390px: bottom bar `World Cup · Today · Players · Wire · Ask`, hamburger holds Clubs/Competitions/Compare/Watchlist/Notifications + Reports + Sign in/out, no content hidden behind the bar (scroll to footer).
- Light theme: nav, ticker, hero, rail, bottom bar all legible (tokens flip cleanly).

- [ ] **Step 4: Final commit (if QA produced fixes) and stop**

```bash
git status --short   # should be clean, or commit QA fixes with fix(nav): ...
```

**Do NOT deploy.** Report QA results to Perez and wait for his explicit word (`vercel deploy --prod --yes`).
