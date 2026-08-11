import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/types";
import { buildDigest, buildDigestHtml } from "./build";

const BASE = "https://onsidemarket.com";

export interface DigestSendResult {
  subscribers: number;
  sent: number;
  batches: number;
  preview: boolean;
}

function withFooter(html: string, email: string, token: string): string {
  const unsub = `${BASE}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${token}`;
  return (
    html +
    `<p style="margin-top:20px;color:#5a5a63;font:11px sans-serif">You're getting The Board because you subscribed on onsidemarket.com · <a href="${unsub}" style="color:#8A8A93">Unsubscribe</a></p>`
  );
}

/**
 * Send "The Board" to every active subscriber via Resend's batch endpoint
 * (≤100 emails per call). Falls back to an ADMIN_EMAIL preview when the
 * audience is empty so the cron is never a silent no-op.
 */
export async function sendDigest(db: SupabaseClient<Database>): Promise<DigestSendResult> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY is not set");

  const d = await buildDigest();
  const html = buildDigestHtml(d, BASE);
  const subject = "The Board — this week on Onside";
  const from = "The Board <board@onsidemarket.com>";

  const { data: subs } = await db
    .from("board_subscribers")
    .select("email,token")
    .is("unsubscribed_at", null)
    .limit(2000);

  const audience = subs ?? [];
  const result: DigestSendResult = { subscribers: audience.length, sent: 0, batches: 0, preview: false };

  if (!audience.length) {
    const admin = process.env.ADMIN_EMAIL ?? "juranperez@gmail.com";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [admin], subject: `${subject} (preview — no subscribers yet)`, html }),
    });
    if (res.ok) result.sent = 1;
    result.preview = true;
    return result;
  }

  for (let i = 0; i < audience.length; i += 100) {
    const batch = audience.slice(i, i + 100).map((s) => ({
      from,
      to: [s.email],
      subject,
      html: withFooter(html, s.email, s.token),
      headers: { "List-Unsubscribe": `<${BASE}/api/unsubscribe?e=${encodeURIComponent(s.email)}&t=${s.token}>` },
    }));
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    result.batches++;
    if (res.ok) result.sent += batch.length;
  }
  return result;
}
