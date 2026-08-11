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
