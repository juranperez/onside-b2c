// src/components/push/RegisterSW.tsx
"use client";

import { useEffect } from "react";

/** Registers the push-only service worker once, client-side. No UI. */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registration is best-effort; push just won't be available
    });
  }, []);
  return null;
}
