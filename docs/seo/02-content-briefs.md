# Content briefs — the pages that need facts only you have

Each brief lists the exact facts required. Nothing here ships until every fact is supplied and
sourced; the strategy's rule 3 (no unverifiable claims) and rule 5 (would we keep it if Google did
not exist?) both apply.

## 1 · `/pricing` — the most important page on the site

**Target queries:** talbotiq pricing · affordable video interview software for SMEs · cheap coding /
video interview software · budget friendly ATS for small business · what does async video interview
software cost. **Intent:** commercial, late-stage.

**Why it matters more than anything else here:** most competitors gate pricing. A public, specific,
structured price is (a) the only way to rank for the "affordable / cheap / budget" intent honestly and
(b) the single most citable fact for ChatGPT, Gemini, Claude and Perplexity. "Contact us for pricing"
is invisible to all four.

**Facts needed from you (do not estimate):**

| # | Fact | Where it goes |
|---|---|---|
| 1 | Tier names, monthly and annual price per tier, currency (MYR? USD?) | Tier table, `Offer` schema (`price`, `priceCurrency`, `priceValidUntil`) |
| 2 | Per tier: interviews or candidates per month, seats, formats included, ATS included or not, support level | Tier table |
| 3 | Overage rule (what happens at the limit) | FAQ |
| 4 | Free trial: yes/no, length, card required? | FAQ, answer-first paragraph |
| 5 | Setup or onboarding fees | FAQ |
| 6 | Contract: monthly cancel? annual only? | FAQ |
| 7 | Public competitor prices for the comparison table, each with URL and capture date | "Prices verified [date]" table |
| 8 | The calculator's inputs: cost per interview at each tier | Cost calculator |

**Structure (Phase 2 template):** H1 "TalbotIQ pricing" → answer-first paragraph with the entry price
and what it includes → tier `<table>` → "TalbotIQ vs typical enterprise pricing" `<table>` with
verification date and source links → calculator → FAQ (trial, setup fees, overage, cancellation, currency,
invoicing) → `FAQPage` + `Offer` schema matching the visible numbers exactly. Add "Pricing" back to the
header nav (it was removed because there was nothing to point it at — `home.js` records why).

**Do not write:** "cheapest", "lowest price in the world", "#1", or any comparison without a dated source.

## 2 · `/compare/talbotiq-vs-<competitor>` and `/alternatives/<competitor>-alternatives`

**Candidates named in the strategy:** HireVue, Willo, Hireflix, Spark Hire, myInterview, VidCruiter.
**Build only for competitors you confirm you actually compete with.**

Per page, facts needed: the competitor's public pricing (URL + date), their formats (async video, live,
voice, chat, MCQ, coding), ATS integrations, candidate-side requirements (app install? account?),
where they win — the "when the competitor is the better choice" section is what makes the page
citable rather than promotional. TalbotIQ's side comes from `seo/formats.json` and the product pages.
Structure: feature `<table>`, pricing `<table>`, honest "choose them if…" section, migration notes,
verification date, `ItemList` schema. Never characterise a competitor as bad.

## 3 · `/products` hub — already live; two derived FAQs

The camera and install FAQs on `/products` are generated from `seo/formats.json` so they cannot
disagree with the table. If a product page starts stating delivery (live/async) or camera needs for the
formats currently marked "not stated" (avatar, conversational chat, timed Q&A, two-way, MCQ), update the
row and rebuild — the dashes disappear.

## 4 · Original data — the link magnet (Part C §5)

You run interview software. One annual report — "we analysed N interviews across M roles: completion
rates by format, time-to-shortlist, how often a human changed an AI score" — earns links and citations
for years. Facts needed: anonymised aggregates from Mimic with the method stated. The "how often a
human changed a score" number is one the product pages already say is the honest measure.

## 5 · Solutions pages — FAQ blocks

The four solution pages have no FAQ block yet (the product pages do). They can get one the same way:
write `seo/faq/<slug>.json` from each page's own text and run `npm run seo`. Not done here because the
strategy puts services outside the topical core.
