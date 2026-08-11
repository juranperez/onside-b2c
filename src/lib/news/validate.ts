export interface ArticleDraft {
  title: string;
  dek: string;
  body: string;
}

export interface ValidateContext {
  sourceName: string;
  status: "rumour" | "confirmed" | "dead";
  /** Reported fee in millions; null when undisclosed. Guards the free-transfer claim. */
  reportedFeeM?: number | null;
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

/** Never allowed in published copy. Supplier name is contractual; FIFA marks are legal. */
const BANNED = [/sportmonks/i, /\bfifa\b/i, /api[-\s]?football/i];

/** Quoted speech. We pass the model no quotes, so any quotation is invented. */
const QUOTE = /["“][^"”]{12,}["”]/;

/**
 * Angle brackets never belong in plain prose, and model output is untrusted text
 * that later lands in JSON-LD inside a <script> block. Rejecting them at the trust
 * boundary means nothing downstream has to escape — the unsafe string never
 * reaches the database at all.
 */
const MARKUP = /[<>]/;

/**
 * Completed-deal assertions — only legitimate once the status really is confirmed.
 * Bare present-tense verbs ("joins", "signs for") matter as much as the perfect
 * forms: headlines overwhelmingly use them, and "Araujo joins Liverpool" states an
 * unconfirmed rumour as fact just as strongly as "has joined".
 */
const UNHEDGED = [
  /\b(?:has|have) (?:signed|joined|completed|sealed)\b/i,
  /\b(?:joins|signs|seals|completes)\b/i,
  /\bis (?:now )?an? [\w\s]{2,30} player\b/i,
  /\bofficially (?:signed|announced|completed)\b/i,
];

/**
 * "Free transfer" is a specific factual claim. An undisclosed fee is NOT a free
 * transfer, and the model conflated the two — so the phrase is only allowed when
 * the reported fee is actually zero.
 */
const FREE_CLAIM = /\bfree (?:transfer|agent)\b|\bon a free\b/i;

const MIN_BODY = 180;

/**
 * The compliance gate for generated copy.
 *
 * Runs on every draft; a failure means the article is DROPPED, not queued — no
 * one mans a queue, so "hold for review" would just mean "never published".
 * These rules are non-negotiable: the founder is employed in professional
 * football, so an unattributed or fabricated claim is a real-world liability.
 */
export function validateArticle(d: ArticleDraft, ctx: ValidateContext): ValidationResult {
  const all = `${d.title}\n${d.dek}\n${d.body}`;

  if (d.body.trim().length < MIN_BODY) return { ok: false, reason: "too-short" };
  if (MARKUP.test(all)) return { ok: false, reason: "markup" };
  if (BANNED.some((re) => re.test(all))) return { ok: false, reason: "banned-token" };
  if (QUOTE.test(all)) return { ok: false, reason: "fabricated-quote" };
  if (ctx.status !== "confirmed" && UNHEDGED.some((re) => re.test(all))) {
    return { ok: false, reason: "unhedged-claim" };
  }
  if (ctx.reportedFeeM !== 0 && FREE_CLAIM.test(all)) {
    return { ok: false, reason: "false-free-transfer" };
  }
  // Every briefing must credit the reporting it is built on.
  if (!d.body.toLowerCase().includes(ctx.sourceName.toLowerCase())) {
    return { ok: false, reason: "missing-attribution" };
  }
  return { ok: true };
}
