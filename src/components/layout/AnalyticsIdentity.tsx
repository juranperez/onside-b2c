"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/db/supabase-browser";
import { identify, resetIdentity } from "@/lib/analytics";

/** Ties analytics events to the signed-in account (and unties on sign-out). */
export function AnalyticsIdentity() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) identify(data.user.id, { email: data.user.email });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) identify(session.user.id, { email: session.user.email });
      if (event === "SIGNED_OUT") resetIdentity();
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return null;
}
