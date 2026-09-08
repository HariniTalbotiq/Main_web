# TALBOTIQ — homepage

One static homepage presenting the eight TALBOTIQ products as a single
ecosystem. No build tooling, no framework, **no runtime dependencies** — Node
is used only to stamp the data into HTML.

```text
products.js  ─┐
home.js      ─┤──▶  node build.js  ──▶  index.html
articles.js  ─┘        (generated — never edit by hand)
   ▲
   └── node tools/fetch-articles.js   (generated too — from The Edge Malaysia)
```

## Run it

```bash
node build.js
```

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. `index.html` also opens straight from the
filesystem — there are no ES modules and no fetches.

## The design

`design/mockup-homepage.html` is the design this page implements, and it is the
reference to check against when something looks wrong. Structure follows
odoo.com: the product grid sits high on the page, then trust, then capability,
then a closing offer.

One departure from it: the mockup curved the white page into the grey product
band with a 96px SVG arc, and that edge is now **straight**. The arc is still in
the mockup file if it is ever wanted back — `.band` in the stylesheet says how.
The cut corner on the capability band is a separate device and is unchanged.

```text
header        logo · five nav items, three of which open a panel · Book a demo
hero          one display line, highlighter on its last clause, lede, two buttons
#products     eight tiles on the grey band, straight edge
#ecosystem    the suite's claim, in its own tinted band
mission       "Technology is a tool. (Intelligence) is the edge."
trust         four client logos, looping
caps          five capability cards, 3 + 2, one corner cut
#why          why lead with Talbotiq — three claims, text only
#insights     every published column, from articles.js
cta           the closing offer, in teal
footer        five columns · newsletter · legal
```

Two typefaces. **MESHED Display** (Rajesh Rajput) carries every display line
and is **self-hosted** from `assets/fonts/`; **Inter** does everything else and
comes from Google Fonts. The eight product pages use the same pair — see *The
product pages* below. The display face is the whole voice of the page, so it
is never used below display sizes — every element that uses it carries the
`.hand` class.

MESHED Display is free for personal and commercial use, and its licence forbids
modifying the files, so the shipped `.woff2` is the vendor's own, byte for byte
— **never subset or re-compress it**. Only Bold is shipped because only Bold is
used; `assets/fonts/README.md` covers switching weights.

> **This replaced Caveat Brush**, the brush script the mockup used. It is a
> deliberate change of voice: a high-contrast Didone serif reads editorial and
> composed where the script read informal. The hand-drawn marks were designed
> to pair with handwriting, so they were re-derived against the new face rather
> than left where they sat — see the `.mark-hl` note in the stylesheet. They
> now land correctly, but whether a marker scrawl still *suits* a Didone is a
> taste call worth a look.

Colour is the logo's own palette. Teal `#02A885` is the action colour and
appears on every button that matters; the yellow, amber and blue are used only
inside the hand-drawn marks and the product icons.

### The hand-drawn marks

Three SVGs, all decorative, all `aria-hidden`, each landing on specific words:
a **highlighter** behind the hero's last clause, a **lasso** around one word of
the mission, a ruled **underline** under the capability heading, and a
**squiggle** under the blog heading. They are drawn behind the text, so the
type keeps its own contrast.

There was a fourth — a pencilled arrow pointing at a rotated aside in the hero
that read *"8 products. 1 login."* — removed along with that aside and the
*"Live in under two weeks. See how"* subnote below the buttons. That also
retired the only claim on the page the products did not support: eight
applications on six hosts, no single sign-on, so "1 login" was not true.

The copy for those headings is split into parts in `home.js` (`lead` /
`marked`, `lead` / `lassoed` / `tail`) because a mark that has to guess where a
line wraps is a mark in the wrong place.

## Files

