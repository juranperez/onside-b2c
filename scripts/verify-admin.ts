import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { error: writeErr } = await db.from("leagues").upsert({ id: "_probe", slug: "_probe", name: "_probe" });
  const { count } = await db.from("leagues").select("id", { count: "exact", head: true });
  await db.from("leagues").delete().eq("id", "_probe");
  console.log("privileged write:", writeErr ? `FAILED: ${writeErr.message}` : "OK", "| leagues count:", count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
