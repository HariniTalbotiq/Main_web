/* =============================================================================
   CLEAN URLS — one pass over every file that emits a link
   -----------------------------------------------------------------------------
   The site moved from `/products/ats.html` to `/products/recruitment-software`.
   Two changes at once, and they are not the same change:

     THE EXTENSION GOES.  Vercel's `cleanUrls` serves products/x.html at
                          /products/x and 308s the .html path to it. That is a
                          host setting; this file's job is to stop the markup
                          asking for the old one.
     SIX CODENAMES GO.    ats, erp, nouscrm, tasca, lexer and recapr were never
                          product names — the site calls them Intelligent
                          Recruitment Software, Business Management System,
                          Sales CRM and so on. Eight more pages said
                          "interviewer" where the product says "interview".
                          Mimic and Vawlt stay: those are live brands, used 44
                          and 33 times in the copy.

   WHY A SCRIPT AND NOT AN EDITOR. 829 hrefs across 24 hand-written pages, and
   every one of them relative — `../contact.html` from a product page, `contact.html`
   from the root, `../index.html#products` from a solution. Resolving that by
   hand is where a link quietly starts pointing at the wrong directory. Here the
   path is resolved against the file it was found in, every time, by the same
   four lines.

   WHAT THIS DOES NOT TOUCH:
     index.html, demo.html, assets/js/nav.js   generated — fix build.js instead
     api/knowledge.json                        generated, last, by crawling the
                                               built index. It picks the new
                                               URLs up on the next build.
     CSS url()                                 resolved against the stylesheet,
                                               not the page. `../fonts/x.woff2`
                                               from /assets/css/ is /assets/fonts/x.woff2
                                               whatever the page URL is. Already
                                               immune; rewriting it is churn.
     mailto:, tel:, #frag, //, data:, external http(s)

   Run: node tools/clean-urls.js [--dry]
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');

/* old product slug -> new. Only products moved; solutions and the root pages
   already read the way a customer would say them. */
const RENAME = {
  'ats': 'recruitment-software',
  'erp': 'business-management-system',
  'nouscrm': 'sales-crm',
  'tasca': 'task-manager',
  'lexer': 'document-management',
  'recapr': 'note-taker',
  'video-interviewer': 'video-interview',
  'voice-interviewer': 'voice-interview',
  'chat-interviewer': 'chat-interview',
  'recorded-interviewer': 'recorded-video-interview',
  'two-way-interviewer': 'two-way-interview',
  'avatar-interviewer': 'ai-avatar-interview',
  'conversational-interview': 'conversational-chat-interview',
  'mcqs': 'mcq-rounds',
};

const SITE = 'https://talbotiq.com';

/* a root-relative page path -> its clean URL. The homepage is `/`, never
   `/index` — an index that names itself is the oldest URL smell there is. */
function cleanPage(abs) {
  let p = abs.replace(/\.html$/, '');
  p = p.replace(/^products\/([A-Za-z0-9._-]+)$/, (m, s) => 'products/' + (RENAME[s] || s));
  return p === 'index' ? '/' : '/' + p;
}

const SKIP = /^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i;

/* Resolve one attribute value against the directory of the file it lives in,
   and hand back the root-absolute form. Returns null for anything external,
   fragment-only, or already correct. */
function rewrite(value, fromDir) {
  if (!value || SKIP.test(value)) return null;
  const m = value.match(/^([^#?]*)([#?][\s\S]*)?$/);
  const raw = m[1];
  const tail = m[2] || '';
  if (!raw) return null;

  const abs = raw.startsWith('/')
    ? raw.slice(1)
    : path.posix.normalize(path.posix.join(fromDir, raw));

  if (/\.html$/.test(abs)) return cleanPage(abs) + tail;
  /* assets and the API are root-absolute so a page at /products/x resolves them
     the same way the old /products/x.html did */
  if (/^(assets|api)\//.test(abs)) return '/' + abs + tail;
  return null;
}

/* Absolute self-references — canonical, og:url, JSON-LD @id — are the one place
   the domain belongs, and they carry the renamed slugs too. */
function rewriteAbsolute(s) {
  let n = 0;
  s = s.replace(
    new RegExp(SITE.replace(/[.]/g, '\\.') + '/products/([A-Za-z0-9._-]+?)(\\.html)?(?=["\'\\s<)/#?])', 'g'),
    (m, slug) => { const t = RENAME[slug] || slug; if (t !== slug || m.includes('.html')) n++; return SITE + '/products/' + t; }
  );
  s = s.replace(
    new RegExp(SITE.replace(/[.]/g, '\\.') + '/([A-Za-z0-9._-]+)\\.html', 'g'),
    (m, page) => { n++; return page === 'index' ? SITE + '/' : SITE + '/' + page; }
  );
  return [s, n];
}

const ATTRS = /\b(href|src|poster|action)="([^"]*)"/g;

function doFile(rel) {
  const file = path.join(ROOT, rel);
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  const fromDir = path.posix.dirname(rel) === '.' ? '' : path.posix.dirname(rel);
  let hits = 0;

  s = s.replace(ATTRS, (m, attr, val) => {
    const out = rewrite(val, fromDir);
    if (out === null || out === val) return m;
    hits++;
    return `${attr}="${out}"`;
  });

  const [s2, absHits] = rewriteAbsolute(s);
  s = s2; hits += absHits;

  if (hits && !DRY) fs.writeFileSync(file, s, 'utf8');
  return { rel, hits, changed: s !== before };
}

/* ---- the hand-written pages -------------------------------------------- */
const pages = []
  .concat(['about.html', 'contact.html', 'signin.html'])
  .concat(fs.readdirSync(path.join(ROOT, 'products')).filter(f => f.endsWith('.html')).map(f => 'products/' + f))
  .concat(fs.readdirSync(path.join(ROOT, 'solutions')).filter(f => f.endsWith('.html')).map(f => 'solutions/' + f));

let total = 0, touched = 0;
for (const p of pages) {
  const r = doFile(p);
  total += r.hits;
  if (r.changed) touched++;
  if (r.hits) console.log(`  ${String(r.hits).padStart(4)}  ${p}`);
}

console.log(`\n${DRY ? '[dry] ' : ''}${total} references rewritten across ${touched} of ${pages.length} pages`);
