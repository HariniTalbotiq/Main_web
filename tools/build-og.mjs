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

       node tools/build-og.mjs                  # -> assets/og/talbotiq-card-894c03478e.png

   It drives the Chrome that is already installed, so there is nothing to set
   up first. CHROME=/path/to/chrome overrides the lookup.

   PER-PAGE CARDS are the obvious next step and deliberately not done here: 26
   images that must each be regenerated when a title changes is a build step, and
   a build step needs a dependency this repo does not want yet. One correct card
   beats 23 broken ones and 26 unmaintained ones.
   ========================================================================== */
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/* THE CARD'S LOCKUP HAS NO TAGLINE, and that is a legibility decision with a
   measurement behind it. The full lockup's second line, "Intelligent AI
   Automation", is 26 of the artwork's 87 pixels tall. At the 62px the card
   used to draw it, that line landed near 4px once WhatsApp scaled the card
   to the ~340px it actually renders at — not small type, an illegible grey
   smudge under the wordmark, which is worse than no tagline at all.

   assets/brand/talbotiq-logo-card.png is PURELY SUBTRACTIVE. It is the same
   mark and the same wordmark, at their original sizes and their original
   horizontal spacing, with the tagline row deleted and the wordmark
   re-centred on the mark. The brand's own mark:wordmark ratio of 1.63 is
   untouched — nothing here re-proportions the logo, it only stops drawing a
   line of type at a size nobody can read. */
