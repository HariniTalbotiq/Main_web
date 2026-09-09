/* =============================================================================
   DEMO VIDEO CONTROLS — a play/pause button and a scrubbable track
   -----------------------------------------------------------------------------
   WHY THIS IS ONE FILE AND NOT FIFTEEN. Every product page is a standalone
   mockup with its own inlined <style> and its own inline <script>, and fifteen
   of them carry the same `<video id="demoVid">` slot. Injecting a control bar
   into each one means fifteen near-identical copies to keep in step, and these
   pages get re-dropped — `tools/fix-pages.js` exists for exactly that reason.
   So the bar is built here, once, and fix-pages only has to put one <script>
   tag on the page.

   THE CSS IS IN HERE TOO, deliberately. The controls do not exist without
   JavaScript, so shipping their stylesheet separately would mean a page that
   downloads rules for a bar it never draws — and, worse, a flash of unstyled
   controls between the stylesheet landing and this file running.

   IT DOES NOT DRAW ANYTHING UNTIL THE VIDEO CAN PLAY. Nine of the fifteen
   pages point at a demo file that does not exist yet and show a "drop the file
   here" placeholder instead. A player bar under a placeholder would be a
   control for nothing, so the bar is only revealed once the media reports it
   has frames.
   ========================================================================== */
