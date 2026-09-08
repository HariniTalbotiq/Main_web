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

   WHERE NO DESTINATION EXISTS — Memberships, Careers, Terms, Security, AI
   Governance & Security — the `href` is REMOVED rather than left on "#". An
   <a> with no href is not a link: not focusable, no pointer cursor, and it
   cannot promise a page that does not exist. It keeps the footer's styling
   because it is still an <a>.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const { COMPANY } = require('../products.js');
const { SOLUTIONS } = require('../home.js');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const VERBOSE = process.argv.includes('--verbose');

/* Product name as the pages print it -> its slug. */
const PRODUCTS = {
  Mimic: 'mimic',
  ATS: 'ats',
  ERP: 'erp',
  NousCRM: 'nouscrm',
  tasca: 'tasca',
  Recapr: 'recapr',
  Lexer: 'lexer',
  Vawlt: 'vawlt',
};

/* Solution name as the pages print it -> live URL, from home.js. A null means
   no page exists yet and the href comes off. */
const SOLUTION_URL = {};
for (const s of SOLUTIONS) SOLUTION_URL[s.name] = s.url;

/* Solutions we now ship a page for. Local beats talbotiq.com, the same rule
   the product tiles follow. Add a line as each further service page arrives. */
const SOLUTION_LOCAL = {
  'AI Strategy & Consulting': 'solutions/ai-strategy-consulting.html',
  'Embedded Edge AI': 'solutions/embedded-edge-ai.html',
  /* home.js calls it "Dev", the mockups call it "Development" — the ALIASES
     table below copies this entry onto that spelling too. */
  'Full Stack Dev & AI Integration': 'solutions/full-stack-ai-integration.html',
  'AI Agent & Bot Development': 'solutions/ai-agent-bot-development.html',
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

const rx = (s, flags) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags || 'g');

