"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Search, Bell, Mail, X } from "lucide-react";
import { Card } from "@/components/ui";
import { track } from "@/lib/analytics";

/**
 * One-time greeting for a brand-new account (?welcome=1 set by the auth
 * callback on first session). Client-side so the Discover page stays ISR.
 */
function WelcomeRailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const isWelcome = params.get("welcome") === "1";

  // The funnel's finish line: first session of a brand-new account.
  useEffect(() => {
    if (isWelcome) track("signup_completed");
  }, [isWelcome]);

  if (dismissed || !isWelcome) return null;

  const dismiss = () => {
    setDismissed(true);
    router.replace("/discover", { scroll: false });
  };

  return (
    <Card className="relative p-5 mb-6 border-acc/30 overflow-hidden">
      <div
        className="absolute -top-16 -right-8 w-[260px] h-[260px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(232,255,90,0.10) 0%, transparent 60%)" }}
      />
      <button onClick={dismiss} aria-label="Dismiss" className="absolute top-3 right-3 text-mute-soft hover:text-fg transition">
        <X size={15} />
      </button>
      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-[0.16em] font-bold num text-acc">
        <Sparkles size={11} /> Welcome to Onside
      </div>
      <p className="text-[14px] font-semibold mb-3">You&apos;re in. Three ways to start:</p>
      <div className="grid sm:grid-cols-3 gap-2.5 text-[12.5px]">
        <div className="flex items-start gap-2.5 rounded-xl bg-ink-800 border border-line px-3 py-2.5">
          <Search size={14} className="text-acc shrink-0 mt-0.5" />
          <span className="text-mute leading-snug">
            <span className="text-fg font-medium">Search anything</span> — hit <kbd className="num text-[10px] px-1 py-0.5 rounded bg-ink-700 border border-line">⌘K</kbd> for any player, club or league
          </span>
        </div>
        <Link href="/transfers" className="flex items-start gap-2.5 rounded-xl bg-ink-800 border border-line px-3 py-2.5 hover:border-mute transition">
          <Bell size={14} className="text-acc shrink-0 mt-0.5" />
          <span className="text-mute leading-snug">
            <span className="text-fg font-medium">Track a deal</span> on the Wire — we&apos;ll ping you on every development
          </span>
        </Link>
        <Link href="/the-board" className="flex items-start gap-2.5 rounded-xl bg-ink-800 border border-line px-3 py-2.5 hover:border-mute transition">
          <Mail size={14} className="text-acc shrink-0 mt-0.5" />
          <span className="text-mute leading-snug">
            <span className="text-fg font-medium">Get The Board</span> — the Sunday digest of what moved and why
          </span>
        </Link>
      </div>
    </Card>
  );
}

export function WelcomeRail() {
  return (
    <Suspense>
      <WelcomeRailInner />
    </Suspense>
  );
}
