/* ==========================================================================
   THE ECOSYSTEM CHAPTER'S BACKGROUND MOTION
   A field of translucent shards streaming across the dark band, behind the
   words and the diagram and nothing else.

   WHY THIS IS NOT AeroShards. The request named that React Bits component,
   and it is the right reference for the LOOK — this file matches its default
   parameters deliberately: emerald shards on near-black, a yellow accent
   feeding the highlights, the "stream" flow, the "pearl" finish, its density
   and shard-size defaults. What it does not do is bring its machinery:

     - it is a React 19 component, and this site has no React and no build
       step that could compile JSX;
     - it renders through `vgpu`, a WebGPU library. WebGPU is still absent or
       flagged off across a large slice of mobile Safari, which is precisely
       the platform that was just reported as feeling dead;
     - adding either would break the repo's zero-dependency rule, which is a
       stated rule and not an accident.

   So the same picture is drawn with canvas 2D, which every browser this site
   supports has had for fifteen years. Roughly 150 lines against a WebGPU
   engine, no dependency, and it degrades to a still frame rather than to
   nothing.

   THREE THINGS KEEP IT CHEAP, because the band already carries an animated
   SVG diagram and the phone budget is not infinite:
     1. It stops when it is off screen. An IntersectionObserver drops the
        rAF loop entirely rather than painting behind the reader's back.
     2. Shard count scales with area, and the device pixel ratio is capped
        at 2. A phone draws about a third of what a desktop draws.
     3. Only fills and transforms — no shadows, no filters, no gradients
        per shard. Shadow blur on a few hundred shapes per frame is what
        makes canvas fields janky, and the glow here is layered alpha.

   Reduced motion paints one frame and stops: the field is composition, so
   removing it entirely would leave the band emptier than designed, but
   nothing moves.
   ========================================================================== */
