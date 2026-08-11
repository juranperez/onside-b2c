import "server-only";
import { readDb } from "@/lib/db/server";

/**
 * Minimum distinct callers before a club board renders at all.
 *
 * This is the spec's open question 4, answered: a leaderboard of one is not a
 * leaderboard, it is a person standing alone on a podium. Three is the smallest number
 * where the ordering carries any information.
 *
 * Reality check at time of writing: the whole platform has 2 callers, so no club clears
 * this yet and the section renders nowhere. That is the correct outcome — the board
 * should appear when there is something to rank, not before.
 */
export const MIN_CLUB_CALLERS = 3;

export interface ClubCaller {
  username: string;
  displayName: string | null;
  wins: number;
  losses: number;
  accuracyPct: number | null;
  scoutBadge: boolean;
  /** How many calls this person has made on this club's deals. */
  callsHere: number;
}

/**
 * The best callers of one club's deals — club-scoped, never global.
 *
 * A global board rewards the top 1% and tells everyone else they are losing. A club
 * board is small, tribal and winnable, which is the point.
 *
 * Only handle-holders appear. Someone without a claimed handle has no public page, so
 * their row would be an unclickable dead end — and the join runs through
 * `public_profiles`, which excludes them by construction anyway.
 *
 * Returns `[]` — not a short list — when fewer than MIN_CLUB_CALLERS distinct people
 * have called here.
 */
export async function getClubLeaderboard(rumourIds: string[]): Promise<ClubCaller[]> {
  if (!rumourIds.length) return [];
  const db = readDb();

  const { data: calls } = await db
    .from("predictions")
    .select("user_id")
    .eq("subject_type", "transfer_saga")
    .in("subject_id", rumourIds);
  if (!calls?.length) return [];

  const callsHere = new Map<string, number>();
  for (const c of calls) callsHere.set(c.user_id, (callsHere.get(c.user_id) ?? 0) + 1);
  if (callsHere.size < MIN_CLUB_CALLERS) return [];

  const userIds = [...callsHere.keys()];
  const [profiles, reps] = await Promise.all([
    db.from("public_profiles").select("id, username, display_name").in("id", userIds),
    db.from("reputation").select("user_id, wins, losses, accuracy_pct, rank_score, scout_badge").in("user_id", userIds),
  ]);

  const repBy = new Map((reps.data ?? []).map((r) => [r.user_id, r] as const));

  // The generated type for a view marks every column nullable, so narrow both fields we
  // actually key on rather than asserting past it.
  const board = (profiles.data ?? [])
    .filter((p): p is typeof p & { id: string; username: string } => !!p.username && !!p.id)
    .map((p) => {
      const rep = repBy.get(p.id);
      return {
        username: p.username,
        displayName: p.display_name,
        wins: rep?.wins ?? 0,
        losses: rep?.losses ?? 0,
        accuracyPct: rep?.accuracy_pct ?? null,
        scoutBadge: rep?.scout_badge ?? false,
        callsHere: callsHere.get(p.id) ?? 0,
      };
    });

  // Ranking input kept beside the rows rather than on them: rank_score is the hidden,
  // difficulty-weighted score and must never reach the client, where it would be a
  // number to farm rather than a record to beat.
  const scoreBy = new Map(
    (reps.data ?? []).map((r) => [r.user_id, r.rank_score ?? -1] as const),
  );
  const idByUsername = new Map(
    (profiles.data ?? []).filter((p) => p.username && p.id).map((p) => [p.username as string, p.id as string] as const),
  );
  const scoreOf = (username: string) => scoreBy.get(idByUsername.get(username) ?? "") ?? -1;

  // Claimed handles can be fewer than distinct callers, so re-check the gate against
  // what will actually render rather than against who called.
  if (board.length < MIN_CLUB_CALLERS) return [];

  return board
    .sort(
      (a, b) =>
        scoreOf(b.username) - scoreOf(a.username) ||
        b.wins - a.wins ||
        a.losses - b.losses ||
        b.callsHere - a.callsHere,
    )
    .slice(0, 10);
}
