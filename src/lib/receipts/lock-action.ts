"use server";

import { getSessionUser } from "@/lib/db/supabase-server";
import { adminDb } from "@/lib/db/admin";
import { resolveCallSnapshot } from "./snapshot";
import type { CallType, OutcomePick, FeePick } from "./types";

export type LockResult = { ok: true; id: string } | { ok: false; reason: string };

/**
 * Lock a transfer call. SERVER-AUTHORITATIVE: the client sends only the subject + pick; the
 * house snapshot (confidence / value / earliness) is recomputed in `resolveCallSnapshot`
 * (./snapshot.ts) and never trusted from the client, so the anti-copy-the-house and earliness
 * credit can't be forged. That snapshot logic is shared with the anonymous call path so the two
 * can never diverge on the house number. The insert runs as service-role (predictions has no
 * authenticated write policy); the unique constraint blocks a second call on the same subject +
 * call_type.
 */
export async function lockCall(input: {
  subjectId: string;
  callType: CallType;
  pick: OutcomePick | FeePick;
}): Promise<LockResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "not_signed_in" };

  const snap = await resolveCallSnapshot(input);
  if (!snap.ok) return { ok: false, reason: snap.reason };

  const { data, error } = await adminDb()
    .from("predictions")
    .insert({
      user_id: user.id,
      subject_id: input.subjectId,
      call_type: input.callType,
      pick: input.pick,
      house_confidence_pct: input.callType === "outcome" ? snap.houseConfidencePct : null,
      house_value_eur: input.callType === "fee" ? snap.onsideValueEur : null,
      earliness: snap.earliness,
    })
    .select("id")
    .single();

  if (error) return { ok: false, reason: error.code === "23505" ? "already_called" : "insert_failed" };
  return { ok: true, id: data.id };
}
