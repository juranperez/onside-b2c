import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { publicEnv, serverEnv } from "../env";

/** Service-role client for ingestion/writes. NEVER import into client components. */
export function adminDb() {
  const url = publicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const key = serverEnv().SUPABASE_SERVICE_ROLE_KEY;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
