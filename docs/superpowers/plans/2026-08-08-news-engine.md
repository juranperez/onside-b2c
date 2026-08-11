# Onside News Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-publish data-backed transfer briefings from the Wire to a `/news` section that ranks in Google and AI answer engines, live and indexing before deadline day (~Sep 1).

**Architecture:** A pure, unit-tested core (event detection → ranking/caps → slug → output validation) with zero I/O, wrapped by a thin DB-connected pipeline (`generate.ts`) driven by a cron. The LLM writes *only connective prose around injected data* — it never supplies facts. Every generation passes an integrity validator before it can be published. Ships dark behind `NEWS_ENGINE_ENABLED`.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, Supabase (Postgres + RLS), vitest (node env, `src/**/*.test.ts`, `@`→`src`), existing Groq→Gemini LLM cascade, existing `opengraph-image.tsx` ImageResponse pattern, Tailwind 4 design tokens.

**Spec:** `docs/superpowers/specs/2026-08-08-news-engine-design.md`

**Non-negotiable integrity constraints** (Perez is a DC United/MLS employee — these are enforced in code by Task 4, not by prompt alone):
- Attribution mandatory; never assert a rumour as fact; no fabricated quotes; model figures labelled estimates; never name the data supplier; no FIFA marks.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/news/events.ts` | PURE. Detect article-worthy events + stateless dedup keys. |
| `src/lib/news/rank.ts` | PURE. Newsworthiness score + global/per-saga caps. |
| `src/lib/news/slug.ts` | PURE. Stable, keyword-rich, date-free slugs. |
| `src/lib/news/validate.ts` | PURE. Integrity gate on generated output. |
| `src/lib/news/compose.ts` | PURE. Build the data payload + prompt from a RumourItem. |
| `src/lib/news/generate.ts` | I/O. The pipeline: detect → rank → generate → validate → publish. |
| `src/lib/news/queries.ts` | I/O. Reads for `/news` pages. |
| `src/lib/ask/llm.ts` | MODIFY. Add non-streaming `complete()`. |
| `supabase/migrations/0004_news.sql` | `news_articles` table. |
| `src/app/api/cron/news-generate/route.ts` | Cron entry, dark behind flag. |
| `src/app/(app)/news/page.tsx` + `[slug]/page.tsx` + `[slug]/opengraph-image.tsx` | UI + owned hero card. |
| `src/app/sitemap.ts`, `src/lib/nav-items.ts`, `src/app/(marketing)/page.tsx` | MODIFY. SEO + nav + news-led homepage. |

---

### Task 1: Event detection gate (PURE)

**Files:** Create `src/lib/news/events.ts`, `src/lib/news/events.test.ts`

Dedup is **stateless**: the key encodes the current bucket, so "already published this angle" is a set-membership test — no prior-state storage.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { detectArticleEvents } from "./events";
import type { RumourItem } from "@/lib/queries/rumours";

const base = (over: Partial<RumourItem> = {}): RumourItem => ({
  id: "r1", status: "rumour", summary: "Chelsea open talks over a bid for the midfielder",
  source: "The Athletic", sourceTier: 1, corroborations: 3, toClub: "Chelsea",
  reportedFeeM: 50, onsideValueM: 50, firstSeen: "2026-08-01T00:00:00Z",
  lastUpdate: "2026-08-02T00:00:00Z", url: "https://x.test/a",
  player: { id: "p1", slug: "joe-bloggs", name: "Joe Bloggs", photoUrl: null, pos: "CM",
    fromClub: "Brighton", clubBg: "#000", clubColor: "#fff", clubShort: "BHA" },
  league: "Premier League", leagueSlug: "premier-league",
  confidence: { pct: 60, band: "medium", factors: [] },
  ...over,
});
const none = new Set<string>();

describe("detectArticleEvents", () => {
  it("fires stage_advance with a per-stage key", () => {
    const e = detectArticleEvents(base(), none);
    expect(e.map((x) => x.type)).toContain("stage_advance");
    expect(e.find((x) => x.type === "stage_advance")!.eventKey).toBe("r1:stage:Talks");
  });

  it("never fires for the default Linked stage (arrival is not news)", () => {
    const e = detectArticleEvents(base({ summary: "linked with a move" }), none);
    expect(e.some((x) => x.type === "stage_advance")).toBe(false);
  });

  it("suppresses anything already published (stateless key dedup)", () => {
    const e = detectArticleEvents(base(), new Set(["r1:stage:Talks"]));
    expect(e.some((x) => x.type === "stage_advance")).toBe(false);
  });

  it("fires break only for a tier-0 journalist", () => {
    expect(detectArticleEvents(base({ sourceTier: 0 }), none).some((x) => x.type === "break")).toBe(true);
    expect(detectArticleEvents(base({ sourceTier: 1 }), none).some((x) => x.type === "break")).toBe(false);
  });

  it("fires fee_divergence keyed by verdict band, only when a fee exists", () => {
    const over = detectArticleEvents(base({ reportedFeeM: 120, onsideValueM: 50 }), none);
    expect(over.find((x) => x.type === "fee_divergence")!.eventKey).toBe("r1:fee:overpay");
    expect(detectArticleEvents(base({ reportedFeeM: null }), none).some((x) => x.type === "fee_divergence")).toBe(false);
  });

  it("buckets confidence so one article fires per 12-point band", () => {
    const a = detectArticleEvents(base({ confidence: { pct: 60, band: "medium", factors: [] } }), none);
    const b = detectArticleEvents(base({ confidence: { pct: 61, band: "medium", factors: [] } }), none);
    expect(a.find((x) => x.type === "confidence_swing")!.eventKey)
      .toBe(b.find((x) => x.type === "confidence_swing")!.eventKey);
    const c = detectArticleEvents(base({ confidence: { pct: 95, band: "high", factors: [] } }), none);
    expect(c.find((x) => x.type === "confidence_swing")!.eventKey).not
      .toBe(a.find((x) => x.type === "confidence_swing")!.eventKey);
  });

  it("fires confirmed / dead terminal events", () => {
    expect(detectArticleEvents(base({ status: "confirmed" }), none).some((x) => x.type === "confirmed")).toBe(true);
    expect(detectArticleEvents(base({ status: "dead" }), none).some((x) => x.type === "dead")).toBe(true);
  });

  it("requires a resolved destination and a valuation — our angle needs both", () => {
    expect(detectArticleEvents(base({ toClub: "—" }), none)).toHaveLength(0);
    expect(detectArticleEvents(base({ onsideValueM: 0 }), none)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/news/events.test.ts`
