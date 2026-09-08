/* =============================================================================
   BUILD — products.js + home.js  ->  index.html      (zero dependencies)
   -----------------------------------------------------------------------------
   The design is mockup-homepage.html. Structure, top to bottom:

     header        logo · five nav items, three of which open a panel · Book a demo
     hero          one display line with the highlighter on its last clause
     #products     the eight tiles, on the grey band
     #ecosystem    the suite's own claim, in its own tinted band
     mission       "Technology is a tool. (Intelligence) is the edge."
     caps          five capability cards in a 3 + 2 grid, one corner cut
     #why          why lead with TALBOTIQ — three claims, text only
     #insights     every published column, from articles.js
     cta           the closing offer, in teal
     footer        five columns · newsletter · legal

   TWO SOURCES, ONE JOIN. `products.js` owns what each product IS and is
   unchanged by this design; `home.js` owns how the page is COMPOSED and joins
   to it by slug. The integrity checks below fail the BUILD rather than the
   page, so a broken join or a missing string never reaches a reader.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { COMPANY, PRODUCTS } = require('./products.js');
const H = require('./home.js');
/* Generated from The Edge Malaysia by tools/fetch-articles.js — never hand-edited. */
const { PUBLISHER, ARTICLES, articleUrl } = require('./articles.js');

/* ---- helpers ----------------------------------------------------------- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]));

/* The product every diagram on this page orbits. */
const CENTER_SLUG = 'ai-engine';

/* ---- integrity checks: fail the build, not the page -------------------- */
{
  const bad = [];
  for (const t of H.TILES) {
    if (!BY_SLUG.has(t.slug)) bad.push(`tile "${t.name}" points at unknown slug "${t.slug}"`);
    if (!t.tagline) bad.push(`tile "${t.name}" has no tagline`);
    if (!t.icon) bad.push(`tile "${t.name}" has no icon`);
  }
  /* UNIQUENESS IS ON THE NAME, NOT THE SLUG. Video, Voice and Chat Interviewer
     are three tiles on one product (Mimic) — three questions a reader arrives
     with, one thing that answers them — so a shared slug is now legal and a
     shared name is still the copy-paste mistake worth failing the build for. */
  if (H.TILES.length !== new Set(H.TILES.map((t) => t.name)).size) bad.push('two tiles share a name');
  /* A tile whose group does not resolve would silently vanish from the grid,
     because the section renders by filtering TILES per group. */
  for (const t of H.TILES) {
    if (!H.GROUPS.some((g) => g.id === t.group)) bad.push(`tile "${t.name}" is in unknown group "${t.group}"`);
  }
  for (const g of H.GROUPS) {
    if (!g.label || !g.tone) bad.push(`group "${g.id}" is missing a label or a tone`);
    if (!H.TILES.some((t) => t.group === g.id)) bad.push(`group "${g.label}" has no tiles`);
  }
  for (const c of H.CAPABILITIES) if (!c.title || !c.body) bad.push('a capability card is missing text');
  for (const s of H.SOLUTIONS) if (!s.name || !s.summary) bad.push('a solution is missing text');
  if (!COMPANY.contact || !COMPANY.inquiry) bad.push('COMPANY is missing contact or inquiry');
  /* The articles are other people's published work. A card with a missing
     title, date or link is worse than no card, so the build refuses one. */
  if (!ARTICLES.length) bad.push('articles.js is empty — run: node tools/fetch-articles.js');
  for (const a of ARTICLES) {
    if (!a.nid) bad.push(`an article has no nid (${a.title || 'untitled'})`);
    if (!a.title) bad.push(`article ${a.nid} has no title`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date || '')) bad.push(`article ${a.nid} has a bad date: ${a.date}`);
    if (!a.summary) bad.push(`article ${a.nid} has no summary`);
  }
  if (ARTICLES.length !== new Set(ARTICLES.map((a) => a.nid)).size) bad.push('two articles share an nid');
  /* THE STAGE DRAWS A DIAGRAM OF THE SUITE, AND A DIAGRAM IS A CLAIM. It needs
     a centre to orbit and a `bus` on every product to know which of them are
     genuinely on the engine. A missing one would draw a blank node or, worse,
     silently assert an integration that does not exist — so it fails here. */
  if (!H.TILES.some((t) => t.slug === CENTER_SLUG)) {
    bad.push(`no tile with slug "${CENTER_SLUG}" — the stage has no centre to draw`);
  }
  for (const t of H.TILES) {
    const p = BY_SLUG.get(t.slug);
    if (p && !p.bus) bad.push(`product "${t.slug}" has no bus — the stage cannot tell whether it is on the engine`);
  }
  /* The signal that crosses the page carries the ENGINE's own four words —
     Request, Redact, Route, Answer — because the engine is the layer under
     every product. No arc, nothing to carry. */
  {
    const e = BY_SLUG.get(CENTER_SLUG);
    const arc = e && e.story && e.story.arc;
    if (e && !(Array.isArray(arc) && arc.length === 4)) {
      bad.push(`${CENTER_SLUG} has no four-stage story.arc — the signal has nothing to carry`);
    }
    /* Every stage carries a plain-language line under it. A missing one would
       render as a blank column under a technical word, which is worse than not
       translating the word at all — so it fails here instead. */
    const plain = (H.COPY.ecosystem && H.COPY.ecosystem.plain) || {};
    if (Array.isArray(arc)) {
      for (const step of arc) {
        if (!plain[step]) bad.push(`stage "${step}" has no plain-language line in COPY.ecosystem.plain`);
      }
    }
    if (!H.COPY.ecosystem || !H.COPY.ecosystem.coreEyebrow) bad.push('COPY.ecosystem.coreEyebrow is missing');
    const v = H.COPY.ecosystem && H.COPY.ecosystem.video;
    if (v && !v.src) bad.push('COPY.ecosystem.video is set but has no src');
  }

  if (bad.length) {
    console.error('\nBUILD FAILED\n' + bad.map((b) => '  · ' + b).join('\n') + '\n');
    process.exit(1);
  }
}

/* WHERE THINGS POINT. Collected here so every destination on the page is
   decided in one place and can be checked at a glance.

   `demo` is the inquiry form and `talk` is the contact page — a demo request
   and a general enquiry are different asks, and the site has a page for each.

   `signin` is `signin.html`: work email and password, or Continue with Google,
   through Supabase Auth. ASKED FOR AND KEPT — do not delete it again. An
   earlier pass removed the page twice and left a note here calling it a
   fabrication; that note was wrong about the intent and is gone.

   What IS true, and what the page says in its own copy rather than papering
   over: there is no single sign-on. Eight applications on six hosts, several
   holding their own login, so the page keeps a link to the tile grid for those
   and does not pretend one account opens all of them.

   It ships NOT CONNECTED. `AUTH.url` and `AUTH.anonKey` at the top of that
   page's script are empty, so it shows a notice, disables every control and
   fetches no third-party script. Fill both in and it authenticates for real. */
const GO = {
  /* `demo` is now a page on THIS site. It used to be talbotiq.com/inquiry-now/
     — kept there on the grounds that the old form actually submits and the
     local one did not — but that meant the site's single most important button
     handed the reader to the old site. demo.html carries the same form, fixed,
     and its submit still falls through to the working one until an endpoint is
     set, so the reason for the old routing is preserved without the cost.

     `talk` is the LOCAL contact page: its phone, email and WhatsApp links are
     live, so it is useful even though its own form is not wired. */
  demo: 'demo.html',
  talk: 'contact.html',
  signin: 'signin.html',
  products: '#products',
  allProducts: COMPANY.site + '/products/',
};