| File | What it is |
| --- | --- |
| `products.js` | **What each product IS.** Descriptions, features, real app URLs, and the `evidence` string behind every claim. |
| `articles.js` | **Generated.** The published columns shown in `#insights`, copied verbatim from The Edge Malaysia. Do not hand-edit. |
| `tools/fetch-articles.js` | Regenerates `articles.js` from the publisher's own page data. |
| `products/*.html` | The eight product pages. Standalone mockups, linked from the tiles. |
| `about.html` | The about page. A standalone mockup, like the product pages. |
| `contact.html` | The contact page. Standalone mockup; carries the office address and the working phone/email/WhatsApp links. |
| `signin.html` | The sign-in page. Work email + password, or Continue with Google, through Supabase Auth. Ships **not connected**: fill in the two keys at the top of its script to switch it on. |
| `solutions/*.html` | One page per service. Four of five; only AI Governance & Security to come. |
| `tools/fix-pages.js` | Wires the placeholder links in `about.html` and `products/*.html`, fixes the bugs they shipped with, and swaps their display face. |
| `tools/check-signin.py` | Drives `signin.html`'s sign-in flow in headless Chrome against a stubbed provider — 29 assertions across the not-connected and connected states. `python3 tools/check-signin.py`, exit 0 only if all pass. |
| `home.js` | **How the homepage is COMPOSED.** The eight tiles, every word of copy, the nav, the footer. Joins to `products.js` by `slug`. |
| `build.js` | The template + generator. One function per section. |
| `index.html` | Generated output. Overwritten on every build. |
| `assets/css/talbotiq.css` | The whole design system. §1–§12 is the mockup's own CSS; §13+ is what a shipped page needs and a mockup does not. |
| `assets/js/app.js` | Three things: the header's hairline, the three nav panels, the mobile drawer. |
| `assets/js/logo-loop.js` | The "Trusted by" marquee — React Bits' LogoLoop, ported to vanilla JS. |
| `assets/js/stage.js` | **The eclipse, the signal and the convergence.** One fixed canvas, three scroll windows. Decorative; the page is complete without it. |
| `assets/js/scenes.js` | **The constellation and the black hole.** Two section-local canvases. The constellation runs under reduced motion and on phones, deliberately. |
| `design/mockup-homepage.html` | The design reference. |
| `research/RESEARCH.md` | **The evidence log.** Every product claim traces to a line here. |
| `assets/brand/clients/` | The four "Trusted by" logos, plus a README on how they were prepared. |
| `assets/fonts/` | The self-hosted display face and its licence. |
| `.archive/v1-chapters/` | The previous design, complete and still buildable. |

### Why two data files

`products.js` is the accuracy contract and it was **not** rewritten to suit
this design. `home.js` chooses which products appear, what the page calls them
and what it says around them, then reads each product's real URL and real
description back out of `products.js` by slug — so the two cannot drift apart.

Where this design renames a product, the old name is kept in `was` so the
rename stays visible:

| Was | Now |
| --- | --- |
| NousCRM | Sales CRM |
| Task Manager | tasca |
| lexerai | Document Parser |
| TalbotIQ AI Engine | Private AI Engine |
| PMS | Axiom |
| HRMS *(was hidden)* | HRMS *(shipped)* |

## Why lead with Talbotiq

`#why` holds three claims about how the company works, in three columns of
centred text. Edit them in `home.js` → `WHY`.

**This replaced the mockup's testimonial slot** — a dashed box whose own copy
explained that it was empty because there was no published client quote to put
in it. Three statements the company can make about itself need nobody else's
permission to print, so the hole is closed. If a real quote ever arrives it
wants its own section rather than this one back.

Two details worth knowing:

- **Text only, by request.** The source design ran a photograph above each of
  the three; none are used.
- **"Realistic Innovation" quotes `COMPANY.antiHype`** from `products.js`
  rather than repeating the string. *No "AI hype." We build tools that solve
  actual business bottlenecks.* is the company's own line, recorded from its
  homepage in `research/RESEARCH.md`, and it is the register this whole page is
  written in. Reading it from the source means the two cannot drift apart —
  it is the one thing `home.js` takes out of the accuracy contract.

The heading carries **no** hand-drawn mark. Four already do — highlighter,
lasso, underline, squiggle — and the closing CTA carries none; a fifth would
make the device the pattern rather than the emphasis. Adding one is a two-line
change if it should match the others.

### One place decides what opens in a new tab

`build.js` has a single `link()` helper: a destination on this site opens in the
**same tab**, and only a genuinely external URL gets `target="_blank"
rel="noopener"`.

It exists because of a bug worth remembering. Several destinations moved from
`talbotiq.com` to local pages — `about.html`, `contact.html`,
`products/*.html` — and the hardcoded `target="_blank"` that had been correct
at each of fifteen call sites silently became wrong, so the site started
opening its own pages in new tabs. Centralising the decision means the next
destination that moves cannot reintroduce it.

## The logo loop

The "Trusted by" row scrolls as an infinite marquee. It is **React Bits'
`<LogoLoop />`** (reactbits.dev), ported to vanilla JS in
`assets/js/logo-loop.js`. Tune it in `home.js` → `LOGO_LOOP`; the prop names
match the original.

### Why a port instead of the component

This site has no React, no bundler and no `package.json` — `node build.js`
stamps data into one HTML file and that is the entire toolchain. Adding React +
ReactDOM to render one row of four logos would have been a larger change than
the row, and would have cost the "no framework, no runtime dependencies"
property the rest of this README depends on. So the component's *behaviour* was
reproduced instead.

Kept from upstream: the DOM shape (`.logoloop > __track > __list > li`), the
class names (so the CSS is upstream's CSS), the animation model (one rAF loop,
exponential smoothing toward a target velocity, `translate3d` on the track,
offset wrapped modulo the measured sequence width), the constants
(`SMOOTH_TAU 0.25`, `MIN_COPIES 2`, `COPY_HEADROOM 2`), the sizing rule (clone
the sequence `ceil(container / sequence) + 2` times, remeasure on resize, wait
for images first) and the hover contract (`hoverSpeed` becomes the target while
hovered, `0` meaning pause).

