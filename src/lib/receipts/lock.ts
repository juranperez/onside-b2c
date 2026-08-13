import { LOCK_CONFIDENCE_CEILING } from "./types";

export interface SubjectLockState {
  status: "rumour" | "confirmed" | "dead" | "candidate";
  sourceTier: number; // 0 = Here We Go
  confidencePct: number; // server-recomputed house confidence at lock
  resolved: boolean; // resolved_at is set
}

export type LockReason = "ok" | "not_live" | "here_we_go" | "resolved" | "house_certain";

export type LockEligibility =
  | { ok: true; reason: "ok" }
  | { ok: false; reason: Exclude<LockReason, "ok"> };

/** Pure anti-late-call gate for an outcome 'will' call. Keys on persisted fields only. */
export function lockEligibility(s: SubjectLockState): LockEligibility {
  if (s.resolved) return { ok: false, reason: "resolved" };
  if (s.status !== "rumour") return { ok: false, reason: "not_live" };
  if (s.sourceTier === 0) return { ok: false, reason: "here_we_go" };
  if (s.confidencePct >= LOCK_CONFIDENCE_CEILING) return { ok: false, reason: "house_certain" };
  return { ok: true, reason: "ok" };
}
