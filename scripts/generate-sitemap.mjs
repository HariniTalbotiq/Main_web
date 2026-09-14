/* =============================================================================
   SITEMAP + llms.txt — walked from the tree, never hand-kept
   -----------------------------------------------------------------------------
   A hand-written sitemap is wrong the first time somebody adds a page and does
   not think about it, and nobody thinks about it. This walks the served tree
   instead, so the sitemap is a fact about the repo rather than a promise
   somebody made once.

   ZERO DEPENDENCIES, deliberately. The one job of this file is to still run in
   three years. Anything it imported would be a thing that could stop resolving,
   and a sitemap generator that fails the build is worse than no generator.

   URLs are emitted the way the site actually serves them: `cleanUrls` is on, so
   products/video-interview.html is /products/video-interview, index.html is the
   bare origin, and products/index.html is /products. A sitemap listing a URL
   that 308s somewhere else is a sitemap telling Google two things at once.

   <lastmod> IS READ FROM GIT — the last commit that touched the file, or today
   if the file has uncommitted changes. Google uses lastmod only when it proves
   consistently truthful, which is exactly the property a value derived from
   history has and a hand-typed date does not.

   llms.txt IS WRITTEN FROM THE SAME WALK. Google has said it does not use the
   file and no major assistant has confirmed reading it; it is here because it
   costs one loop and Lighthouse looks for it, not because it moves anything.

   Run: node scripts/generate-sitemap.mjs   (or: npm run sitemap)
   ========================================================================== */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CFG = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const TODAY = new Date().toISOString().slice(0, 10);

/* Directories that are not the website. `design` and `research` are reference
   material, `.archive` is the previous site, and the dotted ones are tooling. */
const SKIP_DIR = new Set([
  'node_modules', '.git', '.vercel', 'design', 'research', 'docs', 'seo',
  'archive', '.archive', 'assets', 'api', 'tools', 'scripts', '.impeccable', '.playwright-mcp',
]);

/* Pages that exist but do not belong in an index. 404 is not a destination,
   and signin is a door for people who already know it is there — it carries no
   content to rank and nothing links to it. */
const SKIP_PAGE = new Set(['404.html', 'signin.html']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIR.has(name) && !name.startsWith('.')) walk(full, out);
    } else if (name.endsWith('.html') && !SKIP_PAGE.has(name)) {
      out.push(relative(ROOT, full).split(sep).join('/'));
    }
  }
  return out;
}

const git = (args) => {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; }
};
function lastmod(file) {
  if (git(['status', '--porcelain', '--', file])) return TODAY;
  return git(['log', '-1', '--format=%cs', '--', file]) || TODAY;
}
const url = (f) => {
  const p = '/' + f.replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '');
  return p === '/' ? '/' : p.replace(/\/$/, '');
};
const text = (html, re) => { const m = html.match(re); return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&mdash;/g, '—').trim() : ''; };

const pages = walk(ROOT)
  .map((f) => {
    const html = readFileSync(join(ROOT, f), 'utf8');
    return {
      file: f,
      url: url(f),
      noindex: /<meta name="robots" content="noindex/.test(html),
      title: text(html, /<title>([^<]*)<\/title>/),
      description: text(html, /<meta name="description" content="([^"]*)"/),
      lastmod: lastmod(f),
    };
  })
  .filter((p) => !p.noindex)
  .sort((a, b) => (a.url === '/' ? -1 : b.url === '/' ? 1 : a.url.localeCompare(b.url)));

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages.map((p) => `  <url><loc>${CFG.siteUrl}${p.url === '/' ? '/' : p.url}</loc><lastmod>${p.lastmod}</lastmod></url>`).join('\n') +
  '\n</urlset>\n';
