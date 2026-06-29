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

/** One of the user's calls, joined to the saga it was made on — for the receipts hub. */
export interface ReceiptCall {
  id: string;
  callType: "outcome" | "fee";
  pick: string; // will | wont | higher | lower
  status: string; // open | won | lost | push | void
  points: number;
  houseConfidencePct: number | null;
  houseValueEur: number | null;
  lockedAt: string;
  resolvedAt: string | null;
  subject: {
    id: string;
    player: string;
    playerSlug: string;
    fromClub: string;
    toClub: string;
    photoUrl: string | null;
  } | null;
}

/** Every call a user has made, newest first, joined to the saga for display. Powers the receipts hub. */
export async function getMyCalls(userId: string): Promise<ReceiptCall[]> {
  const { data: preds } = await adminDb()
    .from("predictions")
    .select("id, call_type, pick, status, points, house_confidence_pct, house_value_eur, locked_at, resolved_at, subject_id")
    .eq("user_id", userId)
    .order("locked_at", { ascending: false });
  if (!preds?.length) return [];

  // subject_id is a polymorphic text key (no FK), so resolve the sagas in a second batched read.
  const ids = [...new Set(preds.map((p) => p.subject_id))];
  const { data: rows } = await adminDb()
    .from("rumours")
    .select("id, to_club, players(name, known_as, slug, photo_url, clubs(name))")
    .in("id", ids);
  type RumourRow = {
    id: string;
    to_club: string | null;
    players: { name: string; known_as: string | null; slug: string; photo_url: string | null; clubs: { name: string } | null } | null;
  };
  const byId = new Map(((rows ?? []) as unknown as RumourRow[]).map((r) => [r.id, r] as const));

  return preds.map((p) => {
    const r = byId.get(p.subject_id);
    const pl = r?.players ?? null;
    return {
      id: p.id,
      callType: p.call_type as "outcome" | "fee",
      pick: p.pick,
      status: p.status,
      points: p.points,
      houseConfidencePct: p.house_confidence_pct,
      houseValueEur: p.house_value_eur,
      lockedAt: p.locked_at,
      resolvedAt: p.resolved_at,
      subject: pl
        ? {
            id: p.subject_id,
            player: pl.known_as ?? pl.name,
            playerSlug: pl.slug,
            fromClub: pl.clubs?.name ?? "Free agent",
            toClub: r?.to_club ?? "—",
            photoUrl: pl.photo_url ?? null,
          }
        : null,
    };
  });
}
