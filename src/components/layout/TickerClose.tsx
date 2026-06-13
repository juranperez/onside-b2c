"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

const COOKIE = "wc_ticker_hidden=1";

function hideTicker() {
  document.getElementById("wc-ticker")?.style.setProperty("display", "none");
}

/** Hides the ticker for the rest of the local day via cookie (server stays static). */
export function TickerClose() {
  // Re-apply an existing dismissal on mount (DOM side-effect only — no state).
  useEffect(() => {
    if (document.cookie.split("; ").includes(COOKIE)) hideTicker();
  }, []);

  return (
    <button
      aria-label="Hide scores for today"
      onClick={() => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const maxAge = Math.max(60, Math.round((end.getTime() - Date.now()) / 1000));
        document.cookie = `${COOKIE}; max-age=${maxAge}; path=/`;
        hideTicker();
      }}
      className="p-1 rounded text-mute-soft hover:text-fg transition shrink-0 cursor-pointer"
    >
      <X size={12} />
    </button>
  );
}
