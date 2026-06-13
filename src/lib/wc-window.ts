/**
 * 2026 tournament window: kickoff day through the final, inclusive (UTC).
 * Callers compute `new Date()` server-side and pass the boolean down as a
 * prop — never call Date.now() in client render (React 19 purity rule).
 */
export const WC_START_ISO = "2026-06-11T00:00:00Z";
export const WC_END_ISO = "2026-07-19T23:59:59Z";

export function isWcWindow(now: Date): boolean {
  const t = now.getTime();
  return t >= new Date(WC_START_ISO).getTime() && t <= new Date(WC_END_ISO).getTime();
}
