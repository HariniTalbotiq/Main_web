/* =============================================================================
   THE ENQUIRY FORM — progressive enhancement only
   -----------------------------------------------------------------------------
   THE FORM ALREADY WORKS WITHOUT THIS FILE. It is a real <form action="/api/demo"
   method="post"> with a real submit button, so with JavaScript off it posts,
   the endpoint answers with a thank-you page, and the lead arrives. Everything
   here is an improvement on that, never a requirement for it — which is why it
   attaches on submit rather than replacing the button, and why every failure
   path below falls back to letting the browser do the native post.

   IT DOES THREE THINGS:
     1. posts with fetch, so the reader keeps their place and their answers
        instead of being thrown to a bare confirmation page;
     2. adds `tried` to the form on the first blocked submit, which is the hook
        the .dform.tried :invalid rule in the stylesheet has always been
        waiting for — until now nothing ever set it and the red borders could
        not appear;
     3. sends the page URL along, so an enquiry from the Sales CRM page is
        distinguishable from one off the homepage.
   ========================================================================== */
(function () {
  'use strict';

  var CSS = [
    '.dmsg{margin:14px 0 0;padding:13px 16px;border-radius:10px;font-size:14.5px;line-height:1.55}',
    '.dmsg[hidden]{display:none}',
    '.dmsg.ok{background:rgba(255,255,255,.14);color:#EAFFF7;border:1px solid rgba(255,255,255,.28)}',
    '.dmsg.bad{background:rgba(192,57,43,.16);color:#FFD9D4;border:1px solid rgba(192,57,43,.5)}',
    '.dform.sending .dsubmit{opacity:.6;pointer-events:none}',
    /* THE ACKNOWLEDGEMENT. A native <dialog>, so the focus trap, the Escape
       key, the backdrop and the top layer are the browser's job rather than
       three hundred lines of mine. Every colour is stated outright: this is
       appended to <body> and has to look the same on the demo page, which
       loads the shared stylesheet, and on the contact page, which carries its
       own copy. */
    '.dack{border:0;padding:0;background:transparent;max-width:min(440px,calc(100vw - 32px))}',
    '.dack::backdrop{background:rgba(6,32,28,.62)}',
    '.dackbox{background:#fff;border-radius:16px;padding:30px 30px 26px;text-align:center;'
      + 'box-shadow:0 24px 60px rgba(9,40,36,.28);font-family:inherit;color:#1F2430}',
    '.dackmark{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;margin:0 auto 16px}',
    '.dackmark svg{width:28px;height:28px;fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}',
    '.dack.ok .dackmark{background:#E4F6EF}.dack.ok .dackmark svg{stroke:#027A5C}',
    '.dack.bad .dackmark{background:#FBE6E3}.dack.bad .dackmark svg{stroke:#C0392B}',
    '.dackbox h2{margin:0 0 8px;font-size:21px;line-height:1.25;font-weight:700;color:#1F2430}',
    '.dackbox p{margin:0 0 6px;font-size:15px;line-height:1.6;color:#4C5A57}',
    '.dackbox .dacksub{font-size:13.5px;color:#6B7770;margin-top:12px}',
    '.dackbox .dacksub a{color:#027A5C;font-weight:600;text-decoration:none}',
    '.dackbox .dacksub a:hover{text-decoration:underline}',
    '.dackclose{margin-top:20px;width:100%;border:0;border-radius:10px;cursor:pointer;'
      + 'background:#02A885;color:#fff;font:inherit;font-size:16px;font-weight:700;padding:12px 20px}',
    '.dackclose:hover{background:#027A5C}'
  ].join('\n');

  var TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.6 9.2 18 20 6.6"/></svg>';
  var CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* Built once and reused, so a second submit cannot stack two dialogs. */
  var dlg;
  function acknowledge(ok, heading, body, sub) {
    if (!window.HTMLDialogElement) return false;   /* caller falls back inline */
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.innerHTML = '<div class="dackbox">'
        + '<div class="dackmark"></div><h2></h2><p class="dackbody"></p>'
        + '<p class="dacksub"></p>'
        + '<button type="button" class="dackclose">Close</button></div>';
      document.body.appendChild(dlg);
      dlg.querySelector('.dackclose').addEventListener('click', function () { dlg.close(); });
    }
    dlg.className = 'dack ' + (ok ? 'ok' : 'bad');
    dlg.querySelector('.dackmark').innerHTML = ok ? TICK : CROSS;
    dlg.querySelector('h2').textContent = heading;
    dlg.querySelector('.dackbody').textContent = body;
    dlg.querySelector('.dacksub').innerHTML = sub;
    dlg.showModal();
    dlg.querySelector('.dackclose').focus();
    return true;
  }

  var REACH = 'Or reach us at <a href="mailto:hello@talbotiq.com">hello@talbotiq.com</a>'
    + ' or <a href="tel:+60320111320">+603 20 111 320</a>.';

  function enhance(form) {
    var btn = form.querySelector('.dsubmit');
    var msg = document.createElement('p');
    msg.className = 'dmsg';
    msg.hidden = true;
    /* aria-live so the outcome is announced, not just drawn */
    msg.setAttribute('role', 'status');
    msg.setAttribute('aria-live', 'polite');
    var note = form.querySelector('.dnote');
    if (note) form.insertBefore(msg, note); else form.appendChild(msg);

    function say(text, ok) {
      msg.textContent = text;
      msg.className = 'dmsg ' + (ok ? 'ok' : 'bad');
      msg.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      /* THE FORM CARRIES `novalidate`, so the browser will not stop an empty
         submit on its own. Checking here is what turns the required attributes
         back on, and `tried` is what lets the stylesheet colour the offenders.
         Native validation UI stays suppressed deliberately — one message in
         the form reads better than a browser tooltip on whichever field the
         browser happens to pick. */
      if (!form.checkValidity()) {
        e.preventDefault();
        form.classList.add('tried');
        say('Please fill in every field marked with an asterisk.', false);
        var bad = form.querySelector(':invalid');
        if (bad && bad.focus) bad.focus();
        return;
      }

      /* No fetch, or no endpoint set on the form: let the browser post it. */
      if (!window.fetch || !form.action) return;

      e.preventDefault();
      form.classList.add('sending');
      if (btn) btn.setAttribute('aria-busy', 'true');

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.page = location.pathname + location.search;

      fetch(form.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; })
            .then(function (j) { return { ok: r.ok, body: j }; });
        })
        .then(function (r) {
          if (!r.ok) {
            var msg = r.body.error || 'That did not send.';
            /* The dialog for a delivery failure too, not just for success: it
               is the one outcome where the reader has to be given another way
               to reach us, and an inline line under a long form is easy to
               submit-and-scroll straight past. Field-level validation stays
               inline above, because that points at a specific input. */
            if (!acknowledge(false, 'That did not send', msg, REACH)) say(msg, false);
            return;
          }
          /* Read before the reset, so the acknowledgement can say the name and
             the product back — which is what makes it read as a receipt rather
             than as a generic toast. */
          var who = (data.first_name || '').trim();
          var sel = form.querySelector('[name="product"]');
          var what = sel && sel.selectedIndex > -1 ? sel.options[sel.selectedIndex].text : '';
          form.reset();
          form.classList.remove('tried');
          if (!acknowledge(true,
                'Request received',
                (who ? 'Thank you, ' + who + '. ' : 'Thank you. ')
                  + 'We have your demo request' + (what ? ' for ' + what : '') + '.'
                  + ' An engineer will come back to you within one business day'
                  + (data.email ? ' at ' + data.email : '') + '.',
                REACH)) {
            say('Thank you — we have it. An engineer will come back to you within one business day.', true);
          }
        })
        .catch(function () {
          var off = 'That did not send — you may be offline. Please try again.';
          if (!acknowledge(false, 'That did not send', off, REACH)) say(off, false);
        })
        .then(function () {
          form.classList.remove('sending');
          if (btn) btn.removeAttribute('aria-busy');
        });
    });
  }

  function init() {
    var forms = document.querySelectorAll('form.dform');
    if (!forms.length) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    Array.prototype.forEach.call(forms, enhance);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
