import type { MatchStrength } from "./match";

export type SagaStatus = "rumour" | "candidate" | "confirmed" | "dead";

export interface ExistingSaga {
  id: string;
  status: SagaStatus;
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
