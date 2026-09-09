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
     PMS           -> ERP          (and it is listed as a peer, not as pending)
     HRMS          -> ATS          (it was `hidden: true`; the mockup ships it)

   PLACEHOLDERS ARE MARKED, NOT HIDDEN. The mockup's own annotation bar called
   out four: the product icons, the secondary accents, the client logos and the
   testimonial. The BLOG is real now and the client-logo row has been removed
   from the page. The remaining two say so at the point where they are used,
   and each is one field from real.
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
   THE TEN TILES, IN THREE GROUPS
   The grid is grouped now rather than one undifferentiated run of eight: four
   ways to interview, five things to run the business with, and the one thing
   underneath that the other nine ask. A reader scanning for "can this hire for
   me" should not have to read ten captions to find out.

   ORDER IS READING ORDER, and it is still a story: interview (three
   modalities), track the pipeline of people (ATS), run the books (ERP), sell
   (CRM), do the work (tasca), read the paperwork (Lexer), record what was said
   (Recapr), and the engine all nine ask (Private AI Engine). The engine goes
   last because it is the floor the rest stand on, not the tenth thing you buy.

   THREE TILES SHARE ONE SLUG, DELIBERATELY. Video, Voice and Chat Interview
   are the three modalities of Mimic, which is ONE product — one entry in
   products.js, one licence, one rubric — but each modality now ships its own
   page, because each answers a different question a reader arrives with
   ("can it interview on video?", "what about candidates with no camera?").
   So `local` differs per tile while `slug` stays the join to products.js.
   `slug` is not a tile's identity, so the build's uniqueness check is on
   `name`. If the three ever become three products, this is the line that
   changes — products.js gains two entries and the slugs split.

   `icon` is the mockup's SVG body, verbatim. `vb` is that icon's own viewBox
   when it is not the default 56 — the mockup draws the nine on 58 and the
   engine on 70, and rescaling art by hand to fit one number is how a drawing
   picks up a half-pixel seam. The mockup labels these PLACEHOLDER: they are
   shape-coded stand-ins in the brand palette, not a commissioned set. Replace
   the string, change nothing else.

   `kin` is the badge on hover — the one thing about a tile that its name and
   caption cannot say: whether the round happens live or on the candidate's own
   time. Only the hiring group has one, because only there is it a real choice.

   WHERE A TILE POINTS, in order of preference:
     1. `local`       — a product page in this repo, under products/. Every
                        tile resolves here today. A page we ship beats a page
                        we do not control, and it beats dropping a first-time
                        reader onto a sign-in form.
     2. `page`        — a public product page on talbotiq.com. Kept as the
                        fallback for the day a local page is removed.
     3. the product's own `url` from products.js — but only when its `access`
                        is not 'internal'. Vawlt's console is an admin surface;
                        the public homepage does not link into it.
     4. nothing       — the tile renders unlinked and marked.

   THE PAGES CALL THREE PRODUCTS SOMETHING ELSE. products/lexer.html is titled
   "Lexer", products/nouscrm.html is "NousCRM" and products/vawlt.html is
   "Vawlt", while the tiles say Lexer, CRM and Private AI Engine. Two of the
   three now agree with their page; CRM and the engine still do not. That is a
   naming decision, not a bug to paper over here — see the note in the README.
   ---------------------------------------------------------------------- */

/* The three bands, in order. `tone` is the label's colour class in the
   stylesheet; `id` is what a tile's `group` points at. */
const GROUPS = [
  { id: 'hiring',   tone: 'g1', label: 'Hiring & interviewing' },
  { id: 'business', tone: 'g2', label: 'Business management software' },
  { id: 'engine',   tone: 'g3', label: 'The layer underneath' },
];

/* -------------------------------------------------------------------------
   THE SUB-MODES OF TWO TILES
   A video round and a chat round each come in three shapes, and each shape
   now ships its own page under products/. They are not four and six tiles:
   a reader choosing between "video" and "chat" is answering a different
   question from a reader choosing between an avatar and a recording. So the
   tile stays one tile, wears a "3 modes" pill, and opens a branch of three
   real doors on hover, on focus, or inline on a narrow screen.

   `local` is a page in this repo, same as a tile's — the branch is navigation,
   not a tooltip. `icon` is the mockup's SVG body, drawn on 40.
   ---------------------------------------------------------------------- */
