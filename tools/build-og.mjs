/* =============================================================================
   THE SHARE CARD — one image, generated, not designed in a browser tab
   -----------------------------------------------------------------------------
   Every page on this site used to point og:image at https://talbotiq.com/og-<slug>.png
   and not one of those 23 files existed. A share card that 404s is worse than
   none: the platform falls back to whatever it can scrape, which on a page with
   an inline-SVG logo is usually nothing at all.

   So there is one card, and it is BUILT rather than exported from a design tool,
   because an exported PNG drifts from the brand the first time a colour changes
   and nobody can find the source file. This is the source file.

   NOT PART OF THE BUILD. It needs a browser, and build.js has zero dependencies
   on purpose — wiring this into it would mean the site could not be rebuilt on a
   machine without Playwright. Run it by hand when the wordmark or the headline
   changes:

       npx playwright@latest install chrome     # once
       node tools/build-og.mjs                  # -> assets/og/talbotiq-default.png

   PER-PAGE CARDS are the obvious next step and deliberately not done here: 26
   images that must each be regenerated when a title changes is a build step, and
   a build step needs a dependency this repo does not want yet. One correct card
   beats 23 broken ones and 26 unmaintained ones.
   ========================================================================== */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const ROOT = '/Users/ges/Desktop/Talbotiq_Landing Page';
const logo = 'data:image/png;base64,' + readFileSync(ROOT + '/assets/brand/talbotiq-logo.png').toString('base64');
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,700&family=Inter:wght@400;600&display=swap">
<style>
 *{margin:0;box-sizing:border-box}
 body{width:1200px;height:630px;background:#fff;font-family:Inter,sans-serif;
      display:flex;flex-direction:column;justify-content:space-between;
      padding:76px 84px;position:relative;overflow:hidden}
 .glow{position:absolute;width:820px;height:820px;right:-260px;top:-300px;border-radius:50%;
       background:radial-gradient(circle,rgba(2,168,133,.16),rgba(2,168,133,0) 68%)}
 .glow2{position:absolute;width:620px;height:620px;left:-220px;bottom:-320px;border-radius:50%;
        background:radial-gradient(circle,rgba(243,226,2,.14),rgba(243,226,2,0) 68%)}
 img{height:64px;position:relative}
 h1{font-family:"Bodoni Moda",Georgia,serif;font-weight:700;font-size:82px;line-height:1.06;
    color:#1F2430;letter-spacing:-.01em;position:relative;max-width:15ch}
 .g{color:#027A5C} .y{color:#A87500}
 .foot{display:flex;align-items:center;gap:16px;position:relative;
       font-size:23px;color:#5D5B5B;font-weight:600}
 .rule{height:5px;width:64px;background:#02A885;border-radius:3px}
</style></head><body>
 <div class="glow"></div><div class="glow2"></div>
 <img src="${logo}" alt="">
 <h1>Every <span class="y">workflow</span>,<br>running on <span class="g">intelligence</span>.</h1>
 <div class="foot"><span class="rule"></span><span>talbotiq.com</span></div>
</body></html>`;
const b = await chromium.launch({ channel: 'chrome' });
const p = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
await p.setContent(html, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.screenshot({ path: ROOT + '/assets/og/talbotiq-default.png' });
await b.close();
console.log('written');
