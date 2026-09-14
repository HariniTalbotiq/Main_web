# Phase 0 — technical SEO audit (9 September 2026)

Measured on the working tree, served locally with gzip to mirror Vercel's edge, Lighthouse 12,
mobile profile, simulated 4G. Live-URL checks (Rich Results Test, real-device CrUX) have to wait
for the domain cutover.

## Core Web Vitals — before → after

| Page | Perf | LCP | CLS | FCP | Document (gzipped) |
|---|---|---|---|---|---|
| `/` | 77 → **99** | 3.74s → **2.25s** | 0.001 → 0 | 3.74s → 1.05s | 18 KB → 18 KB |
| `/products/video-interview` | 74 → **99** | 4.23s → **1.95s** | 0.002 → 0 | 4.23s → 0.85s | 89 KB → 14 KB |
| `/products/recruitment-software` | 75 → **96** | 3.91s → **2.71s** | 0.097 → 0 | 3.91s → 1.06s | 90 KB → 16 KB |
| `/products` (new) | — → **99** | — → 1.96s | 0 | 0.91s | 11 KB |

SEO category: 100 on every page before and after. Accessibility: 94 before and after (see below).

The recruitment page is the one still above the 2.5 s target, by 0.2 s. Its remaining cost is the
133 KB JPEG poster on the demo video; converting the posters to WebP is the next lever and was not
done here (no lossless-safe converter in this environment).

## What was slowing every page, and what changed

| Finding | Before | Change |
|---|---|---|
| Google Fonts stylesheet render-blocking on all 27 pages | 1.3–2.0 s of LCP, a third-party origin on the critical path | Inter self-hosted as one 48 KB latin variable file (`assets/fonts/inter/`), preloaded, declared in each page's own `<style>` and in §30 of `talbotiq.css`. Same face, same four weights. |
| Header and footer logos embedded as base64 PNGs on all 24 hand-written pages | ~100 KB of HTML per page that no cache could share and gzip barely compressed | Extracted once to `assets/brand/talbotiq-logo-{header,footer}.png` (pixel-identical, hash-checked), referenced with `width`/`height`; footer copy lazy-loaded. Pages went from ~140 KB to ~45 KB. |
| Every `<img>` on the hand-written pages lacked `width`/`height` | CLS risk on 26 images | All images now carry dimensions; the founder photo is a file with lazy loading. |
| Demo videos `autoplay` on 13 product pages | 0.4–6 MB fetched before the reader saw the headline (3.3 MB on the recruitment page) | `preload="none"`, no `autoplay`; the page's own IntersectionObserver starts the load when the video scrolls into view. Same on-screen behaviour on desktop; a phone only pays when it gets there. |
| CLS 0.097 on `/products/recruitment-software` from `.cta-pair` | Font swap moving the buttons | Gone with the self-hosted, preloaded body font. |

Not changed, and why: `talbotiq.css` is 102 KB unminified (~36 KB gzipped) with ~30 KB unused on any
one page. Minifying it is a build step that needs a real CSS parser; the repo is zero-dependency by
design. Lighthouse still lists it. `.btn-primary` fails AA contrast (white on brand teal) — a palette
decision the strategy says not to touch. Heading order: the nav panels and drawer use `<h4>` and the
product-page scorecard uses an `<h5>` after an `<h2>`; both are styling uses of heading tags and are
flagged, not changed.

## Heading structure

Every page has exactly one `<h1>`. Product pages run H1 → H2 → **H5** (the scorecard label) → H2 …,
a skipped level on all 17. Homepage and demo page open with the nav panels' `<h4>`s before the `<h1>`.
Solutions and about pages are clean.

## Meta — before

15 of 27 titles exceeded 60 characters (longest 81). 12 descriptions exceeded 155 (homepage: 285, a
comma-separated list of ten product names). Every page had a canonical, OG and Twitter tags, and
JSON-LD. Now: every title ≤ 60 with the primary term first and the brand last; every description ≤ 155,
written as a sentence; enforced by `tools/seo-pass.js` and `build.js`, which refuse to run otherwise.

## Crawlability — before

- `/products` and `/solutions` were named in every product and solution page's `BreadcrumbList`
  schema and by the solution pages' visible breadcrumb — and both **404'd**.
- Six product pages (avatar, recorded video, two-way, conversational chat, MCQ, timed Q&A) were not in
  the nav, the footer or the homepage: reachable only from sibling format pages, 4 inbound links each.
- `robots.txt` was two lines. No `llms.txt`, no IndexNow, no `lastmod` in the sitemap.
- No orphans; no broken internal links; every page within 3 clicks.

Now: both hubs exist, are linked from the nav panels, footer, drawer and homepage band, and list all
17 product / 5 solution pages. Deepest page is 2 clicks. `robots.txt` names the AI crawlers; sitemap
carries git-derived `lastmod`; `llms.txt` is generated from the same walk.

## Schema — before / after

Before: `Organization` on the homepage (no logo, no `@id`, partial address); `SoftwareApplication` +
`BreadcrumbList` on product pages; `Service` + `BreadcrumbList` on solutions; `AboutPage` /
`ContactPage` with a second `Organization`. No `WebSite`, no `FAQPage`, no dates.

After: `Organization` with `@id`, logo, full postal address, founder, contact point, and `sameAs`
(emitted only when `site.config.json` lists real profiles); `WebSite`; `WebPage` with
`datePublished`/`dateModified` from git on every hand-written page; `FAQPage` on all 17 product pages
and both hubs; `CollectionPage` + `ItemList` on the hubs; breadcrumb last item now carries its URL.

`SoftwareApplication` still carries **no price** in `offers`: there is no public price. Google shows
no rich result for it without one; that is correct behaviour, not an error. `AggregateRating` is
absent until real reviews exist.

## Indexation baseline — run these on the day DNS moves, and monthly

```
Google:  site:talbotiq.com            (expect 27 results within ~2 weeks; 0 means the property is not verified or robots is blocking)
Google:  site:talbotiq.com/products   (expect 18)
Bing:    site:talbotiq.com            (Bing indexes slower; submit the sitemap in Webmaster Tools and use IndexNow)
```

Any result on `talbotiq-site.vercel.app` means step 6 of `DOMAIN-CUTOVER.md` was skipped.
