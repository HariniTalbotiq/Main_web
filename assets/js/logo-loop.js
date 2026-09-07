/* =============================================================================
   LOGO LOOP — an infinite marquee for the "Trusted by" row
   -----------------------------------------------------------------------------
   PORTED FROM REACT BITS. The original is the <LogoLoop /> React component from
   reactbits.dev (github.com/DavidHDev/react-bits) — its licence and attribution
   terms are the upstream project's; check them before shipping publicly.

   WHY A PORT AND NOT THE COMPONENT. This site has no React, no bundler and no
   package.json — `node build.js` stamps data into one HTML file and that is the
   whole toolchain. Pulling in React + ReactDOM to render one row of four logos
   would be a bigger change than the row, so the component's BEHAVIOUR is
   reproduced here instead. What is kept is what matters:

     · the same DOM shape — .logoloop > .logoloop__track > .logoloop__list > li
     · the same class names, so the CSS is the upstream CSS
     · the same animation model — one rAF loop, exponential smoothing toward a
       target velocity, translate3d on the track, offset wrapped modulo the
       measured sequence width
     · the same constants — SMOOTH_TAU .25, MIN_COPIES 2, COPY_HEADROOM 2
     · the same sizing rule — clone the sequence ceil(container / sequence) + 2
       times, remeasure on resize, and wait for images before measuring
     · the same hover contract — hoverSpeed becomes the target while hovered,
       0 meaning pause

   WHAT WAS DROPPED, because nothing here uses it: the vertical directions
   (up/down), `renderItem`, and the React-only plumbing (memo, hooks, the
   pauseOnHover/hoverSpeed compatibility shim). Horizontal left/right is the
   one axis this row needs. Adding vertical back means a second axis in
   `measure()` and `apply()` and the upstream .logoloop--vertical CSS.

   TWO DELIBERATE IMPROVEMENTS on the original:

     1. It degrades without JavaScript. The server renders ONE real sequence of
        logos; this file clones it. If the script never runs, the row is a
        plain centred line of logos — which is exactly what was there before.
        The upstream component renders nothing without React.

     2. Reduced motion stops the LOOP, not just the transform. Upstream pins
        the track with `transform: …!important` in CSS while the rAF loop keeps
        running and keeps writing transforms that CSS overrides. Here the loop
        is never started, so it costs nothing, and the row is simply static.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    /* seconds; the time constant of the approach to target velocity. Larger
       is a longer, softer ramp when the pointer enters or leaves. */
    SMOOTH_TAU: 0.25,
    MIN_COPIES: 2,
    COPY_HEADROOM: 2,
  };

  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function num(el, name, fallback) {
    var raw = el.getAttribute(name);
    if (raw === null || raw === '') return fallback;
    var n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  function init(root) {
    var track = root.querySelector('.logoloop__track');
    var seq = root.querySelector('.logoloop__list');
    if (!track || !seq) return;

    var speed = num(root, 'data-speed', 120);
    var direction = root.getAttribute('data-direction') === 'right' ? 'right' : 'left';
    /* absent attribute -> undefined -> hover does nothing, matching the
       component's `hoverSpeed` being optional */
    var hoverSpeedRaw = root.getAttribute('data-hover-speed');
    var hoverSpeed = hoverSpeedRaw === null || hoverSpeedRaw === '' ? undefined : Number(hoverSpeedRaw);
    if (hoverSpeed !== undefined && !Number.isFinite(hoverSpeed)) hoverSpeed = undefined;

    /* Sign convention is the component's: "left" is a POSITIVE velocity, and
       the track is translated by -offset. A negative `speed` reverses. */
    var magnitude = Math.abs(speed);
    var dir = direction === 'left' ? 1 : -1;
    var targetVelocity = magnitude * dir * (speed < 0 ? -1 : 1);

    var seqWidth = 0;
    var offset = 0;
    var velocity = 0;
    var hovered = false;
    var raf = null;
    var lastTs = null;

    /* ---- copies ------------------------------------------------------- */
    /* Clones are aria-hidden: a screen reader should hear the four companies
       once, not once per copy. */
    function setCopies(n) {
      var lists = track.querySelectorAll('.logoloop__list');
      var have = lists.length;
      if (have === n) return;
      if (have < n) {
        for (var i = have; i < n; i++) {
          var clone = seq.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          /* a cloned <img loading="lazy"> that is off-screen may never load
             and would measure as zero — these are decorative repeats of an
             image the browser already has, so let them load eagerly */
          clone.querySelectorAll('img').forEach(function (img) { img.loading = 'eager'; });
          track.appendChild(clone);
        }
      } else {
        for (var j = have - 1; j >= n; j--) track.removeChild(lists[j]);
      }
    }

    function apply() {
      track.style.transform = 'translate3d(' + -offset + 'px, 0, 0)';
    }

    function measure() {
      var containerWidth = root.clientWidth || 0;
      var rect = seq.getBoundingClientRect();
      var w = rect ? rect.width : 0;
      if (w > 0) {
        seqWidth = Math.ceil(w);
        var needed = Math.ceil(containerWidth / seqWidth) + CONFIG.COPY_HEADROOM;
        setCopies(Math.max(CONFIG.MIN_COPIES, needed));
        offset = ((offset % seqWidth) + seqWidth) % seqWidth;
        apply();
      }
    }

    /* ---- the loop ------------------------------------------------------ */
    function frame(ts) {
      if (lastTs === null) lastTs = ts;
      var dt = Math.max(0, ts - lastTs) / 1000;
      lastTs = ts;

      var target = hovered && hoverSpeed !== undefined ? hoverSpeed : targetVelocity;

      /* frame-rate independent approach to `target` — the same easing the
         component uses, so a 144Hz screen ramps at the same rate as 60Hz */
      var ease = 1 - Math.exp(-dt / CONFIG.SMOOTH_TAU);
      velocity += (target - velocity) * ease;

      if (seqWidth > 0) {
        offset = ((offset + velocity * dt) % seqWidth + seqWidth) % seqWidth;
        apply();
      }
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf !== null || reduceMotion.matches) return;
      lastTs = null;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (raf === null) return;
      cancelAnimationFrame(raf);
      raf = null;
      lastTs = null;
    }

    /* ---- hover --------------------------------------------------------- */
    if (hoverSpeed !== undefined) {
      track.addEventListener('mouseenter', function () { hovered = true; });
      track.addEventListener('mouseleave', function () { hovered = false; });
      /* keyboard parity: tabbing onto a logo link should hold it still too,
         otherwise the thing you just focused slides out from under you */
      track.addEventListener('focusin', function () { hovered = true; });
      track.addEventListener('focusout', function () { hovered = false; });
    }

    /* ---- measure when the images and the box are ready ----------------- */
    function whenImagesReady(done) {
      var imgs = seq.querySelectorAll('img');
      if (!imgs.length) { done(); return; }
      var remaining = imgs.length;
      var settle = function () { remaining -= 1; if (remaining === 0) done(); };
      imgs.forEach(function (img) {
        if (img.complete) settle();
        else {
          img.addEventListener('load', settle, { once: true });
          img.addEventListener('error', settle, { once: true });
        }
      });
    }

    /* The real sequence keeps loading="lazy" from the markup, but the loop
       cannot measure a lazy image that has not decided to load yet, so the
       originals are promoted once the loop takes over. */
    seq.querySelectorAll('img').forEach(function (img) { img.loading = 'eager'; });

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(measure);
      ro.observe(root);
      ro.observe(seq);
    } else {
      addEventListener('resize', measure);
    }

    whenImagesReady(function () {
      measure();
      root.dataset.ready = 'true';
      start();
    });

    /* Don't burn frames on a marquee nobody is looking at. */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
      }, { rootMargin: '120px' }).observe(root);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    /* Someone turning reduced-motion on mid-session should be obeyed. */
    var onPref = function () {
      if (reduceMotion.matches) { stop(); offset = 0; apply(); } else start();
    };
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onPref);
    else if (reduceMotion.addListener) reduceMotion.addListener(onPref);
  }

  var roots = document.querySelectorAll('.logoloop');
  Array.prototype.forEach.call(roots, init);
}());
