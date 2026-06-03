// Backfills the World Cup 2026 match schedule into `fixtures` from API-Football.
// Run: npm run sync:wc-fixtures
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";
import { syncWcFixtures } from "../src/lib/ingest/wc-fixtures";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });

  const r = await syncWcFixtures(db);
  console.log(`Fetched ${r.fetched} fixtures, upserted ${r.upserted}.`);
  if (r.skipped.length) {
    console.log(`Skipped ${r.skipped.length} (unmapped teams / knockout placeholders):`);
    for (const s of r.skipped) console.log(`  - ${s}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
