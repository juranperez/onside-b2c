"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/supabase-browser";
import { track } from "@/lib/analytics";

/**
 * Google One Tap — the "it just remembers you" layer. For visitors signed into
 * Chrome/Google, a small prompt offers their account; one click and they're in,
 * no password, no email round-trip. Shown only when signed OUT. The ID token is
 * exchanged with Supabase via signInWithIdToken (nonce-bound: raw nonce to
 * Supabase, its SHA-256 to Google).
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleAccounts {
  accounts: {
    id: {
      initialize: (config: Record<string, unknown>) => void;
      prompt: () => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function GoogleOneTap() {
  const router = useRouter();
  const armed = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    const init = async () => {
      if (armed.current || !window.google) return;
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) return; // already signed in — never prompt

      const rawNonce = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const hashedNonce = await sha256Hex(rawNonce);
      armed.current = true;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
        auto_select: true, // returning users: recognized and signed straight back in
        cancel_on_tap_outside: false,
        callback: async (response: { credential: string }) => {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
            nonce: rawNonce,
          });
          if (!error) {
            track("google_one_tap_signin");
            router.refresh();
          }
        },
      });
      window.google.accounts.id.prompt();
    };
    // The GIS script may already be cached/loaded before this effect runs.
    init();
    const t = setInterval(() => {
      if (window.google && !armed.current) init();
      else if (armed.current) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [router]);

  if (!CLIENT_ID) return null;
  return <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />;
}
