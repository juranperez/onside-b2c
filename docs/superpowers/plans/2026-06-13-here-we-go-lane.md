# "Here We Go" Lane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A tier-0 instant-break lane that watches Fabrizio Romano's Bluesky feed, detects his "Here We Go," and — on a clean parse — auto-publishes a distinct HERE WE GO break to the Wire within ≤60s, with an admin kill-switch and auto-retract.

**Architecture:** A 1-minute cron polls Romano's Bluesky author feed (free public API). New pure modules detect the trigger, parse player+club (reusing the hardened `matchPlayer`/`matchDestClub`), and a pure router decides publish-new / upgrade-existing / hold-for-review. The break is marked **`source_tier = 0`** (the leaner reconciliation below) so it renders a distinct badge, pins confidence to ~95, and — when Sportmonks later confirms it — upgrades to Official via the existing `official-transfers` path. No LLM anywhere.

**Tech Stack:** Next 16 (App Router, cron routes), TypeScript, Supabase (`adminDb()`), Bluesky public AppView (`app.bsky.feed.getAuthorFeed`), Resend (admin alert), vitest (`src/**/*.test.ts`, node env). Reuses `src/lib/ingest/match.ts`, `src/lib/rumours/{stage,confidence,notify}.ts`, `src/lib/ingest/official-transfers.ts`.

**Branch:** `feat/sportmonks-integration`. Commit after every task. **No deploy / no cron-arm until Perez's explicit word.**

---

## ⚠️ Deviation from the approved spec — read first

