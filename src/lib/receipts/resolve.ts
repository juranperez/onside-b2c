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
