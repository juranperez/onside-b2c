import "server-only";
import { adminDb } from "@/lib/db/admin";
import { confidence, type RumourStatus } from "@/lib/rumours/confidence";
import { stageOf } from "@/lib/rumours/stage";
import { lockEligibility, type LockReason } from "./lock";
import { earlinessOf } from "./earliness";
import type { CallType, OutcomePick, FeePick } from "./types";

/** Every way a call attempt can fail before it becomes a snapshot. `"ok"` is excluded — a
 *  passed eligibility check is not itself a failure reason. */
export type SnapshotReason =
  | "bad_pick"
  | "subject_not_found"
  | "snapshot_unavailable"
  | "no_house_value"
  | Exclude<LockReason, "ok">;

export type SnapshotResult =
  | { ok: true; houseConfidencePct: number | null; houseValueEur: number | null; earliness: number }
  | { ok: false; reason: SnapshotReason };

/**
 * The server-authoritative half of making a call.
 *
 * Shared by the member path (`lockCall`) and the visitor path (`lockAnonCall`) so the two
 * can never diverge. If they computed the house number differently, claiming an anonymous
 * call would mint a receipt no member could have earned — and the receipt is the product.
 *
 * The client sends only subject + pick. Everything here is recomputed server-side and
 * never read from the request.
 *
 * Two things a caller must not redo: the `ok: true` values are already projected onto the
 * two DB columns (`houseConfidencePct` is null for a fee call, `houseValueEur` is null for
 * an outcome call, per `callType`) — write all three fields unconditionally, never re-test
 * `callType` at the insert site. And the eligibility gate lives in here too — there is no
 * valid reason to insert a prediction/anon_call without going through this function first.
 */
export async function snapshotCall(input: {
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
  const { data: r, error: rumourErr } = await db
    .from("rumours")
    .select("id, status, summary, source_tier, corroborations, reported_fee_eur, first_seen, resolved_at, player_id")
    .eq("id", input.subjectId)
    .maybeSingle();
  if (rumourErr) return { ok: false, reason: "snapshot_unavailable" };
  if (!r) return { ok: false, reason: "subject_not_found" };

  const [{ data: val, error: valErr }, { data: pl, error: plErr }] = await Promise.all([
    db.from("player_valuations").select("value_eur").eq("player_id", r.player_id).maybeSingle(),
    db.from("players").select("contract_until").eq("id", r.player_id).maybeSingle(),
  ]);
  // A swallowed error here must not fall through to the `?? 0` default below: for a fee call
  // that 0 gets frozen into the immutable house_value_eur column (migration 0003's
  // predictions_immutable trigger), and a wrong reference of 0 makes every future "higher"
  // settle a free win and every "lower" a free loss — see resolveFee/feePoints.
  if (valErr || plErr) return { ok: false, reason: "snapshot_unavailable" };
  const onsideValueEur = val?.value_eur ?? 0;

  // r.status's real domain is wider than RumourStatus — a "candidate" row hasn't been
  // promoted to a live rumour yet. lockEligibility sees that full domain below and rejects
  // a candidate via "not_live"; confidence()/stageOf() are typed against the narrower
  // RumourStatus that deliberately excludes it, so the extra cast at those two call sites is
  // a deliberate narrowing of this one shared value, not an independent guess at r.status.
  const status = r.status as RumourStatus | "candidate";

  const conf = confidence({
    status: status as RumourStatus,
    summary: r.summary,
    sourceTier: r.source_tier,
    corroborations: r.corroborations,
    reportedFeeEur: r.reported_fee_eur,
    onsideValueEur,
    contractUntil: pl?.contract_until ?? null,
    firstSeen: new Date(r.first_seen),
  });
  const earliness = earlinessOf(stageOf(r.summary, status as RumourStatus));

  // Not-live / here-we-go / resolved block every call; "house already certain" only blocks
  // a 'will' (a near-free win) — a contrarian 'wont' or a fee call may still proceed.
  const elig = lockEligibility({
    status,
    sourceTier: r.source_tier,
    confidencePct: conf.pct,
    resolved: r.resolved_at != null,
  });
  if (!elig.ok && !(elig.reason === "house_certain" && input.pick !== "will")) {
    return { ok: false, reason: elig.reason };
  }

  // A fee call is an argument with Onside's published value. With no value there is
  // nothing to argue with — and freezing 0 into the immutable house_value_eur would make
  // every future "higher" a free win: resolveFee(pick, 0, confirmedFee, ...) sets
  // marketHigher for any positive fee, while feePoints' `onsideValueEur > 0` guard zeroes
  // the magnitude. The row lands as a win worth nothing that still moves wins,
  // accuracy_pct, streak and scout_badge, and 0003's trigger blocks ever correcting it.
  //
  // Guards the VALUE, not the mechanism, so both causes land here: a failed read (caught
  // above) and a player with no valuation row at all — which is a tested reality in this
  // codebase, not a hypothesis (see the `orphan` fixture in queries/map.test.ts).
  // A genuine €0 Onside value is not a callable fee subject either, so this cannot misfire.
  if (input.callType === "fee" && !(onsideValueEur > 0)) {
    return { ok: false, reason: "no_house_value" };
  }

  return {
    ok: true,
    houseConfidencePct: input.callType === "outcome" ? conf.pct : null,
    houseValueEur: input.callType === "fee" ? onsideValueEur : null,
    earliness,
  };
}
