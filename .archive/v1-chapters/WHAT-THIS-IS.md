# v1 — the chapter design (archived 2026-09-07)

The page as it stood before the homepage was rebuilt to the
`mockup-homepage.html` direction (Caveat Brush display type, teal/yellow,
hand-drawn annotations, Odoo-derived structure).

This version's design: Archivo + IBM Plex Mono, green-as-signal, a knit
figure in the hero, and one bespoke composition per product chapter, plus
a command-K launcher, a chapter scale and a mega menu with a preview pane.

Everything here is complete and buildable:

    cd .archive/v1-chapters && node build.js   # writes index.html HERE

`products.js` in the live project still carries every product's description,
features and `evidence` string from this version — the accuracy contract
survived the redesign. What was dropped was the CHAPTER MACHINERY that
rendered them (story/arc/redact/statement fields and LIFECYCLE), which the
new homepage has no place for.
