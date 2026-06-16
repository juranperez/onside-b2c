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
  return (won ? magnitude : -magnitude) || 0; // || 0 normalizes -0 -> 0
}

/** Symmetric fee points: the bigger the mispricing called, the more it's worth — and the more a wrong call costs. */
export function feePoints({ won, onsideValueEur, confirmedFeeEur }: { won: boolean; onsideValueEur: number; confirmedFeeEur: number }): number {
  const gap = onsideValueEur > 0 ? clamp01(Math.abs(confirmedFeeEur - onsideValueEur) / onsideValueEur) : 0;
  const magnitude = Math.round(BASE_POINTS * gap);
  return (won ? magnitude : -magnitude) || 0; // || 0 normalizes -0 -> 0
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
