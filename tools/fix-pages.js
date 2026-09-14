/* =============================================================================
   FIX-PAGES — make the supplied page mockups shippable
   -----------------------------------------------------------------------------
       node tools/fix-pages.js              # rewrite in place
       node tools/fix-pages.js --dry        # report only, change nothing
       node tools/fix-pages.js --verbose    # show which rules fire, per page

   Covers `about.html` and every `products/*.html`. Supersedes the earlier
   fix-product-pages.js, which only knew about products/ and hard-coded `../`
   into every path.

   WHY THIS EXISTS. Each page arrives as a standalone mockup in which EVERY
   link is `href="#"` — 37 on the about page, 33 on each product page. That
   makes them dead ends: you can click into one from the homepage and never get
   back. This points them at the destinations the homepage already knows, so a
   page and the homepage cannot disagree about where "Contact us" goes.

   IT IS DEPTH-AWARE. `about.html` sits at the root and `products/*.html` one
   level down, so "the homepage" is `index.html` from one and `../index.html`
   from the other. Every rule is built per page from its own depth — see
   `rules(rel)`, from the page's own path. Getting this wrong is silent — the
   link still exists, it just 404s — so every run ends by resolving every local
   href against the filesystem.

   IT ALSO FIXES THE STRUCTURAL BUGS the mockups shipped with (§2, §3) and
   swaps the display face to MESHED Display (§4), re-aiming the highlighter
   that was positioned for the old one (§5).

   IT IS RE-RUNNABLE AND IDEMPOTENT. Every rule matches only the broken state,
   so a second run changes nothing. That matters because these are mockups:
   when a new version of a page is dropped in, re-run this instead of redoing
   the work by hand.

   WHERE NO DESTINATION EXISTS — Memberships, Careers, Terms, Security, Privacy
   Policy, AI Governance & Security — the `href` is REMOVED rather than left on
   "#". An
   <a> with no href is not a link: not focusable, no pointer cursor, and it
   cannot promise a page that does not exist. It keeps the footer's styling
   because it is still an <a>.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { COMPANY } = require('../products.js');
const { SOLUTIONS } = require('../home.js');
/* The share card's URL comes from site.config.json, which build.js also reads,
   so the generated pages and these hand-written ones cannot name two different
   images. Renaming the card is then a one-line change in one file. */
const SITE_CFG = JSON.parse(
  require('fs').readFileSync(require('path').join(__dirname, '..', 'site.config.json'), 'utf8'));
const OG_IMAGE = SITE_CFG.siteUrl.replace(/\/$/, '') + SITE_CFG.defaultOgImage;
const OG_ALT = SITE_CFG.siteName + ' — Every workflow, running on intelligence.';

const ROOT = path.join(__dirname, '..');
/* VERCEL.JSON IS THE ROUTING RECORD, so this reads it rather than restating
   it. Two things come out of it.

   cleanUrls — the site is written as /contact, and there is no file at that
   path. The resolver at the bottom of this script needs to know that before
   it can tell a dead link from a live one.

   redirects — every page rename the site has been through is recorded there,
   because the old URL has to keep working. Following that chain is what stops
   the slug tables below from rotting: products/ats.html became
   products/recruitment-software.html and fourteen of the seventeen slugs here
   were left pointing at files that no longer exist. Now a rename only has to
   be written down once, in the place it was going to be written anyway. */
const VERCEL = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')); }
  catch (e) { return {}; }
})();
const CLEAN_URLS = VERCEL.cleanUrls === true;
const REDIRECTS = new Map((VERCEL.redirects || [])
  .filter((r) => r && r.source && r.destination && !r.source.includes(':'))
  .map((r) => [r.source, r.destination]));
/* Follow the chain — /products/task-management-system reaches /task-manager
   in two hops — with a bound, so a cycle in vercel.json cannot hang the run. */
const live = (url) => {
  let u = url;
  for (let i = 0; i < 8 && REDIRECTS.has(u); i++) u = REDIRECTS.get(u);
  return u;
};

const DRY = process.argv.includes('--dry');
const VERBOSE = process.argv.includes('--verbose');

/* Product name as the pages print it -> its slug.
   TWO GENERATIONS OF NAMES LIVE HERE AT ONCE, on purpose. The older mockups
   print "Mimic", "NousCRM" and "Vawlt"; the newer ones print the suite as the
   homepage now prints it — Mimic split into three interviewer products, and
   NousCRM and Vawlt renamed to what the tiles call them. Every spelling maps
   to the page that actually exists, so a page from either generation resolves
   and no page has to be rewritten to match the other. */
const PRODUCTS = {
  Mimic: 'mimic',
  'Video Interview': 'video-interviewer',
  'Voice Interview': 'voice-interviewer',
  'Chat Interview': 'chat-interviewer',
  'Conversational AI Avatar Interview': 'avatar-interviewer',
  'Recorded Video Interview': 'recorded-interviewer',
  '2-Way Interview': 'two-way-interviewer',
  MCQs: 'mcqs',
  'Timed Q&amp;A': 'timed-qa',
  'Conversational Chat Interview': 'conversational-interview',
  ATS: 'ats',
  ERP: 'erp',
  NousCRM: 'nouscrm',
  CRM: 'nouscrm',
  tasca: 'tasca',
  Recapr: 'recapr',
  Lexer: 'lexer',
  Vawlt: 'vawlt',
  'Private AI Engine': 'vawlt',
};

/* The interviewer pages cross-refer to each other MID-SENTENCE in their own
   honest-note, with the round's short name rather than the product's:
   "…why the Voice and Chat rounds exist…". Same destinations as above, keyed
   on the short label, and matched together with the inline style the note
   uses so no other one-word link can be caught by them. */
const ROUND_LINKS = {
  Video: 'video-interviewer',
  Voice: 'voice-interviewer',
  Chat: 'chat-interviewer',
  Avatar: 'avatar-interviewer',
  Recorded: 'recorded-interviewer',
  '2-Way': 'two-way-interviewer',
  'Timed Q&amp;A': 'timed-qa',
};

/* Solution name as the pages print it -> live URL, from home.js. A null means
   no page exists yet and the href comes off. */
const SOLUTION_URL = {};
for (const s of SOLUTIONS) SOLUTION_URL[s.name] = s.url;

/* Solutions we now ship a page for. Local beats talbotiq.com, the same rule
   the product tiles follow. Add a line as each further service page arrives. */
const SOLUTION_LOCAL = {
  'AI Strategy & Consulting': '/solutions/ai-strategy-consulting',
  'Embedded Edge AI': '/solutions/embedded-edge-ai',
  /* home.js calls it "Dev", the mockups call it "Development" — the ALIASES
     table below copies this entry onto that spelling too. */
  'Full Stack Dev & AI Integration': '/solutions/full-stack-ai-integration',
  'AI Agent & Bot Development': '/solutions/ai-agent-bot-development',
};

/* THE MOCKUPS DISAGREE WITH EACH OTHER ON TWO OF THESE NAMES. The service
   page prints "AI Agents & Bots Development" and "Full Stack Development & AI
   Integration"; the product and about pages — and home.js — use "AI Agent &
   Bot Development" and "Full Stack Dev & AI Integration". Picking a winner is
   a copy decision, not a link-fixing one, so every spelling is mapped to the
   same destination and the disagreement is flagged in the README instead. */
const ALIASES = {
  'AI Agents & Bots Development': 'AI Agent & Bot Development',
  'Full Stack Development & AI Integration': 'Full Stack Dev & AI Integration',
};
for (const [variant, canonical] of Object.entries(ALIASES)) {
  if (SOLUTION_URL[canonical]) SOLUTION_URL[variant] = SOLUTION_URL[canonical];
  if (SOLUTION_LOCAL[canonical]) SOLUTION_LOCAL[variant] = SOLUTION_LOCAL[canonical];
}

/* Every solution name any page might print. */
const SOLUTION_NAMES = [...new Set([...Object.keys(SOLUTION_URL), ...Object.keys(SOLUTION_LOCAL)])];

/* The services index, for the about page's "Solutions" nav item. The homepage
   opens a panel there instead, which a standalone page cannot do. */
const SERVICES_INDEX = COMPANY.site + '/services/';

/* THE OFFICE NUMBER, PRINTED, IN THE CONTACT BLOCK. Requested: the WhatsApp
   link beside the email is replaced by the number itself with a handset next
   to it. This is a deliberate exception to the "no digits" rule enforced
   further down — see the note on that rule, which now records why the contact
   block is carved out of it.

   currentColor on the icon means it inherits `.contact a`'s green, so it can
   never drift from the email link directly above it. The href is the E.164
   form with no spaces, which is what a dialler needs; the visible text keeps
   the grouping the number is actually written in. aria-hidden on the svg
   because the link text already says the number — a screen reader announcing
   "image, phone" first would just be noise. */
const PHONE_DISPLAY = '+603 20 111 320';
const PHONE_TEL = '+60320111320';
const PHONE_ROW = '<a class="tel" href="tel:' + PHONE_TEL + '">'
  + '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
  + '<path fill="currentColor" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24'
  + 'l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3'
  + '-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21'
  + 'c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>'
  + PHONE_DISPLAY + '</a>';

const rx = (s, flags) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags || 'g');

/* An <a> around `label` whose href is EITHER the untouched mockup's "#" or the
   old site's services index that the previous rule left there. One regex so a
   migrating page and a fresh mockup take the same path. */
const rx_both = (label) => new RegExp(
  '<a href="(?:#|' + SERVICES_INDEX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  + ')"(?: target="_blank" rel="noopener")?>' + label + '</a>', 'g');

