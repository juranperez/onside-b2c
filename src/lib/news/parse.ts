import type { ArticleDraft } from "./validate";

/**
 * Escape raw control characters that appear INSIDE JSON string literals.
 *
 * Models routinely emit real newlines between paragraphs inside a JSON string,
 * which is invalid JSON and makes JSON.parse throw. Repairing is far better than
 * discarding an otherwise-good briefing, and it is deterministic: we only touch
 * characters while inside an unescaped string.
 */
export function repairJsonControlChars(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of input) {
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString && (ch === "\n" || ch === "\r")) {
      out += "\\n";
      continue;
    }
    if (inString && ch === "\t") {
      out += "\\t";
      continue;
    }
    out += ch;
  }
  return out;
}

/** Pull the article object out of a model response that may be fenced or padded. */
export function parseDraft(text: string): ArticleDraft | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  for (const candidate of [slice, repairJsonControlChars(slice)]) {
    try {
      const o = JSON.parse(candidate) as Partial<ArticleDraft>;
      if (typeof o.title !== "string" || typeof o.dek !== "string" || typeof o.body !== "string") continue;
      return { title: o.title.trim(), dek: o.dek.trim(), body: o.body.trim() };
    } catch {
      // try the repaired form next
    }
  }
  return null;
}