const MODES = {
  video: [
    {
      name: 'Conversational AI Avatar Interview',
      local: 'products/avatar-interviewer.html',
      icon: `<rect x="4" y="4" width="32" height="24" rx="5" fill="#0E1A20"/>
        <circle cx="20" cy="14" r="4.8" fill="#02A885"/>
        <path d="M12 25c1.8-5 14.2-5 16 0z" fill="#02A885"/>
        <g stroke="#F3E202" stroke-width="2" stroke-linecap="round"><path d="M20 4V1"/><path d="M8 7L6 5"/><path d="M32 7l2-2"/></g>
        <path d="M14 36h12M20 28v8" stroke="#1F2430" stroke-width="2.2" stroke-linecap="round"/>`,
    },
    {
      name: 'Recorded Video Interview',
      local: 'products/recorded-interviewer.html',
      icon: `<rect x="2" y="11" width="25" height="19" rx="4" fill="#02A885"/>
        <path d="M29 19l9-5v17l-9-5z" fill="#027A5C"/>
        <circle cx="10" cy="19" r="3.2" fill="#fff"/>
        <rect x="16" y="17" width="8" height="2.4" rx="1.2" fill="#fff"/>
        <circle cx="32" cy="33" r="5.6" fill="#E0655F" stroke="#fff" stroke-width="1.6"/>`,
    },
    {
      name: '2-Way Interview',
      local: 'products/two-way-interviewer.html',
      icon: `<rect x="2" y="5" width="19" height="14" rx="3.4" fill="#02A885"/>
        <circle cx="11.5" cy="11" r="3" fill="#fff"/>
        <rect x="19" y="21" width="19" height="14" rx="3.4" fill="#027A5C"/>
        <circle cx="28.5" cy="27" r="3" fill="#fff"/>
        <g stroke="#C48A00" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 11h9"/><path d="M28 7l4 4-4 4"/><path d="M17 29H8"/><path d="M12 25l-4 4 4 4"/></g>`,
    },
  ],
  chat: [
    {
      name: 'MCQs',
      local: 'products/mcqs.html',
      icon: `<rect x="3" y="3" width="34" height="34" rx="5" fill="#fff" stroke="#1F2430" stroke-width="2"/>
        <circle cx="12" cy="12" r="3.8" fill="#02A885"/>
        <path d="M10.2 12l1.6 1.6 3.2-3.4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="19" y="10.4" width="14" height="2.6" rx="1.3" fill="#C4C2C2"/>
        <circle cx="12" cy="21" r="3.8" fill="none" stroke="#C4C2C2" stroke-width="1.8"/>
        <rect x="19" y="19.4" width="11" height="2.6" rx="1.3" fill="#C4C2C2"/>
        <circle cx="12" cy="30" r="3.8" fill="#02A885"/>
        <path d="M10.2 30l1.6 1.6 3.2-3.4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="19" y="28.4" width="14" height="2.6" rx="1.3" fill="#C4C2C2"/>`,
    },
    {
      name: 'Timed Q&A',
      local: 'products/timed-qa.html',
      icon: `<rect x="2" y="6" width="22" height="19" rx="4" fill="#02A885"/>
        <rect x="7" y="12" width="12" height="2.4" rx="1.2" fill="#fff"/>
        <rect x="7" y="17" width="8" height="2.4" rx="1.2" fill="#fff"/>
        <circle cx="28" cy="27" r="11" fill="#fff" stroke="#1F2430" stroke-width="2"/>
        <path d="M28 27v-7" stroke="#E0655F" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M28 27l5 3" stroke="#1F2430" stroke-width="2" stroke-linecap="round"/>`,
    },
    {
      name: 'Conversational Chat Interview',
      local: 'products/conversational-interview.html',
      icon: `<path d="M3 5h21a3.4 3.4 0 0 1 3.4 3.4v9A3.4 3.4 0 0 1 24 20.8H12l-5.6 4.6v-4.6H3A3.4 3.4 0 0 1-.4 17.4v-9A3.4 3.4 0 0 1 3 5z" transform="translate(2 0)" fill="#02A885"/>
        <rect x="9" y="10" width="13" height="2.2" rx="1.1" fill="#fff"/>
        <path d="M37 18H21a3.4 3.4 0 0 0-3.4 3.4v8A3.4 3.4 0 0 0 21 32.8h9l5.6 4.4v-4.4H37a3.4 3.4 0 0 0 3.4-3.4v-8A3.4 3.4 0 0 0 37 18z" fill="#027A5C"/>
        <rect x="22" y="23" width="12" height="2.2" rx="1.1" fill="#fff"/>
        <rect x="22" y="27" width="7" height="2.2" rx="1.1" fill="#F3E202"/>`,
    },
  ],
};

