"use server";

import { headers } from "next/headers";
import { adminDb } from "@/lib/db/admin";
import { rateLimit } from "@/lib/ratelimit";
import { snapshotCall, type SnapshotReason } from "./snapshot";
import { ensureAnonSession } from "./anon-session";
import type { CallType, OutcomePick, FeePick } from "./types";

export type AnonLockReason = SnapshotReason | "rate_limited" | "already_called" | "insert_failed";

export type AnonLockResult = { ok: true } | { ok: false; reason: AnonLockReason };

/**
 * Burst guard only, not a quota.
 *
 * It is in-memory and per serverless instance, so it resets on a cold start and a
 * determined script routes around it. That is acceptable because the real integrity
 * control is that anonymous calls are PRIVATE: they never appear in a public tally or
 * in the board's ordering, so flooding the table buys an attacker nothing visible. Do
 * not replace this with a durable limiter without a reason that isn't "it looks weak".
 */
const MAX_PER_IP = 20;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Lock a call for someone who does not have an account yet.
 *
 * Runs the identical server-authoritative snapshot a member's call gets — same house
 * confidence, same value, same earliness, same eligibility gate — via `snapshotCall`.
 * Only the destination row differs. If the two paths ever computed the house number
 * differently, claiming this call later would mint a receipt no member could have earned.
 *
 * The call is invisible to everyone until an account claims it, including in the board's
 * argument counts. `anon_calls` has RLS on with zero policies and no grants to anon or
 * authenticated, so that privacy is enforced by the database rather than by convention.
 */
export async function lockAnonCall(input: {
  subjectId: string;
  callType: CallType;
  pick: OutcomePick | FeePick;
}): Promise<AnonLockResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`anon-call:${ip}`, MAX_PER_IP, WINDOW_MS).ok) {
    return { ok: false, reason: "rate_limited" };
  }

  const snap = await snapshotCall(input);
  if (!snap.ok) return { ok: false, reason: snap.reason };

  // Minted only after the snapshot passes, so a rejected call leaves no cookie behind on
  // a browser that never successfully called anything.
  const sessionId = await ensureAnonSession();

  const { error } = await adminDb().from("anon_calls").insert({
    session_id: sessionId,
    subject_id: input.subjectId,
    call_type: input.callType,
    pick: input.pick,
    house_confidence_pct: snap.houseConfidencePct,
    house_value_eur: snap.houseValueEur,
    earliness: snap.earliness,
  });

  if (error) {
    // 23505 = the unique index on (session_id, subject_type, subject_id, call_type).
    return { ok: false, reason: error.code === "23505" ? "already_called" : "insert_failed" };
  }
  return { ok: true };
}

/**
 * Did THIS request arrive carrying the anonymous session cookie?
 *
 * Called once by the client after a successful anonymous call. There is no in-request
 * signal for "cookies are blocked" — within the request that serves the call, a visitor
 * whose cookie will stick and one whose cookie will be dropped are byte-identical, and
 * the insert succeeds either way. Because this is a SEPARATE HTTP request, it carries the
 * cookie if and only if the browser actually stored it.
 *
 * Without it, a blocked browser gets a success state over a row written against a session
 * id it will never present again — orphaned, invisible and unclaimable, in a table that is
 * private by construction so nobody would ever notice them accumulating.
 *
 * MUST stay on the read-only helper. Minting here would set a fresh cookie and make this
 * always report success, which is worse than not checking at all.
 */
export async function anonSessionPresent(): Promise<boolean> {
  const { readAnonSession } = await import("./anon-session");
  return (await readAnonSession()) !== null;
}

/**
 * The caller's existing call on one deal, whoever they are.
 *
 * Exists because the surfaces that render a chip cannot all look this up server-side.
 * The homepage must stay statically rendered, so it cannot read the session or the
 * anonymous cookie during render — see CallChipAuto. Without this, a visitor who calls
 * and then reloads is shown a fresh chip as though they never called, clicks again, and
 * gets "You've already called this one." The data stays correct; the page just contradicts
 * itself, which on a product about receipts is the worst kind of small bug.
 *
 * Checks the member path first: a claimed call outranks an anonymous one, and after a
 * claim the anon row is deleted anyway.
 */
export async function myExistingCall(
  subjectId: string,
): Promise<{ pick: string; status: string; points: number; anon: boolean } | null> {
  const db = adminDb();

  const { getSessionUser } = await import("@/lib/db/supabase-server");
  const user = await getSessionUser().catch(() => null);
  if (user) {
    const { data } = await db
      .from("predictions")
      .select("pick, status, points")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .eq("call_type", "outcome")
      .maybeSingle();
    if (data) return { pick: data.pick, status: data.status, points: data.points, anon: false };
  }

  const { readAnonSession } = await import("./anon-session");
  const sessionId = await readAnonSession();
  if (!sessionId) return null;

  const { data } = await db
    .from("anon_calls")
    .select("pick")
    .eq("session_id", sessionId)
    .eq("subject_id", subjectId)
    .eq("call_type", "outcome")
    .maybeSingle();
  // An anonymous call is always open: it cannot score until it is claimed.
  return data ? { pick: data.pick, status: "open", points: 0, anon: true } : null;
}
