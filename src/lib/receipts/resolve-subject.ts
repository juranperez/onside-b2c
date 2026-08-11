import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { adminDb } from "@/lib/db/admin";
import { resolveTransferPrediction, type SubjectOutcome } from "./resolver";
import { aggregateReputation } from "./score";
import type { CallType, OutcomePick, FeePick, ResolvedCall } from "./types";

type Db = SupabaseClient<Database>;

/**
 * Resolve every open prediction for a transfer saga and recompute the affected users' reputation.
 * Idempotent — only rows still 'open' are scored, so a re-run (the cron may fire repeatedly) is a
 * no-op. Called by the official-transfers ingest on a saga's confirm / competing-kill / expiry.
 */
export async function resolveSubject(subjectId: string, outcome: SubjectOutcome, db: Db = adminDb()): Promise<number> {
  const { data: open } = await db
    .from("predictions")
    .select("id, user_id, call_type, pick, house_confidence_pct, house_value_eur, earliness")
    .eq("subject_id", subjectId)
    .eq("status", "open");
  if (!open || open.length === 0) return 0;

  const affected = new Set<string>();
  for (const p of open) {
    const { status, points } = resolveTransferPrediction(
      {
        callType: p.call_type as CallType,
        pick: p.pick as OutcomePick | FeePick,
        houseConfidencePct: p.house_confidence_pct ?? 0,
        houseValueEur: p.house_value_eur ?? 0,
        earliness: p.earliness,
      },
      outcome,
    );
    await db.from("predictions").update({ status, points, resolved_at: new Date().toISOString() }).eq("id", p.id);
    affected.add(p.user_id);
  }

  for (const userId of affected) await recomputeReputation(db, userId);
  return open.length;
}

/** Recompute one user's reputation from all their resolved calls and upsert the rollup. */
async function recomputeReputation(db: Db, userId: string): Promise<void> {
  const { data: resolved } = await db
    .from("predictions")
    .select("status, points")
    .eq("user_id", userId)
    .neq("status", "open")
    .order("resolved_at", { ascending: true });

  const rep = aggregateReputation((resolved ?? []) as ResolvedCall[]);
  const scored = rep.wins + rep.losses;
  await db.from("reputation").upsert(
    {
      user_id: userId,
      wins: rep.wins,
      losses: rep.losses,
      pushes: rep.pushes,
      accuracy_pct: rep.accuracyPct,
      streak: rep.streak,
      rank_score: rep.rankScore,
      // Verified scout: ranked (past the volume floor) + a real accuracy over a real sample.
      // (Subject-diversity + account-age hardening tracked for a later pass.)
      scout_badge: rep.rankScore != null && scored >= 20 && (rep.accuracyPct ?? 0) >= 60,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}
