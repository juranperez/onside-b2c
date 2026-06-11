// Manual run of the sidelined/injury sync. npm run sync:injuries
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";
import { syncInjuries } from "../src/lib/ingest/injuries";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const r = await syncInjuries(db);
  console.log(`leagues ${r.leagues} · teams ${r.teams} · spells ${r.sidelinedRows} · matched ${r.matchedPlayers} · inserted ${r.inserted}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
