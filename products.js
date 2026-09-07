/* =============================================================================
   TALBOTIQ — PRODUCT DATA MODEL  (single source of truth)
   -----------------------------------------------------------------------------
   This is the ONLY file you edit to change the landing page's product content.
   Then run:  node build.js
   -----------------------------------------------------------------------------
   TO FILL IN A PENDING PRODUCT (e.g. PMS):
     1. set  url:      'https://…'
     2. set  status:   'live'
     3. write position / description / features from the REAL app
     4. node build.js
   The chapter, the explorer row, the mega-menu entry, the footer link and the
   JSON-LD all update together.

   ACCURACY CONTRACT
     Every `description` and every string in `features` is traceable to
     research/RESEARCH.md, and `evidence` records where it came from.

     `illustrative` is the other half of that contract. Several chapters depict
     a sample record — a candidate answer, a receipt, a redacted sentence. The
     CAPABILITY is verified; the specimen is made up, because publishing a real
     candidate's interview or a real customer's receipt would be worse. Wherever
     that happens, `illustrative` states it in plain words and the page prints
     it under the artwork. This is TalbotIQ's own house voice — Mimic ships the
     line "We do not display certification badges we cannot evidence" — and it
     buys more credibility than a silent mockup ever would. If you add a
     specimen, add its `illustrative` note too — and place it WITH the artwork
     it describes. The engine chapter shows two specimens in two columns, so it
     carries two notes (`illustrative` and `busIllustrative`); a single note
     pointing at the other column is worse than none.
   ========================================================================== */

const COMPANY = {
  name: 'TalbotIQ',
  legal: 'Talbotiq Technologies Sdn Bhd [1313215-V]',
  tagline: 'Intelligent AI Automation',              // from the official logo lockup
  positioning: 'Architecting the Intelligence Layer of Modern Businesses',
  // about-us, verbatim. Used as the closing statement — the company's own words,
  // so the page's biggest line of type is not copy anyone invented.
  creed: 'Technology is a tool. Intelligence is the edge.',
  antiHype: 'No "AI hype." We build tools that solve actual business bottlenecks.',
  site: 'https://talbotiq.com',
  // WHERE THIS PAGE WILL LIVE. Leave null until you know it: a <link rel=canonical>
  // or og:url pointing at a 404 is worse for SEO than emitting neither. Set it
  // (e.g. 'https://talbotiq.com/ecosystem/') and rebuild before going live.
  pageUrl: null,
  contact: 'https://talbotiq.com/contact-us/',
  inquiry: 'https://talbotiq.com/inquiry-now/',
  privacy: 'https://talbotiq.com/privacy-policy/',
  phone: '+603 20 111 320',
  base: 'Kuala Lumpur, Malaysia',
  // The office, verbatim from the <address> block on the supplied contact page
  // mockup. Recorded here rather than left in that one file so the Google Maps
  // links on it are built from the same string a reader sees, and so anything
  // else that needs the address has somewhere to read it from.
  address: {
    line1: 'Unit 3.02, Plaza Damansara, A 45',
    line2: 'Jalan Medan Setia 1, Bukit Damansara',
    postcode: '50490',
    city: 'Kuala Lumpur',
    state: 'Wilayah Persekutuan',
    country: 'Malaysia',
  },
  // WhatsApp, already live on the contact page mockup
  whatsapp: 'https://wa.me/60128177741',
  // Every product's app mark carries one shape in this green — the shared
  // engine, drawn into the icon set itself. Sampled from the official logo.
  markGreen: '#1F9A69',
  markNeutral: '#3B4A52',   // the engine's own mark inverts the pair
};

/* The engine's three rate-limit words (Comfortable / Approaching / At
   ceiling) used to live here and label a gauge on the bus. The gauge is
   binary now — on the engine, or not yet — because the percentage it drew
   was invented, and a figure that needs a note saying its numbers are made
   up is worth less than a figure without numbers. */

/* Category order drives the mega-menu column order. */
const CATEGORIES = [
  { id: 'intelligence', name: 'Intelligence',     note: 'The layer the rest of the suite runs on.' },
  { id: 'people',       name: 'People & hiring',  note: 'Getting the right people in, and looking after them.' },
  { id: 'revenue',      name: 'Revenue',          note: 'Pipeline, customers and what they owe.' },
  { id: 'knowledge',    name: 'Knowledge & work', note: 'What was said, what was signed, what happens next.' },
];