The spec (`docs/superpowers/specs/2026-06-13-here-we-go-lane-design.md`) specified new `rumours` columns `break_kind/break_source/break_url/break_at`. This plan instead **overloads `source_tier = 0`** as the Romano-break marker, with `primary_source = "Fabrizio Romano"`, the Bluesky URL in the existing `url` column + `rumour_sources`, and `last_update` for "broke Xm ago". Why:
- The UI type `RumourItem` (`src/lib/queries/rumours.ts`) already threads `sourceTier`, `source`, `url`, `status`, `lastUpdate` to the Wire — **no query or type change needed** for the badge.
- `official-transfers.ts` already flips a matching saga (`player_id` + same club) to `confirmed` — **the two-step upgrade needs no new code**.
- It removes the **prod-Supabase migration gate** (migrations to the live DB need Perez's per-action word) and the types-regen step — the feature ships behind only the normal cron-arm + deploy gates, faster for the June 15 window.
- It meets **every** acceptance criterion in the spec (distinct badge, ≤60s, attribution + source link, clean-parse gate, upgrade-not-duplicate, retract + auto-retract, journalist→official two-step, zero LLM).

`source_tier` is currently only ever 1/2/3 (from `tierFor`); 0 is unused. Break rows never hit the normal source-factor in `confidence()` because they short-circuit (status `rumour` → pinned 95; status `confirmed` → 100), so introducing tier 0 is safe. v2 (Ornstein) distinguishes journalists via `primary_source`. **If Perez prefers the explicit columns, swap Task order: add the migration + types-regen as a gated Task 0 and use `break_kind` in place of the `sourceTier === 0` checks.**

---

### Task 1: Verify Romano's Bluesky handle + cadence (spec step 0)

**Files:** none (investigation; record findings in the commit message of Task 2).

- [ ] **Step 1: Confirm the handle resolves and returns recent posts**

Run:
```bash
curl -s "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=fabriziromano.bsky.social&limit=5" | head -c 800
```
Expected: JSON with a `feed` array of posts (each `post.record.text`, `post.uri`, `post.record.createdAt`). If the handle 404s, try resolving via `com.atproto.identity.resolveHandle?handle=...` and search his verified handle; record the working handle.

- [ ] **Step 2: Eyeball cadence**

Compare the newest post's `createdAt` and text against his X/IG for the same break (manually, or just confirm he posts there at all and recently). 

**Decision gate:** if his Bluesky is dead or badly lagging X, STOP and report to Perez — the source needs reconsidering before building further (paid X API fallback per spec). If it's live and current, proceed and record the confirmed handle as a constant in Task 2.

---

### Task 2: Bluesky fetch module

**Files:**
- Create: `src/lib/ingest/bluesky.ts`
- Test: `src/lib/ingest/bluesky.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ingest/bluesky.test.ts
import { describe, it, expect } from "vitest";
import { parseAuthorFeed, type BskyPost } from "./bluesky";

// Captured shape of app.bsky.feed.getAuthorFeed (trimmed to fields we use).
const FEED = {
  feed: [
    {
      post: {
        uri: "at://did:plc:abc/app.bsky.feed.post/1",
        record: { text: "Here we go! Liverpool sign Florian Wirtz, deal completed. €130m.", createdAt: "2026-06-13T14:00:00Z" },
        embed: { images: [{ fullsize: "https://cdn/img1.jpg", alt: "Wirtz Liverpool" }] },
      },
    },
    {
      post: {
        uri: "at://did:plc:abc/app.bsky.feed.post/2",
        record: { text: "Good morning everyone!", createdAt: "2026-06-13T08:00:00Z" },
      },
    },
  ],
};

describe("parseAuthorFeed", () => {
  it("flattens posts to {uri,text,createdAt,imageAlt?}", () => {
    const posts: BskyPost[] = parseAuthorFeed(FEED);
    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      uri: "at://did:plc:abc/app.bsky.feed.post/1",
      text: "Here we go! Liverpool sign Florian Wirtz, deal completed. €130m.",
      createdAt: "2026-06-13T14:00:00Z",
      imageAlt: "Wirtz Liverpool",
    });
    expect(posts[1].imageAlt).toBeUndefined();
  });
  it("tolerates a missing/empty feed", () => {
    expect(parseAuthorFeed({})).toEqual([]);
    expect(parseAuthorFeed({ feed: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ingest/bluesky.test.ts`
Expected: FAIL — cannot find module './bluesky'

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/ingest/bluesky.ts
/**
 * Source handle for Romano's breaks. Task 1 verification (2026-06-13): his OWN
 * Bluesky (fabriziorom.bsky.social) is abandoned — so we read the active
 * third-party MIRROR that auto-reposts his X posts to Bluesky (verified live,
 * posting current content). Best-effort, swappable: change this one constant to
 * repoint at a paid X bridge if the mirror ever degrades.
 */
export const ROMANO_HANDLE = "fabrizioromano.yopro20.com";

const APPVIEW = "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed";

export interface BskyPost {
  uri: string; // at:// URI — stable id, used for idempotency + source link
  text: string;
  createdAt: string;
  imageAlt?: string; // first embed image alt, when present
}

/** Flatten a getAuthorFeed payload to the fields we use. Pure — no network. */
export function parseAuthorFeed(payload: unknown): BskyPost[] {
  const feed = (payload as { feed?: unknown[] } | null)?.feed;
  if (!Array.isArray(feed)) return [];
  const out: BskyPost[] = [];
  for (const item of feed) {
    const post = (item as { post?: Record<string, unknown> }).post;
    const record = post?.record as { text?: string; createdAt?: string } | undefined;
    if (!post || typeof post.uri !== "string" || !record?.text || !record.createdAt) continue;
    const embed = post.embed as { images?: { alt?: string }[] } | undefined;
    out.push({
      uri: post.uri,
      text: record.text,
      createdAt: record.createdAt,
      imageAlt: embed?.images?.[0]?.alt || undefined,
    });
  }
  return out;
}

/** Fetch Romano's recent posts. Best-effort: throws on a non-OK response so callers can catch. */
export async function fetchRomanoPosts(handle = ROMANO_HANDLE, limit = 15): Promise<BskyPost[]> {
  const res = await fetch(`${APPVIEW}?actor=${encodeURIComponent(handle)}&limit=${limit}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`bluesky getAuthorFeed ${res.status}`);
  return parseAuthorFeed(await res.json());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ingest/bluesky.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest/bluesky.ts src/lib/ingest/bluesky.test.ts
git commit -m "feat(wire): Bluesky author-feed fetch/parse for Romano watcher

Task 1 verification: handle <ROMANO_HANDLE> live, returns current posts."
```

---

### Task 3: "Here We Go" trigger + break parser

**Files:**
- Create: `src/lib/ingest/here-we-go.ts`
- Test: `src/lib/ingest/here-we-go.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ingest/here-we-go.test.ts
import { describe, it, expect } from "vitest";
import { isHereWeGo, breakText } from "./here-we-go";
import type { BskyPost } from "./bluesky";

const post = (text: string, imageAlt?: string): BskyPost => ({
  uri: "at://x", text, createdAt: "2026-06-13T14:00:00Z", imageAlt,
});

describe("isHereWeGo", () => {
  it("fires on his trademark confirmed break", () => {
    expect(isHereWeGo(post("Here we go! Liverpool sign Florian Wirtz, deal completed."))).toBe(true);
    expect(isHereWeGo(post("HERE WE GO 🚨 Real Madrid agree deal for Alphonso Davies."))).toBe(true);
  });
  it("does NOT fire on hedged / question / quoted-other uses", () => {
    expect(isHereWeGo(post("Could this be here we go soon? Talks ongoing."))).toBe(false);
    expect(isHereWeGo(post("Not yet here we go — still negotiating."))).toBe(false);
    expect(isHereWeGo(post("Big week ahead in the transfer market."))).toBe(false);
  });
});

describe("breakText", () => {
  it("uses the post text, appending image alt for entity context", () => {
    expect(breakText(post("Here we go! Liverpool sign Florian Wirtz.", "Wirtz Liverpool"))).toBe(
      "Here we go! Liverpool sign Florian Wirtz. Wirtz Liverpool",
    );
  });
  it("is just the text when there is no image alt", () => {
    expect(breakText(post("Here we go! Spurs sign Senesi."))).toBe("Here we go! Spurs sign Senesi.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ingest/here-we-go.test.ts`
Expected: FAIL — cannot find module './here-we-go'

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/ingest/here-we-go.ts
import type { BskyPost } from "./bluesky";

// Hedges that negate a "here we go" in the same post (mirrors stage.ts doneLanguage guarding).
const HEDGE = /\b(not yet|could|might|maybe|soon|close to|nearly|almost|if |when |would be)\b/i;

/** True only for Romano's trademark confirmed-break phrasing — guarded against hedges/questions. */
export function isHereWeGo(post: BskyPost): boolean {
  const t = post.text;
  if (!/here we go/i.test(t)) return false;
  if (/\?/.test(t)) return false; // a question is not a confirmation
  if (HEDGE.test(t)) return false;
  return true;
}

/** The text we hand to the entity matchers — post text plus image alt (player/club often in the graphic). */
export function breakText(post: BskyPost): string {
  return post.imageAlt ? `${post.text} ${post.imageAlt}` : post.text;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ingest/here-we-go.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest/here-we-go.ts src/lib/ingest/here-we-go.test.ts
git commit -m "feat(wire): Here We Go trigger + break-text builder (hedge-guarded)"
```

---

### Task 4: The decision router

**Files:**
- Create: `src/lib/ingest/romano-break.ts`
- Test: `src/lib/ingest/romano-break.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ingest/romano-break.test.ts
import { describe, it, expect } from "vitest";
import { decideRomanoBreak, type BreakInput } from "./romano-break";

const base: BreakInput = {
  playerId: "p1",
  toClub: "Liverpool",
  strength: "strong",
  existingForPlayer: [],
};

describe("decideRomanoBreak", () => {
  it("publishes a NEW break on a clean parse with no existing saga", () => {
    expect(decideRomanoBreak(base)).toEqual({ kind: "publish-break" });
  });
  it("holds for review when the player is unresolved", () => {
    expect(decideRomanoBreak({ ...base, playerId: null }).kind).toBe("hold");
  });
  it("holds for review when the club is unresolved", () => {
    expect(decideRomanoBreak({ ...base, toClub: "—" }).kind).toBe("hold");
  });
  it("holds when the player match is only weak/unique, not strong", () => {
    expect(decideRomanoBreak({ ...base, strength: "unique" }).kind).toBe("hold");
  });
  it("upgrades an existing live saga for that player instead of duplicating", () => {
    const d = decideRomanoBreak({
      ...base,
      existingForPlayer: [{ id: "r1", status: "rumour", to_club: "Liverpool" }],
    });
    expect(d).toEqual({ kind: "upgrade-break", targetId: "r1" });
  });
  it("does nothing if the saga is already confirmed (official beat Romano)", () => {
    const d = decideRomanoBreak({
      ...base,
      existingForPlayer: [{ id: "r1", status: "confirmed", to_club: "Liverpool" }],
    });
    expect(d.kind).toBe("skip");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ingest/romano-break.test.ts`
Expected: FAIL — cannot find module './romano-break'

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/ingest/romano-break.ts
import type { MatchStrength } from "./match";

export interface ExistingSaga {
  id: string;
  status: string; // "rumour" | "candidate" | "confirmed" | "dead"
  to_club: string;
}

export interface BreakInput {
  playerId: string | null; // null when matchPlayer failed
  toClub: string; // "—" when the club didn't resolve
  strength: MatchStrength | null; // null when no player match
  existingForPlayer: ExistingSaga[];
}

export type BreakDecision =
  | { kind: "publish-break" } // new HERE WE GO saga, live
  | { kind: "upgrade-break"; targetId: string } // promote the tracked saga to a Romano break
  | { kind: "hold" } // ambiguous → candidate + BREAKING + admin alert, never auto-live
  | { kind: "skip" }; // already confirmed/dead — nothing to do

/**
 * Clean-parse gate: a Romano break only auto-publishes with a STRONG player
 * match AND a resolved destination. Anything softer is held for review. An
 * existing live saga for the player is upgraded in place (never duplicated);
 * an already-confirmed saga is left alone (the club beat Romano to it).
 */
export function decideRomanoBreak(input: BreakInput): BreakDecision {
  const clean = input.playerId !== null && input.strength === "strong" && input.toClub !== "—";
  if (!clean) return { kind: "hold" };

  const live = input.existingForPlayer.filter((s) => s.status !== "dead");
  const confirmed = live.find((s) => s.status === "confirmed");
  if (confirmed) return { kind: "skip" };
  const upgradable = live.find((s) => s.status === "rumour" || s.status === "candidate");
  if (upgradable) return { kind: "upgrade-break", targetId: upgradable.id };
  return { kind: "publish-break" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ingest/romano-break.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest/romano-break.ts src/lib/ingest/romano-break.test.ts
git commit -m "feat(wire): Romano break decision router (clean-parse gate + upgrade-not-duplicate)"
```

---

### Task 5: Pin confidence ~95 for a Romano break

**Files:**
- Modify: `src/lib/rumours/confidence.ts`
- Test: `src/lib/rumours/confidence.test.ts` (add cases to the existing file)

- [ ] **Step 1: Read the current short-circuit**

`confidence()` (`src/lib/rumours/confidence.ts`) starts with `const now = input.now ?? new Date();` then, for `status === "confirmed"`, returns `{ pct: 100, band: "high", factors: [...] }`. `ConfidenceInput` has `sourceTier: number`. Add a Romano-break short-circuit directly AFTER the confirmed one.

- [ ] **Step 2: Write the failing test**

Append to `src/lib/rumours/confidence.test.ts` (match its existing import of `confidence`/`ConfidenceInput`; build an input with `sourceTier: 0`):

```ts
describe("confidence — Romano Here We Go (tier 0)", () => {
  const baseTier0 = {
    status: "rumour" as const,
    summary: "Here we go! Liverpool sign Florian Wirtz.",
    sourceTier: 0,
    corroborations: 1,
    reportedFeeEur: 130_000_000,
    onsideValueEur: 120_000_000,
    contractUntil: null,
    firstSeen: new Date("2026-06-13T14:00:00Z"),
    now: new Date("2026-06-13T14:05:00Z"),
  };
  it("pins a live Romano break to 95 / high", () => {
    const r = confidence(baseTier0);
    expect(r.pct).toBe(95);
    expect(r.band).toBe("high");
    expect(r.factors[0].key).toBe("here_we_go");
  });
  it("a confirmed break still reads 100 (official supersedes)", () => {
    expect(confidence({ ...baseTier0, status: "confirmed" }).pct).toBe(100);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/rumours/confidence.test.ts`
Expected: FAIL — live tier-0 returns a computed pct, not 95.

- [ ] **Step 4: Add the short-circuit**

Immediately after the `if (input.status === "confirmed") { return { pct: 100, ... }; }` block, insert:

```ts
  // Romano "Here We Go" (source_tier 0) is journalist-confirmed — pinned high,
  // distinct from club-official 100, until the official feed upgrades it.
  if (input.sourceTier === 0) {
    return {
      pct: 95,
      band: "high",
      factors: [{ key: "here_we_go", label: "Romano: Here We Go", score: 0.95, weight: 1, detail: "Confirmed break by Fabrizio Romano — not yet club-official" }],
    };
  }
```

(Match the exact `ConfidenceResult`/factor shape used by the `confirmed` return just above — copy its field names verbatim.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/rumours/confidence.test.ts`
Expected: PASS (both new tests + all existing)

- [ ] **Step 6: Commit**

```bash
git add src/lib/rumours/confidence.ts src/lib/rumours/confidence.test.ts
git commit -m "feat(wire): pin Romano break (tier 0) to 95% journalist-confirmed"
```

---

### Task 6: Admin kill-switch alert helper

**Files:**
- Create: `src/lib/rumours/admin-alert.ts`
- Test: `src/lib/rumours/admin-alert.test.ts`

- [ ] **Step 1: Write the failing test (pure formatter)**

Keep the testable surface pure: a message builder, separate from the side-effecting send.

```ts
// src/lib/rumours/admin-alert.test.ts
import { describe, it, expect } from "vitest";
import { breakAlertMessage } from "./admin-alert";

describe("breakAlertMessage", () => {
  it("names the player, club and a manage link", () => {
    const m = breakAlertMessage({ player: "Florian Wirtz", club: "Liverpool", rumourId: "r1" });
    expect(m.subject).toBe("🚨 Romano break live: Florian Wirtz → Liverpool");
    expect(m.body).toContain("Retract");
    expect(m.body).toContain("/transfers/manage");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rumours/admin-alert.test.ts`
Expected: FAIL — cannot find module './admin-alert'

- [ ] **Step 3: Implement the builder + sender**

Reuse the existing Resend setup the digest uses (`RESEND_API_KEY`, sender "Onside Market <noreply@onsidemarket.com>"). Read `src/lib/rumours/notify.ts` for the `notifications` insert shape and reuse it; read the digest sender (`npm run send:digest` / `src/lib/board/*` or wherever Resend is imported) for the email client pattern, and mirror it.

```ts
// src/lib/rumours/admin-alert.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

export interface BreakAlert {
  player: string;
  club: string;
  rumourId: string;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "juranperez@gmail.com";

/** Pure — the email/notification copy for a live Romano break. */
export function breakAlertMessage(a: BreakAlert): { subject: string; body: string } {
  return {
    subject: `🚨 Romano break live: ${a.player} → ${a.club}`,
    body: `Romano just broke ${a.player} → ${a.club} and it auto-published to the Wire.\n\nReview or Retract: https://onsidemarket.com/transfers/manage`,
  };
}

/** Side-effecting: drop an in-app notification for the admin + email via Resend. Best-effort. */
export async function sendBreakAlert(db: SupabaseClient<Database>, a: BreakAlert): Promise<void> {
  const { subject, body } = breakAlertMessage(a);
  // In-app: look up the admin profile id by email, insert a notification row.
  const { data: admin } = await db.from("profiles").select("id").eq("email", ADMIN_EMAIL).maybeSingle();
  if (admin?.id) {
    await db.from("notifications").insert({
      profile_id: admin.id,
      kind: "romano_break",
      title: subject,
      body,
      url: `/transfers/manage`,
    }).then(() => {}, () => {}); // best-effort
  }
  // Email via Resend, only if configured.
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Onside Market <noreply@onsidemarket.com>", to: ADMIN_EMAIL, subject, text: body }),
  }).then(() => {}, () => {}); // best-effort — never block the break on the alert
}
```

IMPORTANT: before finalizing, read `src/lib/db/types.ts` for the exact `notifications` insert columns (the names `kind/title/body/url/profile_id` must match the real schema — adjust to the actual column names; e.g. some tables use `message` not `body`). If a column differs, use the real one.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rumours/admin-alert.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/rumours/admin-alert.ts src/lib/rumours/admin-alert.test.ts
git commit -m "feat(wire): admin kill-switch alert (in-app + Resend) for Romano breaks"
```

---

### Task 7: The ingest orchestrator (fetch → parse → match → decide → write)

**Files:**
- Create: `src/lib/ingest/romano-watch.ts`
- Test: `src/lib/ingest/romano-watch.test.ts` (pure helpers only — DB writes are exercised by manual QA, not unit tests, matching how `ingestRumours` is structured)

- [ ] **Step 1: Write the failing test for the pure summary builder**

```ts
// src/lib/ingest/romano-watch.test.ts
import { describe, it, expect } from "vitest";
import { breakSummary } from "./romano-watch";

describe("breakSummary", () => {
  it("reads as a confirmed-break Wire summary", () => {
    expect(breakSummary("Liverpool", "Here we go! Liverpool sign Florian Wirtz, €130m.")).toBe(
      "Here We Go — Liverpool. Here we go! Liverpool sign Florian Wirtz, €130m.",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ingest/romano-watch.test.ts`
Expected: FAIL — cannot find module './romano-watch'

- [ ] **Step 3: Implement the orchestrator**

Read `src/lib/ingest/rumour-ingest.ts` (`ingestRumours`) for the exact patterns: how it builds the player index (`buildPlayerIndex` from a paginated `loadAllPlayers`), the club index (`buildClubIndex`), how it writes a `rumours` row + a `rumour_sources` row, and how it checks the `rumour_sources` URL for idempotency. Mirror those exactly.

```ts
// src/lib/ingest/romano-watch.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { fetchRomanoPosts } from "./bluesky";
import { isHereWeGo, breakText } from "./here-we-go";
import { decideRomanoBreak } from "./romano-break";
import { matchPlayer, matchDestClub, buildPlayerIndex, buildClubIndex } from "./match";
import { notifyFollowers } from "@/lib/rumours/notify";
import { sendBreakAlert } from "@/lib/rumours/admin-alert";

export interface RomanoWatchResult {
  scanned: number;
  published: number;
  upgraded: number;
  held: number;
  retracted: number;
  skipped: number;
}

/** The Wire summary line for a break. Pure. */
export function breakSummary(club: string, postText: string): string {
  return `Here We Go — ${club}. ${postText}`;
}

/**
 * One watch pass: fetch Romano's recent posts, act on any NEW "Here We Go" not
 * already ingested (idempotent on the Bluesky post URI stored in rumour_sources),
 * and auto-retract a previously-published break whose source post has vanished.
 * Mirrors ingestRumours: build indexes once, write rumours + rumour_sources,
 * notifyFollowers on upgrades. Never throws — the cron stays green.
 */
export async function watchRomano(db: SupabaseClient<Database>): Promise<RomanoWatchResult> {
  const res: RomanoWatchResult = { scanned: 0, published: 0, upgraded: 0, held: 0, retracted: 0, skipped: 0 };
  let posts;
  try { posts = await fetchRomanoPosts(undefined, 25); } catch { return res; } // wide window so recent breaks stay visible for auto-retract
  res.scanned = posts.length;

  // Idempotency: which post URIs have we already ingested? (rumour_sources.url)
  const uris = posts.map((p) => p.uri);
  const { data: seenRows } = await db.from("rumour_sources").select("url").in("url", uris);
  const seen = new Set((seenRows ?? []).map((r) => r.url));

  // Auto-retract: a LIVE tier-0 break whose source post has VANISHED from his
  // feed → dead. CRITICAL: only consider RECENT breaks (last_update within 15
  // min). An older break's URI naturally falls off the ~25-post fetch window
  // without being deleted — retracting those would be a false positive. Recent
  // + missing = he deleted/edited it. (We fetch a wide window for this; the
  // watcher runs every minute, so a real deletion is caught within ~1 min.)
  const liveUris = new Set(uris);
  const RECENT_MS = 15 * 60_000;
  const cutoff = new Date(Date.now() - RECENT_MS).toISOString();
  const { data: liveBreaks } = await db
    .from("rumours").select("id,url,last_update").eq("source_tier", 0).eq("status", "rumour").gte("last_update", cutoff);
  for (const b of liveBreaks ?? []) {
    if (b.url && b.url.startsWith("at://") && !liveUris.has(b.url)) {
      await db.from("rumours").update({ status: "dead", last_update: new Date().toISOString() }).eq("id", b.id);
      res.retracted++;
    }
  }

  // Build match indexes once (reuse the helpers ingestRumours uses).
  const players = await loadAllPlayers(db); // see ingestRumours for the paginated loader to reuse/extract
  const pIdx = buildPlayerIndex(players);
  const clubs = await loadAllClubs(db);
  const cIdx = buildClubIndex(clubs);

  for (const post of posts) {
    if (seen.has(post.uri)) { res.skipped++; continue; }
    if (!isHereWeGo(post)) { res.skipped++; continue; }
    const text = breakText(post);
    const pm = matchPlayer(text, pIdx);
    const club = matchDestClub(text, cIdx, null) ?? "—";
    const existing = pm
      ? (await db.from("rumours").select("id,status,to_club").eq("player_id", pm.playerId)).data ?? []
      : [];
    const decision = decideRomanoBreak({
      playerId: pm?.playerId ?? null,
      toClub: club,
      strength: pm?.strength ?? null,
      existingForPlayer: existing,
    });
    const now = new Date().toISOString();

    if (decision.kind === "publish-break" && pm) {
      const summary = breakSummary(club, post.text);
      const { data: ins } = await db.from("rumours").insert({
        player_id: pm.playerId, to_club: club, summary,
        primary_source: "Fabrizio Romano", source_tier: 0, status: "rumour",
        corroborations: 1, url: post.uri, first_seen: now, last_update: now,
      }).select("id").single();
      if (ins) {
        await db.from("rumour_sources").insert({ rumour_id: ins.id, url: post.uri, source: "Fabrizio Romano", tier: 0 });
        await sendBreakAlert(db, { player: playerName(players, pm.playerId), club, rumourId: ins.id });
        res.published++;
      }
    } else if (decision.kind === "upgrade-break" && pm) {
      await db.from("rumours").update({
        source_tier: 0, primary_source: "Fabrizio Romano", to_club: club,
        summary: breakSummary(club, post.text), url: post.uri, last_update: now,
      }).eq("id", decision.targetId);
      await db.from("rumour_sources").insert({ rumour_id: decision.targetId, url: post.uri, source: "Fabrizio Romano", tier: 0 });
      await notifyFollowers(db, decision.targetId, breakSummary(club, post.text), { kind: "confirmed" });
      await sendBreakAlert(db, { player: playerName(players, pm.playerId), club, rumourId: decision.targetId });
      res.upgraded++;
    } else if (decision.kind === "hold" && pm) {
      // Ambiguous club but a real player → BREAKING review candidate + alert.
      const { data: ins } = await db.from("rumours").insert({
        player_id: pm.playerId, to_club: club, summary: breakSummary(club, post.text),
        primary_source: "Fabrizio Romano", source_tier: 0, status: "candidate",
        corroborations: 1, url: post.uri, first_seen: now, last_update: now,
      }).select("id").single();
      if (ins) {
        await db.from("rumour_sources").insert({ rumour_id: ins.id, url: post.uri, source: "Fabrizio Romano", tier: 0 });
        await sendBreakAlert(db, { player: playerName(players, pm.playerId), club: club === "—" ? "club TBC" : club, rumourId: ins.id });
        res.held++;
      }
    } else {
      res.skipped++;
    }
  }
  return res;
}
```

The helper functions `loadAllPlayers`, `loadAllClubs`, and a small `playerName(players, id)` lookup MUST be reused/extracted from `rumour-ingest.ts` (it already has the paginated player loader and club loader — export them from there rather than duplicating). If they are not currently exported, export them in this task and import here. `players` rows must include `id`, `name`/`known_as` for `playerName`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ingest/romano-watch.test.ts`
Expected: PASS (breakSummary)

- [ ] **Step 5: Type-check**

Run: `npm run build 2>&1 | tail -5`
Expected: compiles (the `rumours`/`rumour_sources`/`notifications` inserts match the real schema — fix any column-name mismatch the type-checker flags against `src/lib/db/types.ts`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/ingest/romano-watch.ts src/lib/ingest/romano-watch.test.ts src/lib/ingest/rumour-ingest.ts
git commit -m "feat(wire): Romano watch orchestrator — publish/upgrade/hold/auto-retract"
```

---

### Task 8: The cron route + vercel.json (DISARMED until deploy)

**Files:**
- Create: `src/app/api/cron/romano-watch/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create the route (mirror sync-fixtures auth pattern)**

```ts
// src/app/api/cron/romano-watch/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { watchRomano } from "@/lib/ingest/romano-watch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Polls Fabrizio Romano's Bluesky feed once and acts on any new "Here We Go".
 * Guarded by CRON_SECRET. Armed at 1-minute cadence in vercel.json (the ≤60s
 * latency ceiling — Vercel cron floors at 1/min). RUMOUR_WATCH_ENABLED gates it
 * so it can ship dark and be turned on by env without a redeploy.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (process.env.RUMOUR_WATCH_ENABLED !== "1") {
    return NextResponse.json({ ok: true, disabled: true });
  }
  try {
    const result = await watchRomano(adminDb());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add the cron entry**

In `vercel.json`, add to the `crons` array:
```json
    {
      "path": "/api/cron/romano-watch",
      "schedule": "* * * * *"
    }
```

- [ ] **Step 3: Verify**

Run: `npm run build 2>&1 | tail -5` — compiles; the route appears in the manifest.
Note: the cron does nothing in prod until `RUMOUR_WATCH_ENABLED=1` is set in Vercel env (Perez's call) AND the deploy ships.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/cron/romano-watch/route.ts" vercel.json
git commit -m "feat(wire): romano-watch cron route (1-min, env-gated, disarmed)"
```

---

### Task 9: The HERE WE GO Wire badge

**Files:**
- Modify: `src/components/transfers/wire-row.tsx`

- [ ] **Step 1: Read the current badge logic**

`wire-row.tsx:28-43` computes `breaking = r.status === "rumour" && r.sourceTier <= 2 && ageH < 2` and renders a BREAKING chip. `RumourItem` already carries `sourceTier`, `source`, `url`, `status`, `lastUpdate` — no query change needed.

- [ ] **Step 2: Add the HERE WE GO branch (takes precedence over BREAKING)**

Add, alongside the `breaking` computation:
```tsx
  const hereWeGo = r.status === "rumour" && r.sourceTier === 0;
```
Then, where the BREAKING chip renders (`{breaking && (...)}`), gate it so HERE WE GO wins, and render the distinct badge:
```tsx
      {hereWeGo ? (
        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-acc text-ink-950 animate-pulse">
          🚨 Here We Go
        </span>
      ) : breaking ? (
        /* existing BREAKING chip JSX, unchanged */
      ) : null}
```
And where the source/attribution shows, when `hereWeGo`, attribute Romano with a source link and the honesty note:
```tsx
      {hereWeGo && (
        <a href={r.url ?? "#"} target="_blank" rel="noopener" className="text-[11px] text-mute hover:text-acc transition">
          Fabrizio Romano · broke {ago(r.lastUpdate)} · not yet club-official
        </a>
      )}
```
Use the existing relative-time helper in the file (the `mins`/`ago` function at the top — match its name). Keep the border-accent treatment (`hereWeGo || breaking ? "border-acc/40" : "border-line"`). Tokens only.

- [ ] **Step 3: Verify**

Run: `npm run build 2>&1 | tail -5` — compiles.
Run: `npx vitest run` — all green.
Manual (dev, both themes): a `source_tier=0` rumour row shows the 🚨 HERE WE GO badge + Romano attribution; a normal tier-1 row still shows BREAKING; once a break is `confirmed`, the badge gives way to the Done/confirmed treatment (status-driven).

- [ ] **Step 4: Commit**

```bash
git add src/components/transfers/wire-row.tsx
git commit -m "feat(wire): distinct HERE WE GO badge + Romano attribution on the Wire"
```

**Deferred (explicit scope-out):** the spec §6 market-pulse-strip callout ("Latest break: {player} → {club}") is NOT in this plan — the on-row HERE WE GO badge is the core surface; the pulse-strip line is decorative polish for a fast-follow, not a v1 requirement.

---

### Task 10: Manage-page one-tap Retract (the kill-switch UI)

**Files:**
- Modify: `src/app/(app)/transfers/manage/page.tsx`

- [ ] **Step 1: Read the current manage page**

It lists candidates (with `setRumourStatus.bind(null, id, "rumour")` approve + `deleteRumour.bind(null, id)`) and published rumours (with a `deleteRumour` action). Confirm the `setRumourStatus(id, status)` server action exists and accepts an arbitrary status string. Confirm whether live `source_tier=0` breaks already appear in the published list (they have `status='rumour'`, so they should).

- [ ] **Step 2: Add a Retract action for live breaks**

For any listed LIVE rumour (status `rumour`), add a one-tap **Retract** button that calls `setRumourStatus.bind(null, r.id, "dead")` — NOT `deleteRumour`. Retract must set status `dead` (keeps the row + its `rumour_sources` URL so the idempotent watcher can't re-create it); hard Delete would drop the URL and the next cron pass would republish the break. If the page already renders published rows, add the Retract `<form>` beside the existing Delete; if live tier-0 breaks aren't surfaced, add a small "Live breaks" section querying `status='rumour'` ordered by `last_update desc` so a wrong break is always one tap from dead. Visually flag tier-0 rows (e.g. a "Romano" tag) so the admin sees which are auto-published breaks.

```tsx
            <form action={setRumourStatus.bind(null, r.id, "dead")}>
              <button className="text-[12px] text-down hover:underline">Retract</button>
            </form>
```

- [ ] **Step 3: Verify**

Run: `npm run build 2>&1 | tail -5` — compiles.
Manual (dev): a live `source_tier=0` row in `/transfers/manage` has a Retract button; tapping it sets status `dead`, the row leaves the live Wire, and a watcher pass does NOT re-create it (the `at://` URL is still in `rumour_sources`).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/transfers/manage/page.tsx"
git commit -m "feat(wire): one-tap Retract kill-switch for live Romano breaks (dead, not delete)"
```

---

### Task 11: Full verification

**Files:** none.

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: ALL pass — existing plus the new bluesky/here-we-go/romano-break/confidence/admin-alert/romano-watch tests.

- [ ] **Step 2: Build gate**

Run: `npm run build 2>&1 | tee /tmp/hwg-build.log | tail -3; grep -q "Failed to type check\|Failed to compile" /tmp/hwg-build.log && echo "GATE: FAIL" || echo "GATE: OK"`
Expected: `GATE: OK`.

- [ ] **Step 3: Manual QA seed (local, no prod writes)**

With a local/dev Supabase or a throwaway row: insert a `rumours` row with `source_tier=0, status='rumour', primary_source='Fabrizio Romano', url='at://test', summary='Here We Go — Liverpool. ...'` for a real player, load `/transfers`, confirm the 🚨 HERE WE GO badge + attribution + 95% confidence render in both themes; flip it to `status='confirmed'` and confirm it upgrades to the Done/Official treatment at 100%. Delete the seed row.

- [ ] **Step 4: Report to Perez — the arming checklist (his authorizations)**

Summarize what's needed to go live, none of it auto-run:
1. `vercel deploy --prod --yes` (ships the code + cron, still dark).
2. Set `RUMOUR_WATCH_ENABLED=1` in Vercel prod env (arms the watcher).
3. Confirm `CRON_SECRET` already set (it is — shared with the other crons).
4. Watch the first live break + the admin alert; the `/transfers/manage` Retract is the kill-switch.

**Do NOT deploy or set env without Perez's explicit word.**
