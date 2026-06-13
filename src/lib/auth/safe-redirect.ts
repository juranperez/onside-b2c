/**
 * Open-redirect guard for the post-sign-in `next` param. Only same-site absolute
 * paths are allowed; anything external (or protocol-relative) falls back to a
 * safe in-app destination.
 */
export function safeRedirect(next: string | null | undefined, fallback = "/discover"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback; // external URL / scheme / relative
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback; // protocol-relative
  return next;
}
