/* THE DEMO / CONTACT ENQUIRY ENDPOINT — server side.
 *
 * A Vercel Node function, the same shape as api/chat.js. The form on
 * demo.html and contact.html posts here; only this decides where a lead goes.
 * No key, webhook URL or inbox address appears in any page, bundle, response
 * body or log line below.
 *
 *   browser  ->  POST /api/demo  ->  your webhook, or your inbox
 *
 * WHERE THE LEAD GOES IS AN ENVIRONMENT VARIABLE, not a code change. The first
 * of these that is configured wins:
 *
 *   DEMO_WEBHOOK_URL   a URL that accepts a JSON POST. Slack and Teams
 *                      incoming webhooks, Zapier, Make, n8n — all of them take
 *                      this shape. Simplest thing that works.
 *   RESEND_API_KEY     + DEMO_TO_EMAIL, and optionally DEMO_FROM_EMAIL
 *                      (defaults to onboarding@resend.dev, which Resend allows
 *                      before you have verified a domain). Sends the lead as
 *                      an email.
 *
 * SETUP — never in a file git can see (.gitignore already covers .env*):
 *   local   echo 'DEMO_WEBHOOK_URL=...' >> .env.local
 *   deploy  vercel env add DEMO_WEBHOOK_URL      (Production and Preview)
 *
 * WITH NEITHER SET the endpoint answers 503 and writes the whole enquiry to
 * the function log. That is deliberate: a lead the site cannot deliver is
 * still a lead, and losing one silently is the single failure here that costs
 * real money. It does mean the log holds a name, an email and a phone number
 * until you configure a destination, so configure one.
 *
 * IT ACCEPTS TWO CONTENT TYPES, and that is a considered relaxation of the
 * rule api/chat.js follows. That endpoint demands JSON so the browser is
 * forced to preflight and a third-party page cannot spend your tokens. Here
 * the no-JavaScript path matters more: a form must still submit when the
 * enhancement script has not run, and a native <form method="post"> sends
 * application/x-www-form-urlencoded whatever you would prefer. So both are
 * taken, and the abuse budget is spent on things that survive without CORS:
 * a honeypot, a per-IP rate limit, required-field validation and a same-origin
 * check on the Origin header when the browser sends one.
 */

'use strict';

/* Same limiter as api/chat.js. Per-instance rather than shared, so it is a
   speed bump on a serverless platform, not a wall — which is the right size
   for a form nobody has a reason to flood except a bot the honeypot catches. */
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const PER_WINDOW = 6;

function overLimit(ip, now) {
  const seen = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  seen.push(now);
  hits.set(ip, seen);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.length || now - v[v.length - 1] >= WINDOW_MS) hits.delete(k);
    }
  }
  return seen.length > PER_WINDOW;
}

/* Control characters out. They are never part of a name or a phone number, and
   they are how a payload gets past a reader's eye in whatever inbox this
   lands in. Length caps match the maxlength the form already sets. */
const clean = (v, max) =>
  String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);

/* Deliberately permissive: something@something.something. Anything stricter
   rejects real addresses, and the cost of a typo reaching the inbox is a
   bounced reply, while the cost of a false reject is a lost customer. */
const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

const FIELDS = {
  first_name: 80, last_name: 80, company: 120, email: 160,
  phone: 40, product: 60, notes: 600, company_url: 200,
};

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    const ctype = String(req.headers['content-type'] || '');
    if (/x-www-form-urlencoded/i.test(ctype)) {
      body = Object.fromEntries(new URLSearchParams(body));
    } else {
      try { body = JSON.parse(body); } catch (e) { body = null; }
    }
  }
  return body && typeof body === 'object' ? body : null;
}

async function deliver(lead) {
  if (process.env.DEMO_WEBHOOK_URL) {
    const r = await fetch(process.env.DEMO_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      /* `text` is what Slack and Teams render; the structured copy rides
         alongside for anything that reads fields instead. */
      body: JSON.stringify({ text: summary(lead), ...lead }),
    });
    if (!r.ok) throw new Error('webhook responded ' + r.status);
    return 'webhook';
  }

  if (process.env.RESEND_API_KEY && process.env.DEMO_TO_EMAIL) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.DEMO_FROM_EMAIL || 'onboarding@resend.dev',
        to: [process.env.DEMO_TO_EMAIL],
        /* so hitting reply in the inbox answers the person, not the robot */
        reply_to: lead.email,
        subject: `Demo request — ${lead.first_name} ${lead.last_name}`
          + (lead.company ? ` (${lead.company})` : ''),
        text: summary(lead),
      }),
    });
    if (!r.ok) throw new Error('resend responded ' + r.status);
    return 'email';
  }

  return null;
}

