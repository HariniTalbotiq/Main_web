/* =============================================================================
   BUILD — products.js -> index.html      (zero dependencies:  node build.js)
   -----------------------------------------------------------------------------
   The page is an instrument. Its spine is THE BUS: seven products as seven
   channels tapping one engine. It is rendered exactly twice — compact in the
   hero as the opening statement, and full-scale in chapter 07 as the payoff —
   and it is the only figure on the page that appears more than once. The close
   returns to the ecosystem as a typographic roll-call instead, because a third
   render of the same table would read as filler.

   Every chapter has its OWN composition function. None of them share a card.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { COMPANY, CATEGORIES, PRODUCTS: ALL, LIFECYCLE } = require('./products.js');

const PRODUCTS = ALL.filter((p) => !p.hidden);

/* ---- integrity checks: fail the build, not the page -------------------- */
for (const p of PRODUCTS) {
  if (!CATEGORIES.some((c) => c.id === p.category)) {
    throw new Error(`products.js: "${p.slug}" has category "${p.category}", not in CATEGORIES`);
  }
  if (!Array.isArray(p.features)) p.features = [];
}
{
  const seen = new Map();
  for (const p of PRODUCTS.filter((x) => x.chapter)) {
    if (seen.has(p.chapter)) throw new Error(`products.js: chapter ${p.chapter} used by both "${seen.get(p.chapter)}" and "${p.slug}"`);
    seen.set(p.chapter, p.slug);
  }
}

