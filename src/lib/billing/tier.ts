import "server-only";
import { createSupabaseServer } from "@/lib/db/supabase-server";
import { normalizeTier, type Tier } from "./entitlements";

/**
 * The signed-in user's tier, read server-side from profiles.
 *
 * Never accept a tier from the client: it decides what someone gets for money.
 * `profiles.tier` is writable only by the service role (the Stripe webhook) —
 * the RLS hardening in 2026-06 revoked the column from `authenticated` precisely
 * so a user cannot grant themselves Pro.
 *
 * Fails CLOSED to "free" — an unreadable tier must never hand out paid access.
 */
export async function getUserTier(userId: string): Promise<Tier> {
  try {
    const db = await createSupabaseServer();
    const { data } = await db.from("profiles").select("tier").eq("id", userId).maybeSingle();
    return normalizeTier(data?.tier);
  } catch {
    return "free";
  }
}
