import { resolveOutcome, resolveFee } from "./resolve";
import { divergence, outcomePoints, feePoints } from "./score";
import type { CallType, OutcomePick, FeePick, SubjectTerminal, FeeKind, PredictionStatus } from "./types";

/** The resolvable fields of a stored prediction (the house snapshot captured server-side at lock). */
export interface StoredPrediction {
  callType: CallType;
  pick: OutcomePick | FeePick;
  /** Onside Confidence % captured at lock — the house lean for outcome divergence. */
  houseConfidencePct: number;
  /** Onside player value (EUR) captured at lock — the reference for a fee call. */
  houseValueEur: number;
  /** 0..1 earliness from the saga stage at lock; higher = earlier = harder. */
  earliness: number;
}

/** How the transfer saga terminally resolved + its confirmed fee. */
export interface SubjectOutcome {
  terminal: SubjectTerminal;
  confirmedFeeEur: number | null;
  feeKind: FeeKind;
}

export interface ResolvedPrediction {
  status: PredictionStatus;
  points: number;
}

/**
 * Compose resolution + scoring for ONE stored transfer prediction. Pure — the DB resolver calls
 * this per open row, then writes status/points and recomputes the user's reputation rollup.
 * push/void carry zero points; only won/lost are scored.
 */
export function resolveTransferPrediction(p: StoredPrediction, s: SubjectOutcome): ResolvedPrediction {
  if (p.callType === "outcome") {
    const status = resolveOutcome(p.pick as OutcomePick, s.terminal);
    if (status === "won" || status === "lost") {
      const d = divergence(p.pick as OutcomePick, p.houseConfidencePct);
      return { status, points: outcomePoints({ won: status === "won", d, earliness: p.earliness }) };
    }
    return { status, points: 0 };
  }
  const status = resolveFee(p.pick as FeePick, p.houseValueEur, s.confirmedFeeEur, s.feeKind);
  if ((status === "won" || status === "lost") && s.confirmedFeeEur != null) {
    return { status, points: feePoints({ won: status === "won", onsideValueEur: p.houseValueEur, confirmedFeeEur: s.confirmedFeeEur }) };
  }
  return { status, points: 0 };
}
