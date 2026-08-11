/**
 * Source handle for Romano's breaks. Task 1 verification (2026-06-13): his OWN
 * Bluesky (fabriziorom.bsky.social) is abandoned — so we read the active
 * third-party MIRROR that auto-reposts his X posts to Bluesky (verified live,
 * posting current content). Best-effort, swappable: change this one constant to
 * repoint at a paid X bridge if the mirror ever degrades.
 */
export const ROMANO_HANDLE = "fabrizioromano.yopro20.com";

const APPVIEW = "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed";

export interface BskyPost {
  uri: string; // at:// URI — stable id, used for idempotency + source link
  text: string;
  createdAt: string;
  imageAlt?: string; // first embed image alt, when present
}

/** Flatten a getAuthorFeed payload to the fields we use. Pure — no network. */
export function parseAuthorFeed(payload: unknown): BskyPost[] {
  const feed = (payload as { feed?: unknown[] } | null)?.feed;
  if (!Array.isArray(feed)) return [];
  const out: BskyPost[] = [];
  for (const item of feed) {
    const post = (item as { post?: Record<string, unknown> } | null)?.post;
    const record = post?.record as { text?: string; createdAt?: string } | undefined;
    if (!post || typeof post.uri !== "string" || !record?.text || !record.createdAt) continue;
    const embed = post.embed as { images?: { alt?: string }[] } | undefined;
    out.push({
      uri: post.uri,
      text: record.text,
      createdAt: record.createdAt,
      imageAlt: embed?.images?.[0]?.alt || undefined,
    });
  }
  return out;
}

/** Fetch a reporter's recent posts. Best-effort: throws on a non-OK response so callers can catch. */
export async function fetchAuthorPosts(handle: string, limit = 15): Promise<BskyPost[]> {
  const res = await fetch(`${APPVIEW}?actor=${encodeURIComponent(handle)}&limit=${limit}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`bluesky getAuthorFeed ${res.status}`);
  return parseAuthorFeed(await res.json());
}
