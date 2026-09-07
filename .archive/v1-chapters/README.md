# TalbotIQ — product ecosystem landing page

One static page presenting the TalbotIQ products as a single ecosystem.
No build tooling, no framework — Node is used only to stamp the data into HTML.

**One runtime dependency**, vendored rather than fetched: `lenis` for smooth
scrolling, in `assets/js/vendor/` (see the README there). The page scrolls
natively and works completely without it, and it is disabled outright under
`prefers-reduced-motion` and on touch pointers.

```text
products.js   ──▶  node build.js  ──▶  index.html
   (edit this)                          (generated — never edit by hand)
```

## Run it

```bash
node build.js                      # regenerate index.html
python3 -m http.server 8000        # then open http://localhost:8000
```

`index.html` also opens straight from the filesystem — there are no ES modules
and no fetches.

## Files

| File | What it is |
| --- | --- |
| `products.js` | **The single source of truth.** Company details, categories, all products. |
| `build.js` | The template + generator. One composition function per chapter. |
| `index.html` | Generated output. Overwritten on every build. |
| `assets/css/talbotiq.css` | The whole design system. |
| `assets/js/app.js` | Header, drawer, mega-menu, the scale, the launcher, the scroll mechanisms. |
| `assets/js/vendor/` | Vendored third-party code. Currently just Lenis. |
| `research/RESEARCH.md` | **The evidence log.** Every product claim traces to a line here. |
| `assets/shots/` | Real screenshots captured during research (reference, not used on the page). |

---

## The design

The page has one job: someone who has never heard of TalbotIQ should be able to
say what the company makes within five seconds, and find the product closest to
their problem within thirty.

Everything is built around one sentence — **six products, one engine
underneath** — and the page's opening figure is that sentence drawn. The six
applications appear as marks you can point at, a line drops from each of them,
and one engine sits at the bottom where all six arrive. It plays once, in that
order, because the order *is* the explanation. That is `.knit`, and it is the
only load-time sequence on the page.

Structure, top to bottom:

```text
hero            six products, one engine underneath — the sentence
the knit        the sentence, drawn. Six marks, six lines, one engine
chapters 01-03  Mimic, Recapr, NousCRM — one composition each, no two alike
#connect        one day's work, and who does which part of it
chapters 04-06  Task Manager, lexerai, the AI Engine (the dark room)
#suite          the directory: every product, one row each, two ways in
close           the company's own sentence, and nothing else
```

Two typefaces: **Archivo** (its variable *width* axis carries the display
voice — expanded and medium-weight, which reads as equipment nomenclature
rather than shouty SaaS) and **IBM Plex Mono** for data and small labels,
always in sentence case.

Colour is the logo's green, used as a signal and nowhere else. Each product
carries its own accent, used on that product's own composition.

### Plain language is a rule here

An earlier version of this page talked constantly about itself — a black
banner reading *"3 of 7 products are registered in the TalbotIQ AI Engine and
metered through it"*, a hero paragraph explaining how honest the page was,
five-line disclaimers under every graphic, and tags marking each fact
*"verified in the app"*. All of it was true. None of it was for the reader.

So: **nothing on this page describes the page.** Words like *metered*,
*headroom* and *at ceiling* appear in exactly one place — the AI Engine
chapter, which is the platform section and the one place a technical reader is
being addressed. Everywhere else the engine "does the thinking". If you catch
yourself writing a sentence about how the page was researched, it belongs in
`research/RESEARCH.md`.

### The app marks

`MARKS` in `build.js` holds one drawn SVG per product. Two rules keep the set a
family rather than seven unrelated glyphs:

1. **Every mark is derived from what its product does.** The CRM mark really is
   the funnel its chapter draws; the engine mark really is three products
   tapping one slab.
2. **Every mark carries one shape in the shared engine green** (`--mk-2`). That
   is the "one engine" claim drawn into the icon set itself. The engine's own
   mark inverts the pair, so the green is the slab and the taps are neutral.

Adding a product means adding a `MARKS[slug]` entry. Draw it in a 32×32 box,
flat and geometric, `fill="var(--mk)"` for the product colour and
`fill="var(--mk-2)"` for the green.

### Rules the stylesheet enforces

These are the tells that make a page read as generated. They are absent on
purpose:

- **No tracked-out ALL-CAPS eyebrow labels.** Small labels are `.nom` — mono,
  sentence case, usually carrying an index or a unit.
- **No single accented word in a headline.** Headlines are one colour.
- **No `→` welded onto link text.** `.go` draws its own arrow as an element;
  `OUT` is the one glyph for "leaves the site".
- **No repeated identical cards.** Every chapter has its own composition
  function in `build.js`. The directory is a list of rows, not a card grid.
- **No uniform fade-up on every section.** Motion either shows a mechanism
  (the knit assembling, the spine descending through `#connect`, a redaction
  covering text) or answers something the reader did.
- **No figure that needs a note saying its numbers are made up.** The bus used
  to draw a headroom percentage under a caption admitting it was invented. It
  is binary now: on the engine, or not yet.

### What was cut, and why

Kept here because the reasons still apply:

- **A pinned scroll showcase** (`#suite`, 4,500px, six panels stepped by
  scroll). It was the third telling of the same products — after each
  chapter and after `#connect` — and it was already switched off below 900px,
  which is the design admitting it was never load-bearing. It is a directory
  now, about 700px.
- **A chapter for PMS** whose subject was that we cannot describe PMS. PMS is
  a row in the directory reading *In development*.
- **A roll-call of every product** closing the page, immediately below the
  directory. That was the fourth list of the same seven.
- **The four-verb readout** under each chapter description: a fourth piece of
  copy saying what the description said.
