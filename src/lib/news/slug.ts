/** URL-safe, accent-folded token. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Article slug: `{player}-{club}-{angle}`. Deliberately DATE-FREE so the URL stays
 * permanent as the saga evolves — the durable-URL rule that preserves link equity.
 */
export function buildSlug(playerSlug: string, toClub: string, angle: string): string {
  return [playerSlug, slugify(toClub), slugify(angle)].filter(Boolean).join("-");
}
