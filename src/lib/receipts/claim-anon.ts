import "server-only";
import { adminDb } from "@/lib/db/admin";
import { clearAnonSession, readAnonSession } from "./anon-session";
import { resolveSubject } from "./resolve-subject";
import type { SubjectOutcome } from "./resolver";

export interface AnonRow {
  id: string;
  session_id: string;
  subject_type: string;
  subject_id: string;
  call_type: string;
  pick: string;
  house_confidence_pct: number | null;
  house_value_eur: number | null;
  earliness: number;
  locked_at: string;
}

export interface ExistingCall {
  subject_id: string;
  call_type: string;
}

export interface ClaimPlan {
  inserts: {
    user_id: string;
    subject_type: string;
    subject_id: string;
    call_type: string;
    pick: string;
    house_confidence_pct: number | null;
    house_value_eur: number | null;
    earliness: number;
    locked_at: string;
  }[];
  /** Anon ids discarded — the account already holds a call on that deal and call type. */
  dropped: string[];
  /** Every anon id handled, claimed or dropped. All get deleted. */
  consumedIds: string[];
}

/**
 * Pure: decide what a claim writes, given the visitor's anonymous rows and the calls the
 * account already holds.
 *
 * `locked_at` is copied across deliberately. Letting it default to now() would reset
 * "I called it in July" to the signup date — the receipt would still exist and still
 * score, just quietly worthless. Nothing would fail, which is exactly why this is tested.
 */
export function planClaim(anon: AnonRow[], existing: ExistingCall[], userId: string): ClaimPlan {
  const taken = new Set(existing.map((e) => `${e.subject_id}:${e.call_type}`));
  const inserts: ClaimPlan["inserts"] = [];
  const dropped: string[] = [];

  for (const a of anon) {
    const key = `${a.subject_id}:${a.call_type}`;
    if (taken.has(key)) {
      // Either the account already called this knowingly, as itself — which wins — or an
      // earlier row in this same batch claimed it. Both must be dropped, or predictions'
      // unique index would reject the insert and take the whole batch with it.
      dropped.push(a.id);
      continue;
    }
    taken.add(key);
    inserts.push({
      user_id: userId,
      subject_type: a.subject_type,
      subject_id: a.subject_id,
      call_type: a.call_type,
      pick: a.pick,
      house_confidence_pct: a.house_confidence_pct,
      house_value_eur: a.house_value_eur,
      earliness: a.earliness,
      locked_at: a.locked_at,
    });
  }

  return { inserts, dropped, consumedIds: anon.map((a) => a.id) };
}

/**
 * Merge this browser's anonymous calls into a real account.
 *
 * Never throws. A failure here must not cost someone their signup — the rows stay put and
 * the next visit retries, because the cookie is only cleared on success.
 */
export async function claimAnonCalls(userId: string): Promise<{ claimed: number }> {
  try {
    const sessionId = await readAnonSession();
    if (!sessionId) return { claimed: 0 };

    const db = adminDb();
    const { data: anon } = await db.from("anon_calls").select("*").eq("session_id", sessionId);
    if (!anon?.length) {
      await clearAnonSession();
      return { claimed: 0 };
    }

    const { data: existing } = await db
      .from("predictions")
      .select("subject_id, call_type")
      .eq("user_id", userId);

    const plan = planClaim(anon as AnonRow[], (existing ?? []) as ExistingCall[], userId);

    if (plan.inserts.length) {
      const { error } = await db.from("predictions").insert(plan.inserts);
      // Leave the rows for the next attempt rather than deleting work we failed to save.
      if (error) return { claimed: 0 };

      // A deal can settle while a call sits unclaimed. resolveSubject only runs at the
      // moment a saga confirms or dies, so a prediction inserted AFTER that event would
      // sit 'open' forever — a correct, early call that silently never scores.
      //
      // This can only ever be the called-while-open, settled-while-unclaimed case:
      // lockEligibility refuses a call on a resolved saga, so nobody can call an outcome
      // they have already seen.
      //
      // Outcome reconstructed exactly as the ingest builds it (official-transfers.ts).
      const subjects = [...new Set(plan.inserts.map((i) => i.subject_id))];
      const { data: settled } = await db
        .from("rumours")
        .select("id, status, reported_fee_eur")
        .in("id", subjects)
        .not("resolved_at", "is", null);

      for (const s of settled ?? []) {
        const fee = s.reported_fee_eur;
        const outcome: SubjectOutcome =
          s.status === "confirmed"
            ? {
                terminal: "confirmed",
                confirmedFeeEur: fee,
                feeKind: fee === 0 ? "free" : fee != null ? "disclosed" : "undisclosed",
              }
            : { terminal: "killed_by_competing", confirmedFeeEur: null, feeKind: "undisclosed" };
        // Idempotent — resolveSubject only scores rows still 'open'.
        await resolveSubject(s.id, outcome, db).catch(() => {});
      }
    }

    await db.from("anon_calls").delete().in("id", plan.consumedIds);
    await clearAnonSession();
    return { claimed: plan.inserts.length };
  } catch {
    return { claimed: 0 };
  }
}
