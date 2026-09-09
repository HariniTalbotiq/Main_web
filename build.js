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

/* KEYED HEADINGS. One or two words of a heading carry a colour and the rest is
   ink — §26 of the stylesheet owns the two roles. The words are NAMED in
   home.js rather than marked up there, so the copy stays a readable sentence
   that a non-developer can edit without touching a tag.

   ONE PASS, LEFT TO RIGHT. Every keyword's position is found on the escaped
   heading FIRST and the output is then assembled in order. Wrapping them one
   after another instead would let a later keyword match inside a `<span
   class="k-g">` that an earlier one had just inserted. */
function keyed(h) {
  const src = esc(h.text);
  const hits = [];
  for (const [word, tone] of h.keys || []) {
    const i = src.indexOf(esc(word));
    if (i >= 0) hits.push({ i, len: esc(word).length, tone });
  }
  hits.sort((a, b) => a.i - b.i);
  let out = '', at = 0;
  for (const k of hits) {
    if (k.i < at) continue;                 /* two keys overlapping: first wins */
    out += src.slice(at, k.i) + `<span class="k-${k.tone}">` + src.slice(k.i, k.i + k.len) + '</span>';
    at = k.i + k.len;
  }
  return out + src.slice(at);
}

/* Every {text, keys} pair anywhere in the copy, found by walking it rather than
   by keeping a list here — a list is a thing to forget to add to, and the whole
   point of the check below is that a bad keyword cannot reach a reader. */
