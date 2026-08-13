import "server-only";
import { adminDb } from "@/lib/db/admin";
import { confidence, type RumourStatus } from "@/lib/rumours/confidence";
import { stageOf } from "@/lib/rumours/stage";
import { lockEligibility } from "./lock";
import { earlinessOf } from "./earliness";
import type { CallType, OutcomePick, FeePick } from "./types";

export type SnapshotResult =
  | { ok: true; houseConfidencePct: number; onsideValueEur: number; earliness: number }
  | { ok: false; reason: string };

/**
 * The server-authoritative half of making a call.
 *
 * Shared by the member path (`lockCall`) and the visitor path (`lockAnonCall`) so the two
 * can never diverge. If they computed the house number differently, claiming an anonymous
 * call would mint a receipt no member could have earned — and the receipt is the product.
 *
 * The client sends only subject + pick. Everything here is recomputed server-side and
 * never read from the request.
 */
export async function resolveCallSnapshot(input: {
  subjectId: string;
  callType: CallType;
  pick: OutcomePick | FeePick;
}): Promise<SnapshotResult> {
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

  // Not-live / here-we-go / resolved block every call; "house already certain" only blocks
  // a 'will' (a near-free win) — a contrarian 'wont' or a fee call may still proceed.
  const elig = lockEligibility({
    status: r.status as "rumour" | "confirmed" | "dead" | "candidate",
    sourceTier: r.source_tier,
    confidencePct: conf.pct,
    resolved: r.resolved_at != null,
  });
  if (!elig.ok && !(elig.reason === "house_certain" && input.pick !== "will")) {
    return { ok: false, reason: elig.reason };
  }

  return { ok: true, houseConfidencePct: conf.pct, onsideValueEur, earliness };
}
