/**
 * Pure question-analysis helpers for Ask Onside: pull candidate entity names
 * out of a free-text question (for name_norm lookups) and classify intent so
 * the context builder knows which datasets to attach.
 */

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "any", "all", "some", "few", "lot", "lots", "every", "each", "both", "other", "others",
  "believing", "believe", "worth", "really", "actually", "going", "happening",
  "who", "what", "when", "where", "why", "how", "which", "whose",
  "do", "does", "did", "can", "could", "should", "would", "will", "shall",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "them", "my", "your", "his", "their", "our",
  "and", "or", "but", "not", "no", "vs", "versus", "v",
  "in", "on", "at", "to", "for", "of", "from", "with", "about", "than", "as", "by", "into",
  "much", "many", "more", "most", "less", "least", "worth", "value", "valued", "valuation", "cost", "price",
  "player", "players", "club", "clubs", "team", "teams", "league", "leagues", "football", "soccer",
  "match", "game", "fixture", "tonight", "today", "tomorrow", "now", "right", "currently", "this", "that", "these", "those",
  "world", "cup", "worldcup", "group", "win", "wins", "winning", "beat", "score", "scored",
  "tell", "show", "give", "compare", "between", "best", "top", "good", "better",
  "transfer", "transfers", "rumour", "rumours", "rumor", "rumors", "news", "move", "moving", "signing", "sign",
  "expensive", "valuable", "undervalued", "overvalued", "rated", "young", "old", "u21", "xg",
]);

/** Same folding the DB's name_norm columns use: strip accents, lowercase, escape LIKE wildcards. */
export function foldTerm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/gi, "o")
    .replace(/ł/gi, "l")
    .replace(/đ/gi, "d")
    .replace(/æ/gi, "ae")
    .replace(/œ/gi, "oe")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * Candidate name fragments for entity lookup: content words plus adjacent
 * bigrams ("erling haaland"), folded for name_norm matching. Capped to keep
 * the OR-filter cheap.
 */
export function extractShingles(question: string, cap = 8): string[] {
  const words = question
    .replace(/[?!.,;:()"'’]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w.toLowerCase()));

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const f = foldTerm(s);
    if (f.length >= 3 && !seen.has(f)) {
      seen.add(f);
      out.push(f);
    }
  };

  for (let i = 0; i < words.length - 1; i++) push(`${words[i]} ${words[i + 1]}`); // bigrams first — most specific
  // Single words need length ≥ 4: a 3-char fragment like "any" substring-matches
  // half the database (Jovany, Tidjany, Alanyaspor…).
  for (const w of words) if (w.length >= 4) push(w);
  return out.slice(0, cap);
}

export interface AskIntent {
  worldCup: boolean; // fixtures, forecasts, groups
  market: boolean;   // most valuable / rankings
  movers: boolean;   // risers and fallers
  rumours: boolean;  // transfer talk
  compare: boolean;  // X vs Y
}

export function classifyIntent(question: string): AskIntent {
  const q = question.toLowerCase();
  return {
    worldCup: /world ?cup|fixture|tonight|today|tomorrow|kick.?off|group [a-l]\b|bracket|knockout|qualif|match|game|play(s|ing)? (against|tonight|today)|forecast|win probability|who wins/.test(q),
    market: /most valuable|most expensive|top \d|highest|biggest value|ranking|best (player|xi)|undervalued|overvalued|bargain|wonderkid|u21|under.?21/.test(q),
    movers: /riser|faller|mover|trending|climbing|dropping|gained|lost value|up this week|down this week/.test(q),
    rumours: /rumou?r|transfer|signing|sign|move to|linked|bid|fee|deal|joining|leaving/.test(q),
    compare: /\bvs\.?\b|versus|compare|or\b.*\?|better than/.test(q),
  };
}