Dropped as unused: the vertical directions (`up`/`down`), `renderItem`, and the
React-only plumbing. Horizontal is the one axis this row needs.

Two things were improved rather than copied:

- **It degrades without JavaScript.** The server renders exactly ONE real
  sequence and the script clones it. If the script never runs, the row is a
  plain centred line of logos — which is what this section was before the loop.
  The React component renders nothing without React.
- **Reduced motion stops the loop, not just the transform.** Upstream pins the
  track with `transform: …!important` in CSS while the rAF loop keeps running
  and keeps writing transforms that CSS then overrides. Here the loop is never
  started, so it costs nothing.

It also stops when scrolled out of view or the tab is hidden, and pauses on
keyboard focus as well as hover — the logos are links, and one that slides away
from the pointer is one nobody clicks.

### Verified behaviour

Driven with a synthetic clock, since a hidden document suspends `rAF`:

| Check | Result |
| --- | --- |
| Easing curve | 29.9px travelled in the first second at `speed: 40`; the analytic value for `SMOOTH_TAU 0.25` is 30.2px |
| Steady state | 0.667px/frame at 16.7ms = exactly 40px/s |
| Hover | 0.002px/frame — a standstill — and resumes on leave |
| Wrap | jumps −946.9 → −0.6, exactly the 947px sequence width, so the seam is invisible |
| Copies | 3 for a 947px sequence, all clones `aria-hidden` |

### Attribution

`assets/js/logo-loop.js` credits the upstream project in its header. **Confirm
React Bits' licence and attribution terms before this page goes public** — that
is the upstream project's call, not something this repo can assert.

## The drawing

The page is a drawing of the suite that assembles itself as you read it. There
is **no overlay** — no fixed layer, no canvas over the content, nothing that
covers the header. Every drawn thing lives inside the section it describes and
stops at that section's edges.

| Where | What happens |
| --- | --- |
| `#products` | The band holds still under the header while its drawing is made: construction rules register the grid, a cross marks each rule crossing, the eight products resolve into their cells, and the wiring that is genuinely there draws itself between them. |
| `#ecosystem` | The engine's four steps — *Request, Redact, Route, Answer* — fill along a rail as the request reaches each one. |
| everywhere else | Sections rise, sharpen and arrive as they enter. One pattern, one curve. |

### The wiring is the accuracy contract, drawn

`build.js` emits `#stage-data` from `products.js`, and the field that matters is
**`live`, which is `bus.served`**. Three products are on the AI Engine today, so
**three traces are drawn** — Mimic and Recapr solid, Axiom dashed because it is
wired but not shipped. The other four get **nothing**: not a faint line, not a
dotted courtesy one. The absence is the statement, and a hairline drawn for
balance would reprint the claim this page already retired — eight applications
on six hosts, no single sign-on.

Wire a fourth product in `products.js` and the drawing redraws itself. The build
**fails** if a product loses its `bus`, or the engine its four-step `story.arc`.

### The traces are routed, not drawn straight

They run **only in the gutters the rules already mark** — leave the card
sideways, down a column rule, along the row rule on their own lane, and in to
the hub's near face. No trace ever crosses a card or a caption.

That is not decoration. The first version ran a bowed curve from each product
straight to the engine, which put the Mimic trace through the words *"HRMS / The
people platform"*. A diagram that crosses its own labels is one that was drawn
without looking.

**The whole drawing is derived from the grid that is actually on screen.** The
grid is four columns, three below 1080px and two below 820px, so `scroll.js`
reads the real card boxes, works out where the column and row gutters are, and
rebuilds both the rules and the routing from them — at any width, on every
resize. An earlier version hardcoded the four-column geometry, and at 1024px it
drew its traces straight through the tiles.

`build.js` still emits a four-column version so the un-enhanced page has
something correct to show. Below 1081px that version is no longer true, so with
no JS to re-derive it, it is hidden rather than shown wrong.

### No framework, and no canvas

The whole choreography is **one 250-line file that animates nothing**. It adds a
class, marks what should reveal, and writes five numbers into custom properties
as you scroll. Every transition, curve and stagger is in §18 of the stylesheet.

Motion is limited to `opacity`, `translate`, `scale`, `filter` and
`stroke-dashoffset` — all cheap, none of them causing layout.

### How it degrades

Every rule in §18 that hides or moves anything is scoped to `html.fx`, and that
class is set by **one inline line in `<head>`**. It has to be inline: a deferred
script sets it too late, and the browser would paint the finished drawing and
then snap it back to the start.

| Condition | What happens |
| --- | --- |
| **No JS** | The rules, the crosses, the eight tiles and all three traces are **already in the HTML**, and above 1081px the drawing simply renders, finished. Below that the grid has reflowed and the static drawing no longer matches it, so it is hidden and the band is the plain grid it always was. |
| **`prefers-reduced-motion`** | No class, so nothing is hidden and nothing moves. The band stays its natural height — the page is **870px shorter** than the animated one. |
| **≤ 820px** | Same. The phone never pays for the pin. 820 because `app.js` already says 820. |