/* ---- DO NOT CLOBBER A HAND-SUPPLIED SITEMAP -----------------------------
   A sitemap.xml was supplied by the marketing side on 2026-09-11 with an
   instruction to publish it exactly as given, and this generator runs inside
   "npm run site" -- so without a guard the very next build would silently
   delete it and nobody would know until a crawl came back different.

   The test is the generator's OWN signature, not a guess about what a foreign
   file looks like: anything this script writes carries the marker below, so a
   sitemap.xml WITHOUT it did not come from here and is left alone. Pass
   --force to overwrite deliberately, or just delete sitemap.xml and re-run.

   THE TRADE IS REAL AND IS RECORDED AT THE TOP OF THIS FILE: a hand-kept
   sitemap goes stale the first time somebody adds a page. The supplied file is
   already missing /products/voice-interview, which this walk finds and it does
   not list. Removing the hand-supplied file and re-running is the fix. */
const SITEMAP_MARK = '<!-- generated by scripts/generate-sitemap.mjs -->';
const stamped = xml.replace(/(<\?xml[^>]*\?>\n)/, `$1${SITEMAP_MARK}\n`);
const sitemapPath = join(ROOT, 'sitemap.xml');
let existing = null;
try { existing = readFileSync(sitemapPath, 'utf8'); } catch (e) { /* first run */ }
const handKept = existing !== null && !existing.includes(SITEMAP_MARK);
if (handKept && !process.argv.includes('--force')) {
  console.log('sitemap.xml — LEFT ALONE: it was not written by this generator.');
  console.log('  A hand-supplied sitemap is in place. Re-run with --force to overwrite it,');
  console.log('  or delete sitemap.xml and re-run to go back to a generated one.');
} else {
  writeFileSync(sitemapPath, stamped, 'utf8');
}

/* llms.txt: the llmstxt.org shape — an H1, a blockquote summary, then sections
   of "- [title](url): description" links. Grouped the way the site is. */
const group = (re) => pages.filter((p) => re.test(p.url));
const line = (p) => `- [${p.title.replace(/\s*[|—]\s*TalbotIQ$/, '').replace(/^TalbotIQ\s*[—|]\s*/, '')}](${CFG.siteUrl}${p.url === '/' ? '/' : p.url}): ${p.description}`;
const home = pages.find((p) => p.url === '/');
const llms = [
  `# ${CFG.siteName}`,
  '',
  `> ${home ? home.description : ''}`,
  '',
  `${CFG.siteName} (Talbotiq Technologies Sdn Bhd, Kuala Lumpur, Malaysia) builds AI interview and recruitment software, a sales CRM, an ERP for SMEs, document and meeting-notes tools, and a private AI engine the products run on. Pricing is quote-based; there is no public price list. Facts on these pages are written from the running products and each page states what the product does not do.`,
  '',
  '## Interview and hiring software',
  ...group(/^\/products$/).map(line),
  ...group(/^\/products\/(video|recorded|ai-avatar|two-way|voice|chat|conversational|mcq|timed|mimic|recruitment)/).map(line),
  '',
  '## Business software',
  ...group(/^\/products\/(business|sales|task|document|note|vawlt)/).map(line),
  '',
  '## Services',
  ...group(/^\/solutions(\/|$)/).map(line),
  '',
  '## Company',
  ...group(/^\/(about|contact|demo)$/).map(line),
  '',
  '## Optional',
  `- [Sitemap](${CFG.siteUrl}/sitemap.xml)`,
  '',
].join('\n');
writeFileSync(join(ROOT, 'llms.txt'), llms, 'utf8');

const llmsLinks = llms.split('\n').filter((l) => l.startsWith('- [')).length;
/* Report what actually happened. Saying "27 URLs" after declining to write
   the file would be a log that lies about its own side effect. */
console.log(handKept && !process.argv.includes('--force')
  ? `sitemap.xml — not written (hand-supplied file kept) · llms.txt — ${llmsLinks} links`
  : `sitemap.xml — ${pages.length} URLs on ${CFG.siteUrl} · llms.txt — ${llmsLinks} links`);
