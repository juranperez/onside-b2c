import type { RumourItem } from "@/lib/queries/rumours";

/**
 * A club's transfer window, read against our own valuations.
 *
 * Derived from deals already fetched for the page rather than re-queried — the club
 * page has the list in hand, and a second round trip to re-derive it would be pure cost.
 */
export interface ClubWindow {
  /** Priced signings we can also value — the ones spendM/valueM/netM are computed over. */
  dealCount: number;
  /** Reported fees for those signings, in millions. */
  spendM: number;
  /** What we valued those same players at, in millions. */
  valueM: number;
  /** spendM - valueM. Positive = paid over our number. Strictly like-for-like. */
  netM: number;
  /**
   * Priced signings we have no valuation for, excluded from every figure above.
   *
   * Surfaced rather than swallowed: a club can have spent real money we cannot assess,
   * and the page has to say so instead of quietly implying the comparison was complete.
   */
  unvaluedCount: number;
  /** Fees of those unvalued signings, in millions — real money, just not comparable. */
  unvaluedSpendM: number;
  biggestOverpay: WindowDeal | null;
  biggestBargain: WindowDeal | null;
}

export interface WindowDeal {
  id: string;
  player: string;
  playerSlug: string;
  feeM: number;
  valueM: number;
  /** feeM - valueM. Positive is an overpay, negative a bargain. */
  diffM: number;
}

/**
 * Build the window summary, or `null` when there is nothing honest to say.
 *
 * Returns null rather than a zeroed object when a club has no priced confirmed
 * incoming deals — which is the majority case (101 of 523 clubs have any). "€0M net
 * spend" reads as a measured finding; the truth is that we have nothing to measure,
 * and the section should be absent rather than confidently empty.
 *
 * Free transfers (fee 0) count: signing someone we value at €40M for nothing is exactly
 * the kind of bargain this is meant to surface. Only an ABSENT fee is excluded, because
 * an undisclosed fee tells us nothing about spend.
 */
export function clubWindowFrom(deals: RumourItem[], clubName: string): ClubWindow | null {
  const priced = deals.filter(
    (d) => d.status === "confirmed" && d.toClub === clubName && d.reportedFeeM != null,
  );
  if (!priced.length) return null;

  let spendM = 0;
  let valueM = 0;
  let unvaluedCount = 0;
  let unvaluedSpendM = 0;
  let biggestOverpay: WindowDeal | null = null;
  let biggestBargain: WindowDeal | null = null;

  for (const d of priced) {
    const feeM = d.reportedFeeM as number;
    const valM = d.onsideValueM;

    // A signing we cannot value is excluded from spend, valuation AND net — not just
    // from the superlatives. Counting its fee while contributing zero valuation would
    // treat "we have no number for him" as "we thought he was worth nothing", and
    // manufacture an overpay out of missing data. Reported separately instead.
    if (valM <= 0) {
      unvaluedCount += 1;
      unvaluedSpendM += feeM;
      continue;
    }

    spendM += feeM;
    valueM += valM;

    const deal: WindowDeal = {
      id: d.id,
      player: d.player.name,
      playerSlug: d.player.slug,
      feeM,
      valueM: valM,
      diffM: feeM - valM,
    };
    if (deal.diffM > 0 && (!biggestOverpay || deal.diffM > biggestOverpay.diffM)) biggestOverpay = deal;
    if (deal.diffM < 0 && (!biggestBargain || deal.diffM < biggestBargain.diffM)) biggestBargain = deal;
  }

  // Everything priced turned out to be unvaluable — there is no comparison to show.
  if (spendM === 0 && valueM === 0 && unvaluedCount > 0) return null;

  return {
    dealCount: priced.length - unvaluedCount,
    spendM: Math.round(spendM * 10) / 10,
    valueM: Math.round(valueM * 10) / 10,
    netM: Math.round((spendM - valueM) * 10) / 10,
    unvaluedCount,
    unvaluedSpendM: Math.round(unvaluedSpendM * 10) / 10,
    biggestOverpay,
    biggestBargain,
  };
}