const summary = (l) => [
  `Name     ${l.first_name} ${l.last_name}`,
  `Email    ${l.email}`,
  `Phone    ${l.phone}`,
  `Company  ${l.company || '—'}`,
  `Product  ${l.product}`,
  `Page     ${l.page || '—'}`,
  '',
  l.notes || '(no notes)',
].join('\n');

/* The no-JavaScript path gets a page, because a redirect to a query string it
   cannot read would leave the reader staring at the form they just sent. */
const thanks = (ok) => `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ok ? 'Thank you' : 'Something went wrong'} — TALBOTIQ</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FBFCFE;
color:#1F2430;font:16px/1.6 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:44ch;padding:40px;text-align:center}h1{font-size:26px;margin:0 0 12px}
a{color:#027A5C;font-weight:600}</style>
<main><h1>${ok ? 'Thank you — we have it.' : 'That did not send.'}</h1>
<p>${ok
  ? 'An engineer will come back to you within one business day.'
  /* No digits printed anywhere on this site, including on the page a reader
     lands on when the form did not work — but this is the ONE place a phone
     number earns its place, so the link dials it. */
  : 'Please email <a href="mailto:hello@talbotiq.com">hello@talbotiq.com</a> or <a href="tel:+60320111320">call the office</a> and we will pick it up from there.'}</p>
<p><a href="/">Back to talbotiq.com</a></p></main>`;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Send a POST request.' });
  }

  const body = parseBody(req);
  /* A native form POST has no Accept: application/json, which is how the two
     paths tell themselves apart without the page having to say so. */
  const wantsJson = /application\/json/i.test(String(req.headers.accept || ''))
    || /application\/json/i.test(String(req.headers['content-type'] || ''));
  const fail = (code, msg) => wantsJson
    ? res.status(code).json({ error: msg })
    : res.status(code).send(thanks(false));

  if (!body) return fail(400, 'Send the form fields.');

  /* Asserted, not enforced — a non-browser client can put anything here. It
     costs nothing and turns away the lazy cross-origin post that a honeypot
     would otherwise have to catch. Absent Origin (a native form POST from the
     same site) is fine and common. */
  const origin = req.headers.origin;
  if (origin) {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
    let sameSite = false;
    try { sameSite = new URL(origin).host === host; } catch (e) { sameSite = false; }
    if (!sameSite) return fail(403, 'Post this form from the site it belongs to.');
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (overLimit(ip, Date.now())) {
    return fail(429, 'That is a lot of enquiries at once — give it a minute.');
  }

  const lead = {};
  for (const [k, max] of Object.entries(FIELDS)) lead[k] = clean(body[k], max);
  lead.page = clean(body.page, 200);

  /* THE HONEYPOT ANSWERS 200. A bot that filled the hidden field is told the
     same thing a person is told, because an error is feedback and feedback is
     what lets someone tune past the check. Nothing is delivered. */
  if (lead.company_url) {
    return wantsJson ? res.status(200).json({ ok: true }) : res.status(200).send(thanks(true));
  }
  delete lead.company_url;

  const missing = ['first_name', 'last_name', 'email', 'phone', 'product'].filter((k) => !lead[k]);
  if (missing.length) return fail(400, 'Please fill in every field marked with an asterisk.');
  if (!looksLikeEmail(lead.email)) return fail(400, 'That email address does not look right.');

  try {
    const via = await deliver(lead);
    if (!via) {
      /* Loud in the log, vague to the visitor — the same split api/chat.js
         makes for a missing key. The lead itself is in the log because the
         alternative is dropping it on the floor. */
      console.error('[demo] no destination configured — set DEMO_WEBHOOK_URL or '
        + 'RESEND_API_KEY + DEMO_TO_EMAIL. Lead follows so it is not lost:\n' + summary(lead));
      return fail(503, 'We could not file that just now. Please email hello@talbotiq.com and we will pick it up.');
    }
    console.log('[demo] enquiry delivered via ' + via);
    return wantsJson ? res.status(200).json({ ok: true }) : res.status(200).send(thanks(true));
  } catch (err) {
    /* Same reasoning: the destination failed, so the log is the only copy. */
    console.error('[demo] delivery failed: ' + err.message + '\nLead follows so it is not lost:\n' + summary(lead));
    return fail(502, 'We could not file that just now. Please email hello@talbotiq.com and we will pick it up.');
  }
};