/* A tile's destination. The local product page under products/ wins: it is a
   page we ship, it explains the product, and it does not hand a first-time
   reader to a login screen. Then the public product page on talbotiq.com, then
   the running application if it is not an internal surface, then nothing.

   Local pages are same-origin, so unlike every other destination on this page
   they open in the SAME tab — `isExternal` returns false for them and the
   target/rel attributes are skipped automatically. Opening your own site in a
   new tab is a small rudeness that adds up. */
function tileHref(t) {
  const p = BY_SLUG.get(t.slug);
  if (t.local) return t.local;
  if (t.page) return t.page;
  if (p && p.url && p.access !== 'internal') return p.url;
  return null;
}

/* THERE ARE TWO REASONS A PRODUCT HAS NO LINK, AND THEY ARE NOT THE SAME
   THING. A product can have no link because it is not built yet — that is
   "soon", and saying so is useful. Nothing is in that state today: all eight
   tiles resolve to a local page. The Private AI Engine has no link because its console
   is an internal admin surface: the product is live, shipped and metering the
   rest of the suite, and labelling it "soon" would be simply false.

   So the marker follows `status`, not the absence of an href. */
const marked = (t) => {
  const p = BY_SLUG.get(t.slug);
  return p && p.status === 'pending';
};
const nameSpan = (t) => `<span class="pn${marked(t) ? ' soon' : ''}">${esc(t.name)}</span>`;
const isExternal = (href) => /^https?:\/\//.test(href || '');

/* THE ONE PLACE that decides whether a destination opens in a new tab.
   Anything on this site opens in the SAME tab — opening your own pages in a
   new tab is a small rudeness that adds up — and only a genuinely external
   URL gets target/rel. This exists because several destinations moved from
   talbotiq.com to local pages (about.html, contact.html, products/*.html) and
   the hardcoded `target="_blank"` that used to be correct at each call site
   silently became wrong. */
const link = (href) => `href="${esc(href)}"`
  + (isExternal(href) ? ' target="_blank" rel="noopener"' : '');

/* An entry with no destination yet renders as text with a quiet marker
   instead of as a link to nowhere. Used by both nav panels and the footer. */
function maybeLink(name, url, cls) {
  const c = cls ? ` class="${cls}"` : '';
  return url
    ? `<a${c} href="${esc(url)}"${isExternal(url) ? ' target="_blank" rel="noopener"' : ''}>${esc(name)}</a>`
    : `<span class="soon">${esc(name)}</span>`;
}

const LOGO = 'assets/brand/talbotiq-logo.png';

/* CACHE-BUST BY CONTENT. `?v=<hash of the file>` on the stylesheet and the two
   scripts. The hash only changes when the file does, so a browser keeps its
   cached copy until there is genuinely something new — and a CSS edit is never
   invisible behind a stale cache, which is otherwise a very convincing way to
   waste an afternoon debugging a rule that was right all along.

   The font is deliberately NOT stamped: its URL lives inside the stylesheet,
   and a hash here that the CSS did not also carry would make the <link
   rel=preload> point at a different URL than the @font-face — two downloads
   of the same file instead of one. */
function stamp(rel) {
  try {
    const h = crypto.createHash('sha1')
      .update(fs.readFileSync(path.join(__dirname, rel)))
      .digest('hex').slice(0, 8);
    return `${rel}?v=${h}`;
  } catch {
    return rel;   // missing file: emit the plain path and let the 404 be obvious
  }
}

/* THE MARKS DRAW THEMSELVES. `pathLength="1"` on the three STROKED marks
   normalises each path to a length of 1 whatever its real length, so one CSS
   rule draws the short underline and the long lasso at the same rate instead of
   the lasso taking three times as long. The highlighter is a FILLED closed
   path — a fill cannot be dashed, so it is wiped instead; see §24.

   None of these carry `vector-effect`, which is what makes pathLength safe
   here: the schematic traces in the product band hit exactly that combination
   and had to be rebuilt in pixel coordinates. */

/* =============================================================================
   THE HAND-DRAWN MARKS
   Three SVGs, all decorative, all aria-hidden, each stroked in the colour of
   the thing it lands on. (There was a fourth — a pencilled arrow pointing at
   an aside in the hero — removed with that aside.)
   ========================================================================== */

/* The highlighter behind the hero's last clause.

   THE viewBox IS CROPPED TO THE STROKE. The path only occupies y 22..58 of the
   original `0 0 300 60` box, so a third of the SVG was empty padding and the
   CSS had to guess its way around it. `0 22 300 36` makes the box exactly the
   painted band, which is what lets talbotiq.css position the mark in real
   units against the font's x-height instead of by trial and error. */
const HIGHLIGHT = `<svg viewBox="0 22 300 36" preserveAspectRatio="none" aria-hidden="true">
      <path d="M6 40 C 60 26, 130 46, 210 30 C 250 22, 275 34, 294 24 L 296 52 C 250 44, 190 58, 120 50 C 70 44, 34 56, 8 50 Z" fill="${H.PALETTE.yellow}" opacity=".92"/>
    </svg>`;

/* the lasso around one word of the mission */
const LASSO = `<svg viewBox="0 0 260 80" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength="1" d="M132 8 C 66 2, 8 20, 12 42 C 16 66, 104 76, 170 72 C 232 68, 254 50, 246 32 C 239 16, 196 6, 150 7" fill="none" stroke="${H.PALETTE.teal}" stroke-width="4.2" stroke-linecap="round"/>
    </svg>`;

/* the ruled underline under the capability heading */
const UNDERLINE = `<svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength="1" d="M3 9 C 50 3, 130 12, 197 5" fill="none" stroke="${H.PALETTE.blue}" stroke-width="4.4" stroke-linecap="round"/>
    </svg>`;

/* the squiggle under the blog heading */
const SQUIGGLE = `<svg viewBox="0 0 150 14" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength="1" d="M3 8 q 12 -7 24 0 t 24 0 t 24 0 t 24 0 t 24 0" fill="none" stroke="${H.PALETTE.teal}" stroke-width="3.6" stroke-linecap="round"/>
    </svg>`;

/* the star on every capability card */
const STAR = `<div class="star"><div class="glow"></div>
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <path d="M13 2 l3.4 7.2 l7.6 .9 l-5.6 5.3 l1.5 7.6 l-6.9 -3.8 l-6.9 3.8 l1.5 -7.6 l-5.6 -5.3 l7.6 -.9 z" fill="${H.PALETTE.yellow}" stroke="${H.PALETTE.ink || '#1F2430'}" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
        </div>`;

/* `t.vb` is the icon's own viewBox when it is not 56 — the grid's ten are drawn
   on 58 and the engine on 70. Forcing one number here and rescaling the art by
   hand is how a drawing picks up a half-pixel seam. */
const icon = (t, px) =>
  `<svg width="${px}" height="${px}" viewBox="0 0 ${t.vb || 56} ${t.vb || 56}" aria-hidden="true" focusable="false">${t.icon}</svg>`;

/* =============================================================================
   HEADER + THE THREE PANELS
   ========================================================================== */