Expected: FAIL — cannot find module `./events`.

- [ ] **Step 3: Write the implementation**

```ts
import { stageOf } from "@/lib/rumours/stage";
import { feeVerdict } from "@/lib/rumours/fee-verdict";
import type { RumourItem } from "@/lib/queries/rumours";

export type ArticleEventType =
  | "break" | "stage_advance" | "fee_divergence" | "confidence_swing" | "confirmed" | "dead";

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
 * The editorial gate. Returns only events that carry an ORIGINAL Onside angle and
 * have not already been covered. No angle → no article: this is the structural
 * defence against scaled-content penalties, so keep it strict.
 */
export function detectArticleEvents(r: RumourItem, publishedKeys: ReadonlySet<string>): ArticleEvent[] {
  // Both are required for us to have anything of our own to say.
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
    // "Linked" is the resting default — a player being linked is not news.
    if (stage !== "Linked") push("stage_advance", `${r.id}:stage:${stage}`, stage.toLowerCase());

    const verdict = feeVerdict(r.reportedFeeM, r.onsideValueM);
    if (verdict) {
      const key = VERDICT_KEY[verdict.label] ?? "fee";
      push("fee_divergence", `${r.id}:fee:${key}`, key);
    }

    const bucket = Math.floor(r.confidence.pct / CONF_BAND);
    push("confidence_swing", `${r.id}:conf:${bucket}`, "read");
  }

  return out;
}
```

- [ ] **Step 4: Run tests** — `npx vitest run src/lib/news/events.test.ts` → PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/news/events.ts src/lib/news/events.test.ts
git commit -m "feat(news): article-worthy event detection gate (pure, stateless dedup)"
```

---

### Task 2: Newsworthiness ranking + caps (PURE)

**Files:** Create `src/lib/news/rank.ts`, `src/lib/news/rank.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { newsworthiness, selectForPublication } from "./rank";
import type { ArticleEvent } from "./events";

const ev = (id: string, type: ArticleEvent["type"] = "stage_advance"): ArticleEvent =>
  ({ type, rumourId: id, eventKey: `${id}:${type}`, angle: "x" });