/* ---- helpers ------------------------------------------------------------ */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const hex = (c) => (/^#[0-9a-fA-F]{3,8}$/.test(c || '') ? c : 'currentColor');
const pad = (n) => String(n).padStart(2, '0');
const byCat = (id) => PRODUCTS.filter((p) => p.category === id);
const bySlug = (s) => PRODUCTS.find((p) => p.slug === s);
const catName = (p) => (CATEGORIES.find((c) => c.id === p.category) || {}).name || '';
const WORDS = ['zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const word = (n) => WORDS[n] || String(n);

const CHAPTERS = PRODUCTS.filter((p) => p.chapter).sort((a, b) => a.chapter - b.chapter);
const LINKED = PRODUCTS.filter((p) => p.url);
const METERED = PRODUCTS.filter((p) => p.bus && p.bus.headroom != null);
const ENGINE = PRODUCTS.find((p) => p.story && p.story.kind === 'engine');
/* The business applications — the suite the engine sits under. The hero
   counts THESE, not PRODUCTS, because the headline says "one engine
   underneath" and it would be odd to count the engine among the things it
   is underneath. */
/* Ordered the way the page reads them, so the tile row and the chapters
   below it are in the same order. Anything without a chapter goes last. */
const APPS = PRODUCTS.filter((p) => p !== ENGINE)
  .sort((a, b) => (a.chapter || 99) - (b.chapter || 99));
const label = (p) => p.short || p.name.replace(/^TalbotIQ /, '');
const linkOf = (p) => p.url || p.productPage || null;
const ACCESS = {
  site: 'Public product site', app: 'Sign-in required',
  internal: 'Internal console', 'pending-url': 'Product page',
};

/* multi-line display statements are authored with \n in products.js */
const lines = (s) => esc(s).split('\n').join('<br>');

/* the one glyph we allow, and only where an arrow IS the affordance */
const TICK = '<i aria-hidden="true"></i>';

/* Leaves the site. A corner of a box rotated 45deg reads as a caret at 7px,
   so this one is drawn with a shaft. */
const OUT = `<svg class="out" viewBox="0 0 12 12" width="11" height="11" fill="none"
  stroke="currentColor" stroke-width="1.3" stroke-linecap="round"
  aria-hidden="true" focusable="false"><path d="M4 8 8.25 3.75"/>
  <path d="M4.75 3.5h3.75v3.75"/></svg>`;

/* every made-up specimen says so, right under the artwork */
const caveat = (p) => (p.illustrative ? `<p class="caveat">${esc(p.illustrative)}</p>` : '');

/* ---- THE APP MARKS ----------------------------------------------------- */
/* One mark per product, drawn rather than sourced, because a multi-app company
   is unreadable without them — you cannot recognise a suite you cannot point
   at. Two rules hold the family together:
     1. every mark is derived from what its product actually DOES, not from a
        generic icon vocabulary, so the funnel really is a funnel and the
        engine really is the bus this page is built on;
     2. every mark carries ONE shape in the shared engine green. That is the
        ecosystem claim drawn into the icon set itself — seven products, and
        the same green in all seven.
   Flat, geometric, two-tone, no strokes except where a stroke IS the subject
   (PMS, whose dashed outline says "registered, unspecified"). */
const MARKS = {
  /* an interview: two turns, overlapping */
  mimic: `<rect x="3" y="4" width="18" height="15" rx="4.5" fill="var(--mk)"/>
    <rect x="11" y="13" width="18" height="15" rx="4.5" fill="var(--mk-2)"/>`,

  /* deliberately undetermined: a registered key and nothing claimed */
  pms: `<rect x="4.25" y="4.25" width="23.5" height="23.5" rx="6.5" fill="none"
      stroke="var(--mk)" stroke-width="2.5" stroke-dasharray="5.5 4.5" stroke-linecap="round"/>
    <circle cx="16" cy="16" r="3.75" fill="var(--mk-2)"/>`,

  /* a meeting, and the record struck through it */
  recapr: `<rect x="5" y="9" width="4" height="14" rx="2" fill="var(--mk)"/>
    <rect x="14" y="3.5" width="4" height="25" rx="2" fill="var(--mk)"/>
    <rect x="23" y="11" width="4" height="10" rx="2" fill="var(--mk)"/>
    <rect x="2.5" y="14.25" width="27" height="3.5" rx="1.75" fill="var(--mk-2)"/>`,

  /* the pipeline, narrowing — the same funnel the chapter draws */
  nouscrm: `<rect x="4" y="5.5" width="24" height="5.5" rx="2.75" fill="var(--mk)"/>
    <rect x="7.5" y="13.25" width="17" height="5.5" rx="2.75" fill="var(--mk)" opacity=".58"/>
    <rect x="11" y="21" width="10" height="5.5" rx="2.75" fill="var(--mk-2)"/>`,

  /* work leaving the board */
  'task-manager': `<rect x="3.5" y="4" width="19" height="19" rx="5.5" fill="var(--mk)" opacity=".5"/>
    <path d="M10.5 17.5 L16.25 23.25 L28.5 7.5" fill="none" stroke="var(--mk-2)"
      stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,

  /* a document shedding structured fields */
  lexerai: `<path d="M7 3.5h9.5L23 10v16.5a2.5 2.5 0 0 1-2.5 2.5H7a2.5 2.5 0 0 1-2.5-2.5V6A2.5 2.5 0 0 1 7 3.5z"
      fill="var(--mk)" opacity=".52"/>
    <rect x="13.5" y="13.5" width="16.5" height="3.75" rx="1.875" fill="var(--mk-2)"/>
    <rect x="13.5" y="20.25" width="11" height="3.75" rx="1.875" fill="var(--mk-2)" opacity=".62"/>`,

  /* the bus itself: three products tapping one engine */
  'ai-engine': `<rect x="8" y="5.5" width="3.75" height="11" rx="1.875" fill="var(--mk)"/>
    <rect x="14.125" y="5.5" width="3.75" height="11" rx="1.875" fill="var(--mk)"/>
    <rect x="20.25" y="5.5" width="3.75" height="11" rx="1.875" fill="var(--mk)"/>
    <rect x="4" y="18" width="24" height="10" rx="3.25" fill="var(--mk-2)"/>`,
};

/* --mk is the product's own colour, --mk-2 the shared engine green. The engine
   itself inverts the pair, so the green is the slab and the taps are neutral. */
function mark(p, size) {
  const body = MARKS[p.slug];
  if (!body) return '';
  const pair = p.slug === 'ai-engine'
    ? `--mk:${hex(COMPANY.markNeutral)};--mk-2:${hex(COMPANY.markGreen)}`
    : `--mk:${hex(p.accent)};--mk-2:${hex(COMPANY.markGreen)}`;
  return `<svg class="mk" viewBox="0 0 32 32" width="${size}" height="${size}"
    style="${pair}" aria-hidden="true" focusable="false">${body}</svg>`;
}

/* the app tile: a mark on a white chip, the way a suite lets you point at one */
function tile(p) {
  const href = linkOf(p) || `#c-${p.slug}`;
  const ext = p.url ? ' target="_blank" rel="noopener"' : '';
  return `<a class="tile" href="${esc(href)}"${ext} style="--accent:${hex(p.accent)}">
    <span class="tile__chip">${mark(p, 40)}</span>
    <span class="tile__nm">${esc(label(p))}</span>
    <span class="tile__cat">${esc((CATEGORIES.find((c) => c.id === p.category) || {}).name || '')}</span>
  </a>`;
}

/* ---- THE PEEK — one small readout, rendered in two places -------------- */
/* Reused by the mega-menu preview pane and the explorer pane. Products get a
   real glimpse of their own interface without a screenshot pipeline. */
function peek(p) {
  if (!p.peek) {
    return `<div class="peek"><p class="peek__none">Nothing to preview. ${esc(p.position)}.</p></div>`;
  }
  const k = p.peek;
  const out = [`<div class="peek__hd"><i></i>${esc(label(p))}<s>${esc(k.chrome)}</s></div>`];
  if (k.tabs) {
    out.push(`<div class="peek__tabs">${k.tabs.map((t, i) =>
      `<span${i === k.on ? ' class="on"' : ''}>${esc(t)}</span>`).join('')}</div>`);
  }
  if (k.quote) {
    out.push(`<p class="peek__q">${esc(k.quote)}</p>`);
    if (k.stamp) out.push(`<p class="peek__st">${esc(k.stamp)}</p>`);
  }
  if (k.meters) {
    out.push(`<div class="peek__m">${k.meters.map(([n, v]) =>
      `<div>${esc(n)}<b>${v}</b></div><i style="--v:${v}%"></i>`).join('')}</div>`);
  }
  if (k.bars) {
    out.push(`<div class="peek__bars" aria-hidden="true">${k.bars.map((v) =>
      `<i style="height:${v}%"></i>`).join('')}</div>`);
  }
  if (k.kv) {
    out.push(`<dl class="kv">${k.kv.map(([a, b]) =>
      `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>`);
  }
  return `<div class="peek" style="--accent:${hex(p.accent)}">${out.join('')}</div>`;
}

/* ---- THE BUS — the signature ------------------------------------------- */
/* Seven channels on one spine, and the engine underneath them. Only the three
   bar is BINARY: full for a product the console registers, empty for one it
   does not. It used to show a headroom percentage, which was an invented
   number carrying a note admitting it was invented. The real fact — on the
   engine, or not yet — needs no note and cannot be misread. */
function bus({ variant = 'hero', chrome, cta = true } = {}) {
  const rows = APPS.map((p, i) => {
    const b = p.bus || {};
    const metered = b.headroom != null;
    /* aria-hidden: .ch__tag beside it already says "metered" or "not yet" in
       words, so the bar is reinforcement, not information */
    const gauge = `<span class="gauge" aria-hidden="true">${metered ? '<i></i>' : ''}</span>`;
    const tag = `<span class="ch__tag">${metered ? 'metered' : 'not yet'}</span>`;
    return `<div class="ch" style="--accent:${hex(p.accent)};--d:${(i * 0.075).toFixed(3)}s">
      <span class="ch__n">${p.chapter ? pad(p.chapter) : ''}</span>
      <span class="ch__nm">${mark(p, 20)}<b>${esc(label(p))}</b></span>
      <span class="ch__r">${tag}${gauge}</span>
    </div>`;
  }).join('');

  const eng = PRODUCTS.find((p) => p.slug === 'ai-engine');
  const engRow = eng ? `<div class="bus__eng" style="--accent:${hex(eng.accent)}">
    <span class="nom">engine</span>
    <span><b>${esc(eng.name)}</b><small>the intelligence under all of them</small></span>
    ${cta && eng.url ? `<a class="go" href="#c-ai-engine">What it does${TICK}</a>` : ''}
  </div>` : '';

  return `<figure class="bus${variant === 'full' ? ' bus--full' : ''}" data-bus>
    <figcaption class="bus__hd">${esc(chrome || 'The suite')}</figcaption>
    <div class="bus__body">
      <span class="bus__spine" aria-hidden="true"></span>
      ${rows}
      ${engRow}
    </div>
  </figure>`;
}

/* ---- CHAPTER HEAD ------------------------------------------------------ */
function head(p) {
  return `<header class="chap__hd">
    <div>
      <div class="chap__id">
        <span class="chap__mk">${mark(p, 30)}</span>
        <span class="chap__nm">${esc(label(p))}</span>
        <span class="nom nom--accent">${pad(p.chapter)}</span>
        <span class="rule"></span>
      </div>
      <h2 class="dsp dsp--lg" id="h-${esc(p.slug)}">${lines(p.statement)}</h2>
    </div>
    <div>
      <p class="body">${esc(p.description)}</p>
    </div>
  </header>`;
}

function foot(p) {
  const href = linkOf(p);
  const ext = p.url ? ' target="_blank" rel="noopener"' : '';
  const open = href ? `<div class="chap__ft">
    <a class="go" href="${esc(href)}"${ext}>${esc(p.cta || 'Open')}${TICK}</a>
    <p class="fine">${esc(ACCESS[p.access] || '')}</p>
  </div>` : '';
  return open + swap(p);
}

/* ---- THE SWITCHER — no chapter is a dead end ---------------------------
   Every chapter ends with the two products either side of it and a way into
   all of them. It WRAPS: the last chapter's "next" is chapter one, so the
   page has no terminal position you have to scroll back out of.

   The middle control is a link to the suite that the launcher upgrades in
   place, so it works with the script and without it. */
function swap(p) {
  const i = CHAPTERS.indexOf(p);
  const at = (n) => CHAPTERS[(n + CHAPTERS.length) % CHAPTERS.length];
  const side = (q, dir) => `<a class="swap__a swap__a--${dir}" href="#c-${esc(q.slug)}"
    style="--accent:${hex(q.accent)}">
    <i class="swap__i" aria-hidden="true"></i>
    <span class="swap__x">
      <em>${dir === 'prev' ? 'Previous' : 'Next'}</em>
      <b>${esc(label(q))}</b>
      <s>${esc(q.position)}</s>
    </span>
    <span class="swap__mk">${mark(q, 30)}</span>
  </a>`;
  return `<nav class="swap" aria-label="Move to another product">
    ${side(at(i - 1), 'prev')}
    <a class="swap__all" href="#suite" data-cmd>
      <span>Explore another product</span>
      <s>all ${word(CHAPTERS.length).toLowerCase()}</s>
      <kbd data-k>${KBD}</kbd>
    </a>
    ${side(at(i + 1), 'next')}
  </nav>`;
}

/* The shortcut is written for a Mac and corrected to Ctrl by app.js on
   everything else — the platform is not knowable at build time. */
const KBD = '⌘ K';

/* ---- COMPOSITIONS — one per chapter, no two alike --------------------- */
const COMPOSE = {
  /* 01 · MIMIC — the evidence link, drawn as a link.
     The product's real differentiator is that every score points at the
     sentence that earned it, so the composition is a quote next to the three
     numbers that cite it. */
  mimic(p) {
    const s = p.scored;
    const quote = s.quote.map((x) => (typeof x === 'string' ? esc(x) : `<mark>${esc(x.mark)}</mark>`)).join('');
    return `<div class="mimic">
      <div class="plate">
        <div class="plate__bar"><u></u><u></u><u></u>Mimic<s>${esc(p.peek.chrome)}</s></div>
        <div class="mimic__q" data-lit>
          <blockquote>${quote}</blockquote>
          <div class="mimic__meta">
            ${s.meta.map((m) => `<p class="nom">${esc(m)}</p>`).join('')}
          </div>
        </div>
        <div class="plate__in" style="border-top:1px solid var(--rule)">
          <div class="crit" data-lit>
            ${s.criteria.map(([n, v, src]) => `<div class="crit__r">
              <div class="crit__t"><span>${esc(n)}</span><b>${v}</b></div>
              <div class="crit__b" style="--v:${v}%"><i></i></div>
              <span class="crit__src">${esc(src)}</span>
            </div>`).join('')}
          </div>
          <div class="mimic__out">
            <span>${esc(s.out[0])}</span><b>${esc(s.out[1])}</b>
          </div>
          <p class="fine" style="margin-top:.75rem">${esc(s.outNote)} ${esc(s.arith)}</p>
        </div>
      </div>

      <aside class="mimic__aside">
        <div class="mimic__fmt">
          <p class="nom">six formats</p>
          <ul>${p.formats.map(([n, kind]) => `<li>${esc(n)}<b>${esc(kind)}</b></li>`).join('')}</ul>
          <p class="fine" style="margin-top:.5rem">${esc(p.formatsNote)}</p>
        </div>
        <div>
          <p class="nom">governance</p>
          <p class="body" style="margin-top:.625rem;font-size:.9375rem">One rubric, applied identically to every applicant. Weights rescale to 100%. Every decision is written to audit history — and <span class="said">Mimic never rejects anyone</span>.</p>
        </div>
      </aside>
    </div>
    ${caveat(p)}`;
  },

  /* 02 · PMS — the honest blank.
     Straight after Mimic's density, a near-empty screen. It is the strongest
     credibility move on the page and it costs one composition. */
  /* 03 · RECAPR — time, and only here, runs left to right. */
  recapr(p) {
    const wave = Array.from({ length: 112 }, (_, i) => {
      const h = 14 + Math.round(Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23)) * 86);
      return `<i class="${i > 21 && i < 31 ? 'hot' : ''}" style="--h:${h}%"></i>`;
    }).join('');
    const c = p.contra;
    return `<div class="tl">
      <div class="tl__axis">
        <span class="nom">00:00</span><i></i>
        <span class="nom nom--accent">23:30 — the decision</span><i></i>
        <span class="nom">41:12</span>
      </div>
      <div class="wave" data-lit aria-hidden="true">${wave}</div>

      <div class="turns" data-lit>
        ${p.stages.map((s, i) => `<article class="turn">
          <div class="turn__k"><span class="nom nom--accent">${pad(i + 1)}</span><span class="nom">${esc(s.k)}</span></div>
          <h3>${esc(s.t)}</h3>
          <p>${esc(s.d)}</p>
          <div class="turn__ui"><b>${esc(s.ui[0])}</b>${esc(s.ui[1])}</div>
        </article>`).join('')}
      </div>

      <div class="contra">
        <div class="contra__s">
          <blockquote>&ldquo;${esc(c.a.q)}&rdquo;</blockquote>
          <p class="nom">${esc(c.a.stamp)}</p>
        </div>
        <div class="contra__v">contradicts</div>
        <div class="contra__s">
          <blockquote>&ldquo;${esc(c.b.q)}&rdquo;</blockquote>
          <p class="nom">${esc(c.b.stamp)}</p>
        </div>
        <p class="contra__note">${esc(c.note)}</p>
      </div>
    </div>
    ${caveat(p)}`;
  },

  /* 04 · NOUSCRM — the funnel drawn to scale, running off the right edge.
     Each stage's width AND height is its share of the pipeline, so the shape
     is the data. No two-tone placeholder cards: an opportunity nobody can
     name is better drawn as area than as a fake row. */
  crm(p) {
    const max = Math.max(...p.stages.map((s) => s.v));
    const sum = p.stages.reduce((a, s) => a + s.v, 0);
    const m = p.modules;
    return `<div class="pipe" data-lit>
      <div class="pipe__band">
        ${p.stages.map((s) => `<div class="stage"
          style="--w:${((s.v / sum) * 100).toFixed(1)}%;--h:${(38 + (s.v / max) * 62).toFixed(0)}%">
          <span class="stage__n">${s.v}</span>
          <span class="stage__l">${esc(s.n)}</span>
        </div>`).join('')}
      </div>
      <div class="pipe__axis">
        <span class="nom">${sum} open opportunities</span><i></i>
        <span class="nom">width and height are each stage&rsquo;s share</span>
      </div>
    </div>
    <div class="crm__foot">
      <div>
        <p class="nom">modules that answer</p>
        <div class="modules" style="margin-top:.75rem">${m.on.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
        <p class="nom" style="margin-top:1.5rem">what the dashboard actually reports</p>
        <div class="apis">${['opportunity-by-stage', 'opportunity-source', 'rep-target', 'sales-team-performance']
          .map((x) => `<code>${esc(x)}</code>`).join('')}</div>
      </div>
      <div>
        <p class="nom">modules that do not exist</p>
        <div class="modules" style="margin-top:.75rem">${m.off.map((x) => `<span class="off">${esc(x)}</span>`).join('')}</div>
        <p class="fine" style="margin-top:.75rem">${esc(m.offNote)}</p>
      </div>
    </div>
    ${caveat(p)}`;
  },

  /* 05 · TASK — one raw request becoming a structured brief. */
  task(p) {
    const t = p.triage;
    return `<div class="triage" data-lit>
      <div class="triage__in">
        <p class="nom">${esc(t.in.label)}</p>
        <p>${esc(t.in.text)}</p>
      </div>
      <div class="triage__w" aria-hidden="true">
        <svg viewBox="0 0 44 120" preserveAspectRatio="none" fill="none">
          <path d="M0 60 C 22 60, 22 14, 44 14"  stroke="currentColor" stroke-width="1"/>
          <path d="M0 60 C 22 60, 22 40, 44 40"  stroke="currentColor" stroke-width="1"/>
          <path d="M0 60 C 22 60, 22 66, 44 66"  stroke="currentColor" stroke-width="1"/>
          <path d="M0 60 C 22 60, 22 92, 44 92"  stroke="currentColor" stroke-width="1"/>
          <path d="M0 60 C 22 60, 22 116, 44 116" stroke="currentColor" stroke-width="1"/>
        </svg>
      </div>
      <div class="triage__out">
        <p class="nom nom--accent">AI User Triage</p>
        <dl class="kv">${t.out.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
      </div>
    </div>

    <div class="lanes">
      ${p.lanes.map((l) => `<div class="lane">
        <div class="lane__h"><i></i>${esc(l.n)}</div>
        ${l.items.map((x) => `<div class="lane__c">${esc(x)}</div>`).join('')}
      </div>`).join('')}
    </div>
    ${caveat(p)}`;
  },

  /* 06 · LEXERAI — a physical document, tilted and lit, shedding its fields. */
  lexerai(p) {
    const r = p.receipt;
    return `<div class="xtract" data-lit>
      <div>
        <div class="receipt">
          <div class="receipt__h">
            <b>${esc(r.merchant)}</b>
            <span>${esc(r.sub)}</span>
          </div>
          ${r.lines.map(([a, b]) => `<div class="receipt__l"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join('')}
          <div class="receipt__tot"><span>${esc(r.total[0])}</span><span class="receipt__mark">${esc(r.total[1])}</span></div>
        </div>
      </div>
      <div>
        <dl class="fields">
          <p class="nom">extracted · structured</p>
          ${p.fields.map(([k, v, via]) => `<div class="field">
            <dt>${esc(k)}</dt><dd>${esc(v)}</dd><span class="field__f">${esc(via)}</span>
          </div>`).join('')}
        </dl>
        <div class="xtract__ask">
          <b>${esc(p.ask.label)}</b>${esc(p.ask.q)}
        </div>
        <p class="fine" style="margin-top:1rem">Bank statements come in the same way, and reconcile against what was extracted. When the network is gone, local OCR takes over automatically.</p>
      </div>
    </div>
    ${caveat(p)}`;
  },

  /* 07 · THE ENGINE — the dark room, and the bus at full scale. */
  engine(p) {
    const r = p.redact;
    const before = r.before.map((x) => (typeof x === 'string' ? esc(x) : `<x>${esc(x.pii)}</x>`)).join('');
    return `<div class="eng">
      <div>
        <div class="redact" data-lit>
          <div class="redact__l"><span class="nom">what the product sends</span></div>
          <p class="redact__s">${before}</p>
          <div class="redact__arrow"><span class="nom nom--accent">redacted before the model</span><i></i></div>
          <p class="redact__out">${esc(r.after)}</p>
        </div>
        ${caveat(p)}
        <div class="routes">
          ${p.routes.map((x) => `<div class="route${x.slm ? ' route--slm' : ''}">
            <b>${esc(x.model)}</b><s>${esc(x.note)}</s><span class="nom nom--accent">${esc(x.label)}</span>
          </div>`).join('')}
        </div>
        <p class="caveat">${esc(p.notBuilt)}</p>
      </div>
      <div>
        ${bus({ variant: 'full', chrome: `Metered in the console today — ${METERED.length} of ${APPS.length}`, cta: false })}

      </div>
    </div>
    <dl class="spec spec--band">
      ${p.spec.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
    </dl>`;
  },
};

/* Chapters alternate white and light grey, the way a suite paces a long
   product page, so the seam between two chapters is a change of ground rather
   than a guessed amount of padding. The engine keeps its dark room. */
function chapter(p, band) {
  const dark = p.story.kind === 'engine';
  const cls = ['chap', dark && 'dark', !dark && band && 'band'].filter(Boolean).join(' ');
  return `<section class="${cls}" id="c-${esc(p.slug)}"
    style="--accent:${hex(p.accent)}" aria-labelledby="h-${esc(p.slug)}"
    data-chap="${esc(p.slug)}">
    <div class="wrap wrap--inset">
      ${head(p)}
      ${COMPOSE[p.story.kind](p)}
      ${foot(p)}
    </div>
  </section>`;
}

/* ---- the measuring scale ---------------------------------------------- */
const scale = `<nav class="scale" aria-label="Chapters">
  <div class="scale__in">
    <span class="scale__unit" aria-hidden="true">ch</span>
    <ol>${CHAPTERS.map((p) => `<li><a href="#c-${esc(p.slug)}" data-stop="c-${esc(p.slug)}"
      style="--accent:${hex(p.accent)}"><span>${pad(p.chapter)}</span><em>${esc(label(p))}</em></a></li>`).join('')}
    </ol>
  </div>
</nav>`;

/* The rendered readout store. The mega-menu preview pane swaps out of this, so
   a product's peek is written once here and shown wherever it is needed. */
const panes = PRODUCTS.map((p) =>
  `<div data-pane="${esc(p.slug)}" hidden>${peek(p)}</div>`).join('');

/* ---- THE DIRECTORY — everything, in one screen -------------------------
   This replaced a pinned stage that stepped through the suite over three and
   a half screens of scrolling. It was the page's THIRD telling of the same
   products — after each product's own chapter and after #connect — and it
   cost 4,500px to add nothing new. It was also already dropped below 900px,
   which is the design admitting it was never load-bearing.

   What belongs at the end of a page like this is not more cinema; it is the
   whole list, at a glance, with a way in. One row per product, every product
   including the ones without a chapter, and two destinations: what it does,
   and the app itself. */
function directory() {
  const rows = PRODUCTS.map((p) => {
    const to = p.chapter ? `#c-${esc(p.slug)}` : null;
    const info = `${mark(p, 30)}
      <span class="dir__t"><b>${esc(label(p))}</b><em>${esc(p.position)}</em></span>
      <span class="dir__cat">${esc(catName(p))}</span>`;
    return `<li class="dir__row" style="--accent:${hex(p.accent)}">
      ${to
        ? `<a class="dir__hit" href="${to}">${info}<span class="dir__go" aria-hidden="true"></span></a>`
        /* no chapter means nothing verified to say yet. The row still exists,
           because the product does, and its own line says what it can. */
        : `<span class="dir__hit dir__hit--flat">${info}</span>`}
      ${p.url ? `<a class="dir__open" href="${esc(p.url)}" target="_blank" rel="noopener">
        Open${OUT}</a>` : '<s class="dir__open dir__open--off">&mdash;</s>'}
    </li>`;
  }).join('');

  return `<ul class="dir">${rows}</ul>`;
}

/* ---- THE ECOSYSTEM — one day's work, and who does which part ----------
   The question this page has to answer that a list of seven products cannot:
   why do these exist together? Not with a flowchart of arrows between apps —
   research/RESEARCH.md records that data sync, SSO and shared records are NOT
   claimed, and an arrow between two products would claim exactly that.

   So the figure is the WORK, not the wiring. Five stages of one working day
   run down the page in scroll order, and each stage names the products whose
   own chapter already does that piece. The visualisation is the repetition:
   the same marks come back stage after stage, which is the ecosystem visible
   at a glance and true at the same time. What the suite genuinely shares is
   then stated separately, each item carrying how it was verified — and the
   one thing it does not claim is stated just as plainly.

   The counts under the rail are computed, not written, so they cannot go
   stale when a product is added or a stage changes. */
function connect(band) {
  const spread = new Map();
  LIFECYCLE.forEach((st) => Object.keys(st.does).forEach((slug) => {
    spread.set(slug, (spread.get(slug) || 0) + 1);
  }));
  const many = PRODUCTS.filter((p) => (spread.get(p.slug) || 0) > 1).length;
  const none = PRODUCTS.filter((p) => !spread.has(p.slug));

  let n = 0;
  const stages = LIFECYCLE.map((st, i) => {
    const last = i === LIFECYCLE.length - 1;
    if (!st.base) n += 1;
    const rows = Object.entries(st.does).map(([slug, doing]) => {
      const q = bySlug(slug);
      if (!q) throw new Error(`products.js: LIFECYCLE stage "${st.verb}" names "${slug}", which is not a product`);
      return `<li><a href="#c-${esc(q.slug)}" style="--accent:${hex(q.accent)}">
        ${mark(q, 26)}
        <b>${esc(label(q))}</b>
        <em>${esc(doing)}</em>
      </a></li>`;
    }).join('');

    return `<li class="stg${last ? ' stg--end' : ''}${st.base ? ' stg--base' : ''}">
      <div class="stg__l">
        <span class="stg__n" aria-hidden="true">${st.base ? mark(ENGINE, 24) : n}</span>
        <h3 class="stg__v">${esc(st.verb)}</h3>
        <p class="stg__g">${esc(st.gloss)}</p>
      </div>
      <ul class="stg__r">${rows}</ul>
    </li>`;
  }).join('');

  return `<section class="chap${band ? ' band' : ''}" id="connect" aria-labelledby="connect-h">
    <div class="wrap wrap--inset">
      <header class="chap__hd">
        <div>
          <div class="chap__id">
            <span class="nom">the ecosystem</span>
            <span class="rule"></span>
          </div>
          <h2 class="dsp dsp--lg" id="connect-h">One day's work,<br>and who does<br>which part of it.</h2>
        </div>
        <div>
          <p class="body">Read down: this is the order the work actually happens in.
            ${word(many)} of the ${PRODUCTS.length} products show up at more than one
            stage — and none of them needs the others to do its own part.</p>
        </div>
      </header>

      <ol class="flow" data-lit>${stages}</ol>
      ${none.length ? `<p class="caveat">${esc(none.map(label).join(' and '))} ${none.length > 1 ? 'are' : 'is'} still in development, so ${none.length > 1 ? 'they appear' : 'it appears'} at no stage yet.</p>` : ''}

    </div>
  </section>`;
}

/* ---- mega menu --------------------------------------------------------
   Full-bleed and dense, the way a suite publishes a directory: one column per
   category, each headed in that category's own colour over a hairline, and
   every product carrying its app mark so the list can be scanned by shape
   rather than read line by line. */
const CAT_HUE = { intelligence: '#1F9A69', people: '#0F7C93', revenue: '#5A54B8', knowledge: '#B2560C' };

const megaCols = CATEGORIES.map((c) => `<div class="mega__col" style="--hue:${hex(CAT_HUE[c.id])}">
  <p class="mega__cat">${esc(c.name)}</p>
  <ul>${byCat(c.id).map((p) => `<li><a href="${p.chapter ? `#c-${esc(p.slug)}` : '#suite'}"
    style="--accent:${hex(p.accent)}" data-hint="${esc(p.slug)}">
    ${mark(p, 26)}
    <span><span class="mega__n">${esc(label(p))}</span>
    <span class="mega__d">${esc(p.position)}</span></span>
  </a></li>`).join('')}</ul>
  <p class="mega__note">${esc(c.note)}</p>
</div>`).join('');

const drawerLinks = CHAPTERS.map((p) =>
  `<a class="drawer__a" href="#c-${esc(p.slug)}">${mark(p, 26)}${esc(label(p))}<b>${pad(p.chapter)}</b></a>`).join('');

const ftrProducts = PRODUCTS.map((p) => {
  const href = linkOf(p);
  return href
    ? `<li><a href="${esc(href)}"${p.url ? ' target="_blank" rel="noopener"' : ''}>${mark(p, 20)}${esc(label(p))}</a></li>`
    : `<li><a href="#suite">${mark(p, 20)}${esc(label(p))}</a></li>`;
}).join('');

/* ---- THE LAUNCHER — one keystroke to anywhere in the suite ------------
   A suite is only an ecosystem if you can reach any part of it from anywhere
   in it. This is a native <dialog>: showModal() brings the focus trap, the
   Escape key, the inert background and the backdrop with it, so none of that
   is re-implemented here. Arrow keys just move real focus between real links,
   which is why there is no listbox ARIA either — the browser is already
   announcing exactly the right thing.

   Each product row goes to that product's CHAPTER, and the running app is a
   separate link on the right. That split is deliberate: someone who types
   "crm" and presses Enter should not be thrown into a sign-in wall they did
   not ask for. The chapter is where you decide; it carries the launch button.

   Nothing is hidden until app.js has run — the dialog is closed markup, so if
   the script fails the page simply has no launcher rather than a dead panel. */
const PAGE_GLYPH = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"
  stroke="currentColor" stroke-width="1.6" aria-hidden="true" focusable="false">
  <path d="M6 3.5h8l4.5 4.5V20a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/>
  <path d="M8.5 12.5h7M8.5 16h4.5"/></svg>`;
const OUT_GLYPH = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"
  stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false">
  <path d="M13.5 5.5H19v5.5M19 5.5 11 13.5"/>
  <path d="M17 15v3.5a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V8a.5.5 0 0 1 .5-.5H9.5"/></svg>`;

function cmdRow({ href, ext, chip, name, note, tag, hint, accent, q, open }) {
  const a = accent ? ` style="--accent:${hex(accent)}"` : '';
  return `<li class="cmd__row" data-q="${esc(q.toLowerCase())}">
    <a class="cmd__hit" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}${a}>
      <span class="cmd__chip">${chip}</span>
      <span class="cmd__t"><b>${esc(name)}</b><em>${esc(note)}</em></span>
      <span class="cmd__tag">${esc(tag)}</span>
      <span class="cmd__hint">${esc(hint)}</span>
    </a>
    ${open
      ? `<a class="cmd__open" href="${esc(open)}" target="_blank" rel="noopener"
          aria-label="Open ${esc(name)}">app${OUT}</a>`
      /* The slot is always occupied, for two reasons: the "ch NN" column stays
         aligned down the whole list, and a product with no app to open says so
         instead of leaving a gap you have to interpret. */
      : `<s class="cmd__off">no app</s>`}
  </li>`;
}

function cmd() {
  const prods = PRODUCTS.map((p) => cmdRow({
    href: p.chapter ? `#c-${p.slug}` : '#suite',
    chip: mark(p, 26),
    name: label(p),
    note: p.position,
    tag: catName(p),
    hint: p.chapter ? pad(p.chapter) : 'suite',
    accent: p.accent,
    open: p.url || null,
    /* the description is in the index too: it is the only place a product's own
       vocabulary appears in full, so it is what makes searching by what
       something DOES work rather than only by what it is called */
    q: [label(p), p.name, p.alias, p.position, catName(p), p.description,
      ...(p.features || [])].filter(Boolean).join(' '),
  })).join('');

  const PLACES = [
    { href: '#connect', name: "How the suite connects", note: "One day's work, stage by stage", tag: 'On this page', hint: 'section', chip: PAGE_GLYPH, q: 'ecosystem connect together lifecycle capture understand organise act meter shared' },
    { href: '#suite', name: 'The whole suite', note: `All ${word(PRODUCTS.length).toLowerCase()}, side by side`, tag: 'On this page', hint: 'section', chip: PAGE_GLYPH, q: 'suite everything all products list catalogue' },
    { href: COMPANY.contact, ext: true, name: 'Talk to us', note: `${COMPANY.base} · ${COMPANY.phone}`, tag: 'Company', hint: 'opens', chip: OUT_GLYPH, q: 'contact talk sales enquiry email phone call demo' },
    { href: `${COMPANY.site}/about-us/`, ext: true, name: 'About TalbotIQ', note: COMPANY.positioning, tag: 'Company', hint: 'opens', chip: OUT_GLYPH, q: 'about company who team story talbotiq' },
  ].map(cmdRow).join('');

  return `<dialog class="cmd" id="cmd" aria-label="Find a product">
    <div class="cmd__top" role="search">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
        stroke-width="1.7" stroke-linecap="round" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="6.25"/><path d="M15.75 15.75 20 20"/></svg>
      <input id="cmdQ" type="search" autocomplete="off" spellcheck="false"
        placeholder="Search the ${word(PRODUCTS.length).toLowerCase()} products" aria-label="Search products">
      <button class="cmd__x" type="button" id="cmdX" aria-label="Close">esc</button>
    </div>
    <div class="cmd__list" id="cmdList">
      <p class="cmd__grp">Products</p>
      <ul>${prods}</ul>
      <p class="cmd__grp">Elsewhere</p>
      <ul>${PLACES}</ul>
      <p class="cmd__none" id="cmdNone" hidden>Nothing matches that. The suite is ${word(PRODUCTS.length).toLowerCase()} products — try a category, or a word from what one of them does.</p>
    </div>
    <p class="cmd__foot">
      <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> move</span>
      <span><kbd>&crarr;</kbd> go</span>
      <span><kbd>esc</kbd> close</span>
      <s id="cmdCount"></s>
    </p>
  </dialog>`;
}

/* ---- structured data -------------------------------------------------- */
const jsonld = { '@context': 'https://schema.org', '@graph': [
  { '@type': 'Organization', name: COMPANY.name, legalName: COMPANY.legal, url: COMPANY.site,
    slogan: COMPANY.tagline, description: COMPANY.positioning,
    address: { '@type': 'PostalAddress', addressLocality: 'Kuala Lumpur', addressCountry: 'MY' },
    telephone: COMPANY.phone },
  { '@type': 'ItemList', name: 'TalbotIQ product ecosystem', numberOfItems: PRODUCTS.length,
    itemListElement: PRODUCTS.map((p, i) => ({ '@type': 'ListItem', position: i + 1,
      item: { '@type': 'SoftwareApplication', name: p.name, applicationCategory: 'BusinessApplication',
        description: p.description, ...(p.url ? { url: p.url } : {}) } })) },
]};

/* ---- THE BODY ORDER ---------------------------------------------------
   Hero -> the applications -> chapters -> the ecosystem, in the middle ->
   the rest of the chapters -> the whole suite -> the close.

   #connect sits after chapter three on purpose: by then you have read three
   products and the question "so why are these one company?" has arrived, and
   the answer names the four that are still to come, which is a reason to keep
   reading rather than a summary of what you just read.

   The white/grey stripe is assigned by a RUNNING TOGGLE rather than by each
   chapter's index. Inserting a section in the middle of the run — which is
   exactly what #connect does — would otherwise leave every seam after it
   doubled up on one colour. The dark room does not consume a stripe. */
const AFTER = 3;   // six chapters: three, the ecosystem, three
let grey = false;              // .apps above is grey, so chapter one is white
const body = CHAPTERS.map((p) => {
  const dark = p.story.kind === 'engine';
  const out = [chapter(p, dark ? false : grey)];
  if (!dark) grey = !grey;
  if (p.chapter === AFTER) { out.push(connect(grey)); grey = !grey; }
  return out.join('\n');
}).join('\n');

const TITLE = `TalbotIQ — ${word(APPS.length).toLowerCase()} products, one engine`;
const DESC = `${word(APPS.length)} business applications built by TalbotIQ — interview screening, meeting memory, CRM, task and project work, document extraction — all running on one AI engine.`;

/* ====================================================================== */
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TITLE)}</title>
<meta name="description" content="${esc(DESC)}">
<meta name="theme-color" content="#E7E9E4">
${COMPANY.pageUrl ? `<link rel="canonical" href="${esc(COMPANY.pageUrl)}">` : '<!-- canonical omitted until COMPANY.pageUrl is set in products.js -->'}
<meta property="og:type" content="website">
<meta property="og:site_name" content="TalbotIQ">
<meta property="og:title" content="${esc(TITLE)}">
<meta property="og:description" content="${esc(DESC)}">
${COMPANY.pageUrl ? `<meta property="og:url" content="${esc(COMPANY.pageUrl)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(TITLE)}">
<meta name="twitter:description" content="${esc(DESC)}">
<link rel="icon" href="assets/brand/talbotiq-logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="assets/css/talbotiq.css">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="head" id="head"><div class="wrap">
  <a class="brand" href="${esc(COMPANY.site)}" aria-label="TalbotIQ home">
    <img src="assets/brand/talbotiq-logo.png" alt="TalbotIQ" width="262" height="72">
    <span class="brand__mk" aria-hidden="true">Talbot<b>IQ</b></span>
  </a>
  <div class="head__now" id="headNow" aria-hidden="true">
    ${CHAPTERS.map((p) => `<span data-now="c-${esc(p.slug)}" hidden
      style="--accent:${hex(p.accent)}">${mark(p, 22)}<b>${esc(label(p))}</b></span>`).join('')}
  </div>
  <nav class="nav" aria-label="Primary">
    <div class="mw">
      <button class="nav__btn" id="megaBtn" aria-expanded="false" aria-controls="mega">Products</button>
      <div class="mega" id="mega" hidden>
        <div class="wrap">
          <div class="mega__grid">
            <div class="mega__cats">${megaCols}</div>
            <div class="mega__pane">
              <p class="nom">preview</p>
              <div class="mega__slot" id="megaSlot">${peek(CHAPTERS[0])}</div>
            </div>
          </div>
        </div>
        <div class="mega__foot"><div class="wrap">
          <span>${LINKED.length} of the ${PRODUCTS.length} open straight into the running application.</span>
          <a class="go" href="#connect">How they connect${TICK}</a>
          <a class="go" href="#suite">The whole suite${TICK}</a>
        </div></div>
      </div>
    </div>
    <a href="#suite">Suite</a>
    <a href="#c-ai-engine">AI Engine</a>
    <a href="${esc(COMPANY.site)}/about-us/">Company</a>
  </nav>
  <div class="head__r">
    <button class="find" id="findBtn" type="button" aria-haspopup="dialog" aria-label="Search products">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
        stroke-width="1.7" stroke-linecap="round" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="6.25"/><path d="M15.75 15.75 20 20"/></svg>
      <span>Search products</span>
      <kbd data-k>${KBD}</kbd>
    </button>
    <a class="btn btn--line btn--sm" href="${esc(COMPANY.site)}">talbotiq.com</a>
    <a class="btn btn--fill btn--sm" href="${esc(COMPANY.contact)}">Talk to us</a>
    <button class="burger" id="burger" aria-expanded="false" aria-controls="drawer" aria-label="Open menu"><span></span></button>
  </div>
</div></header>

<div class="drawer" id="drawer" data-open="false" role="dialog" aria-modal="true" aria-label="Menu">
  <div class="drawer__top">
    <img src="assets/brand/talbotiq-logo.png" alt="TalbotIQ" width="262" height="72" style="height:26px;width:auto">
    <button class="burger" id="burgerClose" style="margin-inline-start:auto" aria-expanded="true" aria-label="Close menu"><span></span></button>
  </div>
  <p class="nom">the chapters</p>
  ${drawerLinks}
  <p class="nom">elsewhere</p>
  <a class="drawer__a" href="#connect">How they connect<b>${LIFECYCLE.length} stages</b></a>
  <a class="drawer__a" href="#suite">The whole suite<b>${PRODUCTS.length}</b></a>
  <a class="drawer__a" href="${esc(COMPANY.site)}/about-us/">Company</a>
  <div class="drawer__cta">
    <a class="btn btn--fill" href="${esc(COMPANY.contact)}">Talk to us</a>
    <a class="btn btn--line" href="${esc(COMPANY.site)}">talbotiq.com</a>
  </div>
</div>

${scale}

<main id="main">

<section class="hero">
  <div class="wrap">
    <h1 class="dsp dsp--xl">${word(APPS.length)} products.<br>One engine underneath.</h1>
    <p class="lede">TalbotIQ builds the software a business runs on — hiring, meetings, customers,
      documents and the work in between. The same AI engine powers all of it.</p>
    <div class="hero__cta">
      <a class="btn btn--fill" href="#connect">See how it works</a>
      <a class="btn btn--ghost" href="${esc(COMPANY.contact)}">Talk to us</a>
    </div>
  </div>
  <div class="curve" aria-hidden="true"></div>
</section>

<section class="apps band ruleset" aria-labelledby="apps-h">
  <div class="wrap">
    <h2 class="vh" id="apps-h">The applications</h2>

    <!-- The one figure that explains the company without a sentence: every
         application above, a line down from each of them, and one engine at
         the bottom that all the lines arrive at. It animates once, in that
         order, because the order IS the explanation. -->
    <div class="knit" data-lit>
      <div class="appgrid">${APPS.map(tile).join('')}</div>
      <div class="knit__drops" aria-hidden="true">${APPS.map(() => '<i></i>').join('')}</div>
      <div class="knit__rule" aria-hidden="true"></div>
      <a class="knit__eng" href="#c-${esc(ENGINE.slug)}">
        <span class="knit__chip">${mark(ENGINE, 40)}</span>
        <span class="knit__t">
          <b>${esc(ENGINE.name)}</b>
          <em>One engine. It does the thinking for all ${word(APPS.length).toLowerCase()}.</em>
        </span>
      </a>
    </div>

    <div class="apps__proof">
      <p class="body">Buy the ones you need. They get better together because they
        share an engine — not because you have to take all ${word(APPS.length).toLowerCase()}.</p>
    </div>
  </div>
</section>

${body}

<section class="chap" id="suite" aria-labelledby="suite-h">
  <div class="wrap wrap--inset">
    <header class="chap__hd">
      <div>
        <div class="chap__id"><span class="nom">all of it</span><span class="rule"></span></div>
        <h2 class="dsp dsp--lg" id="suite-h">Everything<br>TalbotIQ makes.</h2>
      </div>
      <div>
        <p class="body">${word(PRODUCTS.length)} products across ${word(CATEGORIES.length).toLowerCase()}
          parts of a business. Pick the one closest to your problem.</p>
      </div>
    </header>

    ${directory()}
    <div hidden id="paneStore">${panes}</div>
  </div>
</section>

<section class="close band">
  <div class="wrap wrap--inset">
    <div class="close__g">
      <p class="nom">${esc(COMPANY.name)}</p>
      <blockquote>${esc(COMPANY.creed)}</blockquote>
      <cite>TalbotIQ, on its own about page</cite>
      <div class="close__b">
        <a class="btn btn--sig" href="${esc(COMPANY.contact)}">Talk to our team</a>
        <a class="btn btn--line" href="${esc(COMPANY.inquiry)}">Make an enquiry</a>
      </div>
      <p class="fine">${esc(COMPANY.base)} &middot; ${esc(COMPANY.phone)}</p>
    </div>
  </div>
</section>

</main>

<footer class="ftr"><div class="wrap wrap--inset">
  <div class="ftr__g">
    <div>
      <p class="ftr__mk">Talbot<b>IQ</b></p>
      <p>${esc(COMPANY.positioning)}. ${esc(COMPANY.antiHype)}</p>
    </div>
    <div><h3>products</h3><ul>${ftrProducts}</ul></div>
    <div><h3>platform</h3><ul>
      <li><a href="#c-ai-engine">AI Engine</a></li>
      <li><a href="#suite">The whole suite</a></li>
      <li><a href="#c-mimic">Chapter one</a></li>
    </ul></div>
    <div><h3>services</h3><ul>
      <li><a href="${esc(COMPANY.site)}/services/ai-strategy-consulting/">AI strategy &amp; consulting</a></li>
      <li><a href="${esc(COMPANY.site)}/services/ai-agent-bot-development/">AI agent &amp; bot development</a></li>
      <li><a href="${esc(COMPANY.site)}/services/embedded-systems-edge-intelligence/">Embedded &amp; edge AI</a></li>
      <li><a href="${esc(COMPANY.site)}/services/full-stack-development-ai-integration/">Full stack &amp; AI integration</a></li>
    </ul></div>
    <div><h3>company</h3><ul>
      <li><a href="${esc(COMPANY.site)}/about-us/">About</a></li>
      <li><a href="${esc(COMPANY.site)}/beyond-the-headlines/">Beyond the headlines</a></li>
      <li><a href="${esc(COMPANY.contact)}">Contact</a></li>
      <li><a href="${esc(COMPANY.inquiry)}">Make an enquiry</a></li>
    </ul></div>
  </div>
  <div class="ftr__b">
    <span>&copy; 2026 ${esc(COMPANY.legal)}</span>
    <nav aria-label="Legal">
      <a href="${esc(COMPANY.privacy)}">Privacy policy</a>
      <a href="${esc(COMPANY.site)}">talbotiq.com</a>
    </nav>
  </div>
</div></footer>

${cmd()}

<script src="assets/js/vendor/lenis.min.js" defer></script>
<script src="assets/js/app.js" defer></script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log(`index.html — ${(html.length / 1024).toFixed(1)}kB · ${CHAPTERS.length} chapters · ${PRODUCTS.length} products (${LINKED.length} linked, ${METERED.length} metered)`);
