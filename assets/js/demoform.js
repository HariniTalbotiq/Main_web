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
    '.dform.sending .dsubmit{opacity:.6;pointer-events:none}'
  ].join('\n');

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
            say(r.body.error || 'That did not send. Please email hello@talbotiq.com.', false);
            return;
          }
          form.reset();
          form.classList.remove('tried');
          say('Thank you — we have it. An engineer will come back to you within one business day.', true);
        })
        .catch(function () {
          say('That did not send — you may be offline. Please try again, or email hello@talbotiq.com.', false);
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
