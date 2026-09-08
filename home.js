/* =============================================================================
   HOME — the homepage, as designed in mockup-homepage.html
   -----------------------------------------------------------------------------
   THE HOMEPAGE IS A DIFFERENT ARTEFACT FROM THE PRODUCT DATA.

   `products.js` says what each product IS — its description, its features, its
   `evidence` string, the URL of the running application. That file is still the
   accuracy contract and it was not rewritten to suit this design.

   This file says how the HOMEPAGE IS COMPOSED: which products appear, in what
   order, what the page calls them, and every word of copy around them. It joins
   to `products.js` by `slug`, so a product's real URL and real description are
   still read from there and cannot drift out of sync with it.

   WHERE THE MOCKUP RENAMES A PRODUCT, THE MOCKUP WINS — it is the newer
   decision — and the old name is kept in `was` so the rename stays visible
   instead of quietly happening:

     NousCRM       -> Sales CRM
     Task Manager  -> tasca
     lexerai       -> Document Parser
     AI Engine     -> Private AI Engine
     PMS           -> Axiom        (and it is listed as a peer, not as pending)
     HRMS          -> HRMS         (it was `hidden: true`; the mockup ships it)

   PLACEHOLDERS ARE MARKED, NOT HIDDEN. The mockup's own annotation bar called
   out four: the product icons, the secondary accents, the client logos and the
   testimonial. The CLIENT LOGOS and the BLOG are real now. The remaining two
   say so at the point where they are used, and each is one field from real.
   ========================================================================== */

/* The one thing this file reads out of the accuracy contract. `COMPANY.antiHype`
   is the company's own anti-hype line, evidenced from its homepage in
   research/RESEARCH.md, and the "Why lead with TALBOTIQ" block quotes it rather
   than repeating the string — see WHY below. */
const { COMPANY } = require('./products.js');

/* The mockup's palette, named. `assets/css/talbotiq.css` declares the same five
   as custom properties; these are here for the inline SVG fills, which cannot
   read a CSS variable through a `fill` attribute in every renderer. */
const PALETTE = {
  teal: '#02A885',
  green: '#027A5C',
  yellow: '#F3E202',
  amber: '#C48A00',
  blue: '#1B7FC4',
  /* the two neutrals the inline SVGs also need: the star's outline and the
     fill the hero's curve hands over to the product band */
  ink: '#1F2430',
  band: '#F3F4F6',
};

/* -------------------------------------------------------------------------
   THE EIGHT TILES
   Order is the mockup's reading order, which is also a story: hire (Mimic),
   hold (HRMS), appraise (Axiom), sell (Sales CRM), do the work (tasca),
   record it (Recapr), read the paperwork (Document Parser), and the engine
   all seven ask (Private AI Engine). The engine goes last because it is the
   floor the rest stand on, not the eighth thing you buy.

   `icon` is the mockup's SVG body, verbatim, drawn on a 56x56 viewBox. The
   mockup labels these PLACEHOLDER: they are shape-coded stand-ins in the
   brand palette, not a commissioned set. Replace the string, change nothing
   else.

   WHERE A TILE POINTS, in order of preference:
     1. `local`       — a product page in this repo, under products/. All eight
                        have one now, so in practice every tile resolves here.
                        A page we ship beats a page we do not control, and it
                        beats dropping a first-time reader onto a sign-in form.
     2. `page`        — a public product page on talbotiq.com. Kept as the
                        fallback for the day a local page is removed.
     3. the product's own `url` from products.js — but only when its `access`
                        is not 'internal'. Vawlt's console is an admin surface;
                        the public homepage does not link into it.
     4. nothing       — the tile renders unlinked and marked.

   THE PAGES CALL THREE PRODUCTS SOMETHING ELSE. products/lexer.html is titled
   "Lexer", products/nouscrm.html is "NousCRM" and products/vawlt.html is
   "Vawlt", while the tiles above say Document Parser, Sales CRM and Private AI
   Engine. The tile name is left as the homepage mockup set it, so a reader
   currently clicks one name and arrives at another. That is a naming decision,
   not a bug to paper over here — see the note in the README.
   ---------------------------------------------------------------------- */
