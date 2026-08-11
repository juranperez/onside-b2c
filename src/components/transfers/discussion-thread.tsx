"use client";

import { useActionState } from "react";
import Link from "next/link";
import { postComment, type CommentActionState } from "@/lib/rumours/actions";
import type { CommentItem } from "@/lib/queries/rumours";
import type { AuthorReceipt } from "@/lib/profiles/queries";

const PICK_LABEL: Record<string, string> = {
  will: "WILL",
  wont: "WON'T",
  higher: "FEE HIGHER",
  lower: "FEE LOWER",
};

/**
 * One line under a comment author: what they called on THIS deal, the house number at
 * the moment it locked, and their overall record.
 *
 * "No call on record" is shown rather than hidden, deliberately. Anyone may comment, but
 * non-callers are marked — the tag is a stronger prompt to call than a gate would be,
 * because the reader feels it and the fix is one tap away. A gate would be purer and
 * would also be an empty room with a bouncer.
 */
function Receipt({ r }: { r: AuthorReceipt | undefined }) {
  if (!r?.pick) return <span className="text-[11px] text-mute-soft">No call on record</span>;

  const scored = r.wins + r.losses;
  const date = r.lockedAt
    ? new Date(r.lockedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;

  return (
    <span className="text-[11px] text-mute-soft">
      <span className="text-up font-semibold">Called {PICK_LABEL[r.pick] ?? r.pick.toUpperCase()}</span>
      {r.houseConfidencePct != null && <span className="num"> · house said {r.houseConfidencePct}%</span>}
      {date && <span className="num"> · {date}</span>}
      {scored > 0 && (
        <span className="num">
          {" · "}
          {r.wins}–{r.losses}
          {r.accuracyPct != null && ` · ${r.accuracyPct}%`}
        </span>
      )}
    </span>
  );
}

function timeAgo(iso: string): string {
  const m = (Date.now() - new Date(iso).getTime()) / 60000;
  if (m < 1) return "just now";
  if (m < 60) return `${Math.floor(m)}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

export function DiscussionThread({
  rumourId,
  comments,
  signedIn,
  receipts,
}: {
  rumourId: string;
  comments: CommentItem[];
  signedIn: boolean;
  /** Author profile id -> their receipt on this deal. A plain object, not a Map: a Map cannot cross the server/client boundary as a prop. */
  receipts: Record<string, AuthorReceipt>;
}) {
  const bound = postComment.bind(null, rumourId);
  const [state, formAction, pending] = useActionState<CommentActionState, FormData>(bound, {});

  return (
    <div>
      {signedIn ? (
        <form action={formAction} className="mb-5">
          <textarea
            name="body"
            rows={2}
            maxLength={1000}
            placeholder="Is this fee fair? Does it make sense for the club?"
            className="w-full px-3 py-2 rounded-lg bg-ink-800 border border-line text-[13px] outline-none focus:border-mute transition"
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              disabled={pending}
              className="h-8 px-3.5 rounded-lg bg-acc text-ink-900 text-[12px] font-semibold disabled:opacity-60 cursor-pointer"
            >
              {pending ? "Posting…" : "Post"}
            </button>
            {state.error && <span className="text-[12px] text-down">{state.error}</span>}
          </div>
        </form>
      ) : (
        <div className="mb-5 rounded-lg bg-overlay/5 border border-line p-4 text-[13px] text-mute">
          <Link href="/login" className="text-acc hover:underline">Sign in</Link> to join the discussion.
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-[13px] text-mute-soft">No takes yet — be the first.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => {
            const r = receipts[c.profileId];
            return (
              <div key={c.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-acc/15 text-acc grid place-items-center text-[11px] font-bold uppercase shrink-0">
                  {c.author.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[12px]">
                    {r?.username ? (
                      <Link href={`/u/${r.username}`} className="font-semibold hover:underline">
                        {c.author}
                      </Link>
                    ) : (
                      <span className="font-semibold">{c.author}</span>
                    )}
                    <span className="text-mute-soft num">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="mt-0.5">
                    <Receipt r={r} />
                  </div>
                  <p className="text-[13px] text-mute mt-1 leading-relaxed break-words">{c.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