function rules(rel) {
  /* Everything a rule needs about WHERE this page sits, derived in one place. */
  const dir = path.dirname(rel);          // '.', 'products' or 'solutions'
  const self = path.basename(rel);
  const depth = dir === '.' ? 0 : 1;
  const up = depth === 0 ? '' : '../';
  const HOME = up + 'index.html';
  const PRODUCTS_GRID = HOME + '#products';
  const INSIGHTS = HOME + '#insights';
  const ABOUT = up + 'about.html';
  const LEADERSHIP = ABOUT + '#leadership';
  const CONTACT = up + 'contact.html';
  /* DEMO REQUESTS NOW STAY ON THIS SITE. These four buttons used to point at
     talbotiq.com/inquiry-now/, on the grounds that the old form actually
     submits and there was no local one. build.js now generates demo.html, which
     carries the same form with its placeholders and product list fixed — and
     whose own submit still falls through to the old form until an endpoint is
     configured. So the reason for the old routing survives, without fourteen
     pages handing the reader to the previous website. Local, so same tab. */
  const DEMO = up + 'demo.html';
  const SIGNIN = up + 'signin.html';
  /* The old destination, escaped for a regex. "Sign in" pointed at the tile
     grid while there was no login to point at; these pages were wired then, so
     the rules below re-point them and a re-run cannot put the grid back. */
  const GRID_RE = PRODUCTS_GRID.replace(/\./g, '\\.');

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
  const productPage = (slug) =>
    (dir === 'products' ? '' : up + 'products/') + slug + '.html';

  const r = [];
  const ext = (url) => `href="${url}" target="_blank" rel="noopener"`;
  const add = (name, find, replace) => r.push([name, find, replace]);

  /* ---- header + drawer, product pages ------------------------------- */
  add('logo -> homepage', /<a class="logo" href="#"/g, `<a class="logo" href="${HOME}"`);
  add('product switcher -> product grid', /<a class="prod" href="#"/g, `<a class="prod" href="${PRODUCTS_GRID}"`);
  add('header Pricing -> the contact page', /<a class="lnk" href="#">Pricing<\/a>/g, `<a class="lnk" href="${CONTACT}">Pricing</a>`);
  add('header Sign in -> the sign-in page', /<a class="si" href="#">Sign in<\/a>/g, `<a class="si" href="${SIGNIN}">Sign in</a>`);
  add('header Sign in: tile grid -> the sign-in page',
    new RegExp('<a class="si" href="' + GRID_RE + '">Sign in</a>', 'g'),
    `<a class="si" href="${SIGNIN}">Sign in</a>`);

  /* ---- header + drawer, about page ----------------------------------
     `class="on"` marks the item for the page you are already on. It becomes
     unlinked with aria-current rather than a link to itself: a nav item that
     reloads the page you are reading is a small lie about what it does. */
  add('About (current page) -> unlinked, aria-current',
    /<a class="on" href="#">About<\/a>/g, '<a class="on" aria-current="page">About</a>');
  add('nav Products -> product grid', /<a href="#">Products<\/a>/g, `<a href="${PRODUCTS_GRID}">Products</a>`);
  add('nav Solutions -> services index', /<a href="#">Solutions<\/a>/g, `<a ${ext(SERVICES_INDEX)}>Solutions</a>`);
  add('nav Blog -> the homepage articles section', /<a href="#">Blog<\/a>/g, `<a href="${INSIGHTS}">Blog</a>`);
  add('nav Contact -> the contact page', /<a href="#">Contact<\/a>/g,
    self === 'contact.html' ? '<a aria-current="page">Contact</a>' : `<a href="${CONTACT}">Contact</a>`);
  add('drawer About -> the about page', /<a href="#">About<\/a>/g,
    self === 'about.html' ? '<a aria-current="page">About</a>' : `<a href="${ABOUT}">About</a>`);

  /* ---- drawer, shared ------------------------------------------------ */
  add('drawer Pricing -> the contact page', /<a href="#">Pricing<\/a>/g, `<a href="${CONTACT}">Pricing</a>`);
  add('drawer All products -> product grid', /<a href="#">All products<small>/g, `<a href="${PRODUCTS_GRID}">All products<small>`);
  add('drawer All products (no sub-label) -> product grid',
    /<a href="#">All products<\/a>/g, `<a href="${PRODUCTS_GRID}">All products</a>`);
  add('drawer Sign in -> the sign-in page', /<a href="#">Sign in<\/a>/g, `<a href="${SIGNIN}">Sign in</a>`);
  add('drawer Sign in: tile grid -> the sign-in page',
    new RegExp('<a href="' + GRID_RE + '">Sign in</a>', 'g'),
    `<a href="${SIGNIN}">Sign in</a>`);

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
  }

  /* ---- footer + related-link chips: solutions -----------------------
     A local page wins, then the live talbotiq.com service page, then nothing —
     in which case the href comes off rather than pointing at "#". */
  for (const name of SOLUTION_NAMES) {
    const printed = name.replace(/&/g, '&amp;');
    const localPage = SOLUTION_LOCAL[name] ? up + SOLUTION_LOCAL[name] : null;
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
  add('footer Privacy Policy -> privacy-policy', /<a href="#">Privacy Policy<\/a>/g, `<a ${ext(COMPANY.privacy)}>Privacy Policy</a>`);

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
     There is no local solutions INDEX, only individual service pages, so both
     "Solutions" in the nav and "See all solutions" go to the live services
     index on talbotiq.com. */
  add('Solutions (current page) -> unlinked, aria-current',
    /<a class="on" href="#">Solutions<\/a>/g, '<a class="on" aria-current="page">Solutions</a>');
  add('See all solutions -> the services index',
    /<a class="btn btn-outline-white btn-lg" href="#">See all solutions<\/a>/g,
    `<a class="btn btn-outline-white btn-lg" ${ext(SERVICES_INDEX)}>See all solutions</a>`);
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
  add('@font-face for MESHED Display', /(<style>\n)(?!@font-face\{font-family:"Meshed Display")/g,
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

  return r;
}

/* ---- the pages to fix, with their depth below the project root -------- */
const targets = [];
for (const page of ['about.html', 'contact.html']) {
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

for (const { rel, depth } of targets) {
  const p = path.join(ROOT, rel);
  let s = fs.readFileSync(p, 'utf8');
  const before = (s.match(/href="#"/g) || []).length;
  let hits = 0;

  for (const [name, find, replace] of rules(rel)) {
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
if (totalAfter === 0) console.log('every link resolves, or has had its href removed because no page exists.');
