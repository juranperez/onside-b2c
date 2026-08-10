/**
 * Handle rules.
 *
 * Handles are PERMANENT once claimed (no rename, no redirect table), so this is the
 * only gate a bad handle ever passes through. A later migration (0005) is intended to
 * mirror these rules with a database check constraint — the app is the friendly gate,
 * the database is the one that cannot be bypassed. Keep the two in sync once that
 * migration lands.
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
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
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
  | "invalid_type"
  | "too_short"
  | "too_long"
  | "bad_charset"
  | "bad_start"
  | "bad_end"
  | "reserved";

export const USERNAME_ERROR_MESSAGE: Record<UsernameError, string> = {
  invalid_type: "Enter a handle.",
  too_short: `Handles are at least ${USERNAME_MIN} characters.`,
  too_long: `Handles are at most ${USERNAME_MAX} characters.`,
  bad_charset: "Letters, numbers and underscores only.",
  bad_start: "Handles start with a letter.",
  bad_end: "Handles can't end with an underscore.",
  reserved: "That handle is reserved.",
};

export type UsernameCheck =
  | { ok: true; username: string }
  | { ok: false; error: UsernameError };

/**
 * Canonical storage form: trims surrounding whitespace, drops any leading `@`s, and
 * lowercases. Handles are stored and compared lowercase.
 */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

/**
 * `{ ok: true, username }` with the canonical value to persist when the handle is
 * claimable, otherwise `{ ok: false, error }`. Returns the safe value rather than a
 * verdict about the unsafe one, so a caller can never persist the raw, un-normalized
 * input by mistake — handles are permanent, so that mistake would be unfixable.
 *
 * Accepts `unknown` because this gates server actions and form submissions, where
 * "string" is a type assertion, not a guarantee. Never throws.
 *
 * Check order is deliberate:
 *  - too_short comes first so an empty input reports "too short", not a confusing
 *    charset complaint (charset also fails on "", but that message reads worse).
 *  - bad_charset comes before too_long so a too-long handle with bad characters is
 *    diagnosed in one round trip, not two (shorten it, resubmit, only then learn
 *    about the hyphen) — irreversible claim forms shouldn't cost the user two tries.
 */
export function checkUsername(raw: unknown): UsernameCheck {
  if (typeof raw !== "string") return { ok: false, error: "invalid_type" };
  const username = normalizeUsername(raw);
  if (username.length < USERNAME_MIN) return { ok: false, error: "too_short" };
  if (!/^[a-z0-9_]+$/.test(username)) return { ok: false, error: "bad_charset" };
  if (username.length > USERNAME_MAX) return { ok: false, error: "too_long" };
  if (!/^[a-z]/.test(username)) return { ok: false, error: "bad_start" };
  if (username.endsWith("_")) return { ok: false, error: "bad_end" };
  if (RESERVED_USERNAMES.has(username)) return { ok: false, error: "reserved" };
  return { ok: true, username };
}
