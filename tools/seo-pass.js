#!/usr/bin/env node
/* =============================================================================
   SEO PASS — the re-runnable pass over the 24 hand-written pages
   -----------------------------------------------------------------------------
   about.html, contact.html, signin.html, products/*.html and solutions/*.html
   are standalone mockups, so anything that should be true of all of them has
   to be applied to each of them — and re-applied when a page is re-dropped.
   Same shape as tools/clean-urls.js: every rule matches only the state it
   fixes, so the pass is idempotent and safe to run on every build.

   Run order when a mockup is replaced:
     node tools/fix-pages.js  ->  node tools/clean-urls.js  ->  node tools/seo-pass.js
   `npm run site` runs this pass first, then build.js, then the sitemap.

   WHAT IT DOES, and why each thing is measurable rather than cosmetic:

   1  INTER IS SELF-HOSTED. The Google Fonts stylesheet was a render-blocking
      request to a third origin on every page — 1.3 to 2.0 s of the mobile LCP
      in Lighthouse. The same face, the same four weights, from one latin
      variable file under /assets/fonts/inter, preloaded and declared in the
      page's own <style>. The design does not change; the wait does.
   2  THE TWO LOGOS BECOME FILES. Every page embedded the header and footer
      marks as ~57 kB and ~44 kB base64 PNGs: 100 kB of HTML per page that no
      cache could share between pages and that gzip barely touches. They are
      written once to assets/brand/ (pixel-identical, checked by hash) and
      referenced with width/height, so the page is ~90 kB lighter and the
      browser reserves the box before the image arrives (CLS).
   3  A VISIBLE BREADCRUMB on product pages, matching the one the solution
      pages already have, pointing at the /products hub — the BreadcrumbList
      schema already named that hub, which did not exist until build.js started
      generating it.
   4  TITLES AND DESCRIPTIONS from seo/meta.json, with the limits enforced.
   5  AN FAQ SECTION from seo/faq/<slug>.json where one exists, in the page's
      own accordion markup, plus FAQPage schema. Every answer in those files
      was written from the page's own text and checked against it; the JSON is
      the source, this block is output.
   6  A DATED WebPage NODE in the JSON-LD, and a visible published/updated line
      under the FAQ. Dates come from git, not from a hand-kept field.
   7  DEMO VIDEOS LOAD WHEN SCROLLED TO, not on page load. `autoplay` made the
      browser fetch a 3–6 MB file before the reader had seen the headline; the
      page's own IntersectionObserver already plays and pauses on scroll, so it
      now also starts the load. Same behaviour on screen, a fraction of the
      bytes on a phone.

   Zero dependencies. `--dry` reports without writing.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const META = JSON.parse(fs.readFileSync(path.join(ROOT, 'seo', 'meta.json'), 'utf8')).pages;
const FAQ_DIR = path.join(ROOT, 'seo', 'faq');
const TODAY = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---- the pages ------------------------------------------------------------ */
/* index.html in products/ and solutions/ are the generated hubs — build.js's
   business, not this pass's. Everything else in those folders is hand-written. */
const list = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.html') && f !== 'index.html').map((f) => `${dir}/${f}`);
const PAGES = ['about.html', 'contact.html', 'signin.html', ...list('products'), ...list('solutions')];

/* ---- 2 · embedded images -> files ---------------------------------------- */
/* Known blobs get a name a human would give them; anything new is named by its
   content hash so a re-dropped mockup with a fresh image still comes out right. */
const KNOWN = {
  d93887fa179a2e9cac7b6030fde45179: 'brand/talbotiq-logo-header.png',
  '895f3b6829b5c97550ab526042bf88d3': 'brand/talbotiq-logo-footer.png',
  '794dce9a9231ae7db9ef14eabc2ded54': 'about/akhil-gupta.jpg',
};

