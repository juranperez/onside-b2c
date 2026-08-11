/** Format a euro value into a compact string: €215.0M, €1.6B, €750K. */
export function fmtVal(eur: number): string {
  const abs = Math.abs(eur);
  if (abs >= 1_000_000_000) return `€${(eur / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `€${(eur / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `€${Math.round(eur / 1_000)}K`;
  return `€${Math.round(eur)}`;
}

/** Format a signed euro delta: +€9.3M, -€4.8M. */
export function fmtDelta(eur: number): string {
  const sign = eur >= 0 ? "+" : "-";
  return `${sign}${fmtVal(Math.abs(eur))}`;
}

/** URL-safe slug: lowercase, accent-stripped, hyphenated. */
export function slugify(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
