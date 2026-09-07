/* =============================================================================
   TALBOTIQ — interaction. No dependencies, no framework, no polyfills.

   Ground rule: the page is complete without this file. Nothing is hidden until
   the script that reveals it has run, so a failed request degrades to a fully
   readable page rather than a blank one.

   Motion here only ever does one of two things:
     1. shows a mechanism  (a gauge filling to its real value, a redaction
        actually covering the text, fields lifting off a document), or
     2. answers something the reader did (opening a menu, hovering a row).
   There is deliberately no uniform fade-up on every section.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ---- 0 · smooth scrolling (Lenis, vendored, optional) ---------------- */
  /* Inertial scrolling is what makes a scroll-driven page feel deliberate
     rather than jumpy. It is also motion the reader did not ask for and cannot
     turn off from inside the page, so it is gated hard:

       - never under prefers-reduced-motion;
       - never on a touch pointer, where the OS already owns the scroll physics
         and overriding them feels broken;
       - never if the vendored file failed to load.

     Everything else on this page reads window.scrollY and uses
     IntersectionObserver. Lenis drives the real scroll position (it calls
     window.scrollTo), so both keep working — but that is a promise worth
     re-checking if the library is ever updated. */
  var lenis = null;
  if (!reduced && window.Lenis && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    lenis = new window.Lenis({
      duration: 1.0,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);

    /* In-page anchors have to go through Lenis or the browser jumps the real
       scroll position out from under it. */
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      /* the launcher's trigger is an anchor to #suite that section 9 upgrades
         in place, so it must not be scrolled to first */
      if (a.hasAttribute('data-cmd')) return;
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -88 });
      if (history.pushState) history.pushState(null, '', id);
    });
  }

  /* ---- 1 · header: stuck, and inverted over the dark room -------------- */
  var head = $('#head');
  if (head) {
    var stick = function () { head.dataset.stuck = scrollY > 6 ? 'true' : 'false'; };
    addEventListener('scroll', stick, { passive: true });
    stick();

    /* The engine chapter is a dark room. A light header floating over it
       reads as a seam, so the header takes the room's colours while the room
       is behind it. Measured against the header's own height, not a guess. */
    var darks = $$('.dark');
    if (darks.length) {
      var invert = function () {
        var line = head.getBoundingClientRect().bottom - 2;
        var on = darks.some(function (d) {
          var r = d.getBoundingClientRect();
          return r.top <= line && r.bottom >= line;
        });
        if ((head.dataset.dark === 'true') !== on) head.dataset.dark = String(on);
        /* The scale is fixed OUTSIDE the dark section, so it does not inherit
           the room's tokens the way the section's own children do. This flag
           lets the stylesheet reassign them for it. */
        document.documentElement.dataset.overdark = String(on);
      };
      addEventListener('scroll', invert, { passive: true });
      addEventListener('resize', invert);
      invert();
    }
  }

  /* ---- 2 · mobile drawer ------------------------------------------------ */
  var drawer = $('#drawer');
  var burger = $('#burger');
  var burgerClose = $('#burgerClose');

  function setDrawer(open) {
    if (!drawer || !burger) return;
    drawer.dataset.open = String(open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open) { var f = drawer.querySelector('a, button'); if (f) f.focus(); }
    else burger.focus();
  }
  if (burger) burger.addEventListener('click', function () { setDrawer(drawer.dataset.open !== 'true'); });
  if (burgerClose) burgerClose.addEventListener('click', function () { setDrawer(false); });
  if (drawer) drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setDrawer(false); });

  /* ---- 3 · products mega menu, with a live preview ---------------------- */
  var megaBtn = $('#megaBtn');
  var mega = $('#mega');
  var mw = $('.mw');
  var megaSlot = $('#megaSlot');
  var store = $('#paneStore');
  var hideT;

  /* both previews read from the same rendered store, so a product's readout
     is written once in build.js and shown in two places */
  function readout(slug) {
    if (!store) return null;
    var src = store.querySelector('[data-pane="' + slug + '"]');
    return src ? src.innerHTML : null;
  }

  function setMega(open) {
    if (!mega || !megaBtn) return;
    clearTimeout(hideT);
    mega.hidden = !open;
    megaBtn.setAttribute('aria-expanded', String(open));
  }

  if (megaBtn && mw && mega) {
    var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (fine) {
      mw.addEventListener('mouseenter', function () { setMega(true); });
      mw.addEventListener('mouseleave', function () {
        hideT = setTimeout(function () { setMega(false); }, 160);
      });
      megaBtn.addEventListener('click', function (e) { e.preventDefault(); });
      megaBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMega(mega.hidden); }
      });
    } else {
      megaBtn.addEventListener('click', function () { setMega(mega.hidden); });
    }

    /* hovering or focusing a product swaps the preview pane */
    if (megaSlot) {
      var hint = function (e) {
        var a = e.target.closest('[data-hint]');
        if (!a) return;
        var html = readout(a.dataset.hint);
        if (html) megaSlot.innerHTML = html;
      };
      mega.addEventListener('mouseover', hint);
      mega.addEventListener('focusin', hint);
    }

    /* only the panel re-opens on focus; if the trigger did too, Escape could
       never win the fight */
    mw.addEventListener('focusin', function (e) { if (mega.contains(e.target)) setMega(true); });
    mw.addEventListener('focusout', function (e) { if (!mw.contains(e.relatedTarget)) setMega(false); });
    mega.addEventListener('click', function (e) { if (e.target.closest('a')) setMega(false); });
    addEventListener('click', function (e) { if (!mw.contains(e.target)) setMega(false); });
  }

  addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (drawer && drawer.dataset.open === 'true') setDrawer(false);
    if (mega && !mega.hidden) { setMega(false); megaBtn.focus(); }
  });

  /* §4 drove a pinned stage that stepped through the suite as you scrolled.
     The stage is gone — it was the third presentation of the same products
     and cost 3.5 screens of scrolling — so the tracker went with it. The
     end of the page is a plain directory now and needs no script. */

  /* ---- 5 · which chapter owns the viewport ------------------------------ */
  /* Drives two things from one answer: the scale's indicator, and the header's
     active-application slot. A suite's header tells you which app you are
     looking at, so on one page that has to follow the scroll. */
  var stops = $$('[data-stop]');
  var nows = $$('[data-now]');
  if ((stops.length || nows.length) && hasIO) {
    var activeChap = '';
    var apply = function (id) {
      if (id === activeChap) return;
      activeChap = id;
      stops.forEach(function (a) {
        a.setAttribute('aria-current', String(a.dataset.stop === id));
      });
      nows.forEach(function (n) { n.hidden = n.dataset.now !== id; });
      /* the scale only shows itself while it has a chapter to point at */
      document.documentElement.dataset.inchap = String(!!id);
    };

    var seen = new Map();
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        seen.set(en.target.id, en.isIntersecting ? en.intersectionRatio : 0);
      });
      var best = 0, bestId = '';
      seen.forEach(function (v, k) { if (v > best) { best = v; bestId = k; } });
      apply(bestId);
    }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.01, 0.4, 1] });

    $$('[data-chap]').forEach(function (sec) { spy.observe(sec); });
  }

  /* ---- 5b · the directory shelf sits under the whole header ------------- */
  /* The mega menu is fixed and full-bleed, so it has to know where the header
     ends. Measured rather than assumed, because the header's height changes
     with the viewport. */
  if (head) {
    var shelf = function () {
      document.documentElement.style.setProperty(
        '--head-b', Math.round(head.getBoundingClientRect().bottom) + 'px');
    };
    addEventListener('scroll', shelf, { passive: true });
    addEventListener('resize', shelf);
    shelf();
  }

  /* ---- 6 · mechanisms: run once, when they arrive ---------------------- */
  /* Every animated composition is a `[data-lit]` container whose CSS keys off
     data-lit="true". One observer drives all of them; each fires once. */
  var lit = $$('[data-lit]');
  if (lit.length) {
    /* The knit is the one mechanism that hides real content (the app tiles)
       before its sequence runs, so the stylesheet only does that while this
       script is here to run it. Set before the observer, never after. */
    if (hasIO && !reduced) document.documentElement.classList.add('lt');
    if (!hasIO || reduced) {
      lit.forEach(function (el) { el.dataset.lit = 'true'; });
    } else {
      var litIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.dataset.lit = 'true';
          litIO.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
      lit.forEach(function (el) { litIO.observe(el); });
    }
  }

  /* ---- 7 · the bus powers up ------------------------------------------- */
  /* The one orchestrated moment on the page: channels tap the spine in order,
     gauges fill to the headroom the console reports, one request travels down.
     It runs once per bus, when that bus is first seen. */
  var buses = $$('[data-bus]');
  if (buses.length) {
    var power = function (el) {
      var body = el.querySelector('.bus__body');
      if (body) el.style.setProperty('--travel', body.offsetHeight + 'px');
      el.dataset.on = 'true';
    };
    if (!hasIO) {
      buses.forEach(power);
    } else {
      var busIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          power(en.target);
          busIO.unobserve(en.target);
        });
      }, { threshold: 0.25 });
      buses.forEach(function (el) { busIO.observe(el); });
    }
  }

  /* ---- 8 · reveals ----------------------------------------------------- */
  /* Reserved for the two figures that carry the page's signature. Adding
     [data-rise] to every section is how a page starts to feel generated. */
  var rise = $$('[data-rise]');
  if (rise.length && hasIO && !reduced) {
    document.documentElement.classList.add('rv');
    var riseIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        riseIO.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rise.forEach(function (el) { riseIO.observe(el); });
    /* never leave anything stranded if an observer misfires */
    setTimeout(function () { rise.forEach(function (el) { el.classList.add('in'); }); }, 4000);
  }

  /* ---- 9 · the launcher: one keystroke to anywhere in the suite --------- */
  /* A native <dialog>. showModal() supplies the focus trap, Escape, the inert
     background and the backdrop, so none of that is written here. Arrow keys
     move REAL focus between REAL links, which is why there is no listbox ARIA
     either — the browser already announces the right thing.

     Nothing is advertised before it works: the ⌘K chips are hidden by CSS
     until this block adds `.cmdk`, so a failed script leaves no dead hint. */
  var cmd = $('#cmd');
  if (cmd && typeof cmd.showModal === 'function') {
    var cq = $('#cmdQ');
    var rows = $$('.cmd__row', cmd);
    var groups = $$('.cmd__grp', cmd);
    var noHit = $('#cmdNone');
    var tally = $('#cmdCount');

    /* the shortcut is written for a Mac at build time — it cannot be known
       there — and corrected for every other platform here */
    var mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
    if (!mac) $$('[data-k]').forEach(function (k) { k.textContent = 'Ctrl K'; });
    document.documentElement.classList.add('cmdk');

    var live = function () { return rows.filter(function (r) { return !r.hidden; }); };

    var sift = function () {
      var s = cq.value.trim().toLowerCase();
      rows.forEach(function (r) { r.hidden = !!s && r.dataset.q.indexOf(s) === -1; });
      /* a group heading with nothing under it is worse than no heading */
      groups.forEach(function (g) {
        var ul = g.nextElementSibling;
        g.hidden = !ul || !$$('.cmd__row', ul).some(function (r) { return !r.hidden; });
      });
      var n = live().length;
      if (noHit) noHit.hidden = n > 0;
      if (tally) tally.textContent = n + (n === 1 ? ' result' : ' results');
    };

    var shut = function () {
      if (cmd.open) cmd.close();
      document.body.style.overflow = '';
      if (lenis) lenis.start();
    };
    var show = function () {
      if (cmd.open) return;
      cq.value = '';
      sift();
      cmd.showModal();
      /* showModal makes the page inert but does not stop it scrolling */
      document.body.style.overflow = 'hidden';
      if (lenis) lenis.stop();
      cq.focus();
    };

    cq.addEventListener('input', sift);
    cmd.addEventListener('close', shut);
    /* the panel is the dialog box; a click that lands on the dialog itself
       landed on the backdrop */
    cmd.addEventListener('click', function (e) {
      if (e.target === cmd || e.target.closest('a')) shut();
    });
    var closeBtn = $('#cmdX');
    if (closeBtn) closeBtn.addEventListener('click', shut);

    var findBtn = $('#findBtn');
    if (findBtn) findBtn.addEventListener('click', show);
    /* every "explore another product" control becomes the launcher */
    addEventListener('click', function (e) {
      var t = e.target.closest('[data-cmd]');
      if (!t) return;
      e.preventDefault();
      if (drawer && drawer.dataset.open === 'true') setDrawer(false);
      show();
    });

    addEventListener('keydown', function (e) {
      if (!(e.metaKey || e.ctrlKey) || (e.key !== 'k' && e.key !== 'K')) return;
      e.preventDefault();
      if (cmd.open) shut(); else show();
    });

    cmd.addEventListener('keydown', function (e) {
      var hits = live().map(function (r) { return r.querySelector('.cmd__hit'); });
      if (!hits.length) return;
      var at = hits.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        hits[at < 0 ? 0 : Math.min(at + 1, hits.length - 1)].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (at <= 0) cq.focus(); else hits[at - 1].focus();
      } else if (e.key === 'Enter' && document.activeElement === cq) {
        e.preventDefault();
        hits[0].click();
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey
                 && document.activeElement !== cq) {
        /* typing anywhere in the panel returns to the field, the way a real
           command menu behaves. No preventDefault: the character lands in the
           input once it has focus. */
        cq.focus();
      }
    });
  }
})();
