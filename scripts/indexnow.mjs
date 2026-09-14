/* =============================================================================
   INDEXNOW — tell Bing (and everyone on the protocol) what changed, on deploy
   -----------------------------------------------------------------------------
   Bing matters more than its share of search suggests, because ChatGPT and
   Copilot answer from the Bing index. IndexNow is Bing's push protocol: one
   POST with the URLs that changed, authenticated by a key file the site serves
   at /<key>.txt. Yandex, Naver and Seznam share the endpoint; Google does not
   use it.

   THE KEY lives in site.config.json (`indexNowKey`) and as <key>.txt at the
   repo root, which Vercel serves. Rotate it by generating a new one, writing
   the new file and deleting the old.

   IT REFUSES TO RUN UNTIL THE SITE IS LIVE ON ITS OWN DOMAIN. The check is the
   protocol's own: GET https://<siteUrl>/<key>.txt must return the key. While
   talbotiq.com still points at the old WordPress site that fetch fails, and
   pinging Bing about URLs it cannot verify would only teach it to ignore us.

   Run: node scripts/indexnow.mjs            all sitemap URLs
        node scripts/indexnow.mjs /products  one or more paths
   Zero dependencies.
   ========================================================================== */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CFG = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const host = new URL(CFG.siteUrl).host;
const key = CFG.indexNowKey;
if (!key) { console.error('site.config.json has no indexNowKey'); process.exit(1); }

const argPaths = process.argv.slice(2);
const urlList = argPaths.length
  ? argPaths.map((p) => CFG.siteUrl + (p.startsWith('/') ? p : '/' + p))
  : [...readFileSync(join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const keyLocation = `${CFG.siteUrl}/${key}.txt`;
const probe = await fetch(keyLocation).then((r) => (r.ok ? r.text() : '')).catch(() => '');
if (probe.trim() !== key) {
  console.error(`${keyLocation} does not serve the key yet — is ${host} live on this deployment? Nothing sent.`);
  process.exit(2);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
});
/* 200 OK · 202 accepted, key not yet validated · 400 bad · 403 key mismatch · 422 URLs off-host · 429 too many */
console.log(`IndexNow ${res.status} — ${urlList.length} URL(s) for ${host}`);
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
