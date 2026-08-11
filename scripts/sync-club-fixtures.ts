// Manual run of the club fixtures sync. npm run sync:club-fixtures
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";
import { syncClubFixtures } from "../src/lib/ingest/club-fixtures";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const r = await syncClubFixtures(db);
  console.log(`leagues ${r.leagues} · fixtures ${r.fixtures} · club links ${r.clubsLinked}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
