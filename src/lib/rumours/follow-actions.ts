"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer, getSessionUser } from "@/lib/db/supabase-server";

export type FollowResult = { following: boolean } | { error: string };

/** Follow/unfollow a transfer saga — followers get a notification on every development. */
export async function toggleFollowRumour(rumourId: string): Promise<FollowResult> {
  const user = await getSessionUser();
  if (!user) return { error: "not-signed-in" };
  const supabase = await createSupabaseServer();

  const { data: existing } = await supabase
    .from("rumour_follows")
    .select("rumour_id")
    .eq("profile_id", user.id)
    .eq("rumour_id", rumourId)
    .maybeSingle();

  if (existing) {
    await supabase.from("rumour_follows").delete().eq("profile_id", user.id).eq("rumour_id", rumourId);
    revalidatePath("/transfers");
    return { following: false };
  }
  const { error } = await supabase.from("rumour_follows").insert({ profile_id: user.id, rumour_id: rumourId });
  if (error) return { error: error.message };
  revalidatePath("/transfers");
  return { following: true };
}

/** Rumour ids the signed-in user follows (empty when signed out). */
export async function getFollowedRumourIds(): Promise<string[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("rumour_follows").select("rumour_id").eq("profile_id", user.id);
  return (data ?? []).map((r) => r.rumour_id);
}
