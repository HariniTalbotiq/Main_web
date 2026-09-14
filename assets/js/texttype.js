/* ==========================================================================
   THE TYPEWRITER — every display heading types itself in
   Requested for the hero line and for "every heading of this meshed display",
   product pages included. That is one h1 and six h2s on the homepage and
   thirteen `.hand` headings on each of the seventeen product pages.

   WHY THIS IS NOT React Bits' <TextType />. That component is the right
   reference for the BEHAVIOUR and this file matches its semantics on purpose
   — type on visible, a per-character cadence with a human jitter, a blinking
   caret, reduced-motion respected. What it cannot bring is its machinery:

     - it is a React component, and this site has no React and no build step
       that could compile JSX;
     - it animates its caret with gsap, a 70kB dependency to blink one glyph
       that `@keyframes` blinks for nothing;
     - either would break the repo's zero-dependency rule, which is a stated
       rule and not an accident.

   Two of its props are deliberately NOT implemented, because they are wrong
   for headings rather than merely unused. `loop` cycles a list of strings
   forever: a marketing headline that retypes itself every few seconds is a
   heading that can never be read, and a `<h1>` whose text keeps changing is
   an accessibility problem, not an effect. `deletingSpeed` and
   `pauseDuration` only exist to serve that loop. This types once and stops.

   ---------------------------------------------------------------------------
   THE THREE THINGS THAT MAKE THIS SAFE TO PUT ON AN h1

   1. NO-JS AND NO-FX ARE THE PLAIN TEXT, and that is not a fallback, it is
      the markup. The heading ships complete in the HTML. This file only ever
      takes text that is ALREADY on the page and animates it, so a failed
      script, a stripped `.fx` flag or a reader with motion turned off gets
      the heading, in full, immediately. `effad8d` fixed exactly this class of
      bug once already ("stop the hero headline from depending on JS to be
      visible") and it is not being reintroduced.

   2. NOTHING IS HIDDEN UNTIL IT IS ABOUT TO BE TYPED. The split happens in
      the IntersectionObserver callback, not at load. A heading that never
      comes into view — inside a collapsed block, on a hidden tab, below a
      page the reader leaves early — is never touched and therefore can never
      be left invisible by an observer that does not fire.

   3. THE RESTING STATE IS THE ORIGINAL MARKUP, restored on completion, so
      the glyph spans exist only while the animation does. See the note on
      shaping in run() for what that is and is not worth.
   ========================================================================== */
