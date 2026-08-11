# World Cup Goal-Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a WC player scores, push opted-in users a goal alert deep-linking the scorer's player page — built on a reusable web-push channel (service worker + VAPID + subscriptions) that later also delivers Here We Go breaks.

**Architecture:** A web-push foundation (SW + VAPID + `push_subscriptions`) + a 1-minute live-gated cron that reads API-Football fixture events for live WC matches, extracts new goals (own-goals/VAR-retractions excluded via a confirmation buffer), maps `scorer.id`→our `players.id` (they're identical — both are the API-Football id), dedups against `pushed_goals`, and fans out web pushes. Ships dark behind `GOAL_PUSH_ENABLED`.

**Tech Stack:** Next 16 (App Router, metadata manifest, cron routes), `web-push` (VAPID), Supabase (`adminDb`/`readDb`), API-Football (`fixtures/events`), vitest (pure helpers). Reuses `src/lib/ingest/api-football.ts` (`apiFetch`), the cron-route auth pattern, `getWcFixtures` status semantics.

**Branch:** `feat/sportmonks-integration`. Commit after each task. **No deploy/arm until Perez's word.**

## Build order & gates
- **Tasks 1–7 are AUTONOMOUS** (no prod-DB, no secrets-in-repo): dep, VAPID gen, pure parsers, SW/manifest, events fetch. Build these now.
- **Tasks 8–11 are GATED** on Perez: Task 8 applies the `push_subscriptions`+`pushed_goals` migration to Supabase (prod DB → his per-action word) and regenerates types; Tasks 9–11 (subscribe storage, cron/send, opt-in UX) depend on those tables + the VAPID env vars. Do NOT start Task 8 without his authorization.

**Verified facts (2026-06-13):**
- `src/lib/ingest/api-football.ts`: private `apiFetch<T>(endpoint, params)` (handles rate-limiting/retries), `ApiResult<T> = { response: T[]; paging }`, `apiKey()` via `API_FOOTBALL_KEY` + `x-apisports-key` header, base `https://v3.football.api-sports.io`. WC fixtures stored as `id = wc2026-{rawApiFootballFixtureId}` (`wc-fixtures.ts:67`).
- `players.id` IS the API-Football player id (string) — so an event's `player.id` maps directly to `players.id`; look it up to get `slug` for the deep-link.
- WC fixture `status` ∈ "scheduled"|"live"|"finished"|"postponed".
- Root layout `src/app/layout.tsx` exports a `metadata: Metadata` object; client components can be mounted in the layout tree (e.g. `GoogleOneTap` in the (app) layout).
- `public/` currently holds only svgs + `flags/` (no SW, no manifest).
- Cron route pattern: CRON_SECRET bearer + `adminDb()` + `export const dynamic = "force-dynamic"` + `maxDuration = 60` (see `src/app/api/cron/sync-fixtures/route.ts`).

---

### Task 1: Add the `web-push` dependency

**Files:** `package.json`, lockfile.

- [ ] **Step 1: Install**

Run: `npm install web-push && npm install -D @types/web-push`
Expected: both added to package.json.

- [ ] **Step 2: Verify it imports**

Run: `node -e "require('web-push'); console.log('web-push ok')"`
Expected: `web-push ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(push): add web-push dependency"
```

---

### Task 2: Generate the VAPID keypair (record for Perez — do NOT commit secrets)

**Files:** none committed.

- [ ] **Step 1: Generate**

Run: `npx web-push generate-vapid-keys --json`
Expected: JSON `{ "publicKey": "...", "privateKey": "..." }`.

- [ ] **Step 2: Record in the execution report (NOT in any file)**

Capture both keys in your report back to the controller so Perez can set:
- `VAPID_PUBLIC_KEY` = publicKey (Vercel env, server)
- `VAPID_PRIVATE_KEY` = privateKey (Vercel env, server — SECRET)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = publicKey (Vercel env, client-exposed; same value as public)
- Also add all three to `.env.local` for local testing (gitignored).

Do NOT write the private key into any tracked file or commit. No commit for this task.

---

### Task 3: Goal-event parser (pure)

**Files:** Create `src/lib/ingest/wc-goals.ts`; Test `src/lib/ingest/wc-goals.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ingest/wc-goals.test.ts
import { describe, it, expect } from "vitest";
import { extractGoals, goalSignature, type FixtureEvent } from "./wc-goals";

const ev = (type: string, detail: string, playerId: number | null, playerName: string, teamId: number, elapsed: number): FixtureEvent => ({
  type, detail,
  player: { id: playerId, name: playerName },
  team: { id: teamId, name: "T" },
  time: { elapsed },
});

describe("extractGoals", () => {
  it("keeps normal goals and penalties, drops own goals, cards, subs, VAR", () => {
    const events = [
      ev("Goal", "Normal Goal", 100, "Tyler Adams", 1, 23),
      ev("Goal", "Penalty", 200, "Kane", 2, 55),
      ev("Goal", "Own Goal", 300, "Smith", 1, 70),
      ev("Card", "Yellow Card", 400, "Doe", 2, 40),
      ev("subst", "Substitution 1", 500, "Sub", 1, 60),
      ev("Var", "Goal Disallowed - offside", 600, "Off", 2, 80),
    ];
    expect(extractGoals(events)).toEqual([
      { scorerId: "100", scorerName: "Tyler Adams", teamId: 1, minute: 23 },
      { scorerId: "200", scorerName: "Kane", teamId: 2, minute: 55 },
    ]);
  });
  it("drops goals with no identified scorer", () => {
    expect(extractGoals([ev("Goal", "Normal Goal", null, "", 1, 10)])).toEqual([]);
  });
});

describe("goalSignature", () => {
  it("is stable per fixture+scorer+minute (dedup key)", () => {
    expect(goalSignature("wc2026-123", "100", 23)).toBe("wc2026-123:100:23");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/ingest/wc-goals.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/ingest/wc-goals.ts

/** Shape of an API-Football fixture event (only the fields we use). */
export interface FixtureEvent {
  type: string; // "Goal" | "Card" | "subst" | "Var"
  detail: string; // "Normal Goal" | "Penalty" | "Own Goal" | "Goal Disallowed - offside" | ...
  player: { id: number | null; name: string };
  team: { id: number; name: string };
  time: { elapsed: number };
}

export interface ParsedGoal {
  scorerId: string; // == players.id (the API-Football player id, as string)
  scorerName: string;
  teamId: number;
  minute: number;
}

/** Real, credited goals only: type "Goal" excluding own goals; must have a scorer. */
export function extractGoals(events: FixtureEvent[]): ParsedGoal[] {
  const out: ParsedGoal[] = [];
  for (const e of events) {
    if (e.type !== "Goal") continue;
    if (e.detail === "Own Goal") continue;
    if (e.player.id == null) continue;
    out.push({ scorerId: String(e.player.id), scorerName: e.player.name, teamId: e.team.id, minute: e.time.elapsed });
  }
  return out;
}

/** Dedup key for a pushed goal: fixture + scorer + minute. */
export function goalSignature(fixtureId: string, scorerId: string, minute: number): string {
  return `${fixtureId}:${scorerId}:${minute}`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/ingest/wc-goals.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest/wc-goals.ts src/lib/ingest/wc-goals.test.ts
git commit -m "feat(push): goal-event parser — credited goals only, dedup signature"
```

---

### Task 4: Notification-copy builder (pure)

**Files:** Create `src/lib/push/goal-copy.ts`; Test `src/lib/push/goal-copy.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/push/goal-copy.test.ts
import { describe, it, expect } from "vitest";
import { goalPushCopy } from "./goal-copy";

describe("goalPushCopy", () => {
  it("builds title/body/url for a goal", () => {
    const c = goalPushCopy({
      scorerName: "Tyler Adams", scorerSlug: "tyler-adams-100",
      home: "USA", away: "Paraguay", scoreHome: 2, scoreAway: 0,
    });
    expect(c.title).toBe("⚽ Tyler Adams scores!");
    expect(c.body).toBe("USA 2–0 Paraguay");
    expect(c.url).toBe("/players/tyler-adams-100");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/push/goal-copy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/push/goal-copy.ts
export interface GoalCopyInput {
  scorerName: string;
  scorerSlug: string;
  home: string;
  away: string;
  scoreHome: number;
  scoreAway: number;
}

/** Push payload copy for a goal. Factual, no FIFA marks. */
export function goalPushCopy(g: GoalCopyInput): { title: string; body: string; url: string } {
  return {
    title: `⚽ ${g.scorerName} scores!`,
    body: `${g.home} ${g.scoreHome}–${g.scoreAway} ${g.away}`,
    url: `/players/${g.scorerSlug}`,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/push/goal-copy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/push/goal-copy.ts src/lib/push/goal-copy.test.ts
git commit -m "feat(push): goal notification copy builder"
```

---

### Task 5: Push-support / iOS-install detection (pure)

**Files:** Create `src/lib/push/support.ts`; Test `src/lib/push/support.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/push/support.test.ts
import { describe, it, expect } from "vitest";
import { pushSupport } from "./support";

const IOS_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36";

describe("pushSupport", () => {
  it("iOS Safari NOT installed → needs install, can't push yet", () => {
    expect(pushSupport(IOS_SAFARI, false)).toEqual({ isIos: true, needsInstall: true, canPrompt: false });
  });
  it("iOS installed as PWA (standalone) → can prompt", () => {
    expect(pushSupport(IOS_SAFARI, true)).toEqual({ isIos: true, needsInstall: false, canPrompt: true });
  });
  it("Android → can prompt directly", () => {
    expect(pushSupport(ANDROID, false)).toEqual({ isIos: false, needsInstall: false, canPrompt: true });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/push/support.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/push/support.ts
export interface PushSupport {
  isIos: boolean;
  needsInstall: boolean; // iOS Safari must be added to the home screen before push works
  canPrompt: boolean; // ok to request Notification permission now
}

/** Decide how to onboard a visitor to push, given their UA + standalone (PWA-installed) state. */
export function pushSupport(userAgent: string, standalone: boolean): PushSupport {
  const isIos = /iphone|ipad|ipod/i.test(userAgent);
  const needsInstall = isIos && !standalone; // iOS only delivers web push to installed PWAs
  return { isIos, needsInstall, canPrompt: !needsInstall };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/push/support.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/push/support.ts src/lib/push/support.test.ts
git commit -m "feat(push): push-support / iOS-install detection"
```

---

### Task 6: `fetchFixtureEvents` (API-Football)

**Files:** Modify `src/lib/ingest/api-football.ts`.

- [ ] **Step 1: Add the fetch function**

Read `api-football.ts` to confirm the private `apiFetch<T>` signature, then add (export) below `fetchFixtures`:

```ts
import type { FixtureEvent } from "./wc-goals";

/** Live events (goals, cards, subs, VAR) for a single fixture. `fixtureId` is the RAW
 *  API-Football id (strip the "wc2026-" prefix before calling). */
export async function fetchFixtureEvents(fixtureId: number | string): Promise<ApiResult<FixtureEvent>> {
  return apiFetch<FixtureEvent>("fixtures/events", { fixture: fixtureId });
}
```

(If `FixtureEvent` causes a circular import concern, that's fine — it's a type-only import; `wc-goals.ts` does not import from `api-football.ts`.)

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -4` — compiles.
Run: `npx vitest run` — all green.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ingest/api-football.ts
git commit -m "feat(push): fetchFixtureEvents (API-Football fixtures/events)"
```

---

### Task 7: Service worker + web app manifest + SW registration

**Files:** Create `public/sw.js`; Create `src/app/manifest.ts`; Create `src/components/push/RegisterSW.tsx`; Modify `src/app/(app)/layout.tsx` (mount RegisterSW).

- [ ] **Step 1: Service worker (push + click only — NO fetch/cache)**

```js
// public/sw.js
// Push-only service worker. Deliberately NO fetch/cache handlers — caching the app
// would serve stale pages. Handles incoming pushes + notification clicks.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const title = data.title || "Onside";
  const options = {
    body: data.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
```

(Confirm `/icon.svg` exists in the app — `src/app/icon.svg` is served at `/icon.svg`. If not, use an existing public asset.)

- [ ] **Step 2: Web app manifest (Next metadata file)**

```ts
// src/app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Onside Market",
    short_name: "Onside",
    description: "Every player. Every valuation. Live.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0e11",
    theme_color: "#0b0e11",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
```

- [ ] **Step 3: SW registration (client)**

```tsx
// src/components/push/RegisterSW.tsx
"use client";

import { useEffect } from "react";

/** Registers the push-only service worker once, client-side. No UI. */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registration is best-effort; push just won't be available
    });
  }, []);
  return null;
}
```

- [ ] **Step 4: Mount it** in `src/app/(app)/layout.tsx` (alongside the existing `GoogleOneTap`): add `import { RegisterSW } from "@/components/push/RegisterSW";` and render `<RegisterSW />` next to `<GoogleOneTap />`.

- [ ] **Step 5: Verify**

Run: `npm run build 2>&1 | tail -5` — compiles; `/manifest.webmanifest` appears in the route manifest.
Run: `npx vitest run` — green.
Manual (dev): DevTools → Application → Service Workers shows `/sw.js` activated; Manifest panel shows "Onside Market".

- [ ] **Step 6: Commit**

```bash
git add public/sw.js src/app/manifest.ts src/components/push/RegisterSW.tsx "src/app/(app)/layout.tsx"
git commit -m "feat(push): push-only service worker + manifest + registration"
```

---

### Task 8 [GATED — Perez applies the migration]: `push_subscriptions` + `pushed_goals` tables

**Files:** Create `supabase/migrations/<ts>_push.sql`; regenerate `src/lib/db/types.ts`.

**DO NOT run this task without Perez's explicit authorization to apply a migration to the production Supabase.**

- [ ] **Step 1: Write the migration SQL**

```sql
-- push_subscriptions: one row per browser push endpoint, owned by a profile.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
-- Owner can manage their own subscriptions; service role (cron) reads all.
create policy "own subs" on public.push_subscriptions
  for all using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);

-- pushed_goals: dedup ledger so a goal is pushed at most once.
create table if not exists public.pushed_goals (
  signature text primary key, -- fixtureId:scorerId:minute
  pushed_at timestamptz not null default now()
);
alter table public.pushed_goals enable row level security; -- no public policies; service-role only
```

- [ ] **Step 2: Apply to Supabase** — Perez authorizes; apply via the Supabase MCP `apply_migration` (or the dashboard). Confirm both tables exist with `list_tables`.

- [ ] **Step 3: Regenerate types** — `src/lib/db/types.ts` must now include `push_subscriptions` and `pushed_goals` (via the project's type-gen: `supabase gen types typescript` or the MCP `generate_typescript_types`). Commit the regenerated types.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/ src/lib/db/types.ts
git commit -m "feat(push): push_subscriptions + pushed_goals tables"
```

---

### Task 9 [GATED]: Subscription storage — API route + client subscribe flow

**Files:** Create `src/app/api/push/subscribe/route.ts`; Create `src/lib/push/subscribe-client.ts`. (Depends on Task 8 types + `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.)

- [ ] **Step 1: The store route**

```ts
// src/app/api/push/subscribe/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase-server"; // the request-scoped server client (auth context)

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "bad-subscription" }, { status: 400 });
  }
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const { error } = await db.from("push_subscriptions").upsert(
    { profile_id: user?.id ?? null, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, last_seen: new Date().toISOString() },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

Confirm the exact server-client import (`createClient` / `supabase-server`) the app uses for request-scoped auth (read another authed route, e.g. an existing server action's client). Match it.

- [ ] **Step 2: The client subscribe helper**

```ts
// src/lib/push/subscribe-client.ts
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Request permission, subscribe via the SW, and persist the subscription. Returns true on success. */
export async function subscribeToPush(): Promise<boolean> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  return res.ok;
}
```

- [ ] **Step 3: Verify** — `npm run build` compiles (types include push_subscriptions). `npx vitest run` green.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/push/subscribe/route.ts" src/lib/push/subscribe-client.ts
git commit -m "feat(push): subscription storage route + client subscribe flow"
```

