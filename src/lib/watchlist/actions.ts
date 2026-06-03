"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer, getSessionUser } from "@/lib/db/supabase-server";
import { toPlayerListItem, type PlayerListItem, type PlayerRowDB } from "@/lib/queries/map";

export type ToggleResult = { watched: boolean } | { error: string };

/** Add/remove a player from the signed-in user's watchlist. */
export async function toggleWatch(playerId: string): Promise<ToggleResult> {
  const user = await getSessionUser();
  if (!user) return { error: "not-signed-in" };
  const supabase = await createSupabaseServer();

  const { data: existing } = await supabase
    .from("watchlist_items")
    .select("player_id")
    .eq("profile_id", user.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existing) {
    await supabase.from("watchlist_items").delete().eq("profile_id", user.id).eq("player_id", playerId);
    revalidatePath("/watchlist");
    return { watched: false };
  }
  const { error } = await supabase.from("watchlist_items").insert({ profile_id: user.id, player_id: playerId });
  if (error) return { error: error.message };
  revalidatePath("/watchlist");
  return { watched: true };
}

/** Set of player ids the signed-in user watches (empty if signed out). */
export async function getWatchedIds(): Promise<string[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("watchlist_items").select("player_id").eq("profile_id", user.id);
  return (data ?? []).map((r) => r.player_id);
}

/** The signed-in user's watched players, with live valuations. */
export async function getWatchlist(): Promise<PlayerListItem[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("watchlist_items")
    .select(
      "players(id,slug,name,position,age, clubs(slug,name,short_name, leagues(slug,name)), player_valuations(value_eur))",
    )
    .eq("profile_id", user.id);
  const now = new Date();
  return (data ?? [])
    .map((r) => (r as unknown as { players: PlayerRowDB | null }).players)
    .filter((p): p is PlayerRowDB => p !== null)
    .map((p) => toPlayerListItem(p, now))
    .sort((a, b) => b.val - a.val);
}