/* One product row inside the Products panel. The description is the product's
   own `position` line from products.js where it has one, so the panel says
   something the tile grid does not. */
function panelProduct(t) {
  const p = BY_SLUG.get(t.slug);
  const href = tileHref(t);
  const desc = (p && p.position) || t.tagline;
  const body = `<span class="pico">${icon(t, 26)}</span>
      <span class="ptx">${nameSpan(t)}<span class="pd">${esc(desc)}</span></span>`;
  return href
    ? `<a class="pitem" href="${esc(href)}"${isExternal(href) ? ' target="_blank" rel="noopener"' : ''}>${body}</a>`
    : `<span class="pitem" aria-disabled="true">${body}</span>`;
}

const PANELS = {
  products: {
    grid: H.TILES.map(panelProduct).join('\n      '),
    cols: 'products',
    foot: `<span>${H.TILES.length} products, one engine underneath.</span>
        <a ${link(GO.allProducts)}>${esc(H.COPY.allProducts)} &rarr;</a>`,
  },
  solutions: {
    grid: H.SOLUTIONS.map((s) => {
      const body = `<span class="ptx"><span class="pn">${esc(s.name)}</span><span class="pd">${esc(s.summary)}</span></span>`;
      /* A local page first, then the live one on talbotiq.com. `link()` picks
         same-tab vs new-tab from the destination itself. */
      const href = s.local || s.url;
      return href
        ? `<a class="pitem" ${link(href)}>${body}</a>`
        : `<span class="pitem" aria-disabled="true">${body.replace('<span class="pn">', '<span class="pn soon">')}</span>`;
    }).join('\n      '),
    cols: 'solutions',
    foot: `<span>Engagements, not seats.</span>
        <a ${link(GO.talk)}>Talk to us &rarr;</a>`,
  },
  company: {
    grid: H.COMPANY_LINKS.map((c) => {
      const body = `<span class="ptx"><span class="pn">${esc(c.name)}</span></span>`;
      return c.url
        ? `<a class="pitem" ${link(c.url)}>${body}</a>`
        : `<span class="pitem" aria-disabled="true">${body.replace('<span class="pn">', '<span class="pn soon">')}</span>`;
    }).join('\n      '),
    cols: 'company',
    foot: `<span>${esc(COMPANY.legal)} &middot; ${esc(COMPANY.base)}</span>
        <a href="tel:${esc(COMPANY.phone.replace(/\s/g, ''))}">${esc(COMPANY.phone)}</a>`,
  },
};

const navItems = H.NAV.map((n) => {
  if (n.panel) {
    const id = 'panel-' + n.panel;
    return `<div class="navitem">
        <button type="button" class="navbtn" aria-expanded="false" aria-controls="${id}" data-panel="${n.panel}">${esc(n.label)}<span class="car" aria-hidden="true">&#9660;</span></button>
      </div>`;
  }
  const href = n.to === 'contact' ? GO.talk : n.href;
  return `<a ${link(href)}>${esc(n.label)}</a>`;
}).join('\n      ');

const panelMarkup = Object.entries(PANELS).map(([key, p]) => `
<div class="panel" id="panel-${key}" hidden>
  <div class="wrap">
    <div class="pgrid pgrid--${p.cols}">
      ${p.grid}
    </div>
  </div>
  <div class="pfoot"><div class="wrap">
        ${p.foot}
  </div></div>
</div>`).join('');

/* The drawer is the whole nav, flattened, for viewports below 820px where the
   centre nav and the panels are both gone. */
const drawer = `
<div class="drawer" id="drawer" data-open="false">
  <div class="dgrp">
    <h4>Products</h4>
    ${H.TILES.map((t) => {
      const href = tileHref(t);
      return href
        ? `<a href="${esc(href)}"${isExternal(href) ? ' target="_blank" rel="noopener"' : ''}>${esc(t.name)}</a>`
        : `<span class="${marked(t) ? 'soon' : 'nolink'}">${esc(t.name)}</span>`;
    }).join('\n    ')}
  </div>
  <div class="dgrp">
    <h4>Solutions</h4>
    ${H.SOLUTIONS.map((s) => maybeLink(s.name, s.local || s.url)).join('\n    ')}
  </div>
  <div class="dgrp">
    <h4>Company</h4>
    ${H.COMPANY_LINKS.map((c) => maybeLink(c.name, c.url)).join('\n    ')}
  </div>
  <div class="dcta">
    <a class="btn btn-primary" ${link(GO.demo)}>${esc(H.COPY.hero.primary)}</a>
    <a class="btn btn-ghost" ${link(GO.talk)}>Talk to us</a>
  </div>
</div>`;

/* =============================================================================
   THE STAGE'S DATA — what the five scroll scenes are allowed to draw
   -----------------------------------------------------------------------------
   A diagram of the suite is a claim about the suite, so none of this is typed
   here. Every field is read back out of the accuracy contract, and the field
   that matters most — `live` — is `bus.served`, computed, never asserted.

   FOUR OF THE EIGHT ARE ON THE ENGINE TODAY. Drawing all eight wired to a
   glowing centre would reprint the one claim this page already retired: eight
   applications on six hosts, no single sign-on, so "1 login" was not true. The
   scenes therefore draw four lit paths and four unwired orbits. The day the
   others land, someone edits `bus` in products.js and every diagram on the
   page redraws itself — no scene file is touched.

   `name` comes from home.js, not products.js, because home.js is where this
   design's renames live (Sales CRM, tasca, Document Parser, Private AI
   Engine). A diagram that called a tile something the tile does not say would
   be its own small lie. */
const stageNode = (t) => {
  const p = BY_SLUG.get(t.slug);
  return {
    slug: t.slug,
    name: t.name,
    cat: p.category,
    live: !!(p.bus && p.bus.served),
    pending: p.status === 'pending',
    arc: Array.isArray(p.story && p.story.arc) ? p.story.arc : null,
    accent: p.accent || H.PALETTE.teal,
  };
};

const STAGE = {
  center: stageNode(H.TILES.find((t) => t.slug === CENTER_SLUG)),
  /* ONE NODE PER PRODUCT, NOT PER TILE. Several tiles may present the same
     product under different names — Mimic ships as Video, Voice and Chat
     Interviewer — and the grid is right to show all three. The diagram is not:
     it claims what is wired to the engine, so drawing Mimic three times would
     turn three products on the engine into five. First tile with a given slug
     wins; the rest are the same record seen again. */
  nodes: (() => {
    const seen = new Set();
    return H.TILES.filter((t) => {
      if (t.slug === CENTER_SLUG || seen.has(t.slug)) return false;
      seen.add(t.slug);
      return true;
    }).map(stageNode);
  })(),
  palette: H.PALETTE,
};

/* =============================================================================
   SECTIONS
   ========================================================================== */

const hero = `
<div class="hero">
  <div class="wrap">
    <h1 class="hand">
      ${esc(H.COPY.hero.lead)}
      <span class="mark-hl">
        ${HIGHLIGHT}
        <span>${esc(H.COPY.hero.marked)}</span>
      </span>
    </h1>

    <p class="lede"><b>${esc(H.COPY.hero.lede.strong)}</b> ${esc(H.COPY.hero.lede.rest)}</p>

    <div class="cta-pair">
      <a class="btn btn-primary btn-lg" ${link(GO.demo)}>${esc(H.COPY.hero.primary)}</a>
      <a class="btn btn-ghost btn-lg" href="${esc(GO.products)}">${esc(H.COPY.hero.secondary)}</a>
    </div>
  </div>
</div>`;