Nothing on the page exists only inside a transition.

### Verified

| Check | Result |
| --- | --- |
| axe-core, against `main` | **identical** violation sets, **0 added** |
| No JS | 8 tiles, 3 traces, 10 rules, all four step words, band at its natural height |
| Reduced motion / ≤820px | `fx` absent, tiles at full opacity, no extra scroll |
| Horizontal overflow | none, 390px through 1440px |
| The other 13 pages | byte-identical to `main` |

## The atmosphere

Five CSS-only additions, no JS and no new DOM, that give the page air without
putting anything on top of it.

| | What |
| --- | --- |
| **The weave** (§19) | A 1px line every 8px across the product band, white at 55% so it lightens rather than dirties. Attio runs the same 8px period over both its light and dark sections; it is most of why their surfaces read as engineered. |
| **The wash** (§20) | A colour field deepening down the product band until it meets the mint of the ecosystem section. |
| **The seam** (§21) | The two bands joined into one surface, and the ecosystem band's two hard borders replaced by one drawn rule that fades out at both ends. |
| **The iris** (§21) | A four-bladed lens diaphragm behind the ecosystem band, turning 48° as you scroll. |
| **The ground** (§22) | The body stops being pure white. |
| **The floor** (§23) | The closing CTA darkens toward its own floor. |

### The dark chapter

The page runs light from the hero, **goes dark for one section, and comes back**.
That is the eclipse — not a disc crossing the viewport, but the page itself
dimming for a chapter. The dim lives in the section's own background: going in
it starts at the product band's exact grey, coming out it resolves to the page's
exact ground, so there is no boundary at either end and no separate element
doing the fade.

Inside it, pinned under the header: the claim and its four steps on the left, a
hairline, and on the right **a wireframe well** — eight rings, one per product,
falling into a throat that is the AI Engine. Five signals fall down its
meridians as you scroll.

**It has to be dark, and that is the whole point.** A wireframe, five faint
signals and four lit steps are all low-contrast marks, and a low-contrast mark
on a white ground is invisible — which is exactly why the first attempt at this,
a pale iris on the mint band, read as a smudge however it was tuned. The
identical figure on near-black reads as an instrument. Attio's own version is on
a dark section; on their light page they drop it entirely.

**The geometry is computed, not drawn.** A gravity well is a surface of
revolution in perspective, so it falls out of two functions and a projection:

```
R(u) = radius at u, u=1 at the rim and 0 at the throat
d(u) = how far the surface has fallen — steep near the throat
x = cx + R·cos t        y = cy + R·k·sin t + d
```

Generating it in `build.js` means the eight rings are eight *because there are
eight products*, and it stays correct if the tilt or the count changes.

**The signals are travelling dashes, not moving dots.** Each is a copy of its
meridian stroked with one very short dash on an enormous gap, so what renders is
a bright segment sitting exactly on the curve. A circle moved with `offset-path`
would put its coordinates in CSS pixels while the path is in viewBox units — the
two only agree at one window width. A dash cannot leave its own path at any size.

### The entrance kit — four treatments, not one

The first version gave every element the same entrance: 12px of rise, 3px of
blur, 400ms, on twenty-eight things across seven sections. One idea repeated is
what makes a page read as a template however good the idea is. It is now four
treatments, assigned by what the content **is**:

| | Content | What it does |
| --- | --- | --- |
| `.rv-head` | display headings | **Uncovered**, not faded — clipped from below so the Didone is at full contrast from the first frame. |
| `.rv-text` | body copy | A 10px rise, and **no blur**. |
| `.rv-card` | cards, columns | Rise + `scale(.985)` + 2px blur, staggered 70ms. The star badge lands 200ms after its card, with the only overshoot on the page. |
| `.post .shot` | article images | A **wipe**: the frame opens while the picture drifts 1.07 → 1 inside it, so two edges move at different rates. |

**The blur came off the text.** Blurring body copy on entry is the clearest tell
of an amateur scroll animation — for 400ms the reader's own eyes are told they
are out of focus. Blur stays only where there is a shape to soften.

Four, not seven. A page where every section invents its own effect is not
sophisticated, it is noisy, and the reader stops trusting that motion means
anything.

### The marks draw themselves

Four hand-drawn pen marks — a highlighter behind the hero's last clause, a lasso
around *Intelligence*, a ruled underline, a squiggle. Until now they were
drawings of pen strokes that were simply *there*. Two techniques, because there
are two kinds of mark:

- the lasso, underline and squiggle are **stroked**, so they walk a
  `stroke-dashoffset` along their own length. `pathLength="1"` normalises them so
  the short underline and the long lasso draw at the same rate.
