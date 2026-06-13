"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/supabase-browser";
import { ensureGoogleGis, onGoogleSignIn } from "@/lib/auth/google-gis";

/**
 * Google One Tap — the "it just remembers you" layer. For visitors signed into
 * Chrome/Google, a small prompt offers their account; one tap and they're in,
 * no password, no email round-trip. Shown only when signed OUT.
 *
 * Shares a single GIS initialization (one nonce, one signInWithIdToken callback)
 * with the login-page button via the google-gis controller. Both use the token
 * flow, so neither path ever routes the user through the Supabase project domain
 * — the consent UI stays branded to onsidemarket.com. This component also owns
 * the one-time <Script> load for GIS.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleOneTap() {
  const router = useRouter();

  useEffect(() => {
    if (!CLIENT_ID) return;
    const off = onGoogleSignIn(() => router.refresh());
    let cancelled = false;
    (async () => {
      // Never interrupt a signed-in visitor with the prompt.
      const { data } = await createClient().auth.getUser();
      if (cancelled || data.user) return;
      const api = await ensureGoogleGis();
      if (api && !cancelled) api.prompt();
    })();
    return () => {
      cancelled = true;
      off();
    };
  }, [router]);

  if (!CLIENT_ID) return null;
  return <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />;
}