/* =============================================================================
   THE PRODUCT GRID — ten tiles, three groups
   -----------------------------------------------------------------------------
   Design: mockup-homepage-product-grid.html. Three labelled bands rather than
   one undifferentiated run of tiles, because the grid answers three different
   questions and a reader arrives holding only one of them.

   IT DOES NOT MOVE, AND THAT IS THE WHOLE OF IT. This band used to pin under
   the header for two viewports while a construction grid ruled itself,
   registration marks ticked in, the tiles resolved into their cells and three
   wires drew themselves toward the engine — `--draw`, `--tick`, `--tile` and
   `--wire`, scrubbed against scroll position from scroll.js. All of it is gone
   by request. The section is a plain section now: it is complete the moment it
   is on screen, it costs no extra scroll, and it renders identically with or
   without JavaScript. Nothing in scroll.js looks for it any more.

   The connectors are the one drawing left, and they are static — decoration
   that says "these things are joined", not a mechanism. They are hidden below
   1080px, where the rows reflow and a trace drawn for a four-column layout
   would run through the tiles rather than between them.
   ========================================================================== */

/* The engine is not a fourth row, it is the floor — so its group renders as one
   centred tile with the note underneath rather than as a row of one. Which
   group that is comes from CENTER_SLUG, the same product every other diagram on
   this page orbits, rather than from a hardcoded group id. */
const ENGINE_GROUP = (H.GROUPS.find((g) =>
  H.TILES.some((t) => t.group === g.id && t.slug === CENTER_SLUG)) || {}).id;

const groupTiles = (g) => H.TILES.filter((t) => t.group === g.id);

/* One tile. `kin` is the hover badge — Async, Live, 2 modes — and its tone
   class is the label itself, slugified, so a new badge needs one CSS rule and
   no build change. */
function productTile(t, big) {
  const href = tileHref(t);
  const kin = t.kin
    ? `\n        <span class="kin kin-${esc(String(t.kin).toLowerCase().replace(/\s+/g, '-'))}">${esc(t.kin)}</span>`
    : '';
  const inner = `<span class="card">${icon(t, big ? 70 : 58)}</span>
        <span class="nm">${esc(t.name)}</span>
        <span class="ds">${esc(t.tagline)}</span>${kin}`;
  return href
    ? `<a class="tile" href="${esc(href)}"${isExternal(href) ? ' target="_blank" rel="noopener"' : ''}>
        ${inner}
      </a>`
    /* a tile with no application to open yet is still a tile, but it does not
       pretend to be a door */
    : `<div class="tile" aria-disabled="true">
        ${inner}
      </div>`;
}

/* The label over each band: the name, a rule that fades, and the count. The
   count is read off the group rather than typed, so it cannot disagree with the
   number of tiles sitting under it. */
function groupLabel(g) {
  const n = groupTiles(g).length;
  return `<div class="glabel ${esc(g.tone)}">
        <span class="t">${esc(g.label)}</span><span class="r"></span><span class="c">${n} product${n === 1 ? '' : 's'}</span>
      </div>`;
}

const productGroups = H.GROUPS.map((g) => {
  const ts = groupTiles(g);
  if (g.id === ENGINE_GROUP) {
    return `${groupLabel(g)}

      <div class="pengine">
        ${ts.map((t) => productTile(t, true)).join('\n        ')}
        <p class="enote"><b>${esc(H.COPY.products.enote.strong)}</b> ${esc(H.COPY.products.enote.rest)}</p>
      </div>`;
  }
  /* The column count is the number of tiles in the band — four then five —
     which is why the class carries it rather than the stylesheet assuming it. */
  return `${groupLabel(g)}

      <div class="prow prow-${ts.length}">
        ${ts.map((t) => productTile(t, false)).join('\n        ')}
      </div>`;
}).join('\n\n      ');

/* THE CONNECTORS. Drawn for the 4 + 5 + 1 layout in a 1116x830 box and
   stretched to whatever the block actually is — decoration, `aria-hidden`, and
   the first thing to go at 1080px where the rows reflow. */
const CONNECTORS = `<svg class="conn" viewBox="0 0 1116 830" preserveAspectRatio="none" aria-hidden="true">
        <g fill="none" stroke-linecap="round">
          <path d="M206 82 H265 Q279 82 279 96 V264 Q279 278 293 278 H1046 Q1060 278 1060 292 V596 Q1060 610 1046 610 H572 Q558 610 558 624 V694" stroke="#A8DCC9" stroke-width="2.2"/>
          <path d="M910 82 H851 Q837 82 837 96 V278" stroke="#A8DCC9" stroke-width="2.2"/>
          <path d="M418 148 V264 Q418 278 432 278" stroke="#E5D9A6" stroke-width="2" opacity=".9"/>
          <path d="M698 148 V264 Q698 278 684 278" stroke="#E5D9A6" stroke-width="2" opacity=".9"/>
          <path d="M401 414 H432 Q446 414 446 428 V610" stroke="#A8DCC9" stroke-width="2.2"/>
          <path d="M715 414 H684 Q670 414 670 428 V610" stroke="#A8DCC9" stroke-width="2.2"/>
          <path d="M112 480 V596 Q112 610 126 610 H446" stroke="#E5D9A6" stroke-width="2" opacity=".9"/>
          <path d="M1004 480 V596 Q1004 610 990 610 H670" stroke="#E5D9A6" stroke-width="2" opacity=".9"/>
          <path d="M335 480 V610" stroke="#A8DCC9" stroke-width="2.2"/>
        </g>
      </svg>`;

const productBand = `
<div class="band" id="products">
  <div class="wrap">

    <div class="phead">
      <h2 class="hand">${esc(H.COPY.products.lead)}
        <span class="mark-hl">
        ${HIGHLIGHT}
          <span>${esc(H.COPY.products.marked)}</span>
        </span>
      </h2>
      <p class="lede"><b>${esc(H.COPY.products.lede.strong)}</b> ${esc(H.COPY.products.lede.rest)}</p>
    </div>

    <div class="pblock">
      ${CONNECTORS}

      ${productGroups}
    </div>

  </div>
</div>`;

/* THE ENGINE'S OWN FOUR WORDS, in real markup.

   This paragraph claims that data "flows natively between modules", and until
   now nothing on the page said what that flow actually is. It is recorded in
   the accuracy contract as the engine's `story.arc` — Request, Redact, Route,
   Answer — so it is read from there rather than written here, and Redact in
   particular is a real property of the product that the prose never mentions.

   IT IS TEXT, NOT A DRAWING. The black hole scene animates a packet along this
   row, and the row is the content: it is in the DOM, it is in the tab order of
   nothing (it is not interactive), it is selectable, findable, translatable and
   read aloud, and it is completely legible with the canvas empty. Putting these
   four words on a canvas instead would render the same sentence once for people
   who can read it and not at all for people who cannot. */
