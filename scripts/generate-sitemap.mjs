/* =============================================================================
   SITEMAP — walked from the tree, never hand-kept
   -----------------------------------------------------------------------------
   A hand-written sitemap is wrong the first time somebody adds a page and does
   not think about it, and nobody thinks about it. This walks the served tree
   instead, so the sitemap is a fact about the repo rather than a promise
   somebody made once.

   ZERO DEPENDENCIES, deliberately. The one job of this file is to still run in
   three years. Anything it imported would be a thing that could stop resolving,
   and a sitemap generator that fails the build is worse than no generator.

   URLs are emitted the way the site actually serves them: `cleanUrls` is on, so
   products/video-interview.html is /products/video-interview and index.html is
   the bare origin. A sitemap listing a URL that 308s somewhere else is a
   sitemap telling Google two things at once.

   Run: node scripts/generate-sitemap.mjs   (or: npm run sitemap)
   ========================================================================== */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CFG = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));

/* Directories that are not the website. `design` and `research` are reference
   material, `.archive` is the previous site, and the dotted ones are tooling. */
const SKIP_DIR = new Set([
  'node_modules', '.git', '.vercel', 'design', 'research',
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

const urls = walk(ROOT)
  .map((f) => (f === 'index.html' ? '/' : '/' + f.replace(/\.html$/, '')))
  .sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  <url><loc>${CFG.siteUrl}${u === '/' ? '/' : u}</loc></url>`).join('\n') +
  '\n</urlset>\n';

writeFileSync(join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`sitemap.xml — ${urls.length} URLs on ${CFG.siteUrl}`);
