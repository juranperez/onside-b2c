"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/** Supabase client for client components (auth in the browser). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