function keyedHeadings(o, out = []) {
  if (!o || typeof o !== 'object') return out;
  if (typeof o.text === 'string' && Array.isArray(o.keys)) out.push(o);
  for (const v of Object.values(o)) keyedHeadings(v, out);
  return out;
}

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
    /* A SUB-MODE IS A DOOR. Its pill promises three of them, so a missing name,
       icon or page — or a page that is not in the repo — fails the build rather
       than shipping a branch that 404s on the one reader who opens it. */
    for (const m of t.modes || []) {
      if (!m.name || !m.icon) bad.push(`a mode of "${t.name}" has no name or icon`);
      if (!m.local) bad.push(`mode "${m.name}" of "${t.name}" has no local page`);
      else if (!fs.existsSync(path.join(__dirname, m.local))) {
        bad.push(`mode "${m.name}" points at ${m.local}, which is not in the repo`);
      }
    }
  }
  /* UNIQUENESS IS ON THE NAME, NOT THE SLUG. Video, Voice and Chat Interview
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
  /* A KEYWORD THAT IS NOT IN ITS OWN HEADING WOULD SIMPLY NOT APPEAR, silently,
     and the heading would ship with no emphasis at all. The cap of two is the
     device itself: three coloured words in one line is decoration. */
  for (const h of keyedHeadings(H)) {
    for (const [word, tone] of h.keys) {
      if (!h.text.includes(word)) bad.push(`keyword "${word}" does not occur in heading "${h.text}"`);
      if (tone !== 'g' && tone !== 'y') bad.push(`keyword "${word}" has unknown tone "${tone}" — it is 'g' or 'y'`);
    }
    if (!h.keys.length) bad.push(`heading "${h.text}" has no keywords`);
    if (h.keys.length > 2) bad.push(`heading "${h.text}" has ${h.keys.length} keywords — the device is one or two`);
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
  /* The featured episode's id is interpolated straight into an embed URL, so it
     is checked for the shape of one rather than trusted. A typo here would
     otherwise ship a player that loads nothing, silently. */
  if (H.FEATURE) {
    if (!/^[\w-]{11}$/.test(H.FEATURE.youtube || '')) bad.push(`FEATURE.youtube is not a video id: ${H.FEATURE.youtube}`);
    for (const k of ['show', 'title', 'desc']) if (!H.FEATURE[k]) bad.push(`FEATURE.${k} is missing`);
  }
  /* The broadcast item is a still we host and a link off-site. A missing string
     would render a bald block; a missing FILE would render a broken frame on a
     page that has no other broken thing on it. Both fail here. */
  if (H.BROADCAST) {
    for (const k of ['show', 'title', 'desc', 'link', 'linkLabel', 'image', 'imageAlt']) {
      if (!H.BROADCAST[k]) bad.push(`BROADCAST.${k} is missing`);
    }
    if (H.BROADCAST.image && !fs.existsSync(path.join(__dirname, H.BROADCAST.image))) {
      bad.push(`BROADCAST.image points at ${H.BROADCAST.image}, which is not in the repo`);
    }
    if (!/^https:\/\//.test(H.BROADCAST.link || '')) bad.push('BROADCAST.link is not an https URL');
  }
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

   THE HEADER NO LONGER OFFERS SIGN IN, by request — the page stays, the way in
   from the nav does not. That is why this route is still here with nothing
   reading it: putting the link back is one line in the header, and deleting
   the constant would only make that harder while doing nothing for the reader.
   The page also drops out of api/knowledge.json on its own, because the
   crawler follows links from index.html and there is no longer one.

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
     and its submit stays on this site until an endpoint is set. No button
     here links to the old website any more, and tools/fix-pages.js enforces
     that on every run.

     `talk` is the LOCAL contact page: its phone, email and WhatsApp links are
     live, so it is useful even though its own form is not wired. */
  demo: 'demo.html',
  talk: 'contact.html',
  signin: 'signin.html',
  products: '#products',
  /* THE SHELF'S OWN FOOTER LINK. It pointed at the old site's /products/
     index, so the one link under a shelf listing ten local product pages left
     the site. `index.html#products` rather than the bare '#products' that the
     hero uses, because this shelf is in the header of demo.html too, where a
     bare fragment would be a dead anchor. */
  allProducts: 'index.html#products',
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

   Fonts are not stamped because they are no longer ours to stamp: both faces
   come from Google Fonts, whose URLs already carry their own version. */
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
/* REMOVED, by request: HIGHLIGHT, LASSO, UNDERLINE and SQUIGGLE — the four
   hand-drawn marks. A highlighter swept behind the hero's last clause, a lasso
   looped "Intelligence", a ruled underline sat under the capability heading and
   a squiggle under the blog heading. Emphasis is `keyed()` above now: the words
   themselves take a colour, so there is no shape to position, none to animate,
   and a heading occupies exactly its own type. */

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
    /* THE PHONE NUMBER IS NOT ON THIS BAR ANY MORE, by request — and this bar
       is now on EVERY page, because assets/js/nav.js gives the standalone pages
       the same shelves, so one number here was one number site-wide. It takes
       the shape the Solutions shelf already uses: a line about who we are, and
       one link out. `Contact us` is in the shelf above; this is the same
       destination as an action. */
    foot: `<span>${esc(COMPANY.legal)} &middot; ${esc(COMPANY.base)}</span>
        <a ${link(GO.talk)}>Talk to us &rarr;</a>`,
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
     Interview — and the grid is right to show all three. The diagram is not:
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
    <h1 class="hand">${keyed(H.COPY.hero.heading)}</h1>

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

   THE CONNECTORS ARE GONE TOO. Nine traces used to run between the tiles and
   down toward the engine, saying "these things are joined". They read as a
   flowchart rather than as a product grid, and the rows had to carry 64px of
   empty runway underneath them for the traces to travel through. Removed by
   request, and the runway with them — the three labelled bands are what
   separate the groups now, which is what they were for.
   ========================================================================== */

/* The engine is not a fourth row, it is the floor — so its group renders as one
   centred tile with the note underneath rather than as a row of one. Which
   group that is comes from CENTER_SLUG, the same product every other diagram on
   this page orbits, rather than from a hardcoded group id. */
const ENGINE_GROUP = (H.GROUPS.find((g) =>
  H.TILES.some((t) => t.group === g.id && t.slug === CENTER_SLUG)) || {}).id;

const groupTiles = (g) => H.TILES.filter((t) => t.group === g.id);

/* THE BRANCH UNDER A TILE THAT HAS MODES. Video and Chat rounds each come in
   three shapes and each shape ships its own page, so the tile wears a "3 modes"
   pill and opens three real links — not a tooltip. The minis are SIBLINGS of
   the tile anchor inside `.cell`, because an anchor inside an anchor is not
   markup a browser will honour.

   THE DRAWING IS BUILT AROUND A RAIL, NOT AROUND THE TILE. The rail spans the
   panel and drops onto the centres of three equal columns, which the panel's
   own 352px width fixes; the stem comes down from the tile and simply MEETS the
   rail wherever it lands. That is why one drawing serves both positions — only
   the stem's x differs, and it has nothing it must hit. */
const modeTree = (stem) => `<svg class="tree" viewBox="0 0 352 44" aria-hidden="true" focusable="false">
          <g stroke="#B6DFD2" stroke-width="1.8" fill="none" stroke-linecap="round">
            <path d="M${stem} 0v16"/>
            <path d="M62 30V22Q62 16 68 16h216q6 0 6 6v8"/>
            <path d="M176 16v14"/>
          </g>
          <circle cx="${stem}" cy="2" r="3" fill="${H.PALETTE.teal}"/>
          <g fill="${H.PALETTE.teal}"><circle cx="62" cy="32" r="2.6"/><circle cx="176" cy="32" r="2.6"/><circle cx="290" cy="32" r="2.6"/></g>
        </svg>`;

/* The first column anchors its panel to its own left edge and every other
   column centres one, which is what keeps a panel off the page's left margin
   without any of them being measured.

   THE CHIPS ARE SPANS, NOT LINKS, by request. The panel exists to show what
   the three modes ARE; the tile above it is what opens anything. `m.local`
   still records the page behind each mode - the build's own link count and the
   knowledge crawler both read it - it is simply not spent on an href here.
   A span also keeps them out of the tab order, and off the pile of duplicate
   destinations a screen reader would otherwise announce twice. */
const modeBranch = (t, first) => `<div class="branch ${first ? 'b-left' : 'b-mid'}">
        ${modeTree(first ? 155 : 176)}
        <div class="minis">
          ${t.modes.map((m) => `<span class="mini">
            <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true" focusable="false">${m.icon}</svg>
            <b>${esc(m.name)}</b>
          </span>`).join('\n          ')}
        </div>
      </div>`;

/* One tile, in its cell. `kin` is the hover badge — Live, 2 modes — and its
   tone class is the label itself, slugified, so a new badge needs one CSS rule
   and no build change. `modes` is the pill, and it is always visible: it is a
   count of doors, not a detail.

   EVERY TILE GETS A `.cell`, not only the two with branches, so the grid's
   children are all the same kind of box and the two that open something are not
   a different shape from the rest. */
function productTile(t, big, first) {
  const href = tileHref(t);
  const kin = t.kin
    ? `\n        <span class="kin kin-${esc(String(t.kin).toLowerCase().replace(/\s+/g, '-'))}">${esc(t.kin)}</span>`
    : '';
  const modes = t.modes
    ? `\n        <span class="modes">${t.modes.length} modes
          <svg width="9" height="6" viewBox="0 0 10 6" aria-hidden="true" focusable="false"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>
        </span>`
    : '';
  const inner = `<span class="card">${icon(t, big ? 70 : 58)}</span>
        <span class="nm">${esc(t.name)}</span>
        <span class="ds">${esc(t.tagline)}</span>${kin}${modes}`;
  const tile = href
    ? `<a class="tile" href="${esc(href)}"${isExternal(href) ? ' target="_blank" rel="noopener"' : ''}>
        ${inner}
      </a>`
    /* a tile with no application to open yet is still a tile, but it does not
       pretend to be a door */
    : `<div class="tile" aria-disabled="true">
        ${inner}
      </div>`;
  return `<div class="cell">
      ${tile}${t.modes ? '\n      ' + modeBranch(t, first) : ''}
    </div>`;
}

/* The label over each band: the name, a rule that fades out, and the count of
   what is in the band. The count is DERIVED from the band, like every other
   number on this page, so a tile added to a group cannot leave the label
   lying. */
function groupLabel(g, n) {
  return `<div class="glabel ${esc(g.tone)}">
        <span class="t">${esc(g.label)}</span><span class="r"></span><span class="c">${n} product${n === 1 ? '' : 's'}</span>
      </div>`;
}

const productGroups = H.GROUPS.map((g) => {
  const ts = groupTiles(g);
  if (g.id === ENGINE_GROUP) {
    return `${groupLabel(g, ts.length)}

      <div class="pengine">
        ${ts.map((t) => productTile(t, true)).join('\n        ')}
      </div>`;
  }
  /* The column count is the number of tiles in the band — four then five —
     which is why the class carries it rather than the stylesheet assuming it. */
  return `${groupLabel(g, ts.length)}

      <div class="prow prow-${ts.length}">
        ${ts.map((t, i) => productTile(t, false, i === 0)).join('\n        ')}
      </div>`;
}).join('\n\n      ');

const productBand = `
<div class="band" id="products">
  <div class="wrap">

    <div class="phead">
      <h2 class="hand">${keyed(H.COPY.products.heading)}</h2>
      <p class="lede"><b>${esc(H.COPY.products.lede.strong)}</b> ${esc(H.COPY.products.lede.rest)}</p>
    </div>

    <div class="pblock">
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
  /* THE NEURAL LOOP. Three columns — the applications that feed the engine,
     the engine, and the agents it dispatches to — with the signal travelling
     the whole way through on a 9s cycle that closes on itself. Inline rather
     than a video: it is asked to be READ at around 9px, where vector text
     stays sharp and a 1080p frame upscaled into this column does not, and a
     CSS animation cannot be paused by an autoplay policy or a battery saver.
     Every class, id and keyframe in it is nl- prefixed — .node, .flow,
     .eyebrow and .cap all already mean something else on this page. */
  : `<svg class="nloop" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg" role="img"
         aria-label="Enterprise applications feeding a private AI engine that dispatches to intelligent agents">
    <defs>
        <radialGradient id="nl-lift" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#0FA07C" stop-opacity=".16"/>
        <stop offset="55%" stop-color="#0FA07C" stop-opacity=".05"/>
        <stop offset="100%" stop-color="#0FA07C" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="nl-halo">
        <stop offset="0%" stop-color="#5CE4B0" stop-opacity=".55"/>
        <stop offset="45%" stop-color="#5CE4B0" stop-opacity=".18"/>
        <stop offset="100%" stop-color="#5CE4B0" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="nl-hub">
        <stop offset="0%" stop-color="#D6FFF4" stop-opacity=".90"/>
        <stop offset="13%" stop-color="#5CE4B0" stop-opacity=".38"/>
        <stop offset="42%" stop-color="#2FB88E" stop-opacity=".11"/>
        <stop offset="100%" stop-color="#2FB88E" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="911" cy="568" rx="540" ry="450" fill="url(#nl-lift)"/>
    
    <!-- engine panel -->
    <rect x="566" y="180" width="690" height="776" rx="22"
          fill="#2A3137" stroke="#3A434B" stroke-width="1.4"/>
    <rect x="573" y="187" width="676" height="762" rx="17"
          fill="none" stroke="#303A40" stroke-width="1"/>
    
    <!-- header -->
    <text x="56" y="46" class="nl-eyebrow">EXHIBIT 01  &#183;  PLATFORM ARCHITECTURE</text>
    <g>
      <circle cx="74" cy="122" r="17" fill="#234F42" stroke="#34AE80" stroke-width="1.4"/>
      <text x="74" y="123" class="nl-colnum">1</text>
      <text x="104" y="122" class="nl-colhead">ENTERPRISE APPLICATIONS</text>
      <circle cx="584" cy="122" r="17" fill="#234F42" stroke="#34AE80" stroke-width="1.4"/>
      <text x="584" y="123" class="nl-colnum">2</text>
      <text x="614" y="122" class="nl-colhead">PRIVATE AI ENGINE</text>
      <circle cx="1318" cy="122" r="17" fill="#234F42" stroke="#34AE80" stroke-width="1.4"/>
      <text x="1318" y="123" class="nl-colnum">3</text>
      <text x="1348" y="122" class="nl-colhead">INTELLIGENT AGENTS</text>
    </g>
    
    <!-- static neural wiring -->
    <g class="nl-wires" fill="none" stroke-linecap="round">
      <g class="nl-wl" stroke="#34BA8C" stroke-width="1.3" opacity="0.46"><path d="M506 235L670 344"/><path d="M506 235L670 456"/><path d="M506 235L670 568"/><path d="M506 369L670 344"/><path d="M506 503L670 456"/><path d="M506 503L670 568"/><path d="M506 637L670 344"/><path d="M506 637L670 568"/><path d="M506 637L670 680"/><path d="M506 771L670 792"/><path d="M506 905L670 456"/><path d="M506 905L670 680"/><path d="M506 905L670 792"/></g>
      <g class="nl-wc" stroke="#2FAD86" stroke-width="1.15" opacity="0.42"><path d="M670 344C795.3 344 785.7 568 911 568"/><path d="M670 344C814.6 344 766.4 400 911 400"/><path d="M670 456C795.3 456 785.7 568 911 568"/><path d="M670 456C814.6 456 766.4 490 911 490"/><path d="M670 568C795.3 568 785.7 568 911 568"/><path d="M670 568C814.6 568 766.4 490 911 490"/><path d="M670 680C795.3 680 785.7 568 911 568"/><path d="M670 680C814.6 680 766.4 646 911 646"/><path d="M670 792C795.3 792 785.7 568 911 568"/><path d="M670 792C814.6 792 766.4 736 911 736"/><path d="M911 400C911 400 911 568 911 568"/><path d="M911 400C1055.6 400 1007.4 344 1152 344"/><path d="M911 490C911 490 911 568 911 568"/><path d="M911 490C1055.6 490 1007.4 456 1152 456"/><path d="M911 646C911 646 911 568 911 568"/><path d="M911 646C1055.6 646 1007.4 680 1152 680"/><path d="M911 736C911 736 911 568 911 568"/><path d="M911 736C1055.6 736 1007.4 680 1152 680"/><path d="M911 568C1036.3 568 1026.7 344 1152 344"/><path d="M911 568C1036.3 568 1026.7 456 1152 456"/><path d="M911 568C1036.3 568 1026.7 568 1152 568"/><path d="M911 568C1036.3 568 1026.7 680 1152 680"/><path d="M911 568C1036.3 568 1026.7 792 1152 792"/></g>
      <g class="nl-wh" stroke="#4FDCB0" stroke-width="2.0" opacity="0.8"><path d="M670 344C795.3 344 785.7 568 911 568"/><path d="M911 568C1036.3 568 1026.7 792 1152 792"/><path d="M670 792C795.3 792 785.7 568 911 568"/><path d="M911 568C1036.3 568 1026.7 456 1152 456"/><path d="M670 568C795.3 568 785.7 568 911 568"/><path d="M911 568C1036.3 568 1026.7 568 1152 568"/></g>
      <g class="nl-wr" stroke="#34BA8C" stroke-width="1.3" opacity="0.46"><path d="M1152 344L1300 194"/><path d="M1152 344L1300 287.5"/><path d="M1152 456L1300 287.5"/><path d="M1152 344L1300 381"/><path d="M1152 456L1300 474.5"/><path d="M1152 568L1300 474.5"/><path d="M1152 456L1300 568"/><path d="M1152 568L1300 568"/><path d="M1152 680L1300 661.5"/><path d="M1152 792L1300 661.5"/><path d="M1152 680L1300 755"/><path d="M1152 792L1300 755"/><path d="M1152 792L1300 848.5"/><path d="M1152 680L1300 942"/><path d="M1152 792L1300 942"/></g>
    </g>
    
    <!-- engine core -->
    <g transform="translate(911 568)">
      <circle class="nl-hubhalo" r="120" fill="url(#nl-hub)"/>
      <circle class="nl-ring" r="60"/>
      <circle class="nl-ring" r="60" style="animation-delay:-1.125s"/>
      <circle r="4.6" fill="#EAFFF9"/>
    </g>
    
    <!-- nodes -->
    <g><g class="nl-node" transform="translate(670 344)" style="animation-delay:-0.00s"><circle r="16" fill="url(#nl-halo)"/><circle r="2.7" fill="#9BFFE6"/></g><g class="nl-node" transform="translate(670 456)" style="animation-delay:-0.90s"><circle r="16" fill="url(#nl-halo)"/><circle r="2.7" fill="#9BFFE6"/></g><g class="nl-node" transform="translate(670 568)" style="animation-delay:-1.80s"><circle r="16" fill="url(#nl-halo)"/><circle r="2.7" fill="#9BFFE6"/></g><g class="nl-node" transform="translate(670 680)" style="animation-delay:-2.70s"><circle r="16" fill="url(#nl-halo)"/><circle r="2.7" fill="#9BFFE6"/></g><g class="nl-node" transform="translate(670 792)" style="animation-delay:-3.60s"><circle r="16" fill="url(#nl-halo)"/><circle r="2.7" fill="#9BFFE6"/></g><g class="nl-node" transform="translate(1152 344)" style="animation-delay:-1.40s"><circle r="16" fill="url(#nl-halo)"/><circle r="2.7" fill="#9BFFE6"/></g><g class="nl-node" transform="translate(1152 456)" style="animation-delay:-2.30s"><circle r="16" fill="url(#nl-halo)"/><circle r="2.7" fill="#9BFFE6"/></g><g class="nl-node" transform="translate(1152 568)" style="animation-delay:-3.20s"><circle r="16" fill="url(#nl-halo)"/><circle r="2.7" fill="#9BFFE6"/></g><g class="nl-node" transform="translate(1152 680)" style="animation-delay:-4.10s"><circle r="16" fill="url(#nl-halo)"/><circle r="2.7" fill="#9BFFE6"/></g><g class="nl-node" transform="translate(1152 792)" style="animation-delay:-5.00s"><circle r="16" fill="url(#nl-halo)"/><circle r="2.7" fill="#9BFFE6"/></g><g class="nl-node nl-dim" transform="translate(911 400)" style="animation-delay:-0.50s"><circle r="11" fill="url(#nl-halo)"/><circle r="2.1" fill="#9BFFE6"/></g><g class="nl-node nl-dim" transform="translate(911 490)" style="animation-delay:-1.80s"><circle r="11" fill="url(#nl-halo)"/><circle r="2.1" fill="#9BFFE6"/></g><g class="nl-node nl-dim" transform="translate(911 646)" style="animation-delay:-3.10s"><circle r="11" fill="url(#nl-halo)"/><circle r="2.1" fill="#9BFFE6"/></g><g class="nl-node nl-dim" transform="translate(911 736)" style="animation-delay:-4.40s"><circle r="11" fill="url(#nl-halo)"/><circle r="2.1" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(506 235)" style="animation-delay:-0.00s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(506 369)" style="animation-delay:-0.70s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(506 503)" style="animation-delay:-1.40s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(506 637)" style="animation-delay:-2.10s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(506 771)" style="animation-delay:-2.80s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(506 905)" style="animation-delay:-3.50s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(1300 194)" style="animation-delay:-2.10s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(1300 287.5)" style="animation-delay:-2.80s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(1300 381)" style="animation-delay:-3.50s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(1300 474.5)" style="animation-delay:-4.20s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(1300 568)" style="animation-delay:-4.90s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(1300 661.5)" style="animation-delay:-5.60s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(1300 755)" style="animation-delay:-6.30s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(1300 848.5)" style="animation-delay:-7.00s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g><g class="nl-node nl-term" transform="translate(1300 942)" style="animation-delay:-7.70s"><circle r="14" fill="url(#nl-halo)"/><circle r="2.6" fill="#9BFFE6"/></g></g>
    
    <!-- flowing data -->
    <g><g class="nl-flow" style="animation-delay:-0.00s"><path class="nl-fg" d="M506 369L670 344C795.3 344 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 194" pathLength="1000"/><path class="nl-fm" d="M506 369L670 344C795.3 344 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 194" pathLength="1000"/><path class="nl-fh" d="M506 369L670 344C795.3 344 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 194" pathLength="1000"/></g><g class="nl-flow" style="animation-delay:-2.78s"><path class="nl-fg" d="M506 503L670 456C795.3 456 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 287.5" pathLength="1000"/><path class="nl-fm" d="M506 503L670 456C795.3 456 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 287.5" pathLength="1000"/><path class="nl-fh" d="M506 503L670 456C795.3 456 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 287.5" pathLength="1000"/></g><g class="nl-flow" style="animation-delay:-1.06s"><path class="nl-fg" d="M506 503L670 568C795.3 568 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 381" pathLength="1000"/><path class="nl-fm" d="M506 503L670 568C795.3 568 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 381" pathLength="1000"/><path class="nl-fh" d="M506 503L670 568C795.3 568 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 381" pathLength="1000"/></g><g class="nl-flow" style="animation-delay:-3.84s"><path class="nl-fg" d="M506 637L670 680C795.3 680 785.7 568 911 568C1036.3 568 1026.7 456 1152 456L1300 474.5" pathLength="1000"/><path class="nl-fm" d="M506 637L670 680C795.3 680 785.7 568 911 568C1036.3 568 1026.7 456 1152 456L1300 474.5" pathLength="1000"/><path class="nl-fh" d="M506 637L670 680C795.3 680 785.7 568 911 568C1036.3 568 1026.7 456 1152 456L1300 474.5" pathLength="1000"/></g><g class="nl-flow" style="animation-delay:-2.12s"><path class="nl-fg" d="M506 771L670 792C795.3 792 785.7 568 911 568C1036.3 568 1026.7 568 1152 568L1300 568" pathLength="1000"/><path class="nl-fm" d="M506 771L670 792C795.3 792 785.7 568 911 568C1036.3 568 1026.7 568 1152 568L1300 568" pathLength="1000"/><path class="nl-fh" d="M506 771L670 792C795.3 792 785.7 568 911 568C1036.3 568 1026.7 568 1152 568L1300 568" pathLength="1000"/></g><g class="nl-flow" style="animation-delay:-0.41s"><path class="nl-fg" d="M506 369L670 344C795.3 344 785.7 568 911 568C1036.3 568 1026.7 680 1152 680L1300 661.5" pathLength="1000"/><path class="nl-fm" d="M506 369L670 344C795.3 344 785.7 568 911 568C1036.3 568 1026.7 680 1152 680L1300 661.5" pathLength="1000"/><path class="nl-fh" d="M506 369L670 344C795.3 344 785.7 568 911 568C1036.3 568 1026.7 680 1152 680L1300 661.5" pathLength="1000"/></g><g class="nl-flow" style="animation-delay:-3.19s"><path class="nl-fg" d="M506 503L670 456C795.3 456 785.7 568 911 568C1036.3 568 1026.7 792 1152 792L1300 755" pathLength="1000"/><path class="nl-fm" d="M506 503L670 456C795.3 456 785.7 568 911 568C1036.3 568 1026.7 792 1152 792L1300 755" pathLength="1000"/><path class="nl-fh" d="M506 503L670 456C795.3 456 785.7 568 911 568C1036.3 568 1026.7 792 1152 792L1300 755" pathLength="1000"/></g><g class="nl-flow" style="animation-delay:-1.47s"><path class="nl-fg" d="M506 503L670 568C795.3 568 785.7 568 911 568C1036.3 568 1026.7 792 1152 792L1300 848.5" pathLength="1000"/><path class="nl-fm" d="M506 503L670 568C795.3 568 785.7 568 911 568C1036.3 568 1026.7 792 1152 792L1300 848.5" pathLength="1000"/><path class="nl-fh" d="M506 503L670 568C795.3 568 785.7 568 911 568C1036.3 568 1026.7 792 1152 792L1300 848.5" pathLength="1000"/></g><g class="nl-flow" style="animation-delay:-4.25s"><path class="nl-fg" d="M506 637L670 680C795.3 680 785.7 568 911 568C1036.3 568 1026.7 792 1152 792L1300 942" pathLength="1000"/><path class="nl-fm" d="M506 637L670 680C795.3 680 785.7 568 911 568C1036.3 568 1026.7 792 1152 792L1300 942" pathLength="1000"/><path class="nl-fh" d="M506 637L670 680C795.3 680 785.7 568 911 568C1036.3 568 1026.7 792 1152 792L1300 942" pathLength="1000"/></g><g class="nl-flow" style="animation-delay:-2.53s"><path class="nl-fg" d="M506 235L670 344C795.3 344 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 381" pathLength="1000"/><path class="nl-fm" d="M506 235L670 344C795.3 344 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 381" pathLength="1000"/><path class="nl-fh" d="M506 235L670 344C795.3 344 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 381" pathLength="1000"/></g><g class="nl-flow" style="animation-delay:-0.81s"><path class="nl-fg" d="M506 369L670 344C795.3 344 785.7 568 911 568C1036.3 568 1026.7 568 1152 568L1300 568" pathLength="1000"/><path class="nl-fm" d="M506 369L670 344C795.3 344 785.7 568 911 568C1036.3 568 1026.7 568 1152 568L1300 568" pathLength="1000"/><path class="nl-fh" d="M506 369L670 344C795.3 344 785.7 568 911 568C1036.3 568 1026.7 568 1152 568L1300 568" pathLength="1000"/></g><g class="nl-flow" style="animation-delay:-3.59s"><path class="nl-fg" d="M506 771L670 792C795.3 792 785.7 568 911 568C1036.3 568 1026.7 680 1152 680L1300 661.5" pathLength="1000"/><path class="nl-fm" d="M506 771L670 792C795.3 792 785.7 568 911 568C1036.3 568 1026.7 680 1152 680L1300 661.5" pathLength="1000"/><path class="nl-fh" d="M506 771L670 792C795.3 792 785.7 568 911 568C1036.3 568 1026.7 680 1152 680L1300 661.5" pathLength="1000"/></g><g class="nl-flow" style="animation-delay:-1.87s"><path class="nl-fg" d="M506 905L670 792C795.3 792 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 381" pathLength="1000"/><path class="nl-fm" d="M506 905L670 792C795.3 792 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 381" pathLength="1000"/><path class="nl-fh" d="M506 905L670 792C795.3 792 785.7 568 911 568C1036.3 568 1026.7 344 1152 344L1300 381" pathLength="1000"/></g></g>
    
    <!-- left: enterprise applications -->
    <g><g><rect x="56" y="196" width="450" height="78" rx="39.0" fill="#32363F" stroke="#3F4450" stroke-width="1.1"/><circle cx="96" cy="235" r="21" fill="#263E38" stroke="#2E8468" stroke-width="1.3"/><g class="nl-ic" transform="translate(96 235)"><circle cx="0" cy="-5.3" r="4.2"/><path d="M-8.5 9.4a8.5 8.5 0 0 1 17 0"/></g><text x="134" y="235" class="nl-pill" font-size="19">Conversational AI Avatar Interview</text></g><g><rect x="56" y="330" width="450" height="78" rx="39.0" fill="#32363F" stroke="#3F4450" stroke-width="1.1"/><circle cx="96" cy="369" r="21" fill="#263E38" stroke="#2E8468" stroke-width="1.3"/><g class="nl-ic" transform="translate(96 369)"><rect x="-3" y="-9.5" width="6" height="11.5" rx="3"/><path d="M-7 -1.5a7 7 0 0 0 14 0M0 5.6v3.8M-4.2 9.4h8.4"/></g><text x="134" y="369" class="nl-pill" font-size="19">Conversational AI Voice Interview</text></g><g><rect x="56" y="464" width="450" height="78" rx="39.0" fill="#32363F" stroke="#3F4450" stroke-width="1.1"/><circle cx="96" cy="503" r="21" fill="#263E38" stroke="#2E8468" stroke-width="1.3"/><g class="nl-ic" transform="translate(96 503)"><path d="M-9 -5l3 3 5-5M2 -4h7M-9 2l3 3 5-5M2 3h7"/></g><text x="134" y="503" class="nl-pill" font-size="22">Task &amp; Productivity Manager</text></g><g><rect x="56" y="598" width="450" height="78" rx="39.0" fill="#32363F" stroke="#3F4450" stroke-width="1.1"/><circle cx="96" cy="637" r="21" fill="#263E38" stroke="#2E8468" stroke-width="1.3"/><g class="nl-ic" transform="translate(96 637)"><rect x="-7" y="-9" width="14" height="18" rx="2.5"/><path d="M-4 -5h8M-4 -1h8M-4 3h5"/></g><text x="134" y="637" class="nl-pill" font-size="22">Intelligent Note Taker</text></g><g><rect x="56" y="732" width="450" height="78" rx="39.0" fill="#32363F" stroke="#3F4450" stroke-width="1.1"/><circle cx="96" cy="771" r="21" fill="#263E38" stroke="#2E8468" stroke-width="1.3"/><g class="nl-ic" transform="translate(96 771)"><path d="M-8 -4v-4h4M8 -4v-4h-4M-8 4v4h4M8 4v4h-4M-7 0h14"/></g><text x="134" y="771" class="nl-pill" font-size="22">Intelligent Document Parser</text></g><g><rect x="56" y="866" width="450" height="78" rx="39.0" fill="#32363F" stroke="#3F4450" stroke-width="1.1"/><circle cx="96" cy="905" r="21" fill="#263E38" stroke="#2E8468" stroke-width="1.3"/><g class="nl-ic" transform="translate(96 905)"><path d="M-8 5l5-6 4 3 6.5-8"/><path d="M9 -7l-5.5 1 4.5 4.5z" stroke="none" fill="currentColor"/></g><text x="134" y="905" class="nl-pill" font-size="22">Sales CRM</text></g></g>
    
    <!-- engine labels -->
    <text x="911" y="236" class="nl-coretitle">N E U R A L &#160;&#160; C O R E</text>
    <text x="670" y="900" class="nl-layer">ENCODE</text>
    <text x="911" y="900" class="nl-layer">REASON</text>
    <text x="1152" y="900" class="nl-layer">ROUTE</text>
    <text x="911" y="1000" class="nl-cap">Zero Trust &#183; Local Models &#183; Smart Routing &#183; Learning</text>
    
    <!-- right: intelligent agents -->
    <g><text x="1338" y="194" class="nl-rn">I</text><text x="1362" y="194" class="nl-agent" font-size="21">Conversational AI Avatar Agent</text><text x="1338" y="287.5" class="nl-rn">II</text><text x="1362" y="287.5" class="nl-agent" font-size="21">Conversational AI Voice Agent</text><text x="1338" y="381" class="nl-rn">III</text><text x="1362" y="381" class="nl-agent" font-size="21">Conversational Chat Assistant</text><text x="1338" y="474.5" class="nl-rn">IV</text><text x="1362" y="474.5" class="nl-agent" font-size="21">Document Extraction Agent</text><text x="1338" y="568" class="nl-rn">V</text><text x="1362" y="568" class="nl-agent" font-size="21">Field Validation Agent</text><text x="1338" y="661.5" class="nl-rn">VI</text><text x="1362" y="661.5" class="nl-agent" font-size="21">Language Translation Agent</text><text x="1338" y="755" class="nl-rn">VII</text><text x="1362" y="755" class="nl-agent" font-size="21">Live In-Meeting Copilot</text><text x="1338" y="848.5" class="nl-rn">VIII</text><text x="1362" y="848.5" class="nl-agent" font-size="21">Conversational Recall Agent</text><text x="1338" y="942" class="nl-rn">IX</text><text x="1362" y="942" class="nl-agent" font-size="21">CRM Conversational Assistant</text></g>
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
    <h2 class="hand">${keyed(H.COPY.mission.heading)}</h2>
    <p class="sec-lede">${esc(H.COPY.mission.body)}</p>
  </div>
</section>`;

const caps = `
<div class="caps">
  <div class="wrap">
    <h2 class="hand left">${keyed(H.COPY.capsHeading)}</h2>

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
    <h2 class="hand">${keyed(H.WHY.heading)}</h2>
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

/* THE DATE IS NO LONGER SHOWN, so the formatter that turned "2026-08-28" into
   "28 Aug 2026" is gone with it. The date is still in articles.js, still
   ordering the collection, and still what decides which three are the newest —
   it is only the printed line under the cover that went. */

/* EVERY ARTICLE IS IN THE MARKUP, and `BLOG.show` no longer decides which ones
   exist — it decides how many are visible before the reader asks for the rest.
   All eight ship in the HTML and app.js collapses the tail on load.

   THAT DIRECTION IS THE WHOLE POINT. Slicing here and linking the remainder to
   the publisher meant the other five were not on this page at all; hiding them
   in CSS means a script that fails to load leaves the reader with MORE, not
   less, which is the same bargain the nav panels and the drawer make. It is
   also why the control is rendered twice — see the note on it below. */
const SHOWN = ARTICLES;
const OPEN_COUNT = H.BLOG.show && H.BLOG.show < ARTICLES.length ? H.BLOG.show : ARTICLES.length;
const REST_COUNT = ARTICLES.length - OPEN_COUNT;

/* THE COVER. Each column has a branded editorial card — The Edge's masthead,
   the Digital Intelligence lockup, the headline and the byline, all set into
   one 16:9 graphic. Those are not on theedgemalaysia.com: the article pages
   and the author index both carry a stock photograph instead, which is what
   articles.js records in `img` and what this grid used to show.

   So the cover is looked for locally first, by node id, and the publisher's
   photograph is the fallback. Drop `815608.jpg` into assets/articles/ and that
   card starts using it on the next build with no code change. Until then the
   card is correct and complete, just not wearing the branded artwork.

   `fs.existsSync` at build time rather than a list typed here: a file that is
   present is used, a file that is not cannot 404 on a reader. */
const COVER_DIR = 'assets/articles';
function cover(a) {
  const local = `${COVER_DIR}/${a.nid}.jpg`;
  return fs.existsSync(path.join(__dirname, local))
    ? { src: local, branded: true }
    : { src: a.img, branded: false };
}
const COVERS_FOUND = ARTICLES.filter((a) => cover(a).branded).length;

/* The featured episode. Not one of the cards — see the note on FEATURE in
   home.js for why it is set apart rather than appended.

   IT IS A PICTURE UNTIL SOMEBODY WANTS THE PLAYER. `loading="lazy"` on an
   iframe was the whole of the performance story, and it was not enough: lazy
   only defers the fetch to the moment the frame nears the viewport, so a reader
   who scrolls here watches a black rectangle while YouTube's bundle — a
   megabyte or so of script across a dozen requests — negotiates. What lands
   instead is one JPEG and a play control, and the iframe is created on the
   click that asks for it, with `autoplay=1` so that click is not paid twice.

   THE POSTER IS LOOKED FOR LOCALLY FIRST, keyed by video id, exactly as an
   article cover is: a file that is present is served from our own origin and
   paints immediately, and if it is absent YouTube's own thumbnail host is the
   fallback rather than a hole. Change FEATURE.youtube and the build looks for
   the new id; drop `assets/feature-<id>.jpg` in and it starts using it with no
   code change.

   The BUTTON carries the accessible name now, and the iframe is given the same
   title when it is built — an iframe with no title is announced as "frame",
   which is the least useful thing a screen reader can say about the one piece
   of media on the page. */
const featurePoster = () => {
  const local = `assets/feature-${H.FEATURE.youtube}.jpg`;
  return fs.existsSync(path.join(__dirname, local))
    ? { src: local, local: true }
    : { src: `https://i.ytimg.com/vi/${H.FEATURE.youtube}/maxresdefault.jpg`, local: false };
};
const FEATURE_POSTER = H.FEATURE ? featurePoster() : null;

const feature = !H.FEATURE ? '' : `
    <div class="tlfeat">
      <div class="tlfeat-media">
        <button class="ytlite" type="button"
                data-yt="${esc(H.FEATURE.youtube)}"
                data-title="${esc(H.FEATURE.title)}"
                aria-label="Play: ${esc(H.FEATURE.title)}">
          <img src="${esc(FEATURE_POSTER.src)}" alt="" width="1280" height="720" loading="lazy" decoding="async">
          <span class="ytplay" aria-hidden="true"><svg width="26" height="30" viewBox="0 0 22 26"><path d="M3 2.5v21l17-10.5z" fill="#fff"/></svg></span>
        </button>
      </div>
      <div class="tlfeat-body">
        <h3 class="tlfeat-show">${esc(H.FEATURE.show)}</h3>
        <p class="tlfeat-ep">${esc(H.FEATURE.title)}</p>
        <p class="tlfeat-desc">${esc(H.FEATURE.desc)}</p>
      </div>
    </div>`;

/* THE BROADCAST APPEARANCE, under the episode. Same two-column block, and the
   media is a LINK rather than a player: there is no embeddable source for the
   CGTN segment, so the still goes out to the LinkedIn post that holds the clip.
   See the note on BROADCAST in home.js.

   THE STILL KEEPS ITS OWN RATIO. `.tlfeat-media` is 16/9 with `object-fit:
   cover` because that is a player's shape; this is a 3:2 screenshot whose
   bottom edge carries the ticker, and cropping it to 16/9 would cut exactly the
   part that says which programme this is.

   Both the media and the episode line point at the same place, and the third
   line says where that is — a play glyph that leaves the site should say so
   before it is clicked, not after.

   THE STILL ARRIVED WITH A PLAY GLYPH ALREADY IN IT — a black disc about 75px
   across, welded into the pixels — and the two items then wore two different
   play marks side by side. The disc is REMOVED from the file (ffmpeg's delogo,
   which interpolates the striped facade back over it and reads as a shallow
   depth of field) and this is the episode's own mark in its place: the same
   span, the same triangle, sized down in the stylesheet. */
const broadcast = !H.BROADCAST ? '' : `
    <div class="tlfeat tlfeat--press">
      <a class="tlfeat-media tlfeat-media--photo" href="${esc(H.BROADCAST.link)}" target="_blank" rel="noopener">
        <img src="${esc(H.BROADCAST.image)}" alt="${esc(H.BROADCAST.imageAlt)}"
             width="${H.BROADCAST.imageW}" height="${H.BROADCAST.imageH}" loading="lazy" decoding="async">
        <span class="ytplay" aria-hidden="true"><svg width="20" height="24" viewBox="0 0 22 26"><path d="M3 2.5v21l17-10.5z" fill="#fff"/></svg></span>
      </a>
      <div class="tlfeat-body">
        <h3 class="tlfeat-show">${esc(H.BROADCAST.show)}</h3>
        <p class="tlfeat-ep">${esc(H.BROADCAST.title)}</p>
        <p class="tlfeat-desc">${esc(H.BROADCAST.desc)}</p>
        <p class="tlfeat-out"><a href="${esc(H.BROADCAST.link)}" target="_blank" rel="noopener">${esc(H.BROADCAST.linkLabel)} &rarr;</a></p>
      </div>
    </div>`;

const blog = `
<section style="padding-top:0" id="insights">
  <div class="wrap">
    <h2 class="hand left">${keyed(H.COPY.blogHeading)}</h2>
    <p class="sec-lede blog-lede">${esc(H.COPY.blogLede)}</p>
${feature}
${broadcast}
    <div class="blogsel">${esc(H.BLOG.sectionLabel)}</div>
    <div class="blog" id="tl-grid">
      ${SHOWN.map((a, i) => {
        const href = articleUrl(a);
        /* Past the fold of the collapsed grid. The class is a marker only — the
           hiding is done by `.blog--collapsed` on the grid, which app.js adds,
           so the cards are visible in plain HTML. */
        const rest = i >= OPEN_COUNT ? ' post--rest' : '';
        const c = cover(a);
        /* THE ALT CARRIES THE HEADLINE, and that is a requirement rather than a
           nicety. The branded cover has the headline set INTO the artwork, and
           the card deliberately does not print it again underneath — so for
           anyone who cannot see the image the alt text is the only place the
           title exists at all. Empty alt here would leave the card announcing
           a byline and a summary for an article with no name. */
        /* The image is wrapped so the frame and the picture can move
           independently: §25 opens `.shot` as a clip while the <img> inside it
           drifts from 1.07 to 1. On one element the clip edge would scale with
           the picture and the reveal would slide instead of wipe. */
        const thumb = c.src
          ? `<span class="shot"><img class="thumb" src="${esc(c.src)}" alt="${esc(a.title)}" width="1200" height="675" loading="lazy" decoding="async"></span>`
          : `<span class="shot"><span class="thumb thumb--none" aria-hidden="true"></span></span>`;
        /* One <a> around the whole card, so the cover, the byline, the summary
           and the link all go to the same one place — the article. "Read more"
           is a span, not a second link: a link inside a link is invalid, and it
           would give the card two tab stops to the same URL. */
        return `<a class="post${rest}" ${link(href)}>
        ${thumb}
        <p class="pby">${esc(H.BLOG.byline)}</p>
        <p class="psum">${esc(a.summary)}</p>
        <span class="pmore">Read more <span aria-hidden="true">&rarr;</span></span>
      </a>`;
      }).join('\n      ')}
    </div>
    <div class="allp allp--blog">
      <!-- TWO CONTROLS, ONE VISIBLE. The anchor is what the page ships with and
           what a reader without JavaScript gets: every card is already on the
           page, and this is the route to the columns published since this build.
           app.js hides it and reveals the button, which expands the five cards
           already sitting in this grid rather than leaving the page.

           A button and not a restyled link, because after the swap it no longer
           goes anywhere — it discloses. That is what aria-expanded says, and a
           link cannot say it. -->
      <a class="blogall" ${link(PUBLISHER.authorIndex)}>${esc(H.BLOG.moreLabel)} &rarr;</a>${REST_COUNT ? `
      <button class="blogall blogmore" type="button" hidden
              aria-expanded="false" aria-controls="tl-grid"
              data-more="${esc(H.BLOG.moreLabel)} &darr;" data-less="Show less &uarr;"></button>` : ''}
    </div>
  </div>
</section>`;

const close = `
<div class="cta">
  <div class="wrap">
    <h2 class="hand" style="color:#fff">${keyed(H.COPY.close.heading)}</h2>
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
      <!-- THE PHONE NUMBERS ARE NOT IN THE FOOTER, by request. Both of
           CONTACTS held both numbers and both sat under the address here, on
           all 27 pages.
           They are still on the contact page and in the demo aside, which is
           where somebody looking for a number goes — the footer offered them to
           everybody scrolling past instead. -->
      <div class="fcol"><h4>Get in touch</h4>
        <a href="mailto:${esc(H.CONTACTS.email)}">${esc(H.CONTACTS.email)}</a>
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

    <!-- PRIVACY POLICY · TERMS · SECURITY ARE GONE, by request. All three were
         unlinked text: there is no privacy page, no terms page and no security
         page on this site, so the row named three documents a reader could not
         open. Removed rather than re-pointed — the old site's policy is not
         this site's policy. Write the pages, then put the row back. -->
    <div class="legal">
      <span>Copyright &copy; ${new Date().getFullYear()}, ${esc(COMPANY.legal)}. All rights reserved.</span>
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
      <h1 class="hand">${keyed(H.COPY.demo.heading)}</h1>
      <p class="sec-lede">${esc(H.COPY.demo.lede)}</p>

      <!-- The photograph and the gradient behind this whole page are the two
           assets carried over from the old site by request. Both are served
           locally from assets/demo/ rather than hotlinked, so this page does
           not depend on talbotiq.com staying up or keeping its uploads path. -->
      <p class="shot demoshot"><img src="assets/demo/contactus.jpg" width="1100" height="619" alt="Three colleagues talking in a Talbotiq meeting room" loading="lazy" decoding="async"></p>

      <!-- THESE THREE WORK TODAY, which is why they are on this page and not
           buried on another one. Whatever happens to the form, a reader who
           wants a demo can always reach somebody from here. -->
      <!-- THE NUMBERS ARE NOT PRINTED, THE PHONE STILL RINGS. Both of
           CONTACTS held both numbers and both were listed here, as two rows
           of digits. No
           number is displayed anywhere on this site any more, by request — so
           this is one row that DIALS the office without reading it out, which
           is the same trade the contact page's own chip row already made
           ("Call the office"). A reader on a phone taps it; a reader on a
           desktop is not being asked to copy fourteen digits by hand. -->
      <ul class="demoreach">
        <li><span>Email</span><a href="mailto:${esc(H.CONTACTS.email)}">${esc(H.CONTACTS.email)}</a></li>
        <li><span>Phone</span><a href="tel:${esc(H.CONTACTS.office.replace(/[\s-]/g, ''))}">Call the office</a></li>
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
                   or a Voice Interview enquiry arrives looking like Video. */
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
          : `<a class="btn btn-primary btn-lg dsubmit" ${link(GO.talk)}>${esc(H.COPY.demo.cta)} &rarr;</a>
        <!-- NOT WIRED YET. COMPANY.demoAction in products.js is null, so this
             button cannot POST anywhere. It used to link to the form on the old
             site, which does submit — and that was the last button on this site
             that carried a reader off it, so it now goes to our own contact
             page instead. Set demoAction to an endpoint and the same markup
             above becomes a real POST with no other change.

             NOTHING IS STRANDED BY THIS. The email and phone above are live and
             the note below repeats them, so a reader who wants a demo still has
             two routes that work today without leaving the site. The phone is
             a LINK rather than printed digits, for the reason given on the
             list above. The note is
             deliberately written for a customer, not for whoever maintains
             this: nobody buying software should be told the name of a config
             field. -->
        <p class="dnote">Prefer to talk to a person? ${esc(H.CONTACTS.email)} or <a href="tel:${esc(H.CONTACTS.office.replace(/[\s-]/g, ''))}">call the office</a>.</p>`}
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
<!-- ONE REQUEST FOR BOTH FACES. Bodoni Moda (display) and Inter (text) come
     from the same stylesheet, so the browser makes one round trip instead of
     two. opsz is requested across its full range because Bodoni Moda is a
     Didone whose hairlines thin as the size grows, and font-optical-sizing
     (auto by default) is what keeps the 76px hero from going wispy. Only
     weight 700 of the display face is used, so only 700 is asked for.

     The display face used to be self-hosted and preloaded here; it is served
     by Google now, so the preload is gone with it — a preload pointing at a
     versioned fonts.gstatic.com URL the stylesheet does not also carry would
     just download the file twice. -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,700&family=Inter:wght@400;500;600;700&display=swap">
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
      <a class="btn btn-primary" ${link(GO.talk)}>${esc(H.COPY.headerCta)}</a>
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

<!-- THE WEBSITE ASSISTANT. One line, and the same line on all twenty pages,
     including the eighteen standalone ones — which is why the src is
     root-absolute rather than depth-relative like everything else here. The
     widget posts to /api/chat, so it already requires the site to be served
     from the domain root; making the script path match adds no new constraint
     and removes the need for a ../ that differs by directory. It carries its
     own stylesheet, so there is no second <link> to place. Unstamped, so the
     eighteen pages that have no stamp() can use the identical line. -->
<script defer src="/assets/js/demoform.js"></script>
<script defer src="/assets/js/chat.js"></script>
</body>
</html>
`;

const html = page({
  /* `hero.lead` + `hero.marked` until the hero copy became a {text, keys}
     heading like the others; the two old fields no longer exist, so this was
     emitting "TalbotIQ — undefined undefined" as the page title. */
  title: `${COMPANY.name} — ${H.COPY.hero.heading.text}`,
  /* The share card has always led with the promise rather than the headline,
     and that is a deliberate difference from <title>, not an oversight. */
  ogTitle: `${COMPANY.name} — ${H.COPY.hero.lede.strong} ${H.COPY.hero.lede.rest}`,
  desc: DESC,
  body: [hero, productBand, ecosystem, mission, caps, why, blog, close].join('\n'),
});


/* =============================================================================
   THE SHELVES, FOR THE PAGES THAT ARE NOT GENERATED
   -----------------------------------------------------------------------------
   THE PROBLEM THIS SOLVES. index.html and demo.html are built here and carry
   the three panels in their markup. Every other page in the repo — about,
   contact, signin, the four solution pages, the seventeen product pages — is a
   standalone document with its own stylesheet and its own script, and none of
   them had shelves. So the menu worked exactly once: follow any link out of a
   panel and the header you landed on could not open one, and the only way back
   to the menu was the homepage. Reported as "even after clicking something in
   Solutions or Company, I should still get that dropdown", which is right.

   ONE GENERATED FILE, NOT TWENTY-FOUR INJECTIONS. The alternative was to have
   tools/fix-pages.js paste the markup, the CSS and the wiring into every page,
   which is twenty-four copies of the product list to keep in step with
   products.js. This writes assets/js/nav.js instead — the same panel markup
   this file already renders for index.html, from the same data — and each page
   gets one <script> line. A rebuild updates all of them at once.

   IT UPGRADES, IT DOES NOT REPLACE. The nav each page ships is a real nav with
   real links; with this script blocked, every page is exactly what it is today.
   Nothing is hidden behind it.

   TWO FAMILIES, TWO TREATMENTS.
     · The SITE nav — about, contact, signin, solutions/* — carries the same
       five links index.html's bar has, so its items become the three buttons
       plus Blog and Contact, and the shelves are the homepage's shelves.
     · A PRODUCT page's nav is the PRODUCT's nav: its own name, then Overview /
       Features / Trust anchors within the page. Replacing that would be taking
       away navigation to add navigation. Its name chip already draws a caret
       and links to #products, so the chip lends itself to the Products shelf
       and everything else about the bar is left alone.

   ROOT-ABSOLUTE HREFS, for the same reason the chat.js include is: one string
   has to be correct at the top level, inside products/ and inside solutions/.
   A hash on its own becomes /index.html#hash — on these pages `#products`
   names nothing local, and app.js opens the matching shelf on arrival. */
const navAbs = (h) => {
  if (!h || isExternal(h) || h.startsWith('/') || h.startsWith('mailto:') || h.startsWith('tel:')) return h;
  return h.startsWith('#') ? '/index.html' + h : '/' + h;
};
const rootAbs = (markup) => markup.replace(/href="([^"]*)"/g, (m, h) => `href="${navAbs(h)}"`);

/* Index's own bar has no Blog item; these pages do, and it is the only way to
   the columns from them. Adding the shelves is not a reason to take a
   destination away, so it stays where it is, before Contact. */
const navJsItems = rootAbs(navItems).replace(
  /(<a href="\/contact\.html")/,
  '<a href="/index.html#insights">Blog</a>\n      $1');

const navJs = `/* GENERATED by build.js — do not edit this file, edit build.js.
   The shelves for every page that build.js does NOT write. See the note on
   THE SHELVES, FOR THE PAGES THAT ARE NOT GENERATED. */
(function () {
  'use strict';

  /* a page that already has its own panels in markup: index.html, demo.html */
  if (document.querySelector('.navbtn')) return;

  var hdr = document.querySelector('header');
  var nav = hdr && hdr.querySelector('nav.mid');
  if (!nav) return;

  var PANELS = ${JSON.stringify(rootAbs(panelMarkup))};
  var ITEMS = ${JSON.stringify(navJsItems)};

  var href = '/assets/css/navpanels.css';
  if (!document.querySelector('link[href="' + href + '"]')) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  }

  var host = document.createElement('div');
  host.id = 'tqnav';
  host.innerHTML = PANELS;
  hdr.insertAdjacentElement('afterend', host);

  /* the shelf hangs off the header's real height, which is 70px here and 72 on
     the generated pages — measured rather than assumed */
  var top = function () {
    document.documentElement.style.setProperty('--tqnav-top', hdr.offsetHeight + 'px');
  };
  top();
  addEventListener('resize', top, { passive: true });

  /* ---- what opens what ------------------------------------------------- */
  var triggers = [];
  var chip = nav.querySelector('a.prod');

  if (chip) {
    /* a product page: its bar is its own, and only the name chip is borrowed */
    chip.setAttribute('aria-controls', 'panel-products');
    chip.setAttribute('aria-expanded', 'false');
    triggers.push({ btn: chip, hover: chip });
  } else {
    nav.innerHTML = ITEMS;
    /* which shelf this page lives under, so the bar says where you are — the
       page it replaced marked itself with .on and that should not be lost */
    var p = location.pathname;
    var mine = /\\/products\\//.test(p) ? 'products'
      : /\\/solutions\\//.test(p) ? 'solutions'
      : /(about|contact|signin)(\\.html)?$/.test(p) ? 'company' : '';
    nav.querySelectorAll('.navbtn').forEach(function (b) {
      if (b.dataset.panel === mine) b.classList.add('on');
      triggers.push({ btn: b, hover: b.parentNode });
    });
  }

  /* ---- open and close -------------------------------------------------- */
  /* One at a time, hover on a fine pointer, click everywhere else, a grace
     period across the gap, Escape closes. The same behaviour app.js gives the
     generated pages.

     ponytail: that logic now exists twice — there and here. It is not shared
     because app.js also owns the hairline, the drawer and the article grid,
     and these pages have their own versions of all three. If a third page
     family ever needs shelves, lift this block into its own file and have both
     load it. */
  var open = null, hideT;

  function panelOf(b) { return document.getElementById(b.getAttribute('aria-controls')); }
  function set(b, on) {
    var p = panelOf(b);
    if (!p) return;
    p.hidden = !on;
    b.setAttribute('aria-expanded', String(on));
  }
  function show(b) {
    clearTimeout(hideT);
    if (open === b) return;
    if (open) set(open, false);
    set(b, true);
    open = b;
  }
  function hide() {
    clearTimeout(hideT);
    if (!open) return;
    set(open, false);
    open = null;
  }

  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  triggers.forEach(function (t) {
    var p = panelOf(t.btn);
    if (!p) return;

    if (fine) {
      t.hover.addEventListener('mouseenter', function () { show(t.btn); });
      t.hover.addEventListener('mouseleave', function () { hideT = setTimeout(hide, 160); });
      p.addEventListener('mouseenter', function () { clearTimeout(hideT); });
      p.addEventListener('mouseleave', function () { hideT = setTimeout(hide, 160); });

      /* A MOUSE CLICK MUST NOT TOGGLE: the pointer is already hovering, so the
         shelf is already open and a toggle would shut what was just aimed at.
         detail === 0 is the tell that the click came from the keyboard, and
         that one does toggle, because nothing hovered to open it.

         The product chip is a LINK, so its mouse click is left to the browser
         — it goes to the product grid, which is what the chip has always
         promised. Only its keyboard click opens the shelf in place. */
      t.btn.addEventListener('click', function (e) {
        if (e.detail !== 0) { if (t.btn.tagName !== 'A') e.preventDefault(); return; }
        e.preventDefault();
        if (open === t.btn) hide(); else show(t.btn);
      });
    } else {
      /* no hover: the first tap opens the shelf, and on the chip that means
         the tap must not also follow the link */
      t.btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (open === t.btn) hide(); else show(t.btn);
      });
    }

    /* following a link inside a shelf closes it */
    p.addEventListener('click', function (e) {
      if (e.target.closest('a')) hide();
    });
  });

  function outside(el) {
    return !el.closest('.navitem') && !el.closest('.panel') && !el.closest('a.prod');
  }
  addEventListener('click', function (e) { if (open && outside(e.target)) hide(); });
  addEventListener('focusin', function (e) { if (open && outside(e.target)) hide(); });
  addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !open) return;
    var b = open;
    hide();
    b.focus();
  });
}());
`;

fs.writeFileSync(path.join(__dirname, 'assets', 'js', 'nav.js'), navJs, 'utf8');

fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf8');

const demoHtml = page({
  /* a <title> is plain text — the sentence, never the keyed markup */
  title: `${H.COPY.demo.heading.text} — ${COMPANY.name}`,
  desc: H.COPY.demo.lede,
  body: demoBody,
});
fs.writeFileSync(path.join(__dirname, 'demo.html'), demoHtml, 'utf8');

const linked = H.TILES.filter((t) => tileHref(t)).length;
const soon = [...H.SOLUTIONS, ...H.COMPANY_LINKS, ...H.RESOURCES].filter((x) => !x.url).length;
console.log(
  `demo.html  — ${(Buffer.byteLength(demoHtml) / 1024).toFixed(1)}kB · `
  + `${H.TILES.length + 1} products to choose from · `
  + `${DEMO_ACTION ? 'posts to ' + DEMO_ACTION : 'NOT WIRED — the submit is a local link, so a filled-in form is lost'}`
);
console.log(
  `index.html — ${(Buffer.byteLength(html) / 1024).toFixed(1)}kB · `
  + `${H.TILES.length} products (${linked} linked, ${H.TILES.length - linked} awaiting a destination) · `
  + `${H.CAPABILITIES.length} capability cards · ${SHOWN.length} of ${ARTICLES.length} articles`
  /* Says out loud whether the branded covers have been dropped into
     assets/articles/ yet, so a build that is quietly still showing the
     publisher's stock photographs cannot look like a finished one. */
  + ` (${COVERS_FOUND} of ${ARTICLES.length} branded covers${COVERS_FOUND < ARTICLES.length ? ` — rest fall back to the publisher's photo, see ${COVER_DIR}/README.md` : ''})`
  /* And whether that episode's poster is being served from our own origin or
     still being fetched from YouTube's thumbnail host on every load. */
  + `${H.FEATURE ? ` + 1 featured episode (poster: ${FEATURE_POSTER.local ? FEATURE_POSTER.src : "YouTube's thumbnail host — drop assets/feature-" + H.FEATURE.youtube + '.jpg in to serve it locally'})` : ''} · `
  + `${soon} footer/nav entries marked "soon"`
  + ` · ${H.WHY.points.length} reasons to lead with TALBOTIQ`
);

/* THE ASSISTANT'S KNOWLEDGE IS PART OF THE BUILD, not a thing to remember.
   It drifted three times while it was being written: pages were renamed and
   three more appeared, and a corpus built by hand an hour earlier would have
   had the assistant confidently describing copy nobody could see any more.
   Run last, because it crawls from the index.html written above. It prints its
   own line and exits non-zero if a page yields no readable text, so a broken
   extraction fails the build rather than shipping a stale answer. */
require('./tools/build-knowledge.js');
