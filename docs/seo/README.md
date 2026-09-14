# SEO and AI-search foundation — what was built, what was not, and why

Built 9 September 2026 against the strategy in `talbotiq-seo-strategy-and-cursor-prompt-1.md`
(Parts A–C). This folder is the Phase 10 deliverable set:

| File | What it is |
|---|---|
| [00-audit.md](00-audit.md) | Phase 0 technical audit, with Lighthouse before/after on four pages |
| [01-page-map.md](01-page-map.md) | Every URL, its target query and intent; what was deliberately **not** built |
| [02-content-briefs.md](02-content-briefs.md) | Briefs for the pages that need facts only you have (pricing, comparisons) |
| [03-ai-visibility-baseline.md](03-ai-visibility-baseline.md) | The 30 buyer prompts to run monthly through ChatGPT, Gemini, Claude, Perplexity |
| [04-measurement-setup.md](04-measurement-setup.md) | Search Console, Bing, IndexNow, GA4 channel group, `site:` checks |
| [05-claims-to-verify.md](05-claims-to-verify.md) | Every claim in the new copy that needs a source before it ships |

## The two rules that shaped everything

1. **No invented facts.** The strategy says "ask me for the figures; don't invent any." There is no
   public price list in this repo, no confirmed competitor list, and no company profile URLs. So the
   pricing page, the comparison pages and the `sameAs` links are **briefs**, not pages. Every word that
   did ship is traceable to a product page, `products.js` or `research/RESEARCH.md`.
2. **No thin pages.** Thirty keywords did not become thirty pages. Two hub pages were added because
   both were already named as destinations by every product and solution page's breadcrumb schema and
   returned 404. Each carries content that exists nowhere else on the site (the format comparison table,
   the engagement overview). One page per intent; modifiers live in body copy.

## How to run it

```bash
npm run site        # tools/seo-pass.js → build.js → sitemap + llms.txt
npm run seo         # the pass alone (idempotent; safe on every build)
npm run indexnow    # after DNS cutover only — refuses to run until talbotiq.com serves the key file
```

When a page mockup is re-dropped: `node tools/fix-pages.js && node tools/clean-urls.js && npm run site`.

Edit **data, not output**: titles/descriptions in `seo/meta.json`, per-page FAQs in `seo/faq/<slug>.json`,
hub copy in `seo/hub.json`, the comparison table in `seo/formats.json`, profile links in
`site.config.json` → `sameAs`.

## What is still blocked on you

- **Domain cutover.** talbotiq.com still serves the WordPress site; the new site is on the Vercel host.
  Nothing in Search Console, Bing Webmaster Tools or IndexNow can start until `DOMAIN-CUTOVER.md` is done.
- **Pricing figures** (see brief 1). The single highest-leverage page in the strategy, and the one this
  repo cannot write.
- **Competitor list** (brief 2), **company profile URLs** for `sameAs`, **directory listings** (G2, Capterra,
  GetApp) and **reviews** — Part C of the strategy, all off-repo.
- **A privacy policy.** The demo form collects names, emails and phone numbers and the site has no privacy
  page. The WordPress `/privacy-policy` URL is therefore not redirected anywhere.
