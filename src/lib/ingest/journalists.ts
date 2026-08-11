import type { BskyPost } from "./bluesky";
import { isHereWeGo } from "./here-we-go";

/**
 * The tier-0 break lane, generalised beyond one reporter.
 *
 * Onside brands these lanes with the JOURNALIST'S NAME, never a borrowed
 * catchphrase — the badge says ORNSTEIN or ROMANO. Attribution is the point:
 * it credits the reporter, scales to any name we add, and keeps Onside's own
 * voice free for Onside's own language.
 */
export interface Journalist {
  /** Stable key used in copy and badges. */
  key: string;
  /** Bluesky handle to poll. */
  handle: string;
  /** Byline stored as primary_source. */
  name: string;
  /** Badge text on the Wire. */
  surname: string;
  /** True when THIS reporter's phrasing signals an agreed/effectively-done deal. */
  sealed: (post: BskyPost) => boolean;
}

/** Transfer-shaped language. Excludes the injury and contract-renewal posts these feeds also carry. */
const TRANSFER = /\b(sign|signing|signs|join|joins|joining|transfer|move|medical|fee|bid|offer|loan|deal|agreement)\b/i;
const NOT_TRANSFER = /\b(new contract|contract extension|extend(?:s|ed)? (?:his|their) contract|renew(?:s|al)?|injur(?:y|ed)|doubtful|ruled out|sidelined)\b/i;

/**
 * Is this post about a transfer at all? Applied before any publishing decision:
 * these reporters also post injuries, contract renewals and general club news,
 * none of which belong on a transfer Wire.
 */
export function isTransferBreak(post: BskyPost): boolean {
  const t = `${post.text} ${post.imageAlt ?? ""}`;
  if (!TRANSFER.test(t)) return false;
  // A contract renewal mentions "sign" and "agreement" but is not a transfer.
  if (NOT_TRANSFER.test(t) && !/\b(join|joins|transfer to|move to|sign for|signing for)\b/i.test(t)) return false;
  return true;
}

/** Hedges that flip an otherwise-sealed phrasing back to "reported, not agreed". */
const HEDGE = /\b(not yet|might|maybe|could|expected to hold|hoping|pushing to|in talks over)\b/i;

/**
 * Ornstein does not use a catchphrase — he reports stages. Only the phrasings that
 * genuinely mean "agreed/finalising" count as sealed; an offer or a bid does not,
 * which is what keeps the 95% tier-0 confidence honest for his feed.
 */
const ORNSTEIN_SEALED =
  /\b(here we go|deal (?:is )?(?:done|sealed|agreed|being finalised|finalised)|completes? medical|undergo(?:es|ing) medical|reach(?:es|ed)? (?:full )?agreement|agreement reached|set to sign|set to join|joins|signs for|has signed)\b/i;

export const JOURNALISTS: Journalist[] = [
  {
    key: "romano",
    // His OWN Bluesky is abandoned; this is the active mirror of his X posts.
    handle: "fabrizioromano.yopro20.com",
    name: "Fabrizio Romano",
    surname: "ROMANO",
    sealed: isHereWeGo,
  },
  {
    key: "ornstein",
    // Verified 2026-08-08: authentic and active — 122k followers, bio
    // "Football Correspondent, The Athletic", posting the same day.
    handle: "david-ornstein.bsky.social",
    name: "David Ornstein",
    surname: "ORNSTEIN",
    sealed: (post) => {
      const t = `${post.text} ${post.imageAlt ?? ""}`;
      if (/\?/.test(post.text)) return false; // a question is not a confirmation
      if (HEDGE.test(t)) return false;
      return ORNSTEIN_SEALED.test(t);
    },
  },
];

/**
 * Source tier for a break. Tier 0 short-circuits confidence to 95%, so it must mean
 * "a top reporter says this is effectively done" — not merely "a top reporter
 * mentioned it". A non-sealed report from the same reporter is still tier 1.
 */
export function tierForBreak(j: Journalist, post: BskyPost): 0 | 1 {
  return j.sealed(post) ? 0 : 1;
}