const TILES = [
  {
    slug: 'mimic',
    group: 'hiring',
    local: 'products/video-interviewer.html',
    name: 'Video Interview',
    tagline: 'Multi-way, one-way and AI avatar interview',
    modes: MODES.video,
    vb: 58,
    icon: `<rect x="2" y="12" width="38" height="30" rx="5" fill="#02A885"/>
      <path d="M42 22l14-8v26l-14-8z" fill="#027A5C"/>
      <circle cx="21" cy="24" r="5.4" fill="#fff"/>
      <path d="M11 37c2.4-6 17.6-6 20 0z" fill="#fff"/>
      <rect x="45" y="43" width="12" height="12" rx="3" fill="#F3E202"/>
      <path d="M48 49l2 2 4-4.4" stroke="#1F2430" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    slug: 'mimic',
    group: 'hiring',
    local: 'products/voice-interviewer.html',
    name: 'Voice Interview',
    tagline: 'A spoken round, transcribed live',
    kin: 'Live',
    vb: 58,
    icon: `<rect x="21" y="4" width="16" height="26" rx="8" fill="#02A885"/>
      <path d="M13 26a16 16 0 0 0 32 0" fill="none" stroke="#027A5C" stroke-width="4" stroke-linecap="round"/>
      <path d="M29 42v8" stroke="#027A5C" stroke-width="4" stroke-linecap="round"/>
      <g stroke="#F3E202" stroke-width="3.4" stroke-linecap="round"><path d="M6 50v-8"/><path d="M52 50v-8"/></g>
      <g stroke="#02A885" stroke-width="3.4" stroke-linecap="round"><path d="M14 52v-4"/><path d="M44 52v-4"/></g>
      <path d="M21 54h16" stroke="#027A5C" stroke-width="4" stroke-linecap="round"/>`,
  },
  {
    slug: 'mimic',
    group: 'hiring',
    local: 'products/chat-interviewer.html',
    name: 'Chat Interview',
    tagline: 'Blind text assessment, AI answers flagged',
    modes: MODES.chat,
    vb: 58,
    icon: `<path d="M6 8h34a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H22l-11 9v-9H6a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z" transform="translate(4 2)" fill="#02A885"/>
      <rect x="16" y="19" width="22" height="3.6" rx="1.8" fill="#fff"/>
      <rect x="16" y="27" width="15" height="3.6" rx="1.8" fill="#fff"/>
      <rect x="42" y="40" width="15" height="15" rx="4" fill="#F3E202"/>
      <path d="M46 47.5h7M49.5 44v7" stroke="#1F2430" stroke-width="2" stroke-linecap="round"/>`,
  },
  {
    slug: 'ats',
    group: 'hiring',
    local: 'products/ats.html',
    name: 'Intelligent Recruitment Software',
    was: 'ATS',
    tagline: 'End-to-end recruitment system for your hiring needs',
    kin: '2 modes',
    vb: 58,
    icon: `<path d="M4 6h50l-16 21v20l-18 9V27z" fill="#027A5C"/>
      <circle cx="45" cy="44" r="11" fill="#F3E202"/>
      <path d="M40 44l3.6 3.6 6.6-7.4" stroke="#1F2430" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    slug: 'erp',
    group: 'business',
    local: 'products/erp.html',
    name: 'Business Management System',
    was: 'ERP',
    /* NOT SETTLED. The meeting named the modules — purchase, procurement,
       invoicing, vendor management, cash flow — but stopped short of the final
       two lines, which were to be written from the ERP module list. This is the
       previous line, kept because a placeholder that reads like copy is worse
       than an old line that is at least true. Replace when the wording lands. */
    tagline: 'Order to cash, purchase to pay',
    vb: 58,
    icon: `<rect x="3" y="16" width="52" height="32" rx="5" fill="#02A885"/>
      <path d="M3 26h52" stroke="#fff" stroke-width="2.6" opacity=".55"/>
      <rect x="10" y="34" width="15" height="4.4" rx="2.2" fill="#fff"/>
      <circle cx="45" cy="37" r="5.4" fill="#F3E202"/>
      <path d="M19 16v-5a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v5" fill="none" stroke="#027A5C" stroke-width="3.4"/>`,
  },
  {
    slug: 'nouscrm',
    group: 'business',
    local: 'products/nouscrm.html',
    name: 'Sales CRM',
    was: 'NousCRM',
    tagline: 'Intelligent platform for leads and sales',
    page: 'https://talbotiq.com/products/sales-crm/',
    vb: 58,
    icon: `<rect x="5" y="33" width="10" height="19" rx="2.6" fill="#02A885"/>
      <rect x="20" y="24" width="10" height="28" rx="2.6" fill="#027A5C"/>
      <rect x="35" y="14" width="10" height="38" rx="2.6" fill="#02A885"/>
      <path d="M8 24L21 15l11 4L52 5" fill="none" stroke="#C48A00" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="52" cy="5" r="4.2" fill="#F3E202" stroke="#C48A00" stroke-width="2"/>`,
  },
  {
    slug: 'task-manager',
    group: 'business',
    local: 'products/tasca.html',
    name: 'Task & Productivity Manager',
    was: 'tasca',
    tagline: 'Smart management for tasks and productivity',
    page: 'https://talbotiq.com/products/task-management-system/',
    vb: 58,
    icon: `<rect x="5" y="5" width="21" height="21" rx="5" fill="#02A885"/>
      <rect x="32" y="5" width="21" height="21" rx="5" fill="#027A5C"/>
      <rect x="5" y="32" width="21" height="21" rx="5" fill="#027A5C"/>
      <rect x="32" y="32" width="21" height="21" rx="5" fill="#F3E202"/>
      <path d="M10 15.5l4 4 7-8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M37 42.5l4 4 7-8" stroke="#1F2430" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    slug: 'lexerai',
    group: 'business',
    local: 'products/lexer.html',
    /* NOT "Parser". The meeting is explicit that the product scans as well as
       parses, so calling it a parser understates it — "Intelligent Document
       Management" was the name settled on. */
    name: 'Intelligent Document Management',
    was: 'Lexer',
    tagline: 'Scan and parse all types of documents',
    vb: 58,
    icon: `<path d="M9 3h24l16 16v34a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#02A885"/>
      <path d="M33 3l16 16H33z" fill="#027A5C"/>
      <rect x="16" y="26" width="24" height="3.6" rx="1.8" fill="#fff"/>
      <rect x="16" y="34" width="24" height="3.6" rx="1.8" fill="#fff"/>
      <rect x="16" y="42" width="14" height="3.6" rx="1.8" fill="#F3E202"/>`,
  },
  {
    slug: 'recapr',
    group: 'business',
    local: 'products/recapr.html',
    name: 'Intelligent Note Taker',
    was: 'Recapr',
    tagline: 'The intelligent note taker for all your meetings',
    vb: 58,
    icon: `<path d="M5 8h34a6 6 0 0 1 6 6v17a6 6 0 0 1-6 6H21l-11 9v-9H5a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z" transform="translate(3 1)" fill="#02A885"/>
      <rect x="15" y="19" width="21" height="3.6" rx="1.8" fill="#fff"/>
      <rect x="15" y="27" width="14" height="3.6" rx="1.8" fill="#fff"/>
      <circle cx="45" cy="43" r="11" fill="#C48A00"/>
      <path d="M45 37v6.4l4 2.8" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  },
  {
    slug: 'ai-engine',
    group: 'engine',
    local: 'products/vawlt.html',
    name: 'Private AI Engine',
    was: 'TalbotIQ AI Engine',
    tagline: 'Your AI, inside your perimeter',
    vb: 70,
    icon: `<path d="M35 4l25 10v20c0 16-10 24-25 31C20 58 10 50 10 34V14z" fill="#027A5C"/>
      <rect x="24" y="30" width="22" height="17" rx="3.6" fill="#F3E202"/>
      <path d="M28.5 30v-5a6.5 6.5 0 0 1 13 0v5" fill="none" stroke="#F3E202" stroke-width="3.4"/>
      <circle cx="35" cy="38" r="3" fill="#027A5C"/>`,
  },
];