const PRODUCTS = [
  /* ------------------------------------------------------------------ ENGINE */
  {
    slug: 'ai-engine',
    chapter: 6,
    story: { kind: 'engine', arc: ['Request', 'Redact', 'Route', 'Answer'] },
    name: 'TalbotIQ AI Engine',
    short: 'AI Engine',
    category: 'intelligence',
    status: 'live',
    access: 'internal',                       // internal | app | site
    url: 'https://coe.talxone.com/dashboard/',
    accent: '#2E9E86',
    bus: { served: 'the whole suite', headroom: null },
    position: 'The intelligence layer under every product',
    statement: 'One engine.\nEvery product\nmetered through it.',
    description:
      'One engine serves the whole suite: it routes each request between a hosted frontier model and a local small model, scrubs PII before anything reaches a model, and answers from a knowledge base you load. Every product is metered through it.',
    features: ['Model routing', 'PII scrubbing', 'Knowledge base', 'Per-product metering', 'API keys', 'Request logs'],
    cta: 'Open the console',
    evidence: 'Admin console bundle: Overview/Usage/Models/Knowledge Base/Logs/API Keys/Console; gemini-2.5-flash + qwen3-4b; "PII scrubbing is on by default"; "Redacted before the model"; product keys PMS, MIMIC, Recapr; rate-limit states Comfortable/Approaching/At ceiling.',
    // Two different specimens in this chapter, so two different notes — each
    // sits with the artwork it describes rather than in the other column.
    illustrative: 'Sample request. The PII scrubbing it shows is on by default.',
    // a specimen request, with the spans the engine would scrub
    redact: {
      before: [
        'Raise an invoice for ', { pii: 'Nurul Hakim' }, ' at ', { pii: 'nurul@example.com' },
        ' — he called from ', { pii: '+60 12-345 6789' }, ' about the September renewal.',
      ],
      after: 'Raise an invoice for [NAME] at [EMAIL] — he called from [PHONE] about the September renewal.',
    },
    routes: [
      { model: 'gemini-2.5-flash', label: 'Routed to Gemini', note: 'hosted frontier model' },
      { model: 'qwen3-4b', label: 'SLM acceptable', note: 'local small model', slm: true },
    ],
    spec: [
      ['Model routing', 'A hosted frontier model and a local small model, with the console recording which one served each request.'],
      ['PII scrubbing', 'On by default. Personal data is redacted before the model ever sees it.'],
      ['Knowledge base', 'Load PDF, DOCX or TXT; the console reports documents indexed, total chunks and embeddings.'],
      ['Observability', 'Requests, latency, tokens and errors — by product and by task, each with a request ID.'],
    ],
    notBuilt:
      'Shadow-comparing the two routes is on the roadmap, not shipped. The console says so itself: the comparison pipeline is not built yet. So it is not claimed here.',
    peek: {
      chrome: 'Usage',
      tabs: ['Overview', 'Usage', 'Models', 'Knowledge base', 'Logs'], on: 1,
      kv: [['Served by', 'gemini-2.5-flash'], ['Local model', 'qwen3-4b'], ['PII scrubbing', 'on by default']],
    },
  },

  /* ------------------------------------------------------------------ MIMIC */
  {
    slug: 'mimic',
    chapter: 1,
    story: { kind: 'mimic', arc: ['Invite', 'Interview', 'Score', 'Shortlist'] },
    name: 'Mimic',
    short: 'Mimic',
    category: 'people',
    status: 'live',
    access: 'site',
    url: 'https://talbotiq-9cc4e.web.app/',
    accent: '#0F7C93',
    bus: { served: 'MIMIC', headroom: 46, state: 'ok' },
    position: 'Screening intelligence, decided by humans',
    statement: 'Every applicant\ninterviewed\non day one.',
    description:
      'Mimic interviews every applicant the day they apply — across chat, voice, AI video and a live round — and scores every answer against one rubric you define, with the passage that earned each number attached. It recommends. It never rejects anyone.',
    features: ['Six interview formats', 'One weighted rubric', 'Evidence-linked scores', 'Bulk invitations', 'Interview pipelines', 'Audit history'],
    cta: 'Explore Mimic',
    evidence: 'Public marketing site, verbatim: "Screening intelligence, decided by humans."; six formats; "Mimic never rejects anyone"; "The platform does the arithmetic, not the model"; six default weighted criteria that rescale to 100%; each criterion links to the passage it came from.',
    illustrative: 'Sample answer and scores. Mimic recommends; it never rejects anyone.',
    // the evidence link IS the composition: a clause, and what it scored
    scored: {
      quote: [
        'I moved him to the quiet bay first so the ward settled, ',
        { mark: 'then checked his chart for the analgesia timing — he was overdue' }, '.',
      ],
      meta: ['Question 3 of 6', 'Voice screening'],
      criteria: [
        ['Relevance to question', 91, 'linked to the clause above'],
        ['Communication clarity', 88, 'linked to the full answer'],
        ['Technical / domain depth', 79, 'linked to the clause above'],
      ],
      out: ['Overall, weighted', '86'],
      outNote: 'Recommendation only. The recruiter decides.',
      arith: 'The platform does the arithmetic, not the model.',
    },
    formats: [
      ['AI video avatar', 'scored'], ['Voice screening', 'scored'], ['Assessments', 'scored'],
      ['Conversational chat', 'scored'], ['Timed Q&A', 'scored'], ['Live two-way call', 'human'],
    ],
    formatsNote: 'Five of the six score against the same rubric.',
    peek: {
      chrome: 'Scored report',
      tabs: ['AI video', 'Voice', 'Assessment', 'Chat', 'Timed Q&A'], on: 1,
      quote: '“…then checked his chart for the analgesia timing — he was overdue.”',
      stamp: 'Question 3 of 6 · specimen answer',
      meters: [['Relevance', 91], ['Clarity', 88], ['Depth', 79]],
    },
  },

  /* ----------------------------------------------------------------- RECAPR */
  {
    slug: 'recapr',
    chapter: 2,
    story: { kind: 'recapr', arc: ['Capture', 'Understand', 'Decipher', 'Act'] },
    name: 'Recapr',
    alias: 'Minute Taker',
    short: 'Recapr',
    category: 'knowledge',
    status: 'live',
    access: 'site',
    url: 'https://recapr-web-qxytyckrma-uc.a.run.app/',
    accent: '#3559C7',
    bus: { served: 'Recapr', headroom: 61, state: 'ok' },
    position: 'The meeting, on the record',
    statement: 'The meeting,\non the record.',
    description:
      'Recapr transcribes as people speak, files the decisions, commitments and risks while the room is still talking, and remembers them afterwards. When someone contradicts a decision the team already made, it says so — and quotes both sides.',
    features: ['Live transcription', 'Decisions & action items', 'Commitment tracker', 'Contradiction detection', 'Ask the record', 'No bot to invite'],
    cta: 'Explore Recapr',
    evidence: 'Public marketing site: Capture→Understand→Decipher→Act; live transcription with speaker attribution and timestamps; Vibe Check out of 100; Commitment Tracker KEPT/OPEN/SLIPPED; cross-meeting memory with contradiction detection quoting both sides; "Ask the record"; mark-the-moment ⌘⇧K; "No bot to invite."',
    illustrative: 'Sample quotes from two meetings.',
    stages: [
      { k: 'Capture',    t: 'The room, a tab, or an upload', d: 'In person, in Meet, Zoom or Teams, or a file after the fact.',
        ui: ['No bot to invite', 'Nothing joins the call as a guest.'] },
      { k: 'Understand', t: 'Every turn, attributed and stamped', d: 'While people are still talking.',
        ui: ['Live transcription', 'Speaker attribution, timestamped.'] },
      { k: 'Decipher',   t: 'Decisions, actions, risks', d: 'Filed as they are said, with the moment marked.',
        ui: ['Cmd + Shift + K', 'Mark the moment, mid-sentence.'] },
      { k: 'Act',        t: 'Kept, open or slipped', d: 'Commitments tracked across meetings, not just inside one.',
        ui: ['Commitment tracker', 'KEPT · OPEN · SLIPPED'] },
    ],
    contra: {
      a: { q: 'We hold the September date and ship the Windows build first.', stamp: 'Product weekly · 12 Aug · 23:30' },
      b: { q: 'September was never firm — we said we would revisit once the signing landed.', stamp: 'Product weekly · 2 Sep · 08:14' },
      note: 'Recapr does not tell you a contradiction exists. It quotes both sides and links each one back to its timestamp.',
    },
    peek: {
      chrome: 'Product weekly',
      quote: '“We hold the September date and ship the Windows build first.”',
      stamp: 'Dan · 23:30 · heard',
      kv: [['Key decision', 'Windows build first'], ['Action', 'Verify the build'], ['Conflicts with', '2 Sep · 08:14']],
    },
  },

  /* ---------------------------------------------------------------- NOUSCRM */
  {
    slug: 'nouscrm',
    chapter: 3,
    story: { kind: 'crm', arc: ['Opportunity', 'Customer', 'Invoice', 'Approval'] },
    name: 'NousCRM',
    alias: 'Sales CRM',
    short: 'NousCRM',
    category: 'revenue',
    status: 'live',
    access: 'app',
    url: 'https://salescrm-next-5iaoqvzvqq-el.a.run.app',
    accent: '#5A54B8',
    bus: { served: null, headroom: null },
    position: 'Opportunities, customers and what they owe',
    statement: 'Opportunities,\nand what\nthey owe.',
    description:
      'The sales workspace: opportunities tracked by stage and by source, customers and contacts in one place, invoices raised against them, and an approvals queue — with rep targets and team performance on the dashboard.',
    features: ['Opportunities by stage', 'Source attribution', 'Customers & contacts', 'Invoices', 'Approvals', 'Rep targets'],
    cta: 'Open NousCRM',
    evidence: 'Route probe (200): /dashboard /opportunities /customers /contacts /invoices /approvals /settings. Dashboard APIs in the shipped bundle: stats, approvals, approvals-count, opportunity-by-stage, opportunity-source, rep-target, sales-team-performance, salesrep-performance-chart, salesreps.',
    illustrative: 'Sample stage names and counts.',
    // modules: verified present, and the ones deliberately not claimed
    modules: {
      on:  ['Dashboard', 'Opportunities', 'Customers', 'Contacts', 'Invoices', 'Approvals', 'Settings'],
      off: ['Leads', 'Deals', 'Quotes', 'Campaigns', 'Forecast'],
      offNote: 'These five return 404. A CRM page would normally list them anyway. This one does not.',
    },
    stages: [
      { n: 'Qualify', v: 12 }, { n: 'Discovery', v: 9 }, { n: 'Proposal', v: 6 },
      { n: 'Negotiate', v: 4 }, { n: 'Won', v: 3 },
    ],
    peek: {
      chrome: 'Dashboard',
      tabs: ['Dashboard', 'Opportunities', 'Customers', 'Invoices'], on: 0,
      bars: [38, 55, 44, 68, 52, 79, 61, 86],
      kv: [['Opportunity by stage', 'reported'], ['Rep target', 'reported'], ['Awaiting approval', 'reported']],
    },
  },

  /* ---------------------------------------------------------------- LEXERAI */
  {
    slug: 'lexerai',
    chapter: 5,
    story: { kind: 'lexerai', arc: ['Capture', 'Extract', 'Convert', 'Reconcile'] },
    name: 'lexerai',
    alias: 'Document Parser',
    short: 'lexerai',
    category: 'knowledge',
    status: 'live',
    access: 'app',
    url: 'https://docparser-748029981157.us-central1.run.app/',
    accent: '#B2560C',
    bus: { served: null, headroom: null },
    position: 'Turn documents into structured data',
    statement: 'Paper in.\nStructured\ndata out.',
    description:
      'Reads business cards and receipts in any language, pulls out every field, converts currencies and flags tampering — with local OCR as an automatic offline fallback. Bring in bank statements and reconcile what it extracted against them.',
    features: ['AI vision extraction', 'Offline OCR fallback', 'Any language', 'Currency conversion', 'Tamper checks', 'Reconciliation'],
    cta: 'Open lexerai',
    evidence: 'Login page verbatim: "Turn documents into structured data." / "AI-powered extraction reads business cards and receipts in any language, pulls out every field, converts currencies, and flags tampering — with local OCR as an automatic offline fallback." Shipped markup sidebar: Dashboard/Contacts/Receipts/Analytics/Reports/Bank Statements/Reconcile; "Slip" document copilot.',
    illustrative: 'Sample receipt. Every capability listed beside it is real.',
    receipt: {
      merchant: 'Kedai Kopi Seng Lee',
      sub: 'Jln Petaling, Kuala Lumpur',
      lines: [['2 × Kopi O kaw', '7.00'], ['1 × Roti bakar', '4.50'], ['3 × Nasi lemak', '28.50'], ['Cukai perkhidmatan', '8.20']],
      total: ['JUMLAH', '48.20'],
    },
    fields: [
      ['Merchant', 'Kedai Kopi Seng Lee', 'AI vision'],
      ['Date', '14 June 2026', 'AI vision'],
      ['Language', 'Malay, translated', 'any language'],
      ['Total', 'MYR 48.20', 'AI vision'],
      ['Converted', 'USD 10.21', 'currency conversion'],
      ['Tamper check', 'Passed', 'tamper checks'],
    ],
    ask: { label: 'Slip', q: 'What did we spend on client meals in June?' },
    peek: {
      chrome: 'Receipt extracted',
      tabs: ['Dashboard', 'Receipts', 'Contacts', 'Reconcile'], on: 1,
      kv: [['Merchant', 'Kedai Kopi Seng Lee'], ['Total', 'MYR 48.20'], ['Converted', 'USD 10.21'], ['Tamper check', 'Passed']],
    },
  },

  /* ------------------------------------------------------------------- HRMS */
  {
    slug: 'hrms',
    chapter: null,
    hidden: true,   // set false (and give it a `chapter`) to publish it
    name: 'TalbotIQ HRMS',
    short: 'HRMS',
    category: 'people',
    status: 'live',
    access: 'app',
    url: 'https://hrms-app-production-6e3e.up.railway.app/',
    accent: '#12857A',
    bus: { served: null, headroom: null },
    position: 'The people workspace, through to payday',
    description:
      'Employees, attendance and shifts, leave with balances and a team calendar, and expense claims — all feeding one approvals inbox. Payroll runs the whole way through to payslips, bank payments and Malaysian statutory: EPF, SOCSO, EIS and PCB.',
    features: ['Employee directory', 'Attendance & shifts', 'Leave & balances', 'Claims', 'One approvals inbox', 'Payroll & payslips', 'EPF · SOCSO · EIS · PCB'],
    cta: 'Open HRMS',
    evidence: 'Unbundled src/config/routes.js — the annotated route table. Payroll suite verified route-by-route. NOT claimed: recruitment, performance reviews, employee creation (route removed, no form behind it).',
    peek: {
      chrome: 'Payroll run',
      tabs: ['My space', 'Employees', 'Attendance', 'Leave', 'Payroll'], on: 4,
      kv: [['Statutory', 'EPF · SOCSO · EIS · PCB'], ['Payslips', 'generated per run'], ['Bank payments', 'yes']],
    },
  },

  /* ---------------------------------------------------- TASK & PROJECT MGMT */
  {
    slug: 'task-manager',
    chapter: 4,
    story: { kind: 'task', arc: ['Triage', 'Plan', 'Execute', 'Close'] },
    name: 'Task & Project Management',
    alias: 'Task Manager',
    short: 'Task Manager',
    category: 'knowledge',
    status: 'live',
    access: 'pending-url',            // real product, app URL not yet supplied
    url: null,
    productPage: 'https://talbotiq.com/products/task-management-system/',
    accent: '#7B54BE',
    bus: { served: null, headroom: null },
    position: 'Plan, track and execute',
    statement: 'A request in.\nA brief,\nassigned.',
    description:
      'Tasks created, prioritised and assigned across boards, calendars and Gantt views, with shared workspaces, in-task comments and file sharing. AI User Triage turns an incoming request into a structured brief, scores its priority and routes it to a team with capacity.',
    features: ['Boards, calendar & Gantt', 'Shared workspaces', 'In-task comments', 'Timers & recurring work', 'Slack, email & calendar', 'AI User Triage'],
    cta: 'Read the product page',
    evidence: 'talbotiq.com/products/task-management-system/ — official copy. "Plan, Track and Execute"; Centralized Task Control (boards, calendars, Gantt, automated reminders); Seamless Team Collaboration; Frictionless Productivity (timers, recurring automation, Slack/email/calendar); AI User Triage.',
    illustrative: 'Drawn from the product page, not a live app.',
    triage: {
      in: { label: 'What arrives', text: 'hi — the export on the finance dashboard has been timing out since friday, we need it before the board pack goes out on the 12th. cc’d Aiman who saw it first.' },
      out: [['Type', 'Defect'], ['Priority', 'High — dated deadline'], ['Due', '12th'], ['Assigned', 'Team with capacity'], ['Watchers', 'Reporter, Aiman']],
    },
    lanes: [
      { n: 'Triaged',     items: ['Request turned into a structured brief', 'Priority scored'] },
      { n: 'In progress', items: ['Assigned by availability', 'Timer running'] },
      { n: 'Done',        items: ['Recurring work reset for next cycle'] },
    ],
    peek: {
      chrome: 'Boards',
      tabs: ['Boards', 'Calendar', 'Gantt'], on: 0,
      kv: [['AI User Triage', 'request → brief'], ['Priority', 'scored'], ['Assignment', 'by availability']],
    },
  },

  /* -------------------------------------------------------------------- PMS */
  {
    slug: 'pms',
    chapter: null,        // real, but nothing about it is describable yet, and
                          // a chapter saying so is not worth a reader's time
    story: { kind: 'pms', arc: null },
    name: 'PMS',
    short: 'PMS',
    category: 'knowledge',
    status: 'pending',                // genuine placeholder — nothing is claimed
    access: 'pending-url',
    url: null,
    accent: '#69787E',
    bus: { served: 'PMS', headroom: 83, state: 'near' },
    position: 'In development',
    description:
      'Live on the TalbotIQ AI Engine and in development. We will describe it here when there is something to describe.',
    features: [],
    cta: null,
    evidence: 'Product key "PMS" found in the AI Engine admin bundle alongside MIMIC and Recapr, under per-product metering. Name expansion and feature set NOT verifiable — deliberately left blank.',
    registry: { keys: ['MIMIC', 'Recapr', 'PMS'], on: 'PMS' },
    peek: null,
  },
];

