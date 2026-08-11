// Client-safe pure logic for the interactive "make your bracket" predictor.
// Resolves a user's picks up the WC2026 knockout tree and packs them into a short,
// login-free share code. Type-only import of the bracket types, so nothing here pulls
// server/DB code into the client bundle.

import type { Bracket, BracketTeam } from "./bracket";

// Flat tree layout: R32 = 0–15, R16 = 16–23, QF = 24–27, SF = 28–29, Final = 30.
// A tie's two feeder ties are childBase + 2*local and +1.
export const PREDICT_ROUNDS = [
  { name: "Round of 32", base: 0, size: 16, childBase: -1 },
  { name: "Round of 16", base: 16, size: 8, childBase: 0 },
  { name: "Quarter-finals", base: 24, size: 4, childBase: 16 },
  { name: "Semi-finals", base: 28, size: 2, childBase: 24 },
  { name: "Final", base: 30, size: 1, childBase: 28 },
] as const;

export const TIE_COUNT = 31;
export const FINAL_FLAT = 30;

export type Side = 0 | 1 | null; // 0 = home/top, 1 = away/bottom, null = unpicked

export interface ResolvedTie {
  flat: number;
  roundName: string;
  roundIndex: number;
  localIndex: number;
  home: BracketTeam | null;
  away: BracketTeam | null;
  scoreHome: number | null;
  scoreAway: number | null;
  status: "scheduled" | "live" | "finished" | null;
  lockedWinner: 0 | 1 | null; // decisive real result — not user-changeable
  side: Side; // the user's pick (ignored when locked)
  advancer: BracketTeam | null;
  pickable: boolean;
}

/** A finished tie with a non-drawn score has a known winner; draws (penalties) stay open to prediction. */
function decisiveWinner(sh: number | null, sa: number | null, status: string | null): 0 | 1 | null {
  if (status !== "finished" || sh == null || sa == null || sh === sa) return null;
  return sh > sa ? 0 : 1;
}

/** Walk the tree bottom-up, filling each tie's teams from its child advancers and applying picks. */
export function resolveBracket(bracket: Bracket, sides: Side[]): ResolvedTie[] {
  const out: ResolvedTie[] = new Array(TIE_COUNT);
  for (let r = 0; r < PREDICT_ROUNDS.length; r++) {
    const meta = PREDICT_ROUNDS[r];
    const serverRound = bracket.rounds[r];
    for (let i = 0; i < meta.size; i++) {
      const flat = meta.base + i;
      const serverSlot = serverRound?.slots[i];
      const hasReal = !!(serverSlot && serverSlot.home && serverSlot.away);

      let home: BracketTeam | null = null;
      let away: BracketTeam | null = null;
      let scoreHome: number | null = null;
      let scoreAway: number | null = null;
      let status: ResolvedTie["status"] = null;

      if (r === 0 || hasReal) {
        home = serverSlot?.home ?? null;
        away = serverSlot?.away ?? null;
        scoreHome = serverSlot?.scoreHome ?? null;
        scoreAway = serverSlot?.scoreAway ?? null;
        status = serverSlot?.status ?? null;
      } else {
        // Predicted matchup — teams are whoever the user advanced from the two feeder ties.
        home = out[meta.childBase + 2 * i]?.advancer ?? null;
        away = out[meta.childBase + 2 * i + 1]?.advancer ?? null;
      }

      const lockedWinner = decisiveWinner(scoreHome, scoreAway, status);
      const side = sides[flat] ?? null;
      let advancer: BracketTeam | null = null;
      if (lockedWinner != null) advancer = lockedWinner === 0 ? home : away;
      else if (side != null) advancer = side === 0 ? home : away;

      out[flat] = {
        flat, roundName: meta.name, roundIndex: r, localIndex: i,
        home, away, scoreHome, scoreAway, status, lockedWinner, side, advancer,
        pickable: lockedWinner == null && !!home && !!away,
      };
    }
  }
  return out;
}

export function champion(resolved: ResolvedTie[]): BracketTeam | null {
  return resolved[FINAL_FLAT]?.advancer ?? null;
}

/** True once every tie has an advancer — i.e. the user has predicted through to a champion. */
export function isComplete(resolved: ResolvedTie[]): boolean {
  return resolved.every((t) => t.advancer != null);
}

/** Pack the 31 pick-sides into a short base36 code for a login-free share URL. */
export function encodeSides(sides: Side[]): string {
  let n = 0;
  for (let i = 0; i < TIE_COUNT; i++) if (sides[i] === 1) n |= 1 << i;
  return (n >>> 0).toString(36);
}

export function decodeSides(code: string): Side[] {
  const n = (parseInt(code, 36) || 0) >>> 0;
  const sides: Side[] = new Array(TIE_COUNT).fill(null);
  for (let i = 0; i < TIE_COUNT; i++) sides[i] = ((n >> i) & 1) as Side;
  return sides;
}
