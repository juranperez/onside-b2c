# Onside News — automated data-backed transfer briefings (design)

**Date:** 2026-08-08
**Status:** Design APPROVED by Perez (4 decisions locked below). Ready for implementation plan.
**Repo:** `~/onside-b2c`
**Forcing function:** Summer window is open; **deadline day ~Sep 1 (~3.5 weeks)** — the biggest traffic spike in football media. Google needs lead time to crawl and rank, so the engine must be live and indexing well before then.

## Goal

A `/news` section that automatically publishes **data-backed transfer briefings** off the live Wire, ranks in Google + AI answer engines on transfer keywords, and becomes the site's front door. The strategic target is Transfermarkt's SEO moat (~19.7M visits/mo) and the closest direct rival, RisingTransfers (~15k SEO pages).

## The four locked decisions (Perez, 2026-08-08)

1. **Data-gated publishing** — an article is generated ONLY when Onside has an original number to add. Never a rewrite of someone else's rumour.
2. **Owned visuals v1** — hero = player headshot + auto-rendered Onside data card. No licensed action photography (revisit when Pro revenue lands; licensing brief to be prepared separately).
3. **News-led homepage immediately** — latest briefings front and centre on `/`, value prop below.
4. **News engine first, journalist lanes after** — SEO lead time beats breaking-coverage breadth.

## The core rule (this is the whole design)

**Google's March 2026 enforcement** hit sites mass-publishing AI articles with no editorial oversight: 50–80% traffic drops, 3–6 months to recover. The documented penalty profile is "many pages primarily to manipulate rankings, with little or no value added." An article-per-rumour rewrite IS that profile.

**Our defence is structural, not cosmetic:** every article carries Onside's proprietary valuation, confidence %, fee-vs-value verdict and journey timeline — information that exists nowhere else. That is not scaled content; it is data journalism. The gate below is what enforces it.

> **No original angle → no article.** Publishing is triggered by *events with our data attached*, never by the arrival of a headline.

## The editorial gate — article-worthy events

An article is generated when a saga crosses one of these thresholds:

| Event | Trigger | The angle (what only we can say) |
|---|---|---|
| `break` | tier-0 journalist opens a new saga | "It's been broken — here's what our model says it's worth." |
| `stage_advance` | stage moves (Linked→Talks→Bid→Agreed→Medical→Done) | "The deal moved. What changed, and what it costs." |
| `fee_divergence` | reported fee crosses a verdict band (fair/above/overpay) **or** moves ≥20% | "Is €Xm too much? Our valuation says…" |
| `confidence_swing` | Onside Confidence moves ≥12 points | "Why we've raised/cut our read on this deal." |
| `confirmed` | saga confirmed | The verdict piece: "We called it at X%. Final fee vs our value." |
| `dead` | saga retracted/collapsed | "Why it fell apart" + what our confidence said. |

**Dedup:** unique on `(rumour_id, event_type, event_bucket)` — a given stage only ever yields one article; a re-report of the same stage yields nothing. A saga legitimately accumulates several articles across its life (that's the saga arc, and it's good).

**Editorial standards enforced in code (this is what separates us from a content farm):**
- **Global cap** — max ~25 articles/day. At peak we publish the *best* 20, not everything.
- **Per-saga cap** — max ~4 lifetime, so no single deal spams the index.
- **Priority ranking** — `newsworthiness = source tier + player value + confidence + fee size`. Ties broken by recency.
- Below-threshold events silently **drop** (they are not queued for a human — nobody mans a queue).

## Article anatomy

Slug: `{player-slug}-{to-club-slug}-{angle}` (stable, keyword-rich, date-free) e.g. `marc-cucurella-real-madrid-medical`.

Body blocks — **data injected, LLM writes only the connective prose**:
1. **The report** — what was said, *who* said it, linked out. (Summarised + attributed; never copied.)
2. **The Onside read** — our valuation + fee-vs-value verdict. *Proprietary.*
3. **Why we rate it X%** — the confidence factors. *Proprietary.*
4. **The journey** — the source trail so far. *Proprietary aggregation.*
5. **What it means** — buying-club squad-value context.

