/* THE TALBOTIQ WEBSITE ASSISTANT — browser side.
 *
 * One file, one include. It carries its own markup and its own stylesheet,
 * because the standalone pages do not link assets/css/talbotiq.css — they
 * inline their own. A separate .css file would mean a second <link> on every
 * page, at the right ../ depth, on pages that sit at three different depths.
 * So the styles live in the string below and this is the whole integration,
 * identical on every page regardless of where it sits:
 *
 *     <script defer src="/assets/js/chat.js"></script>
 *
 * It posts to /api/chat — a root-absolute path, which is the other half of why
 * depth does not matter here. There is no key, no model name and no prompt in
 * this file; it does not know what it is talking to. That is deliberate.
 *
 * THE SHAPE follows the Odoo livechat widget: a small floating window you can
 * pick up by its header and leave anywhere, an avatar and a name in the bar, a
 * day divider, a time against every message, stacked quick replies, and a
 * round bubble to collapse into. It is a WINDOW, not a modal panel — which is
 * why there is no dimming and no focus trap: something you can drag out of the
 * way is not blocking anything, and pretending otherwise would trap keyboard
 * users behind a thing the mouse can simply move.
 *
 * Where it departs from the reference: no microphone, no emoji picker, no
 * attachment button. This assistant cannot hear you or take a file, and a
 * control that does nothing is worse than an absent one.
 *
 * ponytail: no framework, no bundler, no dependency. Plain DOM and pointer
 * events.
 */