(function () {
  'use strict';

  var host = document.querySelector('.eco');
  if (!host || !window.requestAnimationFrame) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'ecofx';
  /* Decoration. It carries no information the words do not already carry, so
     it is hidden from the accessibility tree rather than described. */
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  host.insertBefore(canvas, host.firstChild);

  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* AeroShards' own defaults, kept so the palette and proportions match the
     reference rather than being invented here. The ground is NOT its #120F17
     — this band already has a colour (--well, #0C1014) and the canvas paints
     transparent over it, so the section keeps its own dark. */
  var SHARD = [16, 185, 129];     /* #10B981 emerald  */
  var ACCENT = [234, 179, 8];     /* #EAB308 yellow   */
  var SPEED = 1;
  var GLOW = 1;

  var shards = [];
  var w = 0, h = 0, dpr = 1;
  var raf = 0, last = 0, t = 0, visible = false;

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* One shard. `z` is depth in 0..1 and drives size, speed, alpha and colour
     mix together — that single number is what makes the field read as having
     volume instead of as flat confetti. */
  function makeShard() {
    var z = Math.random();
    return {
      x: rand(-0.1, 1.1),
      y: rand(-0.05, 1.05),
      z: z,
      len: rand(0.6, 1.2) * (0.4 + z * 0.9),
      roll: rand(0, Math.PI * 2),
      rollRate: rand(-0.5, 0.6),
      drift: rand(-0.16, 0.16),
      accent: Math.random() < 0.15,
    };
  }

  /* Count from area, so a phone is not asked to draw a desktop's field —
     but with a floor that actually shows. Straight area scaling starved the
     phone: the band there is 390x1199, which came out at 36 shards, and 36
     sparks in a screen-and-a-half of black reads as nothing happening. The
     divisor is per-area and the clamp is what makes the narrow case legible.
     Measured either way: 170 shards costs 8.3ms a frame on desktop and 72
     costs 8.4ms on a phone throttled 4x, both inside the 16.7ms budget. */
  function targetCount() {
    return Math.max(56, Math.min(170, Math.round((w * h) / 6500)));
  }

  function resize() {
    var r = host.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var want = targetCount();
    while (shards.length < want) shards.push(makeShard());
    if (shards.length > want) shards.length = want;
  }

  /* The stream. Every shard travels the same left-to-right current with a
     shallow vertical wave, so the field has one direction the eye can follow
     — AeroShards' "stream" formation rather than its vortex or ribbon. */
  function step(dt) {
    for (var i = 0; i < shards.length; i++) {
      var s = shards[i];
      var speed = (0.02 + s.z * 0.055) * SPEED;
      s.x += speed * dt;
      s.y += (Math.sin((s.x + s.roll) * 2.1) * 0.012 + s.drift * 0.01) * dt;
      s.roll += s.rollRate * dt * 0.6;
      /* Wrap rather than respawn: a shard leaving the right edge is the same
         shard arriving at the left, so the count never changes mid-frame. */
      if (s.x > 1.15) { s.x = -0.15; s.y = rand(-0.05, 1.05); }
      if (s.y > 1.1) s.y = -0.1;
      if (s.y < -0.1) s.y = 1.1;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    /* Far shards first, so nearer ones layer over them and the depth reads. */
    shards.sort(function (a, b) { return a.z - b.z; });

    /* ADDITIVE, WHICH IS THE WHOLE REASON THIS NOW READS AS LIGHT.
       The field was reported as needing to be far more visible, and the first
       instinct — turn the alpha up — was the wrong tool. Painted normally, a
       translucent emerald over a #0C1014 ground INTERPOLATES TOWARDS that
       ground: at low alpha the result is a dark desaturated green that the
       eye files as a shadow, so the band looked like it had dark leaves
       blowing through it. Turning that up just makes bigger, more solid dark
       leaves; it never makes them glow, because normal compositing cannot
       produce a colour lighter than the brightest layer.

       `lighter` ADDS the channels instead, so every shard puts light into the
       band and two overlapping shards are brighter than either — which is
       what a glow is, and what the reference component gets from its WebGPU
       blend. It costs nothing: one state change per frame, no filter, no
       shadowBlur, which is the one thing this file has always refused.

       Values can stay modest as a result. The ceiling is 0.42 on a channel
       that adds, so a lone shard lands around #10B981 at 42% ABOVE the
       ground rather than 42% of the way towards it. */
    ctx.globalCompositeOperation = 'lighter';

    for (var i = 0; i < shards.length; i++) {
      var s = shards[i];
      var px = s.x * w;
      var py = s.y * h;
      /* Size in pixels. This used to be `min(w, h) * 0.055`, which on a
         phone is the 390px WIDTH and gave 21px slivers — invisible against
         a 1199px-tall band. Clamped instead, and the clamp is what keeps the
         phone legible.

         13..26 was the ambient version. Raised now that the shards read as
         light rather than as shadow: at 13px an additive sliver is a speck,
         and the request was for the field to be seen. The 31px ceiling is
         still well under the 90px that once made a handful of them fill the
         band, and under the 36px that made them tangle with the diagram. */
      var unit = Math.min(31, Math.max(17, Math.min(w, h) * 0.023));
      var len = unit * s.len;
      var wide = len * 0.3;

      var c = s.accent ? ACCENT : SHARD;
      /* ALPHA, NOW READ AGAINST AN ADDITIVE BLEND, which changes what the
         numbers mean. 0.03..0.13 painted normally was ambient to the point of
         being reported as invisible. The same range added would still be
         faint, so it goes up — but nowhere near proportionally, because
         adding light is far more visible per unit of alpha than tinting
         towards a dark ground is.

         0.12..0.38, raised again by request for a more prominent field. The
         ceiling is still set by a measurement rather than by taste, and the
         measurement is the same one: a near-plane shard must not out-shine
         the 0.72-white the body paragraph is set in, because a background
         that wins that contest has stopped being a background. 0.42 broke
         that when it was tried; 0.38 does not.

         WHAT ACTUALLY MADE THE FIELD MORE VISIBLE THIS TIME IS THE GROUND,
         not this number. --well went from #0C1014 to #05080B, and because
         these shards are composited additively the darker ground raises every
         one of them in contrast for free — the same alpha simply reads as a
         larger step up from black. Turning alpha up alone would have had to
         go past the paragraph to achieve as much.

         Two shards crossing each other can still exceed the ceiling locally,
         which is the point — that crossing is the highlight, and it is rare
         enough to read as one. */
      var alpha = (0.12 + s.z * 0.26) * GLOW;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(s.roll);

      /* The shard: a four-point sliver, the flat 2D read of AeroShards'
         folded six-vertex form. Two passes — a wide soft body and a narrow
         bright core — give the pearl sheen without a filter or a shadow. */
      ctx.beginPath();
      ctx.moveTo(0, -len);
      ctx.lineTo(wide, 0);
      ctx.lineTo(0, len);
      ctx.lineTo(-wide, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha.toFixed(3) + ')';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -len * 0.82);
      ctx.lineTo(wide * 0.3, 0);
      ctx.lineTo(0, len * 0.82);
      ctx.lineTo(-wide * 0.3, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(' + Math.min(255, c[0] + 90) + ','
        + Math.min(255, c[1] + 60) + ',' + Math.min(255, c[2] + 70) + ','
        + (alpha * 0.34).toFixed(3) + ')';
      ctx.fill();

      ctx.restore();
    }
    /* Put it back. `clearRect` does not care, but leaving a canvas in a
       non-default blend mode is a trap for whatever draws next. */
    ctx.globalCompositeOperation = 'source-over';
  }

  function tick(now) {
    raf = 0;
    if (!visible) return;
    /* Clamp the delta. A backgrounded tab hands back a multi-second jump on
       return, which would teleport the whole field across the band. */
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    t += dt;
    step(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }

  function play() {
    if (raf || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function evaluate() {
    stop();
    resize();
    if (reduce.matches) { draw(); return; }   /* one still frame, then nothing */
    play();
  }

  /* OFF SCREEN MEANS OFF. The band is one section of a long page; without
     this the loop would run the whole time the reader is anywhere else. */
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !reduce.matches) play(); else stop();
    }, { rootMargin: '120px 0px' }).observe(host);
  } else {
    visible = true;
  }

  var resizeTimer = 0;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(evaluate, 160);
  });
  reduce.addEventListener('change', evaluate);

  resize();
  if (reduce.matches) draw();
})();