- the highlighter is a **filled closed path** — a fill has no stroke to dash — so
  it is wiped behind a leading edge held 10% off vertical. That slant is the
  difference between a marker dragged across a word and a rectangle growing.

Each is timed to the kind of stroke it is: the lasso is a whole loop and takes
780ms, the ruled underline is one confident pull at 440ms. Every mark lands
*after* its own word, which is the order the two things happen on paper.

### The dead-man's switch

Everything §18–25 hides is scoped to `html.fx`, and `.fx` is set by an inline
line in `<head>` **before `scroll.js` loads**. If that file 404s or throws,
nothing would ever unhide the page — content would be gone, not just unanimated.
So `scroll.js` signals `fx-on`, and if that has not happened in 2 seconds `.fx`
comes off and the page resolves to its finished state. Verified by aborting the
request: hidden at +0.5s, fully recovered at +2.8s.

### The gradient signature, which is measured rather than invented

The same construction appears in Attio's hero and six times on Stripe's
homepage. Two teams arriving independently at one shape:

- an ellipse **oversized** to ~90–103% of the box on both axes
- origin **`at 50% 100%–106%`** — centred, at or *below* the edge, so the
  saturated core is off-canvas and **you never see the light source**
- six to eight stops, spacing **widening** toward the end
- a terminal stop that is **exactly the section's own background colour**

That last rule is the whole thing. Terminating in the page means the wash has no
boundary anywhere; you see only falloff. A gradient ending in a colour the page
does not already have is a blob with a visible edge — the difference between
atmosphere and a stock hero graphic. Every wash here follows it.

### Why the hue is rotated 11°, not 90°

Pure teal `#02A885` is OKLCH C .127 — *more* chromatic than Attio's periwinkle.
Across an area this size it reads as a wellness brand. But **the hue is not what
does that**; C ≥ .06 held at L .85–.95 is. Rotating all the way to blue would be
worse: the mint band is H 176 and the green H 168, so a wash at H 200+ would sit
30° off its own family and read as an accident.

H **182** is eleven degrees off pure green — out of the leaf corner, still the
same colour as the section it runs into. Every visible stop is capped at C ≤
.068, about half Attio's. `oklch(.965 .015 176)` renders as exactly `#EAF7F3`,
so the existing mint band **is** the top of the ramp.

### Why the iris is not the planet

On geometry, not on size:

- **hollow inside 71%** of its radius — there is no disc
- one arc terminates in `#EAF7F3`, the band's exact ground, so the ring is
  visibly **open**
- **four blade seams** interrupt the rim, the way a lens diaphragm does
- it **never translates** — it rotates about its own centre, and nothing passes
  in front of or behind it
- it is a `background-image` on a pseudo-element inside one 373px band. The
  rejected version was a fixed fullscreen canvas with a filled disc crossing the
  viewport

The colour shift is the conic hues sweeping past the rim mask as it turns —
48°, driven entirely by scroll through `animation-timeline: view()`. **No
clock**, so it cannot run off-screen or cost a battery. Amber is deliberately
absent from the ramp: amber means *pending* on this page, and a warm point on a
decorative rim would read as a status.

> **`overflow: clip`, never `hidden`.** Both crop. But `hidden` makes the element
> a scroll container, and a `view()` timeline resolves against the nearest one —
> so the iris measured itself against a box that never scrolls and its rotation
> froze at a single angle. This cost an hour; it is one word.

### Contrast went up, not down

The CTA floor **darkens** toward the bottom. That direction is an accessibility
decision: white on `#02A885` is 3.02:1, and `.cta .fine` is 18px, so it fails AA
today. Lightening the floor — the more obvious move — would take it to 2.36:1.
Deepening puts the darkest tone where the smallest type sits: **3.55:1**.

axe-core against `main`: **26 violations → 24. Zero added, two removed.**

### What was rejected

**~80% of 21st.dev's atmosphere catalogue is WebGL** in 2026 — every Paper
Shaders export, every aurora, every gradient orb. All out on the
zero-dependency rule. The black-hole and orrery entries were out twice over.

The one close match, *Iridescent Foil*, was rejected on maths: its layers
combine with `overlay` and `soft-light`, which are **identity operations over
white**. Four of its five layers would render as literally nothing here.

And Attio itself does not attempt this on white — their light page has zero
canvases and no wash, only hairlines. The moon is a dark-surface technique. What
transfers to a light page is the gradient signature and the weave.

### What this replaced

The first attempt at this was a fullscreen fixed canvas that played an eclipse
over the page — a dark disc crossing the viewport, orbits, a corona. It was
measured, it performed well, and it was **the wrong idea**: a show happening on
top of a website rather than a website behaving well, borrowing a cosmic
metaphor that had nothing to do with the product, and covering the header to do
it. It is gone, along with the 46kB of GSAP it briefly needed. This is the
replacement, and the rule it is built on is the one the old version broke:
**nothing is ever covered.**

## The standalone pages

