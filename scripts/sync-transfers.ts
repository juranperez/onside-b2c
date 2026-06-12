// Manual/backfill run of the official-transfers sync. npm run sync:transfers
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";
import { syncOfficialTransfers } from "../src/lib/ingest/official-transfers";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const r = await syncOfficialTransfers(db);
  console.log(
    `fetched ${r.fetched} · matched ${r.matchedPlayers} · records ${r.recordsUpserted} · confirmed ${r.rumoursConfirmed} · created ${r.rumoursCreated} · killed ${r.competingKilled} · seen ${r.alreadySeen}${r.truncatedWindows ? ` · WARNING ${r.truncatedWindows} window(s) truncated at page cap` : ""}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
