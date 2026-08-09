/**
 * Strip social-platform plumbing out of a reporter's post before it becomes a
 * Wire summary.
 *
 * Breaks are ingested verbatim from Bluesky, so cards carried the scaffolding of
 * the medium rather than the story: "@theathleticfc.bsky.social post
 * @fabrizioromano.yopro20.com www.nytim". The source is already displayed as
 * attribution and the original post is linked, so none of it earns its place.
 *
 * Two different problems, handled differently:
 *  - TRAILING plumbing (the handle/link block reporters append) is deleted.
 *  - INLINE mentions are part of a sentence — deleting them mangles the grammar
 *    ("as @TeleFootball reports" → "as reports"), so the @ and any platform
 *    domain are dropped and the readable name is kept.
 *
 * Cleaning runs BEFORE truncation; truncating first is what produced the
 * half-eaten "www.nytim" tails.
 */

const URL_RE = /\bhttps?:\/\/\S+/gi;
const WWW_RE = /\bwww\.\S*/gi;
const TLD = "com|co|uk|net|org|io|social|app|xyz";

/** The trailing block of handles/domains/connectors reporters append to posts. */
const TAIL_PLUMBING_RE = new RegExp(
  `(?:\\s|^)(?:(?:@[A-Za-z0-9._-]+|[a-z0-9-]+\\.(?:${TLD})\\S*|\\bvia\\b|\\bpost\\b|\\bsource\\b|\\bmore\\b|[|·•—–-]))+\\s*$`,
  "i",
);

/** An inline mention: keep the readable name, drop the @ and any platform domain. */
const INLINE_HANDLE_RE = /@([A-Za-z0-9_-]+)(?:\.[A-Za-z0-9._-]+)?/g;

/** Connector words stranded once whatever they introduced is gone. */
const DANGLING_RE = /\s*\b(?:via|post|source|full story|read more|link in bio)\b[\s:.,–—-]*$/i;

function tidyTail(s: string): string {
  let out = s.trim();
  for (let i = 0; i < 5; i++) {
    const before = out;
    out = out.replace(TAIL_PLUMBING_RE, "").replace(DANGLING_RE, "").replace(/[\s|·•,;:–—-]+$/u, "").trim();
    if (out === before) break;
  }
  return out;
}

/** Truncate on a word boundary so we never leave a half-eaten token. */
function truncateWords(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const body = lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${body.replace(/[\s.,;:–—-]+$/u, "")}…`;
}

export function cleanBreakSummary(text: string, maxLen = 280): string {
  const noLinks = text.replace(URL_RE, " ").replace(WWW_RE, " ");
  const tailless = tidyTail(noLinks.replace(/\s+/g, " "));
  // Whatever mentions remain are mid-sentence, so keep them readable.
  const inline = tailless.replace(INLINE_HANDLE_RE, "$1").replace(/\s+/g, " ");
  return truncateWords(tidyTail(inline), maxLen);
}
