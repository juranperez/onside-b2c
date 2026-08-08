import { stageOf } from "@/lib/rumours/stage";
import { feeVerdict } from "@/lib/rumours/fee-verdict";
import type { RumourItem } from "@/lib/queries/rumours";

export type ArticleEventType =
  | "break"
  | "stage_advance"
  | "fee_divergence"
  | "confidence_swing"
  | "confirmed"
  | "dead";

export interface ArticleEvent {
  type: ArticleEventType;
  rumourId: string;
  /** Stateless dedup key — encodes the bucket, so "already covered" is set membership. */
  eventKey: string;
  /** Short angle token used in the slug and headline framing. */
  angle: string;
}

/** Confidence is bucketed so one briefing fires per ~12-point band, without storing prior state. */
const CONF_BAND = 12;

const VERDICT_KEY: Record<string, string> = {
  "Free — pure value gain": "free",
  "Fair vs our value": "fair",
  "Above our value": "above",
  "Overpay vs our value": "overpay",
};

/**
 * The editorial gate.
 *
 * Returns only events that carry an ORIGINAL Onside angle and have not already
 * been covered. "No angle → no article" is the structural defence against
 * scaled-content penalties (Google's March-2026 enforcement), so this stays
 * strict on purpose: a headline arriving is not, by itself, news.
 */
export function detectArticleEvents(r: RumourItem, publishedKeys: ReadonlySet<string>): ArticleEvent[] {
  // Both are required for us to have anything of our OWN to say about the deal.
  if (r.toClub === "—" || r.onsideValueM <= 0) return [];

  const out: ArticleEvent[] = [];
  const push = (type: ArticleEventType, eventKey: string, angle: string) => {
    if (!publishedKeys.has(eventKey)) out.push({ type, rumourId: r.id, eventKey, angle });
  };

  if (r.status === "confirmed") push("confirmed", `${r.id}:confirmed`, "confirmed");
  if (r.status === "dead") push("dead", `${r.id}:dead`, "collapsed");

  if (r.status === "rumour") {
    if (r.sourceTier === 0) push("break", `${r.id}:break`, "break");

    const stage = stageOf(r.summary, r.status);
    // "Linked" is the resting default — a player merely being linked is not news.
    if (stage !== "Linked") push("stage_advance", `${r.id}:stage:${stage}`, stage.toLowerCase());

    const verdict = feeVerdict(r.reportedFeeM, r.onsideValueM);
    if (verdict) push("fee_divergence", `${r.id}:fee:${VERDICT_KEY[verdict.label] ?? "fee"}`, VERDICT_KEY[verdict.label] ?? "fee");

    push("confidence_swing", `${r.id}:conf:${Math.floor(r.confidence.pct / CONF_BAND)}`, "read");
  }

  return out;
}
