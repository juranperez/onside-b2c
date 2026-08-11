import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { publicEnv } from "../env";

/**
 * Default cache lifetime (seconds) for the public read path.
 *
 * Reads are routed through Next.js' Data Cache via a revalidating `fetch`, so a
 * single distinct query reaches Postgres at most once per window regardless of
 * how much crawler / link-prefetch traffic hits dynamic routes (e.g. the
 * `/compare?a=&b=` permutation space or `sitemap.xml`). An uncached read path is
 * exactly what exhausted this project's Supabase egress quota and took the REST
 * API offline (HTTP 402), so caching here is the primary safeguard.
 */
const READ_REVALIDATE_SECONDS = 1800;

/**
 * Read-only anon client for Server Components (public data; RLS applies).
 *
 * `revalidate` may be shortened for surfaces where staleness is a defect rather
 * than a saving — the news index is the freshest thing on the site, and a
 * half-hour-old copy of it is simply wrong. Every entry keeps the shared
 * "supabase-read" tag so a single purge still flushes everything.
 */
export function readDb(opts: { revalidate?: number } = {}) {
  const e = publicEnv();
  const revalidate = opts.revalidate ?? READ_REVALIDATE_SECONDS;
  return createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      // Anon + RLS-public reads, so a shared cache entry is safe across requests.
      fetch: (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
        fetch(input, {
          ...init,
          next: { revalidate, tags: ["supabase-read"] },
        }),
    },
  });
}
