"use client";

import { useState, useTransition } from "react";
import { MailCheck, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeBoard } from "@/lib/board/actions";
import { track } from "@/lib/analytics";

const ERROR_COPY: Record<string, string> = {
  "invalid-email": "That email doesn't look right.",
  "rate-limited": "Easy — try again in a minute.",
  "try-again": "Something slipped. Try again.",
};

/** One-field signup for The Board — works signed-out; the digest is the acquisition hook. */
export function BoardSubscribe({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [pending, startTransition] = useTransition();

  if (state === "done") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-up/30 bg-up/10 px-4 py-3 text-[13px] text-up">
        <MailCheck size={15} className="shrink-0" />
        You&apos;re on The Board — first edition lands Sunday.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await subscribeBoard(email);
          if ("error" in r) {
            setState("error");
            setErrorMsg(ERROR_COPY[r.error] ?? ERROR_COPY["try-again"]);
          } else {
            setState("done");
            track("board_subscribed");
          }
        });
      }}
      className="w-full max-w-[420px]"
    >
      <div className="flex items-center gap-2 rounded-xl border border-line bg-ink-900 px-3 py-2 focus-within:border-mute transition">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="you@email.com"
          required
          aria-label="Email for The Board digest"
          className="flex-1 bg-transparent outline-none text-[13.5px] py-1 placeholder:text-mute-soft"
        />
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "shrink-0 h-8 px-3.5 rounded-lg text-[12.5px] font-semibold transition",
            pending ? "bg-overlay/10 text-mute" : "bg-acc text-ink-950 hover:bg-acc/90 cursor-pointer",
          )}
        >
          {pending ? <LoaderCircle size={13} className="animate-spin" /> : "Join free"}
        </button>
      </div>
      {state === "error" && <p className="text-[11.5px] text-down mt-2">{errorMsg}</p>}
      <p className="text-[10.5px] text-mute-soft mt-2">Weekly, Sundays. Movers, top-confidence rumours, done deals. Unsubscribe any time.</p>
    </form>
  );
}