`about.html`, `contact.html`, `solutions/*.html` and `products/*.html` are
**standalone mockups** —
each carries its own inline CSS and shares nothing with the homepage but the
brand and the self-hosted display face. `products/` holds one page per product, linked from
every product tile, the Products nav panel, the drawer and the footer.

| Tile on the homepage | Page | The page calls it |
| --- | --- | --- |
| Mimic | `products/mimic.html` | Mimic |
| HRMS | `products/hrms.html` | HRMS |
| Axiom | `products/axiom.html` | Axiom |
| Sales CRM | `products/nouscrm.html` | **NousCRM** |
| tasca | `products/tasca.html` | tasca |
| Recapr | `products/recapr.html` | Recapr |
| Document Parser | `products/lexer.html` | **Lexer** |
| Private AI Engine | `products/vawlt.html` | **Vawlt** |

Tiles resolve through `tileHref()` in `build.js`, which now prefers a local
page over anything external, so all eight are linked — Axiom and Vawlt had no
destination at all before. Local pages open in the **same tab**; only external
links get `target="_blank"`.

### The about page

`about.html` sits at the root, matching its own canonical of `/about`. Two
things on it turned into real destinations elsewhere:

- **`#leadership`** — the homepage's Company panel used to mark *Leadership*
  "soon". It now points at `about.html#leadership`, so the count of unlinked
  footer entries dropped from ten to nine.
- **The nav's *Blog*** points at the homepage's `#insights` section, which is
  where the published articles actually live.

The nav item for the page you are on (`class="on"`) is rendered **unlinked with
`aria-current="page"`** rather than as a link to itself — a nav item that
reloads the page you are reading misrepresents what it does.

### The sign-in page

`signin.html` sits at the root, matching a canonical of `/signin`. It is the
destination for every **Sign in** in every header and drawer on the site — 30
links across 15 pages, set from `GO.signin` in `build.js` for the generated
pages and from `SIGNIN` in `tools/fix-pages.js` for the standalone ones.

**Its shell is `contact.html`'s, sliced whole** — the same `<style>` block, the
same header, drawer, mobar and footer, the same base64 logo. Only what a login
screen needs and a contact page does not is added, in a `13 · SIGN IN` section
at the end of the CSS. Two root pages that share a design system and retype it
are two pages that will disagree eventually.

**It ships not connected, and says so.** `AUTH.url` and `AUTH.anonKey` at the
top of the page's script are empty, so the page shows a "not connected" notice,
keeps every control disabled, and requests no third-party script at all. Fill
both in (Supabase → Project Settings → API) and it authenticates for real. A
login form that looks live and is not is worse than no login form, which is why
that state is a visible notice rather than a silent no-op.

**Google** needs the provider switched on once in the same dashboard, plus this
page's URL in the redirect allow-list. The flow is PKCE, so no token ever lands
in a URL.

**What it does not claim.** There is still no single sign-on: eight applications
on six hosts, several holding their own login. The page says that in its own
copy and keeps a link to the tile grid, so it does not quietly reinstate the
"8 products. 1 login." claim this site already retired.

**Two things were deliberately left out** — self-serve sign-up, and a real
password reset. Accounts are issued by the team today, so both point at
`contact.html`. Wiring `resetPasswordForEmail` is a small edit to the same
script when that changes.

**Swapping provider** means rewriting two functions. Only `signInWithPassword`
and `signInWithOAuth` touch Supabase; Firebase, Auth0 and Clerk expose the same
pair. The pinned CDN build carries an SRI `sha384` hash — this is the script
that will hold a password field, so a swapped file on the CDN is the one
supply-chain failure that matters here. Bumping the version means recomputing
the hash; the command is in the comment above it.

### The contact page

`contact.html` sits at the root, matching its own canonical of `/contact`. It is
now the destination for every "Contact", "Contact us", "Talk to us", "Get in
touch", Pricing and Support link on the site, replacing
`talbotiq.com/contact-us/`. That is worth the swap because **its contact methods
actually work** — the email, both phone numbers and the WhatsApp link were live
in the mockup — even though its form is not wired.

**"Book a demo" deliberately stays on `talbotiq.com/inquiry-now/`**, because
that form does work and the local one does not.

Three things on it were finished rather than linked:

- **The two map buttons** are built from `COMPANY.address` using Google Maps'
  documented URL schemes (`/maps/search/?api=1&query=` and
  `/maps/dir/?api=1&destination=`) — no key, no embed. The address itself was
  lifted out of the page's own `<address>` block into `products.js`, so the
  links and the printed address can never disagree.
- **The newsletter** has no endpoint, so the field is `disabled` with a "Not
  wired up yet" note and Subscribe loses its href — the same treatment the
  homepage's newsletter gets.
- **The invented person is gone.** `placeholder="John"`, `"Doe"`, `"John Doe"`
  and `"john.g@acme.com"` were one made-up identity used as example input. A
  placeholder on an already-labelled name field teaches a reader nothing, and
  the labels all stay, so no field became unlabelled.

