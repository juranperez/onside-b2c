import type { RumourStatus } from "./confidence";

/**
 * Deal-stage taxonomy — derived from the latest report's wording, no schema
 * change needed. Order matters: the furthest-along signal in the text wins.
 */
export type DealStage = "Done" | "Medical" | "Agreed" | "Bid" | "Talks" | "Linked";

// Modal/future markers that turn a completion verb into a hedge ("set to sign",
// "will join", "race to sign") — those are NOT done deals.
const HEDGE = "(?:to|will|would|could|may|might|should|can|set)";

/**
 * Completed-action press language — the headline convention for an announced
 * deal ("Tottenham sign defender on free transfer", "Senesi signs for Spurs",
 * "OFFICIAL: …", "completes move"). Precision-first: a false Done wrongly marks
 * a deal complete, so every verb pattern guards against future/hedge forms and
 * question headlines never count.
 */
const DONE_PATTERNS: RegExp[] = [
  /\bdone deal\b/,
  /\bofficially\b(?!\s+(?:bid|offer|approach|enquir|inquir))/,
  /(?:^|[|—–-]\s*)official\s*[:—–-]/, // "OFFICIAL: …" prefix style
  /\bmade official\b|\bofficial (?:announcement|statement|confirmation|record|website)\b/,
  /\bconfirmed the signing\b|\bannounce(?:s|d)? the signing\b/,
  /(?<!\b(?:to|will|be|being)\s)\bunveil(?:s|ed)?\b/,
  /\b(?:has|have)\s+(?:signed|joined|completed)\b/,
  // "completes move/transfer" with at most one word in the gap — so
  // "completes medical ahead of move" stays Medical, not Done.
  new RegExp(`(?<!\\b${HEDGE}\\s)\\bcompletes?\\s+(?:\\S+\\s+)?(?:move|transfer|switch|signing)\\b`),
  new RegExp(`(?<!\\b${HEDGE}\\s)\\bsigns?\\s+(?:for|with)\\b`),
  // Club-subject headlinese: "Tottenham sign X on free transfer / from Y".
  new RegExp(`(?<!\\b${HEDGE}\\s)\\bsigns?\\b[^.]{0,60}\\b(?:on a free|free transfer|from)\\b`),
  new RegExp(`(?<!\\b${HEDGE}\\s)\\bjoins\\b(?!\\s+(?:up|race|the race|battle|hunt|chase|interest|list))`),
];

/** True when the wording reports a COMPLETED deal, not progress toward one. */
export function doneLanguage(summary: string): boolean {
  const s = summary.toLowerCase();
  if (s.includes("?")) return false; // question headlines are speculation by definition
  return DONE_PATTERNS.some((re) => re.test(s));
}

export function stageOf(summary: string, status: RumourStatus): DealStage {
  if (status === "confirmed") return "Done";
  const s = summary.toLowerCase();
  if (doneLanguage(s)) return "Done";
  if (/medical/.test(s)) return "Medical";
  if (/here we go|agreement (?:reached|in place)|deal (?:agreed|done|in place)|agree(?:s|d)? (?:a )?(?:fee|deal)\b|agreed (?:personal )?terms|verbal agreement/.test(s)) return "Agreed";
  if (/\bbid\b|\boffer\b|british record|club record|€\d+|£\d+/.test(s)) return "Bid";
  if (/talks|negotiat|discuss|contact|enquir|approach/.test(s)) return "Talks";
  return "Linked";
}

/** Visual tone per stage — maps onto the existing Chip tones. */
export function stageTone(stage: DealStage): "up" | "acc" | "neutral" {
  if (stage === "Done" || stage === "Medical" || stage === "Agreed") return "up";
  if (stage === "Bid" || stage === "Talks") return "acc";
  return "neutral";
}
