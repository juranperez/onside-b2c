// Manual send of "The Board" digest (same path as the Sunday cron). npm run send:digest
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";
import { sendDigest } from "../src/lib/digest/send";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const r = await sendDigest(db);
  console.log(`subscribers ${r.subscribers} · sent ${r.sent} · batches ${r.batches}${r.preview ? " · PREVIEW (no subscribers)" : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
