"use client";

import { useActionState } from "react";
import Link from "next/link";
import { postComment, type CommentActionState } from "@/lib/rumours/actions";
import type { CommentItem } from "@/lib/queries/rumours";

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
}: {
  rumourId: string;
  comments: CommentItem[];
  signedIn: boolean;
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
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-acc/15 text-acc grid place-items-center text-[11px] font-bold uppercase shrink-0">
                {c.author.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="font-semibold">{c.author}</span>
                  <span className="text-mute-soft num">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-[13px] text-mute mt-0.5 leading-relaxed break-words">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