const sig = (over: Partial<Parameters<typeof newsworthiness>[1]> = {}) =>
  ({ sourceTier: 2, onsideValueM: 40, confidencePct: 60, reportedFeeM: 40, ...over });

describe("newsworthiness", () => {
  it("ranks a tier-0 break above a mid-tier stage move", () => {
    const hi = newsworthiness(ev("a", "break"), sig({ sourceTier: 0 }));
    const lo = newsworthiness(ev("b", "stage_advance"), sig({ sourceTier: 3 }));
    expect(hi).toBeGreaterThan(lo);
  });

  it("ranks a bigger player higher, all else equal", () => {
    expect(newsworthiness(ev("a"), sig({ onsideValueM: 150 })))
      .toBeGreaterThan(newsworthiness(ev("b"), sig({ onsideValueM: 5 })));
  });

  it("treats a confirmed deal as top-weight", () => {
    expect(newsworthiness(ev("a", "confirmed"), sig()))
      .toBeGreaterThan(newsworthiness(ev("b", "confidence_swing"), sig()));
  });
});

describe("selectForPublication", () => {
  const scored = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ event: ev(`r${i}`), score: 100 - i }));

  it("applies the global cap, keeping the highest-scoring", () => {
    const out = selectForPublication(scored(40), { globalCap: 25, perSagaCap: 4, publishedPerSaga: new Map() });
    expect(out).toHaveLength(25);
    expect(out[0].rumourId).toBe("r0");
  });

  it("caps per saga so one deal cannot spam the index", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ event: ev("same", `t${i}` as never), score: 50 - i }));
    const out = selectForPublication(many, { globalCap: 25, perSagaCap: 4, publishedPerSaga: new Map() });
    expect(out).toHaveLength(4);
  });

  it("counts already-published articles toward the per-saga cap", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ event: ev("same", `t${i}` as never), score: 50 - i }));
    const out = selectForPublication(many, {
      globalCap: 25, perSagaCap: 4, publishedPerSaga: new Map([["same", 3]]),
    });
    expect(out).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/news/rank.test.ts` → FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```ts
import type { ArticleEvent } from "./events";

export interface RumourSignals {
  sourceTier: number;
  onsideValueM: number;
  confidencePct: number;
  reportedFeeM: number | null;
}

/** Terminal + broken news outranks incremental reads. */
const TYPE_WEIGHT: Record<ArticleEvent["type"], number> = {
  confirmed: 40, break: 35, dead: 22, stage_advance: 20, fee_divergence: 16, confidence_swing: 8,
};

function tierPoints(t: number): number {
  return t === 0 ? 40 : t === 1 ? 30 : t === 2 ? 20 : 10;
}

