/**
 * 2026 tournament window: kickoff day (UTC) through the END of final day in
 * ET — the site's match-time convention — so the takeover doesn't revert at
 * 8pm ET while final-night traffic is still peaking.
 * Callers compute `new Date()` server-side and pass the boolean down as a
 * prop — never call Date.now() in client render (React 19 purity rule).
 */
export const WC_START_ISO = "2026-06-11T00:00:00Z";
export const WC_END_ISO = "2026-07-20T03:59:59Z"; // 23:59:59 July 19 ET (EDT, UTC-4)

export function isWcWindow(now: Date): boolean {
  const t = now.getTime();
  return t >= new Date(WC_START_ISO).getTime() && t <= new Date(WC_END_ISO).getTime();
}