const TILES = [
  {
    slug: 'mimic',
    local: 'products/mimic.html',
    name: 'Mimic',
    tagline: 'AI interviews for every candidate',
    icon: `<rect x="7" y="9" width="42" height="30" rx="5" fill="#02A885"/>
      <path d="M20 45 h16 l-3-6 h-10 z" fill="#027A5C"/>
      <circle cx="21" cy="23" r="5" fill="#fff"/>
      <path d="M13 34 c2-5 14-5 16 0" fill="#fff"/>
      <rect x="33" y="20" width="12" height="2.6" rx="1.3" fill="#C48A00"/>
      <rect x="33" y="26" width="9" height="2.6" rx="1.3" fill="#C48A00"/>`,
  },
  {
    slug: 'hrms',
    local: 'products/hrms.html',
    name: 'HRMS',
    tagline: 'The people platform',
    icon: `<circle cx="20" cy="17" r="7" fill="#02A885"/>
      <path d="M8 40 c0-8 5-12 12-12 s12 4 12 12 z" fill="#02A885"/>
      <rect x="30" y="26" width="19" height="20" rx="3.5" fill="#027A5C"/>
      <rect x="34" y="31" width="11" height="2.4" rx="1.2" fill="#fff"/>
      <rect x="34" y="36" width="11" height="2.4" rx="1.2" fill="#fff"/>
      <rect x="34" y="41" width="7" height="2.4" rx="1.2" fill="#F3E202"/>`,
  },
  {
    slug: 'pms',
    local: 'products/axiom.html',
    name: 'Axiom',
    was: 'PMS',
    tagline: 'AI-assisted performance management',
    icon: `<circle cx="28" cy="28" r="19" fill="none" stroke="#02A885" stroke-width="5"/>
      <path d="M28 9 a19 19 0 0 1 16.5 28.5" fill="none" stroke="#027A5C" stroke-width="5" stroke-linecap="round"/>
      <path d="M20 29 l6 6 l12 -14" fill="none" stroke="#C48A00" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    slug: 'nouscrm',
    local: 'products/nouscrm.html',
    name: 'Sales CRM',
    was: 'NousCRM',
    tagline: 'The intelligent hub for sales teams',
    page: 'https://talbotiq.com/products/sales-crm/',
    icon: `<rect x="8" y="30" width="9" height="17" rx="2" fill="#02A885"/>
      <rect x="21" y="21" width="9" height="26" rx="2" fill="#027A5C"/>
      <rect x="34" y="12" width="9" height="35" rx="2" fill="#02A885"/>
      <path d="M9 22 L20 15 L31 18 L45 7" fill="none" stroke="#C48A00" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="45" cy="7" r="3.6" fill="#C48A00"/>`,
  },
  {
    slug: 'task-manager',
    local: 'products/tasca.html',
    name: 'tasca',
    was: 'Task Manager',
    tagline: 'Plan, track, ship faster',
    page: 'https://talbotiq.com/products/task-management-system/',
    icon: `<rect x="8" y="10" width="17" height="17" rx="3.5" fill="#02A885"/>
      <rect x="31" y="10" width="17" height="17" rx="3.5" fill="#027A5C"/>
      <rect x="8" y="31" width="17" height="17" rx="3.5" fill="#027A5C"/>
      <rect x="31" y="31" width="17" height="17" rx="3.5" fill="#F3E202"/>
      <path d="M12 18.5 l3.4 3.4 l6-7" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M35 39.5 l3.4 3.4 l6-7" fill="none" stroke="#1F2430" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    slug: 'recapr',
    local: 'products/recapr.html',
    name: 'Recapr',
    tagline: 'The meeting, on the record',
    icon: `<path d="M8 12 h30 a4 4 0 0 1 4 4 v16 a4 4 0 0 1 -4 4 h-16 l-9 8 v-8 h-5 a4 4 0 0 1 -4 -4 v-16 a4 4 0 0 1 4 -4 z" fill="#02A885"/>
      <rect x="14" y="19" width="18" height="2.6" rx="1.3" fill="#fff"/>
      <rect x="14" y="25" width="13" height="2.6" rx="1.3" fill="#fff"/>
      <circle cx="42" cy="40" r="8" fill="#C48A00"/>
      <path d="M42 36 v4 l3 2" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
  },
  {
    slug: 'lexerai',
    local: 'products/lexer.html',
    name: 'Document Parser',
    was: 'lexerai',
    tagline: 'Contact and receipt intelligence',
    icon: `<path d="M13 7 h20 l11 11 v31 a2 2 0 0 1 -2 2 h-29 a2 2 0 0 1 -2 -2 v-40 a2 2 0 0 1 2 -2 z" fill="#02A885"/>
      <path d="M33 7 l11 11 h-11 z" fill="#027A5C"/>
      <rect x="18" y="26" width="20" height="2.8" rx="1.4" fill="#fff"/>
      <rect x="18" y="33" width="20" height="2.8" rx="1.4" fill="#fff"/>
      <rect x="18" y="40" width="12" height="2.8" rx="1.4" fill="#F3E202"/>`,
  },
  {
    slug: 'ai-engine',
    local: 'products/vawlt.html',
    name: 'Private AI Engine',
    was: 'TalbotIQ AI Engine',
    tagline: 'Your AI, inside your perimeter',
    icon: `<path d="M28 6 l17 7 v14 c0 11-7 18-17 23 c-10-5-17-12-17-23 v-14 z" fill="#027A5C"/>
      <rect x="20" y="23" width="16" height="13" rx="2.6" fill="#F3E202"/>
      <path d="M23 23 v-3.5 a5 5 0 0 1 10 0 v3.5" fill="none" stroke="#F3E202" stroke-width="2.6"/>
      <circle cx="28" cy="29" r="2.4" fill="#027A5C"/>`,
  },
];

/* -------------------------------------------------------------------------
   COPY
   Every string the page says, in the order it says it. The hero and the two
   annotated headings are split into parts because the hand-drawn marks land
   on specific words — the highlighter on one clause, the lasso around one
   word — and a mark that guesses where a line wraps is a mark in the wrong
   place.
   ---------------------------------------------------------------------- */
const COPY = {
  /* THE DEMO PAGE'S OWN WORDS. The heading is the company's own line, taken
     from the live inquiry page because it is a good one; the rest is written
     for a form that now sits on this site rather than on the old one. */
  demo: {
    heading: 'Ready to accelerate your business with AI?',
    lede: 'Tell us which product you want to see and we will come back to you within one business day.',
    notesPlaceholder: 'What you would like the demo to cover, and roughly how many people would use it.',
    cta: 'Request a demo',
  },

  hero: {
    lead: 'Every workflow, running',
    marked: 'on intelligence.',
    lede: { strong: 'One connected suite.', rest: 'Eight products, one data layer.' },
    primary: 'Book a demo',
    secondary: 'Explore the products',
    /* REMOVED, both on request:
         subnote  "Live in under two weeks. See how"
         aside    "8 products. 1 login." — the pencilled note, with its arrow

       Worth recording why the aside is no loss: it was the one claim on the
       page the products could not support. There are eight applications on six
       different hosts and no single sign-on, so "1 login" was not true. Its
       going resolves that; `GO.signin` in build.js still explains why Sign in
       points at the tile grid rather than a login. */
  },

  ecosystem: {
    eyebrow: 'The TALBOTIQ ecosystem advantage',
    body:
      'Our proprietary software suite is engineered as a high-performance, '
      + 'interconnected ecosystem. By eliminating the friction of fragmented '
      + 'third-party tools, our platform ensures mission-critical data flows '
      + 'natively between modules, transforming isolated business events into '
      + 'synchronized, automated workflows.',
  },

  /* the company's own line, from about-us. `lassoed` gets the circle. */
  mission: {
    lead: 'Technology is a tool.',
    lassoed: 'Intelligence',
    tail: 'is the edge.',
    body:
      'At Talbotiq, we believe the next decade of business will be defined by those '
      + 'who can successfully transition from manual workflows to intelligent systems. '
      + 'Our mission is to dismantle the operational bottlenecks that stifle growth by '
      + 'injecting high-fidelity AI and robust engineering into the core of your business.',
  },

  capsHeading: { lead: 'Enterprise AI,', underlined: 'done properly.' },
  blogHeading: { lead: 'From our', squiggled: 'blogs' },

  close: {
    heading: 'Ready to accelerate your business?',
    primary: 'Book a demo',
    secondary: 'Talk to us',
    /* The company's creed, quoted from the accuracy contract rather than
       retyped — it is recorded from about-us in research/RESEARCH.md.

       It replaced "Malaysia-based team · Response within one business day",
       which was the mockup's line.

       NOTE THE REPETITION: this is the same sentence as the mission heading
       further up the page, where it is set large with the lasso drawn round
       "Intelligence". Saying it twice is a deliberate choice — a page can end
       on the line it turned on — but if it should be said once, the mission
       heading is `COPY.mission` and this is the other end of it. */
    fine: COMPANY.creed,
  },

  trustLabel: 'Trusted by',
  allProducts: 'View all products',
};

/* -------------------------------------------------------------------------
   TRUSTED BY — real logos, no longer name-plates
   Files and the notes on how each was prepared live in
   `assets/brand/clients/README.md`. Two things recorded there matter here:
   the marks are shown in FULL COLOUR deliberately (greyscale made the two
   gold wordmarks vanish), and `scale` exists only to even out lockups that
   are stacked rather than horizontal.

   An entry with `logo: null` still renders as a name-plate, so a client whose
   file has not arrived yet can sit in the row without breaking it.
   ---------------------------------------------------------------------- */
const CLIENTS = [
  {
    name: 'Aisling',
    logo: 'assets/brand/clients/aisling.webp',
    /* The supplied `Aisling-Logo-Retina-W-03.webp` is the WHITE version, for
       dark backgrounds — invisible on this band. This is the colour lockup. */
  },
  {
    name: "Pomod'Oro",
    logo: 'assets/brand/clients/pomodoro.webp',
  },
  {
    name: 'Namaste India',
    /* The supplied asset held BOTH lockups in one image. This is the
       horizontal wordmark, which is the one that survives at this size; the
       stacked "1947" badge is beside it as namaste-india-1947.webp. */
    logo: 'assets/brand/clients/namaste-india.webp',
    /* A light gold script with a very small caps subtitle under it — the
       thinnest mark of the four, so it needs a little more height to hold its
       own next to Aisling's solid geometric sans. */
    scale: 1.12,
  },
  {
    name: 'Total IT Global',
    logo: 'assets/brand/clients/total-it-global.svg',
    /* A STACKED lockup — mark over wordmark — where the other three are
       horizontal. At a shared height its type would come out about half the
       size of theirs, so it gets more height to land at the same optical
       weight. This is the only reason `scale` exists. */
    scale: 1.5,
  },
];

/* PIKOM and Adastra were in this row as name-plates and are no longer here,
   because the four above are the ones with logos to show.

   PIKOM is worth a note: it is the National Tech Association of Malaysia and
   TALBOTIQ's relationship to it is MEMBERSHIP — Akhil Gupta chairs its AI
   chapter — not custom. "Trusted by" is the wrong shelf for it either way;
   the footer already has a Memberships entry, which is where it belongs.

   To put either back, add `{ name: 'PIKOM', logo: null }` and it renders as a
   name-plate again beside the logos. */

/* -------------------------------------------------------------------------
   THE LOGO LOOP
   The "Trusted by" row scrolls as an infinite marquee — React Bits' LogoLoop,
   ported to vanilla JS in `assets/js/logo-loop.js` because this site has no
   React. These are the component's props, and the names match the original.

   `speed` is px/second. The component defaults to 120, which on a row of four
   wide wordmarks reads as a ticker rushing past; 40 is slow enough that a
   logo stays legible while it crosses.

   `hoverSpeed: 0` pauses under the pointer — the reason it is not left
   running is that these are links, and a link you have to chase is a link
   nobody clicks.

   `fadeOutColor` MUST match what sits behind the row. The band has no
   background of its own, so that is the page ground — and the ground is NOT
   white: §22 of the stylesheet moves the body to #FBFCFE so every white
   surface on the page lifts off it. Leaving this at #ffffff paints two white
   rectangles into the logo row, which is the same bug the old comment warned
   about with the colours the other way round. If --ground changes, this
   changes with it.
   ---------------------------------------------------------------------- */
const LOGO_LOOP = {
  enabled: true,          // false renders the plain centred row instead
  speed: 40,
  direction: 'left',
  hoverSpeed: 0,
  gap: 72,                // wider than the static row's 56: a moving row needs
                          // more air or the wordmarks read as one long smear
  fadeOut: true,
  fadeOutColor: '#FBFCFE',   // = --ground in talbotiq.css §22
  scaleOnHover: true,
  ariaLabel: 'Clients and partners',
};

/* `wide` spans two columns, which is what makes the five cards sit in a
   3 + 2 grid instead of leaving a hole in the second row. */
const CAPABILITIES = [
  {
    title: 'Strategic insights',
    body: 'Transform complex data into actionable intelligence that guides smarter technology adoption decisions.',
  },
  {
    title: 'Scalable systems',
    body: 'Design AI solutions that evolve with your business and support long-term operational growth.',
  },
  {
    title: 'Expert guidance',
    body: 'Work with specialists who simplify AI implementation through practical, results-driven expertise.',
  },
  {
    title: 'Innovation at speed, integrity in data',
    wide: true,
    body:
      'We move at the pace of the AI industry, so our clients never fall behind — and we '
      + 'prioritize security and ethical AI practices above all else. We work with your team '
      + 'to build systems that enhance human potential, not replace it.',
  },
  {
    title: 'Efficient deployment',
    body: 'Launch AI tools through structured workflows that minimize disruption and maximize adoption speed.',
  },
];

/* -------------------------------------------------------------------------
   WHY LEAD WITH TALBOTIQ
   This replaced the mockup's testimonial slot — the dashed box that explained
   it was empty because there was no published client quote to put in it. Three
   claims about how the company works fill that space instead, which needs no
   third-party permission to publish.

   EACH ONE CARRIES ITS PHOTOGRAPH, as the live site does. This section was
   text-only for a long time because that was the original request; the client
   has since asked for the images back, so they are here.

   They are the company's own uploads, taken from talbotiq.com and downscaled to
   900px into `assets/why/` rather than hotlinked — the whole point of this site
   is not to depend on the old one. They are illustrative, not informative: the
   heading and the sentence under each carry the meaning, so they ship with
   empty alt and a screen reader skips straight to the words.

   (An automated pass once added these on its own, rewriting this paragraph to
   justify it. That was reverted. The difference is that this time it was asked
   for — worth remembering if a future pass finds this note.)

   `Realistic Innovation` reads its body from `COMPANY.antiHype` rather than
   repeating the string. That line — "No 'AI hype.' ..." — is the company's
   own, recorded from its homepage in research/RESEARCH.md, and it is already
   the house voice this whole page is written in. Quoting the source means the
   two cannot drift apart.
   ---------------------------------------------------------------------- */
const WHY = {
  heading: 'Why Lead with Talbotiq?',
  lede: 'We combine technical craftsmanship with the predictive power of Artificial Intelligence.',
  points: [
    {
      title: 'Elite Expertise',
      image: 'assets/why/elite-expertise.jpg',
      body: 'We combine deep AI research with robust full-stack engineering.',
    },
    {
      title: 'Realistic Innovation',
      image: 'assets/why/realistic-innovation.jpg',
      body: COMPANY.antiHype,
    },
    {
      title: 'Scalable by Design',
      image: 'assets/why/scalable-by-design.jpg',
      body: 'Every line of code is written to handle your growth tomorrow.',
    },
  ],
};

/* -------------------------------------------------------------------------
   THE BLOG SECTION
   The cards are NOT written here. They are the real published columns, and
   they live in `articles.js` — a generated file that `tools/fetch-articles.js`
   writes straight from The Edge Malaysia's own page data. This block only says
   how many to show and what to call the section.

   Adding a new article is therefore not an edit to this file:

       node tools/fetch-articles.js     # pull whatever is newly published
       node build.js

   This replaced three placeholder cards, two of which were loose paraphrases
   of articles now shown verbatim from the source — the "US$15.7 trillion"
   line was a rewrite of the real summary of "The algorithmic edge". The third
   was a podcast episode ([EP120] Beyond the Headlines) that is not in the
   author index and had no URL; if it should appear, it belongs in a separate
   list rather than mixed in with these, because it is not one of these.
   ---------------------------------------------------------------------- */
const BLOG = {
  /* null shows every article in `articles.js`; a number caps the grid and the
     rest stay one click away behind the "all articles" link. */
  show: null,
  /* Shown on each card beside the date. These are columns published BY a
     masthead, not posts on our own blog, and saying so is the difference
     between citing and implying. */
  attribution: 'The Edge Malaysia',
  moreLabel: 'All articles on The Edge Malaysia',
};

/* -------------------------------------------------------------------------
   NAV
   The mockup draws a caret on Products, Solutions and Company and leaves
   Pricing and Support bare, so those three own panels and the other two are
   plain links.

   Neither a pricing page nor a support portal exists yet. Both point at
   contact: a company with no published price list answers that question in a
   conversation, and a nav item that 404s is worse than one that redirects
   somewhere real. `note` records why, so it is a decision and not a bug.
   ---------------------------------------------------------------------- */
const NAV = [
  { label: 'Products', panel: 'products' },
  { label: 'Solutions', panel: 'solutions' },
  { label: 'Company', panel: 'company' },
  { label: 'Pricing', to: 'contact', note: 'no published price list yet' },
  { label: 'Support', to: 'contact', note: 'no support portal yet' },
];

/* SOLUTIONS — the engagements, as opposed to the products: what TALBOTIQ does
   FOR you rather than what it sells you a seat in. Names and URLs are from the
   live talbotiq.com menu. The fifth is in the mockup's footer but has no page
   yet, so it carries no URL and renders unlinked. */
const SOLUTIONS = [
  {
    name: 'AI Strategy & Consulting',
    summary: 'The blueprint: what to automate, in what order, and what it is worth.',
    url: 'https://talbotiq.com/services/ai-strategy-consulting/',
    /* A page we ship, so it wins over the live one — the same rule the product
       tiles follow. The other four keep their talbotiq.com URL until a local
       page for each arrives. */
    local: 'solutions/ai-strategy-consulting.html',
  },
  {
    name: 'AI Agent & Bot Development',
    summary: 'Agents that carry the repetitive operations, so the team keeps the judgement.',
    url: 'https://talbotiq.com/services/ai-agent-bot-development/',
    local: 'solutions/ai-agent-bot-development.html',
  },
  {
    name: 'Embedded Edge AI',
    summary: 'Vision and sensor intelligence where the work physically happens.',
    url: 'https://talbotiq.com/services/embedded-systems-edge-intelligence/',
    local: 'solutions/embedded-edge-ai.html',
  },
  {
    name: 'Full Stack Dev & AI Integration',
    summary: 'Cloud-native foundations built to have intelligence added to them.',
    url: 'https://talbotiq.com/services/full-stack-development-ai-integration/',
    local: 'solutions/full-stack-ai-integration.html',
  },
  {
    name: 'AI Governance & Security',
    summary: 'Policy, audit trail, and the perimeter your models run inside.',
    url: null,
  },
];

/* `url: null` marks a page the mockup asks for that the site does not have
   yet. Those render as plain text with a quiet marker, never as dead links. */
const COMPANY_LINKS = [
  /* About us and Leadership are LOCAL pages now — `about.html` ships in this
     repo and carries a #leadership section, which is what turned Leadership
     from a "soon" into a real destination. A page we ship beats a page we do
     not control, the same rule the product tiles follow. */
  { name: 'About us', url: 'about.html' },
  { name: 'Leadership', url: 'about.html#leadership' },
  { name: 'Memberships', url: null },
  { name: 'Careers', url: null },
  { name: 'Contact us', url: 'contact.html' },
];

const RESOURCES = [
  { name: 'Blog', url: null },
  { name: 'Documentation', url: null },
  { name: 'Support', url: null },
  { name: 'Release notes', url: null },
];

/* The footer's last column. Both numbers are the mockup's; the +603 landline
   also appears on talbotiq.com. */
const CONTACTS = {
  email: 'hello@talbotiq.com',
  phones: ['+60 12-817 7741', '+603 20 111 320'],
};

/* No form endpoint exists yet. Until `action` is set, the field renders
   DISABLED with a one-line reason — a subscribe box that silently swallows an
   address is worse than one that admits it is not wired up. */
const NEWSLETTER = {
  title: 'Join our newsletter',
  body: 'Get news about our products and services. Join our waiting list for upcoming products.',
  action: null,
  cta: 'Subscribe',
};

const LEGAL = [
  { name: 'Privacy Policy', url: 'https://talbotiq.com/privacy-policy/' },
  { name: 'Terms', url: null },
  { name: 'Security', url: null },
];

module.exports = {
  PALETTE, TILES, COPY, CLIENTS, LOGO_LOOP, CAPABILITIES,
  WHY, BLOG,
  NAV, SOLUTIONS, COMPANY_LINKS, RESOURCES, CONTACTS, NEWSLETTER, LEGAL,
};