---

### Task 10 [GATED]: Goal-detection cron — orchestrator + send

**Files:** Create `src/lib/push/send.ts`; extend `src/lib/ingest/wc-goals.ts` with `detectAndPushGoals(db)`; Create `src/app/api/cron/wc-goals/route.ts`. (Depends on Tasks 8 + VAPID env.)

- [ ] **Step 1: The web-push sender**

```ts
// src/lib/push/send.ts
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:hello@onsidemarket.com", pub, priv);
  configured = true;
  return true;
}

/** Fan a payload out to every stored subscription; prune dead (404/410) endpoints. */
export async function broadcast(db: SupabaseClient<Database>, payload: { title: string; body: string; url: string }): Promise<number> {
  if (!configure()) return 0;
  const { data: subs } = await db.from("push_subscriptions").select("endpoint,p256dh,auth");
  if (!subs?.length) return 0;
  const body = JSON.stringify(payload);
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return sent;
}
```

- [ ] **Step 2: The detection orchestrator** (add to `src/lib/ingest/wc-goals.ts`)

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { fetchFixtureEvents } from "./api-football";
import { goalPushCopy } from "@/lib/push/goal-copy";
import { broadcast } from "@/lib/push/send";

export interface GoalPushResult { live: number; goals: number; pushed: number; }

