export type FeeTone = "up" | "acc" | "down";
export type FeeVerdict = { label: string; tone: FeeTone } | null;

/**
 * Reported fee vs the live Onside valuation → a plain-language verdict. Returns
 * null when there's nothing to judge (no fee, or no valuation). Shared by the Wire
 * row and the story page's money read so the call is identical everywhere.
 */
export function feeVerdict(feeM: number | null, valueM: number): FeeVerdict {
  if (feeM == null || valueM <= 0) return null;
  if (feeM === 0) return { label: "Free — pure value gain", tone: "up" };
  const ratio = feeM / valueM;
  if (ratio <= 1.1) return { label: "Fair vs our value", tone: "up" };
  if (ratio <= 1.8) return { label: "Above our value", tone: "acc" };
  return { label: "Overpay vs our value", tone: "down" };
}
