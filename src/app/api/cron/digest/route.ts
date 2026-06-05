import { NextResponse } from "next/server";
import { buildDigest, buildDigestHtml } from "@/lib/digest/build";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * "The Board" weekly digest send. Guarded by CRON_SECRET. DORMANT until an email
 * provider is configured: set RESEND_API_KEY (+ a verified from-domain) to enable.
 * Mass send to opted-in users still needs a subscription table + unsubscribe link
 * before going live — for now this sends only to ADMIN_EMAIL as a preview.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const d = await buildDigest();
  const html = buildDigestHtml(d);
  const resendKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;

  if (!resendKey || !to) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      reason: "email not configured — set RESEND_API_KEY + ADMIN_EMAIL (and wire opted-in recipients) to enable",
      built: { risers: d.risers.length, fallers: d.fallers.length, rumours: d.rumours.length },
    });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "The Board <board@onsidemarket.com>",
        to: [to],
        subject: "The Board — this week on Onside",
        html,
      }),
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: `resend ${res.status}` }, { status: 502 });
    return NextResponse.json({ ok: true, sent: 1, to });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
