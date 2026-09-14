# Measurement — set up in this order, after DNS cutover

Nothing below works while talbotiq.com still serves WordPress. Do `DOMAIN-CUTOVER.md` first.

## 1 · Google Search Console
1. Add a **Domain** property for `talbotiq.com` (DNS TXT verification) — it covers `www` and `https`
   variants. Never add the `vercel.app` host.
2. Sitemaps → submit `https://talbotiq.com/sitemap.xml`. It carries `lastmod` from git.
3. URL Inspection → request indexing for `/`, `/products`, `/products/recruitment-software` on day one.
4. After a week: Pages report → confirm 27 indexed; Enhancements → FAQ / Breadcrumbs should list the
   product pages.

## 2 · Bing Webmaster Tools (ChatGPT and Copilot read Bing's index)
1. Sign in → "Import from Google Search Console" (fastest), or verify by DNS.
2. Submit `https://talbotiq.com/sitemap.xml`.
3. IndexNow is already wired: `npm run indexnow` posts every sitemap URL. The key is in
   `site.config.json` (`indexNowKey`) and served at `/<key>.txt`. The script refuses to run until the live
   site serves the key — its own cutover check. Run it after each deploy that changes content.

## 3 · Rich Results Test
Run `https://search.google.com/test/rich-results` on `/`, `/products`, one product page and one solution
page once live. Expect: Organization, Breadcrumbs, FAQ detected; SoftwareApplication present but no
rich result (no price — correct). Fix anything it flags before the next deploy.

## 4 · GA4 with an AI-referrer channel group
There is no analytics snippet on the site today. When GA4 is added (one `gtag` snippet in `build.js`'s
shell and in `tools/seo-pass.js` for the hand-written pages — do not paste it into 27 files by hand):

1. Admin → Data display → Channel groups → create "AI assistants" with condition **Source matches
   regex**: `chatgpt\.com|chat\.openai\.com|perplexity\.ai|gemini\.google\.com|claude\.ai|copilot\.microsoft\.com|you\.com|phind\.com`
   — placed **above** Referral so it wins. Without this these sessions collapse into Direct/Referral.
2. Mark as key events: `demo_submit` (fire on the `/api/demo` success response in `assets/js/demoform.js`),
   `pricing_view` (page_view where page_location contains `/pricing`, once that page exists),
   `contact_click` (mailto/tel/WhatsApp clicks on `/contact`).
3. Explore → free-form: sessions by channel group × landing page, monthly.

## 5 · Monthly checklist
- `site:talbotiq.com` in Google and Bing (counts in 00-audit.md).
- Search Console: queries containing "interview", "ATS", "recruitment" — impressions and position.
- Re-run `03-ai-visibility-baseline.md`.
- Lighthouse on the four audited pages (numbers in 00-audit.md are the baseline).
- Check the Vercel firewall / bot protection logs for blocked `GPTBot`, `ClaudeBot`, `PerplexityBot`,
  `Bingbot` — a rule there silently undoes `robots.txt`.

## 6 · About `llms.txt`
`/llms.txt` is generated with the sitemap. Google has said it does not use it; measured crawler pickup
across the industry is near zero. It costs one loop and Lighthouse looks for it. Expect nothing from it.
