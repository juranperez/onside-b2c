"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Lock, ArrowRight } from "lucide-react";
import { lockCall, type LockFailureReason } from "@/lib/receipts/lock-action";
import { lockAnonCall, anonSessionPresent, type AnonLockReason } from "@/lib/receipts/anon-lock";

export interface MyCallView {
  pick: string; // "will" | "wont"
  status: string; // open | won | lost | push | void
  points: number;
}

const PICK_LABEL: Record<string, string> = { will: "Will happen", wont: "Won't happen" };

// Record over BOTH reason unions, with no index signature: a reason either lockCall or
// lockAnonCall can return but this map doesn't cover is a compile error here, not a wrong
// message at render time. It has already earned that once — adding the anonymous path
// surfaced `rate_limited` as a missing key at compile time rather than in production.
const REASON_COPY: Record<LockFailureReason | AnonLockReason, string> = {
  not_signed_in: "Sign in to make a call.",
  here_we_go: "This one's as good as done — too late to call.",
  not_live: "This saga has already settled.",
  resolved: "This saga has already settled.",
  house_certain: "Onside already rates this near-certain — pick the other side or sit it out.",
  already_called: "You've already called this one.",
  bad_pick: "Something went wrong — try again.",
  subject_not_found: "Couldn't find this saga.",
  insert_failed: "Couldn't save your call — try again.",
  snapshot_unavailable: "Something went wrong reading this saga. Try again.",
  no_house_value: "We don't have a value for this player yet, so there's no fee to call.",
  rate_limited: "That's a lot of calls from one connection. Try again shortly.",
};

/**
 * Inline "you vs the house" call on a live transfer saga. One-tap Will/Won't; the call locks on
 * submit and auto-scores when the saga settles. The house snapshot is recomputed server-side.
 */
export function CallChip({
  subjectId,
  houseConfidencePct,
  signedIn,
  myCall,
}: {
  subjectId: string;
  houseConfidencePct: number;
  signedIn: boolean;
  myCall: MyCallView | null;
}) {
  const [call, setCall] = useState<MyCallView | null>(myCall);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  /** Set when a signed-out call locked but the browser did not keep the cookie. */
  const [orphaned, setOrphaned] = useState(false);
  /** Whether the call currently shown was made without an account. */
  const [anonCall, setAnonCall] = useState(false);

  function makeCall(pick: "will" | "wont") {
    setError(null);
    startTransition(async () => {
      const res = signedIn
        ? await lockCall({ subjectId, callType: "outcome", pick })
        : await lockAnonCall({ subjectId, callType: "outcome", pick });

      if (!res.ok) {
        setError(REASON_COPY[res.reason]);
        return;
      }

      setCall({ pick, status: "open", points: 0 });
      if (signedIn) return;

      setAnonCall(true);
      // A second request is the only way to tell whether the cookie stuck — within the
      // request that served the call, a browser that keeps it and one that drops it are
      // byte-identical. If it did not stick, the row is written against a session id this
      // browser will never present again: orphaned, invisible and unclaimable. Say so
      // rather than showing a success state over a receipt that no longer exists.
      const kept = await anonSessionPresent().catch(() => true);
      setOrphaned(!kept);
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-line bg-ink-850 p-5">
      <div className="text-[11px] uppercase tracking-wider text-mute-soft num mb-3">Your call</div>

      {call ? (
        <>
          <Locked call={call} anon={anonCall} />
          {!anonCall ? (
            <Link href="/record" className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-mute-soft hover:text-acc transition">
              View your record <ArrowRight size={11} />
            </Link>
          ) : orphaned ? (
            <p className="text-[12px] text-down mt-2">
              Your browser isn&apos;t keeping this call.{" "}
              <Link href="/login" className="text-acc hover:underline">Sign in</Link> and it&apos;ll stick.
            </p>
          ) : (
            <p className="text-[12px] text-mute mt-2">
              Held against Onside&apos;s <span className="num">{houseConfidencePct}%</span> on this browser.{" "}
              <Link href="/login" className="text-acc hover:underline">Create an account</Link> to make it
              permanent — it keeps the date you called.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-[13px] text-mute mb-3">
            Onside rates this <span className="num font-semibold text-fg">{houseConfidencePct}%</span> to happen.
            Make your call — your record settles when the saga does.
          </p>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => makeCall("will")}
              disabled={pending}
              className="flex-1 h-10 rounded-lg bg-up/15 text-up border border-up/30 text-[13px] font-semibold hover:bg-up/25 disabled:opacity-50 transition cursor-pointer"
            >
              Will happen
            </button>
            <button
              onClick={() => makeCall("wont")}
              disabled={pending}
              className="flex-1 h-10 rounded-lg bg-down/10 text-down border border-down/30 text-[13px] font-semibold hover:bg-down/20 disabled:opacity-50 transition cursor-pointer"
            >
              Won&apos;t happen
            </button>
          </div>
          {error && <p className="text-[12px] text-down mt-2.5">{error}</p>}
        </>
      )}
    </div>
  );
}

function Locked({ call, anon = false }: { call: MyCallView; anon?: boolean }) {
  const label = PICK_LABEL[call.pick] ?? call.pick;
  // An anonymous call is only as durable as the cookie, so "locked" would overclaim it.
  // The nudge underneath carries the rest of the story.
  if (anon && call.status === "open") {
    return (
      <p className="text-[13px] text-mute flex items-center gap-2">
        <Lock size={14} /> You called it: <b className="text-fg">{label}</b>.
      </p>
    );
  }
  if (call.status === "won") {
    return (
      <p className="text-[13px] flex items-center gap-2 text-up">
        <Check size={15} /> <span>You called it — <b>{label}</b>. <span className="num">+{call.points}</span> to your record.</span>
      </p>
    );
  }
  if (call.status === "lost") {
    return (
      <p className="text-[13px] flex items-center gap-2 text-down">
        <X size={15} /> <span>Missed — you called <b>{label}</b>. <span className="num">{call.points}</span>.</span>
      </p>
    );
  }
  if (call.status === "push" || call.status === "void") {
    return <p className="text-[13px] text-mute flex items-center gap-2"><Lock size={14} /> Your call ({label}) settled with no result.</p>;
  }
  return (
    <p className="text-[13px] text-mute flex items-center gap-2">
      <Lock size={14} /> Your call is locked: <b className="text-fg">{label}</b>. It settles when the saga does.
    </p>
  );
}
