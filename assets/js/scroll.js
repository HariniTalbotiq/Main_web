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

   NEITHER BAND IS IN THAT LIST ANY MORE. Both used to be. The ecosystem band
   pinned while this file scrubbed its well and lit its four steps; the product
   band pinned while it ruled a construction grid, ticked in registration
   marks, resolved its tiles into their cells and drew three wires toward the
   engine. Both were removed by request, and the product band took the last
   scroll-linked writer, the rAF loop and every easing helper with it. What is
   left reveals things once, on entry, and never asks where the page is.

   THIS FILE NOW HAS NO LOOP. If a scroll-linked value is ever wanted back, it
   is the rAF loop in git history that should come back with it — not a scroll
   listener that writes to style on every event.

   WHY NOTHING IS FIXED, OVERLAID OR PINNED. An earlier version of this put a
   full viewport canvas over the page and played an eclipse across it. It was a
   show happening on top of a website rather than a website behaving well, and
   it covered the header to do it. Nothing now sticks, grows or holds: every
   section is its own height, and at no point is any part of the page hidden by
   decoration.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  /* THE PHONE USED TO BE EXCLUDED HERE, and that was the whole bug. A
     `matchMedia('(max-width: 820px)')` sat beside this one and every gate
     below tested both, so a phone got the finished page with no motion at
     all: the hero's entrance never ran and all 31 reveals resolved
     instantly. Every other page on the site reveals on scroll on a phone —
     they gate `.rv` on reduced-motion alone — so the homepage was the one
     page that arrived dead, which is exactly what was reported.

     Reduced motion is the only gate now. That is the one the reader actually
     asked for; screen width is not a motion preference. */

  /* THE KIT. Four treatments, assigned by what the content IS rather than by
     where it sits. §25 of the stylesheet holds the actual motion; this only
     decides which of the four each thing gets and what its place in a stagger
     is. Kept here rather than as attributes in build.js so the whole
     choreography can be re-cast in one place, and so the markup carries no
     evidence of an animation that may not run.

     Order within a group is stagger order. Each entry restarts at zero, which
     is why the eight article cards cascade among themselves and do not inherit
     a count from the five capability cards above them.

     THE HERO IS NOT IN THIS LIST ANY MORE. Its headline, lede and buttons used
     to be the first four entries; they animate from §26 of the stylesheet now,
     as a CSS animation that rests in the visible state. See the note there for
     why — briefly, this file hides an element and then owes it a reveal, and a
     debt like that on the first screen is the whole page when it goes unpaid. */
  var KIT = [
    /* display type — uncovered rather than faded */
    { c: 'rv-head', s: 'section > .wrap > h2.hand, .caps > .wrap > h2.hand, .cta h2' },

    /* body copy — a short rise, and no blur on anything anyone has to read */
    { c: 'rv-text', s: '.sec-lede' },
    { c: 'rv-text', s: '.cta .cta-pair, .cta .fine' },
    { c: 'rv-text', s: '.allp' },

    /* THE PRODUCT TILES HINGE, and they are the one entry here that reverses
       an earlier decision rather than continuing it. This band was made
       deliberately static — the note in build.js still says "it is complete
       the moment it is on screen, it costs no extra scroll, and it renders
       identically with or without JavaScript", and that was right about what
       was removed: a pinned section scrubbing a construction grid, ticking in
       registration marks and drawing wires against scroll position.

       This is not that. It is one transition per tile, fired once on entry,
       with no scroll listener and no rAF loop anywhere in the path. The band
       still does not pin, still costs no extra scroll, and a tile that never
       enters view is never touched. Requested: the tiles lie flat and hinge
       up like a laptop lid, and their captions pop in behind them. §32 of the
       stylesheet holds the motion.

       `.cell` rather than `.tile` because `.tile` already animates its own
       transform on hover and on tap. Ten cells in one group, so --i staggers
       them 0..9 across both visual rows.

       `now` IS WHY THIS ENTRY LOOKS DIFFERENT FROM THE OTHERS, and it exists
       because the guard below did exactly its job and produced a bad result.
       The tiles straddle the fold: at 1440x900 the top row of five is already
       on screen, so `onScreen` skipped all five and only the bottom row
       hinged. Five tiles standing up beside five that never moved is worse
       than no animation at all, and it is the specific complaint this work
       came from.

       The fix is NOT to hide things that are already on screen — that rule is
       right, and §26 of the stylesheet records the day it was learned. It is
       to give the on-screen ones the first-screen treatment instead: a CSS
       animation that rests in the visible state, so it is never hidden and
       never owed a reveal. Same gesture, same curve, same stagger; the only
       difference is that one is a transition waiting on an observer and the
       other is an animation that has already happened by the time anything
       could go wrong with it.

       So every tile hinges, and no tile is ever hidden with a debt. */
    { c: 'rv-wake', s: '.band .pgrid .cell', now: 'rv-wake-now' },

    /* objects — rise with a little scale, and the badge lands after the card */
    { c: 'rv-card', s: '.cap' },
    { c: 'rv-card', s: '.whyitem' },
    /* the featured episode arrives as ONE object, not as a player and a
       column that race each other — it is a single feature, and the two
       halves only mean anything together */
    { c: 'rv-card', s: '.tlfeat' },
    { c: 'rv-card', s: '.post' }
  ];

  /* ---- reveals ----------------------------------------------------------- */
  var io = null;

  /* NOTHING ALREADY ON SCREEN IS EVER HIDDEN. Marking an element is a promise
     to un-mark it, and that promise runs through an IntersectionObserver and a
     compositor repaint — neither of which this file can audit. Off the bottom
     of the window a broken promise costs an entrance. Inside the window it
     costs the content itself, and the reader has no way to know anything is
     missing. So the first screen is left alone on every page, not just on the
     one where it was caught: this is the guard, §26 is the entrance.

     A GROUP MAY OPT IN TO ANIMATING ON SCREEN ANYWAY, via `now` in the KIT —
     but only by naming a class whose motion RESTS IN THE VISIBLE STATE, the
     way §26 and §32 do. That is not a hole in this rule, it is the rule
     restated: what is forbidden is hiding something and owing it a reveal,
     not motion as such. Nothing marked that way is observed or hidden. */
  function onScreen(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < (innerHeight || 0);
  }

  function markReveals() {
    KIT.forEach(function (g) {
      var els = document.querySelectorAll(g.s);
      for (var i = 0; i < els.length; i++) {
        if (els[i].hasAttribute('data-reveal')) continue;   /* first rule wins */
        if (els[i].classList.contains('rv-now')) continue;
        if (onScreen(els[i])) {
          /* ON SCREEN: animate only if the group has a no-debt variant, and
             never mark it for the observer. `--i` is still set, so a group
             that straddles the fold cascades as ONE gesture across both
             halves instead of restarting its count at the boundary. */
          if (g.now) {
            els[i].style.setProperty('--i', i);
            els[i].classList.add(g.now, 'rv-now');
          }
          continue;
        }
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

  /* NO MARK OBSERVER. Four hand-drawn marks used to be watched separately from
     the ordinary reveals — they were not entrances but strokes made on a word
     that had already arrived, so each got `drawn` on entry and §24 of the
     stylesheet timed the pen. The marks were removed by request; a heading's
     important words carry a colour now, and a colour has nothing to draw. */

  /* ---- start / stop ------------------------------------------------------ */
  var started = false;

  function start() {
    if (started) return;
    started = true;
    /* Already set by the inline gate in <head> for the common case; this
       covers reduced motion being switched off mid-session. Idempotent
       either way. */
    document.documentElement.classList.add('fx');
    /* Tell the dead-man's switch in <head> that this file is alive, before it
       times out and strips .fx to rescue the page. */
    document.documentElement.classList.add('fx-on');
    markReveals();
    watchReveals();
  }

  function stopVisuals() {
    /* Reduced motion turned on mid-session. Resolve every reveal to its
       finished state rather than freezing it part way. */
    if (!started) return;
    document.documentElement.classList.remove('fx');
    var all = document.querySelectorAll('[data-reveal]');
    for (var i = 0; i < all.length; i++) all[i].classList.add('in');
  }

  /* THE READER WHO ASKED FOR LESS MOTION GETS THE FINISHED PAGE, IMMEDIATELY.
     `fx` is never added, so nothing is ever hidden waiting to be revealed.
     That reader, and a browser with no script, are now the only two states
     that skip the motion — a narrow window is not one of them. */
  function evaluate() {
    if (reduce.matches) {
      if (started) stopVisuals();
      else document.documentElement.classList.remove('fx');
      return;
    }
    start();
  }

  /* NO FONT, RESIZE OR VISIBILITY HOOK. All three existed to re-measure the
     product band's wiring and restart its loop. The reveals are one-shot
     IntersectionObserver entries, which the browser re-evaluates itself after a
     reflow, so there is nothing left here to keep in sync. */
  reduce.addEventListener('change', evaluate);

  evaluate();
})();
