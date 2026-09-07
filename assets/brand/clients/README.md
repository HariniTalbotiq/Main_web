# Client logos — the "Trusted by" row

Four marks, all third-party trademarks used to identify their owners. They are
declared in `home.js` → `CLIENTS`.

| File | Client | Source supplied | Notes |
| --- | --- | --- | --- |
| `aisling.webp` | Aisling | 2172×724 PNG | Colour lockup |
| `pomodoro.webp` | Pomod'Oro | 2172×724 PNG | Colour lockup |
| `namaste-india.webp` | Namaste India | 970×231 PNG | **Split** out of a two-lockup asset |
| `namaste-india-1947.webp` | Namaste India | same file | The stacked "1947" badge — **not currently used** |
| `total-it-global.svg` | Total IT Global | SVG | Vector, used as supplied |

## What was done to them

The two big PNGs arrived at ~500kB each, which is not shippable for a
supporting row near the bottom of the page. Each raster was trimmed to its own
ink, scaled to a 132px-tall master (3× the ~44px display box, so it stays sharp
on a retina screen) and written out as WebP:

- `aisling.webp` — 490kB → **31kB**
- `pomodoro.webp` — 530kB → **38kB**
- `namaste-india.webp` — from the 87kB combined asset → **36kB**

Reproducing that for a new logo (Pillow, one-off — not part of `node build.js`):

1. Open as RGBA, find the bounding box of pixels that are neither transparent
   nor near-white (threshold 246), and crop to it.
2. Resize to height 132 with `Image.LANCZOS`, preserving aspect.
3. Save as WebP, `quality=92, method=6`.

`total-it-global.svg` is vector and needs none of this — it is the supplied file
byte for byte.

### The Namaste India split

The supplied asset holds **two** lockups side by side: the horizontal wordmark
and the stacked "1947" badge. A column-occupancy scan found empty vertical
bands at x=345–366 and x=569–590. Both are 21px wide, so "widest gap" cannot
pick the divider — the first one falls *inside* the left lockup, between
"Namaste" and "India". The real divider is the second, so the split is at
**x=580** and both halves were exported.

The horizontal wordmark is the one on the page: at 44px tall the stacked badge
would reduce its "MODERN INDIAN CUISINE" line to unreadable. To swap them,
point `CLIENTS` at `namaste-india-1947.webp`.

## Two traps worth knowing

**The Aisling file supplied was the white version.** `Aisling-Logo-Retina-W-03.webp`
— the `-W-` is "white" — is drawn for dark backgrounds and is invisible on this
band. `aisling.webp` here is the colour lockup instead. If a dark section ever
needs it, the white original is the right asset for that, not this one.

**These are shown in full colour on purpose.** The conventional treatment is
`grayscale(1)` at reduced opacity. It was tried and reverted: two of the four
are gold wordmarks, and greyscaled gold goes near-white and disappears against
`--band`. The reasoning is in `talbotiq.css` §7 next to the rule.

## Sizing

One shared box height is what makes a row of mixed aspect ratios read as a
single line. These four run from 4.5:1 to 1.8:1, so `CLIENTS` entries carry an
optional `scale` that multiplies the box height for a mark that needs it:

- **Total IT Global — `scale: 1.5`.** The only stacked lockup (mark over
  wordmark); at a shared height its type came out about half the size of the
  others'.
- **Namaste India — `scale: 1.12`.** The thinnest mark of the four.

## Attribution note

**Total IT Global is not an arm's-length customer.** Akhil Gupta is group CEO of
both Talbotiq Technologies and Total IT Global — it is a sister company in the
same group, and the bylines on the articles in `articles.js` say so. Listing it
under a heading that reads "Trusted by" is a disclosure question rather than a
technical one, and it was included because it was asked for. Worth a deliberate
decision before this page goes public.