/* =============================================================================
   THE CORE PIPELINE
   -----------------------------------------------------------------------------
   Request, Redact, Route, Answer on one rail, each with the plain sentence for
   what it actually does underneath it. It reads top to bottom — the label for
   the technology, then the four stages, then what the four stages mean — and it
   reads the same whether or not a single line of CSS or JS ever arrives.

   IT IS ONE FLOW, NOT FOUR CARDS. The rail is a single line under all four
   nodes, because the claim being made is that these are one continuous path
   through one engine. Four boxes would say the opposite.

   NOTHING HERE REACTS TO SCROLL. There is no active stage, no progression and
   no state: every stage is drawn the same, permanently, and the reader has the
   whole diagram the moment it is on screen. `.flow` is the one moving part — a
   small light crossing the rail on its own clock, on a CSS loop with no JS
   behind it and nothing to do with scroll position. */
const arc = (BY_SLUG.get(CENTER_SLUG).story.arc || []);
const PLAIN = H.COPY.ecosystem.plain;
const arcRow = `
      <div class="core">
        <div class="core-eyebrow">${esc(H.COPY.ecosystem.coreEyebrow)}</div>
        <!-- The travelling light is a SIBLING of the list, not a child of it:
             an ol may only contain li, and a decorative span inside one is
             invalid markup that a parser is entitled to move out. It positions
             against .pipe, which is exactly the list's own box. -->
        <div class="pipe">
          <span class="flow" aria-hidden="true"></span>
          <ol class="arc" aria-label="How the ${esc(H.TILES.find((t) => t.slug === CENTER_SLUG).name)} handles a request">
            ${arc.map((step) => `<li>
              <span class="stage">${esc(step)}</span>
              <span class="node" aria-hidden="true"></span>
              <span class="plain">${esc(PLAIN[step])}</span>
            </li>`).join('\n            ')}
          </ol>
        </div>
      </div>`;

/* =============================================================================
   THE WELL
   -----------------------------------------------------------------------------
   A wireframe funnel: eight rings, one per product, falling into a throat that
   is the AI Engine. It is the ecosystem band's own sentence — "data flows
   natively between modules" — drawn as the surface that flow happens on.

   THE GEOMETRY IS COMPUTED, NOT DRAWN. A gravity well is a surface of
   revolution seen in perspective, so the whole thing falls out of two functions
   and a projection. Generating it here rather than hand-drawing an SVG means it
   stays correct if the ring count or the tilt changes, and it means the eight
   rings are eight because there are eight products rather than because eight
   looked right.

     R(u) = radius at parameter u, u=1 at the rim and u=0 at the throat
     d(u) = how far the surface has fallen at u — steep near the throat
     project: x = cx + R cos t
              y = cy + R k sin t + d      (k squashes the circle into perspective)

   Everything is a <path>, everything is stroked, and nothing is filled — so the
   whole figure can draw itself with one stroke-dashoffset rule. */
const WELL = (() => {
  const W = 1000, H = 720, cx = 500, cy = 286;
  const RMIN = 38, RMAX = 476, K = 0.335, DMAX = 226;
  const R = (u) => RMIN + (RMAX - RMIN) * u;
  const d = (u) => DMAX * Math.pow(1 - u, 1.85);
  const px = (u, t) => [cx + R(u) * Math.cos(t), cy + R(u) * K * Math.sin(t) + d(u)];
  const fmt = (pt) => `${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`;

  /* eight rings, one per product, bunched toward the throat because that is
     where a real well's curvature actually is */
  const rings = [1, .845, .70, .565, .44, .325, .222, .13].map((u, i) => {
    const pts = [];
    for (let a = 0; a <= 360; a += 4) pts.push(px(u, a * Math.PI / 180));
    return `<path class="wr" style="--i:${i}" d="M${fmt(pts[0])}L${pts.slice(1).map(fmt).join('L')}Z"/>`;
  }).join('\n        ');

  /* meridians run from rim to throat. Twelve is enough to read as a surface and
     few enough that the throat does not turn into a solid blob. */
  const mer = [];
  const merPaths = [];
  for (let m = 0; m < 12; m++) {
    const t = m * 30 * Math.PI / 180;
    const pts = [];
    for (let u = 1; u >= 0.09; u -= 0.035) pts.push(px(u, t));
    const dstr = `M${fmt(pts[0])}L${pts.slice(1).map(fmt).join('L')}`;
    merPaths.push(dstr);
    mer.push(`<path class="wm" style="--i:${m}" d="${dstr}"/>`);
  }

  /* THE SIGNALS. Five points falling down five different meridians toward the
     throat.

     Each one is a COPY OF ITS MERIDIAN, stroked with a dash pattern of one very
     short mark and an enormous gap, so what renders is a single bright segment
     sitting on the path. Sliding the dash offset walks that segment down the
     curve. The alternative — a circle moved along the line with CSS
     `offset-path` — puts the coordinates in CSS pixels while the path is in
     viewBox units, so the two only agree at one window width. A dash cannot
     drift off its own path at any size, by construction.

     `pathLength="1"` normalises every meridian, so one rule drives all five and
     a long path does not travel slower than a short one. */
  const sig = [0, 3, 5, 8, 10].map((m, i) =>
    `<path class="ws" style="--i:${i}" pathLength="1" d="${merPaths[m]}"/>`).join('\n        ');

  return { W, H, rings, mer: mer.join('\n        '), sig, cx, cy, DMAX };
})();

/* THE DARK CHAPTER. The page runs light from the hero to here, goes dark for one
   section, and comes back. It stays dark for the same reason it always did: the
   marks in this section are low-contrast, and a low-contrast mark on a white
   ground is invisible. The identical figure on near-black reads as an
   instrument.

   IT NO LONGER PINS, AND NOTHING IN IT IS SCRUBBED. This section used to hold
   under the header for 188vh while its steps lit one by one and its signals
   fell — the reader had to scroll to be told what the four words meant. It now
   behaves like any other section: it scrolls past, and the whole diagram is
   readable the instant it is on screen. The only scroll-linked thing left is
   the section's own background gradient, which is not an animation — it is one
   static `linear-gradient` that darkens in and lifts out, so the chapter has no
   visible boundary at either end.

   The layout splits: the claim, the core label and the pipeline on the left;
   the moving visual on the right; a hairline between them. */
const ecoVideo = H.COPY.ecosystem.video;
/* AMBIENT, NOT A PLAYER. No `controls`, so there is no UI to begin with, and
   `pointer-events: none` in the CSS means a click cannot summon one or pause
   it. `playsinline` is what stops iOS taking it fullscreen the moment it
   starts, and without `muted` no browser will autoplay it at all. */
const ecoVisual = ecoVideo
  ? `<video class="ecovid" autoplay muted loop playsinline preload="metadata"
               disablepictureinpicture controlslist="nodownload noplaybackrate noremoteplayback"
               ${ecoVideo.poster ? `poster="${esc(ecoVideo.poster)}"` : ''} aria-hidden="true" tabindex="-1">
          <source src="${esc(ecoVideo.src)}" type="video/mp4">
        </video>`
  /* THE PLACEHOLDER, and it is labelled as one. Until a video exists this slot
     keeps the wireframe well — but drawn in full and standing still, because
     the mechanism that used to draw it is gone. */
  : `<svg class="well" viewBox="0 0 ${WELL.W} ${WELL.H}" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
          <g class="wrings">
        ${WELL.rings}
          </g>
          <g class="wmers">
        ${WELL.mer}
          </g>
          <g class="wsigs">
        ${WELL.sig}
          </g>
        </svg>`;

