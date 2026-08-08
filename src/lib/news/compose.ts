export interface ArticleFacts {
  player: string;
  fromClub: string;
  toClub: string;
  position: string;
  stage: string;
  source: string;
  corroborations: number;
  reportedFeeM: number | null;
  onsideValueM: number;
  verdict: string | null;
  confidencePct: number;
  eventType: string;
  summary: string;
}

/**
 * The model writes ONLY the connective prose around facts we inject. It supplies
 * no information of its own — that is what makes the output validator (validate.ts)
 * able to succeed rather than merely hope.
 */
export const SYSTEM = [
  "You are the Onside Data Desk, writing a short factual transfer briefing for a football data platform.",
  "You will be given a set of FACTS. Write ONLY from those facts.",
  "Rules you must never break:",
  "1. Never invent details, statistics, dates, or events that are not in the FACTS.",
  "2. Never write a quote. You have no quotes; inventing speech is prohibited.",
  "3. Always attribute the reporting to the named source, by name, in the body.",
  "4. Describe Onside's valuation and confidence as model estimates, never as fact.",
  "5. If the deal is not confirmed, never write that it has happened. Use attributed, hedged language.",
  "6. Never mention any data supplier or governing body by name.",
  "Style: clean, calm, specific. No hype, no cliches, no emoji. British English.",
  'Return strict JSON only: {"title": string, "dek": string, "body": string}.',
  "The body is 150-220 words of plain prose in 3 short paragraphs.",
].join("\n");

/** Serialise the facts so the model has everything and needs to invent nothing. */
export function buildPrompt(f: ArticleFacts): string {
  const fee =
    f.reportedFeeM == null ? "not reported" : f.reportedFeeM === 0 ? "free transfer" : `EUR ${f.reportedFeeM}m`;
  return [
    "FACTS",
    `Player: ${f.player} (${f.position})`,
    `Move: ${f.fromClub} to ${f.toClub}`,
    `Deal stage: ${f.stage}`,
    `Reporting source: ${f.source} (${f.corroborations} independent reports tracked)`,
    `What was reported: ${f.summary}`,
    `Reported fee: ${fee}`,
    `Onside model valuation: EUR ${f.onsideValueM}m`,
    `Onside fee-vs-value read: ${f.verdict ?? "no fee to compare yet"}`,
    `Onside Confidence: ${f.confidencePct}%`,
    `Why this is being published now: ${f.eventType}`,
    "",
    "Write the briefing as strict JSON.",
  ].join("\n");
}
