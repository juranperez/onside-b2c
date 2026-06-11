"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { adminDb } from "@/lib/db/admin";
import { getSessionUser } from "@/lib/db/supabase-server";
import { rateLimit } from "@/lib/ratelimit";

export type SubscribeResult = { subscribed: true } | { error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Join The Board — works signed-out (the digest IS the acquisition hook). */
export async function subscribeBoard(emailRaw: string): Promise<SubscribeResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) return { error: "invalid-email" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`board:${ip}`, 5, 60_000).ok) return { error: "rate-limited" };

  const user = await getSessionUser().catch(() => null);
  const db = adminDb();
  const { error } = await db.from("board_subscribers").upsert(
    {
      email,
      profile_id: user?.id ?? null,
      token: randomUUID(),
      unsubscribed_at: null, // resubscribe clears an old opt-out
    },
    { onConflict: "email" },
  );
  if (error) return { error: "try-again" };
  return { subscribed: true };
}
