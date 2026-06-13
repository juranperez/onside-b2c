import type { BskyPost } from "./bluesky";

// Hedges that negate a "here we go" in the same post (mirrors stage.ts doneLanguage guarding).
const HEDGE = /\b(not yet|could|might|maybe|soon|close to|nearly|almost|if |when |would be)\b/i;

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
