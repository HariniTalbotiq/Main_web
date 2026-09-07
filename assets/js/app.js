/* =============================================================================
   TALBOTIQ — homepage behaviour
   -----------------------------------------------------------------------------
   Three things, and nothing else:

     1. the header takes a hairline once the page has scrolled
     2. the three nav panels open and close
     3. the drawer, for viewports with no room for a nav

   The mockup drew a caret on Products, Solutions and Company but had nowhere
   for them to go. This is where they go.

   Everything degrades: the markup ships with the panels CLOSED and the drawer
   closed, so if this file fails to load the page is a normal page with a
   header that does not open. No content is hidden behind script.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* ---- 1 · the header's hairline --------------------------------------- */
  var hdr = $('#hdr');
  if (hdr) {
    var stick = function () { hdr.classList.toggle('stuck', scrollY > 8); };
    addEventListener('scroll', stick, { passive: true });
    stick();
  }

  /* ---- 2 · the nav panels ---------------------------------------------- */
  /* One open at a time. Opening a second closes the first, so the bar never
     shows two shelves at once. */
  var buttons = $$('.navbtn');
  var open = null;               // the button whose panel is showing
  var hideT;

  function panelOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }

  function show(btn) {
    clearTimeout(hideT);
    if (open === btn) return;
    if (open) set(open, false);
    set(btn, true);
    open = btn;
  }

  function hide() {
    clearTimeout(hideT);
    if (!open) return;
    set(open, false);
    open = null;
  }

  function set(btn, on) {
    var p = panelOf(btn);
    if (!p) return;
    p.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
  }

  /* A pointer that can hover gets hover-to-open, which is what a menu bar of
     this kind is expected to do. Everything else gets click-to-open, because
     hover on a touchscreen means "the first tap does nothing". */
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  buttons.forEach(function (btn) {
    var item = btn.parentNode;
    var p = panelOf(btn);
    if (!p) return;

    if (fine) {
      item.addEventListener('mouseenter', function () { show(btn); });
      /* a short grace period on the way out, so crossing the gap between the
         button and the panel does not close it */
      item.addEventListener('mouseleave', function () {
        hideT = setTimeout(hide, 160);
      });
      p.addEventListener('mouseenter', function () { clearTimeout(hideT); });
      p.addEventListener('mouseleave', function () { hideT = setTimeout(hide, 160); });

      /* A real mouse click must NOT toggle: the pointer is already hovering,
         so the panel is already open, and toggling would shut the thing the
         reader just aimed at. `detail === 0` is the tell that a click came
         from the keyboard instead — Enter and Space on a <button> fire click
         with no click count — and that one does need to toggle, because
         nothing hovered to open it. */
      btn.addEventListener('click', function (e) {
        if (e.detail !== 0) { e.preventDefault(); return; }
        if (open === btn) hide(); else show(btn);
      });
    } else {
      btn.addEventListener('click', function () {
        if (open === btn) hide(); else show(btn);
      });
    }

    /* following a link inside a panel closes it */
    p.addEventListener('click', function (e) {
      if (e.target.closest('a')) hide();
    });
  });

  /* click anywhere that is not the nav or an open panel */
  addEventListener('click', function (e) {
    if (!open) return;
    if (e.target.closest('.navitem') || e.target.closest('.panel')) return;
    hide();
  });

  /* Tab out of the whole group and it closes. Checked on the next frame
     because relatedTarget is not reliable across every browser here. */
  addEventListener('focusin', function (e) {
    if (!open) return;
    if (e.target.closest('.navitem') || e.target.closest('.panel')) return;
    hide();
  });

  /* ---- 3 · the drawer -------------------------------------------------- */
  var burger = $('#burger');
  var drawer = $('#drawer');

  function setDrawer(on) {
    if (!drawer || !burger) return;
    drawer.dataset.open = String(on);
    burger.setAttribute('aria-expanded', String(on));
    document.body.style.overflow = on ? 'hidden' : '';
    if (on) {
      var first = drawer.querySelector('a');
      if (first) first.focus();
    }
  }

  if (burger && drawer) {
    burger.addEventListener('click', function () {
      setDrawer(drawer.dataset.open !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setDrawer(false);
    });
    /* a resize up into the desktop layout leaves an open drawer stranded
       behind a nav that has come back */
    addEventListener('resize', function () {
      if (innerWidth > 820 && drawer.dataset.open === 'true') setDrawer(false);
    });
  }

  /* ---- Escape closes whichever is open --------------------------------- */
  addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (drawer && drawer.dataset.open === 'true') { setDrawer(false); burger.focus(); return; }
    if (open) { var b = open; hide(); b.focus(); }
  });
}());