- **`--bay` at 13rem.** With the meta copy gone the sections are lean, and
  that much air read as a void. 9rem at 1440.

### Editing the CSS

Three conventions keep it from fighting itself:

1. **Dark sections theme by token reassignment.** `.dark` redefines `--paper`,
   `--ink`, `--rule` and friends. Never write `.dark .thing { }` overrides —
   add a component once and it themes itself in both.
2. **Section rhythm comes from one token, `--bay`.** A section's own *bottom*
   bay is the gap to the next one, so consecutive sections must not add a top
   bay as well — that is what `.chap + .chap`, `.hero + .chap`, `.apps + .chap`
   and `.chap + .close` are for. The dark room takes half a bay, because the
   colour change is already doing most of the separating. Nothing else may set
   section padding.
3. **Sections alternate `--paper` (white) and `.band` (grey),** and the stripe
   is assigned in `build.js` by a **running toggle**, not by chapter index — so
   inserting a section mid-run (which `#connect` does) cannot leave every seam
   after it doubled on one colour.

Accents come in three forms, and picking the wrong one fails contrast:

| Token | Use it for |
| --- | --- |
| `--accent` | fills, bars, marks, hairlines |
| `--accent-ink` | the accent as **small text** (a raw accent is 3.7–4.5:1 and fails AA) |
| `--accent-solid` | the accent **behind white text** (buttons, active tabs) |

The page currently measures **≥ 4.5:1 on all 454 text nodes** (lowest 4.60:1),
in the light sections, the dark room and the launcher. If you add a colour,
re-check it.

### The launcher (⌘K)

A native `<dialog>`: `showModal()` supplies the focus trap, Escape, the inert
background and the backdrop, so none of that is reimplemented. Arrow keys move
**real focus between real links**, which is why there is no listbox ARIA — the
browser already announces the right thing.

Each product row goes to that product's **chapter**; the running app is a
separate link on the right. That split is deliberate: someone who types "crm"
and presses Enter should not be thrown at a sign-in wall they did not ask for.

The `⌘ K` chips are hidden until app.js adds `.cmdk` **and** the pointer is
fine — a phone was being shown a shortcut it has no way to press. `data-k`
elements are relabelled `Ctrl K` off macOS, which cannot be known at build
time.

## Adding or filling in a product

To fill in a pending product, edit its entry in `products.js`:

```js
{
  slug: 'pms',
  chapter: 7,                        // was null — a product with no chapter is
                                     // a row in the directory and nothing more
  status: 'live',                    // was 'pending'
  access: 'app',                     // was 'pending-url'
  url: 'https://…',                  // was null
  position: 'One line of positioning',
  statement: 'Two or three\nshort lines',   // \n = an authored line break
  description: 'One or two sentences, from the real app.',
  features: ['Module', 'Module', 'Module'],
  cta: 'Open PMS',
  bus: { served: 'PMS', headroom: 83 },   // any number = on the engine; null = not yet
  peek: { … },                       // the small readout, see below
}
```

Then `node build.js`. The chapter, the bus channel, the suite row, the
mega-menu entry, the footer link and the JSON-LD all update together.

`build.js` fails the build (rather than shipping a broken page) if a product
has an unknown `category` or if two products claim the same `chapter`.

### `bus`

Drives the figure in the AI Engine chapter. The bar is **binary** — full for a
product the console registers, empty for one it does not — so `headroom` is
really just a flag now. It used to draw the number as a percentage, under a
caption admitting the number was made up; a figure without numbers was worth
more than that.

### `peek`

The small readout shown in the mega-menu preview pane. Keys
render in this order, and all are optional:

```js
peek: {
  chrome: 'Scored report',                     // the panel's own title
  tabs: ['Dashboard', 'Receipts'], on: 1,      // module tabs, `on` = active index
  quote: '“…”', stamp: 'attribution',          // a quoted line
  meters: [['Relevance', 91]],                 // labelled progress bars
  bars: [38, 55, 44, 68],                      // a small bar chart
  kv: [['Label', 'Value']],                    // label/value rows
}
```

Set `peek: null` and the pane says so in words instead.

### Giving a chapter its own composition

`story.kind` selects a function in `build.js`'s `COMPOSE` map. Each product has
its own; there is deliberately no generic one. To add a product as a full
chapter, write a new `COMPOSE` entry for it rather than reusing another
product's — the whole point of the page is that no two chapters look alike.

---

## The accuracy rule

Every capability stated on this page was read out of the running application or
taken from TalbotIQ's own product pages, and is recorded in
`research/RESEARCH.md` with its source. Things that could **not** be verified
are listed there as *NOT claimed* and are absent from the page — NousCRM has no
leads module (and the page says so, with the five 404 routes struck through),
HRMS has no recruitment or performance module, and the AI Engine's
model-comparison pipeline is stated by its own console to be unbuilt.

There are no invented statistics, customer logos, testimonials or
certifications on this page.

### `illustrative` — the other half of the rule

Several chapters depict a **specimen** record: a candidate's answer, a receipt,
a redacted sentence, CRM stage names. The *capability* is verified; the specimen
is made up, because publishing a real candidate's interview or a real customer's
receipt would be worse.

Wherever that happens, the product's `illustrative` field says so and the page
prints it under the artwork. **Keep it to one short line.** These notes used to
run to five lines each, explaining the methodology behind the figure; that was
the single biggest source of clutter on the page. *"Sample answer and scores.
Mimic recommends; it never rejects anyone."* does the same job.

**If you add a specimen, add its `illustrative` note in the same commit.**

## Before going live

Set `COMPANY.pageUrl` in `products.js` to the page's real URL. Until it is set,
`<link rel="canonical">` and `og:url` are deliberately omitted — pointing them
at a URL that 404s is worse for SEO than emitting neither.