const logo = 'data:image/png;base64,' + readFileSync(ROOT + '/assets/brand/talbotiq-logo-card.png').toString('base64');
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,700&family=Inter:wght@400;600&display=swap">
<style>
 *{margin:0;box-sizing:border-box}
 /* CENTRED, AND THAT IS A CROP DECISION RATHER THAN A TASTE ONE. At 1.91:1
    -- what WhatsApp, Outlook, Slack, LinkedIn and iMessage all render -- the
    card is shown whole and the alignment does not matter. But a few surfaces
    (compact WhatsApp thumbnails, quoted replies, some mail clients) take a
    CENTRE SQUARE instead, which on this canvas is x=285..915. Left-aligned,
    that crop cut the wordmark off entirely and sliced the first letter from
    every line of the headline. Centred, and with the type held inside a
    600px band, the same square still contains the whole logo, the whole
    headline and the domain. Nothing is removed for it, only moved. */
 body{width:1200px;height:630px;background:#fff;font-family:Inter,sans-serif;
      display:flex;flex-direction:column;align-items:center;justify-content:space-between;
      text-align:center;padding:64px 84px;position:relative;overflow:hidden}
 .glow{position:absolute;width:820px;height:820px;right:-260px;top:-300px;border-radius:50%;
       background:radial-gradient(circle,rgba(2,168,133,.16),rgba(2,168,133,0) 68%)}
 .glow2{position:absolute;width:620px;height:620px;left:-220px;bottom:-320px;border-radius:50%;
        background:radial-gradient(circle,rgba(243,226,2,.14),rgba(243,226,2,0) 68%)}
 /* THE LOGO IS NOT STRETCHED. body is a flex COLUMN, and a flex column
    stretches its children across the cross axis by default, so an img with
    only a height set was pulled to the full content width -- 1032px against
    a natural 233px, 4.4x too wide -- and every WhatsApp, Slack and LinkedIn
    preview of this site showed a smeared wordmark. width:auto restores the
    ratio; align-self takes the element out of the stretch that caused it.
    Both, because either alone is one refactor away from the bug returning.
    NO BACKTICKS IN HERE: this comment lives inside a template literal, and
    one backtick ends it. */
 /* 76px, up from 62px. The tagline used to occupy the bottom third of the
    artwork, so 62px bought a ~39px wordmark; without it the same box is all
    wordmark. 76px puts the wordmark at 48px on the 1200px canvas, which is
    13.5px once WhatsApp scales the card to 340px wide — read rather than
    guessed. The lockup comes out 385px wide, still inside the 600px safe
    band the centre-square crop depends on. */
 img{height:76px;width:auto;align-self:center;position:relative}
 /* 70px, not 82px: the widest line has to fit the 600px safe band above,
    and "Every workflow," at 82px measured 636px. */
 h1{font-family:"Bodoni Moda",Georgia,serif;font-weight:700;font-size:70px;line-height:1.08;
    color:#1F2430;letter-spacing:-.01em;position:relative;max-width:600px}
 .g{color:#027A5C} .y{color:#A87500}
 .foot{display:flex;align-items:center;justify-content:center;gap:16px;position:relative;
       font-size:23px;color:#5D5B5B;font-weight:600}
 .rule{height:5px;width:64px;background:#02A885;border-radius:3px}
</style></head><body>
 <div class="glow"></div><div class="glow2"></div>
 <img src="${logo}" alt="">
 <h1>Every <span class="y">workflow</span>,<br>running on <span class="g">intelligence</span>.</h1>
 <div class="foot"><span class="rule"></span><span>talbotiq.com</span></div>
</body></html>`;
/* HEADLESS CHROME, NOT PLAYWRIGHT. This repo's rule is zero dependencies, and
   the old version quietly broke it: it imported `playwright`, which is not in
   package.json and is not installed, so the one tool that regenerates the share
   card could not be run — which is a large part of why a 4.4x-stretched logo
   sat on every link preview of this site without anyone catching it. Chrome is
   already on the machine. Set CHROME to override the path. */
const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((c) => { try { readFileSync(c); return true; } catch (e) { return false; } });
if (!CHROME) {
  console.error('No Chrome found. Set CHROME=/path/to/chrome and run again.');
  process.exit(1);
}
const dir = mkdtempSync(join(tmpdir(), 'og-'));
const page = join(dir, 'card.html');
writeFileSync(page, html);
const ogDir = join(ROOT, 'assets', 'og');
const out = join(dir, 'card.png');
execFileSync(CHROME, [
  '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1200,630',
  /* the webfonts are fetched over the network; give them time to arrive and
     paint before the shutter, or the card ships in Georgia */
  '--virtual-time-budget=12000',
  '--screenshot=' + out,
  'file://' + page,
], { stdio: 'ignore' });

/* THE FILENAME IS STABLE, AND THAT REVERSES WHAT THIS FILE USED TO DO.
   It used to name the card by a sha256 prefix of its own bytes, and delete
   every other png in the directory. The reasoning was written down and it was
   half right: vercel.json serves /assets/* as `immutable, max-age=31536000`,
   so a card rewritten in place really would be handed out by CDNs for a year.

   WHAT IT MISSED IS WHERE THE STALE PICTURE ACTUALLY LIVES. WhatsApp, Meta,
   LinkedIn, Slack and Telegram do not cache the IMAGE keyed on the image URL.
   They cache the whole PREVIEW — title, description and the downloaded
   thumbnail — keyed on the PAGE url that was shared. Renaming the image
   changes a string inside HTML that those caches are not going to re-read
   until the page-level entry expires on its own. So a new hash buys nothing
   against the cache that is actually holding the old card.

   AND THE DELETE MADE IT STRICTLY WORSE. The retired name was the one URL that
   every already-generated preview pointed at, and unlinking it turned that URL
   into a 404 — which removed the only remaining way a consumer that DOES
   revalidate the image could ever pick up the corrected bytes. That is exactly
   how a fixed card went on being shown stretched: the fix shipped, the old file
   was deleted, and every cached preview kept serving a picture no longer on the
   server.

   SO: ONE STABLE URL, AND A CACHE HEADER THAT ALLOWS REVALIDATION.
   vercel.json now sets `public, max-age=3600, must-revalidate` on
   /assets/og/(.*), overriding the blanket immutable rule for this subtree
   alone. That is the right trade for a file fetched a few times a day by
   crawlers and never by a reader: a corrected card propagates in an hour
   instead of a year, and no URL ever has to be retired again.

   RETIRED NAMES BECOME REWRITES, NOT LEFTOVER FILES. Every URL this site has
   ever published for a card is listed in vercel.json's `rewrites` pointing at
   the stable name, so it keeps answering 200 with the CURRENT card for ever.
   A rewrite is the right shape and a kept copy is the wrong one: a copy is
   frozen at the bytes it was published with, so the next regeneration would
   leave that old URL serving the superseded picture — the original bug, one
   level down. Two are registered today, talbotiq-default.png and the one
   hashed name talbotiq-card-894c03478e.png, and nothing here deletes a file
   that is still named by a rewrite.

   CACHES STILL HAVE TO BE BUSTED BY HAND after a card change, because none of
   the above can reach a page-level preview cache. The steps are printed at the
   end of this run. */
const name = 'talbotiq-card.png';
const hash = createHash('sha256').update(readFileSync(out)).digest('hex').slice(0, 10);
renameSync(out, join(ogDir, name));

/* One file names the card; build.js and tools/fix-pages.js both read it. */
const cfgPath = join(ROOT, 'site.config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
cfg.defaultOgImage = '/assets/og/' + name;
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');

console.log('written -> assets/og/' + name + '  (sha256 ' + hash + ')');
const others = readdirSync(ogDir).filter((f) => f !== name && /\.png$/.test(f));
if (others.length) {
  console.log('kept as legacy aliases, deliberately not deleted:');
  for (const f of others) console.log('  assets/og/' + f);
}
console.log('');
console.log('next: npm run site && node tools/fix-pages.js && npx vercel --prod');
console.log('then bust the preview caches that key on the PAGE url — a new card');
console.log('will NOT appear in WhatsApp or LinkedIn until you do:');
console.log('  * https://developers.facebook.com/tools/debug/  -> Scrape Again');
console.log('    (this is what refreshes WhatsApp previews too)');
console.log('  * https://www.linkedin.com/post-inspector/');
console.log('  * X/Twitter and Slack re-fetch on their own within ~1 week');
