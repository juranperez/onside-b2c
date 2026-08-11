// Crest-free, flag-free nation identity. Derives a 3-letter monogram and a
// deterministic colour pair from a nation's name/slug — no flags, no emblems.
import { clubStyle } from "@/lib/club-style";

// A few nations read better with a conventional 3-letter code than a naive
// initials cut (e.g. "United States" → "USA", not "US"). Keyed by slug.
const OVERRIDES: Record<string, string> = {
  "united-states": "USA",
  usa: "USA",
  "south-korea": "KOR",
  "korea-republic": "KOR",
  "saudi-arabia": "KSA",
  "new-zealand": "NZL",
  "south-africa": "RSA",
  "ivory-coast": "CIV",
  "cote-divoire": "CIV",
  "czech-republic": "CZE",
  netherlands: "NED",
  croatia: "CRO",
  germany: "GER",
  portugal: "POR",
  uruguay: "URU",
  paraguay: "PAR",
  denmark: "DEN",
  switzerland: "SUI",
};

/** 3-letter, uppercase nation code derived from slug/name (no flags). */
export function nationCode(slug: string, name: string): string {
  const key = slug?.toLowerCase().trim();
  if (key && OVERRIDES[key]) return OVERRIDES[key];

  const words = name
    .replace(/[^A-Za-zÀ-ɏ ]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "TBD";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  // Multi-word: first letter of each of the first three words, padded to 3.
  const initials = words
    .slice(0, 3)
    .map((w) => w[0])
    .join("");
  if (initials.length >= 3) return initials.toUpperCase();
  // Two words → first letter of word one + first two of word two (e.g. "Costa Rica" → "CRI").
  return (words[0][0] + words[1].slice(0, 3 - 1)).toUpperCase();
}

/** Deterministic colour pair for a nation's code chip (reuses the club palette). */
export function nationStyle(slug: string): { bg: string; color: string } {
  return clubStyle(slug || "nation");
}

/**
 * ISO codes for the bundled circular flag SVGs in /public/flags (MIT "circle-flags").
 * National flags are public symbols (not trademarked like club crests), so they are
 * safe to use. Keyed by nation slug.
 */
export const NATION_ISO2: Record<string, string> = {
  mexico: "mx", "south-africa": "za", "south-korea": "kr", "czech-republic": "cz", canada: "ca",
  "bosnia-herzegovina": "ba", qatar: "qa", switzerland: "ch", brazil: "br", morocco: "ma",
  haiti: "ht", scotland: "gb-sct", "united-states": "us", paraguay: "py", australia: "au",
  turkey: "tr", germany: "de", curacao: "cw", "ivory-coast": "ci", ecuador: "ec",
  netherlands: "nl", japan: "jp", sweden: "se", tunisia: "tn", belgium: "be", egypt: "eg",
  iran: "ir", "new-zealand": "nz", spain: "es", "cape-verde": "cv", "saudi-arabia": "sa",
  uruguay: "uy", france: "fr", senegal: "sn", iraq: "iq", norway: "no", argentina: "ar",
  algeria: "dz", austria: "at", jordan: "jo", portugal: "pt", "dr-congo": "cd", uzbekistan: "uz",
  colombia: "co", england: "gb-eng", croatia: "hr", ghana: "gh", panama: "pa",
};

/** Path to a nation's circular flag SVG, or null to fall back to the code tile. */
export function nationFlagSrc(slug: string): string | null {
  const iso = NATION_ISO2[slug?.toLowerCase()?.trim()];
  return iso ? `/flags/${iso}.svg` : null;
}
