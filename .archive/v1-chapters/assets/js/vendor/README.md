# Vendored third-party code

## lenis.min.js — v1.1.18

Smooth scrolling. <https://github.com/darkroomengineering/lenis> — MIT licence,
© darkroom.engineering.

**Vendored rather than loaded from a CDN on purpose.** This page is meant to
open straight from the filesystem and to keep working offline; a CDN `<script>`
would break both. The only local edit is the removal of the trailing
`sourceMappingURL` comment, since the `.map` file is not vendored and the
reference would just 404 in devtools.

It attaches one global, `globalThis.Lenis`, and `assets/js/app.js` uses it
**only** when `prefers-reduced-motion` is not set. The page scrolls natively
without it — nothing here is required for the page to work.

To update: replace the file, re-strip the sourceMappingURL line, and bump the
version above.
