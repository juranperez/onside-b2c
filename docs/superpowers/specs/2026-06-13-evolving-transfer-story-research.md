# Evolving transfer-story page — research & rationale (companion to the MVP design)

**Date:** 2026-06-13
**Status:** Research backing + strategic take for the MVP design. Produced from three parallel research fronts (scrollytelling craft & pitfalls; transfer-content competitive landscape; living-content / re-engagement / dual-register) plus synthesis. This is the **"why"** behind the design doc — read alongside it. Repo `~/onside-b2c`.
**Companion to:** `2026-06-13-evolving-transfer-story-mvp-design.md`
**Source vision:** `[[onside-interactive-content-strategy]]` (memory).

---

## 0. Bottom line (the take)

The idea is right — but **"WSJ Trillions Game" is the wrong *spec* for it.** The evolving per-deal page is a validated, strong product. The scrollytelling-masterpiece framing is a seductive trap that, taken literally, is the most expensive way to *hurt* the product. The locked MVP (data-driven evolving page, no AI v1) is the correct read; this research doesn't just support it — it sharpens the guardrails.

The single most useful move is to see that "the idea" is really **four bets** with very different risk/reward:

| Bet | Verdict | Why |
|---|---|---|
| Evolving page on one permanent URL | 🟢 Slam dunk | Validated format; the rumour lifecycle *is* the narrative spine, for free |
| Re-engagement loop (follow → ping on stage change) | 🟢 Slam dunk, half-built | Strongest proven retention mechanic in football apps; push infra already shipped |
| Dual-register (expert + mainstream) | 🟡 Good, but a *discipline* | Works only via progressive disclosure; easy to do badly |
| WSJ-grade scrollytelling per deal | 🔴 The trap | Bespoke-team-weeks; doesn't template; measurably hurts comprehension; dies on mobile |

Build is driven by bets 1–3. Bet 4 is mood-board — applied surgically and late, never as the thesis.

---

## 1. Keystone finding — "Living Stories" already proved this, and the one time it failed doesn't apply to Onside

In 2009, **Google + NYT + Washington Post** shipped **"Living Stories"** (Dec 2009 – Feb 2010) — *almost exactly this concept*: one permanent URL per ongoing story, a timeline, evolving summaries, and a feature that **highlighted "what you've already read" so returning readers saw only what was new since last visit.** **75% of surveyed users preferred it to traditional articles.** It was killed in ~10 weeks — but purely on business model: it kept readers on Google instead of driving traffic to the publishers' ad pages, so there was no ROI *for the publishers*. ([Wikipedia: Living Stories](https://en.wikipedia.org/wiki/Living_Stories), [historyofinformation](https://www.historyofinformation.com/detail.php?id=2399))

**Why this is the green light:** the format was *loved*; it died of a disease — ad-economics cannibalization — that Onside structurally does not have, because **Onside owns the destination.** The best precedent for this idea is a product users preferred that failed for a reason that can't touch us. Format pull is also real: NYT "Snow Fall" did **3.5M views in week one** ([Information is Beautiful](https://www.informationisbeautifulawards.com/news/118-the-nyt-s-best-data-visualizations-of-the-year)).

---

## 2. Front 1 — scrollytelling craft & pitfalls