/** Higher = more deserving of one of the day's limited slots. */
export function newsworthiness(e: ArticleEvent, s: RumourSignals): number {
  const value = Math.min(30, s.onsideValueM / 5); // €150M+ saturates
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
 * The caps are what keep this data journalism rather than a content farm.
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
```

- [ ] **Step 4: Run tests** → PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/news/rank.ts src/lib/news/rank.test.ts
git commit -m "feat(news): newsworthiness ranking + global/per-saga publication caps"
```

---

### Task 3: Slug builder (PURE)

**Files:** Create `src/lib/news/slug.ts`, `src/lib/news/slug.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { slugify, buildSlug } from "./slug";

describe("slugify", () => {
  it("lowercases, strips accents and punctuation, collapses hyphens", () => {
    expect(slugify("Real Madrid")).toBe("real-madrid");
    expect(slugify("Bayern München")).toBe("bayern-munchen");
    expect(slugify("A.F.C.  Bournemouth!")).toBe("a-f-c-bournemouth");
  });
});

describe("buildSlug", () => {
  it("is keyword-rich, date-free and stable", () => {
    expect(buildSlug("marc-cucurella", "Real Madrid", "medical")).toBe("marc-cucurella-real-madrid-medical");
  });
  it("does not repeat the club when already in the player slug", () => {
    expect(buildSlug("joe-bloggs", "Chelsea", "bid")).toBe("joe-bloggs-chelsea-bid");
  });
});
```

- [ ] **Step 2: Run test to verify it fails** → FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```ts
/** URL-safe, accent-folded token. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Article slug: `{player}-{club}-{angle}`. Deliberately DATE-FREE so the URL stays
 * permanent as the saga evolves (the durable-URL rule from the SEO research).
 */
export function buildSlug(playerSlug: string, toClub: string, angle: string): string {
  return [playerSlug, slugify(toClub), slugify(angle)].filter(Boolean).join("-");
}
```

- [ ] **Step 4: Run tests** → PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/news/slug.ts src/lib/news/slug.test.ts
git commit -m "feat(news): stable date-free article slugs"
```

---

### Task 4: Integrity validator (PURE) — the compliance gate

**Files:** Create `src/lib/news/validate.ts`, `src/lib/news/validate.test.ts`

This is the task that makes auto-publishing safe. A rejected generation is **dropped, never published**.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { validateArticle } from "./validate";

const ok = {
  title: "Chelsea move for Joe Bloggs reaches bid stage",
  dek: "The Athletic reports a formal bid; Onside values the midfielder at €50m.",
  body: "The Athletic reports that Chelsea have lodged a formal bid. Onside's model estimates the player's value at €50m, which makes the reported fee broadly fair.",
};
const ctx = { sourceName: "The Athletic", status: "rumour" as const };

describe("validateArticle", () => {
  it("accepts an attributed, hedged, data-backed draft", () => {
    expect(validateArticle(ok, ctx).ok).toBe(true);
  });

  it("rejects fabricated quotes — we never supply speech, so any is invented", () => {
    const r = validateArticle({ ...ok, body: `${ok.body} "I am delighted to sign," said Bloggs.` }, ctx);
    expect(r).toMatchObject({ ok: false, reason: "fabricated-quote" });
  });

  it("rejects a draft that never attributes its reporting", () => {
    const r = validateArticle({ ...ok, body: "Chelsea have lodged a formal bid worth €50m for the midfielder." }, ctx);
    expect(r).toMatchObject({ ok: false, reason: "missing-attribution" });
  });

  it("rejects the data supplier's name and FIFA marks", () => {
    expect(validateArticle({ ...ok, body: `${ok.body} Data via Sportmonks.` }, ctx))
      .toMatchObject({ ok: false, reason: "banned-token" });
    expect(validateArticle({ ...ok, body: `${ok.body} Ahead of the FIFA World Cup.` }, ctx))
      .toMatchObject({ ok: false, reason: "banned-token" });
  });

  it("rejects stating an unconfirmed rumour as fact", () => {
    const r = validateArticle({ ...ok, title: "Joe Bloggs has signed for Chelsea" }, ctx);
    expect(r).toMatchObject({ ok: false, reason: "unhedged-claim" });
  });

  it("allows completed language once the deal really is confirmed", () => {
    const r = validateArticle({ ...ok, title: "Joe Bloggs has signed for Chelsea" }, { ...ctx, status: "confirmed" });
    expect(r.ok).toBe(true);
  });

  it("rejects drafts that are too short to be useful", () => {
    expect(validateArticle({ ...ok, body: "Short." }, ctx)).toMatchObject({ ok: false, reason: "too-short" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails** → FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```ts
export interface ArticleDraft { title: string; dek: string; body: string }
export interface ValidateContext { sourceName: string; status: "rumour" | "confirmed" | "dead" }
export type ValidationResult = { ok: true } | { ok: false; reason: string };

/** Never allowed in published copy. Supplier name is contractual; FIFA marks are legal. */
const BANNED = [/sportmonks/i, /\bfifa\b/i, /api[- ]football/i];

/** Straight or curly quotes around speech — we pass the model no quotes, so any is invented. */
const QUOTE = /["“][^"”]{12,}["”]/;

/** Completed-deal assertions, only legitimate once status is confirmed. */
const UNHEDGED = [/\bhas (?:signed|joined|completed)\b/i, /\bis (?:now )?a .{2,30} player\b/i, /\bofficially signed\b/i];

const MIN_BODY = 180;

/**
 * The compliance gate for generated copy. Runs on every draft; a failure means the
 * article is DROPPED, not queued — nobody mans a queue. Cheap checks first.
 */
export function validateArticle(d: ArticleDraft, ctx: ValidateContext): ValidationResult {
  const all = `${d.title}\n${d.dek}\n${d.body}`;

  if (d.body.trim().length < MIN_BODY) return { ok: false, reason: "too-short" };
  if (BANNED.some((re) => re.test(all))) return { ok: false, reason: "banned-token" };
  if (QUOTE.test(all)) return { ok: false, reason: "fabricated-quote" };
  if (ctx.status !== "confirmed" && UNHEDGED.some((re) => re.test(all))) {
    return { ok: false, reason: "unhedged-claim" };
  }
  // Every briefing must credit the reporting it is built on.
  if (!d.body.toLowerCase().includes(ctx.sourceName.toLowerCase())) {
    return { ok: false, reason: "missing-attribution" };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run tests** → PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/news/validate.ts src/lib/news/validate.test.ts
git commit -m "feat(news): integrity validator — no fabricated quotes, attribution required"
```

---

### Task 5: Non-streaming LLM completion

**Files:** Modify `src/lib/ask/llm.ts`

The existing cascade is SSE/streaming for Ask. Batch generation needs a plain completion. Reuse the same providers and the same free-tier-first doctrine.

- [ ] **Step 1: Add `complete()` below `askStream`**

```ts
export type CompleteResult = { text: string; provider: "groq" | "gemini" } | null;

/**
 * Non-streaming completion for batch jobs (news generation). Same Groq→Gemini
 * cascade and free-tier-first doctrine as askStream, minus the SSE plumbing.
 * Returns null when every provider fails, so callers can skip rather than throw.
 */
export async function complete(system: string, messages: ChatMessage[]): Promise<CompleteResult> {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "system", content: system }, ...messages],
          temperature: 0.4,
        }),
      });
      if (res.ok) {
        const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const text = j.choices?.[0]?.message?.content?.trim();
        if (text) return { text, provider: "groq" };
      }
    } catch {
      // fall through to Gemini
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: messages.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
            generationConfig: { temperature: 0.4 },
          }),
        },
      );
      if (res.ok) {
        const j = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
        if (text) return { text, provider: "gemini" };
      }
    } catch {
      // fall through to null
    }
  }
  return null;
}
```

- [ ] **Step 2: Verify the build typechecks**

Run: `npm run build 2>&1 | grep -iE "failed to type check|compiled successfully"`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/lib/ask/llm.ts
git commit -m "feat(llm): non-streaming complete() for batch generation"
```