function dims(buf, ext) {
  if (ext === 'png') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (ext === 'jpg') {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const m = buf[i + 1];
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

const IMG = /<img\b([^>]*?)\ssrc="data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)"([^>]*)>/g;

function extractImages(s, rel, log) {
  const headerEnd = s.indexOf('</header>');
  return s.replace(IMG, (m, before, kind, b64, after, offset) => {
    const buf = Buffer.from(b64, 'base64');
    const ext = kind === 'png' ? 'png' : 'jpg';
    const hash = crypto.createHash('md5').update(buf).digest('hex');
    const file = KNOWN[hash] || `extracted/${hash.slice(0, 12)}.${ext}`;
    const abs = path.join(ROOT, 'assets', file);
    if (!fs.existsSync(abs)) {
      if (!DRY) { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, buf); }
      log(`wrote assets/${file} (${buf.length} bytes)`);
    }
    const d = dims(buf, ext);
    const attrs = before + after;
    let extra = '';
    if (d && !/\bwidth=/.test(attrs)) extra += ` width="${d.w}" height="${d.h}"`;
    /* the header mark is in the first paint; everything else waits its turn */
    if (offset > headerEnd && !/\bloading=/.test(attrs)) extra += ' loading="lazy" decoding="async"';
    return `<img${before} src="/assets/${file}"${after}${extra}>`;
  });
}

/* ---- 1 · Inter, self-hosted ------------------------------------------------ */
const INTER_FILE = '/assets/fonts/inter/Inter-latin.woff2';
const GFONTS = /(?:\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">)?(?:\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>)?\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">/;
const FONT_FACE = `@font-face{font-family:"Inter";font-style:normal;font-weight:400 700;font-display:swap;src:url("${INTER_FILE}") format("woff2")}`;

function selfHostInter(s) {
  if (!GFONTS.test(s)) return s;
  if (!fs.existsSync(path.join(ROOT, INTER_FILE))) throw new Error(`${INTER_FILE} is missing — the pass will not point 24 pages at a font that is not there`);
  s = s.replace(GFONTS, `\n<link rel="preload" href="${INTER_FILE}" as="font" type="font/woff2" crossorigin>`);
  if (!s.includes(FONT_FACE)) s = s.replace('<style>', `<style>\n${FONT_FACE}`);
  return s;
}

/* ---- 3 · breadcrumb ---------------------------------------------------------- */
const CRUMB_CSS = '.crumb{font-size:14px;color:var(--mute,#7C7A7A);margin:0 0 18px}.crumb a{color:var(--green);text-decoration:none;font-weight:600}';
const STAMP_CSS = '.stamp{font-size:13px;color:var(--mute,#7C7A7A);margin:26px auto 0;max-width:920px}';

function ldGraph(s) {
  const m = s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  const j = JSON.parse(m[1]);
  return { raw: m[0], graph: j['@graph'] || [j] };
}

function breadcrumb(s, rel) {
  if (!rel.startsWith('products/') || /class="crumb"/.test(s)) return s;
  const ld = ldGraph(s);
  const app = ld && ld.graph.find((n) => n['@type'] === 'SoftwareApplication');
  const name = (app && app.name) || (s.match(/<title>([^<|—]*)/) || [])[1] || 'Product';
  const out = s.replace(
    /(<div class="hero"[^>]*>\s*<div class="wrap">\s*)(<h1 class="hand">)/,
    `$1<p class="crumb"><a href="/products">Products</a> &rsaquo; ${esc(name.trim())}</p>\n    $2`
  );
  if (out === s) throw new Error(`${rel}: could not find the hero to put a breadcrumb in`);
  return out.includes(CRUMB_CSS) ? out : out.replace('</style>', `${CRUMB_CSS}\n</style>`);
}

/* ---- dates, from git ------------------------------------------------------ */
function git(args) {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; }
}
function dates(rel) {
  const adds = git(['log', '--diff-filter=A', '--follow', '--format=%cs', '--', rel]).split('\n').filter(Boolean);
  const published = adds[adds.length - 1] || TODAY;
  const dirty = git(['status', '--porcelain', '--', rel]) !== '';
  const modified = dirty ? TODAY : (git(['log', '-1', '--format=%cs', '--', rel]) || TODAY);
  return { published, modified: modified < published ? published : modified };
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const human = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

/* ---- 5 · the FAQ block --------------------------------------------------------- */
function faqBlock(faqs, band, stamp) {
  const items = faqs.map((f) =>
    `<details><summary>${esc(f.question)}<span class="pm">+</span></summary><div class="ab">${esc(f.answer)}</div></details>`).join('\n      ');
  return `<!-- seo-pass:faq — generated by tools/seo-pass.js from seo/faq/<slug>.json. Edit the JSON, not this block. -->
<section id="faq"${band ? ' style="background:var(--band)"' : ''}>
  <div class="wrap">
    <div class="rv"><h2 class="hand">Frequently asked <span class="k-g">questions</span></h2></div>
    <div class="acc rv">
      ${items}
    </div>
    <p class="stamp rv">${stamp}</p>
  </div>
</section>
<!-- /seo-pass:faq -->`;
}
const FAQ_RE = /\n?<!-- seo-pass:faq[\s\S]*?<!-- \/seo-pass:faq -->/;

function faq(s, rel, slug, d) {
  const file = path.join(FAQ_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return { s, faqs: null };
  const faqs = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(faqs) || !faqs.length) return { s, faqs: null };
  /* alternate the band with whatever section comes last */
  const body = s.replace(FAQ_RE, '');
  const lastSection = [...body.matchAll(/<section\b[^>]*>/g)].pop();
  const band = !(lastSection && /var\(--band\)/.test(lastSection[0]));
  const stamp = `Published ${human(d.published)} &middot; Updated ${human(d.modified)} &middot; Written by the TalbotIQ team`;
  const block = faqBlock(faqs, band, stamp);
  let out = FAQ_RE.test(s) ? s.replace(FAQ_RE, `\n${block}`) : s.replace(/\n<\/main>/, `\n\n${block}\n</main>`);
  if (!out.includes('seo-pass:faq')) throw new Error(`${rel}: no </main> to put the FAQ before`);
  if (!out.includes(STAMP_CSS)) out = out.replace('</style>', `${STAMP_CSS}\n</style>`);
  return { s: out, faqs };
}

/* ---- 6 · the JSON-LD --------------------------------------------------------- */
function ld(s, rel, { url, title, d, faqs }) {
  const found = ldGraph(s);
  if (!found) return s;
  let graph = found.graph.filter((n) => !(typeof n['@id'] === 'string' && (n['@id'].endsWith('#webpage') || n['@id'].endsWith('#faq'))));
  const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList');
  if (crumbs) {
    crumbs['@id'] = `${url}#breadcrumb`;
    const last = crumbs.itemListElement[crumbs.itemListElement.length - 1];
    if (last && !last.item) last.item = url;
  }
  /* about/contact already carry a WebPage subtype — date that one instead of adding a twin */
  let pageNode = graph.find((n) => ['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage'].includes(n['@type']));
  if (!pageNode) { pageNode = { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title }; graph.push(pageNode); }
  Object.assign(pageNode, {
    inLanguage: 'en',
    datePublished: d.published,
    dateModified: d.modified,
    isPartOf: { '@type': 'WebSite', '@id': `${SITE.siteUrl}/#website` },
    publisher: { '@id': `${SITE.siteUrl}/#org` },
  });
  if (crumbs) pageNode.breadcrumb = { '@id': `${url}#breadcrumb` };
  if (faqs) {
    graph.push({
      '@type': 'FAQPage', '@id': `${url}#faq`,
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    });
  }
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return s.replace(found.raw, `<script type="application/ld+json">${json}</script>`);
}

/* ---- 4 · title + description -------------------------------------------------- */
function meta(s, rel) {
  const key = rel.replace(/\.html$/, '');
  const m = META[key];
  if (!m) return s;
  if (m.title.length > 60) throw new Error(`${key}: title is ${m.title.length} chars (limit 60)`);
  if (m.description.length > 155) throw new Error(`${key}: description is ${m.description.length} chars (limit 155)`);
  s = s.replace(/<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`);
  s = s.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(m.description)}">`);
  return s;
}

/* ---- 7 · demo videos load on scroll, not on parse -------------------------- */
function video(s) {
  /* two generations of the tag exist: preload="metadata" on four pages and
     preload="none" on the rest, all with autoplay — which overrides preload and
     fetches the whole file regardless. Both come out the same. */
  s = s.replace(/<video id="demoVid" autoplay muted loop playsinline preload="(?:metadata|none)"/g,
    '<video id="demoVid" muted loop playsinline preload="none"');
  /* the observer used to refuse to touch a video that had not loaded — which
     was fine while autoplay did the loading. Now the first scroll-in is what
     asks for the file, and a not-yet-loaded video is left alone on scroll-out. */
  s = s.replace(
    "if(!w.classList.contains('playing')) return;\n        if(e.isIntersecting){ v.play().catch(function(){}); } else { v.pause(); }",
    "if(e.isIntersecting){ v.play().catch(function(){}); } else if(w.classList.contains('playing')){ v.pause(); }");
  /* reduced motion never observes, so it has to ask for the file itself —
     the same full download it always made, with controls, as before */
  const REDUCE_LINE = "    if(reduce && v.preload==='none'){ v.preload='auto'; v.load(); }\n";
  s = s.split(REDUCE_LINE).join('');   /* idempotent: strip, then insert once */
  s = s.replace("    v.addEventListener('loadeddata',onReady);\n", REDUCE_LINE + "    v.addEventListener('loadeddata',onReady);\n");
  return s;
}

/* ---- run -------------------------------------------------------------------- */
let touched = 0;
const notes = [];
for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  const before = fs.readFileSync(file, 'utf8');
  const log = (m) => notes.push(`  ${rel}: ${m}`);
  let s = before;

  s = extractImages(s, rel, log);
  s = selfHostInter(s);
  s = breadcrumb(s, rel);
  /* the solution pages' crumb and their "See all solutions" button both pointed
     at /#solutions — an anchor the homepage does not have. /solutions is a page now. */
  s = s.replace(/href="\/#solutions"/g, 'href="/solutions"');
  /* the root pages' no-script nav bar and phone bar link Products at the
     homepage tile grid; the hub lists all seventeen pages, the grid ten */
  if (!rel.includes('/')) s = s.replace(/(<a )href="\/#products"(>Products<\/a>)/g, '$1href="/products"$2');
  s = meta(s, rel);
  s = video(s);

  const url = (s.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  const title = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (url && !/noindex/.test(s)) {
    const slug = path.basename(rel, '.html');
    const d = dates(rel);
    const r = faq(s, rel, slug, d);
    s = r.s;
    s = ld(s, rel, { url, title: title.replace(/&amp;/g, '&'), d, faqs: r.faqs });
    if (r.faqs) log(`${r.faqs.length} FAQs · published ${d.published} · updated ${d.modified}`);
  }

  if (s !== before) {
    touched++;
    if (!DRY) fs.writeFileSync(file, s, 'utf8');
    log(`${(Buffer.byteLength(before) / 1024).toFixed(0)} kB -> ${(Buffer.byteLength(s) / 1024).toFixed(0)} kB`);
  }
}
if (notes.length) console.log(notes.join('\n'));
console.log(`${DRY ? '[dry] ' : ''}seo-pass — ${touched} of ${PAGES.length} pages changed`);