### The solution pages

`solutions/` holds one page per service. Four of the five exist — **AI Strategy
& Consulting**, **AI Agent & Bot Development**, **Embedded Edge AI** and **Full
Stack Dev & AI Integration**. Only *AI Governance & Security* is missing, and it
has no live URL either, so it renders **unlinked** rather than pointing at a
page that does not exist. Adding one is two steps: drop the file in `solutions/`, then
add a line to `SOLUTION_LOCAL` in `tools/fix-pages.js` and a `local:` field to
that entry in `home.js` → `SOLUTIONS`.

Note the mockup's canonical says **`/solutions/`** while the live site serves
these at **`/services/`**. The local directory follows the mockup; the external
fallback URLs still point at `/services/`, which is what actually resolves
today.

**The mockups disagree with each other on two service names.** The service page
prints *"AI Agents & Bots Development"* and *"Full Stack Development & AI
Integration"*; the product and about pages — and `home.js` — use *"AI Agent &
Bot Development"* and *"Full Stack Dev & AI Integration"*. Picking a winner is
a copy decision, so the tool maps every spelling to the same destination and
leaves the wording to you.

### Re-run the fixer when a page is replaced

```bash
node tools/fix-pages.js
```

Every link in the supplied mockups was `href="#"` — **500 of them across the
fourteen pages, including the logo**, which made each page a dead end: you could
click a tile but never get back. The tool points them at the destinations the
homepage already knows, so a product page and the homepage cannot disagree
about where "Contact us" goes. It is idempotent, so re-running after a page is
replaced is safe; `--dry` reports without writing and `--verbose` shows which
rules fire.

**It is location-aware.** `about.html` and `contact.html` are at the root while
`products/*.html` and `solutions/*.html` are one level down, so "the homepage" is `index.html` from one and `../index.html` from
the other, and a product link is `products/mimic.html` from one and
`mimic.html` from the other. Every rule is built per page from its own depth.
Getting this wrong would be silent — the link still exists, it just 404s — so
the check at the end of every run resolves every local href against the
filesystem.

Where no destination exists — Leadership, Memberships, Careers, Terms,
Security, AI Governance & Security — it **removes the `href`** rather than
leaving it on `"#"`. An `<a>` with no href is not a link: not focusable, no
pointer cursor, and it cannot promise a page that does not exist. Those six are
exactly the entries the homepage marks "soon".

### The display face is swapped here too

The mockups shipped with **Caveat Brush** — the brush script the homepage used
before it was deliberately replaced. Left alone, the homepage and the page one
click away from it read as two different brands, so the tool applies the same
swap: Caveat Brush comes out of the Google Fonts request (Inter stays), MESHED
Display is added as a self-hosted `@font-face` from `../assets/fonts/`, and
`.hand` moves to weight 700 with `line-height: 1.08` — the homepage's value.

**The highlighter had to be re-aimed, as it did on the homepage.** `top: 26%;
height: 74%` was tuned to Caveat Brush; against MESHED Display those numbers
paint below the baseline and the mark reads as a thick underline. Two steps fix
it:

1. **Crop the SVG's viewBox to its ink.** Measured with `getBBox()` in a
   browser, the path occupies y 24–52.6 of its `0 0 W 60` box on all eight
   pages — so half the box was empty padding the CSS had to reason around.
   `0 24 W 28.6` makes the box exactly the painted band. (The widths differ per
   page — 240, 250, 260 — so the rule captures it.)
2. **Position in `em` against the font's own metrics**, giving `top: .24em;
   height: .62em` — the same numbers as the homepage, because the face and the
   line-height are now the same. `em` means one pair of values holds at every
   heading size the pages use (64/46/40/32/22px) with no per-breakpoint work.

The lasso, underline and squiggle were checked against the new face and left
alone: the lasso still encircles its word and both underlines still sit below
the baseline.

It also fixes two bugs the mockups shipped with:

- **The footer logo was not a link** on any page — a bare `<img>`. It now goes
  home, which together with the header logo gives two ways back.
- **Five list items with no list.** Seven of the eight pages open their
  capability block with five `<li>` elements sitting directly inside a `<div>`,
  with zero `<ul>` in the file — invalid HTML, and it also meant the
  stylesheet's own `.capbul li` rules never matched, so those bullets rendered
  unstyled. `nouscrm.html` is the one page that got it right, which is how the
  intended wrapper was identified.

## The articles section

`#insights` shows every column by **Akhil Gupta** published in *The Edge
Malaysia*. **None of it is typed by hand.** `tools/fetch-articles.js` reads the
publisher's own page data and writes `articles.js`, so no title, date or
summary on our page can drift from what The Edge actually printed.

### Adding new articles

```bash
node tools/fetch-articles.js && node build.js
```

That is the whole procedure — the fetcher follows the author index's pagination,
picks up whatever is newly published, and rewrites `articles.js`. To see what
would change without writing anything:

```bash
node tools/fetch-articles.js --dry
```

### How it works

theedgemalaysia.com is a Next.js site: each page ships its server data in a
`<script id="__NEXT_DATA__">` tag, and the author index puts its rows in
`props.pageProps.authorData` alongside `total`, `limit` and `offset`. The
fetcher reads that JSON — it does **not** scrape rendered HTML, so a restyle of
their site does not break it. Pagination is followed until the rows run out and
then cross-checked against the publisher's own `total`; a mismatch prints a
warning rather than silently shipping a short list.

Articles link to `theedgemalaysia.com/node/<nid>`, which is what the author
index itself links to. Cards open in a new tab.

### Nothing is rewritten

Titles, dates and summaries are verbatim. **The publisher truncates its own
summaries mid-word** — "…reshaping surgical procedu…" is what their page and
their `<meta name="description">` both say — and that is preserved rather than
tidied. Cards clamp to four lines in CSS for layout only; the full source text
stays in the markup.

The one normalisation is stripping zero-width characters from byline text,
which their CMS leaves in some records. They are invisible, so nothing a reader
sees changes.

### What to know

- **8 articles, one page.** The author index reports `total: 8` with a page size
  of 10, and pages 2 and 3 return zero rows — so page 1 is the complete set.
- **Two co-authored.** "The rise of AI in surgery" is credited to Akhil Gupta,
  Hanafiah Harunarashid and Levin Kesu Belani. The byline is stored as printed.
- **`BLOG.show` in `home.js`** is `null`, meaning show all. Set it to a number
  to cap the grid; the rest stay behind the "all articles" link.
- **Section heading** is still the mockup's *"From our blogs"*. These are columns
  published by a masthead rather than posts on our own blog — each card is
  attributed "· The Edge Malaysia" for that reason. If the heading should say
  something like *"In the press"*, that is `COPY.blogHeading` in `home.js`.
- **Three placeholder cards were replaced.** Two were loose paraphrases of
  articles now shown verbatim (the "US$15.7 trillion" card was a rewrite of the
  real summary of "The algorithmic edge"). The third was a podcast episode
  (*[EP120] Beyond the Headlines*) which is not in the author index and had no
  URL; it needs its own list if it should appear.

## Placeholders are marked, not hidden

The mockup's own annotation bar called out four things as placeholder. All four
are still placeholder, each says so where it is used, and each is one field
away from being real:

| What | Where | To finish it |
| --- | --- | --- |
| Product icons | `home.js` → `TILES[].icon` | Replace the SVG body. Shape-coded stand-ins in the brand palette, not a commissioned set. |
| ~~Client logos~~ | — | **Done.** Four real logos in `assets/brand/clients/` — see the README there for how they were prepared and two traps. |
| ~~Testimonial~~ | — | **Gone.** The dashed "no published quote" slot was replaced by the `#why` section. A real client quote would now need a section of its own. |
| ~~Blog thumbnails~~ | — | **Done.** Real article images now come from the publisher with the rest of each record. See *The articles section*. |

**Destinations that do not exist yet render as text, never as dead links.**
`url: null` anywhere in `home.js` prints the label with a quiet `soon` marker.
Ten entries are in that state today — Leadership, Memberships, Careers, all
four Resources, AI Governance & Security, Terms and Security.

There are two different reasons a product has no link and the page does not
confuse them. **Axiom** is marked `soon` because it is not built. The **Private
AI Engine** is live and metering the rest of the suite, but its console is an
internal admin surface, so it renders unlinked and *unmarked* — calling it
"soon" would be false.

## Known gaps

These are decisions, not bugs, and each is one line to change:

- **`Sign in` goes to `#products`.** There are eight applications on six hosts
  and no single sign-on, so there is no one login to link. The tile grid is
  where you pick an app. See `GO.signin` in `build.js`.
- **`Pricing` and `Support` both go to the contact page.** Neither page exists.
  A company with no published price list answers that in a conversation, and a
  nav item that 404s is worse than one that redirects somewhere real.
- **The newsletter field is `disabled`,** with a "Not wired up yet" note, because
  `NEWSLETTER.action` is null. Set an endpoint and it becomes a real form. A
  subscribe box that silently swallows an address is worse than one that admits
  it is not connected.
- **`"8 products. 1 login."`** is the mockup's copy and the one claim on the page
  that the products do not currently support — see `Sign in` above.
- **`COMPANY.pageUrl` is null,** so no `<link rel=canonical>` or `og:url` is
  emitted. A canonical pointing at a 404 is worse for SEO than neither. Set it
  (e.g. `'https://talbotiq.com/'`) and rebuild before going live.

## The build fails rather than the page

`build.js` checks its inputs before writing anything: every tile must join to a
real slug, carry a tagline and an icon; no two tiles may share a slug; every
capability and solution must have text. A broken join stops the build with a
list of what is wrong, so it never reaches a reader.