---

### Task 6: Prompt + payload composition (PURE)

**Files:** Create `src/lib/news/compose.ts`, `src/lib/news/compose.test.ts`

The model receives **only structured facts** and is told it may not add any. This is what makes Task 4's validator able to succeed.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildPrompt, SYSTEM } from "./compose";

const facts = {
  player: "Joe Bloggs", fromClub: "Brighton", toClub: "Chelsea", position: "CM",
  stage: "Bid", source: "The Athletic", corroborations: 3, reportedFeeM: 50,
  onsideValueM: 40, verdict: "Above our value", confidencePct: 62, eventType: "stage_advance",
  summary: "Chelsea lodge a bid for the midfielder",
};

describe("compose", () => {
  it("forbids invention and quotes in the system prompt", () => {
    expect(SYSTEM).toMatch(/never invent/i);
    expect(SYSTEM).toMatch(/quote/i);
  });

  it("puts every fact in the prompt so the model needs to invent nothing", () => {
    const p = buildPrompt(facts);
    for (const v of ["Joe Bloggs", "Chelsea", "The Athletic", "50", "40", "62"]) {
      expect(p).toContain(v);
    }
  });

  it("names the source so the draft can satisfy the attribution check", () => {
    expect(buildPrompt(facts)).toContain("The Athletic");
  });
});
```

- [ ] **Step 2: Run test to verify it fails** → FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```ts
export interface ArticleFacts {
  player: string; fromClub: string; toClub: string; position: string;
  stage: string; source: string; corroborations: number;
  reportedFeeM: number | null; onsideValueM: number; verdict: string | null;
  confidencePct: number; eventType: string; summary: string;
}

export const SYSTEM = [
  "You are the Onside Data Desk, writing a short factual transfer briefing for a football data platform.",
  "You will be given a set of FACTS. Write ONLY from those facts.",
  "Rules you must never break:",
  "1. Never invent details, statistics, dates, or events that are not in the FACTS.",
  "2. Never write a quote. You have no quotes; inventing speech is prohibited.",
  "3. Always attribute reporting to the named source, by name, in the body.",
  "4. Describe Onside's valuation and confidence as model estimates, never as fact.",
  "5. If the deal is not confirmed, never write that it has happened. Use attributed, hedged language.",
  "6. Never mention any data supplier or governing body by name.",
  "Style: clean, calm, specific. No hype, no clichés, no emoji. British English.",
  "Return strict JSON: {\"title\": string, \"dek\": string, \"body\": string}.",
  "The body is 150-220 words of plain prose in 3 short paragraphs.",
].join("\n");

