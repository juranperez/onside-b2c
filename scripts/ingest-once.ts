// Run the free multi-source rumour ingestion once, against the live DB — populates
// the /transfers/manage review queue with real candidates. Proof + manual trigger.
// Run: npm run ingest:once
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";
import { ingestRumours, DEFAULT_FEEDS } from "../src/lib/ingest/rumour-ingest";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const r = await ingestRumours(db, DEFAULT_FEEDS);
  console.log(`feeds=${r.feeds} items=${r.items} matched=${r.matched} inserted=${r.inserted} tier1=${r.tier1}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
