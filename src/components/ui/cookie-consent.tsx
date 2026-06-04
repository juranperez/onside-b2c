"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const STORAGE_KEY = "onside-cookie-consent";

/**
 * Fixed bottom cookie-consent banner.
 *
 * Renders nothing until we've checked localStorage (avoids a flash for users who
 * already accepted), then nothing at all if consent is already stored. On Accept we
 * persist to localStorage and hide. GDPR-friendly: essential + analytics only, with a
 * link to the full privacy policy.
 *
 * Mount this once near the root layout. It self-manages its own visibility.
 */
export function CookieConsent({ className }: { className?: string }) {
  // null = not yet checked (don't render); true = show banner; false = already accepted.
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const accepted = window.localStorage.getItem(STORAGE_KEY);
      setShow(accepted ? false : true);
    } catch {
      // If localStorage is unavailable (e.g. privacy mode), show the banner anyway.
      setShow(true);
    }
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // Best-effort: still hide the banner for this session.
    }
    setShow(false);
  }

  if (show !== true) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6 fade-in",
        className,
      )}
    >
      <div className="max-w-[680px] mx-auto rounded-2xl bg-ink-850 border border-line shadow-soft p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-overlay/5 border border-line grid place-items-center text-mute">
              <Cookie size={18} />
            </div>
            <p className="text-[13px] text-mute leading-relaxed">
              We use cookies for analytics and to keep you signed in.{" "}
              <Link href="/privacy" className="text-fg font-medium hover:text-acc transition">
                Privacy policy
              </Link>
              .
            </p>
          </div>
          <div className="shrink-0 sm:self-center">
            <Button kind="primary" size="md" onClick={accept} className="w-full sm:w-auto">
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
