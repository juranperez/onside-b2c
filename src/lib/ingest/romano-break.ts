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
 * match AND a resolved destination. Anything softer is held for review. To avoid
 * duplicate cards: an existing live/queued saga for the player is upgraded in
 * place; a previously-dead saga is REVIVED (a Here We Go is definitive); an
 * already-confirmed saga is left alone (the club beat Romano to it).
 */
export function decideRomanoBreak(input: BreakInput): BreakDecision {
  const clean = input.playerId !== null && input.strength === "strong" && input.toClub !== "—";
  if (!clean) return { kind: "hold" };

  const confirmed = input.existingForPlayer.find((s) => s.status === "confirmed");
  if (confirmed) return { kind: "skip" };
  const upgradable = input.existingForPlayer.find((s) => s.status === "rumour" || s.status === "candidate");
  if (upgradable) return { kind: "upgrade-break", targetId: upgradable.id };
  // Revive rather than duplicate — prefer the same destination, else any dead card.
  const sameDestDead = input.existingForPlayer.find((s) => s.status === "dead" && s.to_club === input.toClub);
  if (sameDestDead) return { kind: "upgrade-break", targetId: sameDestDead.id };
  const anyDead = input.existingForPlayer.find((s) => s.status === "dead");
  if (anyDead) return { kind: "upgrade-break", targetId: anyDead.id };
  return { kind: "publish-break" };
}
