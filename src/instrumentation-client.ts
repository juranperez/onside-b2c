// Client-side analytics bootstrap (Next.js instrumentation-client convention —
// runs once in the browser before the app hydrates). No key set → no-op, so
// this is safe to ship ahead of the PostHog project being provisioned.
import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: "history_change", // SPA-aware pageviews on route changes
    capture_pageleave: true, // enables time-on-page and bounce analysis
    person_profiles: "identified_only", // anonymous traffic stays cheap and cookieless-ish
    autocapture: true, // clicks/inputs for "how are people actually using this"
  });
}
