"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { pushSupport } from "@/lib/push/support";
import { subscribeToPush } from "@/lib/push/subscribe-client";

/** Dismissible "Get goal alerts" nudge. Android/desktop → permission prompt;
 *  iOS-not-installed → "Add to Home Screen" instructions. Honest volume copy. */
export function GoalAlertsPrompt() {
  const [state, setState] = useState<"hidden" | "offer" | "ios" | "on">("hidden");
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") { setState("on"); return; }
    if (localStorage.getItem("goalAlertsDismissed") === "1") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const s = pushSupport(navigator.userAgent, standalone);
    setState(s.needsInstall ? "ios" : "offer");
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