**The WSJ reference, honestly:** "Trillions Game" is hard-paywalled and published the same week the SpaceX-IPO event happened (June 11–12, 2026), so **no "how it was made" teardown exists yet.** "Perfect ratio of interaction to words" is a taste-claim about one fresh, un-reverse-engineered artifact — useful as inspiration, not as a documented template. The reusable technique class (anchor on one number, reveal in stages, one sentence per step) is the genre staple (cf. [NBC "Visualizing a trillion"](https://www.nbcnews.com/data-graphics/visualizing-trillion-charts-graphics-musk-nears-trillionaire-status-rcna349018), same week).

**The canon & its recurring techniques:** NYT "Snow Fall" (2012) created the grammar — sticky/parallax media triggered by scroll — and also coined "Snow Fall fatigue" ([Fast Company](https://www.fastcompany.com/3020689/the-new-york-times-fights-snow-fall-fatigue-with-more-snow-falls-and-it)). The Pudding is the data-scrollytelling reference shop and author of **Scrollama.js**, the dominant library: sticky-graphic + scroll-driven **steppers** on IntersectionObserver, built specifically to reduce jank ([Pudding](https://pudding.cool/process/introducing-scrollama/)). Recurring set everywhere: sticky graphic + scroll steps, progressive reveal, one chart that morphs/annotates as you scroll.

**The brutal part (design around these):**
- **Scrolljacking is hated, with data.** NN/g testing: most participants were "at least mildly disoriented"; task-oriented users "severely agitated and just move on"; worst case = animated text + altered scroll rate. They advise **avoiding scrolljacking on mobile entirely** — and mobile (~390px) is Onside's untouched gap. ([NN/g](https://www.nngroup.com/articles/scrolljacking-101/)) Kosara: a plain **stepper beats scroll** for discrete steps ([eagereyes](https://eagereyes.org/blog/2016/the-scrollytelling-scourge)).
- **Comprehension evidence is unflattering.** Interactive articles take readers **~30% longer** to absorb the same info; a 181-study review found animation/interactivity show **no strong evidence** of beating static graphics ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11491620/)). Interactivity is a cost in reader effort that must *buy something back*.
- **Production cost is the killer.** Canon pieces take "months… a team of software engineers, designers, data journalists, and writers," and are **explicitly not for breaking news** ([Shorthand](https://shorthand.com/the-craft/an-introduction-to-scrollytelling/index.html)). Transfer rumours *are* breaking news. Bespoke-per-deal is economically impossible at Wire scale.
- **Templating at scale exists only for the *mechanics*.** Flourish/Shorthand generate scroll stories from template+data, no code; academic ScrollyVis ([arXiv 2207.03616](https://arxiv.org/pdf/2207.03616)) goes further. **Limit:** all template the *visual mechanics* — none auto-generate the *editorial narrative* well. Templated viz reads fine; templated *prose* reads dead.

**"Right ratio of interaction to words":** practitioner + research consensus is conservative — the best pieces are **mostly words + static charts with a few high-impact interactive beats.** Interaction is progressive enhancement; the story must fully make sense with animations disabled.

---

## 3. Front 2 — competitive landscape & white space

**The market splits into four layers, each with a clear gap:**
- **The breaker:** Fabrizio Romano (~100M+ followers; owns "Here We Go"). Ephemeral social stream — no data, no per-deal persistence. ([Tribuna](https://tribuna.com/en/blogs/here-we-go-or-pr-for-hire-how-fabrizio-romano-turned-the-tra/))
- **Credibility:** David Ornstein / **The Athletic** — verified, context-rich, but it's a written article, not a live data object. (~6M subs, profitable post-NYT — [Press Gazette](https://pressgazette.co.uk/media_business/new-york-times-owned-the-athletic-reports-quarterly-profit-for-first-time/))
- **Data/database:** **Transfermarkt** (~19.7M visits/mo; a "Rumour Mill" that tracks a rumour to resolution) — but values are **crowdsourced**, the UI is a dense expert table, no narrative, no mainstream on-ramp. ([Similarweb](https://www.similarweb.com/website/transfermarkt.com/))
- **Broadcast:** Sky Transfer Centre (rolling live feed, no persistence); BBC gossip (aggregated list).
- **Specialists feeding everyone:** Opta/The Analyst (1M+/mo; the data-*explainer* benchmark) and Ben Dinnery (injuries) — inputs, not transfer-narrative owners.

**Has anyone built a per-deal living page through the lifecycle?** Partially, crudely — nobody well. Transfermarkt tracks rumours as data-table entries; The Athletic does *window-level* live blogs, not *deal-level* persistent pages. The most architecturally similar product is **[Rising Transfers](https://risingtransfers.com/en/transfers)** — AI-native, a per-rumour "buzz score" (social engagement, decayed) on a Sportmonks feed — but it's a **ranked feed, not an evolving story**, with no lifecycle stages and no proprietary valuation.

**The white space is real but it's a FORMAT moat, not a DATA moat.** The intersection — (a) proprietary valuation/confidence + (b) evolving interactive story + (c) mainstream-accessible, **per deal** — appears unoccupied. But every *component* exists and is well-executed elsewhere; the novelty is purely **synthesis + the per-deal evolving-object format.** That's copyable. It's defensible only if the valuation/confidence engine is genuinely better than the crowd **and** execution is excellent. **Threats:** Rising Transfers is one product decision from this lane; The Athletic + Opta could leapfrog on trust.

**Audience:** top ~20% of fans drive ~2/3 of consumption, but the casual ~80% is the growth pool (EPL avid fandom +35%, L.E.K. 2025; 53% of women's-football fandoms <4yrs old). **Proof of the niche→mainstream path:** Opta/The Analyst and The Athletic both crossed over by **explaining, not by adding more data.** Monetization: subscription is validated (Athletic ~70% of revenue from subs); transfer windows are the twice-a-year acquisition spike; push is the retention engine (OneFootball: 90% push-on, **50–60 returns/month**, transfer alerts per followed player — [Airship](https://www.airship.com/blog/onefootball-puts-users-in-control/)).

---

## 4. Front 3 — living content + re-engagement + dual-register

**Living/evolving content (SEO + integrity).** Publishers converged on **one durable, date-free URL that updates in place** (preserves link equity; Google favors fresh pages). For live coverage, the mechanism is **`LiveBlogPosting` JSON-LD** (`coverageStartTime`/`coverageEndTime` + timestamped `liveBlogUpdate` entries) — what surfaces Guardian/NYT/CNN in **Top Stories**. Ranking benefit needs **"paired updates"**: when content changes, refresh headline/meta/featured-image + structured-data timestamp ([SEO for Journalism](https://www.seoforjournalism.com/p/structured-data-for-live-blogs-and)). A Linked→Done lifecycle is a slow-motion live blog. **Integrity:** corrections handled transparently *in place* — material reversals get a visible "what changed" note (Slate asterisk + note; Tangle top box), trivia is silent; transparency measurably improves trust ([Poynter](https://www.poynter.org/local-news/2026/corrections-indianapolis-local-news/), [Nieman Lab](https://www.niemanlab.org/2025/05/these-newsrooms-are-trying-to-boost-trust-through-transparency-is-it-working/)).

**Re-engagement loops.** Push is necessary but not sufficient (95% of opt-ins who got *no* push churn in 90 days; even optimally notified, 54% still churn — [Airship](https://grow.urbanairship.com/rs/313-QPJ-195/images/WP_App_Retention_Rates_Benchmarks.pdf)). **Over-notifying is the killer: one push/week → ~10% disable notifications, ~6% uninstall** ([MoEngage](https://www.moengage.com/learn/push-notification-statistics/)). The sticky pattern, identical across fintech/flight apps: **notify on meaningful state change, not every tick** — Robinhood defaults to 5%/10% price moves; **Flighty** alerts you *before the airline does* (being earliest + authoritative is the value). Read-across: lifecycle stage changes are the "5% moves"; **"Here We Go" is the Flighty before-the-airline moment.** User watchlists = pre-consented relevance, the biggest anti-annoyance lever. Offer a **digest** for minor moves.

**Dual-register.** Works **only via progressive disclosure**, never a flattened middle voice. The mechanism is inverted-pyramid + expandable depth: novices get the essential layer; power users expand into tooltips/accordions ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)). The model to copy is **FT's John Burn-Murdoch**: *"Don't just make charts for chart people. Make stories for all people"* — annotation + plain-language takeaway *on* the chart, with the underlying data still rewarding an expert ([GIJN](https://gijn.org/stories/data-visualization-storytelling-tips-john-burn-murdoch/)). The Pudding: the *visual* carries the meaning, prose supports. **The trap — FiveThirtyEight's "empty number":** a confidence %/valuation with no story reads as hollow and invites distrust ([New Republic](https://newrepublic.com/article/117068/nate-silvers-fivethirtyeight-emptiness-data-journalism)). **Never surface a bare number without a one-line *why*.**

---

## 5. What this is actually *for* (the reframe that should drive the build)

Not "content" — a **retention + SEO + onboarding surface that happens to look like an article.** Three jobs, ranked by ROI:

1. **Retention (highest, mostly built).** Follow-deal → ping-on-stage-change is *the* proven loop. Threshold events only; cap per-deal pushes to material changes; watchlist consent protects against the over-notify cliff.
2. **SEO/acquisition (underrated, nearly free).** Permanent date-free URL + `LiveBlogPosting` + paired updates → Google Top Stories during windows, a channel static-page competitors forfeit.
3. **Audience expansion (real; lever is "explain," not "interact").** Burn-Murdoch-style annotated charts + plain-language verdict; depth one tap away; never a naked number.

---

## 6. Decisions this research drove (folded into the spec)

1. **SEO & URL architecture — closes design open-question #6.** Keep the single permanent route (`/transfers/[id]`; the `[id]` is a stable, date-free rumour slug, so the permanent-URL requirement is already met). Add **`LiveBlogPosting` JSON-LD** with lifecycle transitions as `liveBlogUpdate` entries, and a **paired-update discipline** (move the headline/timestamp on each stage change). Frame these pages as an acquisition channel, not just metadata.
2. **"What changed since you last looked" diff — new first-class module (module 8).** A returning-visitor strip at the top: "Since you last looked: Talks → Bid, fee updated, confidence +6." It's the exact mechanic Living Stories users loved and the thing that converts a *watched* page into a *return visit*. Needs the stage-events ledger (below) + a per-user last-seen marker (signed-in: stored; anon: localStorage).
3. **Persist stage transitions — closes design open-question #1 (option b).** Add a lightweight `rumour_stage_events` ledger (rumour_id, stage, ts, source). Two needs point to the same answer: module 3's timeline *and* the **integrity/audit trail**. For a founder employed in pro sports (DC United/MLS), a collapsing rumour or a valuation that shifts near a deal must leave an **auditable, timestamped, transparent** trail — gambling-integrity matters. This is a guardrail, not polish.

**Plus hard guardrails (write them into the plan):**
- **Mobile-first; fully legible with zero animation/JS.** Interaction is progressive enhancement only. **No scrolljacking, ever.**
- **Dual-register = progressive disclosure.** Novice-legible default, expert depth one tap away. Never a flattened middle voice; never a naked number (one-line *why* always).
- **The lifecycle stages ARE the scroll steps** — use them; don't hand-craft narrative structure.
- **Sequencing:** ship static evolving page + the diff + SEO wiring + the follow/push loop first (~80% of value, most already built). Treat scrollytelling polish as a **later, surgical layer on the highest-traffic marquee deals only**, concentrated on **one** high-impact beat at the "Done" state (the recap timeline) — not spread across every stage of every rumour.

---

## 7. Standing risks to watch

- **Moat is format, not data → copyable.** Durable edge has to be valuation/confidence-engine quality + *speed* (the Here We Go wedge), not the page itself. Don't overclaim novelty in any deck.
- **Integrity of a changing story** is both a trust asset and a gambling-integrity liability for this founder specifically — hence the audit-log decision.
- **AI narrative correctly deferred.** Templated viz is fine; templated prose reads dead — keep a human/editorial layer on the headline beats; AI is a later enhancement to *one* module (module 5).
- **Performance:** many simultaneous live deal-stories with animated charts get heavy — budget for it or the Wire feels sluggish. Another reason to default to static + selective interaction.

---

## 8. Sources

Scrollytelling craft: [NN/g Scrolljacking](https://www.nngroup.com/articles/scrolljacking-101/) · [eagereyes "Scrollytelling Scourge"](https://eagereyes.org/blog/2016/the-scrollytelling-scourge) · [PMC interactive-vs-static review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11491620/) · [Scrollama / The Pudding](https://pudding.cool/process/introducing-scrollama/) · [Snow Fall / Storythings](https://www.formatsunpacked.com/p/formats-unpacked-snow-fall) · [Shorthand: cost & breaking-news unsuitability](https://shorthand.com/the-craft/an-introduction-to-scrollytelling/index.html) · [Flourish](https://flourish.studio/blog/scrollytelling-examples/) · [ScrollyVis (arXiv)](https://arxiv.org/pdf/2207.03616).
Competitive landscape: [Romano/Tribuna](https://tribuna.com/en/blogs/here-we-go-or-pr-for-hire-how-fabrizio-romano-turned-the-tra/) · [Athletic profit/Press Gazette](https://pressgazette.co.uk/media_business/new-york-times-owned-the-athletic-reports-quarterly-profit-for-first-time/) · [Transfermarkt/Similarweb](https://www.similarweb.com/website/transfermarkt.com/) · [Opta/The Analyst](https://www.statsperform.com/about/opta-analyst/) · [Rising Transfers](https://risingtransfers.com/en/transfers) · [L.E.K. fandom 2025](https://www.lek.com/insights/media-entertainment/how-sports-fandom-evolving-2025-insights-leks-annual-sports-survey) · [OneFootball/Airship](https://www.airship.com/blog/onefootball-puts-users-in-control/).
Living content / re-engagement / dual-register: [Living Stories/Wikipedia](https://en.wikipedia.org/wiki/Living_Stories) · [historyofinformation](https://www.historyofinformation.com/detail.php?id=2399) · [LiveBlogPosting/SEO for Journalism](https://www.seoforjournalism.com/p/structured-data-for-live-blogs-and) · [Airship retention benchmarks](https://grow.urbanairship.com/rs/313-QPJ-195/images/WP_App_Retention_Rates_Benchmarks.pdf) · [MoEngage push stats](https://www.moengage.com/learn/push-notification-statistics/) · [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) · [Burn-Murdoch/GIJN](https://gijn.org/stories/data-visualization-storytelling-tips-john-burn-murdoch/) · [FiveThirtyEight critique/New Republic](https://newrepublic.com/article/117068/nate-silvers-fivethirtyeight-emptiness-data-journalism) · [Poynter corrections](https://www.poynter.org/local-news/2026/corrections-indianapolis-local-news/).
