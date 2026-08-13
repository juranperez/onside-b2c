"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Lock, ArrowRight } from "lucide-react";
import { lockCall, type LockFailureReason } from "@/lib/receipts/lock-action";

export interface MyCallView {
  pick: string; // "will" | "wont"
  status: string; // open | won | lost | push | void
  points: number;
}

const PICK_LABEL: Record<string, string> = { will: "Will happen", wont: "Won't happen" };

// Record over LockFailureReason (no index signature): a reason lockCall can return but this
// map doesn't cover is a compile error here, not a silent fallback at render time.
const REASON_COPY: Record<LockFailureReason, string> = {
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

  function makeCall(pick: "will" | "wont") {
    setError(null);
    startTransition(async () => {
      const res = await lockCall({ subjectId, callType: "outcome", pick });
      if (res.ok) setCall({ pick, status: "open", points: 0 });
      else setError(REASON_COPY[res.reason] ?? "Couldn't save your call — try again.");
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-line bg-ink-850 p-5">
      <div className="text-[11px] uppercase tracking-wider text-mute-soft num mb-3">Your call</div>

      {call ? (
        <>
          <Locked call={call} />
          <Link href="/record" className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-mute-soft hover:text-acc transition">
            View your record <ArrowRight size={11} />
          </Link>
        </>
      ) : !signedIn ? (
        <p className="text-[13px] text-mute">
          <Link href="/login" className="text-acc hover:underline">Sign in</Link> to put your call on the record —
          your track record is public and permanent.
        </p>
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

function Locked({ call }: { call: MyCallView }) {
  const label = PICK_LABEL[call.pick] ?? call.pick;
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
