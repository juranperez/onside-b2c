# Receipts & Reputation — Plan 1: Domain Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, fully-tested domain core for receipts & reputation — resolution semantics, the lock-eligibility predicate, and the symmetric-divergence scoring/reputation engine — with zero infrastructure, DB, UI, or counsel dependencies.

**Architecture:** Five pure TypeScript modules under `src/lib/receipts/`, co-located vitest tests. No I/O, no Supabase, no React. Every function is deterministic and unit-tested. Later plans (data layer, UI, fixture branch) import these.

**Tech Stack:** TypeScript, vitest (already the repo's runner). Co-located `*.test.ts` like `src/lib/queries/map.test.ts` and `src/lib/valuation/fallback-target.test.ts`.

**Spec:** `docs/superpowers/specs/2026-06-15-receipts-reputation-design.md`. This plan covers ONLY the §Mechanic resolution rules, §Reputation & scoring (incl. the 2026-06-16 symmetric-divergence fix), and the anti-late-call predicate. It does NOT touch fixtures (counsel-gated), DB, or UI.

**Decomposition (this is Plan 1 of ~4):**
1. **Domain core (this plan)** — pure resolution + scoring + lock logic.
2. Data layer — `predictions` + `reputation` migration, append-only trigger + RLS, server-lock action, resolvers wired to the official-transfers ingest. (Code buildable; prod-DB apply gated on Perez's word.)
3. Inline chip UI + receipts hub + share→acquisition (transfer surfaces only).
4. **Counsel-gated branch:** fixture calls + Call-of-the-Day + domestic Match-of-the-Day + age-framing Branch A/B.

**Spec reconciliation (minor):** the spec's data-model `status` enum listed `expired`. That conflates a *subject-terminal* event with a *prediction outcome*. This plan separates them: `PredictionStatus = open | won | lost | push | void`; the subject-terminal (`confirmed | expired | killed_by_competing`) is an *input* to `resolveOutcome`, which returns the prediction outcome. (Plan 2's migration uses the 5-value enum.)

---

## File structure

- Create `src/lib/receipts/types.ts` — domain types + scoring constants. One responsibility: the vocabulary every other module shares.
- Create `src/lib/receipts/resolve.ts` — `resolveOutcome`, `resolveFee`. Pure resolution rules.
- Create `src/lib/receipts/resolve.test.ts`
- Create `src/lib/receipts/lock.ts` — `lockEligibility`. Pure anti-late-call predicate.
- Create `src/lib/receipts/lock.test.ts`
- Create `src/lib/receipts/score.ts` — `divergence`, `outcomePoints`, `feePoints`, `aggregateReputation`. The scoring/reputation engine.
- Create `src/lib/receipts/score.test.ts`

**Compliance note (lint gate, Plan 2):** these modules must never use banned vocabulary in identifiers — no `bet/stake/odds/payout/wager/buy/sell/shares/line/overUnder`. Use `call/prediction/higher/lower/points/confidence`. The fee pick is `higher | lower` (vs Onside's value), never `over/under`.

---

## Task 1: Domain types + constants

**Files:**
- Create: `src/lib/receipts/types.ts`

- [ ] **Step 1: Write `src/lib/receipts/types.ts`**

```typescript
// Domain vocabulary + scoring constants for receipts & reputation (pure; no I/O).
// Banned-vocab rule: identifiers use call/prediction/higher/lower/points — never bet/odds/line/over-under.

export type PredictionSubjectType = "transfer_saga" | "fixture";
export type CallType = "outcome" | "fee";

/** Transfer-outcome pick. (Fixture H/D/A picks live in the counsel-gated Plan 4.) */
export type OutcomePick = "will" | "wont";
/** Fee pick: the market pays HIGHER or LOWER than Onside's published value. Never "over/under". */
export type FeePick = "higher" | "lower";

/** Scoring outcome of a resolved prediction. */
export type PredictionStatus = "open" | "won" | "lost" | "push" | "void";

/** How a transfer saga terminally ended (input to resolveOutcome). */
export type SubjectTerminal = "confirmed" | "expired" | "killed_by_competing";

/** Confirmed-fee shape from the official-transfers ingest. */
export type FeeKind = "disclosed" | "free" | "undisclosed";

// ── Scoring constants (concrete, tuned against confidence.ts bands) ──
export const BASE_POINTS = 100;
/** A "will" call is closed once the house is at/above this confidence (anti-late-call). */
export const LOCK_CONFIDENCE_CEILING = 85;
/** Bands per confidence.ts band(): a "confident house" is >= 70. */
export const CONFIDENT_HOUSE_PCT = 70;
/** Minimum SCORED calls (won+lost) before a user is ranked at all. */
export const MIN_VOLUME = 5;
/** Shrink-to-mean constant: rankScore *= n/(n+SHRINK_K). */
export const SHRINK_K = 10;
/** Earliness multiplier ceiling (earliest call worth up to 1.5x). */
export const EARLINESS_BONUS = 0.5;

export interface ResolvedCall {
  status: PredictionStatus;
  points: number; // signed; 0 for push/void/open
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/receipts/types.ts
git commit -m "feat(receipts): domain types + scoring constants"
```

---

## Task 2: Resolution rules (`resolve.ts`)

**Files:**
- Create: `src/lib/receipts/resolve.ts`
- Test: `src/lib/receipts/resolve.test.ts`

- [ ] **Step 1: Write the failing tests** — `src/lib/receipts/resolve.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { resolveOutcome, resolveFee } from "./resolve";

describe("resolveOutcome", () => {
  it("confirmed deal: 'will' wins, 'wont' loses", () => {
    expect(resolveOutcome("will", "confirmed")).toBe("won");
    expect(resolveOutcome("wont", "confirmed")).toBe("lost");
  });
  it("expired (window closed, no move): 'wont' wins, 'will' loses", () => {
    expect(resolveOutcome("wont", "expired")).toBe("won");
    expect(resolveOutcome("will", "expired")).toBe("lost");
  });
  it("killed_by_competing (player moved elsewhere): 'will' LOSES, 'wont' VOIDS — never a free win", () => {
    expect(resolveOutcome("will", "killed_by_competing")).toBe("lost");
    expect(resolveOutcome("wont", "killed_by_competing")).toBe("void");
  });
});

describe("resolveFee", () => {
  const VALUE = 50_000_000;
  it("free transfer -> push (no fee to compare)", () => {
    expect(resolveFee("higher", VALUE, null, "free")).toBe("push");
    expect(resolveFee("lower", VALUE, null, "free")).toBe("push");
  });
  it("undisclosed fee -> void", () => {
    expect(resolveFee("higher", VALUE, null, "undisclosed")).toBe("void");
  });
  it("disclosed fee above value: 'higher' wins, 'lower' loses", () => {
    expect(resolveFee("higher", VALUE, 70_000_000, "disclosed")).toBe("won");
    expect(resolveFee("lower", VALUE, 70_000_000, "disclosed")).toBe("lost");
  });
  it("disclosed fee below value: 'lower' wins, 'higher' loses", () => {
    expect(resolveFee("lower", VALUE, 30_000_000, "disclosed")).toBe("won");
    expect(resolveFee("higher", VALUE, 30_000_000, "disclosed")).toBe("lost");
  });
  it("disclosed fee exactly at value -> push", () => {
    expect(resolveFee("higher", VALUE, VALUE, "disclosed")).toBe("push");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/onside-b2c && npx vitest run src/lib/receipts/resolve.test.ts`
Expected: FAIL — `resolve.ts` does not exist.

- [ ] **Step 3: Write `src/lib/receipts/resolve.ts`**

```typescript
import type { OutcomePick, FeePick, FeeKind, PredictionStatus, SubjectTerminal } from "./types";

/**
 * Resolve a transfer-OUTCOME call. killed_by_competing = the player moved elsewhere, so the
 * called deal did NOT happen ('will' loses) but "wont" must NOT be rewarded (it would let a
 * user bank a free win on every competing suitor) — it voids. Rules are frozen at lock.
 */
export function resolveOutcome(pick: OutcomePick, terminal: SubjectTerminal): PredictionStatus {
  switch (terminal) {
    case "confirmed":
      return pick === "will" ? "won" : "lost";
    case "expired":
      return pick === "wont" ? "won" : "lost";
    case "killed_by_competing":
      return pick === "will" ? "lost" : "void";
  }
}

/**
 * Resolve a FEE call against the FIRST officially-recorded fee (frozen; later restatements
 * ignored). "higher"/"lower" = the market paid more/less than Onside's published value.
 */
export function resolveFee(
  pick: FeePick,
  onsideValueEur: number,
  confirmedFeeEur: number | null,
  kind: FeeKind,
): PredictionStatus {
  if (kind === "free") return "push";
  if (kind === "undisclosed" || confirmedFeeEur == null) return "void";
  if (confirmedFeeEur === onsideValueEur) return "push";
  const marketHigher = confirmedFeeEur > onsideValueEur;
  return (pick === "higher") === marketHigher ? "won" : "lost";
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/onside-b2c && npx vitest run src/lib/receipts/resolve.test.ts`
Expected: PASS (11 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/receipts/resolve.ts src/lib/receipts/resolve.test.ts
git commit -m "feat(receipts): transfer outcome + fee resolution rules"
```

---

## Task 3: Lock-eligibility predicate (`lock.ts`)

**Files:**
- Create: `src/lib/receipts/lock.ts`
- Test: `src/lib/receipts/lock.test.ts`

Anti-late-call keys on PERSISTED fields only (no read-time-derived stage — `stage.ts` is regex
over the summary; a watcher could race the ingest tick). A "will" call is rejected once the
saga is non-rumour, a Here-We-Go (source_tier 0), already resolved, or the house confidence is
already at the ceiling.

- [ ] **Step 1: Write the failing tests** — `src/lib/receipts/lock.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { lockEligibility } from "./lock";

const base = { status: "rumour" as const, sourceTier: 3, confidencePct: 55, resolved: false };

describe("lockEligibility (outcome 'will')", () => {
  it("allows a live, uncertain rumour", () => {
    expect(lockEligibility({ ...base }).ok).toBe(true);
  });
  it("rejects a non-rumour subject (already confirmed/dead)", () => {
    expect(lockEligibility({ ...base, status: "confirmed" }).ok).toBe(false);
    expect(lockEligibility({ ...base, status: "dead" }).ok).toBe(false);
  });
  it("rejects a Here-We-Go (source_tier 0) even while status is still rumour", () => {
    expect(lockEligibility({ ...base, sourceTier: 0 }).ok).toBe(false);
  });
  it("rejects an already-resolved subject", () => {
    expect(lockEligibility({ ...base, resolved: true }).ok).toBe(false);
  });
  it("rejects when the house is already at/above the confidence ceiling (85)", () => {
    expect(lockEligibility({ ...base, confidencePct: 85 }).ok).toBe(false);
    expect(lockEligibility({ ...base, confidencePct: 90 }).ok).toBe(false);
  });
  it("returns a machine-reason for rejection", () => {
    expect(lockEligibility({ ...base, sourceTier: 0 }).reason).toBe("here_we_go");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/onside-b2c && npx vitest run src/lib/receipts/lock.test.ts`
Expected: FAIL — `lock.ts` does not exist.

- [ ] **Step 3: Write `src/lib/receipts/lock.ts`**

```typescript
import { LOCK_CONFIDENCE_CEILING } from "./types";

export interface SubjectLockState {
  status: "rumour" | "confirmed" | "dead" | "candidate";
  sourceTier: number; // 0 = Here We Go
  confidencePct: number; // server-recomputed house confidence at lock
  resolved: boolean; // resolved_at is set
}

export type LockReason = "ok" | "not_live" | "here_we_go" | "resolved" | "house_certain";

/** Pure anti-late-call gate for an outcome 'will' call. Keys on persisted fields only. */
export function lockEligibility(s: SubjectLockState): { ok: boolean; reason: LockReason } {
  if (s.resolved) return { ok: false, reason: "resolved" };
  if (s.status !== "rumour") return { ok: false, reason: "not_live" };
  if (s.sourceTier === 0) return { ok: false, reason: "here_we_go" };
  if (s.confidencePct >= LOCK_CONFIDENCE_CEILING) return { ok: false, reason: "house_certain" };
  return { ok: true, reason: "ok" };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/onside-b2c && npx vitest run src/lib/receipts/lock.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/receipts/lock.ts src/lib/receipts/lock.test.ts
git commit -m "feat(receipts): anti-late-call lock-eligibility predicate"
```

---

## Task 4: Scoring + reputation engine (`score.ts`)

**Files:**
- Create: `src/lib/receipts/score.ts`
- Test: `src/lib/receipts/score.test.ts`

The heart of the feature. `divergence` measures how contrarian a pick is vs the house;
`outcomePoints`/`feePoints` are **symmetric in divergence** (a confident wrong call against the
house costs as much as a right one earns — closes the variance-farming hole);
`aggregateReputation` rolls resolved calls into the legible surface (W-L, accuracy, streak) and
the hidden rank (volume floor + shrink-to-mean).

- [ ] **Step 1: Write the failing tests** — `src/lib/receipts/score.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { divergence, outcomePoints, feePoints, aggregateReputation } from "./score";
import { BASE_POINTS, MIN_VOLUME } from "./types";

describe("divergence", () => {
  it("0 when the pick echoes a certain house, ~1 against a certain house", () => {
    expect(divergence("will", 100)).toBeCloseTo(0);   // house 100% will, user picks will
    expect(divergence("will", 0)).toBeCloseTo(1);      // house 0% will, user picks will
    expect(divergence("wont", 80)).toBeCloseTo(0.8);   // house 80% will, user picks wont
    expect(divergence("will", 50)).toBeCloseTo(0.5);
  });
});

describe("outcomePoints — symmetric in divergence", () => {
  it("high-d win is large positive; high-d loss is symmetric negative", () => {
    const d = 0.8;
    const win = outcomePoints({ won: true, d });
    const loss = outcomePoints({ won: false, d });
    expect(win).toBe(Math.round(BASE_POINTS * d));
    expect(loss).toBe(-win);
  });
  it("copy-the-house (d~0) earns ~0 either way", () => {
    expect(outcomePoints({ won: true, d: 0 })).toBe(0);
    expect(outcomePoints({ won: false, d: 0 })).toBe(0);
  });
  it("earliness multiplies up to 1.5x, still symmetric", () => {
    const win = outcomePoints({ won: true, d: 0.5, earliness: 1 });
    const loss = outcomePoints({ won: false, d: 0.5, earliness: 1 });
    expect(win).toBe(Math.round(BASE_POINTS * 0.5 * 1.5));
    expect(loss).toBe(-win);
  });
});

describe("feePoints — symmetric in value-gap", () => {
  it("a big mispricing called right pays more than a small one; loss is symmetric", () => {
    const big = feePoints({ won: true, onsideValueEur: 50_000_000, confirmedFeeEur: 100_000_000 });
    const small = feePoints({ won: true, onsideValueEur: 50_000_000, confirmedFeeEur: 55_000_000 });
    expect(big).toBeGreaterThan(small);
    expect(feePoints({ won: false, onsideValueEur: 50_000_000, confirmedFeeEur: 100_000_000 })).toBe(-big);
  });
});

describe("aggregateReputation", () => {
  const won = (d: number) => ({ status: "won" as const, points: outcomePoints({ won: true, d }) });
  const lost = (d: number) => ({ status: "lost" as const, points: outcomePoints({ won: false, d }) });

  it("computes W-L, accuracy excluding push/void, and a non-loss-breaking streak", () => {
    const r = aggregateReputation([
      won(0.5), won(0.5), { status: "push", points: 0 }, won(0.5), lost(0.5),
    ]);
    expect(r.wins).toBe(3);
    expect(r.losses).toBe(1);
    expect(r.pushes).toBe(1);
    expect(r.accuracyPct).toBe(75); // 3/(3+1), push excluded
  });

  it("is UNRANKED below the volume floor", () => {
    const calls = Array.from({ length: MIN_VOLUME - 1 }, () => won(0.8));
    expect(aggregateReputation(calls).rankScore).toBeNull();
  });

  it("FARMING REGRESSION: many high-divergence calls at house-miss-rate net NEGATIVE rank", () => {
    // House is ~75% accurate on its confident band, so betting against it wins ~25%.
    const calls = [
      ...Array.from({ length: 8 }, () => won(0.8)),   // 8 lucky wins
      ...Array.from({ length: 22 }, () => lost(0.8)), // 22 losses
    ];
    const r = aggregateReputation(calls);
    expect(r.rankScore).not.toBeNull();
    expect(r.rankScore as number).toBeLessThan(0); // variance-farming is punished, not rewarded
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/onside-b2c && npx vitest run src/lib/receipts/score.test.ts`
Expected: FAIL — `score.ts` does not exist.

- [ ] **Step 3: Write `src/lib/receipts/score.ts`**

```typescript
import {
  BASE_POINTS, EARLINESS_BONUS, MIN_VOLUME, SHRINK_K,
  type OutcomePick, type ResolvedCall,
} from "./types";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** How contrarian a pick is vs the house. d=0 echoes a certain house; d=1 fights a certain house. */
export function divergence(pick: OutcomePick, houseConfidencePct: number): number {
  const pWill = clamp01(houseConfidencePct / 100);
  const pUserPick = pick === "will" ? pWill : 1 - pWill;
  return clamp01(1 - pUserPick);
}

/** Symmetric outcome points: gain and penalty both scale with divergence (and earliness). */
export function outcomePoints({ won, d, earliness = 0 }: { won: boolean; d: number; earliness?: number }): number {
  const mult = 1 + EARLINESS_BONUS * clamp01(earliness);
  const magnitude = Math.round(BASE_POINTS * clamp01(d) * mult);
  return won ? magnitude : -magnitude;
}

/** Symmetric fee points: the bigger the mispricing called, the more it's worth — and the more a wrong call costs. */
export function feePoints({ won, onsideValueEur, confirmedFeeEur }: { won: boolean; onsideValueEur: number; confirmedFeeEur: number }): number {
  const gap = onsideValueEur > 0 ? clamp01(Math.abs(confirmedFeeEur - onsideValueEur) / onsideValueEur) : 0;
  const magnitude = Math.round(BASE_POINTS * gap);
  return won ? magnitude : -magnitude;
}

export interface Reputation {
  wins: number;
  losses: number;
  pushes: number; // push + void (neutral)
  accuracyPct: number | null; // wins/(wins+losses)*100, null if none scored
  streak: number; // trailing consecutive wins; push/void neutral, loss breaks
  rankScore: number | null; // shrunk sum of points; null below MIN_VOLUME
}

/** Roll resolved calls (chronological order) into the legible surface + hidden rank. */
export function aggregateReputation(calls: ResolvedCall[]): Reputation {
  let wins = 0, losses = 0, pushes = 0, sumPoints = 0;
  for (const c of calls) {
    if (c.status === "won") wins++;
    else if (c.status === "lost") losses++;
    else if (c.status === "push" || c.status === "void") pushes++;
    sumPoints += c.points;
  }
  const scored = wins + losses;
  // Trailing streak: walk from the end; push/void neutral, loss breaks.
  let streak = 0;
  for (let i = calls.length - 1; i >= 0; i--) {
    const s = calls[i].status;
    if (s === "won") streak++;
    else if (s === "lost") break;
    // push/void: skip (neutral)
  }
  const rankScore = scored < MIN_VOLUME ? null : sumPoints * (scored / (scored + SHRINK_K));
  return {
    wins, losses, pushes,
    accuracyPct: scored === 0 ? null : Math.round((wins / scored) * 100),
    streak,
    rankScore: rankScore === null ? null : Math.round(rankScore),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/onside-b2c && npx vitest run src/lib/receipts/score.test.ts`
Expected: PASS — including the FARMING REGRESSION test (rankScore < 0).

- [ ] **Step 5: Full gate + commit**

Run: `cd ~/onside-b2c && npx vitest run src/lib/receipts && npm run build`
Expected: all receipts tests pass; build clean.

```bash
git add src/lib/receipts/score.ts src/lib/receipts/score.test.ts
git commit -m "feat(receipts): symmetric-divergence scoring + reputation rollup"
```

---

## Self-Review

- **Spec coverage:** §Mechanic resolution rules → Task 2 (incl. killed_by_competing→loss/void, fee freeze/push/void). §anti-late-call → Task 3 (persisted-field predicate, Here-We-Go closed). §Reputation hidden score → Task 4 (copy-the-house→~0 via divergence, **symmetric** gain/penalty, two-sided cap via `clamp01(d)`, volume floor + shrink, farming-regression test). Surface metrics (W-L/accuracy/streak, push/void neutral) → Task 4. ✅ Fixtures, DB, UI, lint gate are explicitly out of scope (later plans). ✅
- **Placeholder scan:** every step has complete code + exact commands. No TBD/TODO. ✅
- **Type consistency:** `OutcomePick`/`FeePick`/`PredictionStatus`/`SubjectTerminal`/`ResolvedCall`/constants defined in Task 1 and used unchanged in Tasks 2–4. `aggregateReputation` consumes `ResolvedCall[]` (status+points) produced by `outcomePoints`/`feePoints`. ✅
- **Deferred to Plan 2 (noted, not gaps):** `value-gap`/`earliness` *inputs* are computed at resolve-time from persisted `house_snapshot` + stage; this plan tests the pure functions that consume them.
