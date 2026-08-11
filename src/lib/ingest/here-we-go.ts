import type { BskyPost } from "./bluesky";

// Unambiguous done-deal NEGATORS only. Deliberately narrow: a confirmed Romano
// break routinely carries follow-on clauses ("medical WHEN he returns", "even
// IF add-ons apply", "COULD be announced tomorrow", "ALMOST a year of talks") —
// matching those words would silently swallow real breaks (the worst failure
// here). These words, by contrast, genuinely flip "here we go" to not-done.
const HEDGE = /\b(not yet|might|maybe|close to|nearly|would be)\b/i;

/** True only for Romano's trademark confirmed-break phrasing — guarded against hedges/questions. */
export function isHereWeGo(post: BskyPost): boolean {
  const t = post.text;
  if (!/here we go/i.test(t)) return false;
  if (/\?/.test(t)) return false; // a question is not a confirmation
  if (HEDGE.test(t)) return false;
  return true;
}

/** The text we hand to the entity matchers — post text plus image alt (player/club often in the graphic). */
export function breakText(post: BskyPost): string {
  return post.imageAlt ? `${post.text} ${post.imageAlt}` : post.text;
}