/* THE COUNT IS DERIVED, NOT TYPED. It appears twice in the copy below — the
   hero's lede and the product section's own heading — and the page shipped
   "Eight products" over a grid of ten the last time the lineup changed. A word
   that has to agree with an array is the array's job to produce. */
const NUMWORD = ['no', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const COUNT = NUMWORD[TILES.length] || String(TILES.length);

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
    heading: {
      text: 'Ready to accelerate your business with AI?',
      keys: [['accelerate', 'g'], ['AI', 'y']],
    },
    lede: 'Tell us which product you want to see and we will come back to you within one business day.',
    notesPlaceholder: 'What you would like the demo to cover, and roughly how many people would use it.',
    cta: 'Request a demo',
  },

  /* THE PRODUCT SECTION'S OWN HEADING AND LEDE. It is `lead` + `marked`
     like the hero, because the highlighter lands on the second clause only —
     a mark that has to guess where a line wraps is a mark in the wrong place.

     THE ENGINE'S NOTE IS GONE, by request. `enote` was a sentence set under
     the engine tile claiming purpose-trained models on controlled hardware and
     per-task data declarations. It was the one claim in this section the other
     tiles could not make for themselves, and it is removed rather than
     softened — an unmade claim needs no hedging. `COUNT_BUT_ENGINE` went with
     it; it counted the tiles for that sentence and had no other reader. */
  products: {
    heading: {
      text: 'All products Powered by or Connected to an AI Engine.',
      keys: [['Powered by', 'g'], ['AI Engine', 'y']],
    },
    lede: {
      strong: 'Buy one, or buy the suite.',
      rest: 'Work moves between them without an export, a hand-off, or a second version of the truth.',
    },
  },

  /* THE HEADER'S OWN CALL TO ACTION, separate from the hero's. The top-right
     button used to reuse `hero.primary` ("Book a demo") and open demo.html;
     by request it now offers the contact page instead. It is its own key
     because the hero, the closing band and the footer still ask for a demo —
     one string serving four buttons is what made this look like a site-wide
     change when it is only the header. */
  headerCta: 'Get in touch',

  hero: {
    /* ONE HEADING, NOT TWO HALVES. It used to be split into `lead` and
       `marked` because a highlighter had to be positioned over the second
       clause. The emphasis is colour now, so the sentence is whole and the
       words that carry it are simply named. */
    heading: {
      text: 'Every workflow, running on intelligence.',
      keys: [['workflow', 'y'], ['intelligence', 'g']],
    },
    lede: { strong: 'All products', rest: 'Powered by or Connected to an AI Engine.' },
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
      'Our AI-first proprietary software suite is engineered as a high-performance, '
      + 'interconnected ecosystem. By eliminating the friction of fragmented '
      + 'third-party tools, our platform ensures mission-critical data flows '
      + 'natively between modules, transforming isolated business events into '
      + 'synchronized, automated workflows.',

    /* The label over the pipeline. The four stages under it are NOT written
       here — they are the AI Engine's own `story.arc` from products.js, so the
       diagram cannot drift from the product it describes. */
    coreEyebrow: 'AI-first proprietary core',

    /* ONE PLAIN SENTENCE PER STAGE, keyed by the stage's own word. "Redact" is
       precise and it is what the engine does, but a reader who has not met the
       term reads straight past it; "Protect data" is what they came to find
       out. The technical word stays primary and this sits under it — the
       translation, not the replacement.

       The build FAILS if a stage has no line here, so adding a fifth stage to
       products.js cannot silently ship a diagram with a blank column. */
    plain: {
      Request: 'Receive signal',
      Redact: 'Protect data',
      Route: 'Intelligent path',
      Answer: 'Execute result',
    },

    /* THE RIGHT-HAND VISUAL IS INLINE SVG, not a file. The neural loop lives in
       build.js and animates in CSS, which is why this is null: three columns,
       the signal travelling application -> engine -> agent, on a 9s cycle
       whose every duration divides 9 so it closes on itself and runs for ever.

       INLINE BEAT THE MP4 ON ALL THREE THINGS THAT MATTER HERE. The figure
       carries eleven product names and nine agent names at about 9px on
       screen, where vector text stays sharp and a 1080p frame upscaled into a
       810px column at 2x does not. It is 20kB against 4.4MB. And a CSS
       animation cannot be paused by an autoplay policy, a battery saver or a
       backgrounded tab, which is what "never stops" actually requires.
       `prefers-reduced-motion` still stops it, deliberately.

       TO GO BACK TO A VIDEO, set this and the SVG is not emitted at all:

         video: { src: 'assets/eco/neural-loop.mp4', poster: 'assets/eco/neural-loop.jpg' }

       Both files are current — same revision as the inline figure — so the
       switch is one line and nothing else has to change. The mp4 is a
       9-second 1920x1080 H.264 loop with NO AUDIO TRACK at all, not merely
       muted, so there is nothing for an autoplay policy to block. Note that
       it carries the exhibit's own opaque ground, which the inline version
       drops so the figure sits on the section's flat black. */
    video: null,
  },

  /* the company's own line, from about-us. */
  mission: {
    heading: {
      text: 'Technology is a tool. Intelligence is the edge.',
      keys: [['Technology', 'g'], ['Intelligence', 'y']],
    },
    body:
      'At Talbotiq, we believe the next decade of business will be defined by those '
      + 'who can successfully transition from manual workflows to intelligent systems. '
      + 'Our mission is to dismantle the operational bottlenecks that stifle growth by '
      + 'injecting high-fidelity AI and robust engineering into the core of your business.',
  },

  /* One keyword, not two: "AI" is the whole subject of the line and a second
     colour would be decoration rather than emphasis. */
  capsHeading: {
    text: 'Enterprise AI, done properly.',
    keys: [['AI', 'g']],
  },
  /* The section is a media-and-thought-leadership showcase, not a company
     blog: every card is a column published BY a masthead, so the heading names
     what the cards actually are. */
  blogHeading: {
    text: 'Thought Leadership & Media Coverage',
    keys: [['Leadership', 'g'], ['Coverage', 'y']],
  },
  /* The editorial introduction, set between the heading and the grid. It says
     whose byline these are and where they run, which is the claim the cards
     only imply one at a time. `.sec-lede` is already in scroll.js's reveal KIT,
     so this inherits the same rise every other section lede gets. */
  blogLede: 'Akhil Gupta is a regular columnist for The Edge Malaysia and an active contributor to a range of national and regional media platforms. The Edge Malaysia is one of the country\u2019s leading business and financial news publications. His writing explores the evolving intersections of AI, business strategy, digital transformation, and talent development.',

  close: {
    heading: {
      text: 'Ready to accelerate your business?',
      keys: [['accelerate', 'y']],
    },
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

  allProducts: 'View all products',
};

