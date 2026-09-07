/* =============================================================================
   BUILD — products.js + home.js  ->  index.html      (zero dependencies)
   -----------------------------------------------------------------------------
   The design is mockup-homepage.html. Structure, top to bottom:

     header        logo · five nav items, three of which open a panel · Book a demo
     hero          one display line with the highlighter on its last clause
     #products     the eight tiles, on the grey band
     #ecosystem    the suite's own claim, in its own tinted band
     mission       "Technology is a tool. (Intelligence) is the edge."
     trust         four client logos, looping (React Bits' LogoLoop, ported)
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

/* ---- integrity checks: fail the build, not the page -------------------- */
{
  const bad = [];
  for (const t of H.TILES) {
    if (!BY_SLUG.has(t.slug)) bad.push(`tile "${t.name}" points at unknown slug "${t.slug}"`);
    if (!t.tagline) bad.push(`tile "${t.name}" has no tagline`);
    if (!t.icon) bad.push(`tile "${t.name}" has no icon`);
  }
  if (H.TILES.length !== new Set(H.TILES.map((t) => t.slug)).size) bad.push('two tiles share a slug');
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
  if (bad.length) {
    console.error('\nBUILD FAILED\n' + bad.map((b) => '  · ' + b).join('\n') + '\n');
    process.exit(1);
  }
}

/* WHERE THINGS POINT. Collected here so every destination on the page is
   decided in one place and can be checked at a glance.

   `demo` is the inquiry form and `talk` is the contact page — a demo request
   and a general enquiry are different asks, and the site has a page for each.

   `signin` is the honest answer to a real gap: there are eight applications on
   six different hosts and no single sign-on, so "Sign in" cannot go to one
   login. It goes to the tile grid, which is where you pick the app you want.
   The day an SSO exists, this is the one line that changes. */
