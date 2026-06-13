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
      api.renderButton(host, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "center",
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
  return <div ref={hostRef} className="flex justify-center min-h-[44px]" />;
}