/* SIX CARDS, so nothing spans. `wide: true` used to sit on "Innovation at
   speed" and stretch it across two columns — it existed for one reason, which
   was that five cards in a three-column grid leave a hole in the second row.
   Six fill it, so the workaround came off with the sixth card's arrival and
   every card is now the same width. `.cap.wide` is still in §8 of the
   stylesheet if an odd count ever comes back. */
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
    body:
      'We move at the pace of the AI industry, so our clients never fall behind — and we '
      + 'prioritize security and ethical AI practices above all else. We work with your team '
      + 'to build systems that enhance human potential, not replace it.',
  },
  {
    title: 'Efficient deployment',
    body: 'Launch AI tools through structured workflows that minimize disruption and maximize adoption speed.',
  },
  {
    title: 'Subject Matter Expertise',
    body: 'Combine deep industry knowledge with AI expertise to build solutions tailored to real-world business challenges, workflows, and domain-specific requirements.',
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
  heading: {
    text: 'Why Lead with Talbotiq?',
    keys: [['Lead', 'g'], ['Talbotiq', 'y']],
  },
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
   was a podcast episode ([EP120] Beyond the Headlines), which is not in the
   author index and is not one of these. It has its own record now — FEATURE,
   below — and its own layout above the grid, which is where it belonged.
   ---------------------------------------------------------------------- */
const BLOG = {
  /* THREE, not eight. All eight records stay in articles.js and none of them
     are deleted — the grid shows the newest three and the rest are one click
     away. Eight cards at once read as an archive dump; three read as a
     selection. `null` here would show every one of them again. */
  show: 3,
  /* The label over the three cards. Rendered uppercase by the eyebrow rule. */
  sectionLabel: 'Selected thought leadership',
  /* THE ONE METADATA LINE UNDER EACH COVER, and it replaces the date and the
     masthead that used to sit there. Exact wording, fixed here rather than
     assembled in the template so it cannot drift between cards. The middle
     character is U+00B7, a real middle dot. */
  byline: 'By Akhil Gupta · Group CEO, Talbotiq',
  /* Points at the publisher's own author index, which is the live list of
     every column he has written — the five not on the homepage included, and
     the ones written after this build too. A local archive page would be a
     second copy of someone else's content that goes stale the day he files
     again, so this reuses the route that already exists. */
  moreLabel: 'View all thought leadership',
};

/* -------------------------------------------------------------------------
   THE FEATURED EPISODE
   One media item, set above the grid rather than in it. It is deliberately NOT
   a ninth article card: the columns below are read and this is watched, and a
   16:9 player sitting in a row of 3:2 thumbnails would claim to be the same
   kind of thing. It is also not ours — it is an appearance ON someone else's
   show, which is why `show` names the programme and is the loudest line in the
   block.

   `youtube` is the video id, not a URL, so there is exactly one place that
   knows how a YouTube embed is spelled (build.js) and no chance of a watch
   link being pasted where an embed URL belongs. The id resolves to
   https://www.youtube.com/watch?v=AbNEbtdJUB8 — NST Online, 5 Feb 2026.

   Set this to null and the section renders exactly as it did before: heading,
   lede, grid.
   ---------------------------------------------------------------------- */
const FEATURE = {
  show: 'Beyond the Headlines',
  title: '[EP120] BTH: The AI Race: Preparing Malaysia\u2019s workforce and economy',
  desc: 'A closer look at Artificial Intelligence and its growing impact on Malaysia\u2019s '
    + 'economy, businesses, and society. A talk about how the country is preparing to become '
    + 'an AI nation by 2030, and what challenges lie ahead for small and medium enterprises '
    + 'as they navigate this technological shift.',
  youtube: 'AbNEbtdJUB8',
};

/* -------------------------------------------------------------------------
   THE BROADCAST APPEARANCE — the second item under the episode
   -----------------------------------------------------------------------------
   NOT A VIDEO, AND IT DOES NOT PRETEND TO BE ONE INLINE. On akhilgupta.live
   this item is a still with a play glyph baked into it, linked to the LinkedIn
   post that actually holds the clip. There is no embeddable source — CGTN's
   segment is not on a channel this page can frame — so the honest version is
   the same still, linked out, with a visible "Watch on LinkedIn" under it so
   the glyph is not promising playback this page cannot deliver.

   `image` is served from our own origin rather than hotlinked from
   akhilgupta.live: the file is cropped of its screenshot borders and
   recompressed, and a build with it missing fails rather than shipping a hole.
   ---------------------------------------------------------------------- */
const BROADCAST = {
  show: 'Live TV Interview with China Global Television Network',
  title: 'AI on the Global Stage: A Conversation That Matters',
  desc: 'Catch a glimpse of a dynamic live discussion on CGTN about the Global AI '
    + 'Competition. Explore how AI is rapidly transforming industries and shifting '
    + 'global power. Dive into key insights and bold questions shaping our tech-driven future.',
  link: 'https://www.linkedin.com/posts/akhil-gupta-a706503_ai-artificialintelligence-tech-activity-7295724190286917632-nsfB',
  linkLabel: 'Watch on LinkedIn',
  image: 'assets/press-cgtn.jpg',
  imageAlt: 'CGTN Global Business, during the segment on the global AI competition',
  imageW: 778,
  imageH: 512,
};

/* -------------------------------------------------------------------------
   NAV
   The mockup draws a caret on Products, Solutions and Company and leaves
   the last item bare, so those three own panels and it is a plain link.

   PRICING IS GONE, by request — the item and the reasoning that kept it. It
   used to sit here pointing at contact, on the argument that a company with no
   published price list answers that question in a conversation. Removed
   outright instead: an item promising a price and delivering a contact form is
   a nav that does not do what it says, and there is no pricing page to point
   at. The same removal was made in tools/fix-pages.js, which used to re-aim it
   on the standalone product pages and now strips it.

   SUPPORT IS NOW CONTACT, by request. It already pointed at the contact page —
   on the argument that no support portal exists yet and a nav item that 404s is
   worse than one that redirects somewhere real — so this is the label catching
   up with where the link always went. It carries no `note` any more: a Contact
   item pointing at contact is not a decision that needs defending.

   The footer's Resources column still lists a separate `Support`, unlinked and
   marked "soon". That one means a support portal that does not exist yet, which
   is a different thing from this nav item, so it was left alone.
   ---------------------------------------------------------------------- */
const NAV = [
  { label: 'Products', panel: 'products' },
  { label: 'Solutions', panel: 'solutions' },
  { label: 'Company', panel: 'company' },
  { label: 'Contact', to: 'contact' },
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

/* ONE NUMBER, NAMED, AND IT IS NEVER PRINTED. This was `phones`, an array of
   the mobile and the landline, and every place that displayed either of them is
   gone — no page on this site shows phone digits any more. What is left is the
   office line, which two `tel:` links on the demo page DIAL behind the words
   "Call the office".

   IT IS A FIELD RATHER THAN AN ARRAY BECAUSE THE ARRAY HAD TWO TRAPS. Only its
   LAST element was ever read, so the mobile number sat in the file rendering
   nowhere and reading as though it did; and the reads were
   `phones[phones.length - 1]`, so anyone emptying the array to "remove the
   numbers" got `phones[-1]` — undefined — and a TypeError instead of a page.
   A named field cannot be half-emptied.

   THE MOBILE IS STILL ON THE SITE, as the wa.me number behind the WhatsApp
   links in the standalone pages. Those are hand-written in each page, not
   generated from here — `products.js` records it as COMPANY.whatsapp — so it is
   not this file's business. */
const CONTACTS = {
  email: 'hello@talbotiq.com',
  office: '+603 20 111 320',
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

/* PRIVACY POLICY · TERMS · SECURITY ARE NO LONGER IN THE FOOTER, by request.
   The array that held them is gone with the row. All three were unlinked text:
   there is no privacy page, no terms page and no security page in this repo,
   and the previous decision here was to render them without an href rather
   than send a reader to the old site's policy. Naming three documents nobody
   can open is the thing that has now been removed instead.

   THE GAP IS REAL AND DELIBERATE. This site has no privacy policy a reader can
   open. When one is written, this is where its entry goes, and build.js's
   footer is where the row comes back. */

module.exports = {
  PALETTE, TILES, GROUPS, COPY, CAPABILITIES,
  WHY, BLOG, FEATURE, BROADCAST,
  NAV, SOLUTIONS, COMPANY_LINKS, RESOURCES, CONTACTS, NEWSLETTER,
};
