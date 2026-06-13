"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ensureGoogleGis, onGoogleSignIn } from "@/lib/auth/google-gis";
import { safeRedirect } from "@/lib/auth/safe-redirect";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * "Continue with Google" via the official GIS button (token flow). Unlike a
 * custom button wired to signInWithOAuth, this keeps the whole flow on
 * accounts.google.com → onsidemarket.com and never shows the Supabase project
 * domain on the consent screen. Shares the single GIS init in google-gis with
 * One Tap, so the nonce stays consistent across both.
 */
export function GoogleSignInButton({ next }: { next?: string }) {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    const off = onGoogleSignIn(() => router.push(safeRedirect(next)));
    let cancelled = false;
    (async () => {
      const api = await ensureGoogleGis();
      const host = hostRef.current;
      if (!api || cancelled || !host) return;
      host.replaceChildren(); // guard against a double-render appending two buttons
      const width = Math.min(400, Math.max(240, host.clientWidth || 320));
      // Use Google's WHITE "outline" button: its iframe background is white, so a dark
      // (filled_black) button leaves white slivers around the logo/edges on our dark card.
      // A white button matches its own iframe exactly → zero mismatch in either theme, and
      // it's the most recognized, trust-building sign-in control. rounded-xl clip on the
      // host gives it our corner radius.
      api.renderButton(host, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width,
      });
    })();
    return () => {
      cancelled = true;
      off();
    };
  }, [router, next]);

  if (!CLIENT_ID) return null;
  // Reserve the row height so layout doesn't jump when Google's button paints.
  // rounded-xl + overflow-hidden clips Google's rectangular iframe to match our other
  // controls and hides its white background corners (dark-mode band fix).
  return <div ref={hostRef} className="min-h-[44px] rounded-xl overflow-hidden" />;
}