function rules(rel) {
  /* Everything a rule needs about WHERE this page sits, derived in one place. */
  const dir = path.dirname(rel);          // '.', 'products' or 'solutions'
  const self = path.basename(rel);
  const depth = dir === '.' ? 0 : 1;
  const up = depth === 0 ? '' : '../';
  /* ROOT-ABSOLUTE AND EXTENSIONLESS, which is what the site is written in —
     892 links of it and not one with a .html on the end. The old forms were
     depth-relative (`index.html` here, `../index.html` there) because the
     pages were opened off the filesystem before there was a host; under
     cleanUrls they would each cost a redirect hop, and getting the depth
     wrong was a silent 404. Only the font below still needs `up`. */
  const HOME = '/';
  const PRODUCTS_GRID = HOME + '#products';
  const INSIGHTS = HOME + '#insights';
  /* THE LOCAL ANSWER TO "SHOW ME EVERY SOLUTION". There is still no solutions
     index PAGE, which is why this used to point at the old site's /services/
     index. It does not need one: the homepage bar already carries the shelf
     that lists all five, and app.js opens that shelf when it arrives on this
     hash. Deliberately not an id of any section, so the browser has nothing to
     scroll to and the shelf is the whole answer. */
  /* /solutions is a generated hub page now (build.js); it used to be an anchor
     the homepage never had. */
  const SOLUTIONS_MENU = HOME + 'solutions';
  const ABOUT = '/about';
  const LEADERSHIP = ABOUT + '#leadership';
  const CONTACT = '/contact';
  /* DEMO REQUESTS NOW STAY ON THIS SITE. These four buttons used to point at
     talbotiq.com/inquiry-now/, on the grounds that the old form actually
     submits and there was no local one. build.js now generates demo.html, which
     carries the same form with its placeholders and product list fixed — and
     whose own submit still falls through to the old form until an endpoint is
     configured. So the reason for the old routing survives, without fourteen
     pages handing the reader to the previous website. Local, so same tab. */
  const DEMO = '/demo';
  /* The old destination, escaped for a regex. "Sign in" pointed at the tile
     grid while there was no login to point at; these pages were wired then, so
     the rules below re-point them and a re-run cannot put the grid back. */
  const GRID_RE = '(?:(?:\\.\\./)?index\\.html|/)#products';
  /* Every href a Sign in link is found with: untouched mockup, already
     re-aimed at the page, or pointed at the tile grid. */
  const SIGNIN_HREF = '(?:#|[^"]*signin\\.html|' + GRID_RE + ')';

  /* Google Maps' documented URL schemes — no key, no embed — built from the
     address in products.js, which is the same string the contact page prints
     in its own <address> block. Nothing here is invented. */
  const addr = COMPANY.address;
  const POSTAL = [addr.line1, addr.line2, addr.postcode + ' ' + addr.city, addr.state, addr.country].join(', ');
  const PLACE = COMPANY.name + ' Technologies, ' + POSTAL;
  const MAPS_QUERY = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(PLACE);
  const MAPS_DIR = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(PLACE);
  const FONT = up + 'assets/fonts/MeshedDisplay-Bold.woff2';
  /* KEYED ON THE DIRECTORY, NOT THE DEPTH. `solutions/` is also one level
     down, so a depth-only rule emitted a bare `mimic.html` there — a sibling
     of the solutions page, where no such file exists. Only a page already
     inside products/ can use the bare sibling name. */
  const productPage = (slug) => live('/products/' + slug);

  /* ---- SCRIPT URLS CARRY A CONTENT HASH ------------------------------
     /assets/ used to be served `immutable, max-age=1 year`. immutable tells a
     browser never to revalidate, not even on an ordinary reload, so an
     unversioned script is frozen in every returning visitor's cache and no
     header change evicts it -- only a different URL does. The header
     revalidates now, but the browsers poisoned before that still need the URL
     to move once, and afterwards the hash keeps every future edit honest for
     nothing.

     THE SAME sha1-8 build.js stamp() USES, deliberately. products/index.html
     and solutions/index.html are written by build.js AND fixed by this script,
     so the two have to agree on the URL or each undoes the other on every run.
     That was already happening to texttype.js, quietly, in both directions. */
  const ver = (rel) => {
    try {
      return '?v=' + crypto.createHash('sha1')
        .update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').slice(0, 8);
    } catch { return ''; }
  };
  const SRC = {
    chat: '/assets/js/chat.js' + ver('assets/js/chat.js'),
    nav: '/assets/js/nav.js' + ver('assets/js/nav.js'),
    tt: '/assets/js/texttype.js' + ver('assets/js/texttype.js'),
    df: '/assets/js/demoform.js' + ver('assets/js/demoform.js'),
  };
  /* the hash is hex so it needs no escaping, but the path's dots and the ? do */
  const rx = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const r = [];
  const ext = (url) => `href="${url}" target="_blank" rel="noopener"`;
  const add = (name, find, replace) => r.push([name, find, replace]);

  /* ---- header + drawer, product pages ------------------------------- */
  add('logo -> homepage', /<a class="logo" href="#"/g, `<a class="logo" href="${HOME}"`);
  add('product switcher -> product grid', /<a class="prod" href="#"/g, `<a class="prod" href="${PRODUCTS_GRID}"`);
  /* PRICING IS REMOVED, NOT RE-AIMED. It used to be pointed at the contact
     page, on the argument that a nav item redirecting somewhere real beats one
     that 404s. It is gone from the nav altogether now (see the NAV note in
     home.js), so the rule strips it instead — and it matches BOTH states,
     because a freshly dropped mockup still says href="#" while the pages in
     the repo were already re-aimed at contact.html by the old rule. The
     leading newline and indent go with it, so no blank line is left behind. */
  add('header Pricing -> removed',
    /\n\s*<a class="lnk" href="(?:#|[^"]*contact\.html)">Pricing<\/a>/g, '');
  /* SIGN IN IS REMOVED FROM THE NAV, NOT FROM THE SITE. signin.html stays —
     build.js carries a standing note not to delete it — but nothing offers it
     any more. Like the Pricing rule above, this matches EVERY state a page can
     be in: a freshly dropped mockup still says href="#", pages already in the
     repo were re-aimed at signin.html by the rule this replaces, and a couple
     of mockups pointed it at the tile grid. The leading newline and indent go
     with it so no blank line is left in the header. */
  add('header Sign in -> removed',
    new RegExp('\\n[ \\t]*<a class="si" href="' + SIGNIN_HREF + '">Sign in</a>', 'g'), '');

  /* ---- Home, first in the bar ----------------------------------------
     THE GENERATED PAGES GET THIS FROM home.js, not from here. Their bar is
     built from H.NAV, and assets/js/nav.js swaps that same markup into these
     pages too on load — so on a standalone page Home arrives twice over. What
     the script cannot do is be there before it runs, and these pages are
     hand-written mockups whose header is what the reader sees on first paint
     and all the reader sees with JavaScript off. So the static markup carries
     it as well, and the two agree because both put Home immediately left of
     Products.

     ANCHORED ON THE PRODUCTS LINK, not on the <nav> alone, which is what keeps
     it off the seventeen product pages: their bar is a different thing — the
     product's own name and its section anchors — and it has no Products item
     for the lookahead to find. The generated pages are skipped for the same
     reason, from the other side: their Products item is a <button> that opens
     a shelf, not an <a>.

     Group 2 is the whitespace after the tag, replayed after the new link so
     the indent matches whatever the page already uses. The lookahead is what
     makes a second run a no-op: by then Home sits where Products was. */
  const HOME_LINK = `<a href="${HOME}">Home</a>`;
  add('nav Home -> the homepage, left of Products',
    /(<nav class="mid"[^>]*>)(\s*)(?=<a href="[^"]*products"[^>]*>Products<\/a>)/g,
    `$1$2${HOME_LINK}$2`);
  add('drawer Home -> the homepage, first',
    /(<div class="drawer" id="drawer">)(\s*)(?=<a href="[^"]*products"[^>]*>Products<\/a>)/g,
    `$1$2${HOME_LINK}$2`);

  /* ---- AND HOME ON THE PRODUCT DETAIL PAGES, which never had it ------
     THIS IS THE WHOLE OF THE REPORTED BUG. The two rules above key on
     `<a ...>Products</a>`, which only the site-level nav has. The 17 product
     detail pages carry a DOCUMENT nav instead — `<a class="prod">Video
     Interview</a>`, a divider, then Overview / Features / Trust — so that
     lookahead never matched and Home was simply absent. Home did not
     "disappear on navigation"; it was never emitted on those pages, which is
     why it came back the moment you left one.

     NO NEW CSS, AND THAT IS NOT LUCK — IT IS WHY `lnk` IS THE CLASS.
     `nav.mid a.lnk` on these pages and `nav.mid a` on the site nav declare
     the same four properties with the same values, and the same one-line
     :hover to var(--green). So class="lnk" renders Home identically to the
     Home it is being made consistent with — colour, size, weight, hover,
     and the flex gap it inherits from nav.mid — without a byte added to
     either stylesheet. The drawer link needs no class for the same reason:
     `.drawer a` is declared identically on both page shapes.

     FIRST IN THE ROW, where it sits on every other page, and nothing else in
     the nav is touched. Deliberately NO `<span class="div">` between Home and
     the product name: a separator would be new furniture in a nav the brief
     says to leave alone.

     MOBILE IS THE DRAWER, NOT THE ROW. Below 880px these pages set
     `nav.mid{display:none}` and the burger takes over, so the second rule is
     what makes Home reachable on a phone at all.

     Both lookaheads are what make a re-run a no-op: after the insert, Home
     sits between the container tag and the element the lookahead names. */
  add('nav Home -> the homepage, first (product pages)',
    /(<nav class="mid"[^>]*>)(\s*)(?=<a class="prod")/g,
    `$1$2<a class="lnk" href="${HOME}">Home</a>$2`);
  add('drawer Home -> the homepage, first (product pages)',
    /(<div class="drawer" id="drawer">)(\s*)(?=<a href="#s\d">)/g,
    `$1$2${HOME_LINK}$2`);

  /* ---- §11 · A FINGER GETS THE MICRO-TRANSITIONS TOO -----------------
     These 24 pages carry their own inline stylesheet, so the (hover: none)
     block added to talbotiq.css for the homepage does not reach them. They
     have between five and nine hover rules that move something and almost
     no :active, so on a phone a press got no answer — the other half of
     what was reported as "no micro transitions on mobile".

     THE MIRROR IS THE SELECTOR, NOT THE DECLARATION. Rather than restate
     each page's values — .sec lifts 4px here, .relchip 3px, .btn-primary 2px
     with a shadow, and it differs per page — each rule just adds :active to
     the selector list of the hover rule that already exists. The two states
     then share one declaration block, so a tap cannot drift from a hover: it
     is the same rule. It also costs nothing on desktop, where :active only
     fires on mouse-down over an element that is already hovered.

     Each rule is self-limiting: the pattern needs `:hover{` and leaves
     `:hover,` behind, so a second run matches nothing. */
  add('tap feedback: buttons answer a press',
    /\.btn-primary:hover\{/g,
    '@media (hover:none){a,button{-webkit-tap-highlight-color:transparent}}\n'
    + '.btn-primary:hover,.btn-primary:active{');
  add('tap feedback: secondary buttons',
    /\.btn-secondary:hover\{/g, '.btn-secondary:hover,.btn-secondary:active{');
  add('tap feedback: buttons on dark',
    /\.btn-white:hover,\.btn-outline-white:hover\{/g,
    '.btn-white:hover,.btn-outline-white:hover,.btn-white:active,.btn-outline-white:active{');
  add('tap feedback: section cards',
    /\.sec:hover\{/g, '.sec:hover,.sec:active{');
  add('tap feedback: related chips',
    /\.relchip:hover\{/g, '.relchip:hover,.relchip:active{');
  add('tap feedback: panes',
    /\.pane:hover\{/g, '.pane:hover,.pane:active{');
  add('tap feedback: mode cards',
    /\.modecard:hover\{/g, '.modecard:hover,.modecard:active{');
  add('tap feedback: the mode card rule',
    /\.modecard:hover \.rule\{/g, '.modecard:hover .rule,.modecard:active .rule{');
  add('tap feedback: chips',
    /\.chip:hover\{/g, '.chip:hover,.chip:active{');

  /* ---- AND THE HEADER NEEDS 66px IT DID NOT HAVE ---------------------
     MEASURED, NOT GUESSED, AND THIS RULE EXISTS ONLY BECAUSE OF THE TWO
     ABOVE. `.hdr` is a three-track grid and the middle track is what the nav
     gets. Home costs 42px of link plus one 24px flex gap, and sweeping the
     viewport a pixel at a time says the widest product header needs 1095px
     with Home against 1029px without it. The burger used to take over at
     880px, so between 881 and 1095px the row was being asked to hold more
     than fits: at 1024px — iPad landscape, not a corner case — "Business
     Management System" broke onto two lines, "Build state" onto two, and
     "Get in touch" onto three, overflowing a 70px header. Without Home the
     same page at the same width is one clean line.

     SO THE BURGER TAKES OVER AT 1100px INSTEAD, and it takes over for the
     HEADER ONLY. The 880px block these four rules are lifted out of also
     carries phone type sizes and one-column grids; moving the whole block
     would put phone typography on a 1024px tablet, which is a far bigger
     change than the nav. Splitting it means the header switches early while
     the page keeps its desktop layout — and the mobile CTA bar comes with it,
     so the "Get in touch" that the row stops showing is still on screen
     rather than lost, with --tq-bottom-bar keeping the chat bubble clear of
     it (§10).

     Home stays visible at every width, which is the whole point: in the row
     above 1100px, in the drawer below it.

     THIS ALSO REPAIRS A PRE-EXISTING BUG. "Get in touch" was already wrapping
     to three lines and overflowing the header anywhere below about 1029px,
     with or without Home. That band is now behind the burger too.

     The body line is matched loosely because §10 may or may not have added
     --tq-bottom-bar to it by the time this runs, and a re-run is a no-op
     because the 880px block no longer starts with these four rules. */
  add('product header: burger takes over before the nav row runs out of width',
    /@media \(max-width:880px\)\{(\s*nav\.mid,\.hdr-right a\.si,\.hdr-right \.btn\{display:none\}\s*\.burger\{display:block\}\.mobar\{display:flex\}\s*body\{padding-bottom:72px[^}]*\}\s*\.hdr\{grid-template-columns:1fr auto\})/g,
    '@media (max-width:1100px){$1\n}\n@media (max-width:880px){');

  /* ---- header + drawer, about page ----------------------------------
     `class="on"` marks the item for the page you are already on. It becomes
     unlinked with aria-current rather than a link to itself: a nav item that
     reloads the page you are reading is a small lie about what it does. */
  add('About (current page) -> unlinked, aria-current',
    /<a class="on" href="#">About<\/a>/g, '<a class="on" aria-current="page">About</a>');
  add('nav Products -> product grid', /<a href="#">Products<\/a>/g, `<a href="${PRODUCTS_GRID}">Products</a>`);
  /* SOLUTIONS NOW STAYS ON THIS SITE. It pointed at the old site's /services/
     index, so clicking it in the nav left the new site altogether — and on the
     solution pages the rule below stripped the href instead, so it did nothing
     at all. Both now go to the homepage shelf. Matches BOTH states, the same
     way the Pricing rule does: a freshly dropped mockup still says href="#",
     while every page in the repo was already re-aimed at talbotiq.com by the
     old rule and has to be migrated off it. */
  add('nav Solutions -> the homepage solutions shelf',
    rx_both('Solutions'), `<a href="${SOLUTIONS_MENU}">Solutions</a>`);
  add('nav Blog -> the homepage articles section', /<a href="#">Blog<\/a>/g, `<a href="${INSIGHTS}">Blog</a>`);
  add('nav Contact -> the contact page', /<a href="#">Contact<\/a>/g,
    self === 'contact.html' ? '<a aria-current="page">Contact</a>' : `<a href="${CONTACT}">Contact</a>`);
  add('drawer About -> the about page', /<a href="#">About<\/a>/g,
    self === 'about.html' ? '<a aria-current="page">About</a>' : `<a href="${ABOUT}">About</a>`);

  /* ---- drawer, shared ------------------------------------------------ */
  add('drawer Pricing -> removed',
    /\n\s*<a href="(?:#|[^"]*contact\.html)">Pricing<\/a>/g, '');
  add('drawer All products -> product grid', /<a href="#">All products<small>/g, `<a href="${PRODUCTS_GRID}">All products<small>`);
  add('drawer All products (no sub-label) -> product grid',
    /<a href="#">All products<\/a>/g, `<a href="${PRODUCTS_GRID}">All products</a>`);
  /* The drawer writes it two ways: on its own line on the product and solution
     pages, and run inline after Contact on about and contact. The first branch
     takes the newline with it, the second must not — there is no newline to
     take, and eating the next one would join two anchors onto one line. */
  add('drawer Sign in -> removed',
    new RegExp('\\n[ \\t]*<a href="' + SIGNIN_HREF + '">Sign in</a>(?=\\n)'
      + '|<a href="' + SIGNIN_HREF + '">Sign in</a>', 'g'), '');

  /* ---- calls to action ----------------------------------------------
     Matched on class AND text: the about page and the product pages reuse the
     same button classes for different labels, so class alone would cross them
     over. */
  /* RE-POINTING WHAT A PREVIOUS RUN ALREADY FIXED. The rules below match the
     original `href="#"` mockup state, which is the state these pages were in
     the first time this tool ran — so on an already-fixed page they match
     nothing. This one matches the CURRENT state instead: every anchor left
     pointing at the old site's inquiry form, whatever its label, becomes a
     local link to demo.html. It is idempotent because after it runs there is
     nothing left for it to find. */
  /* NO EXCEPTIONS, INCLUDING THE SUBMIT BUTTON. An earlier pass exempted
     `dsubmit` on the argument that the old form is the only one that actually
     receives an enquiry. That is true and it is not the point: the reason this
     rule exists is that no button on this site may hand a reader to the
     previous website, and a submit is the LAST one you would want to. While
     COMPANY.demoAction is null the form is a placeholder either way — the fix
     is an endpoint, not a link off-site. */
  add('any inquiry-form link -> the local demo page',
    new RegExp('href="' + COMPANY.inquiry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '" target="_blank" rel="noopener"', 'g'),
    `href="${DEMO}"`);

  add('Request demo -> the demo page',
    /<a class="btn btn-primary btn-block" href="#">Request demo<\/a>/g,
    `<a class="btn btn-primary btn-block" href="${DEMO}">Request demo</a>`);
  add('Send enquiry -> the demo page',
    /<a class="btn btn-primary btn-block" href="#">Send enquiry<\/a>/g,
    `<a class="btn btn-primary btn-block" href="${DEMO}">Send enquiry</a>`);
  add('Talk to us -> the contact page',
    /<a class="btn btn-outline-white btn-lg" href="#">Talk to us<\/a>/g,
    `<a class="btn btn-outline-white btn-lg" href="${CONTACT}">Talk to us</a>`);
  add('Explore the products -> product grid',
    /<a class="btn btn-outline-white btn-lg" href="#">Explore the products<\/a>/g,
    `<a class="btn btn-outline-white btn-lg" href="${PRODUCTS_GRID}">Explore the products</a>`);

  /* ---- footer's own inline-styled link ------------------------------- */
  add('Request walkthrough -> the demo page',
    /<a class="btn btn-primary btn-block" href="#">Request walkthrough<\/a>/g,
    `<a class="btn btn-primary btn-block" href="${DEMO}">Request walkthrough</a>`);
  add('footer Book a walkthrough -> the demo page',
    /<a href="#" style="color:#3FD4B0;font-weight:600">Book a walkthrough/g,
    `<a href="${DEMO}" style="color:#3FD4B0;font-weight:600">Book a walkthrough`);
  add('footer Book a demo -> the demo page',
    /<a href="#" style="color:#3FD4B0;font-weight:600">Book a demo/g,
    `<a href="${DEMO}" style="color:#3FD4B0;font-weight:600">Book a demo`);

  /* THE TOP-RIGHT BUTTON ASKS FOR THE CONTACT PAGE NOW, by request. The sixteen
     product pages offered "Book a demo" and scrolled to their own #form; about,
     contact and the four solution pages already said "Get in touch", so this
     brings the rest into line rather than inventing a label.

     TWO MATCHES PER PAGE, AND BOTH ARE WANTED. `class="btn btn-primary"` with
     no `btn-lg` occurs exactly twice: the header button and its counterpart in
     the fixed mobile bar. They are the SAME control at two breakpoints — the
     page's own CSS hides `.hdr-right .btn` and shows `.mobar` below 820px — so
     changing one without the other would leave a phone still offering a demo.
     The hero and closing buttons carry `btn-lg` and `btn-white btn-lg`, so
     they are untouched and still ask for a demo, which is what they are for.

     ERP SAYS "Book a walkthrough" rather than "Book a demo" — same button,
     same slot, different word — so the label is an alternation. Every other
     wording in this position ("Scope an agent", "Book a site survey") is a
     MOBILE-BAR label on a page whose header already reads "Get in touch",
     so those are left where they are.

     Idempotent for free: once the text reads "Get in touch" it no longer
     matches either label, so a second run finds nothing. */
  /* ---- §6d · the ported enquiry form, on a page the build does not write --
     contact.html carries demo.html's block now, but it is a standalone mockup:
     build.js never touches it, so the ternary that turns the form into a real
     POST when COMPANY.demoAction is set cannot reach it. These three rules are
     that ternary, applied to static markup — and they are gated on the same
     value, so nulling demoAction reverts this page exactly as it reverts the
     generated one.

     The submit becomes a <button type="submit">, not a styled link. A link
     cannot submit a form, cannot be reached by the Enter key from inside a
     field, and is announced as a link by a screen reader when it is a button.
     That was tolerable while the form went nowhere; it is not now. */
  if (COMPANY.demoAction) {
    add('demo form: post to the endpoint',
      /<form class="dform"(?! action=) novalidate>/g,
      `<form class="dform" action="${COMPANY.demoAction}" method="post" novalidate>`);
    add('demo form: real submit',
      /<a class="btn btn-primary btn-lg dsubmit" href="[^"]*">([^<]*?)(?:\s*&rarr;)?<\/a>/g,
      '<button class="btn btn-primary btn-lg dsubmit" type="submit">$1</button>');
    /* DROP A STALE ONE FIRST. The other three script rules come in pairs; this
       one did not, and the moment the URL gained a hash that asymmetry showed:
       the insert rule added the new tag while the old unversioned tag stayed,
       so demoform.js loaded twice and the form got two submit handlers, which
       is one enquiry sent twice. */
    add('demo form: drop a wrong include',
      new RegExp('[ \\t]*<script[^>]*\\bsrc="(?!' + rx(SRC.df) + '")[^"]*\\bdemoform\\.js(?:\\?[^"]*)?"[^>]*></script>\\n?', 'g'), '');
    add('demo form: the enhancement script, once',
      new RegExp('(?<!<script defer src="' + rx(SRC.df) + '"></script>\\n)</head>(?=[\\s\\S]*<form class="dform")'),
      '<script defer src="' + SRC.df + '"></script>\n</head>');
  }

  add('header CTA -> the contact page',
    /<a class="btn btn-primary" href="(?:#form|[^"]*demo\.html)">Book a (?:demo|walkthrough)<\/a>/g,
    `<a class="btn btn-primary" href="${CONTACT}">Get in touch</a>`);
  add('footer Get in touch -> the contact page',
    /<a href="#" style="color:#3FD4B0;font-weight:600">Get in touch/g,
    `<a href="${CONTACT}" style="color:#3FD4B0;font-weight:600">Get in touch`);

  /* ---- related-product chips + the footer product column ------------ */
  for (const [name, slug] of Object.entries(PRODUCTS)) {
    const page = productPage(slug);
    /* The chip label is not always just the name — nouscrm.html writes
       `<b>Lexer &mdash; Document Intelligence</b>` — so match the name as a
       prefix and keep whatever the page actually wrote. */
    add(`related chip ${name}`,
      /* Same gap-tolerant shape as the solution chips below, for the same
         reason: on a product page the label sits straight after the anchor
         (`<b>ATS</b>`), but a service page puts an icon in between, and
         `solutions/embedded-edge-ai.html` uses a product chip in exactly that
         form (`Vawlt &mdash; Private AI Engine`). Requiring them adjacent
         silently skipped it. `(?!</a>)` keeps the match inside one chip. */
      new RegExp('<a class="relchip" href="#"((?:(?!</a>)[\\s\\S])*?<b>'
        + `${name}(?:</b>|[&\\s][^<]*</b>))`, 'g'),
      `<a class="relchip" href="${page}"$1`);
    add(`footer ${name}`, rx(`<a href="#">${name}</a>`), `<a href="${page}">${name}</a>`);

    /* The video page opens with a band of three big icon cards, one per
       video round. Same gap-tolerant shape as the chip above, and for the
       same reason: a 700-character SVG sits between the anchor and its
       label, so requiring them adjacent matches nothing. */
    add(`mode card ${name}`,
      new RegExp('<a class="modecard" href="#"((?:(?!</a>)[\\s\\S])*?<b>'
        + `${name}</b>)`, 'g'),
      `<a class="modecard" href="${page}"$1`);
  }

  /* ---- the interviewer pages' in-sentence cross-links --------------- */
  for (const [label, slug] of Object.entries(ROUND_LINKS)) {
    add(`honest-note "${label}" -> ${slug}`,
      rx(`<a href="#" style="color:#027A5C;font-weight:600">${label}</a>`),
      `<a href="${productPage(slug)}" style="color:#027A5C;font-weight:600">${label}</a>`);
  }

  /* ---- footer + related-link chips: solutions -----------------------
     A local page wins, then the live talbotiq.com service page, then nothing —
     in which case the href comes off rather than pointing at "#". */
  for (const name of SOLUTION_NAMES) {
    const printed = name.replace(/&/g, '&amp;');
    const localPage = SOLUTION_LOCAL[name] || null;
    const attrs = localPage ? `href="${localPage}"` : (SOLUTION_URL[name] ? ext(SOLUTION_URL[name]) : null);

    add(`footer ${name}`, rx(`<a href="#">${printed}</a>`),
      attrs ? `<a ${attrs}>${printed}</a>` : `<a>${printed}</a>`);

    /* The chip on a service page wraps an icon before its label, so the
       anchor and the <b> are not adjacent. Everything between is captured and
       put back untouched.

       The gap is `(?:(?!</a>)[\s\S])*?` — any run of characters containing no
       closing </a>. That is what keeps a match inside ONE chip: a bare
       `[\s\S]*?` could pair this chip's anchor with the NEXT chip's label once
       the anchor between them had been rewritten. It is unbounded on purpose;
       a length cap was the first attempt and the two icons here are 391 and
       478 characters, so any round number would fix one chip and miss the
       other. */
    if (attrs) {
      add(`related chip ${name}`,
        new RegExp('<a class="relchip" href="#"((?:(?!</a>)[\\s\\S])*?<b>'
          + printed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</b>)', 'g'),
        `<a class="relchip" ${attrs}$1`);
    }
  }

  /* ---- footer: company + legal --------------------------------------
     About us and Leadership are LOCAL now. about.html exists, and it carries a
     #leadership section — which is why Leadership stops being a "soon" and
     becomes a real destination. */
  add('footer About us -> the about page', /<a href="#">About us<\/a>/g, `<a href="${ABOUT}">About us</a>`);
  add('footer Leadership -> the about page leadership section',
    /<a href="#">Leadership<\/a>/g, `<a href="${LEADERSHIP}">Leadership</a>`);
  add('footer Contact us -> the contact page', /<a href="#">Contact us<\/a>/g, `<a href="${CONTACT}">Contact us</a>`);
  /* PRIVACY POLICY IS UNLINKED NOW, not aimed at the old site. This was the
     last old-site link on the site and it sat in the footer of every page. No
     local privacy page exists, so it takes the same treatment as Terms and
     Security just below: the href comes off. Matches BOTH states — a fresh
     mockup still says href="#", while every page in the repo carries the
     talbotiq.com URL the previous rule wrote there. Give it a local page and
     this becomes a normal one-line link rule again. */
  add('footer Privacy Policy -> unlinked (no local page yet)',
    new RegExp('<a href="(?:#|'
      + COMPANY.privacy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      + ')"(?: target="_blank" rel="noopener")?>Privacy Policy</a>', 'g'),
    '<a>Privacy Policy</a>');

  /* ---- no destination exists: drop the href -------------------------- */
  for (const name of ['Memberships', 'Careers', 'Terms', 'Security']) {
    add(`${name} -> unlinked (no page yet)`, rx(`<a href="#">${name}</a>`), `<a>${name}</a>`);
  }

  /* ---- the contact page's own controls -------------------------------
     `class="on"` marks the item for the page you are already on: unlinked with
     aria-current, rather than a link that reloads what you are reading. */
  add('Contact (current page) -> unlinked, aria-current',
    /<a class="on" href="#">Contact<\/a>/g, '<a class="on" aria-current="page">Contact</a>');

  /* The form on this page is not wired: there is no <form> element and no
     endpoint. Submit therefore goes to demo.html, which is. It navigates away,
     so anything already typed here is lost — a real trap, and one that only
     goes away when this page's own form is either wired or removed. */
  add('Submit -> the demo page',
    /<a class="btn btn-primary btn-block" href="#">Submit<\/a>/g,
    `<a class="btn btn-primary btn-block" href="${DEMO}">Submit</a>`);

  add('Open in Google Maps -> the office address',
    /<a class="btn btn-primary" href="#">Open in Google Maps<\/a>/g,
    `<a class="btn btn-primary" ${ext(MAPS_QUERY)}>Open in Google Maps</a>`);
  add('Get directions -> Google Maps directions',
    /<a class="btn btn-secondary" href="#">Get directions<\/a>/g,
    `<a class="btn btn-secondary" ${ext(MAPS_DIR)}>Get directions</a>`);

  /* The newsletter has no endpoint either — exactly as on the homepage, where
     the field is rendered disabled with a one-line reason. Same treatment
     here: a box that silently swallows an address is worse than one that
     admits it is not connected. */
  add('newsletter input -> disabled, with a reason',
    /<input id="nl" type="email" placeholder="Your email">/g,
    '<input id="nl" type="email" placeholder="Your email" disabled aria-describedby="nlwhy">');
  add('Subscribe -> unlinked while there is no endpoint',
    /<a class="btn btn-primary" href="#">Subscribe<\/a>/g,
    '<a class="btn btn-primary" aria-disabled="true">Subscribe</a>'
    + '<span id="nlwhy" style="font-size:13px;color:#7C7A7A;margin-left:10px">Not wired up yet</span>');

  /* ---- the invented person in the placeholders -----------------------
     "John", "Doe", "John Doe" and "john.g@acme.com" are one made-up person
     used as example input. A placeholder on an already-labelled name field
     teaches a reader nothing, and a fake identity is the kind of filler this
     project strips everywhere else. Every field keeps its <label>, so nothing
     becomes unlabelled. */
  add('drop the invented name placeholders',
    /<input id="(fn|ln)" placeholder="(?:John Doe|John|Doe)">/g, '<input id="$1">');
  add('drop the invented email placeholder',
    /<input id="em" type="email" placeholder="john\.g@acme\.com">/g, '<input id="em" type="email">');

  /* ---- the service page's own controls -------------------------------
     BOTH OF THESE USED TO LEAVE THE SITE. There is still no local solutions
     index PAGE, which was the old justification for sending them to the live
     /services/ index; the homepage shelf is the local answer instead, and
     app.js opens it on arrival.

     "Solutions" here is NOT treated as the current page any more. It was
     unlinked with aria-current, which made the one nav item a reader on a
     solution page is most likely to press do nothing at all — no href, no
     shelf, no destination. It keeps `class="on"`, because that marks the
     section you are reading, but it is a working link again and so the
     aria-current goes: it no longer points at this page. */
  add('Solutions (current page) -> the homepage solutions shelf',
    /<a class="on"(?: href="#"| aria-current="page")>Solutions<\/a>/g,
    `<a class="on" href="${SOLUTIONS_MENU}">Solutions</a>`);
  add('See all solutions -> the homepage solutions shelf',
    new RegExp('<a class="btn btn-outline-white btn-lg" href="(?:#|'
      + SERVICES_INDEX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      + ')"(?: target="_blank" rel="noopener")?>See all solutions</a>', 'g'),
    `<a class="btn btn-outline-white btn-lg" href="${SOLUTIONS_MENU}">See all solutions</a>`);
  add('Inquiry -> the working inquiry form',
    /<a class="btn btn-primary btn-block" href="#">Inquiry<\/a>/g,
    `<a class="btn btn-primary btn-block" ${ext(COMPANY.inquiry)}>Inquiry</a>`);

  /* ---- §2 · the footer logo is not a link ---------------------------
     Every page puts the TALBOTIQ mark in the footer as a bare <img> with no
     anchor. Anchored on what FOLLOWS it: the obvious `<footer> … <img …>`
     pattern has to reach across a 43,000-character base64 data URI to find
     that tag's closing ">", and breaks if anything ahead of it moves.
     `<div class="fg">` sits immediately after — short, stable, unique. */
  add('footer logo -> homepage',
    /(<img[^>]*alt="TALBOTIQ">)(\s*<div class="fg">)/g,
    `<a href="${HOME}" aria-label="TALBOTIQ home">$1</a>$2`);

  /* ---- §3 · five list items with no list ----------------------------
     Seven of the eight product pages open their capability block as
     `<div class="split rv"><div><li>…` — five <li> directly inside a plain
     <div>, with zero <ul> in the file. Invalid HTML, and it also means the
     stylesheet's own `.capbul li` rules never match, so the bullets render
     unstyled. nouscrm.html is the one page that got it right, which is how the
     intended wrapper was identified. The about page has no list at all, so
     this simply does not fire there. */
  add('wrap the orphaned <li> block in <ul class="capbul">',
    /(<div class="split rv">\s*<div>)(\s*<li>[\s\S]*?<\/li>)(\s*<\/div>)/g,
    '$1<ul class="capbul" style="margin-top:22px">$2</ul>$3');

  /* ---- §4 · the display face ----------------------------------------
     The mockups ship with Caveat Brush, the brush script the homepage used
     before it was deliberately replaced. Left alone, the homepage and the page
     one click from it read as two different brands. MESHED Display is
     self-hosted, so these pages load it from assets/fonts/ rather than Google
     Fonts, and Caveat Brush comes out of that request — Inter stays. */
  add('drop Caveat Brush from the Google Fonts request', /family=Caveat\+Brush&/g, '');
  /* GUARDED so it cannot fire twice. These two rules are the only ADDITIVE
     ones in the file — everything else rewrites a broken state into a fixed
     one and therefore stops matching once applied. These two insert new
     markup, so without a negative lookahead a second run appends a second
     copy, and the tool's promise of idempotency quietly becomes false. */
  add('preload the self-hosted display face',
    /(<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter[^>]*>)(?!\s*<link rel="preload"[^>]*MeshedDisplay)/g,
    `$1\n<link rel="preload" href="${FONT}" as="font" type="font/woff2" crossorigin>`);
  /* THE GUARD LOOKS AT THE WHOLE FILE, NOT AT WHAT COMES NEXT. It used to be
     `(?!@font-face...)` — a check that the @font-face was the FIRST thing
     after <style>. That is a positional guard on an additive rule, which
     means any later rule that inserts anything else at the top of the same
     <style> silently re-arms this one, and every run from then on appends
     another copy of the @font-face. It happened: rule 13c above put the
     typewriter's CSS there and three copies accumulated in twenty-three
     pages before the second-run rewrite count gave it away.
     `(?![\s\S]*...)` asks the question that was actually meant — is this
     declaration already in this document, anywhere — so it cannot be
     re-armed by position again. */
  add('@font-face for MESHED Display', /(<style>\n)(?![\s\S]*@font-face\{font-family:"Meshed Display")/g,
    `$1@font-face{font-family:"Meshed Display";src:url("${FONT}") format("woff2");`
    + `font-weight:700;font-style:normal;font-display:swap}\n`);
  /* weight 700 matches the one weight shipped, so nothing is synthesised.
     line-height 1.09 -> 1.08 matches the homepage, which is what lets the
     highlighter below reuse the homepage's numbers rather than need its own
     derivation. */
  add('.hand -> MESHED Display',
    /\.hand\{font-family:"Caveat Brush","Bradley Hand","Segoe Print","Comic Sans MS",cursive;\s*font-weight:400;line-height:1\.09;color:var\(--ink\)\}/g,
    '.hand{font-family:"Meshed Display","Playfair Display","Didot","Bodoni MT",Georgia,serif;'
    + 'font-weight:700;letter-spacing:0;line-height:1.08;color:var(--ink)}');

  /* A CATCH-ALL for every other Caveat declaration in the CSS. The mockups use
     at least three stacks for the same face — the full one in `.hand`,
     `"Caveat Brush","Bradley Hand",cursive` on the about page's `.portrait
     .tag` and `.pull`, and `"Caveat Brush",cursive` on the service page's
     `.phase .no` — and a new page can invent a fourth. Matching the family
     name instead of the exact stack means the next one needs no new rule.

     It runs AFTER the `.hand` rule above, which has already rewritten its own
     declaration, so this only sees the leftovers. Weight 700 is explicit
     because that is the only weight shipped, and asking for 400 invites some
     engines to synthesise a bold on top of an already-bold face. */
  add('any remaining Caveat declaration -> MESHED Display',
    /font-family:"Caveat Brush"[^;}]*/g,
    'font-family:"Meshed Display","Playfair Display",Georgia,serif;font-weight:700');

  /* And four labels inside an inline SVG diagram, set with the presentation
     attribute rather than CSS. Inline SVG shares the document's @font-face,
     so the self-hosted face works here without anything extra. */
  add('SVG diagram labels -> MESHED Display',
    /font-family="Caveat Brush,cursive"/g,
    'font-family="Meshed Display,serif" font-weight="700"');

  /* MESHED Display sets wider than Caveat Brush, and SVG text has fixed
     coordinates with no reflow — so a label that fitted before can now run off
     the edge of its own viewBox and be clipped. Measured with getBBox() after
     the swap: three of the four labels are `text-anchor="middle"` and stay
     centred, but this one is left-anchored at x=112 in a 340-wide box and
     overran the right edge by 17 units. Dropping 23px to 21px scales it to
     ~224 units, landing at 336 with a little air. */
  /* LEFT-ANCHORED SVG LABELS THAT NO LONGER FIT. MESHED Display sets wider
     than Caveat Brush, and SVG text has fixed coordinates and no reflow, so a
     label that fitted before can now run past the edge of its own viewBox and
     be clipped. Centre-anchored labels stay centred and are fine; only
     `text-anchor="start"` ones grow rightwards into trouble.

     Each entry below was MEASURED with getBBox() in a browser after the swap,
     not guessed — the overflow and the largest whole font-size that fits:

       "anyone can buy the tool"  about.html    23px, ran 17 units over -> 21
       "one roadmap"              ai-strategy   24px, ran 11 units over -> 21

     If a future page clips a label, measure it the same way and add a line. */
  for (const [label, from, to] of [
    ['anyone can buy the tool', 23, 21],
    ['one roadmap', 24, 21],
  ]) {
    add(`keep "${label}" inside its viewBox`,
      new RegExp(`font-size="${from}"([^>]*)>${label}<`, 'g'),
      `font-size="${to}"$1>${label}<`);
  }

  /* ---- §5 · re-aim the highlighter ----------------------------------
     `top:26%;height:74%` was tuned to Caveat Brush; against MESHED Display it
     paints below the baseline and reads as a thick underline.

     Step 1 crops the viewBox to the ink. Measured with getBBox() in a browser,
     the path occupies y 24..52.6 of its `0 0 W 60` box on every page, so half
     the box is empty padding the CSS would otherwise reason around. Widths
     differ per page (170, 240, 250, 260, 300), hence the capture.

     Step 2 positions in em against the font's own metrics: MESHED Display Bold
     has ascent .724em, descent .197em, x-height .513em; at line-height 1.08
     that puts the baseline at .803em and the x-height top at .290em, so a
     stroke from just above the x-height to just below the baseline is
     top .24em, height .62em. In em, so it holds at every heading size these
     pages use with no per-breakpoint work. */
  add('crop the highlighter viewBox to its ink',
    /(<span class="mark-hl">\s*<svg viewBox=")0 0 (\d+) 60(")/g, '$10 24 $2 28.6$3');
  add('re-aim the highlighter for the new face',
    /\.mark-hl svg\{position:absolute;left:-3%;top:26%;width:106%;height:74%;z-index:1\}/g,
    '.mark-hl svg{position:absolute;left:-3%;top:.24em;width:106%;height:.62em;z-index:1}');

  /* ---- §6 · media paths are depth-aware too -------------------------
     The interviewer pages carry a demo-video frame whose `poster` and
     `<source src>` are written root-relative — `assets/…` — because the
     mockup sat at the root. From products/ that resolves to
     products/assets/, which does not exist, and a <video> fails SILENTLY:
     no console error, just a frame that never loads. The placeholder overlay
     on top of it stays visible until `loadeddata` fires, so the page still
     reads correctly — which is exactly why this would not have been noticed.

     Anchored on the quote, so `"assets/` cannot match the already-fixed
     `"../assets/`, which is what keeps it idempotent. The <code> hint in the
     placeholder text is left alone on purpose: it tells a human where to drop
     the file, and `assets/…` is the right answer from the project root. */
  if (up) {
    add('demo-video poster/src -> depth-aware',
      /(<(?:video|source)\b[^>]*?\b(?:poster|src)=")assets\//g, `$1${up}assets/`);
  }

  /* ---- §6b · the demo video never started ---------------------------
     THE TAG HAD NO `autoplay`. The page's own script reveals the video and
     calls play() on `loadeddata` — but the tag also carries
     `preload="metadata"`, which tells the browser to stop at metadata
     (readyState 1). `loadeddata` fires at readyState 2, so on any browser
     that honours the hint the event never arrives: play() is never called,
     `.playing` is never added, and `.vid.playing .ph{display:none}` never
     hides the "drop the file here" card. The poster renders underneath it,
     which is why this read as a stuck video rather than a broken one.

     One attribute fixes it. `autoplay` makes the browser load enough to
     start — the spec has it override `preload` outright — so the event
     fires, the card hides and the loop runs. `muted` and `playsinline` are
     already on the tag, which is the whole of what an autoplay policy asks
     for. The nine pages whose demo file does not exist yet are unaffected:
     nothing loads, so the placeholder correctly stays put. */
  add('demo video: autoplay', /<video id="demoVid"(?! autoplay)/g, '<video id="demoVid" autoplay');

  /* ---- §6c · a play/pause button and a scrubbable track -------------
     Requested. The bar is built by assets/js/vidctl.js rather than injected
     into fifteen inlined stylesheets and fifteen inline scripts — see the note
     at the top of that file for why one shared file wins here.

     IN THE HEAD, NOT ABOVE </body>. The assistant include below demands that
     it be the last line before </body>, and a second tag in that position
     makes its lookbehind miss and re-insert on every run. `defer` gets the
     same after-parse timing without competing for the spot.

     The lookahead is what keeps the tag off about, contact and sign-in: they
     have no demo slot, and a page that draws no controls should not fetch the
     script that draws them. */
  add('demo video: the controls script, once',
    /(?<!<script defer src="\/assets\/js\/vidctl\.js"><\/script>\n)<\/head>(?=[\s\S]*<video id="demoVid")/,
    '<script defer src="/assets/js/vidctl.js"></script>\n</head>');

  /* ---- §7 · a marked phrase that no longer fits a phone -------------
     The four marks wrap their phrase in `white-space:nowrap`, because the
     underline/lasso SVG spans the span and a phrase broken over two lines
     would be underlined across both. Fine while the phrase was set in Caveat
     Brush; MESHED Display sets wider, and a LONG marked phrase now exceeds a
     narrow viewport and scrolls the whole PAGE sideways.

     MEASURED at a 500px viewport, where `h2.hand` is 32px:

       products/recapr.html             "while the meeting is still running"  502px
       products/video-interviewer.html  "re-watched. A phone screen cannot."  533px

     The wrap leaves 456px usable at that width, so the widest of the two
     needs 32 x 456/533 = 27.4px -> 27px, which clears both with air. Scoped
     with `:has()` so it reaches ONLY a heading that actually carries a mark:
     every other h2 keeps the mockup's 32px. Where `:has()` is unsupported the
     declaration is dropped and the page behaves exactly as it does today.

     Guarded against a second run by the negative lookahead, like §4's two
     additive rules — for the same reason.

     ANCHORED ON THE SHAPE, NOT THE NUMBERS. The pages do not agree on their
     own mobile sizes — recapr and the interviewer pages set 40/32, ats sets
     38/31 — so matching literal values fixed two pages and silently skipped
     the rest. The two declarations run together on one line only inside this
     media query; everywhere else they carry margins and sit on their own
     lines, which is what keeps this off the base CSS. */
  add('shrink a marked heading that overflows a phone',
    /(h1\.hand\{font-size:\d+px\}h2\.hand\{font-size:\d+px\})(?!\nh2\.hand:has)/g,
    '$1\nh2.hand:has(.k-g,.k-y){font-size:27px}');

  /* ---- 6 · THE PRODUCT RENAMES -------------------------------------------
     Four products traded a brand name for a descriptive one:

       tasca    ->  Task & Productivity Manager
       Recapr   ->  Intelligent Note Taker
       Lexer    ->  Intelligent Document Management
       NousCRM  ->  Sales CRM

     home.js carries the same four for the two generated pages; these are for
     the standalone ones, which each spell the old name into their <title>,
     meta description, og tags, headings, body copy, footer product list and
     JSON-LD.

     THE FILENAMES AND SLUGS DO NOT MOVE. products/tasca.html stays
     products/tasca.html, so every existing URL and inbound link keeps working
     and nothing needs a redirect. That is what the guards are for:
     `(?<![\/\w])` refuses a match that follows a slash, which is what keeps
     the `tasca` in `products/tasca.html` and in the canonical URL untouched;
     `(?!\.html)` refuses one that begins a filename; `(?!\w)` keeps it off
     longer words. A bare global replace here would rewrite every href on the
     site and 404 the lot.

     TASCA TAKES TWO RULES BECAUSE ITS NEW NAME CONTAINS AN AMPERSAND, and the
     two places it appears want different spellings of one. JSON-LD is JSON
     inside a <script>: there a bare `&` is correct, and `&amp;` would show up
     in a search result as those five literal characters. HTML text and
     attributes want `&amp;`. So the JSON rule runs FIRST, matched on the exact
     `"name":"tasca"` shape — by the time the general rule runs there is no
     `tasca` left inside the JSON for it to mis-spell. The other three names
     have no ampersand, so one rule serves both contexts.

     RE-RUNNABLE BY CONSTRUCTION: after a pass there is no old name left to
     match, so a second run changes nothing. */
  add('JSON-LD name: tasca -> new name, JSON ampersand',
    /"name":"tasca"/g, '"name":"Task & Productivity Manager"');
  /* THE LOOKBEHIND BLOCKS A HYPHEN TOO, AND THE LOOKAHEAD BLOCKS ANY EXTENSION.
     The first version blocked only `/` and word chars behind, and only `.html`
     ahead — so `og-tasca.png` in the og:image and twitter:image URLs slipped
     past BOTH guards and became "og-Task &amp; Productivity Manager.png": a URL
     with a space and an ampersand in it, pointing at a file that does not
     exist. tasca is the only one of the four renames whose old name is
     lowercase and so collides with its own file slug, which is why it alone
     broke. `(?!\.[a-z0-9]{2,5}\b)` still permits a sentence-final "tasca."
     because that dot is followed by a space, not an extension. */
  add('tasca -> Task & Productivity Manager',
    /(?<![-\/\w])tasca(?!\w)(?!\.[a-z0-9]{2,5}\b)/g, 'Task &amp; Productivity Manager');
  add('Recapr -> Intelligent Note Taker',
    /(?<![\/\w])Recapr(?!\w)(?!\.html)/g, 'Intelligent Note Taker');
  add('Lexer -> Intelligent Document Management',
    /(?<![\/\w])Lexer(?!\w)(?!\.html)/g, 'Intelligent Document Management');
  add('NousCRM -> Sales CRM',
    /(?<![\/\w])NousCRM(?!\w)(?!\.html)/g, 'Sales CRM');

  /* ---- 7 · ARTICLES, BECAUSE A DESCRIPTIVE NAME IS NOT A BRAND ------------
     "tasca makes sure it gets done" was correct English: a proper noun takes no
     article. "Task & Productivity Manager makes sure it gets done" is not — a
     descriptive name needs "the". §6 cannot know that, because it replaces a
     string and has no idea whether the string landed in a sentence or in a
     footer list, and most of the places these names appear (nav, footer, the
     demo form's product dropdown, card labels) correctly take no article.

     So the article is added HERE, at the specific places the name is the bare
     subject of a sentence or the object of a verb — each one an exact string,
     verified against the page rather than guessed by a rule. The interviewer
     pages already set the pattern this matches: "What the Chat Interview
     does", never "What Chat Interview does".

     THE HEADINGS HAVE THE NAME INSIDE A KEYWORD SPAN, because tools/dedoodle.js
     colours it — so "the" goes OUTSIDE the span. It is a grammatical article,
     not part of the product's name, and colouring it would say it was.

     Each rule is idempotent: it matches only the state with no article, and
     after it runs that state is gone. */

  /* the "What X does" section headings */
  add('article: What the Task & Productivity Manager does',
    /What <span class="k-g">Task &amp; Productivity Manager<\/span> does/g,
    'What the <span class="k-g">Task &amp; Productivity Manager</span> does');
  add('article: What the Intelligent Note Taker does',
    /What <span class="k-g">Intelligent Note Taker<\/span> does/g,
    'What the <span class="k-g">Intelligent Note Taker</span> does');
  add('article: What the Intelligent Document Management does',
    /What <span class="k-g">Intelligent Document Management<\/span> does/g,
    'What the <span class="k-g">Intelligent Document Management</span> does');

  /* tasca: the hero line (and the meta description that repeats it), where the
     name opens a sentence and so takes a capitalised "The" */
  add('article: The Task & Productivity Manager makes sure (sentence start)',
    /(Your meetings create work\.(?:<br>|\s))Task &amp; Productivity Manager makes sure/g,
    '$1The Task &amp; Productivity Manager makes sure');
  add('article: and the Task & Productivity Manager is free during beta',
    /And Task &amp; Productivity Manager is <b>free during beta<\/b>/g,
    'And the Task &amp; Productivity Manager is <b>free during beta</b>');

  /* recapr: five sentence subjects and two objects */
  add('article: The Intelligent Note Taker reads the meeting (sentence start)',
    /<b>Intelligent Note Taker reads the meeting/g,
    '<b>The Intelligent Note Taker reads the meeting');
  add('article: On desktop, the Intelligent Note Taker asks',
    /On desktop, Intelligent Note Taker asks/g, 'On desktop, the Intelligent Note Taker asks');
  add('article: earlier, the Intelligent Note Taker flags it',
    /earlier, Intelligent Note Taker flags it/g, 'earlier, the Intelligent Note Taker flags it');
  add('article: The Intelligent Note Taker captures from the tab (sentence start)',
    /<\/h3><p>Intelligent Note Taker captures from the tab/g,
    '</h3><p>The Intelligent Note Taker captures from the tab');
  add('article: on older builds the Intelligent Note Taker will not offer it',
    /on older builds Intelligent Note Taker won/g, 'on older builds the Intelligent Note Taker won');
  add('article: Getting it out of the Intelligent Note Taker',
    /out of Intelligent Note Taker<span class="pm">/g,
    'out of the Intelligent Note Taker<span class="pm">');
  add('article: needs the Intelligent Note Taker',
    /needs Intelligent Note Taker\. There is nothing/g,
    'needs the Intelligent Note Taker. There is nothing');

  /* lexer: one sentence subject */
  add('article: so the Intelligent Document Management marks them',
    /so Intelligent Document Management marks them/g,
    'so the Intelligent Document Management marks them');

  /* THE CRM PAGE'S TITLE SAID ITS OWN NAME TWICE once NousCRM became Sales CRM:
     "Sales CRM by TALBOTIQ — A Sales CRM for the Desk and the Road". The
     trailing half is the tagline, so the tagline drops the repeat rather than
     the name dropping out of the title. */
  add('de-duplicate the Sales CRM page title and og:title',
    /Sales CRM by TALBOTIQ &mdash; A Sales CRM for the Desk and the Road/g,
    'Sales CRM by TALBOTIQ &mdash; For the Desk and the Road');
  add('de-duplicate the Sales CRM title (em dash as a character)',
    /Sales CRM by TALBOTIQ — A Sales CRM for the Desk and the Road/g,
    'Sales CRM by TALBOTIQ — For the Desk and the Road');

  /* ---- 8 · THE FINAL TWO NAMES --------------------------------------------
     Settled after §6 had already run once, so each of these has to fix BOTH a
     freshly dropped mockup and a page in the repo that is carrying the
     intermediate name:

       TalbotIQ ATS  ->  Intelligent Recruitment Software   ("Recruitment",
                         never "Requirement" — an ATS recruits.)
       TalbotIQ ERP  ->  Business Management System
       Intelligent Document Parser -> Intelligent Document Management
                         (the product is positioned past parsing)

     WHAT IS DELIBERATELY LEFT ALONE. "ATS" and "ERP" are also generic industry
     terms, and these pages use them both ways. The product name is renamed;
     the category noun is not, because "an Intelligent Recruitment Software is
     trusted a year in" is not English. So these stay exactly as written:

       "sync back to the ATS pipeline"          (ats.html)
       "An ERP built around how an SME runs"    (erp.html)
       "whether an ERP is trusted a year in"    (erp.html)
       "where the ERP takes over at the order"  (erp.html)
       "the invoice the ERP raises"             (erp.html)

     That is the same line already drawn for "And the rest of the CRM" on the
     Sales CRM page. Every rule below is therefore anchored to a position where
     only a product NAME can sit: a title, an og:title, a JSON-LD name, an
     aria-label, the header's product switcher, a link whose href is that
     product's own page, a <b> in a related-product chip, or an <option> in the
     demo form's product list. */

  /* the proper name, wherever it is spelled in full */
  add('TalbotIQ ATS -> Intelligent Recruitment Software',
    /TalbotIQ ATS/g, 'Intelligent Recruitment Software');
  add('TalbotIQ ERP -> Business Management System',
    /TalbotIQ ERP/g, 'Business Management System');

  /* the header: its accessible label and its product switcher */
  add('nav aria-label: ATS', /aria-label="ATS"/g, 'aria-label="Intelligent Recruitment Software"');
  add('nav aria-label: ERP', /aria-label="ERP"/g, 'aria-label="Business Management System"');
  add('header product switcher: ATS',
    /(<a class="prod" href="[^"]*">)ATS/g, '$1Intelligent Recruitment Software');
  add('header product switcher: ERP',
    /(<a class="prod" href="[^"]*">)ERP/g, '$1Business Management System');

  /* every link whose destination is that product's own page — footer product
     column, drawer, and the "rest of the suite" lists */
  add('link text: ATS -> Intelligent Recruitment Software',
    /(<a[^>]*href="[^"]*ats\.html"[^>]*>)ATS(<\/a>)/g, '$1Intelligent Recruitment Software$2');
  add('link text: ERP -> Business Management System',
    /(<a[^>]*href="[^"]*erp\.html"[^>]*>)ERP(<\/a>)/g, '$1Business Management System$2');

  /* the related-product chips put the name in a <b> */
  add('related chip: ATS', /(<a class="relchip" href="[^"]*ats\.html"><b>)ATS(<\/b>)/g,
    '$1Intelligent Recruitment Software$2');
  add('related chip: ERP', /(<a class="relchip" href="[^"]*erp\.html"><b>)ERP(<\/b>)/g,
    '$1Business Management System$2');

  /* the demo form's product dropdown */
  add('demo option: ATS', /<option>ATS<\/option>/g, '<option>Intelligent Recruitment Software</option>');
  add('demo option: ERP', /<option>ERP<\/option>/g, '<option>Business Management System</option>');

  /* the corrective pass for pages already carrying the intermediate name */
  add('Intelligent Document Parser -> Intelligent Document Management',
    /Intelligent Document Parser/g, 'Intelligent Document Management');

  /* ---- 9 · THE TWO RENAMED TITLES ----------------------------------------
     §8 swapped the name inside these titles and left two problems behind.

     ATS SAID ITS CATEGORY TWICE: "Intelligent Recruitment Software — AI-Driven
     Recruitment Software". The tagline half is the redundant one, so it is
     replaced with the product's own `position` line from products.js —
     "Requisition to signed offer" — which is existing approved copy rather
     than something invented here.

     AND BOTH LOST THEIR BRANDING. Nine of the eleven product pages title
     themselves "<Name> by TALBOTIQ — <tagline>"; ats and erp were the two that
     instead prefixed "TalbotIQ ", so replacing that prefix with the new name
     left them as the only two pages with no TALBOTIQ in the title at all.
     These put them on the same pattern as the other nine. */
  add('ats title/og:title -> pattern, without the doubled category',
    /Intelligent Recruitment Software — AI-Driven Recruitment Software/g,
    'Intelligent Recruitment Software by TALBOTIQ — Requisition to Signed Offer');
  add('erp title/og:title -> pattern, with the branding back',
    /Business Management System — Order to Cash, Purchase to Pay/g,
    'Business Management System by TALBOTIQ — Order to Cash, Purchase to Pay');

  /* ---- 10 · THE WEBM SOURCE THAT WAS NEVER SUPPLIED ------------------------
     Every product page's demo slot lists two <source>s, mp4 then webm. Six of
     the eleven now have a real mp4; no webm was ever produced for any of them,
     so on those six the second <source> is a guaranteed 404 on every page load.
     It is harmless — the mp4 is listed first and wins — but a request that can
     only ever fail should not be in the markup.

     ONLY THE POPULATED SLOTS. The rest still have no video at all; their slots
     are left exactly as they are, webm included, so that whoever supplies those
     videos finds the same shape the populated ones started from.

     FIVE OF THEM ARE ON THIS LIST FOR THE OPPOSITE REASON. The three chat
     modes — mcqs, timed-qa, conversational-interview — plus voice-interviewer
     and avatar-interviewer arrived AS webm and were transcoded to H.264 mp4
     rather than dropped in as they came: WebM has no playback on iOS Safari
     before 17.4. Four of the five were 1280x800, and the frame is 16/9 with
     `object-fit:cover`, so those were pillarboxed to 1920x1080 on the frame's
     own background instead of being cropped by the browser; avatar-interviewer
     came in at 3840x2160 and only needed scaling. */
  for (const slug of ['recapr', 'tasca', 'ats', 'vawlt', 'lexer', 'nouscrm', 'mcqs', 'timed-qa', 'conversational-interview', 'voice-interviewer', 'avatar-interviewer']) {
    add(`drop the unsupplied ${slug} webm source`,
      new RegExp('\\n\\s*<source src="[^"]*' + slug + '-demo\\.webm" type="video/webm">', 'g'), '');
  }

  /* ---- 11 · THE DEMO VIDEO RACE -------------------------------------------
     The slot's own script hides the "Demo video goes here" placeholder and
     starts playback from a `loadeddata` listener, and it attaches that listener
     at the very END of <body>. A LOCAL mp4 reaches HAVE_CURRENT_DATA before
     that point, so the event has already fired by the time anyone is listening:
     the placeholder never lifts and the video never plays. Verified on
     products/recapr.html — readyState 4, duration 29.9s, paused true, and the
     wrapper still without its `playing` class.

     THE BUG WAS INVISIBLE UNTIL A REAL FILE EXISTED. With no video the event
     never fired at all, so the placeholder staying put looked like the correct
     empty state rather than a race.

     The fix is the standard one: name the handler, and if the data is already
     there when we wire up, run it once immediately. Nothing else changes — the
     same class, the same play() call, the same reduced-motion branch, the same
     IntersectionObserver. The negative lookahead makes it re-runnable. */
  add('demo video: run the ready handler if the file already loaded',
    /( {4})v\.addEventListener\('loadeddata',function\(\)\{\n(\s+)w\.classList\.add\('playing'\);\n(\s+)if\(reduce\)\{ v\.controls=true; return; \}\n(\s+)var p=v\.play\(\); if\(p&&p\.catch\)\{ p\.catch\(function\(\)\{ v\.controls=true; \}\); \}\n {4}\}\);(?!\n {4}\/\* a local file)/g,
    `$1var onReady=function(){\n$2w.classList.add('playing');\n$3if(reduce){ v.controls=true; return; }\n$4var p=v.play(); if(p&&p.catch){ p.catch(function(){ v.controls=true; }); }\n$1};\n$1v.addEventListener('loadeddata',onReady);\n$1/* a local file can reach HAVE_CURRENT_DATA before this script runs, so the\n$1   event may already have fired by the time we are listening */\n$1if(v.readyState>=2) onReady();`);

  /* ---- 12 · REPAIR THE og:image URL THE RENAME BROKE ----------------------
     Restores the two URLs the first version of the tasca rule rewrote. Matched
     on the damaged form, so it is idempotent and self-healing on a re-run. */
  add('repair tasca og:image / twitter:image URL',
    /https:\/\/talbotiq\.com\/og-Task &amp; Productivity Manager\.png/g,
    'https://talbotiq.com/og-tasca.png');

  /* ---- 13 · the website assistant ---------------------------------- */
  /* Two rules, in this order, so a re-run is a no-op and a WRONG path heals
     itself rather than accumulating: strip any existing include first, then
     put exactly one back in the right place. The src is root-absolute on
     purpose — see the note in build.js — so this same line is correct at every
     depth, and `solutions/` cannot end up with a sibling path that resolves to
     nothing the way the product-page rules once did. */
  /* Each rule is a no-op once the page is right, so a re-run reports zero
     rewrites — which is the signal this script's own output relies on. The
     first strips only a WRONG include (a stale depth-relative one, say),
     leaving a correct one alone; the second adds one only where the line is
     not already immediately above </body>. */
  add('assistant: drop a wrong include',
    new RegExp('[ \\t]*<script[^>]*\\bsrc="(?!' + rx(SRC.chat) + '")[^"]*\\bchat\\.js(?:\\?[^"]*)?"[^>]*></script>\\n?', 'g'), '');
  add('assistant: one include, just before </body>',
    new RegExp('(?<!<script defer src="' + rx(SRC.chat) + '"></script>\\n)</body>'),
    '<script defer src="' + SRC.chat + '"></script>\n</body>');

  /* ---- 13b · the nav shelves ---------------------------------------
     These pages had no dropdowns: follow a link out of the homepage's Products
     or Solutions shelf and you landed on a header that could not open one, so
     the menu worked exactly once per visit. assets/js/nav.js — GENERATED by
     build.js from the same data as index.html's own panels — gives every one of
     them the same three shelves. One include, like the assistant's.

     ANCHORED ON THE ASSISTANT'S LINE, NOT ON </body>, and that is the whole
     trick: the rule above is idempotent because it checks that chat.js is the
     LAST thing before </body>. Insert anything between them and that check
     fails, and a re-run quietly adds a second chat.js. So this one goes ABOVE
     that line and leaves it exactly where it was. Same negative lookbehind, so
     a re-run is a no-op here too. */
  add('nav shelves: drop a wrong include',
    new RegExp('[ \\t]*<script[^>]*\\bsrc="(?!' + rx(SRC.nav) + '")[^"]*\\bnav\\.js(?:\\?[^"]*)?"[^>]*></script>\\n?', 'g'), '');
  add('nav shelves: one include, above the assistant',
    new RegExp('(?<!<script defer src="' + rx(SRC.nav) + '"></script>\\n)(<script defer src="' + rx(SRC.chat) + '"></script>)'),
    '<script defer src="' + SRC.nav + '"></script>\n$1');

  /* ---- 13c · the typewriter ----------------------------------------
     Every .hand heading types itself in, requested for "every heading of this
     meshed display" and explicitly "also for all product headings". These
     pages carry thirteen of them each, which is where most of the site's
     display headings actually live.

     ANCHORED ABOVE THE NAV SHELVES for the same reason the shelves anchor
     above the assistant: the assistant's rule stays idempotent only while
     chat.js is the last line before </body>, and the shelves' rule only while
     nav.js is immediately above chat.js. Each new include therefore goes on
     top of the previous one and never between it and </body>. Same negative
     lookbehind, so a re-run is a no-op.

     assets/js/texttype.js needs nothing from these pages except the .hand
     class they already have, and it only animates text that is already in
     their markup — so a page that never gets the script, or gets it and
     404s, is exactly as it is today. */
  add('typewriter: drop a wrong include',
    new RegExp('[ \\t]*<script[^>]*\\bsrc="(?!' + rx(SRC.tt) + '")[^"]*\\btexttype\\.js(?:\\?[^"]*)?"[^>]*></script>\\n?', 'g'), '');
  add('typewriter: one include, above the nav shelves',
    new RegExp('(?<!<script defer src="' + rx(SRC.tt) + '"></script>\\n)(<script defer src="' + rx(SRC.nav) + '"></script>)'),
    '<script defer src="' + SRC.tt + '"></script>\n$1');

    /* ---- ONE TAG EACH, EVEN WHEN BOTH COPIES ARE CORRECT ---------------
       The drop rules above spare a canonical include, which is right until two
       of them exist. build.js writes products/index.html and solutions/index.html
       and puts its script block in its own place; this script then inserts one
       in the position it wants. While the two disagreed on the URL the drop rule
       removed build.js's copy and the count stayed at one by accident. Now that
       they agree, both survive, and the typewriter ran twice.

       Each rule drops a canonical tag only when another canonical tag follows it,
       so the LAST one wins -- which is the one this script placed, in the order
       it intends. Idempotent: with a single tag left the lookahead cannot match.
       These must run after the inserts above, or they would tidy up before the
       duplicate exists. */
    add('assistant: one tag, not two',
      new RegExp('[ \\t]*<script defer src="' + rx(SRC.chat) + '"></script>\\n'
        + '(?=[\\s\\S]*<script defer src="' + rx(SRC.chat) + '">)', 'g'), '');
    add('nav shelves: one tag, not two',
      new RegExp('[ \\t]*<script defer src="' + rx(SRC.nav) + '"></script>\\n'
        + '(?=[\\s\\S]*<script defer src="' + rx(SRC.nav) + '">)', 'g'), '');
    add('typewriter: one tag, not two',
      new RegExp('[ \\t]*<script defer src="' + rx(SRC.tt) + '"></script>\\n'
        + '(?=[\\s\\S]*<script defer src="' + rx(SRC.tt) + '">)', 'g'), '');
    add('demo form: one tag, not two',
      new RegExp('[ \\t]*<script defer src="' + rx(SRC.df) + '"></script>\\n'
        + '(?=[\\s\\S]*<script defer src="' + rx(SRC.df) + '">)', 'g'), '');

  /* Its four rules, inline, because these pages do not link talbotiq.css and
     so cannot see section 31 of it. Trimmed to what applies here: the
     homepage's copies also have to beat that file's .rv-head reveal, and
     there is no reveal system on these pages to beat.

     THE FONT STACK IS SPELLED OUT rather than `var(--f-text)`. These pages
     define --teal but NOT --f-text — checked, not assumed — so the variable
     would resolve to nothing and the caret would inherit the display face it
     is deliberately not set in.

     THE GUARD HAS TO LOOK IN THE DIRECTION THE BLOCK ACTUALLY IS, and getting
     that wrong is the reason this rule took three goes. Both wrong versions
     are worth recording, because the trap is easy to walk into twice:

       1. `/(<style>\n)(?!@font-face...)/` was section 4's shape, copied.
          That guard is POSITIONAL — it only asks whether the thing is the
          FIRST item after <style> — so inserting anything else at the top of
          the same <style> silently re-armed section 4's own additive rule.
          Three copies of the @font-face accumulated in twenty-four pages.
          Section 4's guard is fixed above and now asks the whole-document
          question instead.

       2. `/(?![\s\S]*\.hand\.tt...)([ \t]*<\/style>)/`, moving the block to
          the end of the <style> to keep the two additive rules apart. This
          re-inserted on every run, and the reason is obvious once seen: a
          LOOKAHEAD at the </style> position can only see forward, and a
          block inserted just before </style> is BEHIND that position. The
          guard was asking whether the block existed in the closing tag.

     So it anchors at <style> — where everything inside the element is ahead
     of the match and a forward guard can therefore see it — and the guard is
     whole-document rather than positional. Cascade order does not matter
     either way here: these rules select .tt-c and .tt-at, which nothing else
     on these pages mentions. */
  add('typewriter: its stylesheet, inline',
    /(<style>\n)(?![\s\S]*\.hand\.tt \.tt-c\{)/g,
    '$1.hand.tt .tt-c{visibility:hidden;position:relative}\n'
    + '.hand.tt .tt-c.on{visibility:visible}\n'
    + '.hand.tt .tt-c.tt-at::after{content:"|";position:absolute;left:100%;top:0;'
    + 'font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
    + 'font-weight:400;color:var(--teal);animation:tt-blink .53s steps(1,end) infinite alternate}\n'
    + '@keyframes tt-blink{from{opacity:1}to{opacity:0}}\n'
    + '@media (prefers-reduced-motion:reduce){.hand.tt .tt-c{visibility:visible}'
    + '.hand.tt .tt-c.tt-at::after{content:none}}\n');

  /* ---- §9 · the mode card's rule grows on the compositor ------------
     The interviewer-family pages give each mode card a 2px teal rule that
     grows out from centre on hover, and they do it by transitioning `width`
     from 0 to 38px. Width is a LAYOUT property: every frame of that 260ms
     re-runs layout for the element instead of being handed to the
     compositor, which is the one thing a hover animation should never do.

     `transform: scaleX()` is the same picture — the box is centred by
     `margin:0 auto`, and scaleX's default origin is the centre, so it still
     opens from the middle — but it animates on the compositor. The box now
     reserves its 38px at all times rather than growing from zero; nothing
     moves, because the rule is a centred block with a fixed 2px height and no
     inline siblings.

     THIS LIVES HERE RATHER THAN IN THE PAGES because the pages are mockups
     that get re-dropped. A hand-edit to the eight of them would be silently
     undone by the next drop — which is exactly what happened to §7 on
     video-interviewer.html. Two rules, both matching only the width form, so
     a page already converted is left alone. */
  add('mode-card rule: transition width -> scaleX',
    /(\.modecard \.rule\{display:block;)width:0(;height:2px;background:var\(--teal\);border-radius:1px;\s*margin:0 auto 10px;)transition:width( \.26s ease\})/g,
    '$1width:38px$2transform:scaleX(0);transition:transform$3');
  add('mode-card rule: hover width -> scaleX',
    /\.modecard:hover \.rule\{width:38px\}/g,
    '.modecard:hover .rule{transform:scaleX(1)}');

  /* ---- §10 · TWO THINGS OUT OF THE FOOTER, by request --------------
     Both were on all 27 pages, which is why they are rules rather than edits.
     build.js has the same two removals in its own footer template — these are
     the standalone family's copy of that decision.

     THE PHONE NUMBERS. Both of them sat under the address in the last column,
     offered to everybody who scrolled past. They are still on the contact page
     and in the demo aside, which is where somebody looking for a number goes.
     Anchored on the mailto line so only the footer's numbers go: a tel: link in
     the body of the contact page is not this rule's business. The repeated
     group is dropped by keeping only $1, and with the numbers gone there is
     nothing after the address to match, so a re-run is a no-op.

     PRIVACY POLICY · TERMS · SECURITY. All three were unlinked text — no href,
     because this site has no privacy page, no terms page and no security page —
     so the row named three documents a reader could not open. Removed rather
     than re-pointed: the old site's policy is not this site's policy. The
     copyright keeps the line to itself. */
  add('footer: no phone numbers under the address',
    /(<div class="fcol"><h4>Get in touch<\/h4>\s*<a href="mailto:[^"]*">[^<]*<\/a>)(?:\s*<a href="tel:[^"]*">[^<]*<\/a>)+/g,
    '$1');
  add('footer: no Privacy/Terms/Security row',
    /\n\s*<span>\s*<a>Privacy Policy<\/a>\s*&middot;\s*<a>Terms<\/a>\s*&middot;\s*<a>Security<\/a>\s*<\/span>/g,
    '');

  /* ---- §11 · NO PHONE NUMBER IS DISPLAYED ANYWHERE BELOW THE FOLD --
     The first pass at this took the footer's `tel:` links and reported the
     footers done. IT WAS WRONG ON EIGHT PAGES. ats, erp, signin, contact and
     the four solution pages put a wa.me link in that column instead of a tel:
     one — same digits on screen, different href — so a rule keyed on `tel:`
     walked straight past them. Hence the shape of the rules below: they key on
     THE DIGITS BEING VISIBLE, not on the protocol carrying them.

     THE CHANNEL STAYS, THE DIGITS GO. A wa.me link is relabelled "WhatsApp"
     and keeps working; a `tel:` chip is relabelled with what it does. Only the
     bare `tel:` links in a contact block are removed outright, because a link
     whose entire content was the number has nothing left to say.

     WHAT IS DELIBERATELY LEFT: the contact page's own Phone rows and the note
     under its form, the same two on the demo page, and the number in the
     api/demo.js failure page. Those are mid-page contact DETAIL on the two
     pages a reader goes to when they want to reach somebody, and the page a
     reader lands on when the form did not work. The request was the bottom of
     the page, and this is the line that draws. */
  add('footer: WhatsApp link shows the word, not the number',
    /(<div class="fcol"><h4>Get in touch<\/h4>\s*<a href="mailto:[^"]*">[^<]*<\/a>\s*<a href="https:\/\/wa\.me\/[^"]*"[^>]*>)\s*\+?\d[\d\s-]{6,}\s*(<\/a>)/g,
    '$1WhatsApp$2');
  /* CARVED OUT BY REQUEST. This rule strips bare `tel:` links from a contact
     block, on the reasoning that a link whose whole content is the number has
     nothing to say. The block now deliberately shows the number, so the row
     above must survive: it does because it is `<a class="tel" href="tel:...">`
     carrying an svg, and this pattern matches only `<a href="tel:...">` whose
     content has no tags. That is load-bearing, not luck — if you widen either
     pattern, widen this comment too. */
  add('contact block: no phone links under the address',
    /(<div class="contact">\s*<a href="mailto:[^"]*">[^<]*<\/a>)(?:\s*<a href="tel:[^"]*">[^<]*<\/a>)+/g,
    '$1');
  /* ---- the contact block's phone row -------------------------------
     WHATSAPP OUT, THE OFFICE NUMBER IN. Asked for directly. The block is the
     same component on all seven pages that carry it, so all seven change
     together rather than one page disagreeing with its siblings.

     Two shapes go in: the wa.me link on six pages, and about.html's
     `<p class="co">`, which already printed the same number but as dead text
     that could not be tapped. Both become the one dialling row. */
  add('contact block: WhatsApp -> the office number, with its handset',
    /(<div class="contact">\s*<a href="mailto:[^"]*">[^<]*<\/a>\s*)<a href="https:\/\/wa\.me\/[^"]*"[^>]*>[^<]*<\/a>/g,
    `$1${PHONE_ROW}`);
  add('contact block: the printed number becomes the same dialling row',
    /(<div class="contact">\s*<a href="mailto:[^"]*">[^<]*<\/a>\s*)<p class="co">\s*\+?[\d\s]+<\/p>/g,
    `$1${PHONE_ROW}`);
  /* The icon needs one line of layout, and these pages each carry their own
     copy of the stylesheet inline, so it goes in beside the rule it extends.
     The lookahead is the idempotency guard. */
  add('contact block: the phone row lays out its handset',
    /(\.contact a\{color:var\(--green\);text-decoration:none;font-weight:600;display:block\})(?!\s*\.contact a\.tel)/g,
    '$1\n.contact a.tel{display:flex;align-items:center;gap:9px}\n.contact a.tel svg{flex:none}');

  /* ---- the share card, on every page, described completely -----------
     EVERY ONE OF THESE IS GUARDED WHOLE-DOCUMENT, not positionally. Several of
     them insert at the same anchor — the og:image line — and a `(?!next thing)`
     guard would re-arm the moment a sibling rule inserted ahead of it, adding
     the same tag again on every run. `(?![\s\S]*name)` asks the only question
     that stays true: is this tag anywhere in the page yet.

     WHY THE EXTRA TAGS AT ALL. A consumer that is not told the image's size
     has to fetch it before it can lay anything out, and several guess a ratio
     meanwhile and letterbox or crop to it — a correctly proportioned card then
     still arrives squashed in one client and trimmed in another. secure_url is
     what older Outlook and some mail gateways read instead of og:image. */
  const OGI = '<meta property="og:image" content="([^"]*)">';

  /* signin.html had no image and no twitter card at all — it shared as a bare
     blue link. It goes first so the rules below have an og:image to hang on. */
  add('social: signin gets a share card too',
    /(^([ \t]*)<meta property="og:url" content="[^"]*">)(?![\s\S]*property="og:image")/m,
    `$1\n$2<meta property="og:image" content="${OG_IMAGE}">`);
  add('social: signin gets a twitter card too',
    /(^([ \t]*)<meta property="og:image" content="[^"]*">)(?![\s\S]*name="twitter:card")/m,
    '$1\n$2<meta name="twitter:card" content="summary_large_image">');

  add('social: the card declares a secure url',
    new RegExp('(^([ \\t]*)' + OGI + ')(?![\\s\\S]*og:image:secure_url)', 'm'),
    '$1\n$2<meta property="og:image:secure_url" content="$3">');
  add('social: the card declares its type',
    new RegExp('(^([ \\t]*)' + OGI + ')(?![\\s\\S]*og:image:type)', 'm'),
    '$1\n$2<meta property="og:image:type" content="image/png">');
  add('social: the card declares its exact pixels',
    new RegExp('(^([ \\t]*)' + OGI + ')(?![\\s\\S]*og:image:width)', 'm'),
    '$1\n$2<meta property="og:image:width" content="1200">\n$2<meta property="og:image:height" content="630">');
  add('social: the card has alt text',
    new RegExp('(^([ \\t]*)' + OGI + ')(?![\\s\\S]*og:image:alt)', 'm'),
    `$1\n$2<meta property="og:image:alt" content="${OG_ALT}">`);
  add('social: twitter gets the image too',
    new RegExp('(^([ \\t]*)' + OGI + ')(?![\\s\\S]*name="twitter:image")', 'm'),
    '$1\n$2<meta name="twitter:image" content="$3">');
  add('social: and its alt text',
    /(^([ \t]*)<meta name="twitter:image" content="([^"]*)">)(?![\s\S]*twitter:image:alt)/m,
    `$1\n$2<meta name="twitter:image:alt" content="${OG_ALT}">`);

  /* ---- AND THE ONE RULE THAT WAS MISSING: THE URL ITSELF ------------------
     EVERY RULE ABOVE IS INSERT-ONLY. Each is guarded by
     `(?![\s\S]*the-tag-name)`, which asks "is this tag anywhere in the page
     yet" — so once a card tag EXISTS, nothing above will ever look at its
     value again. Changing defaultOgImage in site.config.json therefore reached
     the five generated pages (build.js reads the config on every build) and
     silently left the twenty-four hand-written ones pointing at the old file.

     THAT IS NOT HYPOTHETICAL, IT IS THE BUG THIS RULE EXISTS FOR. The card was
     regenerated under a content-hashed name, the previous file was deleted by
     tools/build-og.mjs, and the retired URL then answered 404 while WhatsApp
     went on showing the stretched wordmark it had already cached. The pages
     were swept by hand that day, which is exactly the kind of step that is
     remembered once and then not.

     IDEMPOTENT BY CONSTRUCTION, and worth being explicit about because this
     file's contract is that a second run reports zero rewrites. The lookahead
     is `(?!<the configured url>")` — the rule matches a card URL only when it
     is NOT already the configured one. After it runs, every one of these tags
     holds exactly that URL, so the lookahead fails everywhere and the second
     pass cannot match. It also self-heals in the other direction: point the
     config at a new file and one run moves all three tags on all pages.

     THE THREE TAGS THAT CARRY A URL, and only those. `og:image:type`,
     `:width`, `:height`, `:alt` and `twitter:image:alt` all begin with the
     same characters, so the property name is anchored with its own closing
     quote — `og:image"` cannot match `og:image:type"`. */
  const OG_URL_ESC = OG_IMAGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /* ---- Google Tag Manager, container GTM-T4ZK68F -------------------------
     The same two halves build.js emits, pasted verbatim from what marketing
     supplied. Google's snippet is not ours to reformat, so it goes in byte for
     byte including its line breaks, and both files carry identical text.

     TWO RULES WITH TWO DIFFERENT GUARDS, because both halves mention the
     container id, so guarding either on "GTM-T4ZK68F" would make the second
     rule think the first one's work was its own and skip a page that still
     needs the noscript. They key on the one string unique to each instead:
     gtm.js?id= for the loader, ns.html?id= for the noscript.

     Guarded whole-document, not positionally -- the trap this file has been
     bitten by repeatedly. Second run reports zero. */
  const GTM_HEAD = "<!-- Google Tag Manager -->\n"
    + "<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\n"
    + "new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\n"
    + "j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n"
    + "'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n"
    + "})(window,document,'script','dataLayer','GTM-T4ZK68F');</script>\n"
    + "<!-- End Google Tag Manager -->";
  const GTM_BODY = "<!-- Google Tag Manager (noscript) -->\n"
    + '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-T4ZK68F"\n'
    + 'height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n'
    + "<!-- End Google Tag Manager (noscript) -->";

  add('gtm: loader, directly below the charset',
    /(^[ \t]*<meta charset="utf-8">)(?![\s\S]*gtm\.js\?id=)/m,
    '$1\n' + GTM_HEAD);
  add('gtm: noscript, immediately after the opening body tag',
    /(^[ \t]*<body>)(?![\s\S]*ns\.html\?id=)/m,
    '$1\n' + GTM_BODY);

  /* ---- the site icon, on the hand-written pages too ----------------------
     Same four links as build.js emits, and the same reasoning: favicon.ico for
     Windows and for anything that fetches it regardless of markup, a 32px PNG
     for a crisp tab, apple-touch-icon for iOS, and the manifest to carry the
     Android sizes.

     TWO RULES, STRIP THEN INSERT, which is the pattern this file already uses
     for the assistant include -- and it exists because the first version of
     this rule was INSERT-ONLY. It was guarded by "is an apple-touch-icon
     anywhere in the page", so once three links were in, changing the set could
     never reach the twenty-four hand-written pages again. That is the same
     trap the share-card URL fell into, one section down.

     BOTH ARE IDEMPOTENT. The strip matches an icon-ish link ONLY when its href
     is not one of the four canonical ones, so a correct page offers it nothing
     to match; the insert is guarded on the manifest line, which the insert
     itself adds. Second run reports zero. */
  const ICON_LINKS =
      '<link rel="icon" href="/favicon.ico" sizes="any">'
    + '\n$2<link rel="icon" href="/assets/brand/favicon-32.png" type="image/png" sizes="32x32">'
    + '\n$2<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">'
    + '\n$2<link rel="manifest" href="/site.webmanifest">';
  add('site icon: drop a non-canonical icon link',
    /[ \t]*<link rel="(?:icon|apple-touch-icon|manifest|mask-icon)"(?![^>]*href="(?:\/favicon\.ico|\/assets\/brand\/favicon-32\.png|\/assets\/brand\/apple-touch-icon\.png|\/site\.webmanifest)")[^>]*>\n?/g,
    '');
  add('site icon: the canonical four, above the viewport meta',
    /(^([ \t]*)<meta name="viewport" content="[^"]*">)(?![\s\S]*rel="manifest")/m,
    '$1\n$2' + ICON_LINKS);

  /* AND A THIRD RULE, BECAUSE href ALONE COULD NOT TELL THEM APART. The set
     this replaces ended in the very same apple-touch-icon line, byte for byte,
     so the strip above -- which decides by href -- had no way to remove the old
     one without removing the new one. The insert anchors at the viewport meta,
     so the canonical block lands ABOVE whatever was already there, and the
     leftovers are simply the icon links that follow the manifest line.

     Idempotent because the one-or-more group has to match at least one icon
     link after the manifest: once they are gone the pattern cannot match at
     all, and the second run reports zero. */
  add('site icon: drop leftovers below the canonical block',
    /(<link rel="manifest" href="\/site\.webmanifest">\n)(?:[ \t]*<link rel="(?:icon|apple-touch-icon|manifest|mask-icon)"[^>]*>\n?)+/g,
    '$1');

  add('social: every card tag names the configured image',
    new RegExp('(<meta (?:property="og:image"|property="og:image:secure_url"'
      + '|name="twitter:image") content=")(?!' + OG_URL_ESC + '")[^"]*(">)', 'g'),
    '$1' + OG_IMAGE + '$2');

  /* ---- the enquiry panel wears the brand's colours -------------------
     contact.html carries its own copy of the demo form's stylesheet, so the
     same four corrections that landed in assets/css/talbotiq.css have to land
     here too or the two pages disagree. Each is keyed on the exact old
     declaration, so a page already corrected matches nothing.

     THE LINK ONE IS THE REAL BUG. `.dnote a` had no rule in either file, so
     "call the office" rendered in the browser's default blue with a default
     underline, on a dark teal panel. It was the only element on the page that
     looked like an accident. */
  add('enquiry panel: the gradient loses its slate-blue stop',
    /background: linear-gradient\(rgb\(10 61 63 \/ \.92\) 0%, rgb\(52 78 96 \/ \.89\) 100%\);/g,
    'background: linear-gradient(160deg, rgb(9 58 56 / .94) 0%, rgb(5 38 33 / .94) 100%);');
  add('enquiry panel: the focus ring goes teal',
    /border-color: #FFCD57;\s*\n\s*box-shadow: 0 0 0 3px rgb\(255 205 87 \/ \.45\);/g,
    'border-color: var(--teal);\n  box-shadow: 0 0 0 3px rgb(2 168 133 / .38);');
  add('enquiry panel: the submit button matches every other primary action',
    /background: #FFCD57; color: #1E293B; border: 0; border-radius: 12px;/g,
    'background: var(--teal); color: #fff; border: 0; border-radius: 12px;');
  add('enquiry panel: and so do its hover and active states',
    /\.dsubmit:hover\{ background: #FFD97C; color: #1E293B; \}\n\.dsubmit:active\{ background: #F3BE43; \}/g,
    '.dsubmit:hover{ background: var(--green); color: #fff; }\n'
    + '.dsubmit:active{ background: #016A50; }');
  /* Whole-document guard, per the trap this file has been bitten by: a
     positional lookahead here would re-arm the moment any other rule inserted
     at the same anchor. */
  add('enquiry panel: the note’s link stops being browser-blue',
    /(\.dnote code\{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12\.5px; \})(?![\s\S]*\.dnote a\{)/g,
    '$1\n.dnote a{ color: #3FD4B0; text-decoration: underline; text-underline-offset: 2px; }\n'
    + '.dnote a:hover{ color: #fff; }');
  /* The phone was a link and the email beside it was bare text, in the same
     sentence. Both are ways to reach a person; only one was reachable. */
  add('enquiry note: the email address becomes a link too',
    /(<p class="dnote">Prefer to talk to a person\? )hello@talbotiq\.com/g,
    '$1<a href="mailto:hello@talbotiq.com">hello@talbotiq.com</a>');

  /* ---- the newsletter band ------------------------------------------
     GONE, by request, the same as on the generated pages. It had no endpoint,
     so it rendered a disabled field captioned "Not wired up yet" — a signup
     that asks for an address it cannot accept.

     Inherently idempotent: it is a deletion, so once the band is gone there is
     nothing left to match. `\n<\/div>\n` with no indent in front of it closes
     the OUTER div — every div nested inside this band is indented, so the
     non-greedy run cannot stop early on one of them. */
  add('newsletter band -> removed',
    /\n<!-- ══ NEWSLETTER ══ -->\n<div class="news">[\s\S]*?\n<\/div>\n/g, '');

  /* ---- WHATSAPP COMES OFF THE SITE ---------------------------------
     Asked for: the channel goes, the office number stays in its place. These
     pages offered it in four shapes, so all four are handled here rather than
     by hand on nine files that get re-dropped.

     The footer column takes the same dialling row the contact block above
     uses, so the two agree. The chips are REMOVED rather than converted —
     every chip row already carries a "Call the office" chip immediately after
     the WhatsApp one, and converting would have printed the same destination
     twice in a row. The phone button in the mobile bar is repointed rather
     than deleted, because deleting it would leave that bar with one lone
     button where the layout expects two. */
  add('footer: WhatsApp -> the office number, with its handset',
    /(<div class="fcol"><h4>Get in touch<\/h4>\s*<a href="mailto:[^"]*">[^<]*<\/a>\s*)<a href="https:\/\/wa\.me\/[^"]*"[^>]*>[^<]*<\/a>/g,
    `$1${PHONE_ROW}`);
  add('footer: the phone row lays out its handset',
    /(\.fcol a\{display:block;color:#C4C7CA;text-decoration:none;padding:4px 0\})(?!\s*\.fcol a\.tel)/g,
    '$1\n.fcol a.tel{display:flex;align-items:center;gap:8px}\n.fcol a.tel svg{flex:none}');
  /* Both chip rows on the contact page: the icon chip near the top and the
     flat one in the closing band. Non-greedy to the first </a>, which is the
     chip's own — the svg inside it closes no anchor. */
  add('chip row: the WhatsApp chip goes',
    /\n[ \t]*<a class="chip" href="https:\/\/wa\.me\/[^"]*"[^>]*>[\s\S]*?<\/a>/g, '');
  add('mobile bar: WhatsApp -> call the office',
    /<a class="btn btn-secondary" href="https:\/\/wa\.me\/[^"]*">WhatsApp<\/a>/g,
    `<a class="btn btn-secondary" href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a>`);

  add('contact block: WhatsApp link shows the word, not the number',
    /(<div class="contact">\s*<a href="mailto:[^"]*">[^<]*<\/a>\s*<a href="https:\/\/wa\.me\/[^"]*"[^>]*>)\s*\+?\d[\d\s-]{6,}\s*(<\/a>)/g,
    '$1WhatsApp$2');
  /* ---- THE NUMBER IS PRINTED, NOT HIDDEN BEHIND A VERB ---------------
     REVERSED BY REQUEST, and the four rules this replaces did the opposite:
     they hunted down every printed number on the site and swapped it for the
     words "Call the office". The reasoning then was that a page should not ask
     a desktop reader to copy fourteen digits by hand. The reasoning now is the
     one that wins: a company that will not show its phone number reads as a
     company you cannot reach, and a reader dialling from a desk phone, saving
     the contact, or just checking somebody real is on the other end had
     nothing to work with.

     ONE RULE FOR EVERY PLACE, because the label had spread to four different
     shapes — a chip, a button in the mobile bar, a row in the detail list and
     a link in the note under the form. Matching the tel: anchor rather than
     any one of those containers catches all four and anything added later. It
     is still a tel: link, so a phone still taps it; the digits are additional,
     not a replacement. */
  add('phone links print the number instead of naming the action',
    /* The chips carry an inline svg between the anchor and its label, so the
       match has to skip whatever sits in front of the words — bounded by a
       (?!<\/a>) so it can never run past the end of one link into the next. */
    /(<a[^>]*href="tel:\+?\d+"[^>]*>(?:(?!<\/a>)[\s\S])*?)\s*[Cc]all the office\s*(<\/a>)/g,
    `$1${PHONE_DISPLAY}$2`);

  /* The collapse still has to happen — contact.html shipped two Phone rows,
     a mobile and a landline — but what survives now prints the office number
     rather than naming the act of ringing it. */
  add('detail list: one Phone row, not two',
    /<li><span>Phone<\/span><a href="tel:[^"]*">\s*\+?\d[\d\s-]{6,}<\/a><\/li>\s*(?:<li><span>Phone<\/span><a href="tel:[^"]*">\s*\+?\d[\d\s-]{6,}<\/a><\/li>)+/g,
    `<li><span>Phone</span><a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a></li>`);
  /* Whatever a row prints, it dials the landline. */
  add('detail list: the Phone row dials the landline',
    new RegExp('(<li><span>Phone</span><a href="tel:)(?!' + PHONE_TEL.replace('+', '\\+') + '")[^"]*(">)', 'g'),
    '$1' + PHONE_TEL + '$2');
  /* The note under the form printed bare digits with no link on some pages. */
  add('form note: the number is a link, not loose text',
    /(<p class="dnote">[^<]*?)\bor\s+(\+?\d[\d\s-]{6,})\.(<\/p>)/g,
    `$1or <a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a>.$3`);

  /* ---- §10 · the chat bubble sat on the mobile CTA bar ---------------
     24 of the 26 pages pin `.mobar` to the bottom edge below 880px and
     reserve `body{padding-bottom:72px}` so the last section is not hidden
     behind it. The bubble's default corner is 20px off the bottom, so it
     landed INSIDE that 72px band on every one of them — 56x38px of the
     bar's right-hand button ("WhatsApp", "Leadership", "See how scoring
     works") sat under a widget with a z-index of 2147483000, and that part
     of the button could not be tapped at all.

     The page already states the bar's height once. This makes it state the
     same number in the one other place that has to know it, so the two can
     never drift: assets/js/chat.js reads --tq-bottom-bar and keeps both the
     bubble and the dragged window above it. index.html and demo.html have no
     mobar, declare nothing, and read 0 — they are untouched.

     LIVES HERE, NOT IN THE PAGES, for §9's reason: these are mockups that get
     re-dropped, and 24 hand-edits would be silently undone by the next drop.
     The lookahead makes a second run a no-op. */
  add('mobile CTA bar: tell the chat bubble how tall it is',
    /body\{padding-bottom:72px(?!;--tq-bottom-bar)\}/g,
    'body{padding-bottom:72px;--tq-bottom-bar:72px}');

  /* ---- ONE BOOK A DEMO, AND IT IS THE REAL ONE ----------------------
     Asked for: the product pages use the homepage's demo flow, exactly.

     THE BLOCK BEING DELETED WAS NEVER A FORM. `.formsec#form` is a mockup
     carried over from the template: no <form> element, no action, not one
     `name` attribute on any of its inputs, and a "Request demo" submit that is
     an <a href="/demo">. Anyone who filled it in and pressed the button had
     every answer discarded and landed on /demo with an empty form — which is
     how an enquiry that looked sent was lost. The real one lives on /demo:
     <form action="/api/demo" method="post">, which posts with JavaScript off.

     So the CTAs stop scrolling to a decoration and go where the homepage's
     Book a demo goes. This REVERSES the reasoning in the header-CTA note
     above, which left the hero and closing buttons on #form because that is
     "what they are for" — true while the local block looked like a form, wrong
     now that it is established it never was one.

     PRODUCT PAGES ONLY, which is the scope of the request. The four solutions
     pages carry the identical dead block and are knowingly left alone.

     BOTH ARE IDEMPOTENT BY CONSTRUCTION. The first is a deletion, so a second
     run finds no block; the second removes the only `#form` on the page, so a
     second run has nothing to match. And `\n</div>\n` with no indent in front
     of it closes the OUTER div — every div inside the block is indented, so
     the non-greedy run cannot stop early. Same argument as the newsletter band
     above, and checked against a depth counter on all seventeen pages. */
  if (dir === 'products') {
    add('product page: the mockup demo form -> removed',
      /\n<div class="formsec" id="form">[\s\S]*?\n<\/div>\n/g, '');
    add('product page: Book a demo -> the real form on /demo',
      /href="#form"/g, `href="${DEMO}"`);
  }

  /* ---- LAST RULE IN THE FILE: STRIP HTML COMMENTS ------------------------
     Requested for production. These pages are served exactly as they sit in
     the repo -- there is no dist step -- so "strip in production" and "strip
     in the file" are the same operation here, and the designers' section
     markers go with it. git has them if anyone wants them back.

     IT MUST BE LAST, AND THAT IS LOAD-BEARING. The newsletter rule matches on
     a comment (the NEWSLETTER marker followed by its div) to find the block it
     deletes. Strip the comments first and that rule can never fire again, so a
     freshly re-dropped mockup would keep its newsletter block for ever. Run
     last and every comment-anchored rule has already had its turn.

     THE GTM MARKERS SURVIVE, deliberately. They came from marketing as part of
     a snippet to paste verbatim, they are the conventional way to confirm a
     container is installed by viewing source, and they are about 120 bytes a
     page. Everything else goes.

     SAFE BECAUSE IT WAS CHECKED, not because it looks safe: no page has a
     conditional comment, and no script or style body anywhere in the tree
     contains an HTML comment delimiter, so there is nothing a plain sweep can
     corrupt. build.js asserts the same thing at build time for the pages it
     generates.

     Idempotent: after one pass only the GTM markers remain, and they are the
     one thing the lookahead refuses to match. */
  add('strip HTML comments (GTM markers kept)',
    /[ \t]*<!--(?!\s*(?:End\s+)?Google Tag Manager)[\s\S]*?-->[ \t]*\n?/g,
    '');

  return r;
}

/* ---- the pages to fix, with their depth below the project root -------- */
const targets = [];
/* signin.html was added to the repo after this script and never joined the
   list, so its footer kept product names the rest of the site had renamed. */
for (const page of ['about.html', 'contact.html', 'signin.html']) {
  if (fs.existsSync(path.join(ROOT, page))) targets.push({ rel: page, depth: 0 });
}
for (const dir of ['products', 'solutions']) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs).filter((x) => x.endsWith('.html')).sort()) {
    targets.push({ rel: dir + '/' + f, depth: 1 });
  }
}
if (!targets.length) {
  console.error('no pages found — expected about.html and/or products/*.html');
  process.exit(1);
}

let totalBefore = 0;
let totalAfter = 0;
/* WHAT THE RULES WOULD WRITE, checked alongside what the pages already say.
   The resolver at the end of this file only ever read the pages, so a rule
   whose destination had gone stale stayed silent for as long as no page
   happened to be in the broken state it matches — which is exactly how
   fourteen of the seventeen product slugs came to point at files that had
   been renamed out from under them, with the run still reporting all clear. */
const emitted = new Map();

for (const { rel, depth } of targets) {
  const p = path.join(ROOT, rel);
  let s = fs.readFileSync(p, 'utf8');
  const before = (s.match(/href="#"/g) || []).length;
  let hits = 0;

  for (const [name, find, replace] of rules(rel)) {
    /* Skip `$1`-style replacements: those carry a captured href through
       unchanged, so the destination is the page's, not this script's. */
    if (typeof replace === 'string' && !replace.includes('$')) {
      for (const h of replace.matchAll(/href="([^"]+)"/g)) {
        if (!emitted.has(h[1])) emitted.set(h[1], `${rel} · ${name}`);
      }
    }
    /* COUNT FIRST, THEN REPLACE WITH THE STRING. Do not pass a function here
       to do the counting: `s.replace(find, () => replace)` returns `replace`
       verbatim, so `$1` and friends land as literal text instead of the
       captured groups, silently shredding every rule that uses a capture. */
    const n = (s.match(find) || []).length;
    if (VERBOSE) console.log(`    ${n ? '*' : ' '} ${String(n).padStart(2)}  ${name}`);
    if (!n) continue;
    hits += n;
    s = s.replace(find, replace);
  }

  const after = (s.match(/href="#"/g) || []).length;
  totalBefore += before;
  totalAfter += after;
  if (!DRY && hits) fs.writeFileSync(p, s, 'utf8');

  console.log(`${rel.padEnd(22)} ${String(before).padStart(3)} placeholder -> ${String(after).padStart(3)} left  (${hits} rewritten)`);

  if (after) {
    const left = [...s.matchAll(/<a\b[^>]*href="#"[^>]*>([\s\S]{0,60}?)<\/a>/g)]
      .map((m) => m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '(no text)');
    console.log(`                       still dead: ${[...new Set(left)].join(' · ')}`);
  }
}

console.log(`\n${DRY ? 'DRY RUN — ' : ''}${targets.length} pages · ${totalBefore} placeholder links -> ${totalAfter} remaining`);
if (totalAfter === 0) console.log('no placeholder links left, or the href was removed because no page exists.');

/* ---- resolve every local reference against the filesystem -------------
   THE HEADER HAS PROMISED THIS SINCE THE FIRST VERSION AND IT WAS NEVER
   ACTUALLY DONE — the run only counted how many `href="#"` were left, which
   says nothing about whether the destinations it wrote exist. A wrong depth
   is silent: the link is still a link, it just 404s. So is a wrong asset
   path, and worse — a <video> whose `src` misses fails with no console error
   at all, which is how eleven product pages shipped pointing their demo reel
   at products/assets/ instead of assets/.

   href, src and poster, because all three are depth-sensitive. Fragments,
   query strings and the non-filesystem schemes are dropped first. */
/* CLEAN URLS. vercel.json sets "cleanUrls": true, so /contact is served by
   contact.html and there is no file at that path — the site is written that
   way throughout, 800-odd links of it. Checking existsSync alone therefore
   reported every internal link on every page as BROKEN, which is the exact
   failure the note above warns about: a checker that always cries wolf stops
   being read. So a reference resolves if the file is there, or if the file is
   there once .html is added, or if it names a directory with an index.html.
   Assets keep their extensions and take the first branch unchanged. */
const resolves = (abs) => fs.existsSync(abs)
  || (CLEAN_URLS && !path.extname(abs)
      && (fs.existsSync(abs + '.html') || fs.existsSync(path.join(abs, 'index.html'))));

const KNOWN_GAPS = /-demo(-poster)?\.(jpg|mp4|webm)$/;   /* the marked video placeholders */
const deadRule = [];
for (const [url, where] of emitted) {
  if (/^(?:https?:|mailto:|tel:|data:|#|\/\/)/.test(url)) continue;
  const file = url.split('#')[0].split('?')[0];
  if (!file || !file.startsWith('/')) continue;   /* the font is depth-relative */
  if (!resolves(path.join(ROOT, file.slice(1)))) deadRule.push([where, url]);
}
if (deadRule.length) {
  console.log(`rule destinations: ${deadRule.length} point at nothing`);
  for (const [where, url] of deadRule) console.log(`  STALE RULE  ${where}  ->  ${url}`);
  process.exitCode = 1;
} else {
  console.log(`rule destinations: all ${emitted.size} resolve`);
}

const missing = [];
for (const { rel } of targets) {
  const dir = path.dirname(path.join(ROOT, rel));
  const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const m of s.matchAll(/(?:href|src|poster)="([^"]+)"/g)) {
    const raw = m[1];
    if (/^(?:https?:|mailto:|tel:|data:|#|\/\/)/.test(raw)) continue;
    const file = raw.split('#')[0].split('?')[0];
    if (!file) continue;
    /* A LEADING SLASH IS RESOLVED FROM THE SITE ROOT, not from this page.
       Joining it onto the page's own directory turns /assets/js/chat.js into
       products/assets/js/chat.js and reports every page as broken — which is
       worse than not checking, because a checker that always cries wolf stops
       being read. The `//` scheme is already skipped above. */
    const abs_ = file.charAt(0) === '/'
      ? path.join(ROOT, file.slice(1))
      : path.join(dir, file);
    if (!resolves(abs_)) missing.push([rel, raw]);
  }
}
const real = missing.filter(([, u]) => !KNOWN_GAPS.test(u));
const placeholders = missing.length - real.length;
console.log(`local references: ${missing.length ? `${missing.length} unresolved` : 'all resolve'}`
  + (placeholders ? ` (${placeholders} are the marked demo-video placeholders)` : ''));
if (real.length) {
  for (const [rel, u] of real) console.log(`  BROKEN  ${rel}  ->  ${u}`);
  process.exitCode = 1;
}