const GO = {
  /* `demo` stays on talbotiq.com/inquiry-now/ because that form actually
     works. `talk` is the LOCAL contact page: its phone, email and WhatsApp
     links are live, so it is useful even though its own form is not wired. */
  demo: COMPANY.inquiry,
  talk: 'contact.html',
  signin: '#products',
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
   THING. Axiom has no link because it is not built yet — that is "soon", and
   saying so is useful. The Private AI Engine has no link because its console
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
      <path d="M132 8 C 66 2, 8 20, 12 42 C 16 66, 104 76, 170 72 C 232 68, 254 50, 246 32 C 239 16, 196 6, 150 7" fill="none" stroke="${H.PALETTE.teal}" stroke-width="4.2" stroke-linecap="round"/>
    </svg>`;

/* the ruled underline under the capability heading */
const UNDERLINE = `<svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
      <path d="M3 9 C 50 3, 130 12, 197 5" fill="none" stroke="${H.PALETTE.blue}" stroke-width="4.4" stroke-linecap="round"/>
    </svg>`;

/* the squiggle under the blog heading */
const SQUIGGLE = `<svg viewBox="0 0 150 14" preserveAspectRatio="none" aria-hidden="true">
      <path d="M3 8 q 12 -7 24 0 t 24 0 t 24 0 t 24 0 t 24 0" fill="none" stroke="${H.PALETTE.teal}" stroke-width="3.6" stroke-linecap="round"/>
    </svg>`;

/* the star on every capability card */
const STAR = `<div class="star"><div class="glow"></div>
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <path d="M13 2 l3.4 7.2 l7.6 .9 l-5.6 5.3 l1.5 7.6 l-6.9 -3.8 l-6.9 3.8 l1.5 -7.6 l-5.6 -5.3 l7.6 -.9 z" fill="${H.PALETTE.yellow}" stroke="${H.PALETTE.ink || '#1F2430'}" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
        </div>`;

const icon = (t, px) =>
  `<svg width="${px}" height="${px}" viewBox="0 0 56 56" aria-hidden="true" focusable="false">${t.icon}</svg>`;

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

const tiles = H.TILES.map((t) => {
  const href = tileHref(t);
  const inner = `<div class="card">${icon(t, 56)}</div>
        <span class="nm">${esc(t.name)}</span>
        <span class="ds">${esc(t.tagline)}</span>`;
  return href
    ? `<a class="tile" href="${esc(href)}"${isExternal(href) ? ' target="_blank" rel="noopener"' : ''}>
        ${inner}
      </a>`
    : `<div class="tile" aria-disabled="true">
        ${inner}
      </div>`;
}).join('\n      ');

const productBand = `
<div class="band" id="products">
  <div class="wrap">
    <div class="grid8">
      ${tiles}
    </div>
    <div class="allp"><a ${link(GO.allProducts)}>${esc(H.COPY.allProducts)} &rarr;</a></div>
  </div>
</div>`;

const ecosystem = `
<div class="eco" id="ecosystem">
  <div class="wrap">
    <div class="eyebrow">${esc(H.COPY.ecosystem.eyebrow)}</div>
    <p>${esc(H.COPY.ecosystem.body)}</p>
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

/* ---- the trusted-by row ------------------------------------------------
   Each logo sits in its own fixed-height box, so a row of assets with four
   different aspect ratios still reads as one line. `--s` scales a single
   logo's height when its lockup needs it — see Total IT Global in home.js.
   `alt` is the company name because that IS the content here: the section's
   whole claim is which companies these are.

   With the loop on, the markup is LogoLoop's — .logoloop > __track > __list —
   and the server writes exactly ONE sequence. `assets/js/logo-loop.js` clones
   it as many times as the container needs. That ordering is deliberate: if
   the script never runs, the one real sequence is still a correct, centred
   row of logos, which is what this section was before the loop. */
function logoItem(c) {
  const st = c.scale && c.scale !== 1 ? ` style="--s:${Number(c.scale)}"` : '';
  const inner = c.logo
    ? `<img src="${esc(c.logo)}" alt="${esc(c.name)}" loading="lazy" decoding="async" draggable="false">`
    : `<span class="plate">${esc(c.name)}</span>`;
  return `<li class="logoloop__item logo"${st}>${inner}</li>`;
}

const L = H.LOGO_LOOP || { enabled: false };

const loopClasses = ['logoloop', 'logoloop--horizontal']
  .concat(L.fadeOut ? ['logoloop--fade'] : [])
  .concat(L.scaleOnHover ? ['logoloop--scale-hover'] : [])
  .join(' ');

const loopVars = [
  `--logoloop-gap:${Number(L.gap ?? 32)}px`,
  L.fadeOutColor ? `--logoloop-fadeColor:${esc(L.fadeOutColor)}` : '',
].filter(Boolean).join(';');

const trust = `
<div class="trust">
  <div class="wrap">
    <p class="lbl">${esc(H.COPY.trustLabel)}</p>
    ${L.enabled ? `<div class="${loopClasses}" style="${loopVars}"
      role="region" aria-label="${esc(L.ariaLabel || 'Partner logos')}"
      data-speed="${Number(L.speed ?? 120)}"
      data-direction="${L.direction === 'right' ? 'right' : 'left'}"${
        L.hoverSpeed === undefined ? '' : `\n      data-hover-speed="${Number(L.hoverSpeed)}"`}>
      <div class="logoloop__track">
        <ul class="logoloop__list" role="list">
          ${H.CLIENTS.map(logoItem).join('\n          ')}
        </ul>
      </div>
    </div>` : `<ul class="logos" role="list">
      ${H.CLIENTS.map(logoItem).join('\n      ')}
    </ul>`}
  </div>
</div>`;

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
        <h3>${esc(pt.title)}</h3>
        <p>${esc(pt.body)}</p>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`;

/* ---- the blog: real published columns ---------------------------------
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
    <div class="blog">
      ${SHOWN.map((a) => {
        const d = showDate(a.date);
        const href = articleUrl(a);
        /* alt="" — the headline sits right beside the image and repeating it
           would make a screen reader say the same sentence twice. The image
           carries no information the card does not already state. */
        const thumb = a.img
          ? `<img class="thumb" src="${esc(a.img)}" alt="" width="1200" height="800" loading="lazy" decoding="async">`
          : '<div class="thumb thumb--none" aria-hidden="true"></div>';
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
    <img src="${LOGO}" alt="${esc(COMPANY.name)}" width="262" height="72">
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

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(COMPANY.name)} — ${esc(H.COPY.hero.lead)} ${esc(H.COPY.hero.marked)}</title>
<meta name="description" content="${esc(DESC)}">
<meta name="theme-color" content="${H.PALETTE.teal}">
${COMPANY.pageUrl ? `<link rel="canonical" href="${esc(COMPANY.pageUrl)}">\n<meta property="og:url" content="${esc(COMPANY.pageUrl)}">` : '<!-- no canonical: COMPANY.pageUrl is null until this page has a home -->'}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(COMPANY.name)} — ${esc(H.COPY.hero.lede.strong)}">
<meta property="og:description" content="${esc(DESC)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<!-- the display face is self-hosted and used by the very first line of the
     page, so it is preloaded rather than discovered late in the stylesheet -->
<link rel="preload" href="assets/fonts/MeshedDisplay-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${stamp('assets/css/talbotiq.css')}">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header id="hdr">
  <div class="hdr">
    <a class="logo" href="${esc(COMPANY.site)}" aria-label="${esc(COMPANY.name)} home">
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
${hero}
${productBand}
${ecosystem}
${mission}
${trust}
${caps}
${why}
${blog}
${close}
</main>
${footer}

<script src="${stamp('assets/js/app.js')}" defer></script>
<script src="${stamp('assets/js/logo-loop.js')}" defer></script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf8');

const linked = H.TILES.filter((t) => tileHref(t)).length;
const soon = [...H.SOLUTIONS, ...H.COMPANY_LINKS, ...H.RESOURCES, ...H.LEGAL].filter((x) => !x.url).length;
console.log(
  `index.html — ${(Buffer.byteLength(html) / 1024).toFixed(1)}kB · `
  + `${H.TILES.length} products (${linked} linked, ${H.TILES.length - linked} awaiting a destination) · `
  + `${H.CAPABILITIES.length} capability cards · ${SHOWN.length} of ${ARTICLES.length} articles · `
  + `${soon} footer/nav entries marked "soon"`
  + ` · ${H.WHY.points.length} reasons to lead with TALBOTIQ`
);
