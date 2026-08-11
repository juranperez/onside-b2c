import type { SupabaseClient } from "@supabase/supabase-js";

export type HealthResult = { ok: true } | { ok: false; error: string };

/** Cheap connectivity probe: select 1 row from leagues. */
export async function checkDb(db: Pick<SupabaseClient, "from">): Promise<HealthResult> {
  const { error } = await db.from("leagues").select("id").limit(1);
  return error ? { ok: false, error: error.message } : { ok: true };
}
