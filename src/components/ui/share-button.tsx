"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

/** Web Share where available, clipboard copy as fallback. Drives organic sharing. */
export function ShareButton({ title, text }: { title: string; text?: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // user dismissed the share sheet — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      onClick={onShare}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition cursor-pointer bg-overlay/5 border border-line text-mute hover:text-fg"
    >
      {copied ? <Check size={13} /> : <Share2 size={13} />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
