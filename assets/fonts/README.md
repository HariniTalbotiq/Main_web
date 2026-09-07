# Fonts

## MeshedDisplay-Bold.woff2

**MESHED Display** by Rajesh Rajput — the display face, used by every `.hand`
element (the hero line, the three annotated section headings, the closing CTA
and the hero's pencilled aside).

**Licence: free for personal and commercial use.** `MESHED-Display-License.pdf`
is the licence as shipped with the font. One clause matters for this repo:

> The typeface files may not be modified without written permission.

So this is the vendor's **own** `.woff2`, copied byte-for-byte out of the
package's `Font Files/Web-TT/` folder. **Do not subset, re-compress or convert
it** — that would be modifying the file. It is only 21kB, so there is nothing
to gain by trying.

Contact for permissions, per the licence: rajputrajesh_448@yahoo.com

### Using a different weight

The family ships 20 styles (10 weights, each with a slanted companion). Only
Bold is here because only Bold is used. To switch, copy another `.woff2` from
the same `Web-TT` folder in the original download, then change the `src` and
`font-weight` in the `@font-face` block in `assets/css/talbotiq.css` and the
`font-weight` on `.hand` to match.

## Inter

Loaded from Google Fonts, as the mockup does. Body text only.
