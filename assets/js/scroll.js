/* =============================================================================
   TALBOTIQ — THE SCROLL CHOREOGRAPHY
   -----------------------------------------------------------------------------
   This file animates nothing. It adds one class to <html>, marks the elements
   that should reveal, and writes a handful of numbers into custom properties as
   you scroll. Every transition, every curve and every stagger is in §18 of
   talbotiq.css, where a designer can change them without reading any of this.

   THE CONTRACT WITH THE STYLESHEET
     html.fx          set once, only if this file decides to run at all. Every
                      rule in §18 that hides or moves anything is scoped to it,
                      so nothing is hidden until something is able to unhide it.
     [data-reveal]    marked here, revealed by adding .in when it enters view.
     --i              stagger index within a group.
     --draw --tick    the band's construction rules and registration marks.
     --wire           the three real connections drawing themselves.
     --tile           the eight products resolving into their cells.
     --rail           the pipeline's rail in the ecosystem band.

   WHY NOTHING IS FIXED OR OVERLAID. An earlier version of this put a full
   viewport canvas over the page and played an eclipse across it. It was a show
   happening on top of a website rather than a website behaving well, and it
   covered the header to do it. Everything here is drawn inside the section it
   describes, and the sticky band pins to the header's own height rather than
   over it — so at no point is any part of the page hidden by decoration.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var narrow = matchMedia('(max-width: 820px)');

  /* THE KIT. Four treatments, assigned by what the content IS rather than by
     where it sits. §25 of the stylesheet holds the actual motion; this only
     decides which of the four each thing gets and what its place in a stagger
     is. Kept here rather than as attributes in build.js so the whole
     choreography can be re-cast in one place, and so the markup carries no
     evidence of an animation that may not run.

     Order within a group is stagger order. Each entry restarts at zero, which
     is why the eight article cards cascade among themselves and do not inherit
     a count from the five capability cards above them. */
  var KIT = [
    /* display type — uncovered rather than faded */
    { c: 'rv-head', s: '.hero h1.hand' },
    { c: 'rv-head', s: 'section > .wrap > h2.hand, .caps > .wrap > h2.hand, .cta h2' },

    /* body copy — a short rise, and no blur on anything anyone has to read */
    { c: 'rv-text', s: '.hero .lede' },
    { c: 'rv-text', s: '.hero .cta-pair' },
    { c: 'rv-text', s: '.sec-lede' },
    { c: 'rv-text', s: '.eco .eyebrow, .eco > .wrap > p, .arc' },
    { c: 'rv-text', s: '.trust .lbl' },
    { c: 'rv-text', s: '.cta .cta-pair, .cta .fine' },
    { c: 'rv-text', s: '.allp' },

    /* objects — rise with a little scale, and the badge lands after the card */
    { c: 'rv-card', s: '.logoloop, .logos' },
    { c: 'rv-card', s: '.cap' },
    { c: 'rv-card', s: '.whyitem' },
    { c: 'rv-card', s: '.post' }
  ];

  var band = document.getElementById('products');
  var plate = document.getElementById('plate');
  var arc = document.querySelector('.arc');
  var arcItems = document.querySelectorAll('.arc li');
  var eco = document.getElementById('ecosystem');

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function nrm(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function ss(t) { return t * t * (3 - 2 * t); }
  function hdrH() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 72;
  }

  /* ---- reveals ----------------------------------------------------------- */
  var io = null;

  function markReveals() {
    KIT.forEach(function (g) {
      var els = document.querySelectorAll(g.s);
      for (var i = 0; i < els.length; i++) {
        if (els[i].hasAttribute('data-reveal')) continue;   /* first rule wins */
        els[i].setAttribute('data-reveal', '');
        els[i].classList.add(g.c);
        els[i].style.setProperty('--i', i);
      }
    });
  }

  function watchReveals() {
    io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        entries[i].target.classList.add('in');
        io.unobserve(entries[i].target);   /* one shot: a reveal that replays
                                              every time you scroll past is a
                                              page that will not settle down */
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    var all = document.querySelectorAll('[data-reveal]');
    for (var i = 0; i < all.length; i++) io.observe(all[i]);
  }

  /* ---- the wiring, measured in real pixels -------------------------------- */
  /* The server emits these curves inside a 0-100 box so the un-enhanced page
     shows a finished, correct drawing. That box is stretched to the plate's
     aspect, which is fine for a static stroke and useless for a dashed one: the
     dash pattern is measured in the stretched space, so a line "drawing itself"
     comes out as a handful of unrelated fragments. Rewriting the geometry in
     pixels and measuring with getTotalLength is what makes the draw-on even.

     It re-runs on resize because the grid is four columns, three below 1080 and
     two below 820 — the wiring has to follow the tiles wherever they go. */
  var wiresSvg = document.querySelector('.wires');
  var rulesSvg = document.querySelector('.rules');

  /* THE DRAWING IS DERIVED FROM THE GRID THAT IS ACTUALLY THERE. The server
     emits a four-column version so the un-enhanced page has something correct
     to show, but the grid is three columns below 1080px and two below 820px —
     and a schematic drawn for a layout that is not on screen puts its traces
     through the tiles. Everything below measures the real cards and rebuilds
     both the rules and the routing from them, at whatever width. */
  /* One rounded turn: arrive along `from`, leave along `to`. Quadratic with the
     corner itself as the control point — the cheapest fillet there is, and the
     thing that stops a right-angle schematic looking like a bar chart. */
  function corner(px, py, from, to, r) {
    return 'L' + (px - from.x * r).toFixed(1) + ' ' + (py - from.y * r).toFixed(1)
         + ' Q' + px.toFixed(1) + ' ' + py.toFixed(1) + ' '
         + (px + to.x * r).toFixed(1) + ' ' + (py + to.y * r).toFixed(1);
  }

  function gridGeometry() {
    var cards = document.querySelectorAll('.grid8 .tile .card');
    var tiles = document.querySelectorAll('.grid8 .tile');
    if (!cards.length || tiles.length !== cards.length || !wiresSvg) return null;
    var box = wiresSvg.getBoundingClientRect();
    if (!box.width || !box.height) return null;

    var c = [], t = [], i;
    for (i = 0; i < cards.length; i++) {
      var cb = cards[i].getBoundingClientRect(), tb = tiles[i].getBoundingClientRect();
      c.push({ l: cb.left - box.left, rt: cb.right - box.left, t: cb.top - box.top,
               b: cb.bottom - box.top, cx: cb.left + cb.width / 2 - box.left,
               cy: cb.top + cb.height / 2 - box.top });
      t.push({ l: tb.left - box.left, rt: tb.right - box.left,
               t: tb.top - box.top, b: tb.bottom - box.top });
    }

    /* Distinct column and row bands, read off the real boxes rather than
       assumed — this is what makes it correct at 4, 3 and 2 columns. */
    var colX = [], rowB = [];
    for (i = 0; i < c.length; i++) {
      if (!colX.some(function (v) { return Math.abs(v - c[i].cx) < 4; })) colX.push(c[i].cx);
      if (!rowB.some(function (r) { return Math.abs(r.t - t[i].t) < 4; })) rowB.push({ t: t[i].t, b: t[i].b });
    }
    colX.sort(function (a, b) { return a - b; });
    rowB.sort(function (a, b) { return a.t - b.t; });

    /* A gutter is the midpoint between two adjacent bands. These are the only
       places a trace is allowed to travel. */
    var gx = [], gy = [];
    for (i = 1; i < colX.length; i++) gx.push((colX[i - 1] + colX[i]) / 2);
    for (i = 1; i < rowB.length; i++) gy.push((rowB[i - 1].b + rowB[i].t) / 2);
    gy.push(rowB[rowB.length - 1].b + 18);      /* and the clear space below */

    return { box: box, c: c, t: t, colX: colX, rowB: rowB, gx: gx, gy: gy };
  }

  function drawRules(g) {
    if (!rulesSvg) return;
    rulesSvg.setAttribute('viewBox', '0 0 ' + g.box.width.toFixed(1) + ' ' + g.box.height.toFixed(1));
    rulesSvg.setAttribute('preserveAspectRatio', 'none');
    var out = '', n = 0, i;
    var top = g.rowB[0].t - 22, bot = g.rowB[g.rowB.length - 1].b + 12;
    for (i = 0; i < g.gx.length; i++) {
      out += '<line class="r-v" style="--i:' + (n++) + '" x1="' + g.gx[i].toFixed(1) + '" y1="' + top.toFixed(1)
          + '" x2="' + g.gx[i].toFixed(1) + '" y2="' + bot.toFixed(1) + '"/>';
    }
    for (i = 0; i < g.gy.length - 1; i++) {
      out += '<line class="r-h" style="--i:' + (n++) + '" x1="0" y1="' + g.gy[i].toFixed(1)
          + '" x2="' + g.box.width.toFixed(1) + '" y2="' + g.gy[i].toFixed(1) + '"/>';
    }
    /* a registration cross where two rules cross — never on a word */
    for (i = 0; i < g.gx.length; i++) {
      for (var j = 0; j < g.gy.length - 1; j++) {
        out += '<g class="r-t" style="--i:' + (n++) + '">'
            + '<line x1="' + (g.gx[i] - 4).toFixed(1) + '" y1="' + g.gy[j].toFixed(1) + '" x2="' + (g.gx[i] + 4).toFixed(1) + '" y2="' + g.gy[j].toFixed(1) + '"/>'
            + '<line x1="' + g.gx[i].toFixed(1) + '" y1="' + (g.gy[j] - 4).toFixed(1) + '" x2="' + g.gx[i].toFixed(1) + '" y2="' + (g.gy[j] + 4).toFixed(1) + '"/></g>';
      }
    }
    rulesSvg.innerHTML = out;
  }

  function layoutWires() {
    var g = gridGeometry();
    if (!g) return;
    drawRules(g);

    wiresSvg.setAttribute('viewBox', '0 0 ' + g.box.width.toFixed(1) + ' ' + g.box.height.toFixed(1));
    var c = g.c, hub = c[c.length - 1];
    var hubRow = 0, i;
    for (i = 0; i < g.rowB.length; i++) if (Math.abs(g.rowB[i].t - g.t[c.length - 1].t) < 4) hubRow = i;

    var paths = wiresSvg.querySelectorAll('path.w');
    var R = 9, lane = 0;

    for (var k = 0; k < paths.length; k++) {
      var el = paths[k];
      var ai = parseInt(el.getAttribute('data-a'), 10);
      var a = c[ai];
      if (!a) continue;

      var srcRow = 0;
      for (i = 0; i < g.rowB.length; i++) if (Math.abs(g.rowB[i].t - g.t[ai].t) < 4) srcRow = i;

      var toRight = a.cx < hub.cx;
      /* leave sideways, into the first column gutter between here and the hub */
      var vx = null;
      for (i = 0; i < g.gx.length; i++) {
        var cand = g.gx[toRight ? i : g.gx.length - 1 - i];
        if (toRight ? cand > a.rt + 6 : cand < a.l - 6) { vx = cand; break; }
      }
      var startX = toRight ? a.rt : a.l;
      if (vx === null) vx = startX + (toRight ? 26 : -26);

      var above = srcRow < hubRow;
      /* the channel: the gutter just above the hub's row, or the clear space
         below the last row when the source is level with or under the hub */
      var y = above ? g.gy[hubRow - 1] + lane * 7 : g.gy[g.gy.length - 1];
      var dirIn = toRight ? 1 : -1;
      var d;

      if (above) {
        var ex = hub.cx + (lane === 0 ? -20 : 18);
        lane++;
        d = 'M' + startX.toFixed(1) + ' ' + a.cy.toFixed(1)
          + corner(vx, a.cy, { x: dirIn, y: 0 }, { x: 0, y: 1 }, R)
          + corner(vx, y, { x: 0, y: 1 }, { x: (ex > vx ? 1 : -1), y: 0 }, R)
          + corner(ex, y, { x: (ex > vx ? 1 : -1), y: 0 }, { x: 0, y: 1 }, R)
          + 'L' + ex.toFixed(1) + ' ' + hub.t.toFixed(1);
      } else {
        /* come back up OUTSIDE the hub's own column and turn in at card height:
           entering underneath would take the trace up through the hub's caption */
        var ux = toRight ? hub.l - 22 : hub.rt + 22;
        d = 'M' + startX.toFixed(1) + ' ' + a.cy.toFixed(1)
          + corner(vx, a.cy, { x: dirIn, y: 0 }, { x: 0, y: 1 }, R)
          + corner(vx, y, { x: 0, y: 1 }, { x: (ux > vx ? 1 : -1), y: 0 }, R)
          + corner(ux, y, { x: (ux > vx ? 1 : -1), y: 0 }, { x: 0, y: -1 }, R)
          + corner(ux, hub.cy, { x: 0, y: -1 }, { x: (toRight ? 1 : -1), y: 0 }, R)
          + 'L' + (toRight ? hub.l : hub.rt).toFixed(1) + ' ' + hub.cy.toFixed(1);
      }
      el.setAttribute('d', d);
      try { el.style.setProperty('--len', el.getTotalLength().toFixed(1)); } catch (e) {}
    }
  }

  /* ---- the marks --------------------------------------------------------- */
  /* The four hand-drawn marks get `drawn` when they reach the reader, and §24
     of the stylesheet does the rest. They are watched separately from the
     ordinary reveals because they are not entrances — they are a stroke being
     made on a word that has already arrived, and the delays in the CSS are
     tuned to land after that word's own reveal rather than with it.

     The hero's highlighter is already on screen at load, so its observer fires
     immediately and its own .34s delay is what holds it back until the headline
     has settled. */
  function watchMarks() {
    var mo = new IntersectionObserver(function (es) {
      for (var i = 0; i < es.length; i++) {
        if (!es[i].isIntersecting) continue;
        es[i].target.classList.add('drawn');
        mo.unobserve(es[i].target);   /* a pen stroke is made once */
      }
    }, { rootMargin: '0px 0px -18% 0px' });
    var all = document.querySelectorAll('.mark-hl, .u-lasso, .u-line, .u-squig');
    for (var i = 0; i < all.length; i++) mo.observe(all[i]);
  }

  /* ---- the band's drawing ------------------------------------------------ */
  /* Progress through the pin: 0 the moment the band's top reaches the header,
     1 the moment its bottom reaches the viewport floor and the pin releases. */
  function bandProgress() {
    var r = band.getBoundingClientRect();
    var h = hdrH();
    var travel = r.height - window.innerHeight + h;
    if (travel <= 0) return r.top <= h ? 1 : 0;
    return clamp((h - r.top) / travel, 0, 1);
  }

  var lastBand = -1;
  var bandResolved = false;

  /* IF SOMEONE ASKS FOR THE PRODUCTS, GIVE THEM THE PRODUCTS.
     The hero's own "Explore the products" button, the nav, and a #products deep
     link all land at the TOP of the band — which is pin progress zero, where the
     drawing has not been made yet and every tile is still at opacity 0. The
     reader clicked a link that promised eight products and got an empty grey
     box. So an anchor into the band resolves the drawing immediately and stops
     scrubbing it: they did not ask to watch it being drawn.

     It stays resolved. Re-arming it would mean the grid empties itself again the
     next time they scroll up, which is worse than not animating at all. */
  function resolveBand() {
    if (!plate || bandResolved) return;
    bandResolved = true;
    ['--draw', '--tick', '--tile', '--wire'].forEach(function (k) { plate.style.setProperty(k, 1); });
  }

  function drawBand(p) {
    if (bandResolved || p === lastBand) return;
    lastBand = p;
    /* The order a person drawing this would use: rule the grid, mark the
       positions, place the objects, then connect the ones that connect. */
    /* The windows OVERLAP on purpose. Run them end to end and there is a beat
       in the middle where the grid is ruled and completely empty, which reads
       as a section that failed to load rather than one being drawn. Something
       should always be arriving. */
    plate.style.setProperty('--draw', ss(nrm(p, 0.02, 0.20)).toFixed(4));
    plate.style.setProperty('--tick', ss(nrm(p, 0.13, 0.30)).toFixed(4));
    plate.style.setProperty('--tile', nrm(p, 0.16, 0.62).toFixed(4));
    plate.style.setProperty('--wire', ss(nrm(p, 0.56, 0.90)).toFixed(4));
  }

  /* ---- the dark chapter --------------------------------------------------- */
  var lastLit = -2;
  var lastEco = -1;

  /* Progress through the pin, same construction as the band: 0 the moment the
     chapter's top reaches the header, 1 the moment its bottom reaches the
     viewport floor and it releases. */
  function ecoProgress() {
    var r = eco.getBoundingClientRect();
    var h = hdrH();
    var travel = r.height - window.innerHeight + h;
    if (travel <= 0) return r.top <= h ? 1 : 0;
    return clamp((h - r.top) / travel, 0, 1);
  }

  function drawEco(p) {
    if (p === lastEco) return;
    lastEco = p;
    /* The order a surface would actually be built in: rule the rings from the
       rim inward, hang the meridians on them, then let the first signal go. */
    eco.style.setProperty('--wellDraw', ss(nrm(p, 0.05, 0.36)).toFixed(4));
    eco.style.setProperty('--wellFall', nrm(p, 0.26, 0.94).toFixed(4));
    arc.style.setProperty('--rail', ss(nrm(p, 0.18, 0.42)).toFixed(4));

    /* The request reaches each step in turn. One class, written only when the
       value actually changes rather than on every frame. */
    var upto = p < 0.36 ? -1 : Math.min(arcItems.length - 1,
      Math.floor(nrm(p, 0.36, 0.82) * arcItems.length));
    if (upto === lastLit) return;
    lastLit = upto;
    for (var i = 0; i < arcItems.length; i++) arcItems[i].classList.toggle('lit', i <= upto);
  }

  /* ---- one loop, and only while something needs it ----------------------- */
  var raf = 0, live = 0;

  function frame() {
    raf = 0;
    if (!live || document.hidden) return;
    if (band && plate && (live & 1)) drawBand(bandProgress());
    if (eco && arc && (live & 2)) drawEco(ecoProgress());
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && live && !document.hidden) raf = requestAnimationFrame(frame); }
  function setLive(bit, on) {
    live = on ? (live | bit) : (live & ~bit);
    if (live) kick();
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  /* ---- start / stop ------------------------------------------------------ */
  var started = false;

  function start() {
    if (started) return;
    started = true;
    /* Already set by the inline gate in <head> for the common case; this covers
       a window dragged wider than 820 after load. Idempotent either way. */
    document.documentElement.classList.add('fx');
    /* Tell the dead-man's switch in <head> that this file is alive, before it
       times out and strips .fx to rescue the page. */
    document.documentElement.classList.add('fx-on');
    markReveals();
    watchReveals();
    watchMarks();

    /* A deep link that is already pointing at the band, before a single frame
       has been scrubbed. */
    if (location.hash === '#products') resolveBand();
    window.addEventListener('hashchange', function () {
      if (location.hash === '#products') resolveBand();
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href$="#products"]');
      if (a) resolveBand();
    }, true);

    if (band && plate) {
      layoutWires();
      new IntersectionObserver(function (e) { setLive(1, e[0].isIntersecting); },
        { rootMargin: '15% 0px' }).observe(band);
      drawBand(bandProgress());
    }
    if (eco && arc) {
      new IntersectionObserver(function (e) { setLive(2, e[0].isIntersecting); },
        { rootMargin: '15% 0px' }).observe(eco);
      drawEco(ecoProgress());
    }
  }

  function stopVisuals() {
    /* Reduced motion turned on mid-session, or the window narrowed to a phone.
       Resolve everything to its finished state rather than freezing it part
       drawn, and stop the loop. */
    if (!started) return;
    setLive(1, false); setLive(2, false);
    /* Dropping the class is what returns the band to its natural height and
       hands the phone back its two viewports of scroll. */
    document.documentElement.classList.remove('fx');
    if (plate) ['--draw', '--tick', '--tile', '--wire'].forEach(function (k) { plate.style.setProperty(k, 1); });
    if (arc) arc.style.setProperty('--rail', 1);
    if (eco) { eco.style.setProperty('--wellDraw', 1); eco.style.setProperty('--wellFall', .5); }
    var all = document.querySelectorAll('[data-reveal]');
    for (var i = 0; i < all.length; i++) all[i].classList.add('in');
    var marks = document.querySelectorAll('.mark-hl, .u-lasso, .u-line, .u-squig');
    for (var i = 0; i < marks.length; i++) marks[i].classList.add('drawn');
  }

  /* THE PHONE AND THE READER WHO ASKED FOR LESS MOTION GET THE SAME THING: the
     finished drawing, immediately, and no extra scroll. `fx` is never added, so
     the band never grows to 172vh and nothing is ever hidden waiting to be
     revealed. The wiring is already in the HTML — it simply renders. */
  function evaluate() {
    if (reduce.matches || narrow.matches) {
      if (started) stopVisuals();
      else document.documentElement.classList.remove('fx');
      return;
    }
    start();
  }

  /* The web font is 76px on the hero and swaps late; every sticky offset and
     section height moves when it lands. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { layoutWires(); lastBand = -1; kick(); });
  }
  var rt = 0;
  window.addEventListener('resize', function () {
    lastBand = -1;
    clearTimeout(rt);
    rt = setTimeout(function () { if (started) layoutWires(); }, 150);
    kick();
  }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  reduce.addEventListener('change', evaluate);
  narrow.addEventListener('change', evaluate);

  evaluate();
})();
