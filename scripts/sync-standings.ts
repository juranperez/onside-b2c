// Manual run of the league-standings sync. npm run sync:standings
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";
import { syncStandings } from "../src/lib/ingest/standings";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const r = await syncStandings(db);
  console.log(`leagues ${r.leagues} · rows ${r.rows} · clubs linked ${r.clubsLinked}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
