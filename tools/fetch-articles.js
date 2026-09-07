/* =============================================================================
   FETCH-ARTICLES — regenerate articles.js from The Edge Malaysia
   -----------------------------------------------------------------------------
       node tools/fetch-articles.js            # refresh from the live author index
       node tools/fetch-articles.js --dry      # print what would change, write nothing

   WHY THIS EXISTS. The article list on the homepage is not typed by hand. It is
   pulled from the publisher's own data and written straight to `articles.js`, so
   no title, date or summary on our page can drift from what The Edge actually
   published. When a new column goes up, run this and rebuild — that is the whole
   "add a new article" procedure.

   HOW IT WORKS. theedgemalaysia.com is a Next.js site: every page ships its
   server data in a <script id="__NEXT_DATA__"> tag. The author index puts its
   rows in `props.pageProps.authorData`, which also carries `total`, `limit` and
   `offset` — so pagination is followed until the rows run out, and the run is
   cross-checked against `total` at the end. Nothing is scraped out of rendered
   HTML, which is why this does not break when they restyle the site.

   NOTHING IS REWRITTEN. Titles, dates and summaries are copied verbatim. The
   publisher truncates its own summaries mid-word ("...reshaping surgical
   procedu...") and that truncation is preserved, because it is what the source
   says. The ONLY normalisation is stripping zero-width characters out of byline
   text — their CMS leaves them in some records and they are invisible anyway.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const AUTHOR = 'Akhil Gupta';
const ORIGIN = 'https://theedgemalaysia.com';
const OUT = path.join(__dirname, '..', 'articles.js');
const MAX_PAGES = 25;              // a stop, so a pagination change cannot loop forever
const DRY = process.argv.includes('--dry');

/* Their CMS leaves zero-width spaces and BOMs in some byline fields. Invisible
   on screen, so removing them changes nothing a reader can see — and it keeps
   one author's name from sorting and comparing differently from another's. */
const clean = (s) => String(s == null ? '' : s)
  .replace(/[​-‍﻿⁠]/g, '')
  .replace(/[ \t]+/g, ' ')
  .trim();

function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no __NEXT_DATA__ in response — the site structure changed');
  return JSON.parse(m[1]);
}

async function fetchPage(page) {
  const url = `${ORIGIN}/author/${encodeURIComponent(AUTHOR)}?page=${page}`;
  const res = await fetch(url, { headers: { 'user-agent': 'talbotiq-site-build/1.0' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const data = nextData(await res.text());
  const a = data.props && data.props.pageProps && data.props.pageProps.authorData;
  if (!a) throw new Error(`${url} -> no authorData in pageProps`);
  return { rows: Array.isArray(a.results) ? a.results : [], total: a.total, limit: a.limit, offset: a.offset };
}

/* One source row -> one record on our side. Only the fields the card needs. */
function toRecord(r) {
  return {
    nid: r.nid,
    title: clean(r.title),
    date: String(r.created || '').slice(0, 10),   // the source gives YYYY-MM-DD here
    author: clean(r.author),
    summary: clean(r.summary),
    img: r.img || null,
    caption: clean(r.caption) || null,
    section: clean(r.flash) || null,              // "Edge Weekly" / "Opinion"
  };
}

function serialise(records, meta) {
  const body = records.map((r) => '  {\n'
    + `    nid: ${r.nid},\n`
    + `    title: ${JSON.stringify(r.title)},\n`
    + `    date: ${JSON.stringify(r.date)},\n`
    + `    author: ${JSON.stringify(r.author)},\n`
    + `    summary: ${JSON.stringify(r.summary)},\n`
    + `    img: ${JSON.stringify(r.img)},\n`
    + `    caption: ${JSON.stringify(r.caption)},\n`
    + `    section: ${JSON.stringify(r.section)},\n`
    + '  },').join('\n');

  return `/* =============================================================================
   ARTICLES — published columns by ${AUTHOR}, in ${meta.publisher}
   -----------------------------------------------------------------------------
   GENERATED FILE. Do not edit by hand — \`node tools/fetch-articles.js\` will
   overwrite it. Every field below is copied verbatim from the publisher's own
   page data (see the header of that script). Summaries are truncated by THEM,
   not by us.

   Fetched from ${ORIGIN}/author/${encodeURIComponent(AUTHOR)}
   ${meta.count} articles · the publisher's own total was ${meta.total} · ${meta.pages} page(s) followed
   ========================================================================== */

const PUBLISHER = {
  name: ${JSON.stringify(meta.publisher)},
  origin: ${JSON.stringify(ORIGIN)},
  authorIndex: ${JSON.stringify(`${ORIGIN}/author/${encodeURIComponent(AUTHOR)}`)},
};

/* Newest first, which is the order the publisher's own index uses. */
const ARTICLES = [
${body}
];

/* The canonical article URL. The source gives an alias of "node/<nid>", and
   that is what the author index links to, so it is what we link to. */
const articleUrl = (a) => \`\${PUBLISHER.origin}/node/\${a.nid}\`;

module.exports = { PUBLISHER, ARTICLES, articleUrl };
`;
}

(async () => {
  const all = [];
  const seen = new Set();
  let total = null;
  let pages = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { rows, total: t } = await fetchPage(page);
    pages = page;
    if (total === null) total = t;
    if (!rows.length) break;                       // the index has run out
    for (const r of rows) {
      if (seen.has(r.nid)) continue;               // guard against overlapping pages
      seen.add(r.nid);
      all.push(toRecord(r));
    }
    if (typeof total === 'number' && all.length >= total) {
      /* Confirm the next page really is empty rather than trusting `total`. */
      const { rows: after } = await fetchPage(page + 1);
      pages = page + 1;
      if (!after.length) break;
      for (const r of after) {
        if (!seen.has(r.nid)) { seen.add(r.nid); all.push(toRecord(r)); }
      }
    }
  }

  if (!all.length) throw new Error('no articles found — refusing to write an empty file');

  /* Loud about a mismatch rather than silently shipping a short list. */
  if (typeof total === 'number' && all.length !== total) {
    console.warn(`  ! the publisher reports ${total} articles but ${all.length} were collected`);
  }

  const missingImg = all.filter((a) => !a.img).map((a) => a.nid);
  const missingSummary = all.filter((a) => !a.summary).map((a) => a.nid);
  const notCredited = all.filter((a) => !/akhil\s+gupta/i.test(a.author)).map((a) => a.nid);

  const out = serialise(all, { publisher: 'The Edge Malaysia', count: all.length, total, pages });

  if (DRY) {
    const prev = fs.existsSync(OUT) ? require(OUT).ARTICLES : [];
    const prevIds = new Set(prev.map((p) => p.nid));
    const added = all.filter((a) => !prevIds.has(a.nid));
    console.log(`dry run — ${all.length} article(s) live, ${prev.length} in articles.js`);
    if (added.length) added.forEach((a) => console.log(`  + ${a.date}  ${a.title}`));
    else console.log('  no new articles');
  } else {
    fs.writeFileSync(OUT, out, 'utf8');
    console.log(`articles.js — ${all.length} article(s) from ${pages} page(s) fetched, publisher total ${total}`);
  }

  if (missingImg.length) console.log(`  · no image: ${missingImg.join(', ')}`);
  if (missingSummary.length) console.log(`  · no summary: ${missingSummary.join(', ')}`);
  if (notCredited.length) console.log(`  · byline does not name ${AUTHOR}: ${notCredited.join(', ')}`);
})().catch((e) => {
  console.error('\nFETCH FAILED — articles.js left untouched\n  ' + e.message + '\n');
  process.exit(1);
});
