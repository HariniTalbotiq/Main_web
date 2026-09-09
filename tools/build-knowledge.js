#!/usr/bin/env node
/* BUILDS THE CHATBOT'S ONLY SOURCE OF TRUTH.
 *
 *   node tools/build-knowledge.js   ->  api/knowledge.json
 *
 * Reads the site's own committed HTML and keeps the readable text of each
 * page's <main>. That is the whole knowledge base. Three consequences worth
 * being explicit about, because they are the point rather than a side effect:
 *
 *  1. It CANNOT ingest private data. It never opens a socket, never signs in
 *     anywhere and never touches the deployed product apps — it reads files
 *     that are already public because they are already served to every
 *     visitor. There is no path by which a customer's CRM row, a meeting
 *     recording or an employee record could reach it.
 *  2. It cannot drift. Re-run it after a copy change and the assistant knows
 *     the new copy. Nothing is cached anywhere else.
 *  3. <main> is the whole filter. The header, nav panels, drawer and footer
 *     are identical on all 20 pages; keeping them would repeat the same
 *     navigation boilerplate twenty times and drown the actual answers.
 *
 * Zero dependencies, like everything else in this repo. Re-runnable: same
 * input, same output, byte for byte.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'api', 'knowledge.json');

/* THE SITE IS WHAT ITS OWN NAVIGATION REACHES.
 *
 * This used to be a hand-written list of twenty paths. Within a day the list
 * was wrong: three more product pages appeared in the tree and the assistant
 * would have gone on describing a site that no longer existed — the exact
 * failure the derived scope in api/chat.js is meant to prevent, reintroduced
 * one file over.
 *
 * A blind glob is not the answer either, and this is the interesting half. At
 * the time of writing, products/ holds SIX interviewer pages: video, voice and
 * chat, which index.html links, and avatar, recorded and two-way, which
 * nothing links — a rename in progress. Globbing would teach the assistant
 * both vocabularies at once, so a visitor asking about interviewing could be
 * told about the "2-Way Interview" while every link on the site says "Chat
 * Interview". That is worse than being a page behind.
 *
 * So the page set is CRAWLED from index.html, following local .html links as
 * far as they go. A page a visitor can reach is in; an orphan is out, and
 * becomes part of the corpus the moment something links to it. The run prints
 * the set and the orphans it skipped, so neither is a silent decision.
 */
const ENTRY = 'index.html';