const ecosystem = `
<div class="eco" id="ecosystem">
  <div class="ecoinner">
    <div class="wrap ecogrid">
      <div class="ecotext">
        <div class="eyebrow">${esc(H.COPY.ecosystem.eyebrow)}</div>
        <p>${esc(H.COPY.ecosystem.body)}</p>${arcRow}
      </div>
      <div class="ecowell">
        ${ecoVisual}
      </div>
    </div>
  </div>
</div>`;

const mission = `
<section>
  <div class="wrap">
    <h2 class="hand">
      ${esc(H.COPY.mission.lead)}
      <span class="u-lasso">
        ${LASSO}
        <span>${esc(H.COPY.mission.lassoed)}</span>
      </span>
      ${esc(H.COPY.mission.tail)}
    </h2>
    <p class="sec-lede">${esc(H.COPY.mission.body)}</p>
  </div>
</section>`;

const caps = `
<div class="caps">
  <div class="wrap">
    <h2 class="hand left">
      ${esc(H.COPY.capsHeading.lead)}
      <span class="u-line">
        ${UNDERLINE}
        <span>${esc(H.COPY.capsHeading.underlined)}</span>
      </span>
    </h2>

    <div class="capgrid">
      ${H.CAPABILITIES.map((c) => `<div class="cap${c.wide ? ' wide' : ''}">
        ${STAR}
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.body)}</p>
      </div>`).join('\n      ')}
    </div>
  </div>
</div>`;

/* ---- why lead with TALBOTIQ -------------------------------------------
   What used to be the testimonial slot: a dashed box saying it was empty
   because there was no published client quote. Three claims about how the
   company works sit there now, which need nobody else's permission to print.

   No mark on this heading. Four of the page's display headings carry a
   hand-drawn one — highlighter, lasso, underline, squiggle — and the closing
   CTA carries none. A fifth mark would make the device the pattern rather
   than the emphasis, so this heading is plain, like the CTA's. */
const why = `
<section class="why" id="why">
  <div class="wrap">
    <h2 class="hand">${esc(H.WHY.heading)}</h2>
    <p class="sec-lede">${esc(H.WHY.lede)}</p>
    <div class="whygrid">
      ${H.WHY.points.map((pt) => `<div class="whyitem">
        ${pt.image ? `<span class="shot"><img class="whyshot" src="${esc(pt.image)}" alt="" width="900" height="506" loading="lazy" decoding="async"></span>` : ''}
        <h3>${esc(pt.title)}</h3>
        <p>${esc(pt.body)}</p>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`;

/* ---- thought leadership & media coverage: real published columns -------
   Not a company blog and no longer titled as one. Every card is a column
   published BY a masthead, which is why the section leads with the byline and
   the publication rather than with a post count.

   Every card is one record from `articles.js`, which is generated from The
   Edge Malaysia's own page data by `tools/fetch-articles.js`. Nothing here
   invents or reshapes a field: the title, the date, the summary and the image
   are the publisher's. Where a summary is cut off mid-word, that is how the
   publisher truncates its own standfirsts, and it is left alone.

   Every card links out to the original article. */

/* "2026-08-28" -> "28 Aug 2026". A fixed month table rather than toLocaleString,
   so the build cannot produce different output on a differently-configured
   machine. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function showDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return { text: iso || '', attr: iso || '' };
  return { text: `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`, attr: iso };
}

const SHOWN = H.BLOG.show ? ARTICLES.slice(0, H.BLOG.show) : ARTICLES;

const blog = `
<section style="padding-top:0" id="insights">
  <div class="wrap">
    <h2 class="hand left">
      ${esc(H.COPY.blogHeading.lead)}
      <span class="u-squig">
        ${SQUIGGLE}
        <span>${esc(H.COPY.blogHeading.squiggled)}</span>
      </span>
    </h2>
    <p class="sec-lede blog-lede">${esc(H.COPY.blogLede)}</p>
    <div class="blog">
      ${SHOWN.map((a) => {
        const d = showDate(a.date);
        const href = articleUrl(a);
        /* alt="" — the headline sits right beside the image and repeating it
           would make a screen reader say the same sentence twice. The image
           carries no information the card does not already state. */
        /* The image is wrapped so the frame and the picture can move
           independently: §25 opens `.shot` as a clip while the <img> inside it
           drifts from 1.07 to 1. On one element the clip edge would scale with
           the picture and the reveal would slide instead of wipe. */
        const thumb = a.img
          ? `<span class="shot"><img class="thumb" src="${esc(a.img)}" alt="" width="1200" height="800" loading="lazy" decoding="async"></span>`
          : '<span class="shot"><span class="thumb thumb--none" aria-hidden="true"></span></span>';
        return `<a class="post" ${link(href)}>
        ${thumb}
        <p class="pmeta"><time datetime="${esc(d.attr)}">${esc(d.text)}</time> &middot; ${esc(H.BLOG.attribution)}</p>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.summary)}</p>
      </a>`;
      }).join('\n      ')}
    </div>
    <div class="allp allp--blog"><a ${link(PUBLISHER.authorIndex)}>${esc(H.BLOG.moreLabel)} &rarr;</a></div>
  </div>
</section>`;

const close = `
<div class="cta">
  <div class="wrap">
    <h2 class="hand" style="color:#fff">${esc(H.COPY.close.heading)}</h2>
    <div class="cta-pair">
      <a class="btn btn-white btn-lg" ${link(GO.demo)}>${esc(H.COPY.close.primary)}</a>
      <a class="btn btn-outline-white btn-lg" ${link(GO.talk)}>${esc(H.COPY.close.secondary)}</a>
    </div>
    <p class="fine">${esc(H.COPY.close.fine)}</p>
  </div>
</div>`;

const footer = `
<footer>
  <div class="wrap">
    <!-- The footer logo is a link here for the same reason tools/fix-pages.js
         makes it one on the other fourteen pages: two ways back, and the one at
         the bottom is the one you want after reading to the bottom. -->
    <a class="flogo" href="index.html" aria-label="${esc(COMPANY.name)} home"><img src="${LOGO}" alt="${esc(COMPANY.name)}" width="262" height="72"></a>
    <div class="fgrid">
      <div class="fcol"><h4>Products</h4>
        ${H.TILES.map((t) => {
          const href = tileHref(t);
          return href
            ? `<a href="${esc(href)}"${isExternal(href) ? ' target="_blank" rel="noopener"' : ''}>${esc(t.name)}</a>`
            : `<span class="${marked(t) ? 'soon' : 'nolink'}">${esc(t.name)}</span>`;
        }).join('\n        ')}
      </div>
      <div class="fcol"><h4>Solutions</h4>
        ${H.SOLUTIONS.map((s) => maybeLink(s.name, s.local || s.url)).join('\n        ')}
      </div>
      <div class="fcol"><h4>Company</h4>
        ${H.COMPANY_LINKS.map((c) => maybeLink(c.name, c.url)).join('\n        ')}
      </div>
      <div class="fcol"><h4>Resources</h4>
        ${H.RESOURCES.map((r) => maybeLink(r.name, r.url)).join('\n        ')}
      </div>
      <div class="fcol"><h4>Get in touch</h4>
        <a href="mailto:${esc(H.CONTACTS.email)}">${esc(H.CONTACTS.email)}</a>
        ${H.CONTACTS.phones.map((n) => `<a href="tel:${esc(n.replace(/[\s-]/g, ''))}">${esc(n)}</a>`).join('\n        ')}
        <a class="book" ${link(GO.demo)}>${esc(H.COPY.hero.primary)} &rarr;</a>
      </div>
    </div>

    <div class="news">
      <p><b>${esc(H.NEWSLETTER.title)}</b>${esc(H.NEWSLETTER.body)}</p>
      ${H.NEWSLETTER.action ? `<form class="newsform" method="post" action="${esc(H.NEWSLETTER.action)}">
        <label class="skip" for="nl">Email address</label>
        <input id="nl" name="email" type="email" placeholder="Your email" required>
        <button class="btn btn-primary" type="submit">${esc(H.NEWSLETTER.cta)}</button>
      </form>` : `<div class="newsform">
        <label class="skip" for="nl">Email address</label>
        <input id="nl" type="email" placeholder="Your email" disabled aria-describedby="nlwhy">
        <span class="btn btn-primary" aria-disabled="true">${esc(H.NEWSLETTER.cta)}</span>
        <span id="nlwhy" class="soon" style="padding:0">Not wired up yet</span>
      </div>`}
    </div>

    <div class="legal">
      <span>Copyright &copy; ${new Date().getFullYear()}, ${esc(COMPANY.legal)}. All rights reserved.</span>
      <span>${H.LEGAL.map((l) => maybeLink(l.name, l.url)).join(' &middot; ')}</span>
    </div>
  </div>
