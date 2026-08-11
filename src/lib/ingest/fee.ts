/**
 * Reported-fee extraction from free-text reporting.
 *
 * Shared by every ingest path. The Romano break lane previously stored no fee at
 * all, which silently stripped the fee-vs-value verdict — our core differentiator —
 * from every tier-0 story.
 */

/**
 * Non-euro fees are converted, not taken at face value. Treating "£40m" as €40m
 * understated real fees by roughly a sixth and could flip a fee-vs-value verdict
 * from "overpay" to "fair". Rates are deliberately coarse: reported fees are
 * themselves approximations, so a stale-by-a-few-percent rate is far better than
 * a currency error. Revisit if a live FX source is ever wired in.
 */
const TO_EUR: Record<string, number> = { "€": 1, "£": 1.17, $: 0.92 };

const SYMBOL_FEE = /([€£$])\s?(\d+(?:[.,]\d+)?)\s*(m|million|bn|billion)\b/i;
const WORD_FEE = /\b(\d+(?:[.,]\d+)?)\s*(m|million|bn|billion)\s*(?:euros?|eur|pounds?|gbp|dollars?|usd)\b/i;
const CODE_FEE = /\b(eur|gbp|usd)\s?(\d+(?:[.,]\d+)?)\s*(m|million|bn|billion)\b/i;

const CODE_TO_SYMBOL: Record<string, string> = { eur: "€", gbp: "£", usd: "$" };
const WORD_TO_SYMBOL: Record<string, string> = {
  euro: "€", euros: "€", eur: "€",
  pound: "£", pounds: "£", gbp: "£",
  dollar: "$", dollars: "$", usd: "$",
};

function toEur(amount: number, unit: string, symbol: string): number {
  const magnitude = /^b/i.test(unit) ? 1e9 : 1e6;
  return Math.round(amount * magnitude * (TO_EUR[symbol] ?? 1));
}

/**
 * First monetary figure in the text, in EUR. First-match is intentional: reporting
 * leads with the fixed fee ("€30m plus €6m add-ons", "€4m loan with €11m option"),
 * so the opening figure is the headline fee rather than the total or the option.
 * Returns null when no fee is reported — never a guess.
 */
export function extractFeeEur(text: string): number | null {
  const symbolMatch = text.match(SYMBOL_FEE);
  if (symbolMatch) {
    return toEur(parseFloat(symbolMatch[2].replace(",", ".")), symbolMatch[3], symbolMatch[1]);
  }
  const codeMatch = text.match(CODE_FEE);
  if (codeMatch) {
    const symbol = CODE_TO_SYMBOL[codeMatch[1].toLowerCase()] ?? "€";
    return toEur(parseFloat(codeMatch[2].replace(",", ".")), codeMatch[3], symbol);
  }
  const wordMatch = text.match(WORD_FEE);
  if (wordMatch) {
    const currency = wordMatch[0].toLowerCase().match(/euros?|eur|pounds?|gbp|dollars?|usd/)?.[0] ?? "euro";
    return toEur(parseFloat(wordMatch[1].replace(",", ".")), wordMatch[2], WORD_TO_SYMBOL[currency] ?? "€");
  }
  return null;
}

/** Fee 0 = free transfer (display "Free"); null = no fee reported yet. */
export function isFreeTransfer(text: string): boolean {
  return /\bfree transfer\b|\bon a free\b|\bfree agent\b/i.test(text);
}
