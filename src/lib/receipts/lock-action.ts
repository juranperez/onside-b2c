"use server";

import { getSessionUser } from "@/lib/db/supabase-server";
import { adminDb } from "@/lib/db/admin";
import { confidence, type RumourStatus } from "@/lib/rumours/confidence";
import { stageOf } from "@/lib/rumours/stage";
import { lockEligibility } from "./lock";
import { earlinessOf } from "./earliness";
import type { CallType, OutcomePick, FeePick } from "./types";

export type LockResult = { ok: true; id: string } | { ok: false; reason: string };

/**
 * Lock a transfer call. SERVER-AUTHORITATIVE: the client sends only the subject + pick; the
 * house snapshot (confidence / value / earliness) is recomputed here and never trusted from the
 * client, so the anti-copy-the-house and earliness credit can't be forged. The insert runs as
 * service-role (predictions has no authenticated write policy); the unique constraint blocks a
 * second call on the same subject + call_type.
 */
export async function lockCall(input: {
  subjectId: string;
  callType: CallType;
  pick: OutcomePick | FeePick;
}): Promise<LockResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "not_signed_in" };

  // Validate the pick matches the call type.
  const validOutcome = input.pick === "will" || input.pick === "wont";
  const validFee = input.pick === "higher" || input.pick === "lower";
  if ((input.callType === "outcome") !== validOutcome || (input.callType === "fee") !== validFee) {
    return { ok: false, reason: "bad_pick" };
  }

  const db = adminDb();
  const { data: r } = await db
    .from("rumours")
    .select("id, status, summary, source_tier, corroborations, reported_fee_eur, first_seen, resolved_at, player_id")
    .eq("id", input.subjectId)
    .maybeSingle();
  if (!r) return { ok: false, reason: "subject_not_found" };

  // Server-side snapshot inputs.
  const [{ data: val }, { data: pl }] = await Promise.all([
    db.from("player_valuations").select("value_eur").eq("player_id", r.player_id).maybeSingle(),
    db.from("players").select("contract_until").eq("id", r.player_id).maybeSingle(),
  ]);
  const onsideValueEur = val?.value_eur ?? 0;

  const conf = confidence({
    status: r.status as RumourStatus,
    summary: r.summary,
    sourceTier: r.source_tier,
    corroborations: r.corroborations,
    reportedFeeEur: r.reported_fee_eur,
    onsideValueEur,
    contractUntil: pl?.contract_until ?? null,
    firstSeen: new Date(r.first_seen),
  });
  const earliness = earlinessOf(stageOf(r.summary, r.status as RumourStatus));

  // Gate: not-live / here-we-go / resolved block every call; the "house already certain" rejection
  // only blocks a 'will' (a near-free win) — a contrarian 'wont' or a fee call may still proceed.
  const elig = lockEligibility({
    status: r.status as "rumour" | "confirmed" | "dead" | "candidate",
    sourceTier: r.source_tier,
    confidencePct: conf.pct,
    resolved: r.resolved_at != null,
  });
  if (!elig.ok && !(elig.reason === "house_certain" && input.pick !== "will")) {
    return { ok: false, reason: elig.reason };
  }

  const { data, error } = await db
    .from("predictions")
    .insert({
      user_id: user.id,
      subject_id: input.subjectId,
      call_type: input.callType,
      pick: input.pick,
      house_confidence_pct: input.callType === "outcome" ? conf.pct : null,
      house_value_eur: input.callType === "fee" ? onsideValueEur : null,
      earliness,
    })
    .select("id")
    .single();

  if (error) return { ok: false, reason: error.code === "23505" ? "already_called" : "insert_failed" };
  return { ok: true, id: data.id };
}
