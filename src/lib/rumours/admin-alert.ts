export interface BreakAlert {
  player: string;
  club: string;
  rumourId: string;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "juranperez@gmail.com";

/** Pure — the email copy for a live Romano break. */
export function breakAlertMessage(a: BreakAlert): { subject: string; body: string } {
  return {
    subject: `🚨 Romano break live: ${a.player} → ${a.club}`,
    body: `Romano just broke ${a.player} → ${a.club} and it auto-published to the Wire.\n\nReview or Retract: https://onsidemarket.com/transfers/manage`,
  };
}

/** Best-effort email alert via Resend. No-ops if RESEND_API_KEY is unset; never throws. */
export async function sendBreakAlert(a: BreakAlert): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const { subject, body } = breakAlertMessage(a);
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Onside Market <noreply@onsidemarket.com>", to: ADMIN_EMAIL, subject, text: body }),
    });
  } catch {
    // alert is best-effort — never block or break the watcher on a failed email
  }
}
