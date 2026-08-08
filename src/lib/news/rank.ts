import type { ArticleEvent } from "./events";

export interface RumourSignals {
  sourceTier: number;
  onsideValueM: number;
  confidencePct: number;
  reportedFeeM: number | null;
}

/** Terminal and broken news outranks incremental reads. */
const TYPE_WEIGHT: Record<ArticleEvent["type"], number> = {
  confirmed: 40,
  break: 35,
  dead: 22,
  stage_advance: 20,
  fee_divergence: 16,
  confidence_swing: 8,
};

function tierPoints(t: number): number {
  return t === 0 ? 40 : t === 1 ? 30 : t === 2 ? 20 : 10;
}

/** Higher = more deserving of one of the day's limited slots. */
export function newsworthiness(e: ArticleEvent, s: RumourSignals): number {
  const value = Math.min(30, s.onsideValueM / 5); // saturates around €150M
  const fee = s.reportedFeeM == null ? 0 : Math.min(15, s.reportedFeeM / 10);
  const conf = s.confidencePct / 10; // 0..10
  return TYPE_WEIGHT[e.type] + tierPoints(s.sourceTier) + value + fee + conf;
}

export interface SelectOptions {
  globalCap: number;
  perSagaCap: number;
  /** rumourId → count of articles already published for that saga. */
  publishedPerSaga: ReadonlyMap<string, number>;
}

/**
 * Editorial standard, enforced in code: publish the BEST N, not everything.
 * These caps are what keep the section data journalism rather than a content
 * farm — volume-without-value is precisely the penalised pattern.
 */
export function selectForPublication(
  scored: ReadonlyArray<{ event: ArticleEvent; score: number }>,
  opts: SelectOptions,
): ArticleEvent[] {
  const perSaga = new Map(opts.publishedPerSaga);
  const out: ArticleEvent[] = [];
  for (const { event } of [...scored].sort((a, b) => b.score - a.score)) {
    if (out.length >= opts.globalCap) break;
    const used = perSaga.get(event.rumourId) ?? 0;
    if (used >= opts.perSagaCap) continue;
    perSaga.set(event.rumourId, used + 1);
    out.push(event);
  }
  return out;
}