(function () {
  'use strict';

  var html = document.documentElement;

  /* THE `.fx` GATE IS CONDITIONAL, AND CHECKING THAT IT EXISTS IS THE WHOLE
     POINT OF THESE TWO LINES.

     `.fx` is the site's pre-paint switch for "animation is on at all" — not
     set under reduced motion, and stripped by a dead-man's switch if the page
     never finishes booting. Inheriting it is the right thing to do WHERE IT
     EXISTS. It exists on five pages: the homepage, the two hub pages, the
     demo page and 404. The seventeen product pages and four solution pages
     are standalone documents with their own inline CSS and no flag system at
     all; they gate motion on the reduced-motion media query directly.

     So requiring `.fx` unconditionally would have made this file a silent
     no-op on exactly the twenty-three pages the request was mostly about
     ("also for all product headings please"), and it would have failed
     silently — no error, no warning, just headings that never type. Verified
     by counting: 5 pages carry the flag, 23 do not.

     `js` is set by the same inline snippet that sets `fx`, unconditionally
     and before paint, so it is a reliable answer to "does this page have the
     flag system?" — which is a different question from "is `fx` off?" and the
     one that actually has to be asked here. */
  var flagged = html.classList.contains('js');
  if (flagged && !html.classList.contains('fx')) return;
  if (!window.IntersectionObserver || !window.requestAnimationFrame) return;
  if (!document.createTreeWalker || !document.createDocumentFragment) return;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce && reduce.matches) return;

  var heads = [].slice.call(document.querySelectorAll('.hand'));
  if (!heads.length) return;

  /* ---- cadence -----------------------------------------------------------
     <TextType /> defaults to 50ms a character. That is a good rate for a
     short rotating tagline and too slow for a heading: "Every workflow,
     running on intelligence." is 40 characters, which at 50ms is two full
     seconds before the sentence exists.

     30ms for headings. 22ms for the hero, and that number is an LCP
     decision, not a taste one — the hero h1 IS this page's Largest
     Contentful Paint element, so the paint cannot complete until the last
     character lands. 22ms puts that at ~0.9s after the observer fires.

     JITTER is <TextType />'s `variableSpeed`, kept because it is the whole
     difference between a typewriter and a progress bar: a perfectly regular
     cadence reads as a machine filling a buffer. +/-22% is enough to feel
     like a hand and small enough not to look like jank. */
  var CADENCE = 30;
  var HERO_CADENCE = 22;
  var JITTER = 0.45;
  var LEAD = 110;               /* `initialDelay` — one beat before the first glyph */

  /* THE HERO WAITS FOR ITS PANEL, and the number is the reference's, not a
     guess. §32 swings the hero up from flat over 1300ms after a 140ms delay,
     and typing a headline while its panel is still face-down is nonsense —
     the glyphs would land on a surface the reader cannot read, and the caret
     would blink in a foreshortened plane.

     It does NOT wait for the swing to finish, which was the obvious first
     answer and the wrong one. The reference fades its screen content in
     across p = 0.42 to 0.86 of the hinge, so the panel arrives already awake
     rather than lighting up after it has stopped.

     p IS NOT t, AND CONFLATING THEM IS THE MISTAKE THIS NUMBER FIXES. The
     first version read the reference's 0.42 as a fraction of the DURATION and
     set the lead to 140 + 0.42 * 1300 = 686ms. But 0.42 is eased progress,
     and §32's curve — cubic-bezier(.28, 1.16, .38, 1) — is heavily
     front-loaded: it reaches 42% of the way up in the first 11% of its time,
     and 85% of the way up by 29%. Solving the bezier:

         p = 0.414  at  t = 0.109   ->  140 + 0.109 * 1300 = 282ms
         p = 0.853  at  t = 0.294   ->  140 + 0.294 * 1300 = 522ms

     So 686ms was not "mid-swing", it was after the panel had all but
     arrived, and the visible result was a hero that swung up with an empty
     hole where its headline goes. 285ms is where the reference actually
     starts waking. The last glyph lands at 285 + 36 * 22 = ~1077ms, inside
     the 1440ms swing, so the two motions overlap as intended.

     Only the hero has a panel, so only the hero has this. */
  var HERO_LEAD = 285;

  function isSpace(ch) {
    return ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === ' ';
  }

  /* ---- splitting ---------------------------------------------------------
     One span per glyph, walking text nodes so that the keyword spans the
     headings already carry — `.k-g`, `.k-y` and the hero's `.k-brush` — are
     preserved rather than flattened. Rebuilding the heading from its
     `textContent` would be four lines shorter and would throw away the
     colour and the marker swash.

     SPACES STAY AS TEXT NODES. Two reasons, and the second is the load-bearing
     one. They are invisible either way, so a span buys nothing; and wrapping
     them is the one thing here that could change how the heading BREAKS.
     Element boundaries do not create line-break opportunities — that is why
     splitting a word into glyph spans does not let it break mid-word — but
     whitespace handling across boundaries is a different and much fussier
     part of the spec, and there is no reason to go near it.

     Array.from, not `text[j]`, so an astral character is one glyph and not
     two broken halves of a surrogate pair. */
  function split(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);

    var glyphs = [];
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var chars = Array.from ? Array.from(node.nodeValue) : node.nodeValue.split('');
      var frag = document.createDocumentFragment();
      for (var j = 0; j < chars.length; j++) {
        if (isSpace(chars[j])) {
          frag.appendChild(document.createTextNode(chars[j]));
          continue;
        }
        var sp = document.createElement('span');
        sp.className = 'tt-c';
        sp.textContent = chars[j];
        frag.appendChild(sp);
        glyphs.push(sp);
      }
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
    }
    return glyphs;
  }

  function run(el) {
    /* THE ORIGINAL MARKUP IS KEPT AND PUT BACK AT THE END.

       The reason is that glyph spans break text runs, and a text run is the
       unit the shaper works on: split a word and kerning pairs and ligatures
       across the seams are no longer the shaper's to resolve. On a 76px
       Didone that could be conspicuous.

       MEASURED, BEFORE BELIEVING IT. The hero line's shaped text box is
       940.73px split into 36 spans and 940.59px restored — 0.14px apart, and
       identical in height. So on this face, in this engine, the split costs
       essentially nothing and the restore is not rescuing the page from
       anything visible.

       It stays for two reasons that survive that measurement. It is the
       resting state the reader actually reads, and it should be the markup
       the author wrote rather than 36 spans that happen to look the same —
       and 0.14px is a fact about Meshed Display in Chromium, not a fact about
       shaping. A face with a real "fl" ligature, or an engine that shapes
       runs differently, would not be promised anything by this file if the
       spans were left in place. As a bonus it is also what removes the caret
       and the glyph spans, so there is no cleanup pass to forget. */
    var original = el.innerHTML;
    var glyphs = split(el);
    if (!glyphs.length) { el.innerHTML = original; return; }

    var isHero = el.matches && el.matches('.hero h1.hand');
    var cadence = isHero ? HERO_CADENCE : CADENCE;
    var lead = isHero && html.classList.contains('fx') ? HERO_LEAD : LEAD;

    /* THE CARET IS A CLASS, NOT AN ELEMENT. It has to sit after the last
       glyph TYPED rather than at the end of the heading — the untyped glyphs
       are still reserving their space, so a caret parked at the end of the
       element would blink half a line away from the word being written,
       which reads as a rendering fault.

       So it moves, and what moves is `.tt-at`, which the stylesheet draws as
       an absolutely positioned `::after` on whichever glyph holds it. The
       first version of this moved a real `<span>` through the text instead
       and cost 0.3413 CLS on a phone; the note in section 31 of the
       stylesheet has the why. Nothing is inserted or removed here now. */

    /* THE WHOLE HEADING IS ANNOUNCED, NOT THE PARTIAL ONE. Glyphs are hidden
       with `visibility`, which correctly removes them from the accessibility
       tree too — so without this a screen reader arriving mid-animation would
       read "Every workfl". The label carries the full sentence for as long as
       the visible text is incomplete, and comes off with the last glyph. */
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.classList.add('tt');

    var i = 0, due = lead, t0 = 0, caretAt = -1;

    function frame(now) {
      if (!t0) t0 = now;
      var elapsed = now - t0;
      /* A while-loop against elapsed time, not one timer per character: a
         dropped frame then catches up instead of stretching the whole line,
         and the cadence stays honest on a slow device. */
      var moved = false;
      while (i < glyphs.length && elapsed >= due) {
        glyphs[i].classList.add('on');
        i++;
        moved = true;
        due += cadence * (1 + (Math.random() - 0.5) * JITTER);
      }
      /* Where the caret WAS is tracked, not inferred from `i`. A frame that
         runs long reveals several glyphs at once, so the previous caret can
         be any distance back — `i - 2` was wrong for exactly the burst case
         the while-loop above exists to handle, and would have left a trail of
         stuck carets behind it on a slow device. */
      if (moved) {
        if (caretAt >= 0) glyphs[caretAt].classList.remove('tt-at');
        caretAt = i - 1;
        glyphs[caretAt].classList.add('tt-at');
      }
      if (i < glyphs.length) { requestAnimationFrame(frame); return; }

      el.innerHTML = original;          /* shaped type, and the caret class with it */
      el.removeAttribute('aria-label');
      el.classList.remove('tt');
      el.classList.add('tt-done');      /* the hero's brush sweeps off this */
    }
    requestAnimationFrame(frame);
  }

  /* Type on visible — <TextType />'s `startOnVisible`, which is the only
     sensible setting for a heading a page-length below the fold. `once` is
     enforced by unobserving: a heading that retypes every time it is scrolled
     past is a heading nobody finishes reading. */
  var seen = new WeakSet ? new WeakSet() : null;
  var io = new IntersectionObserver(function (entries) {
    for (var k = 0; k < entries.length; k++) {
      var e = entries[k];
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      if (seen) { if (seen.has(e.target)) continue; seen.add(e.target); }
      run(e.target);
    }
  }, { rootMargin: '0px 0px -8%' });

  for (var m = 0; m < heads.length; m++) io.observe(heads[m]);
})();
