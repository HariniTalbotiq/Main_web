"""=============================================================================
CHECK-SIGNIN — drive signin.html's sign-in flow against a stubbed provider
-------------------------------------------------------------------------------
    python3 tools/check-signin.py

signin.html is the only page on this site that BRANCHES: not connected,
connected-and-signed-out, connected-and-signed-in, refused, accepted. None of
that is visible in a screenshot, and all of it is the difference between a
login form and a picture of one. So it is driven here.

It builds a throwaway copy of the page with fake keys and a local stand-in for
supabase-js — so nothing leaves this machine and no real account is touched —
serves it, drives it in headless Chrome, and reads the verdict out of the DOM.
Both temporary files are removed on the way out, including after a failure.

It needs Google Chrome and nothing else. Exit status is 0 only if every check
passed, so it is safe to put in front of a deploy.
============================================================================="""
import contextlib
import functools
import http.server
import io
import os
import re
import socket
import subprocess
import sys
import threading

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.environ.get("CHROME") or (
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
PAGE = os.path.join(SITE, ".authcheck.html")
STUB = os.path.join(SITE, ".authstub.js")


STUB_JS = r"""
/* Stand-in for supabase-js. Records every call and answers from a script the
   page under test sets on window.__PLAN. */
window.__CALLS = [];
window.supabase = {
  createClient: function (url, key, opts) {
    window.__CALLS.push(['createClient', url, key, JSON.stringify(opts)]);
    return {
      auth: {
        getSession: function () {
          window.__CALLS.push(['getSession']);
          return Promise.resolve({ data: { session: window.__PLAN.session } });
        },
        signInWithPassword: function (c) {
          window.__CALLS.push(['signInWithPassword', c.email, c.password]);
          return Promise.resolve(window.__PLAN.password.shift());
        },
        signInWithOAuth: function (o) {
          window.__CALLS.push(['signInWithOAuth', o.provider,
                               o.options && o.options.redirectTo]);
          return Promise.resolve({ error: null });
        }
      }
    };
  }
};
"""

TEST_JS = r"""
<script>
window.__PLAN = {
  session: null,
  password: [
    { error: { message: 'Invalid login credentials' } },
    { error: null, data: { user: { email: 'ada@talbotiq.com' } } }
  ]
};
</script>
<script>
(function () {
  var out = [], fails = 0;
  function ok(name, cond, extra) {
    out.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + (extra || '')));
    if (!cond) fails++;
  }
  function $(id) { return document.getElementById(id); }
  function calls() { return window.__CALLS.map(function (c) { return c[0]; }); }
  function msgText() { return $('msg').textContent.trim(); }
  function shown() { return $('msg').className.indexOf('show') > -1; }

  function until(pred, ms) {
    return new Promise(function (res, rej) {
      var t0 = Date.now ? Date.now() : +new Date(), iv = setInterval(function () {
        if (pred()) { clearInterval(iv); res(); }
        else if (((Date.now ? Date.now() : +new Date()) - t0) > ms) { clearInterval(iv); rej(new Error('timeout')); }
      }, 20);
    });
  }
  function tick(n) { return new Promise(function (r) { setTimeout(r, n); }); }

  function finish() {
    document.title = (fails ? 'AUTHCHECK-FAIL' : 'AUTHCHECK-PASS');
    var pre = document.createElement('pre');
    pre.id = 'authcheck';
    pre.textContent = out.join('\n');
    document.body.appendChild(pre);
  }

  until(function () { return !$('submit').disabled; }, 5000).then(function () {
    ok('SDK loaded and client created', calls().indexOf('createClient') > -1);
    ok('session checked before enabling', calls().indexOf('getSession') > -1);
    ok('no "not connected" notice when keys are present',
       $('msg').className.indexOf('msg-note') === -1, $('msg').className);
    ok('google button enabled', !$('gbtn').disabled);

    /* 1 — empty email is refused locally, provider never called */
    $('submit').click();
    return tick(60);
  }).then(function () {
    ok('empty email blocked', shown() && /email address/i.test(msgText()), msgText());
    ok('provider not called for an empty field',
       calls().indexOf('signInWithPassword') === -1, calls().join(','));

    /* 2 — malformed email is refused locally */
    $('email').value = 'not-an-email';
    $('submit').click();
    return tick(60);
  }).then(function () {
    ok('malformed email blocked', calls().indexOf('signInWithPassword') === -1, calls().join(','));

    /* 3 — missing password is refused locally */
    $('email').value = 'ada@talbotiq.com';
    $('submit').click();
    return tick(60);
  }).then(function () {
    ok('empty password blocked', /password/i.test(msgText()), msgText());
    ok('provider still not called', calls().indexOf('signInWithPassword') === -1);

    /* 4 — bad credentials: provider refuses, page reports it verbatim */
    $('password').value = 'wrong-one';
    $('submit').click();
    return until(function () { return /invalid login/i.test(msgText()); }, 3000);
  }).then(function () {
    ok('provider refusal surfaced', /Invalid login credentials/.test(msgText()), msgText());
    ok('password cleared after a refusal', $('password').value === '', $('password').value);
    ok('form usable again', !$('submit').disabled);
    ok('submit label restored', $('submit').textContent.trim() === 'Sign in', $('submit').textContent);

    /* 5 — good credentials: redirect fires */
    $('password').value = 'correct-horse';
    $('submit').click();
    return until(function () { return location.hash === '#authcheck-redirected'; }, 3000);
  }).then(function () {
    ok('redirect on success', location.hash === '#authcheck-redirected');
    var c = window.__CALLS.filter(function (x) { return x[0] === 'signInWithPassword'; });
    ok('credentials passed through once trimmed',
       c.length === 2 && c[1][1] === 'ada@talbotiq.com' && c[1][2] === 'correct-horse',
       JSON.stringify(c));

    /* 6 — reveal toggle */
    ok('password starts masked', $('password').type === 'password');
    $('peye').click();
    ok('reveal shows the password', $('password').type === 'text');
    ok('reveal is announced', $('peye').getAttribute('aria-pressed') === 'true');
    $('peye').click();
    ok('reveal toggles back', $('password').type === 'password' &&
       $('peye').getAttribute('aria-pressed') === 'false');

    /* 7 — Google */
    $('gbtn').click();
    return until(function () {
      return window.__CALLS.some(function (x) { return x[0] === 'signInWithOAuth'; });
    }, 3000);
  }).then(function () {
    var g = window.__CALLS.filter(function (x) { return x[0] === 'signInWithOAuth' })[0];
    ok('google uses the google provider', g[1] === 'google', JSON.stringify(g));
    ok('google returns to this page', /\/\.authcheck\.html$/.test(g[2] || ''), g[2]);

    /* 8 — PKCE, not the implicit flow: no token ever lands in the URL */
    var cc = window.__CALLS.filter(function (x) { return x[0] === 'createClient' })[0];
    ok('pkce flow configured', /"flowType":"pkce"/.test(cc[3] || ''), cc[3]);
    finish();
  }).catch(function (e) {
    ok('ran to completion', false, e && e.message);
    finish();
  });
})();
</script>
"""


# The state the page ships in: no keys. It must say so, keep every control
# disabled, and make no third-party request at all.
UNCONF_JS = r"""
<script>
(function () {
  function $(id) { return document.getElementById(id); }
  var out = [], fails = 0;
  function ok(name, cond, extra) {
    out.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + (extra || '')));
    if (!cond) fails++;
  }
  setTimeout(function () {
    ok('unconfigured: says it is not connected',
       $('msg').className.indexOf('msg-note') > -1 && /not connected/i.test($('msg').textContent),
       $('msg').className + ' / ' + $('msg').textContent.slice(0, 60));
    ok('unconfigured: submit stays disabled', $('submit').disabled);
    ok('unconfigured: email stays disabled', $('email').disabled);
    ok('unconfigured: password stays disabled', $('password').disabled);
    ok('unconfigured: google stays disabled', $('gbtn').disabled);
    ok('unconfigured: no SDK requested',
       !document.querySelector('script[src*="jsdelivr"], script[src*="supabase"]'),
       'a provider script was injected with no keys');
    ok('unconfigured: nothing claims a session',
       $('msg').className.indexOf('msg-ok') === -1);
    document.title = fails ? 'AUTHCHECK-FAIL' : 'AUTHCHECK-PASS';
    var pre = document.createElement('pre');
    pre.id = 'authcheck';
    pre.textContent = out.join('\n');
    document.body.appendChild(pre);
  }, 400);
})();
</script>
"""


def build(configured=True):
    s = io.open(os.path.join(SITE, "signin.html"), encoding="utf-8").read()
    assert "  url: '',\n  anonKey: '',"in s, "AUTH block moved — this check is reading the wrong page"

    if not configured:
        # exactly as shipped, plus the observer
        io.open(PAGE, "w", encoding="utf-8").write(s.replace("</body>", UNCONF_JS + "\n</body>"))
        io.open(STUB, "w", encoding="utf-8").write("/* unused in this pass */")
        return

    # fake keys so the page takes the configured path
    s = s.replace("  url: '',\n  anonKey: '',",
                  "  url: 'https://authcheck.supabase.co',\n  anonKey: 'authcheck-anon-key',")

    # land on a hash instead of navigating away, so the checks can keep running
    s = s.replace("after: 'index.html#products'", "after: '#authcheck-redirected'")
    assert "#authcheck-redirected" in s

    # local stand-in for the CDN build; SRI would (correctly) reject it
    s = re.sub(r"src: 'https://cdn\.jsdelivr\.net/[^']+'", "src: '/.authstub.js'", s)
    s = re.sub(r"integrity: 'sha384-[^']+'", "integrity: ''", s)
    assert "/.authstub.js" in s

    s = s.replace("</body>", TEST_JS + "\n</body>")
    io.open(PAGE, "w", encoding="utf-8").write(s)
    io.open(STUB, "w", encoding="utf-8").write(STUB_JS)


def serve():
    """Serve the site on a port the OS picks, so a busy 8899 cannot break this."""
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    handler = functools.partial(Quiet, directory=SITE)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def run(port):
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                    "--virtual-time-budget=12000", "--run-all-compositor-stages-before-draw",
                    "--dump-dom", "http://127.0.0.1:%d/.authcheck.html" % port],
                   capture_output=True, text=True, timeout=90)
    r = subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                        "--virtual-time-budget=12000", "--dump-dom",
                        "http://127.0.0.1:%d/.authcheck.html" % port],
                       capture_output=True, text=True, timeout=90)
    dom = r.stdout
    m = re.search(r'<pre id="authcheck">(.*?)</pre>', dom, re.S)
    if not m:
        print("NO RESULT — page did not finish. title:",
              (re.search(r"<title>(.*?)</title>", dom, re.S) or ["", "?"])[1])
        return 1
    body = (m.group(1).replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&"))
    print(body)
    fails = body.count("FAIL ")
    print("\n%d checks, %d failed" % (body.count("PASS ") + fails, fails))
    return 1 if fails else 0


if not os.path.exists(CHROME):
    sys.exit("Chrome not found at %s — set CHROME=/path/to/chrome" % CHROME)

httpd = None
code = 0
try:
    httpd, port = serve()
    for label, configured in (("not connected (as shipped)", False), ("connected", True)):
        print("\n== %s ==" % label)
        build(configured)
        code |= run(port)
finally:
    if httpd:
        httpd.shutdown()
    for f in (PAGE, STUB):
        if os.path.exists(f):
            os.unlink(f)
sys.exit(code)
