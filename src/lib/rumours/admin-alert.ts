export interface BreakAlert {
  player: string;
  club: string;
  rumourId: string;
  /** The reporter who broke it — the lane covers several, not just one. */
  source: string;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "juranperez@gmail.com";

/** Pure — the email copy for a live break, attributed to the reporter who broke it. */
export function breakAlertMessage(a: BreakAlert): { subject: string; body: string } {
  return {
    subject: `🚨 Break live: ${a.player} → ${a.club} (${a.source})`,
    body: `${a.source} just broke ${a.player} → ${a.club} and it auto-published to the Wire.\n\nReview or Retract: https://onsidemarket.com/transfers/manage`,
  };
}

/**
 * Best-effort email alert via Resend.
 *
 * OFF BY DEFAULT. This was designed when the lane watched one reporter for one
 * rare phrase ("here we go"); once it covered two reporters and every transfer
 * post, it emailed on every auto-publish and buried the inbox it was meant to
 * inform. Auto-publishing is the normal path now, so a per-break email carries no
 * decision — /transfers/manage is the review surface, and the Wire is the record.
 *
 * Set BREAK_ALERTS=all to restore per-break email, or BREAK_ALERTS=holds to be
 * emailed only about items parked for review (the genuinely actionable case).
 */
export async function sendBreakAlert(a: BreakAlert, kind: "published" | "held" = "published"): Promise<void> {
  const mode = process.env.BREAK_ALERTS ?? "off";
  if (mode === "off") return;
  if (mode === "holds" && kind !== "held") return;
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
