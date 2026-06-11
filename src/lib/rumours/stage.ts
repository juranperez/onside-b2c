import type { RumourStatus } from "./confidence";

/**
 * Deal-stage taxonomy v0 — derived from the latest report's wording, no schema
 * change needed. Order matters: the furthest-along signal in the text wins.
 */
export type DealStage = "Done" | "Medical" | "Agreed" | "Bid" | "Talks" | "Linked";

export function stageOf(summary: string, status: RumourStatus): DealStage {
  if (status === "confirmed") return "Done";
  const s = summary.toLowerCase();
  if (/medical/.test(s)) return "Medical";
  if (/here we go|agreement (?:reached|in place)|deal (?:agreed|done|in place)|agreed (?:personal )?terms|verbal agreement/.test(s)) return "Agreed";
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
