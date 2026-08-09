"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer, getSessionUser } from "@/lib/db/supabase-server";
import { enforcementEnabled, isOverLimit, limitMessage } from "@/lib/billing/entitlements";
import { getUserTier } from "@/lib/billing/tier";

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
  // Adding, not removing — the tier cap bites here, counted server-side.
  if (enforcementEnabled()) {
    const tier = await getUserTier(user.id);
    const { count } = await supabase
      .from("rumour_follows")
      .select("rumour_id", { count: "exact", head: true })
      .eq("profile_id", user.id);
    if (isOverLimit(tier, "trackedDeals", count ?? 0)) {
      return { error: limitMessage("trackedDeals", tier) };
    }
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
