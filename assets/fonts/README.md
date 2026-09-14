# Fonts

## The display face is Bodoni Moda, and it is not in here

**Bodoni Moda** by Owen Earl (SIL Open Font License) is the display face used by
every `.hand` element. It is served from **Google Fonts**, in the same request
as Inter — see the `<link>` in `build.js` and §4 of `tools/fix-pages.js`. There
is no `@font-face` and no file to manage. Only weight 700 is requested; the
`opsz` axis is requested across `6..96` so optical sizing stays available.

## MeshedDisplay-Bold.woff2 — PREVIOUS FACE, NO LONGER REFERENCED

Nothing loads this file any more. It is kept because the licence PDF beside it
is the record of the terms it was used under; delete both together if you are
sure you will not go back.

**MESHED Display** by Rajesh Rajput — was the display face, used by every
`.hand` element (the hero line, the three annotated section headings, the
closing CTA and the hero's pencilled aside).

**Licence: free for personal and commercial use.** `MESHED-Display-License.pdf`
is the licence as shipped with the font. One clause matters for this repo:

> The typeface files may not be modified without written permission.

So this is the vendor's **own** `.woff2`, copied byte-for-byte out of the
package's `Font Files/Web-TT/` folder. **Do not subset, re-compress or convert
it** — that would be modifying the file. It is only 21kB, so there is nothing
to gain by trying.

Contact for permissions, per the licence: rajputrajesh_448@yahoo.com

### Using a different weight of the display face

Bodoni Moda comes from Google Fonts, so a weight change is a URL change, not a
file change. Edit the `family=Bodoni+Moda:opsz,wght@6..96,700` fragment in the
`<link>` — in `build.js` for the homepage and demo page, and in §4 of
`tools/fix-pages.js` for the other 24 — then change `font-weight` on `.hand` in
`assets/css/talbotiq.css` to match, and re-run both scripts. Ask for only the
weights actually used; a range ships bytes nothing references.

## Inter — self-hosted, in `inter/`

`Inter-latin.woff2` (48 kB) is the file Google Fonts itself serves for the latin subset of
Inter's variable font — one file for weights 400–700 — fetched from `fonts.gstatic.com` on
9 September 2026 and copied verbatim. It replaced the Google Fonts `<link>` on every page
because that stylesheet was a render-blocking request to a third origin in front of every
first paint (1.3–2.0 s of mobile LCP in Lighthouse). Declared in §30 of
`assets/css/talbotiq.css` for the generated pages and written into each hand-written page's
`<style>` by `tools/seo-pass.js`. Inter is SIL Open Font License; self-hosting is permitted.

Only the latin subset is shipped. If a page ever needs Cyrillic, Greek or Vietnamese glyphs,
Google's CSS lists one more file per script; add it beside this one with its `unicode-range`.
