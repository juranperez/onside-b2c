"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { pushSupport } from "@/lib/push/support";
import { subscribeToPush } from "@/lib/push/subscribe-client";
import { createClient } from "@/lib/db/supabase-browser";

/** Dismissible "Get goal alerts" nudge. Signed-out → sign-in path (alerts require an
 *  account); Android/desktop → permission prompt; iOS-not-installed → install steps. */
export function GoalAlertsPrompt() {
  const [state, setState] = useState<"hidden" | "offer" | "ios" | "signin" | "on">("hidden");
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") { setState("on"); return; }
    if (localStorage.getItem("goalAlertsDismissed") === "1") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const s = pushSupport(navigator.userAgent, standalone);
    if (s.needsInstall) { setState("ios"); return; }
    // Goal alerts require sign-in (subscriptions are owned by a profile). Check the
    // session BEFORE offering Enable so we never spend the browser permission on a
    // subscribe that the server will reject.
    createClient().auth.getUser().then(({ data }) => setState(data.user ? "offer" : "signin"));
  }, []);

  if (state === "hidden" || state === "on") return null;
  return (
    <div className="rounded-xl border border-acc/30 bg-acc/[0.06] p-4 mb-6 flex items-start gap-3">
      <Bell size={16} className="text-acc mt-0.5 shrink-0" />
      <div className="flex-1 text-[13px]">
        <div className="font-semibold text-fg">Get goal alerts</div>
        {state === "ios" ? (
          <p className="text-mute mt-0.5">
            Add Onside to your home screen (Share → Add to Home Screen) to get a ping when a World Cup goal goes in.
          </p>
        ) : state === "signin" ? (
          <p className="text-mute mt-0.5">
            Sign in to get a ping the moment a World Cup goal goes in — tap through to the scorer.
          </p>
        ) : (
          <p className="text-mute mt-0.5">
            A ping the moment a World Cup goal goes in — tap through to the scorer. ~5–10 alerts on busy match days; mute anytime.
          </p>
        )}
      </div>
      {state === "offer" && (
        <button
          onClick={async () => { setState((await subscribeToPush()) ? "on" : "offer"); }}
          className="shrink-0 h-8 px-3 rounded-lg bg-acc text-ink-950 text-[12px] font-semibold cursor-pointer"
        >
          Enable
        </button>
      )}
      {state === "signin" && (
        <Link href="/login" className="shrink-0 h-8 px-3 inline-flex items-center rounded-lg bg-acc text-ink-950 text-[12px] font-semibold">
          Sign in
        </Link>
      )}
      <button
        aria-label="Dismiss goal alerts prompt"
        onClick={() => { localStorage.setItem("goalAlertsDismissed", "1"); setState("hidden"); }}
        className="shrink-0 text-mute-soft hover:text-fg text-[14px] leading-none cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}
