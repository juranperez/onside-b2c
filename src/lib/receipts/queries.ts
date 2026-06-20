import "server-only";
import { adminDb } from "@/lib/db/admin";
import { aggregateReputation } from "./score";
import type { ResolvedCall } from "./types";

export interface MyCall {
  callType: "outcome" | "fee";
  pick: string;
  status: string;
  points: number;
}

/** The signed-in user's OUTCOME call on a saga (for the inline chip's locked state), or null. */
export async function getMyOutcomeCall(subjectId: string, userId: string): Promise<MyCall | null> {
  const { data } = await adminDb()
    .from("predictions")
    .select("call_type, pick, status, points")
    .eq("subject_id", subjectId)
    .eq("user_id", userId)
    .eq("call_type", "outcome")
    .maybeSingle();
  if (!data) return null;
  return { callType: data.call_type as "outcome" | "fee", pick: data.pick, status: data.status, points: data.points };
}

export interface ReputationView {
  wins: number;
  losses: number;
  pushes: number;
  accuracyPct: number | null;
  streak: number;
  rankScore: number | null;
  scoutBadge: boolean;
}

/** A user's public reputation rollup (zeroed default when they have no row yet). */
export async function getReputation(userId: string): Promise<ReputationView> {
  const { data } = await adminDb()
    .from("reputation")
    .select("wins, losses, pushes, accuracy_pct, streak, rank_score, scout_badge")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { wins: 0, losses: 0, pushes: 0, accuracyPct: null, streak: 0, rankScore: null, scoutBadge: false };
  return {
    wins: data.wins,
    losses: data.losses,
    pushes: data.pushes,
    accuracyPct: data.accuracy_pct,
    streak: data.streak,
    rankScore: data.rank_score,
    scoutBadge: data.scout_badge,
  };
}

/** Recompute a reputation view straight from a user's resolved calls (e.g. for previewing). */
export function reputationFromCalls(calls: ResolvedCall[]): ReturnType<typeof aggregateReputation> {
  return aggregateReputation(calls);
}
