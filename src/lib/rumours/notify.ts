import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/types";

/**
 * Fan a saga development out to its followers as in-app notifications.
 * Called from the ingest paths (service-role client) — never from the browser.
 */
export async function notifyFollowers(
  db: SupabaseClient<Database>,
  rumourId: string,
  note: string,
  meta: Record<string, string | number | null> = {},
): Promise<number> {
  const { data: followers } = await db.from("rumour_follows").select("profile_id").eq("rumour_id", rumourId);
  if (!followers?.length) return 0;
  const rows = followers.map((f) => ({
    profile_id: f.profile_id,
    type: "rumour",
    payload: { rumourId, note: note.slice(0, 180), ...meta },
  }));
  const { error } = await db.from("notifications").insert(rows);
  return error ? 0 : rows.length;
}
