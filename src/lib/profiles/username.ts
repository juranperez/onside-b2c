/**
 * Handle rules.
 *
 * Handles are PERMANENT once claimed (no rename, no redirect table), so this is the
 * only gate a bad handle ever passes through. Mirrored by a check constraint in
 * migration 0005 — the app is the friendly gate, the database is the one that cannot
 * be bypassed. Keep the two in sync.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/**
 * Top-level routes plus identity traps. Route names matter because a handle that
 * shadows a route is confusing in every share link; the identity words matter because
 * the thread receipt line renders a handle next to a claim, and "@admin called it"
 * trades on authority we never granted.
 *
 * Keep the first block in sync with the directories in `src/app/(app)`.
 */
export const RESERVED_USERNAMES = new Set([
  // top-level app routes
  "ask", "clubs", "coach", "community", "compare", "contracts", "data-sources",
  "discover", "free-agents", "insights", "leagues", "login", "managers", "matches",
  "methodology", "news", "notifications", "players", "pricing", "privacy", "record",
  "search", "stats", "terms", "the-board", "transfers", "watchlist", "worldcup",
  // infrastructure
  "api", "u", "www", "assets", "static", "public", "sitemap", "robots", "favicon",
  // identity / impersonation
  "admin", "administrator", "mod", "moderator", "staff", "team", "official",
  "support", "help", "onside", "onsidemarket", "me", "you", "null", "undefined",
  "anonymous", "deleted",
]);

export type UsernameError =
  | "too_short"
  | "too_long"
  | "bad_charset"
  | "bad_start"
  | "bad_end"
  | "reserved";

export const USERNAME_ERROR_MESSAGE: Record<UsernameError, string> = {
  too_short: `Handles are at least ${USERNAME_MIN} characters.`,
  too_long: `Handles are at most ${USERNAME_MAX} characters.`,
  bad_charset: "Letters, numbers and underscores only.",
  bad_start: "Handles start with a letter.",
  bad_end: "Handles can't end with an underscore.",
  reserved: "That handle is reserved.",
};

/** Canonical storage form. Handles are stored and compared lowercase. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

/** `null` when the handle is claimable; otherwise the reason. Runs on the normalized form. */
export function validateUsername(raw: string): UsernameError | null {
  const u = normalizeUsername(raw);
  if (u.length < USERNAME_MIN) return "too_short";
  if (u.length > USERNAME_MAX) return "too_long";
  if (!/^[a-z0-9_]+$/.test(u)) return "bad_charset";
  if (!/^[a-z]/.test(u)) return "bad_start";
  if (u.endsWith("_")) return "bad_end";
  if (RESERVED_USERNAMES.has(u)) return "reserved";
  return null;
}