Hero: rendered card (player headshot + valuation + confidence), reusing the existing `opengraph-image.tsx` pattern. Byline: **"Onside Data Desk"** linking to `/methodology`, plus a transparency line that the briefing is generated from tracked data with reporting credited and linked.

## Integrity constraints (non-negotiable — Perez is a DC United/MLS employee)

- **Attribution mandatory.** Every factual claim traces to a linked source. Summarise and link; never reproduce another outlet's text.
- **Never assert a rumour as fact.** Hedged, attributed language enforced in the prompt and validated post-generation.
- **No fabricated quotes or details, ever.** The model receives only structured data and may not invent beyond it. Generation is rejected if it emits a quotation mark around speech not present in the input.
- **Model figures always labelled estimates**, never presented as market fact.
- **Corrections in place.** If a saga dies after we published, the article gets a visible update banner — never a silent delete.
- **Existing bans hold:** never name the data supplier ("Onside data engine"), no FIFA marks.

## Data model

`news_articles` — `id · slug (unique) · rumour_id · player_id · event_type · event_key (unique, dedup) · title · dek · body (jsonb blocks) · status (published|updated|corrected) · newsworthiness · published_at · updated_at`.
Migration required → **needs Perez's per-action word** (prod DB).

## Pipeline

Cron (`/api/cron/news-generate`, dark behind `NEWS_ENGINE_ENABLED`):
1. **Detect** — diff the Wire against `news_articles` for un-published article-worthy events (pure, unit-tested).
2. **Rank + cap** — newsworthiness sort, apply global/per-saga caps.
3. **Generate** — pass structured data to the Groq→Gemini cascade (needs a new non-streaming `complete()` helper; existing `llm.ts` is SSE/streaming for Ask).
4. **Validate** — reject on fabricated quotes, missing attribution, banned tokens (supplier name, FIFA marks), or length/shape failures. A rejected generation is dropped, not published.
5. **Publish** — insert + revalidate.

## SEO / AEO layer

- **`NewsArticle` JSON-LD** per article (headline, datePublished, dateModified, author, image, `about`/`mentions` entity refs to player + clubs).
- **Sitemap**: `/news` (hourly, 0.95) + every article.
- **Internal linking cluster** — article ⇄ player page ⇄ club page ⇄ rumour story page. This is the topical-authority play that compounds.
- **AEO** — extend the existing `llms.txt` / `llms-full.txt` to describe the news corpus; clean factual structure so answer engines can cite us.

## Homepage

`/` becomes news-led: latest briefings front and centre, value prop below. The WC hero stays in code (dormant via `isWcWindow`, auto-reactivates for future tournaments).

## Phase 2 — journalist lanes (after the engine ships)

- **Rename "Here We Go".** It appears *unregistered* by Romano (no UK IPO mark), so legal risk is low — but it's his signature and cannot brand a multi-journalist lane. **Replace the tier-0 badge with the journalist's surname: `⚡ ROMANO`, `⚡ ORNSTEIN`** (factual, scales to any tier-0 name, borrows credibility by attribution rather than appropriation). Generic `TIER 1` fallback.
- **Generalise `sourceTier === 0`** from hardcoded-Romano into a tier-0 journalist registry.
- **Add David Ornstein.** Sourcing must be established first (he posts via X / The Athletic; the Romano lane uses a Bluesky X-mirror — an equivalent must be found and verified before build).
- **"Just in from {Journalist}"** sub-sections in `/news`.

## Scope

- **IN (v1):** `/news` index + article pages, the detection gate, generation + validation pipeline, owned hero cards, NewsArticle JSON-LD + sitemap + internal linking, news-led homepage, the migration.
- **OUT (later):** journalist lanes + rename (Phase 2), licensed action photography, human review queue, per-journalist sub-sections, newsletter syndication.

## Open questions for the plan

1. **Body storage** — structured `jsonb` blocks (renderer-controlled, safest) vs markdown. Leaning jsonb: it keeps layout ours and prevents the model emitting arbitrary HTML.
2. **Regeneration on correction** — when a saga dies, do we regenerate the body or append a banner? Leaning banner (cheaper, and preserves the published record — the corrections-transparency pattern).
3. **Cap tuning** — 25/day global and 4/saga are opening estimates; revisit against real window volume.
4. **Groq rate limits** at peak burst — may need queueing or Gemini-first for batch generation.
