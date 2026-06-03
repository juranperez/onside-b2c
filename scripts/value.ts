import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";
import { computeAll } from "../src/lib/valuation/compute";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const t0 = Date.now();
  console.log("Computing Onside valuations...");
  const r = await computeAll(db, (m) => console.log(m));
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)}s:`, JSON.stringify(r));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
