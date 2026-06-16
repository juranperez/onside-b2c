# Receipts & Reputation — Plan 2: Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Persist + resolve transfer-only predictions: the `predictions` + `reputation` tables, server-authoritative lock, and a resolver wired to the official-transfers ingest.

**Architecture:** A migration (table + append-only trigger + public-read RLS, all writes service-role), a pure resolver-composition (`resolver.ts`, built in Plan 1's module dir), a server-action lock that recomputes the house snapshot, and a resolver hook in the official-transfers ingest.

**Tech Stack:** Supabase (Postgres + RLS), Next.js server actions, the existing `adminDb` service-role client, `confidence.ts`, the official-transfers ingest.

**Spec:** `…/2026-06-15-receipts-reputation-design.md` (incl. the 2026-06-16 fixtures-cut amendment — **transfer-only**).

**Gate:** the migration apply + any prod deploy need Perez's per-action word. The pure pieces (resolver-composition) are built + tested already.

---

## ✅ Already built (committed)

- `src/lib/receipts/resolver.ts` + `resolver.test.ts` — `resolveTransferPrediction(stored, subjectOutcome)` composes resolve + score per row (5 tests).
- `supabase/migrations/0003_receipts.sql` — `predictions` (service-role writes, public read, append-only trigger, `subject_type` constrained to `transfer_saga`) + `reputation` rollup. **NOT applied.**

## Task 1 (GATED): apply the migration

- [ ] Perez authorizes → apply `0003_receipts.sql` to prod via Supabase MCP `apply_migration`.
- [ ] Regenerate `src/lib/db/types.ts` (Supabase `generate_typescript_types`).
- [ ] Verify: `predictions` + `reputation` exist, RLS on, the immutability trigger rejects a forged UPDATE (manual `execute_sql` test on a throwaway row, then delete it).

## Task 2 (GATED on Task 1): server-authoritative lock action

**Files:** Create `src/lib/receipts/lock-action.ts` (server action).

The lock NEVER trusts client house values — it recomputes them. Pseudocode:

```typescript
"use server";
// 1. auth: get user via the request-scoped supabase client; 401 if signed out.
// 2. load the subject (rumour) row server-side: status, source_tier, resolved_at,
//    summary (for confidence()), the player's Onside value.
// 3. recompute the house snapshot SERVER-SIDE:
//    const confidencePct = confidence(rumour).pct;          // src/lib/rumours/confidence.ts
//    const earliness = earlinessFromStage(stageOf(rumour.summary));
// 4. gate: lockEligibility({ status, sourceTier, confidencePct, resolved }) must be ok
//    (only for outcome 'will'); reject with the machine reason otherwise.
// 5. insert via adminDb (service role) with SERVER-set house_confidence_pct / house_value_eur /
//    earliness / locked_at = now(). The unique(user_id,subject_type,subject_id,call_type) blocks
//    a second call on the same subject+type.
```

- [ ] Test: a forged client `house_confidence_pct` in the form payload is ignored (the action reads only `pick`/`callType`/`subjectId` from the client; everything else is server-recomputed). Assert the inserted row's snapshot equals the server value.

## Task 3 (GATED on Task 1): resolver wired to the official-transfers ingest

**Files:** Create `src/lib/receipts/resolve-subject.ts`; modify the official-transfers ingest (`src/lib/ingest/official-transfers.ts`) + the competing-kill site (`rumour-ingest.ts`).

When a saga resolves, score its open predictions and update reputation. Pseudocode:

```typescript
// resolveSubject(subjectId, outcome: SubjectOutcome) — service role, idempotent:
//   1. select open predictions where subject_id = $1 and status = 'open'.
//   2. for each: const { status, points } = resolveTransferPrediction(stored, outcome);
//      update predictions set status, points, resolved_at = now() where id = $id;  (trigger allows these)
//   3. for each affected user_id: recompute reputation from ALL their resolved rows
//      (aggregateReputation) → upsert public.reputation; set scout_badge per the volume×accuracy×
//      diversity×age bar.
//   4. fire the in-app reveal (notifications) for the caller (+ saga followers).
```

**Wiring (the SubjectTerminal):**
- official-transfers confirm → `{ terminal: 'confirmed', confirmedFeeEur, feeKind }` (feeKind from the transfer row: disclosed/free/undisclosed).
- competing-kill site (player joined elsewhere) → `{ terminal: 'killed_by_competing' }` — **pass this flag** so a "wont" voids (not a free win).
- window-close sweep (NEW, small): dormant `status='rumour'` at window close → `{ terminal: 'expired' }`.

- [ ] Idempotency test: re-running `resolveSubject` on an already-resolved subject is a no-op (the `status='open'` filter + per-row resolved_at).

## Task 4 (GATED on Task 1): reputation read query

**Files:** Create `src/lib/receipts/queries.ts`.

- [ ] `getReputation(userId)` → the `reputation` row (or a zeroed default).
- [ ] `getUserPredictions(userId)` → resolved + open calls for the hub (Plan 3 consumes this).

## Self-Review

- Spec coverage: §data model → migration (Task 1) + append-only trigger. §server-authoritative lock → Task 2. §resolvers off existing events + killed_by_competing flag → Task 3. §reputation rollup (incremental surface + batch-style recompute) → Task 3 step 3. ✅
- Reconciliation: `status` enum is the 5-value `open|won|lost|push|void` (Plan 1); `expired` is a `SubjectTerminal` input, not a stored status. ✅
- Out of scope (later plans): inline chip + hub + share (Plan 3). Fixtures: **cut** (no `fixture` subject_type). ✅
