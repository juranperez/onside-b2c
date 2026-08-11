"use client";

import { useActionState } from "react";
import Link from "next/link";
import { claimUsername, type ProfileActionState } from "@/lib/profiles/actions";

/**
 * The handle claim.
 *
 * Rendered only for users who have not claimed one — a handle is permanent, so there is
 * no edit mode to fall back to. The success branch is load-bearing rather than a
 * courtesy: `claimUsername` is idempotent, so a double-click returns success twice, and
 * this component must show the resulting handle and its link in that case. Treating a
 * second submit as a failure is exactly the bug the action was rewritten to avoid.
 */
export function ClaimHandle() {
  const [state, formAction, pending] = useActionState<ProfileActionState, FormData>(claimUsername, {});

  if (state.ok && state.username) {
    return (
      <div className="mb-8 rounded-xl border border-line bg-ink-850 p-4 text-[13px]">
        Your public profile is live at{" "}
        <Link href={`/u/${state.username}`} className="text-acc hover:underline">
          /u/{state.username}
        </Link>
        .
      </div>
    );
  }

  return (
    <form action={formAction} className="mb-8 rounded-xl border border-line bg-ink-850 p-4">
      <div className="text-[13.5px] font-semibold mb-1">Claim your handle</div>
      <p className="text-[12.5px] text-mute mb-3">
        Your record is only an argument if someone can look it up. Pick a handle and this page becomes
        your public profile. It&apos;s permanent — shared links and cards have to keep working.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center rounded-lg bg-ink-800 border border-line px-3 h-9">
          <span className="text-mute-soft text-[13px]">onsidemarket.com/u/</span>
          <input
            name="username"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            placeholder="yourhandle"
            className="bg-transparent text-[13px] outline-none w-[130px] ml-0.5"
          />
        </div>
        <button
          disabled={pending}
          className="h-9 px-3.5 rounded-lg bg-acc text-ink-900 text-[12px] font-semibold disabled:opacity-60 cursor-pointer"
        >
          {pending ? "Claiming…" : "Claim"}
        </button>
      </div>
      {state.error && <div className="text-[12px] text-down mt-2">{state.error}</div>}
    </form>
  );
}