function discover() {
  const seen = new Set([ENTRY]);
  const queue = [ENTRY];
  while (queue.length) {
    const rel = queue.shift();
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const from = path.dirname(rel);
    /* THE LINKS LOST THEIR EXTENSION, so this stopped matching them. The site
       runs on `cleanUrls`: every href is now `/products/video-interview`, and a
       pattern that insists on `.html` crawls index.html, finds nothing, and
       hands the assistant a three-page corpus while reporting the other
       twenty-three as orphans — which reads like a content problem and is
       actually this regex.

       So the extension is optional in the match and re-attached below. `/`
       resolves to index.html; anything with a real extension that is not .html
       (an image, a PDF) is not a page and is skipped. */
    for (const m of html.matchAll(/href="(\/|[^"#?:][^"#?]*?)(?:[#?][^"]*)?"/g)) {
      /* off-site, and the schemes that are not files */
      if (/^(?:https?:|mailto:|tel:|\/\/)/.test(m[1])) continue;
      const href = m[1].replace(/\.html$/, '');
      if (/\.[A-Za-z0-9]+$/.test(href)) continue;   /* asset, not a page */
      /* `/` is the root index, and it is resolved BEFORE the join — not by
         renaming it to "index" first, which makes it look relative and lands
         it in whatever directory the linking page happens to sit in. */
      const next = href === '/'
        ? ENTRY
        : path
            .normalize(path.join(href.charAt(0) === '/' ? '.' : from, href.replace(/^\//, '')))
            .split(path.sep).join('/') + '.html';
      /* nothing outside the served tree, and none of the reference material */
      if (next.startsWith('..') || /^(?:design|archive|\.archive|research)\//.test(next)) continue;
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return [...seen].sort();
}

const PAGES = discover();

/* every .html actually in the served tree, so the orphans can be named */
const ALL = ['.', 'products', 'solutions'].flatMap((d) => {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith('.html'))
    .map((f) => (d === '.' ? f : d + '/' + f));
}).sort();
const ORPHANS = ALL.filter((f) => PAGES.indexOf(f) < 0);

/* A page with almost no text means an extraction rule broke, not that the
   page is short. signin.html is the real floor at ~650 characters. */
const MIN_CHARS = 300;

const ENT = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…', middot: '·',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  times: '×', deg: '°', trade: '™', copy: '©',
  reg: '®', shy: '', zwnj: '', laquo: '«', raquo: '»',
};

const unent = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENT ? ENT[n.toLowerCase()] : m));

function readable(html) {
  return unent(html
    /* things that are markup or decoration, never prose */
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    /* headings survive as headings: the assistant answers far better when it
       can see which sentence is a section title and which is body copy */
    .replace(/<h[1-6][^>]*>/gi, '\n\n## ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<(?:p|div|section|tr|br|dt|dd|figcaption)\b[^>]*>/gi, '\n')
    .replace(/<\/(?:p|div|section|tr|ul|ol|dl|table|article|figure)>/gi, '\n')
    /* inline wrappers vanish; only block-level tags leave whitespace behind.
       Otherwise a keyword span before a full stop reads "intelligence ." */
    .replace(/<\/?(?:span|b|i|em|strong|a|code|sup|sub|u|mark|small|abbr|time)\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* Cuts a whole element out, brackets balanced, so nested <div>s inside it do
   not end the cut early. Needed for one thing today: div.ph, the "Demo video
   goes here — drop the file at assets/<slug>-demo.mp4, H.264, under 8 MB"
   placeholder that sits inside <main> on all eleven product pages. That is a
   note from the build to whoever supplies the footage. It is not something a
   visitor should ever hear an assistant say back to them. */
function cutBlock(html, cls) {
  const open = new RegExp(`<div class="${cls}"[^>]*>`, 'g');
  let m;
  while ((m = open.exec(html))) {
    let i = m.index + m[0].length;
    let depth = 1;
    const tag = /<(\/?)div\b[^>]*>/g;
    tag.lastIndex = i;
    let t;
    while (depth > 0 && (t = tag.exec(html))) {
      depth += t[1] ? -1 : 1;
      i = t.index + t[0].length;
    }
    /* unbalanced markup: leave the page alone rather than truncate it */
    if (depth !== 0) return html;
    html = html.slice(0, m.index) + ' ' + html.slice(i);
    open.lastIndex = m.index;
  }
  return html;
}

const pick = (html, re) => { const m = html.match(re); return m ? unent(m[1]).trim() : ''; };

const docs = [];
const problems = [];

for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { problems.push(`${rel}: file is missing`); continue; }
  const html = fs.readFileSync(file, 'utf8');

  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (!main) { problems.push(`${rel}: no <main> element — nothing to extract`); continue; }

  const text = readable(cutBlock(main[1], 'ph'));
  if (text.length < MIN_CHARS) {
    problems.push(`${rel}: only ${text.length} readable characters, expected >= ${MIN_CHARS}`);
    continue;
  }

  docs.push({
    /* the path a visitor would type, which is also the path the assistant
       cites — so the citation is always a link that actually resolves */
    url: '/' + rel,
    title: pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    summary: pick(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i),
    text,
  });
}

if (problems.length) {
  console.error('knowledge base NOT written — ' + problems.length + ' page(s) failed extraction:');
  problems.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}

fs.writeFileSync(OUT, JSON.stringify(docs, null, 1) + '\n', 'utf8');

if (ORPHANS.length) {
  console.log(
    `skipped ${ORPHANS.length} page(s) nothing links to, so the assistant will not `
    + `offer them until something does:`
  );
  ORPHANS.forEach((f) => console.log('  - ' + f));
}

const chars = docs.reduce((n, d) => n + d.text.length, 0);
console.log(
  `api/knowledge.json — ${docs.length} pages · ${(chars / 1024).toFixed(1)}kB of prose`
  + ` · ~${Math.round(chars / 4).toLocaleString('en-US')} tokens`
  + ` (fits one request, so every answer sees the whole site)`
);