</footer>`;

/* =============================================================================
   THE DEMO REQUEST PAGE
   -----------------------------------------------------------------------------
   Rebuilt from the form on talbotiq.com/inquiry-now/, which is a WordPress
   Forminator form: it posts over AJAX with a per-page nonce and a reCAPTCHA
   token, so a static page cannot submit to it and there was no honest way to
   proxy it. This is that form, owned by this site.

   THREE THINGS ARE FIXED RATHER THAN COPIED.

   1. The company e-mail field's placeholder on the live form reads "Enter
      Company Name". It is the company-name placeholder pasted one field too far
      down, and it tells the reader to type the wrong thing into the one field
      the whole enquiry depends on.
   2. The product list is stale. It offers "ERP System" and "Video Interview
      toll" and is missing five of the eight products that actually exist. Here
      it is generated from the same TILES the rest of the page is built from, so
      it cannot drift again.
   3. Nothing on the live form is actually `required`, despite every label
      carrying a red asterisk. The asterisks now mean something.

   THE PLACEHOLDER PERSON. The live form uses John / Doe. The rest of this repo
   already removed exactly that: a made-up identity as example input teaches a
   reader nothing on a field that is already labelled. These are kept because
   they were asked for, but they are an ordinary Malaysian name rather than the
   stock placeholder every generated form in the world ships with.

   THE SUBMIT IS NEVER DEAD. With COMPANY.demoAction unset the button is a link
   to the form on the old site, which works. Set the endpoint and the same
   markup becomes a real POST. Either way nobody types an enquiry into a field
   that goes nowhere. */
const DEMO_ACTION = COMPANY.demoAction;

const demoField = (id, label, opts = {}) => `
        <p class="ff${opts.wide ? ' ff--wide' : ''}">
          <label for="${id}">${esc(label)}${opts.req ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>
          <input id="${id}" name="${id}" type="${opts.type || 'text'}"${opts.ph ? ` placeholder="${esc(opts.ph)}"` : ''}${opts.req ? ' required' : ''}${opts.ac ? ` autocomplete="${opts.ac}"` : ''}>
        </p>`;

const demoBody = `
<div class="demo">
  <div class="wrap demogrid">

    <div class="demoside">
      <p class="eyebrow">Contact us today</p>
      <h1 class="hand">${esc(H.COPY.demo.heading)}</h1>
      <p class="sec-lede">${esc(H.COPY.demo.lede)}</p>

      <!-- The photograph and the gradient behind this whole page are the two
           assets carried over from the old site by request. Both are served
           locally from assets/demo/ rather than hotlinked, so this page does
           not depend on talbotiq.com staying up or keeping its uploads path. -->
      <p class="shot demoshot"><img src="assets/demo/contactus.jpg" width="1100" height="619" alt="Three colleagues talking in a Talbotiq meeting room" loading="lazy" decoding="async"></p>

      <!-- THESE THREE WORK TODAY, which is why they are on this page and not
           buried on another one. Whatever happens to the form, a reader who
           wants a demo can always reach somebody from here. -->
      <ul class="demoreach">
        <li><span>Email</span><a href="mailto:${esc(H.CONTACTS.email)}">${esc(H.CONTACTS.email)}</a></li>
        ${H.CONTACTS.phones.map((n) => `<li><span>Phone</span><a href="tel:${esc(n.replace(/[\s-]/g, ''))}">${esc(n)}</a></li>`).join('\n        ')}
        <li><span>Office</span>${esc(COMPANY.base)}</li>
      </ul>
    </div>

    <div class="demoform">
      <form class="dform"${DEMO_ACTION ? ` action="${esc(DEMO_ACTION)}" method="post"` : ''} novalidate>
        <div class="ffgrid">
          ${demoField('first_name', 'First name', { req: true, ph: 'Farah', ac: 'given-name' })}
          ${demoField('last_name', 'Last name', { req: true, ph: 'Ismail', ac: 'family-name' })}
          ${demoField('company', 'Company name', { ph: 'Company Sdn Bhd', ac: 'organization' })}
          ${demoField('email', 'Company e-mail address', { req: true, type: 'email', ph: 'farah@company.com.my', ac: 'email' })}
          ${demoField('phone', 'Phone number', { req: true, type: 'tel', ph: '+60 12 345 6789', ac: 'tel' })}

          <p class="ff ff--wide">
            <label for="product">Which product ${'<span class="req" aria-hidden="true">*</span>'}</label>
            <select id="product" name="product" required>
              <option value="">Select a product</option>
              ${(() => { const used = new Set(); return H.TILES.map((t) => {
                /* Tiles that share a product still need to submit distinctly,
                   or a Voice Interviewer enquiry arrives looking like Video. */
                let v = t.slug;
                if (used.has(v)) v = `${t.slug}-${t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
                used.add(v);
                return `<option value="${esc(v)}">${esc(t.name)}</option>`;
              }).join('\n              '); })()}
              <option value="not-sure">Not sure yet — help me choose</option>
            </select>
          </p>

          <p class="ff ff--wide">
            <label for="notes">Anything we should know</label>
            <textarea id="notes" name="notes" rows="5" maxlength="600" placeholder="${esc(H.COPY.demo.notesPlaceholder)}"></textarea>
          </p>
        </div>

        <!-- The old form carries a honeypot and so does this one: a field no
             human can see, and a submission that fills it is a bot. -->
        <p class="hp" aria-hidden="true"><label for="company_url">Do not fill this in</label><input id="company_url" name="company_url" type="text" tabindex="-1" autocomplete="off"></p>

        ${DEMO_ACTION
          ? `<button class="btn btn-primary btn-lg dsubmit" type="submit">${esc(H.COPY.demo.cta)}</button>`
          : `<a class="btn btn-primary btn-lg dsubmit" ${link(COMPANY.inquiry)}>${esc(H.COPY.demo.cta)} &rarr;</a>
        <!-- NOT WIRED YET. COMPANY.demoAction in products.js is null, so this
             button is a link to the form on the old site, which does submit.
             Set demoAction to an endpoint and the same markup above becomes a
             real POST with no other change. The note below is deliberately
             written for a customer, not for whoever maintains this: nobody
             buying software should be told the name of a config field. -->
        <p class="dnote">Prefer to talk to a person? ${esc(H.CONTACTS.email)} or ${esc(H.CONTACTS.phones[0])}.</p>`}
      </form>
    </div>

  </div>
</div>`;

/* =============================================================================
   THE DOCUMENT
   ========================================================================== */
const DESC = `${H.COPY.hero.lede.strong} ${H.COPY.hero.lede.rest} `
  + H.TILES.map((t) => t.name).join(', ') + '.';

const jsonld = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: COMPANY.name,
  legalName: COMPANY.legal,
  url: COMPANY.site,
  slogan: COMPANY.creed,
  description: COMPANY.positioning,
  telephone: COMPANY.phone,
  email: H.CONTACTS.email,
  address: { '@type': 'PostalAddress', addressLocality: 'Kuala Lumpur', addressCountry: 'MY' },
  makesOffer: H.TILES.map((t) => {
    const p = BY_SLUG.get(t.slug);
    return {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'SoftwareApplication',
        name: t.name,
        applicationCategory: 'BusinessApplication',
        description: (p && p.description) || t.tagline,
      },
    };
  }),
};

/* ONE DOCUMENT SHELL, TWO PAGES. Everything outside <main> — the head, the
   sticky header, the three nav panels, the drawer, the footer and the scripts —
   is identical on every page this generator makes, so it lives here once and
   takes the body as an argument. The alternative is what `products/*.html` and
   `about.html` already are: standalone copies that drift, and that tools/
   fix-pages.js exists to keep in line. Anything generated should not need that. */
const page = ({ title, ogTitle, desc, body }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="${H.PALETTE.teal}">
${COMPANY.pageUrl ? `<link rel="canonical" href="${esc(COMPANY.pageUrl)}">\n<meta property="og:url" content="${esc(COMPANY.pageUrl)}">` : '<!-- no canonical: COMPANY.pageUrl is null until this page has a home -->'}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(ogTitle || title)}">
<meta property="og:description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<!-- the display face is self-hosted and used by the very first line of the
     page, so it is preloaded rather than discovered late in the stylesheet -->
<link rel="preload" href="assets/fonts/MeshedDisplay-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${stamp('assets/css/talbotiq.css')}">
<!-- THIS ONE LINE HAS TO BE INLINE AND IT HAS TO BE HERE. Every rule in §18
     that hides or moves anything is scoped to html.fx, so the class decides
     whether the page animates at all. A deferred script sets it too late: the
     browser would paint the finished drawing, then the class would arrive and
     snap it back to the start. Setting it before the body is parsed means there
     is nothing to flash. JS off, reduced motion, or a phone -> no class, and
     none of §18 applies. -->
<script>try{var m=window.matchMedia,d=document.documentElement;if(m&&!m('(prefers-reduced-motion: reduce)').matches&&!m('(max-width: 820px)').matches){d.className+=' fx';
/* THE DEAD-MAN'S SWITCH. Everything §18-24 hides is scoped to .fx, and .fx is
   set here, BEFORE scroll.js has loaded. If that file 404s, is blocked, or
   throws, nothing would ever add the classes that unhide it — and the page
   would sit there with its tiles, its reveals and its pen marks permanently
   invisible. Content would be gone, not just unanimated. So scroll.js signals
   that it is alive by adding fx-on, and if that has not happened within two
   seconds .fx comes off and the whole page resolves to its finished state. */
setTimeout(function(){if(!d.classList.contains('fx-on')){d.classList.remove('fx');}},2000);}}catch(e){}</script>
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header id="hdr">
  <div class="hdr">
    <!-- HOME IS THIS PAGE. This used to be COMPANY.site, which is the address
         of the site rather than a link to it — so the one control every reader
         trusts to get them back took them off this site and onto the old one.
         COMPANY.site is still correct for the canonical and the JSON-LD, which
         is what it is actually for. -->
    <a class="logo" href="index.html" aria-label="${esc(COMPANY.name)} home">
      <img src="${LOGO}" alt="${esc(COMPANY.name)}" width="262" height="72">
    </a>
    <nav class="mid" aria-label="Primary">
      ${navItems}
    </nav>
    <div class="hdr-right">
      <a class="si" href="${esc(GO.signin)}">Sign in</a>
      <a class="btn btn-primary" ${link(GO.demo)}>${esc(H.COPY.hero.primary)}</a>
      <button class="burger" id="burger" type="button" aria-expanded="false" aria-controls="drawer" aria-label="Menu"><i></i></button>
    </div>
  </div>
</header>
${panelMarkup}
${drawer}

<main id="main">
${body}
</main>
${footer}

<script src="${stamp('assets/js/app.js')}" defer></script>

<!-- THE SCROLL CHOREOGRAPHY. Progressive enhancement, top to bottom: this file
     only adds classes and one custom property, and every animation is CSS. The
     page above is complete without it — no content lives inside a transition,
     nothing is ever covered, and under prefers-reduced-motion the reveals
     resolve instantly instead of moving. -->
<script type="application/json" id="stage-data">${JSON.stringify(STAGE).replace(/</g, '\\u003c')}</script>
<script defer src="${stamp('assets/js/scroll.js')}"></script>
</body>
</html>
`;

const html = page({
  title: `${COMPANY.name} — ${H.COPY.hero.lead} ${H.COPY.hero.marked}`,
  /* The share card has always led with the promise rather than the headline,
     and that is a deliberate difference from <title>, not an oversight. */
  ogTitle: `${COMPANY.name} — ${H.COPY.hero.lede.strong}`,
  desc: DESC,
  body: [hero, productBand, ecosystem, mission, caps, why, blog, close].join('\n'),
});

fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf8');

const demoHtml = page({
  title: `${H.COPY.demo.heading} — ${COMPANY.name}`,
  desc: H.COPY.demo.lede,
  body: demoBody,
});
fs.writeFileSync(path.join(__dirname, 'demo.html'), demoHtml, 'utf8');

const linked = H.TILES.filter((t) => tileHref(t)).length;
const soon = [...H.SOLUTIONS, ...H.COMPANY_LINKS, ...H.RESOURCES, ...H.LEGAL].filter((x) => !x.url).length;
console.log(
  `demo.html  — ${(Buffer.byteLength(demoHtml) / 1024).toFixed(1)}kB · `
  + `${H.TILES.length + 1} products to choose from · `
  + `${DEMO_ACTION ? 'posts to ' + DEMO_ACTION : 'NOT WIRED — submit falls through to ' + COMPANY.inquiry}`
);
console.log(
  `index.html — ${(Buffer.byteLength(html) / 1024).toFixed(1)}kB · `
  + `${H.TILES.length} products (${linked} linked, ${H.TILES.length - linked} awaiting a destination) · `
  + `${H.CAPABILITIES.length} capability cards · ${SHOWN.length} of ${ARTICLES.length} articles · `
  + `${soon} footer/nav entries marked "soon"`
  + ` · ${H.WHY.points.length} reasons to lead with TALBOTIQ`
);
