// Crest-free club identity (design-led, no licensed badges). Deterministically
// derives an on-brand color pair and a monogram from the club slug/name.

const PALETTE: ReadonlyArray<readonly [string, string]> = [
  ["#A50044", "#EDBB00"],
  ["#FEBE10", "#00529F"],
  ["#6CABDD", "#1C2C5B"],
  ["#EF0107", "#FFFFFF"],
  ["#DC052D", "#0066B2"],
  ["#E32221", "#0A0A0A"],
  ["#034694", "#DBA111"],
  ["#FDE100", "#0A0A0A"],
  ["#004170", "#DA291C"],
  ["#009A44", "#FFFFFF"],
  ["#1B458F", "#FFFFFF"],
  ["#7A263A", "#99D6EA"],
  ["#241F20", "#FBEC21"],
  ["#60223B", "#FFFFFF"],
  ["#0057B8", "#FFFFFF"],
  ["#5A1F2D", "#F2C500"],
];

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface ClubStyle {
  bg: string;
  color: string;
}

/** Deterministic color pair for a club, keyed by slug. */
export function clubStyle(slug: string): ClubStyle {
  const [bg, color] = PALETTE[hash(slug || "club") % PALETTE.length];
  return { bg, color };
}

/** 2-3 letter monogram for a club's tile. */
export function monogram(name: string): string {
  const words = name.replace(/[^A-Za-zÀ-ɏ ]/g, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "FC";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return (words[0][0] + words[1][0] + (words[1][1] ?? "")).toUpperCase();
}