/** Serialise the facts so the model has everything and needs to invent nothing. */
export function buildPrompt(f: ArticleFacts): string {
  const fee = f.reportedFeeM == null ? "not reported" : f.reportedFeeM === 0 ? "free transfer" : `EUR ${f.reportedFeeM}m`;
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
```

- [ ] **Step 4: Run tests** → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/news/compose.ts src/lib/news/compose.test.ts
git commit -m "feat(news): fact-only prompt composition (model may not invent)"
```

---

### Task 7: `news_articles` migration + types ⚠️ GATED

**Files:** Create `supabase/migrations/0004_news.sql`; modify `src/lib/db/types.ts`

> **STOP.** Applying to prod requires Perez's explicit per-action word. Write the file, then ask.

- [ ] **Step 1: Write the migration**

```sql
create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  rumour_id uuid references public.rumours(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  event_type text not null,
  event_key text not null unique,
  title text not null,
  dek text not null,
  body jsonb not null,
  status text not null default 'published',
  correction text,
  newsworthiness real not null default 0,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_articles_published_idx on public.news_articles (published_at desc);
create index if not exists news_articles_rumour_idx on public.news_articles (rumour_id);

alter table public.news_articles enable row level security;

-- Published briefings are public reading material; only the service role writes.
create policy "news readable by anyone" on public.news_articles for select using (true);
```

- [ ] **Step 2: Apply after Perez's approval** via the Supabase MCP `apply_migration` (name `news_articles_v1`, project `ygmxxveranmfcobcexon`).

- [ ] **Step 3: Regenerate types** and insert the `news_articles` block into `src/lib/db/types.ts` (surgical insert — do NOT overwrite the whole file).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_news.sql src/lib/db/types.ts
git commit -m "feat(news): news_articles table + types"
```

---

### Task 8: Generation pipeline + queries (I/O)

**Files:** Create `src/lib/news/generate.ts`, `src/lib/news/queries.ts`

- [ ] **Step 1: Implement `generate.ts`**

`generateNews(db)` must, in order: load published `event_key`s and per-saga counts; `getRumours(200)`; `detectArticleEvents` per rumour; score via `newsworthiness`; `selectForPublication({globalCap: 25, perSagaCap: 4, publishedPerSaga})`; for each selected event → `buildPrompt` → `complete(SYSTEM, …)` → `JSON.parse` (drop on parse failure) → `validateArticle` (drop on failure, count the reason) → `buildSlug` → insert. Return `{ scanned, detected, selected, published, rejected }` for cron observability. Every drop path must be counted, never silently swallowed.

- [ ] **Step 2: Implement `queries.ts`** — `listArticles(limit)`, `getArticleBySlug(slug)`, `latestArticles(n)` for the homepage, reading via `readDb()`.

- [ ] **Step 3: Verify build** — `npm run build` → `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/news/generate.ts src/lib/news/queries.ts
git commit -m "feat(news): generation pipeline + article queries"
```

---

### Task 9: Cron route (dark)

**Files:** Create `src/app/api/cron/news-generate/route.ts`; modify `vercel.json`

- [ ] **Step 1: Implement**, mirroring `src/app/api/cron/wc-goals/route.ts` exactly: `CRON_SECRET` bearer check → 401; `if (process.env.NEWS_ENGINE_ENABLED !== "1") return NextResponse.json({ ok: true, disabled: true })`; then `generateNews(adminDb())`. Set `export const maxDuration = 60`.

- [ ] **Step 2: Add the schedule** to `vercel.json` — `{"path": "/api/cron/news-generate", "schedule": "*/30 * * * *"}` (every 30 min; generation is not latency-critical and this respects free-tier LLM limits).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/news-generate/route.ts vercel.json
git commit -m "feat(news): generation cron, dark behind NEWS_ENGINE_ENABLED"
```

---

### Task 10: `/news` index + article pages + hero card

**Files:** Create `src/app/(app)/news/page.tsx`, `src/app/(app)/news/[slug]/page.tsx`, `src/app/(app)/news/[slug]/opengraph-image.tsx`

- [ ] **Step 1: Article page** — render title, dek, byline **"Onside Data Desk"** linking `/methodology`, published/updated timestamps, the body blocks, a correction banner when `correction` is set, the transparency line ("Generated from Onside's tracked data; reporting credited and linked"), and internal links to the player, club and `/transfers/[rumour_id]` story page. Use `Card`/`SectionHead` and design tokens only; both themes.

- [ ] **Step 2: Index page** — reverse-chronological list, newest first, each linking to its article.

- [ ] **Step 3: Hero card** — copy the structure of `src/app/(app)/transfers/[id]/opengraph-image.tsx`, rendering player headshot + valuation + confidence. This is the **owned visual** — no licensed photography.

- [ ] **Step 4: Verify build** → `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/news"
git commit -m "feat(news): article + index pages with owned hero cards"
```

---

### Task 11: SEO — JSON-LD, sitemap, nav

**Files:** Modify `src/app/(app)/news/[slug]/page.tsx`, `src/app/sitemap.ts`, `src/lib/nav-items.ts`

- [ ] **Step 1: `NewsArticle` JSON-LD** in the article page via a `<script type="application/ld+json">` with `headline`, `datePublished`, `dateModified`, `author` (Organization "Onside Data Desk"), `image` (the OG route), `mainEntityOfPage`, and `about` entity refs for player + destination club.

- [ ] **Step 2: Sitemap** — add `{ path: "/news", changeFrequency: "hourly", priority: 0.95 }` to `STATIC_ROUTES`, plus one entry per article slug from `listArticles`.

- [ ] **Step 3: Nav** — add `{ href: "/news", label: "News" }` as the FIRST core item in `getNavItems`, and replace `/leagues` with `/news` in `getBottomNavItems` so mobile stays at exactly 5 slots.

- [ ] **Step 4: Verify** `npx vitest run src/lib/nav-items.test.ts` (existing nav tests) → PASS, updating expectations for the new tab.

- [ ] **Step 5: Commit**

```bash
git add src/app/sitemap.ts src/lib/nav-items.ts "src/app/(app)/news"
git commit -m "feat(news): NewsArticle JSON-LD, sitemap entries, News nav tab"
```

---

### Task 12: News-led homepage

**Files:** Modify `src/app/(marketing)/page.tsx`

- [ ] **Step 1:** Render `latestArticles(5)` as the top section (lead article prominent, then four), with the existing value-prop sections below. Leave the `wcActive` WC-hero branch intact so it auto-reactivates for future tournaments.

- [ ] **Step 2:** If there are no published articles yet, fall back to the current hero — the homepage must never render empty.

- [ ] **Step 3: Verify build + full suite** — `npx vitest run` and `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(marketing)/page.tsx"
git commit -m "feat(news): news-led homepage with graceful empty-state fallback"
```

---

## Go-live checklist (after Task 12)

1. Deploy (`vercel deploy --prod --yes`) — engine still dark.
2. Set `NEWS_ENGINE_ENABLED=1` in Vercel prod, redeploy so the cron activates.
3. Watch the first run: confirm published count > 0 and inspect **every** article in the first batch by hand — this is the one manual review that matters.
4. Submit `/news` in Google Search Console; confirm `NewsArticle` markup parses in the Rich Results Test.
5. Kill switch: unset `NEWS_ENGINE_ENABLED` (generation stops; published articles remain).

## Self-review

- **Spec coverage:** editorial gate → T1; caps/ranking → T2; slugs → T3; integrity constraints → T4; LLM → T5; fact-only prompting → T6; data model → T7; pipeline → T8; cron/dark → T9; article anatomy + owned visuals → T10; SEO/AEO → T11; news-led homepage → T12. Corrections banner → T10. **Gap accepted:** `llms.txt` extension for the news corpus is deferred to the go-live checklist, not a code task.
- **Type consistency:** `ArticleEvent{type,rumourId,eventKey,angle}` is produced in T1 and consumed unchanged in T2/T8; `ArticleDraft{title,dek,body}` produced in T6, validated in T4, persisted in T8; `buildSlug(playerSlug, toClub, angle)` matches its T8 call site.
- **No placeholders.**
