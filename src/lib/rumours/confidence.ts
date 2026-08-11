// The Onside Confidence % — the trademark credibility rating on every rumour.
// Deterministic, transparent, and uniquely ours because the "valuation alignment"
// factor compares the reported fee to the live Onside value (no one else can).
//
// v2 (2026-06-12, after the Senesi/Anderson audit): adds a DEAL-STAGE factor —
// the wording of the latest report ("signs", "medical", "bid") moves the score,
// so a story reported as done can reach the high 80s while a single fresh
// feature mention idles in the 40s. Source weight drops 45→30 so one outlet can
// never carry a rumour to "high" on its own; corroboration now scales all the
// way to 20+ independent sources instead of flat-lining at 4.

import { stageOf } from "./stage";

export type RumourStatus = "rumour" | "confirmed" | "dead";

const SEASON_YEAR = 2026;

export interface ConfidenceInput {
  status: RumourStatus;
  summary: string; // latest report wording — drives the deal-stage factor
  sourceTier: number; // 1 (tier-1 journalist) .. 4 (forums)
  corroborations: number; // independent sources reporting it
  reportedFeeEur: number | null;
  onsideValueEur: number; // player's live Onside value
  contractUntil: number | null;
  firstSeen: Date;
  now?: Date;
}

export interface ConfidenceFactor {
  key: string;
  label: string;
  score: number; // 0..1
  weight: number; // 0..1
  detail: string;
}

export interface ConfidenceResult {
  pct: number; // 0..100
  band: "high" | "medium" | "low";
  factors: ConfidenceFactor[];
}

const TIER_LABEL = ["", "Tier-1 journalist", "Established reporter", "Outlet / regional", "Secondary signal"];

function sourceScore(t: number) {
  return t <= 1 ? 1.0 : t === 2 ? 0.75 : t === 3 ? 0.5 : 0.3;
}
function convergenceScore(n: number) {
  if (n >= 20) return 1.0;
  if (n >= 10) return 0.95;
  if (n >= 6) return 0.85;
  if (n >= 4) return 0.75;
  return n === 3 ? 0.6 : n === 2 ? 0.45 : 0.2;
}
const STAGE_SCORE: Record<string, { score: number; detail: string }> = {
  Done: { score: 1.0, detail: "Reported as completed — awaiting official record" },
  Medical: { score: 0.9, detail: "At the medical stage" },
  Agreed: { score: 0.85, detail: "Deal agreed per reports" },
  Bid: { score: 0.6, detail: "Formal bid reported" },
  Talks: { score: 0.45, detail: "Clubs in talks" },
  Linked: { score: 0.3, detail: "Early link — no concrete step reported" },
};
function alignmentScore(fee: number | null, value: number) {
  if (fee == null || !value) return 0.55;
  if (fee === 0) return 1.0; // free transfer — nothing to misprice
  const r = fee / value;
  if (r <= 1.2) return 1.0; // at/below the Onside value — very plausible
  if (r <= 1.6) return 0.8;
  if (r <= 2.2) return 0.55;
  if (r <= 3.0) return 0.35;
  return 0.2; // wild overpay vs the model
}
function contractScore(until: number | null) {
  if (until == null) return 0.5;
  const y = until - SEASON_YEAR;
  if (y <= 0) return 1.0;
  if (y === 1) return 0.9;
  if (y === 2) return 0.7;
  if (y === 3) return 0.55;
  return 0.4;
}
function decayScore(firstSeen: Date, now: Date) {
  const days = (now.getTime() - firstSeen.getTime()) / 86_400_000;
  if (days <= 2) return 1.0;
  if (days <= 4) return 0.85;
  if (days <= 7) return 0.7;
  if (days <= 14) return 0.5;
  if (days <= 30) return 0.35;
  return 0.25;
}

function band(pct: number): ConfidenceResult["band"] {
  return pct >= 70 ? "high" : pct >= 40 ? "medium" : "low";
}

export function confidence(input: ConfidenceInput): ConfidenceResult {
  const now = input.now ?? new Date();

  if (input.status === "confirmed") {
    return { pct: 100, band: "high", factors: [{ key: "confirmed", label: "Officially confirmed", score: 1, weight: 1, detail: "Announced by an official source" }] };
  }
  if (input.status === "dead") {
    return { pct: 0, band: "low", factors: [{ key: "dead", label: "Collapsed", score: 0, weight: 1, detail: "Deal is off / player moved elsewhere" }] };
  }

  // Romano "Here We Go" (source_tier 0) is journalist-confirmed — pinned high,
  // distinct from club-official 100, until the official feed upgrades it. (A
  // retracted break is status "dead" above, so it never reaches here.)
  if (input.sourceTier === 0) {
    return {
      pct: 95,
      band: "high",
      factors: [{ key: "here_we_go", label: "Romano: Here We Go", score: 0.95, weight: 1, detail: "Confirmed break by Fabrizio Romano — not yet club-official" }],
    };
  }

  const fee = input.reportedFeeEur;
  const ratio = fee != null && fee > 0 && input.onsideValueEur ? fee / input.onsideValueEur : null;
  const yearsLeft = input.contractUntil != null ? input.contractUntil - SEASON_YEAR : null;
  const stage = STAGE_SCORE[stageOf(input.summary, input.status)] ?? STAGE_SCORE.Linked;

  const factors: ConfidenceFactor[] = [
    { key: "source", label: "Source credibility", score: sourceScore(input.sourceTier), weight: 0.3, detail: TIER_LABEL[Math.min(4, Math.max(1, input.sourceTier))] },
    { key: "convergence", label: "Corroboration", score: convergenceScore(input.corroborations), weight: 0.25, detail: `${input.corroborations} independent source${input.corroborations === 1 ? "" : "s"}` },
    { key: "stage", label: "Deal stage", score: stage.score, weight: 0.2, detail: stage.detail },
    {
      key: "alignment",
      label: "Valuation alignment",
      score: alignmentScore(fee, input.onsideValueEur),
      weight: 0.15,
      detail:
        fee === 0
          ? "Free transfer"
          : ratio == null
            ? "No fee reported"
            : `Fee is ${ratio < 1 ? `${Math.round((1 - ratio) * 100)}% below` : `${Math.round((ratio - 1) * 100)}% above`} the Onside value`,
    },
    { key: "contract", label: "Contract status", score: contractScore(input.contractUntil), weight: 0.05, detail: yearsLeft == null ? "Contract unknown" : yearsLeft <= 0 ? "Out of contract" : `${yearsLeft} year${yearsLeft === 1 ? "" : "s"} left` },
    { key: "freshness", label: "Freshness", score: decayScore(input.firstSeen, now), weight: 0.05, detail: "Decays if uncorroborated" },
  ];

  const pct = Math.round(100 * factors.reduce((s, f) => s + f.score * f.weight, 0));
  return { pct, band: band(pct), factors };
}