/* =============================================================================
   THE WORK LIFECYCLE — "why do these exist together?"
   -----------------------------------------------------------------------------
   Each stage is a real piece of work. Under it are the products whose OWN
   verified arc (`story.arc`, above) does that piece. So the mapping is a
   restatement of what each product does, not a new claim: `does` never says
   more than that product's own chapter already says.

   READ THIS BEFORE ADDING A STAGE. Nothing here may imply that one product
   hands data to another. research/RESEARCH.md records that data sync, single
   sign-on and shared records are NOT claimed — no evidence was found for any
   of them. What the suite genuinely shares is listed separately in SHARED,
   each item carrying how it was verified.

   A product with `arc: null` — PMS — appears in no stage, on purpose. Absence
   of a claim is drawn as absence, the same rule the headroom gauges follow.
   ========================================================================== */
const LIFECYCLE = [
  {
    verb: 'Capture',
    gloss: 'Something happens, and it goes on the record instead of into somebody’s memory.',
    does: {
      mimic: 'runs the interview',
      recapr: 'records the meeting',
      lexerai: 'takes in the document',
    },
  },
  {
    verb: 'Understand',
    gloss: 'The record is read, and comes back as something you can act on.',
    does: {
      mimic: 'scores each answer',
      recapr: 'writes the summary',
      lexerai: 'pulls out the fields',
    },
  },
  {
    verb: 'Organise',
    gloss: 'It stops being an event and becomes a record somebody owns.',
    does: {
      nouscrm: 'opportunity, customer, invoice',
      'task-manager': 'planned onto a board',
    },
  },
  {
    verb: 'Act',
    gloss: 'The work is assigned, done, approved and closed.',
    does: {
      'task-manager': 'execute and close',
      nouscrm: 'approvals, and what is owed',
    },
  },
  /* Not a step. `base` marks the row the other four sit on, so it is drawn
     without a number — a numbered fifth stage read as another thing the
     reader has to do, which the engine is precisely not. */
  {
    verb: 'One engine underneath',
    base: true,
    gloss: 'Every one of those four asks the same engine to do the thinking. That is the whole idea.',
    does: { 'ai-engine': 'the same engine, every time' },
  },
];

module.exports = { COMPANY, CATEGORIES, PRODUCTS, LIFECYCLE };
