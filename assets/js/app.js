/* =============================================================================
   TALBOTIQ — homepage behaviour
   -----------------------------------------------------------------------------
   Four things, and nothing else:

     1. the header takes a hairline once the page has scrolled
     2. the three nav panels open and close
     3. the drawer, for viewports with no room for a nav
     4. the thought-leadership grid collapses to three and opens to eight
     5. the "3 modes" pill opens the panel of sub-modes under its tile

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

  /* ---- 2b · a shelf opened from the URL --------------------------------
     THE STANDALONE PAGES HAVE NO PANELS OF THEIR OWN. about, contact, signin
     and the four solution pages each carry their own stylesheet and no app.js,
     so a "Solutions" item on those pages cannot open a shelf where it stands.
     It links here instead — `index.html#solutions` — and this opens the shelf
     on arrival, so the reader lands on the same menu the bar would have given
     them. That is the local answer to "show me every solution"; it used to be
     a link to the old site's /services/ index.

     A HASH THAT NAMES A REAL SECTION IS LEFT ALONE. `#products` and
     `#insights` are sections in the page and belong to the browser, which
     scrolls to them — and `#products` is also a panel name, so opening a shelf
     on that hash would hijack a link that has always just scrolled. Only a
     hash with no element of its own is read as asking for a shelf.

     The hash is untrusted input on its way into a selector, so it has to look
     like a panel name before it gets there. */
  function shelfFromHash() {
    var name = location.hash.slice(1);
    if (!/^[a-z][a-z-]{0,30}$/.test(name)) return;
    if (document.getElementById(name)) return;
    var btn = document.querySelector('.navbtn[data-panel="' + name + '"]');
    if (btn) show(btn);
  }
  shelfFromHash();
  addEventListener('hashchange', shelfFromHash);

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

  /* ---- 4 · thought leadership: the rest of the columns ------------------ */
  /* The grid ships with all eight articles in it. This collapses it to the
     first three and hands the reader a control to open it again — so the five
     it hides are hidden by a script that is definitely running, and a build
     that loses this file shows everything rather than nothing.

     The anchor beside the button is the no-script route to the publisher's
     author index. It is swapped out here, not removed: with the grid now able
     to show every column this page has, the button is the better answer, but
     only once we know we can offer it. */
  var tlGrid = $('#tl-grid');
  var tlMore = $('.blogmore');
  var tlAll = $('a.blogall');

  if (tlGrid && tlMore && tlGrid.querySelector('.post--rest')) {
    var setTL = function (open) {
      tlGrid.classList.toggle('blog--collapsed', !open);
      tlMore.setAttribute('aria-expanded', String(open));
      /* innerHTML, because the labels carry an arrow entity from build.js */
      tlMore.innerHTML = open ? tlMore.dataset.less : tlMore.dataset.more;
    };

    setTL(false);
    if (tlAll) tlAll.hidden = true;
    tlMore.hidden = false;

    tlMore.addEventListener('click', function () {
      var open = tlMore.getAttribute('aria-expanded') === 'true';
      setTL(!open);
      /* COLLAPSING CAN PULL THE PAGE OUT FROM UNDER THE READER. Five cards
         disappearing above the fold leaves them somewhere further down the
         page than where they clicked. If the control has ended up above the
         viewport, put it back where it was. */
      if (open) {
        var top = tlMore.getBoundingClientRect().top;
        if (top < 0) tlMore.scrollIntoView({ block: 'center' });
      }
    });
  }

  /* ---- the featured episode: poster now, player on demand -------------- */
  /* The markup ships a button over a still; the iframe does not exist until
     somebody asks for it. `autoplay=1` because the click that built the frame
     was already a request to play, and `{once:true}` because the button is
     gone the moment it fires. */
  var ytb = document.querySelector('.ytlite');
  if (ytb) {
    ytb.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube.com/embed/' + encodeURIComponent(ytb.dataset.yt)
        + '?autoplay=1&rel=0';
      f.title = ytb.dataset.title || '';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.allowFullscreen = true;
      ytb.replaceWith(f);
      /* the frame is new, so it has never had focus — hand it over, or a
         keyboard reader is left on an element that no longer exists */
      f.focus();
    }, { once: true });
  }

  /* ---- 5 · the "3 modes" pill ------------------------------------------
     Below 1080px there is nothing to hover with, so the pill is the control
     that opens the panel of sub-modes beneath its tile. Above 1080px the panel
     still opens on hover and focus-within; a click here pins it, which is what
     keeps the same button from being a control that does nothing on a desktop.

     Delegated, because the tiles are built by build.js and there is no reason
     for this file to know how many there are. The collapsed state itself lives
     in CSS behind html.js — if this file never loads, the panels stay open
     rather than becoming unreachable. */
  addEventListener('click', function (e) {
    var pill = e.target.closest && e.target.closest('.modes');
    if (!pill) return;
    var cell = pill.closest('.cell');
    if (!cell) return;
    pill.setAttribute('aria-expanded', cell.classList.toggle('is-open') ? 'true' : 'false');
  });

  /* ---- Escape closes whichever is open --------------------------------- */
  addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (drawer && drawer.dataset.open === 'true') { setDrawer(false); burger.focus(); return; }
    if (open) { var b = open; hide(); b.focus(); return; }
    /* an open mode panel is the last thing Escape should reach */
    var cell = document.querySelector('.cell.is-open');
    if (cell) {
      cell.classList.remove('is-open');
      var pill = cell.querySelector('.modes');
      if (pill) { pill.setAttribute('aria-expanded', 'false'); pill.focus(); }
    }
  });
}());