(function () {
  'use strict';

  var CSS = [
    '.vctl{display:none;align-items:center;gap:18px;margin:18px 0 0}',
    '.vid.playing .vctl{display:flex}',
    /* the button: a filled disc, because that is the one control a reader
       looks for and it should not have to be found among others */
    '.vctl .vbtn{flex:0 0 auto;width:54px;height:54px;border-radius:50%;border:0;',
    '  background:var(--ink,#1F2430);color:#fff;cursor:pointer;display:flex;',
    '  align-items:center;justify-content:center;padding:0;transition:transform .16s ease,background .16s ease}',
    '.vctl .vbtn:hover{background:var(--green,#027A5C);transform:scale(1.04)}',
    '.vctl .vbtn:focus-visible{outline:2px solid var(--teal,#02A885);outline-offset:3px}',
    '.vctl .vbtn svg{display:block;pointer-events:none}',
    /* one button, two glyphs — the state lives on the wrapper so the CSS can
       swap them without JavaScript touching innerHTML on every click */
    '.vctl .vbtn .i-play{display:none}',
    '.vid.paused .vctl .vbtn .i-play{display:block}',
    '.vid.paused .vctl .vbtn .i-pause{display:none}',
    /* the track: a range input, so dragging, clicking, arrow keys, Home and End
       all work without a line of drag-handling code */
    '.vctl .vseek{flex:1 1 auto;-webkit-appearance:none;appearance:none;height:18px;',
    '  background:transparent;cursor:pointer;margin:0}',
    '.vctl .vseek:focus{outline:0}',
    '.vctl .vseek:focus-visible{outline:2px solid var(--teal,#02A885);outline-offset:4px;border-radius:9px}',
    '.vctl .vseek::-webkit-slider-runnable-track{height:6px;border-radius:3px;',
    '  background:linear-gradient(to right,var(--green,#027A5C) var(--p,0%),rgba(31,36,48,.14) var(--p,0%))}',
    '.vctl .vseek::-moz-range-track{height:6px;border-radius:3px;background:rgba(31,36,48,.14)}',
    '.vctl .vseek::-moz-range-progress{height:6px;border-radius:3px;background:var(--green,#027A5C)}',
    '.vctl .vseek::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:17px;height:17px;',
    '  border-radius:50%;background:var(--green,#027A5C);border:3px solid #fff;',
    '  box-shadow:0 1px 4px rgba(31,36,48,.35);margin-top:-5.5px}',
    '.vctl .vseek::-moz-range-thumb{width:11px;height:11px;border-radius:50%;',
    '  background:var(--green,#027A5C);border:3px solid #fff;box-shadow:0 1px 4px rgba(31,36,48,.35)}',
    '.vctl .vtime{flex:0 0 auto;font-variant-numeric:tabular-nums;font-size:13px;',
    '  color:var(--mute,#6C7682);min-width:82px;text-align:right}',
    '@media (max-width:560px){.vctl{gap:12px}.vctl .vbtn{width:46px;height:46px}}'
  ].join('\n');

  var PAUSE = '<svg class="i-pause" width="17" height="19" viewBox="0 0 17 19" aria-hidden="true">'
    + '<rect x="1" y="1" width="5.4" height="17" rx="1.6" fill="currentColor"/>'
    + '<rect x="10.6" y="1" width="5.4" height="17" rx="1.6" fill="currentColor"/></svg>';
  var PLAY = '<svg class="i-play" width="17" height="19" viewBox="0 0 17 19" aria-hidden="true">'
    + '<path d="M2 1.6v15.8L15.4 9.5z" fill="currentColor"/></svg>';

  function clock(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function wire(wrap, v) {
    var bar = document.createElement('div');
    bar.className = 'vctl';
    bar.innerHTML = '<button class="vbtn" type="button" aria-label="Pause">' + PAUSE + PLAY + '</button>'
      + '<input class="vseek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek within the demo">'
      + '<span class="vtime">0:00 / 0:00</span>';

    /* under the frame, above the caption — the caption is the last thing in
       the block and should stay the last thing */
    var cap = wrap.querySelector('.cap');
    if (cap) wrap.insertBefore(bar, cap); else wrap.appendChild(bar);

    var btn = bar.querySelector('.vbtn');
    var seek = bar.querySelector('.vseek');
    var time = bar.querySelector('.vtime');
    var scrubbing = false;

    function paint() {
      var d = v.duration;
      if (!isFinite(d) || !d) return;
      if (!scrubbing) {
        var p = v.currentTime / d;
        seek.value = String(Math.round(p * 1000));
        seek.style.setProperty('--p', (p * 100).toFixed(2) + '%');
      }
      time.textContent = clock(v.currentTime) + ' / ' + clock(d);
    }

    btn.addEventListener('click', function () {
      if (v.paused) {
        /* an explicit play clears the flag, so the observer below is free to
           manage the video again */
        delete wrap.dataset.userpaused;
        v.play().catch(function () {});
      } else {
        wrap.dataset.userpaused = '1';
        v.pause();
      }
    });

    /* THE PAGE'S OWN SCRIPT PAUSES ON SCROLL-OUT AND PLAYS ON SCROLL-IN, which
       is right for an ambient loop and wrong the moment a reader has pressed
       pause on purpose: scrolling away and back would start it again. Rather
       than edit fifteen inline scripts, the deliberate pause is remembered and
       any play that follows it is undone. Pressing play clears it. */
    v.addEventListener('play', function () {
      if (wrap.dataset.userpaused === '1') { v.pause(); return; }
      wrap.classList.remove('paused');
      btn.setAttribute('aria-label', 'Pause');
    });
    v.addEventListener('pause', function () {
      wrap.classList.add('paused');
      btn.setAttribute('aria-label', 'Play');
    });

    seek.addEventListener('input', function () {
      var d = v.duration;
      if (!isFinite(d) || !d) return;
      scrubbing = true;
      var p = seek.value / 1000;
      seek.style.setProperty('--p', (p * 100).toFixed(2) + '%');
      time.textContent = clock(p * d) + ' / ' + clock(d);
    });
    /* commit on release, not on every input event — seeking a 19MB file on
       each pixel of a drag makes the scrub stutter on a cold cache */
    seek.addEventListener('change', function () {
      var d = v.duration;
      if (isFinite(d) && d) v.currentTime = (seek.value / 1000) * d;
      scrubbing = false;
    });

    v.addEventListener('timeupdate', paint);
    v.addEventListener('durationchange', paint);
    v.addEventListener('loadedmetadata', paint);
    if (v.paused) wrap.classList.add('paused');
    paint();
  }

  function init() {
    var vids = document.querySelectorAll('.vid video');
    if (!vids.length) return;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    Array.prototype.forEach.call(vids, function (v) {
      var wrap = v.closest ? v.closest('.vid') : null;
      if (wrap) wire(wrap, v);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
