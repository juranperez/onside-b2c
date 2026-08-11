import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";
import { syncAll } from "../src/lib/ingest/sync";
import { LAUNCH_LEAGUES } from "../src/lib/ingest/leagues";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });

  const only = process.argv[2];
  const leagues = only ? LAUNCH_LEAGUES.filter((l) => l.slug === only) : undefined;
  if (only && (!leagues || leagues.length === 0)) {
    console.error(`Unknown league slug: ${only}`);
    process.exit(1);
  }

  const t0 = Date.now();
  console.log(only ? `Onside data sync starting (league: ${only})...` : "Onside data sync starting...");
  const summary = await syncAll(db, leagues, (m) => console.log(m));
  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(0)}s:`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
