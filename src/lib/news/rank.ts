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
  /** Max share of one run any single event type may take (0..1). */
  typeShare?: number;
  /** Max share of one run any single lead source may take (0..1). */
  sourceShare?: number;
}

/** A candidate, with the lead source so a single reporter can't fill the run. */
export interface Candidate {
  event: ArticleEvent;
  score: number;
  /** Lead source/outlet behind the saga. Optional so older callers still compile. */
  source?: string;
}

const DEFAULT_TYPE_SHARE = 0.4;
const DEFAULT_SOURCE_SHARE = 0.4;

/**
 * Editorial standard, enforced in code: publish the BEST N, not everything.
 * These caps are what keep the section data journalism rather than a content
 * farm — volume-without-value is precisely the penalised pattern.
 *
 * DIVERSITY: raw score alone makes every slot a tier-0 break (a break scores 35
 * for its type plus 40 for the source tier before anything else counts), so a
 * whole run reads as one reporter saying the same thing. Selection therefore runs
 * in two passes: the first honours per-type and per-source quotas, the second
 * fills any slots left over from the best of the rest. Variety is a PREFERENCE,
 * not a constraint — a quiet day with only breaks still publishes a full run.
 */
export function selectForPublication(scored: ReadonlyArray<Candidate>, opts: SelectOptions): ArticleEvent[] {
  const perSaga = new Map(opts.publishedPerSaga);
  const typeCap = Math.max(1, Math.ceil(opts.globalCap * (opts.typeShare ?? DEFAULT_TYPE_SHARE)));
  const sourceCap = Math.max(1, Math.ceil(opts.globalCap * (opts.sourceShare ?? DEFAULT_SOURCE_SHARE)));

  const byType = new Map<string, number>();
  const bySource = new Map<string, number>();
  const out: ArticleEvent[] = [];
  const taken = new Set<string>();

  const ranked = [...scored].sort((a, b) => b.score - a.score);

  const take = (c: Candidate) => {
    perSaga.set(c.event.rumourId, (perSaga.get(c.event.rumourId) ?? 0) + 1);
    byType.set(c.event.type, (byType.get(c.event.type) ?? 0) + 1);
    if (c.source) bySource.set(c.source, (bySource.get(c.source) ?? 0) + 1);
    taken.add(c.event.eventKey);
    out.push(c.event);
  };

  const sagaHasRoom = (c: Candidate) => (perSaga.get(c.event.rumourId) ?? 0) < opts.perSagaCap;

  // Pass 1 — best first, but no single type or source may dominate the run.
  for (const c of ranked) {
    if (out.length >= opts.globalCap) break;
    if (!sagaHasRoom(c)) continue;
    if ((byType.get(c.event.type) ?? 0) >= typeCap) continue;
    if (c.source && (bySource.get(c.source) ?? 0) >= sourceCap) continue;
    take(c);
  }

  // Pass 2 — fill the remainder from the best of the rest, quotas relaxed, so a
  // one-note day still fills the run rather than publishing less.
  for (const c of ranked) {
    if (out.length >= opts.globalCap) break;
    if (taken.has(c.event.eventKey)) continue;
    if (!sagaHasRoom(c)) continue;
    take(c);
  }

  return out;
}