/** One detection pass: for each LIVE WC fixture, find NEW credited goals (dedup via
 *  pushed_goals), map scorer→player page, and broadcast. Never throws. */
export async function detectAndPushGoals(db: SupabaseClient<Database>): Promise<GoalPushResult> {
  const res: GoalPushResult = { live: 0, goals: 0, pushed: 0 };
  const { data: liveFx } = await db.from("fixtures")
    .select("id,home_id,away_id,score_home,score_away")
    .eq("competition", "World Cup 2026").eq("status", "live");
  if (!liveFx?.length) return res;
  res.live = liveFx.length;

  // National-team names for the scoreline copy.
  const { data: nts } = await db.from("national_teams").select("slug,name");
  const nameBySlug = new Map((nts ?? []).map((n) => [n.slug, n.name] as const));

  for (const fx of liveFx) {
    const rawId = fx.id.replace(/^wc2026-/, "");
    let events;
    try { events = (await fetchFixtureEvents(rawId)).response; } catch { continue; }
    const goals = extractGoals(events);
    res.goals += goals.length;
    if (goals.length === 0) continue;

    // Resolve scorers to player pages (players.id == scorer.id).
    const ids = [...new Set(goals.map((g) => g.scorerId))];
    const { data: players } = await db.from("players").select("id,slug,known_as,name").in("id", ids);
    const playerById = new Map((players ?? []).map((p) => [p.id, p] as const));

    for (const g of goals) {
      const sig = goalSignature(fx.id, g.scorerId, g.minute);
      const player = playerById.get(g.scorerId);
      if (!player) continue; // no player page → skip (no dead-link push)
      // Dedup: insert the signature; if it already exists, skip (already pushed).
      const { error: dupe } = await db.from("pushed_goals").insert({ signature: sig });
      if (dupe) continue; // primary-key conflict = already pushed
      const copy = goalPushCopy({
        scorerName: player.known_as || player.name || g.scorerName,
        scorerSlug: player.slug,
        home: nameBySlug.get(fx.home_id ?? "") ?? "Home",
        away: nameBySlug.get(fx.away_id ?? "") ?? "Away",
        scoreHome: fx.score_home ?? 0,
        scoreAway: fx.score_away ?? 0,
      });
      res.pushed += await broadcast(db, copy);
    }
  }
  return res;
}
```

NOTE on the confirmation buffer (spec gap 2): the simplest VAR-safe approach within a 1-min cron is the dedup ledger + only pushing goals already reflected in `fixtures.score_*` (a disallowed goal won't have incremented the synced score). If the implementer finds the events arrive before the score sync, add a one-cycle delay (only push a goal whose minute is ≤ current elapsed − 1). Keep it simple; note what you did.

Confirm the `fixtures` columns (`competition`, `status`, `home_id`, `away_id`, `score_home`, `score_away`) against `src/lib/db/types.ts`/`getWcFixtures` and adjust names if needed.

- [ ] **Step 3: The cron route** (mirror sync-fixtures; gated behind `GOAL_PUSH_ENABLED`)

```ts
// src/app/api/cron/wc-goals/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { detectAndPushGoals } from "@/lib/ingest/wc-goals";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (process.env.GOAL_PUSH_ENABLED !== "1") return NextResponse.json({ ok: true, disabled: true });
  try {
    return NextResponse.json({ ok: true, ...(await detectAndPushGoals(adminDb())) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
```

Add to `vercel.json` crons: `{ "path": "/api/cron/wc-goals", "schedule": "* * * * *" }`.

- [ ] **Step 4: Verify** — `npm run build` compiles; `npx vitest run` green (the pure `extractGoals`/`goalSignature`/`goalPushCopy` tests cover the logic; the DB path is QA-verified).

- [ ] **Step 5: Commit**

```bash
git add src/lib/push/send.ts src/lib/ingest/wc-goals.ts "src/app/api/cron/wc-goals/route.ts" vercel.json
git commit -m "feat(push): goal-detection cron + web-push fan-out (dark behind GOAL_PUSH_ENABLED)"
```

---

### Task 11 [GATED]: Opt-in prompt + iOS install nudge

**Files:** Create `src/components/push/GoalAlertsPrompt.tsx`; mount on the WC hub + schedule pages.

- [ ] **Step 1: The prompt component**

```tsx
// src/components/push/GoalAlertsPrompt.tsx
"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { pushSupport } from "@/lib/push/support";
import { subscribeToPush } from "@/lib/push/subscribe-client";

/** A dismissible "Get goal alerts" nudge. Android/desktop → permission prompt;
 *  iOS-not-installed → "Add to Home Screen" instructions. Honest volume copy. */
export function GoalAlertsPrompt() {
  const [state, setState] = useState<"hidden" | "offer" | "ios" | "on">("hidden");
  useEffect(() => {
    if (Notification?.permission === "granted") { setState("on"); return; }
    if (localStorage.getItem("goalAlertsDismissed") === "1") return;
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const s = pushSupport(navigator.userAgent, standalone);
    setState(s.needsInstall ? "ios" : "offer");
  }, []);
  if (state === "hidden" || state === "on") return null;
  return (
    <div className="rounded-xl border border-acc/30 bg-acc/[0.06] p-4 mb-6 flex items-start gap-3">
      <Bell size={16} className="text-acc mt-0.5 shrink-0" />
      <div className="flex-1 text-[13px]">
        <div className="font-semibold text-fg">Get goal alerts</div>
        {state === "ios" ? (
          <p className="text-mute mt-0.5">Add Onside to your home screen (Share → Add to Home Screen) to get a ping when a World Cup goal goes in.</p>
        ) : (
          <p className="text-mute mt-0.5">A ping the moment a World Cup goal goes in — tap through to the scorer. ~5–10 alerts on busy match days; mute anytime.</p>
        )}
      </div>
      {state === "offer" && (
        <button onClick={async () => { setState((await subscribeToPush()) ? "on" : "offer"); }} className="shrink-0 h-8 px-3 rounded-lg bg-acc text-ink-950 text-[12px] font-semibold cursor-pointer">Enable</button>
      )}
      <button aria-label="Dismiss" onClick={() => { localStorage.setItem("goalAlertsDismissed", "1"); setState("hidden"); }} className="shrink-0 text-mute-soft hover:text-fg text-[12px]">✕</button>
    </div>
  );
}
```

- [ ] **Step 2: Mount** `<GoalAlertsPrompt />` near the top of the `/worldcup` hub content (e.g. above or just under the hero) and on `/worldcup/schedule`. Tokens only.

- [ ] **Step 3: Verify** — build compiles; manual: Android/desktop shows the Enable nudge; an iOS UA shows the install instructions; dismiss persists.

- [ ] **Step 4: Commit**

```bash
git add src/components/push/GoalAlertsPrompt.tsx "src/app/(app)/worldcup/page.tsx" "src/app/(app)/worldcup/schedule/page.tsx"
git commit -m "feat(push): goal-alerts opt-in prompt + iOS install nudge"
```

---

### Task 12: Verification + arming checklist

- [ ] **Step 1:** `npx vitest run` — all green (foundation pure tests + prior suite).
- [ ] **Step 2:** `npm run build 2>&1 | tail -3` — GATE OK, routes `/api/cron/wc-goals`, `/api/push/subscribe`, `/manifest.webmanifest` present.
- [ ] **Step 3: WC-squad completeness check (spec gap 3 / AC3)** — confirm WC scorers resolve to player pages. Run a spot query: `select count(*) from national_team_squads s join players p on p.id = s.player_id` is non-trivial AND a sample of squad players have slugs. (Prod already shows populated squads with valued players, and the cron skips any scorer without a page — so no backfill is expected; just confirm no whole-squad is empty.)
- [ ] **Step 4: Manual QA** — SW registers; subscribe flow stores a row (authed); a seeded `pushed_goals`/test broadcast reaches a subscribed Android/desktop browser; iOS shows the install nudge; dismiss persists; both themes hold on the prompt.
- [ ] **Step 5: Report the ARMING CHECKLIST (Perez's actions):**
  1. Apply Task 8 migration (done during build, with his auth).
  2. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel prod env (values from Task 2).
  3. `vercel deploy --prod --yes` (ships dark).
  4. Set `GOAL_PUSH_ENABLED=1` to arm; CRON_SECRET already shared.
  5. Subscribe on a device, watch a live match, confirm the goal push + deep-link.

**Do NOT deploy or arm without Perez's word.**
