import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { publicEnv } from "../env";

/** Read-only anon client for Server Components (public data; RLS applies). */
export function readDb() {
  const e = publicEnv();
  return createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}