(function () {
  'use strict';

  if (window.__tqChat) return;          /* two includes on one page must not stack */
  window.__tqChat = true;

  var API = '/api/chat';
  var STORE = 'tq-chat-log';            /* the conversation, across page loads */
  var POS = 'tq-chat-pos';              /* where you left the window */
  var MAX_CHARS = 1200;                 /* the server's cap, enforced here too so
                                           the visitor is told before they send */
  var W = 360;
  var H = 520;
  var BUBBLE = 56;

  var OPENERS = [
    'What does TALBOTIQ make?',
    'Which product handles hiring?',
    'How do I book a demo?',
  ];

  /* COLOUR IS DECIDED BY CONTRAST, not by which brand colour looks best.
     White on --teal #02A885 is 3.02:1 and fails AA for anything under 18.66px
     bold, so teal carries no text here: the bar uses --green #027A5C (5.33:1
     with white), the visitor's own bubbles use #131820, muted text is #5A6472
     (6:1), and teal survives only on the presence dot and the focus rings,
     where the 3:1 non-text threshold applies instead. */
  var GREEN = '#027A5C';
  var INK = '#131820';

  var CSS = [
    '.tq-c-win,.tq-c-btn{position:fixed;z-index:2147483000;',
    'font:400 14px/1.55 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;',
    'color:#1F2430;box-sizing:border-box}',
    '.tq-c-win *,.tq-c-btn *{box-sizing:border-box}',

    /* the round bubble it collapses to */
    '.tq-c-btn{width:' + BUBBLE + 'px;height:' + BUBBLE + 'px;padding:0;border:0;border-radius:50%;',
    'background:' + GREEN + ';color:#fff;cursor:pointer;display:grid;place-items:center;',
    'box-shadow:0 6px 20px rgba(2,122,92,.32),0 2px 6px rgba(15,20,28,.14);',
    'transition:transform .16s,box-shadow .16s;touch-action:none}',
    '.tq-c-btn:hover{transform:scale(1.06);box-shadow:0 10px 26px rgba(2,122,92,.38)}',
    '.tq-c-btn:focus-visible{outline:3px solid ' + INK + ';outline-offset:3px}',
    '.tq-c-btn[hidden],.tq-c-win[hidden]{display:none}',
    '.tq-c-btn .tq-c-dot{position:absolute;top:3px;right:3px;width:11px;height:11px;',
    'border-radius:50%;background:#02A885;border:2px solid #fff}',

    /* the window */
    '.tq-c-win{width:' + W + 'px;height:' + H + 'px;max-width:calc(100vw - 24px);',
    'max-height:calc(100vh - 24px);display:flex;flex-direction:column;overflow:hidden;',
    'background:#fff;border-radius:13px;border:1px solid #E2E7EC;',
    'box-shadow:0 18px 44px rgba(15,20,28,.22),0 2px 8px rgba(15,20,28,.1)}',

    /* title bar — the drag handle */
    '.tq-c-bar{flex:none;display:flex;align-items:center;gap:9px;padding:9px 8px 9px 11px;',
    'background:' + GREEN + ';color:#fff;cursor:grab;touch-action:none;user-select:none}',
    '.tq-c-bar.dragging{cursor:grabbing}',
    '.tq-c-av{flex:none;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.18);',
    'display:grid;place-items:center;color:#fff}',
    '.tq-c-bar b{flex:1;font-size:14.5px;font-weight:600;letter-spacing:-.01em}',
    '.tq-c-ic{flex:none;width:26px;height:26px;padding:0;border:0;border-radius:6px;',
    'background:transparent;color:#fff;cursor:pointer;display:grid;place-items:center;',
    'font-size:15px;line-height:1}',
    '.tq-c-ic:hover{background:rgba(255,255,255,.19)}',
    '.tq-c-ic:focus-visible{outline:2px solid #fff;outline-offset:1px}',

    /* log */
    '.tq-c-log{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;',
    'padding:12px 12px 4px;background:#F7F9FA}',
    '.tq-c-day{margin:2px 0 12px;text-align:center;font-size:11.5px;color:#5A6472;position:relative}',
    '.tq-c-day::before{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:#E2E7EC}',
    '.tq-c-day span{position:relative;background:#F7F9FA;padding:0 9px}',

    '.tq-c-row{display:flex;gap:8px;margin-bottom:11px}',
    '.tq-c-row.me{flex-direction:row-reverse}',
    '.tq-c-face{flex:none;width:26px;height:26px;border-radius:50%;background:#E4F5EF;',
    'display:grid;place-items:center;color:' + GREEN + '}',
    '.tq-c-body{min-width:0;max-width:calc(100% - 40px)}',
    '.tq-c-who{display:flex;gap:6px;align-items:baseline;margin:0 0 3px 2px;',
    'font-size:11.5px;color:#5A6472}',
    '.tq-c-who b{font-weight:600;color:#3C4553;font-size:12px}',
    '.tq-c-row.me .tq-c-who{justify-content:flex-end;margin:0 2px 3px 0}',
    '.tq-c-msg{padding:9px 12px;border-radius:11px;font-size:14px;line-height:1.6;',
    'white-space:pre-wrap;word-wrap:break-word;background:#E9F4FA;border-bottom-left-radius:3px}',
    '.tq-c-row.me .tq-c-msg{background:' + INK + ';color:#fff;',
    'border-bottom-left-radius:11px;border-bottom-right-radius:3px}',
    '.tq-c-msg.bad{background:#FDF3F3;color:#8F2323;border:1px solid #F3D4D4}',
    '.tq-c-msg a{color:' + GREEN + ';font-weight:600;text-decoration:underline;text-underline-offset:2px}',
    '.tq-c-row.me .tq-c-msg a{color:#fff}',
    '.tq-c-msg ul{margin:6px 0 0;padding-left:18px}',
    '.tq-c-msg li{margin:2px 0}',
    '.tq-c-msg strong{font-weight:600}',

    /* thinking */
    '.tq-c-wait{display:flex;gap:4px;padding:11px 12px;background:#E9F4FA;border-radius:11px;',
    'border-bottom-left-radius:3px;width:-moz-fit-content;width:fit-content}',
    '.tq-c-wait i{width:6px;height:6px;border-radius:50%;background:#9FB0BC;animation:tq-c-bob 1.1s infinite}',
    '.tq-c-wait i:nth-child(2){animation-delay:.16s}.tq-c-wait i:nth-child(3){animation-delay:.32s}',
    '@keyframes tq-c-bob{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-4px);opacity:1}}',

    /* quick replies, stacked under the greeting */
    '.tq-c-chips{display:flex;flex-direction:column;gap:6px;margin:0 0 11px 34px}',
    '.tq-c-chips[hidden]{display:none}',
    '.tq-c-chips button{padding:9px 11px;border:1px solid #D6DEE5;border-radius:9px;',
    'background:#fff;color:#3C4553;font:inherit;font-size:13.5px;cursor:pointer;',
    'transition:border-color .15s,color .15s,background .15s}',
    '.tq-c-chips button:hover{border-color:' + GREEN + ';color:' + GREEN + ';background:#F4FBF8}',
    '.tq-c-chips button:focus-visible{outline:2px solid #02A885;outline-offset:1px}',

    /* composer */
    '.tq-c-form{flex:none;display:flex;align-items:flex-end;gap:7px;padding:9px 10px;',
    'border-top:1px solid #E9EDF1;background:#fff}',
    '.tq-c-form textarea{flex:1;min-height:38px;max-height:110px;padding:9px 11px;',
    'border:1px solid #D6DEE5;border-radius:19px;background:#fff;color:#1F2430;font:inherit;',
    'font-size:14px;line-height:1.45;resize:none}',
    '.tq-c-form textarea::placeholder{color:#8A93A0}',
    '.tq-c-form textarea:focus{outline:0;border-color:#02A885;box-shadow:0 0 0 3px rgba(2,168,133,.15)}',
    '.tq-c-send{flex:none;width:38px;height:38px;padding:0;border:0;border-radius:50%;',
    'background:' + GREEN + ';color:#fff;cursor:pointer;display:grid;place-items:center;',
    'transition:background .15s}',
    '.tq-c-send:hover:not(:disabled){background:#016B50}',
    '.tq-c-send:disabled{background:#C9D0D8;cursor:default}',
    '.tq-c-send:focus-visible{outline:2px solid ' + INK + ';outline-offset:2px}',
    '.tq-c-foot{flex:none;margin:0;padding:0 12px 9px;background:#fff;color:#5A6472;',
    'font-size:10.5px;line-height:1.45}',
    '.tq-c-foot a{color:' + GREEN + '}',
    '.tq-c-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;',
    'clip:rect(0 0 0 0);white-space:nowrap;border:0}',

    /* PHONES. It becomes a bottom sheet, and several things that are fine on a
       desktop are bugs here:

       - the composer must be 16px. Below that, iOS Safari zooms the entire page
         when the field takes focus, and the visitor is left pinched into a
         corner of the site with no obvious way back. This is the one that
         matters most and it costs nothing.
       - the keyboard. A fixed element anchored to bottom:0 stays at the LAYOUT
         viewport's bottom, so the keyboard covers the composer — you type
         blind. --tq-vh and the transform below are driven from visualViewport
         so the sheet rides above it.
       - the home indicator. env(safe-area-inset-bottom) keeps the last line of
         text and the footnote off the gesture bar.
       - touch targets. 26px header icons are a desktop size; fingers need ~44.
       - dragging is meaningless on a sheet that spans the screen, so the bar
         stops advertising a grab cursor. */
    '@media (max-width:520px){',
    '.tq-c-win{left:0!important;top:auto!important;right:0;bottom:0;width:100vw;',
    /* max-width has to be released too, or the base rule's calc(100vw - 24px)
       wins and the window sits 24px narrow with a hairline of page each side */
    'max-width:none;max-height:none;border-radius:14px 14px 0 0;border-bottom:0;',
    'height:min(86dvh,calc(var(--tq-vh,100dvh) - 14px))}',
    '.tq-c-bar{cursor:default;padding:11px 9px 11px 12px}',
    '.tq-c-ic{width:36px;height:36px;font-size:17px}',
    '.tq-c-form{padding:10px 11px}',
    '.tq-c-form textarea{font-size:16px;min-height:42px;border-radius:21px}',
    '.tq-c-send{width:44px;height:44px}',
    '.tq-c-foot{padding:0 14px calc(10px + env(safe-area-inset-bottom))}',
    '.tq-c-log{padding:12px 12px 6px}',
    '.tq-c-msg{font-size:15px}',
    '.tq-c-chips button{padding:11px 12px;font-size:14px}',
    '.tq-c-btn{bottom:calc(18px + env(safe-area-inset-bottom))}}',
    /* a phone on its side has almost no height; let the sheet take nearly all */
    '@media (max-width:900px) and (max-height:480px){',
    '.tq-c-win{height:min(96dvh,calc(var(--tq-vh,100dvh) - 8px))}}',
    '@media (prefers-reduced-motion:reduce){',
    '.tq-c-btn,.tq-c-btn:hover{transition:none;transform:none}.tq-c-wait i{animation:none}}',
  ].join('');

  var SPARK = function (px) {
    return '<svg width="' + px + '" height="' + px + '" viewBox="0 0 18 18" fill="none" aria-hidden="true">'
      + '<path d="M7.4 1.4a.4.4 0 0 1 .77 0l1.05 3.06a.4.4 0 0 0 .25.25l3.06 1.05a.4.4 0 0 1 0 .76L9.47 7.63a.4.4 0 0 0-.25.25L8.17 10.9a.4.4 0 0 1-.77 0L6.35 7.88a.4.4 0 0 0-.25-.25L3.04 6.58a.4.4 0 0 1 0-.76L6.1 4.77a.4.4 0 0 0 .25-.25z" fill="currentColor"/>'
      + '<path d="M13.3 10.5a.3.3 0 0 1 .57 0l.5 1.45a.3.3 0 0 0 .18.19l1.45.5a.3.3 0 0 1 0 .56l-1.45.5a.3.3 0 0 0-.19.19l-.5 1.44a.3.3 0 0 1-.56 0l-.5-1.44a.3.3 0 0 0-.19-.19l-1.44-.5a.3.3 0 0 1 0-.56l1.44-.5a.3.3 0 0 0 .19-.19z" fill="currentColor" opacity=".72"/>'
      + '</svg>';
  };

  /* ------------------------------------------------------------ rendering */

  /* PURE-RENDER BLOCK — start. tools/chat-render.test.js lifts everything
     between these two markers and runs it outside a browser, which is how the
     escaping, the href allowlist and the paragraph/list assembly get a check
     they cannot quietly lose. Keep this block free of DOM references. */

  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* Only site-relative paths become links. Not a style preference: this is the
     one place model output reaches innerHTML, so the allowed shape of an href
     is a closed list rather than "whatever came back". javascript:, data: and
     any off-site host simply stay as text.
     The (?!\/) is the whole difference between this and a link to anywhere on
     the internet: without it "//evil.example/login.html" passes, because the
     second slash falls inside the character class, and the sentence above
     would be false. A single leading slash, and never two. */
  var SAFE_PATH = /^\/(?!\/)[A-Za-z0-9._~/-]*(?:#[A-Za-z0-9._-]+)?$/;
  var link = function (href, label) {
    return SAFE_PATH.test(href)
      ? '<a href="' + esc(href) + '">' + label + '</a>'
      : label;
  };

  function rich(text) {
    var out = esc(text)
      /* [label](/path) */
      .replace(/\[([^\]\n]{1,120})\]\(([^)\s]{1,200})\)/g, function (m, label, href) {
        return link(href, label);
      })
      /* A bare site path sitting in a sentence. The corpus is extensionless
         now, so the model writes /products/video-interview and the old
         `.html`-only pattern stopped matching anything it says. Both shapes are
         accepted: answers cached from before the migration still linkify, and
         the host 308s the .html form to the clean one anyway.

         A CLOSED LIST, not a general path pattern, for the same reason
         SAFE_PATH above is one. `\/[A-Za-z0-9-]+` would linkify "9/10" and any
         other slash the model happens to type; naming the two directories and
         the four root pages cannot. */
      .replace(
        /(^|[\s(])(\/(?:products|solutions)\/[A-Za-z0-9-]+(?:\.html)?|\/(?:about|contact|demo|signin)(?:\.html)?)(?=$|[\s),.;:!?])/g,
        function (m, pre, href) { return pre + link(href, href); })
      .replace(/\*\*([^*\n]{1,160})\*\*/g, '<strong>$1</strong>');

    /* "- item" lines become a real list; every other line keeps its newline,
       which .tq-c-msg renders through white-space:pre-wrap.

       This used to decide the newline by testing whether the accumulated html
       ended in ">", which was meant to mean "just closed a </ul>" and actually
       meant "the previous line ended in any tag at all". So a reply reading
       "It is built for **hiring**\nATS is the product." rendered as
       "hiringATS is the product." — the commonest possible shape, a bolded
       word at the end of a line, silently welded two sentences together.
       Plain lines and list items are now gathered separately and each joined
       on its own terms, so no test on the output string decides anything. */
    var lines = out.split('\n');
    var chunks = [];
    var para = [];
    var items = null;

    var flushPara = function () {
      while (para.length && para[para.length - 1] === '') para.pop();
      if (para.length) chunks.push(para.join('\n'));
      para = [];
    };
    var flushList = function () {
      if (items) chunks.push('<ul>' + items.join('') + '</ul>');
      items = null;
    };

    for (var i = 0; i < lines.length; i++) {
      var li = lines[i].match(/^\s*[-*]\s+(.*)$/);
      if (li) {
        flushPara();
        if (!items) items = [];
        items.push('<li>' + li[1] + '</li>');
      } else {
        flushList();
        /* a blank line leading a paragraph is spacing the <ul> already gives */
        if (lines[i] !== '' || para.length) para.push(lines[i]);
      }
    }
    flushPara();
    flushList();
    return chunks.join('');
  }

  /* PURE-RENDER BLOCK — end. */

  /* ---------------------------------------------------------------- state */

  var turns = [];
  try {
    var kept = JSON.parse(sessionStorage.getItem(STORE) || '[]');
    if (Array.isArray(kept)) turns = kept.slice(-12);
  } catch (e) { /* private window, or storage blocked — start fresh, no fuss */ }

  var save = function () {
    try { sessionStorage.setItem(STORE, JSON.stringify(turns.slice(-12))); } catch (e) {}
  };

  /* The dragged position outlives the tab, because "leave it there" has to
     mean the next page too — a per-viewer convenience, so localStorage, and
     every read and write is guarded because a private window throws. */
  var pos = null;
  try {
    var p = JSON.parse(localStorage.getItem(POS) || 'null');
    if (p && isFinite(p.x) && isFinite(p.y)) pos = { x: +p.x, y: +p.y };
  } catch (e) {}
  var savePos = function () {
    try { localStorage.setItem(POS, JSON.stringify(pos)); } catch (e) {}
  };

  var time = function (ms) {
    try {
      return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) { return ''; }
  };

  /* ------------------------------------------------------------------ DOM */

  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tq-c-btn';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'tq-c-win');
  btn.setAttribute('aria-label', 'Ask the TALBOTIQ guide');
  btn.title = 'Ask the TALBOTIQ guide';
  btn.innerHTML = SPARK(24) + '<i class="tq-c-dot"></i>';

  var win = document.createElement('div');
  win.id = 'tq-c-win';
  win.className = 'tq-c-win';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-labelledby', 'tq-c-title');
  win.hidden = true;
  win.innerHTML = ''
    + '<div class="tq-c-bar">'
    + '<span class="tq-c-av">' + SPARK(15) + '</span>'
    + '<b id="tq-c-title">TALBOTIQ</b>'
    + '<button type="button" class="tq-c-ic tq-c-min" aria-label="Minimize" title="Minimize">&#8722;</button>'
    + '<button type="button" class="tq-c-ic tq-c-end" aria-label="End the conversation" title="End the conversation">&#10005;</button>'
    + '</div>'
    + '<div class="tq-c-log" role="log" aria-live="polite" aria-atomic="false"></div>'
    + '<form class="tq-c-form"><label class="tq-c-sr" for="tq-c-in">Your question</label>'
    + '<textarea id="tq-c-in" rows="1" maxlength="' + MAX_CHARS + '" placeholder="Say something&hellip;"></textarea>'
    + '<button type="submit" class="tq-c-send" aria-label="Send">'
    + '<svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">'
    + '<path d="M3 15 15.5 9 3 3l2.4 6L3 15Z" fill="currentColor"/></svg></button></form>'
    + '<p class="tq-c-foot">The TalbotIQ assistant answers from this website only. '
    + 'Anything else, <a href="/contact">talk to the team</a>.</p>';

  document.body.appendChild(btn);
  document.body.appendChild(win);

  var bar = win.querySelector('.tq-c-bar');
  var log = win.querySelector('.tq-c-log');
  var form = win.querySelector('.tq-c-form');
  var input = win.querySelector('#tq-c-in');
  var send = win.querySelector('.tq-c-send');

  var chips = document.createElement('div');
  chips.className = 'tq-c-chips';

  /* ------------------------------------------------------------ placement */

  var GAP = 12;
  var phone = function () { return window.matchMedia('(max-width:520px)').matches; };

  /* PAGE FURNITURE ALONG THE BOTTOM EDGE. 24 of the 26 pages pin a fixed CTA
     bar to the bottom edge below 880px, and the bubble's default corner landed
     squarely inside it: 56x38px of "WhatsApp" / "Leadership" / "See how
     scoring works" sat under a widget with a z-index of 2147483000, so that
     part of the button could not be tapped at all. A page that owns such a bar
     declares its height as --tq-bottom-bar and the bubble keeps clear; a page
     without one (index.html, demo.html) reads 0 and nothing moves.

     Cached rather than read per pointermove, because clamp() runs on every
     frame of a drag and this is a forced style read — the value can only
     change when the viewport does, which is where it is refreshed. */
  var barPx = 0;
  function readBottomBar() {
    var v = getComputedStyle(document.body).getPropertyValue('--tq-bottom-bar');
    barPx = Math.max(0, parseFloat(v) || 0);
  }

  function clamp(x, y, w, h) {
    var floor = window.innerHeight - barPx;
    return {
      x: Math.max(GAP, Math.min(x, Math.max(GAP, window.innerWidth - w - GAP))),
      y: Math.max(GAP, Math.min(y, Math.max(GAP, floor - h - GAP))),
    };
  }

  /* THE WINDOW AND THE BUBBLE SHARE ONE POSITION, so collapsing leaves the
     bubble where the window was instead of teleporting it to a corner, and
     the next page opens it where you left it. Clamped on every placement and
     on resize, because a position saved on a wide monitor must not put the
     window off-screen on a laptop. */
  function place() {
    readBottomBar();
    var live = win.hidden ? btn : win;
    var w = win.hidden ? BUBBLE : Math.min(W, window.innerWidth - 2 * GAP);
    var h = win.hidden ? BUBBLE : Math.min(H, window.innerHeight - 2 * GAP);
    btn.style.left = btn.style.top = '';
    win.style.left = win.style.top = '';
    if (!win.hidden && phone()) return;          /* the stylesheet owns it there */
    var at = pos
      ? clamp(pos.x, pos.y, w, h)
      : { x: window.innerWidth - w - 20, y: window.innerHeight - barPx - h - 20 };
    live.style.left = at.x + 'px';
    live.style.top = at.y + 'px';
  }

  /* Pointer drag, on the title bar and on the bubble, so either can be moved.
     A press only becomes a drag once it has travelled a few pixels —
     otherwise picking the bubble up would swallow the click that opens it. */
  /* OPENING IS A CLICK, NOT A DRAG OUTCOME. This used to call open() from the
     drag handler's pointerup, which meant the early return for phone widths —
     where there is no dragging — also swallowed the only way to open the
     thing. On a phone the bubble did nothing at all. The click listener below
     is now the single way in, and a completed drag suppresses the click that
     browsers fire after it. */
  var swallowClick = false;

  function draggable(handle) {
    var grab = null;
    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (e.target.closest && e.target.closest('.tq-c-ic')) return;   /* the bar's buttons */
      if (phone()) return;
      var live = win.hidden ? btn : win;
      var r = live.getBoundingClientRect();
      grab = {
        px: e.clientX, py: e.clientY,
        ox: e.clientX - r.left, oy: e.clientY - r.top,
        moved: false,
      };
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    });
    handle.addEventListener('pointermove', function (e) {
      if (!grab) return;
      if (!grab.moved
        && Math.abs(e.clientX - grab.px) < 4 && Math.abs(e.clientY - grab.py) < 4) return;
      if (!grab.moved) { grab.moved = true; bar.classList.add('dragging'); }
      var live = win.hidden ? btn : win;
      var r = live.getBoundingClientRect();
      var at = clamp(e.clientX - grab.ox, e.clientY - grab.oy, r.width, r.height);
      live.style.left = at.x + 'px';
      live.style.top = at.y + 'px';
      pos = at;
    });
    var release = function (e) {
      if (!grab) return;
      var moved = grab.moved;
      grab = null;
      bar.classList.remove('dragging');
      try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
      if (moved) { swallowClick = true; savePos(); }
    };
    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', release);
  }

  window.addEventListener('resize', place);

  /* THE KEYBOARD, and the only reliable way to find it. There is no event for
     "keyboard opened"; what happens is that visualViewport shrinks while the
     layout viewport does not. The difference is the keyboard's height, and a
     sheet pinned to the layout bottom has to be lifted by exactly that much or
     the composer sits behind it. --tq-vh also caps the sheet's height so the
     title bar cannot be pushed off the top of a short viewport. */
  var vv = window.visualViewport;
  function fitViewport() {
    if (!vv) return;
    document.documentElement.style.setProperty('--tq-vh', Math.round(vv.height) + 'px');
    if (win.hidden || !phone()) { win.style.transform = ''; return; }
    var covered = Math.round(window.innerHeight - (vv.height + vv.offsetTop));
    win.style.transform = covered > 40 ? 'translateY(-' + covered + 'px)' : '';
    log.scrollTop = log.scrollHeight;
  }
  if (vv) {
    vv.addEventListener('resize', fitViewport);
    vv.addEventListener('scroll', fitViewport);
  }

  /* On a phone the sheet covers the page, so the page should not scroll behind
     it — including the page's own fixed bottom action bar, which would
     otherwise still be reachable underneath. On a desktop the window is a
     small floating thing and locking the page would be wrong, so this is
     scoped to the width where it is actually a sheet. */
  var scrollWas = '';
  function lockPage(on) {
    if (on && phone()) {
      scrollWas = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else if (!on) {
      document.body.style.overflow = scrollWas;
      scrollWas = '';
    }
  }

  /* ------------------------------------------------------------- messages */

  var GREETING = 'Hello! Ask me anything about TALBOTIQ’s products or this website. '
    + 'What can I help you with?';

  function row(role, text, at) {
    var mine = role === 'user';
    var el = document.createElement('div');
    el.className = 'tq-c-row' + (mine ? ' me' : '');
    el.innerHTML = (mine ? '' : '<span class="tq-c-face">' + SPARK(14) + '</span>')
      + '<div class="tq-c-body">'
      + '<p class="tq-c-who">' + (mine ? '' : '<b>TALBOTIQ</b>')
      + '<span>' + esc(time(at)) + '</span></p>'
      + '<div class="tq-c-msg' + (role === 'error' ? ' bad' : '') + '"></div>'
      + '</div>';
    var body = el.querySelector('.tq-c-msg');
    /* the visitor's own words are never markup */
    if (mine) body.textContent = text; else body.innerHTML = rich(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function showOpeners() {
    chips.innerHTML = '';
    if (turns.length) { chips.hidden = true; return; }
    chips.hidden = false;
    OPENERS.forEach(function (q) {
      var c = document.createElement('button');
      c.type = 'button';
      c.textContent = q;
      c.addEventListener('click', function () { ask(q); });
      chips.appendChild(c);
    });
    log.appendChild(chips);
    log.scrollTop = log.scrollHeight;
  }

  function render() {
    log.innerHTML = '';
    var day = document.createElement('div');
    day.className = 'tq-c-day';
    day.innerHTML = '<span>Today</span>';
    log.appendChild(day);
    if (turns.length) {
      turns.forEach(function (t) {
        row(t.role === 'user' ? 'user' : 'model', t.text, t.at);
      });
    } else {
      row('model', GREETING, Date.now());
    }
    showOpeners();
  }

  render();

  var busy = false;

  /* An error is shown, but the question that caused it is taken back out of the
     history. Leaving it in would send [..., user, user] on the next question —
     which the server now repairs, but a stored history that quietly disagrees
     with what happened is worth not keeping either. The bubble stays on screen;
     it is the replayed context that is corrected. */
  function failed(message) {
    if (turns.length && turns[turns.length - 1].role === 'user') turns.pop();
    save();
    row('error', message, Date.now());
  }

  function ask(text) {
    text = String(text || '').trim();
    if (!text || busy) return;

    busy = true;
    send.disabled = true;
    chips.hidden = true;
    row('user', text, Date.now());
    turns.push({ role: 'user', text: text, at: Date.now() });
    save();

    var wrap = document.createElement('div');
    wrap.className = 'tq-c-row';
    wrap.innerHTML = '<span class="tq-c-face">' + SPARK(14) + '</span>'
      + '<div class="tq-c-body"><div class="tq-c-wait" aria-label="Thinking">'
      + '<i></i><i></i><i></i></div></div>';
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;

    fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      /* the page the visitor is on, so "what does this page cover?" is a
         question the assistant can answer. The server matches it against the
         real url list rather than trusting it. `at` stays local — the server
         has no use for it and it is not part of the conversation. */
      body: JSON.stringify({
        messages: turns.slice(-12).map(function (t) { return { role: t.role, text: t.text }; }),
        page: location.pathname,
      }),
    })
      .then(function (r) {
        return r.json().catch(function () { return { error: 'I could not read that answer. Please try again.' }; });
      })
      .then(function (d) {
        wrap.remove();
        if (d && d.reply) {
          row('model', d.reply, Date.now());
          turns.push({ role: 'model', text: d.reply, at: Date.now() });
          save();
        } else {
          failed((d && d.error) || 'Something went wrong. Please try again.');
        }
      })
      .catch(function () {
        wrap.remove();
        failed('I could not reach the assistant. Check your connection and try again.');
      })
      .then(function () {
        busy = false;
        send.disabled = false;
        if (!phone()) input.focus();
      });
  }

  /* --------------------------------------------------------------- wiring */

  function open() {
    win.hidden = false;
    btn.hidden = true;
    btn.setAttribute('aria-expanded', 'true');
    place();
    lockPage(true);
    fitViewport();
    /* Not on a phone: focusing the field opens the keyboard over the greeting
       before the visitor has read it, and on iOS it also scrolls the page. Let
       them tap the field when they are ready. */
    if (!phone()) input.focus();
    log.scrollTop = log.scrollHeight;
  }

  /* Minimize keeps everything and gets out of the way. Ending the conversation
     is the other button, and it says so in its label — a close box that
     silently threw the transcript away, or one that kept it and behaved
     identically to minimize, would both be lying about which is which. */
  function minimize() {
    win.hidden = true;
    btn.hidden = false;
    btn.setAttribute('aria-expanded', 'false');
    win.style.transform = '';
    lockPage(false);
    place();
    btn.focus();
  }

  function end() {
    turns = [];
    save();
    render();
    minimize();
  }

  draggable(btn);
  draggable(bar);
  btn.addEventListener('click', function () {
    if (swallowClick) { swallowClick = false; return; }
    open();
  });
  win.querySelector('.tq-c-min').addEventListener('click', minimize);
  win.querySelector('.tq-c-end').addEventListener('click', end);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !win.hidden) { e.stopPropagation(); minimize(); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    /* Do not clear the box until the question is definitely going. ask()
       returns early while a reply is in flight, so clearing first meant a
       second Enter during those few seconds threw the typed question away
       with nothing to show for it. */
    if (busy || !input.value.trim()) return;
    var q = input.value;
    input.value = '';
    input.style.height = '';
    ask(q);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });

  /* grow with the question, up to the max-height the stylesheet sets */
  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 110) + 'px';
  });

  place();
}());
