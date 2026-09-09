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

const { COMPANY } = require('../products.js');
const { SOLUTIONS } = require('../home.js');

const ROOT = path.join(__dirname, '..');
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
  const HOME = up + 'index.html';
  const PRODUCTS_GRID = HOME + '#products';
  const INSIGHTS = HOME + '#insights';
  /* THE LOCAL ANSWER TO "SHOW ME EVERY SOLUTION". There is still no solutions
     index PAGE, which is why this used to point at the old site's /services/
     index. It does not need one: the homepage bar already carries the shelf
     that lists all five, and app.js opens that shelf when it arrives on this
     hash. Deliberately not an id of any section, so the browser has nothing to
     scroll to and the shelf is the whole answer. */
  const SOLUTIONS_MENU = HOME + '#solutions';
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
  /* The old destination, escaped for a regex. "Sign in" pointed at the tile
     grid while there was no login to point at; these pages were wired then, so
     the rules below re-point them and a re-run cannot put the grid back. */
  const GRID_RE = PRODUCTS_GRID.replace(/\./g, '\\.');
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
  const productPage = (slug) =>
    (dir === 'products' ? '' : up + 'products/') + slug + '.html';

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
    add('demo form: the enhancement script, once',
      /(?<!<script defer src="\/assets\/js\/demoform\.js"><\/script>\n)<\/head>(?=[\s\S]*<form class="dform")/,
      '<script defer src="/assets/js/demoform.js"></script>\n</head>');
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
     one click from it read as two different brands.

     THE FACE IS NOW BODONI MODA (Owen Earl, SIL OFL), weight 700, from Google
     Fonts — the same request that already fetches Inter, so these pages make
     one stylesheet round trip rather than two and self-host nothing.

     EVERY RULE BELOW MATCHES TWO SOURCE STATES, and it has to: a freshly
     dropped mockup still says "Caveat Brush", while the 24 pages in the repo
     were already converted to "Meshed Display" by the previous version of this
     section. Matching both means one pass converges from either, and a second
     pass is a no-op — the same trick §1's Pricing rule uses. */
  add('drop Caveat Brush from the Google Fonts request', /family=Caveat\+Brush&/g, '');

  /* MESHED WAS SELF-HOSTED; BODONI IS NOT. So the two rules that used to ADD a
     preload and an @font-face now REMOVE them. That also retires the only
     additive rules in the file, which is a small win: nothing here needs a
     guard against appending a second copy any more, because nothing appends. */
  add('drop the self-hosted display-face preload',
    /[ \t]*<link rel="preload" href="[^"]*MeshedDisplay-Bold\.woff2"[^>]*>\n?/g, '');
  add('drop the self-hosted @font-face',
    /@font-face\{font-family:"Meshed Display";src:url\([^)]*\) format\("woff2"\);\s*font-weight:700;font-style:normal;font-display:swap\}\n?/g, '');

  /* Ask Google for the display face alongside Inter. opsz is requested across
     its full 6..96 range on purpose: Bodoni Moda is a Didone whose hairlines
     thin out as the size grows, and font-optical-sizing (auto by default) is
     what keeps a 46px heading crisp and a 19px SVG label from going muddy.
     Only 700 is asked for, because only 700 is used. The lookahead makes a
     second run a no-op. */
  add('add Bodoni Moda to the Google Fonts request',
    /(<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=)(?!Bodoni)/g,
    '$1Bodoni+Moda:opsz,wght@6..96,700&family=');

  /* line-height 1.08 is kept from the previous face. Bodoni Moda's DECLARED
     font box is 1.525em (ascent 1.125, descent .400) which sounds far too tall
     for it, but that box carries accent clearance the Latin text never uses —
     the real ink is cap .75 and descender ~.21, so 1.08 sets two hero lines
     tight without them touching. Checked on the rendered hero, not derived. */
  add('.hand -> Bodoni Moda',
    /\.hand\{font-family:(?:"Caveat Brush","Bradley Hand","Segoe Print","Comic Sans MS",cursive;\s*font-weight:400;line-height:1\.09|"Meshed Display","Playfair Display","Didot","Bodoni MT",Georgia,serif;font-weight:700;letter-spacing:0;line-height:1\.08);color:var\(--ink\)\}/g,
    '.hand{font-family:"Bodoni Moda","Bodoni MT",Didot,"Playfair Display",Georgia,serif;'
    + 'font-weight:700;letter-spacing:0;line-height:1.08;color:var(--ink)}');

  /* A CATCH-ALL for every other declaration of the display face in the CSS.
     The mockups use at least three stacks for the same face — the full one in
     `.hand`, `"Caveat Brush","Bradley Hand",cursive` on the about page's
     `.portrait .tag` and `.pull`, and `"Caveat Brush",cursive` on the service
     page's `.phase .no` — and a new page can invent a fourth. Matching the
     family NAME instead of the exact stack means the next one needs no rule.

     It runs AFTER the `.hand` rule above, which has already rewritten its own
     declaration, so this only sees the leftovers. Weight 700 is explicit
     because that is the only weight requested, and asking for 400 invites some
     engines to synthesise a bold on top of an already-bold face. */
  add('any remaining display-face declaration -> Bodoni Moda',
    /font-family:"(?:Caveat Brush|Meshed Display)"[^;}]*/g,
    'font-family:"Bodoni Moda","Bodoni MT",Didot,Georgia,serif;font-weight:700');

  /* And the labels inside the inline SVG diagrams, set with the presentation
     attribute rather than CSS. A webfont applies to inline SVG through the
     document's own stylesheet, so the Google Fonts request covers these too
     with nothing extra. */
  add('SVG diagram labels -> Bodoni Moda',
    /font-family="(?:Caveat Brush,cursive|Meshed Display,serif)"(\s+font-weight="700")?/g,
    'font-family="Bodoni Moda,serif" font-weight="700"');

  /* LEFT-ANCHORED SVG LABELS THAT NO LONGER FIT. SVG text has fixed
     coordinates and no reflow, so a label that fitted in one face runs past
     the edge of its own viewBox in a wider one and is clipped. Centre-anchored
     labels stay centred and are fine; only `text-anchor="start"` ones grow
     rightwards into trouble.

     Bodoni Moda sets wider than both earlier faces. Advance widths measured
     off the fonts at 1000px, so the arithmetic below is per-px:

                                  Caveat    Meshed    Bodoni
       "anyone can buy the tool"   10112     10627     11413
       "one roadmap"                5622      5963      6308

     "anyone can buy the tool" starts at x=112 in a 340-wide box, so it has 228
     units: at 21px Bodoni wants 239.7 and overruns by 11.7, and 20px still
     lands at 340.3 — hence 19px (216.8, ending at 328.8).
     "one roadmap" starts at x=288 in a 420-wide box, so it has 132 units: 21px
     wants 132.5 and overruns by half a unit, so 20px (126.2, ending at 414.2).

     Each `from` size below covers a state this rule may meet: the mockup's own
     size, and the size the previous version of this section left behind. If a
     future page clips a label, measure it with getBBox() and add a line. */
  for (const [label, froms, to] of [
    ['anyone can buy the tool', [23, 21], 19],
    ['one roadmap', [24, 21], 20],
  ]) {
    for (const from of froms) {
      if (from === to) continue;
      add(`keep "${label}" inside its viewBox`,
        new RegExp(`font-size="${from}"([^>]*)>${label}<`, 'g'),
        `font-size="${to}"$1>${label}<`);
    }
  }
  /* ---- §5 · re-aim the highlighter ----------------------------------
     THESE TWO RULES CURRENTLY MATCH NOTHING. `.mark-hl` was removed from every
     page, so both are dead — kept only because a re-dropped mockup could bring
     the marker back, and Caveat-tuned percentages would be worse than these.

     IF IT EVER RETURNS, RE-DERIVE THE NUMBERS: the em values below were
     measured against MESHED Display Bold and the face is Bodoni Moda now,
     whose metrics are nothing like it (ascent 1.125 vs .720, descent .400 vs
     .202, x-height .460 vs .518). Do not trust them as they stand.

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
    /[ \t]*<script[^>]*\bsrc="(?!\/assets\/js\/chat\.js")[^"]*\bchat\.js(?:\?[^"]*)?"[^>]*><\/script>\n?/g, '');
  add('assistant: one include, just before </body>',
    /(?<!<script defer src="\/assets\/js\/chat\.js"><\/script>\n)<\/body>/,
    '<script defer src="/assets/js/chat.js"></script>\n</body>');

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
    /[ \t]*<script[^>]*\bsrc="(?!\/assets\/js\/nav\.js")[^"]*\bnav\.js(?:\?[^"]*)?"[^>]*><\/script>\n?/g, '');
  add('nav shelves: one include, above the assistant',
    /(?<!<script defer src="\/assets\/js\/nav\.js"><\/script>\n)(<script defer src="\/assets\/js\/chat\.js"><\/script>)/,
    '<script defer src="/assets/js/nav.js"></script>\n$1');

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
  add('contact block: no phone links under the address',
    /(<div class="contact">\s*<a href="mailto:[^"]*">[^<]*<\/a>)(?:\s*<a href="tel:[^"]*">[^<]*<\/a>)+/g,
    '$1');
  add('contact block: WhatsApp link shows the word, not the number',
    /(<div class="contact">\s*<a href="mailto:[^"]*">[^<]*<\/a>\s*<a href="https:\/\/wa\.me\/[^"]*"[^>]*>)\s*\+?\d[\d\s-]{6,}\s*(<\/a>)/g,
    '$1WhatsApp$2');
  /* the closing band's chip row: its twin at the top of contact.html already
     says "Call the office" rather than reading the number out */
  add('closing chip: Call the office, not the number',
    /(<a class="chip" href="tel:[^"]*"[^>]*>)\s*\+?\d[\d\s-]{6,}\s*(<\/a>)/g,
    '$1Call the office$2');

  /* THE CONTACT PAGE'S OWN DETAIL COLUMN, which is the last place on the site
     that printed the digits. Two rows of numbers become ONE row that dials the
     office without reading it out — the same trade the chip row above this
     already made, and the same markup build.js now emits for the demo page.
     The number stays reachable; it is simply not printed. */
  add('detail list: one Phone row that dials, not two that print',
    /<li><span>Phone<\/span><a href="tel:([^"]*)">\s*\+?\d[\d\s-]{6,}<\/a><\/li>\s*(?:<li><span>Phone<\/span><a href="tel:[^"]*">\s*\+?\d[\d\s-]{6,}<\/a><\/li>)+/g,
    '<li><span>Phone</span><a href="tel:$1">Call the office</a></li>');
  /* "Call the office" HAS TO DIAL THE OFFICE. The collapse above keeps the
     first row's href, and on the contact page that row was the mobile. The
     lookahead is what makes this a no-op once the number is right. */
  add('detail list: Call the office dials the landline',
    /(<li><span>Phone<\/span><a href="tel:)(?!\+60320111320")[^"]*(">Call the office<\/a><\/li>)/g,
    '$1+60320111320$2');
  /* a single row left over from a page that only ever had one */
  add('detail list: the last Phone row dials too',
    /(<li><span>Phone<\/span><a href="tel:[^"]*">)\s*\+?\d[\d\s-]{6,}(<\/a><\/li>)/g,
    '$1Call the office$2');
  add('form note: call the office, not the number',
    /(<p class="dnote">[^<]*?)\bor\s+\+?\d[\d\s-]{6,}\.(<\/p>)/g,
    '$1or <a href="tel:+60320111320">call the office<\/a>.$2');

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
const KNOWN_GAPS = /-demo(-poster)?\.(jpg|mp4|webm)$/;   /* the marked video placeholders */
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
    if (!fs.existsSync(abs_)) missing.push([rel, raw]);
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
