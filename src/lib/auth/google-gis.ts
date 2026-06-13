import { createClient } from "@/lib/db/supabase-browser";
import { track } from "@/lib/analytics";

/**
 * Single source of truth for Google Identity Services (GIS).
 *
 * Both Google paths — One Tap and the login-page "Continue with Google" button —
 * must share ONE initialization: GIS binds a single nonce per init, so a second
 * initialize() would invalidate the first's nonce and silently break sign-in.
 * This module initializes exactly once and hands the same API to every caller.
 *
 * It uses the TOKEN flow (signInWithIdToken), not the redirect flow. The Google
 * credential is exchanged with Supabase via a background fetch, so the user never
 * navigates through the Supabase project domain (xxx.supabase.co). The consent UI
 * is keyed to the OAuth app name ("Onside Market") and the page origin
 * (onsidemarket.com) — which is the whole reason we prefer this over
 * signInWithOAuth, and why no paid Supabase custom domain is required.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleIdApi {
  prompt: () => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
  cancel: () => void;
}
interface GoogleIdInternal extends GoogleIdApi {
  initialize: (config: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdInternal } };
  }
}

/** Handlers run once after a successful sign-in (e.g. refresh, or navigate). */
const successHandlers = new Set<() => void>();
export function onGoogleSignIn(handler: () => void): () => void {
  successHandlers.add(handler);
  return () => {
    successHandlers.delete(handler);
  };
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Poll for the GIS script (loaded once via <Script> in GoogleOneTap). */
function waitForGoogle(): Promise<GoogleIdInternal | null> {
  return new Promise((resolve) => {
    let tries = 0;
    const tick = () => {
      const api = window.google?.accounts?.id;
      if (api) return resolve(api);
      if (++tries > 50) return resolve(null); // ~10s at 200ms, then give up
      setTimeout(tick, 200);
    };
    tick();
  });
}

let readyPromise: Promise<GoogleIdApi | null> | null = null;

/** Initialize GIS once (idempotent) and return its API, or null if unavailable. */
export function ensureGoogleGis(): Promise<GoogleIdApi | null> {
  if (readyPromise) return readyPromise;
  if (!CLIENT_ID) {
    readyPromise = Promise.resolve(null);
    return readyPromise;
  }
  readyPromise = (async () => {
    const api = await waitForGoogle();
    if (!api) return null;
    // Nonce binding: Supabase gets the raw nonce, Google gets its SHA-256.
    const rawNonce =
      crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const hashedNonce = await sha256Hex(rawNonce);
    api.initialize({
      client_id: CLIENT_ID,
      nonce: hashedNonce,
      use_fedcm_for_prompt: true,
      auto_select: true, // returning users are recognized and signed straight back in
      cancel_on_tap_outside: false,
      callback: async (response: { credential: string }) => {
        const { error } = await createClient().auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
          nonce: rawNonce,
        });
        if (error) return;
        track("google_signin");
        successHandlers.forEach((h) => h());
      },
    });
    return api as GoogleIdApi;
  })();
  return readyPromise;
}
