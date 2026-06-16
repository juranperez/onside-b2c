import type { DealStage } from "@/lib/rumours/stage";

// Earlier stages = higher earliness: calling a deal at "Linked" is harder (and worth more)
// than calling it at "Medical". Feeds the scoring earliness multiplier (0..1).
const STAGE_EARLINESS: Record<DealStage, number> = {
  Linked: 1.0,
  Talks: 0.8,
  Bid: 0.6,
  Agreed: 0.4,
  Medical: 0.2,
  Done: 0.0,
};

export function earlinessOf(stage: DealStage): number {
  return STAGE_EARLINESS[stage] ?? 0.5;
}
