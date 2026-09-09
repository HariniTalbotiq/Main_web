/* CHECK api/demo.js — run it with `node tools/demo.test.js`.
 *
 * This is the money path: every enquiry the site takes passes through that
 * handler, and a bug in it loses a customer silently. So the handler is called
 * directly with a mock req/res rather than mocked around, and the destination
 * is a stub webhook so nothing leaves the machine.
 *
 * Mirrors tools/chat.test.js in shape: no framework, plain asserts, exits
 * non-zero on the first failure.
 */

'use strict';

const assert = require('assert');
const path = require('path');

const HANDLER = path.join(__dirname, '..', 'api', 'demo.js');

/* Each case gets a fresh module and a fresh env, because the handler keeps a
   rate-limit table in module scope and reads process.env at call time. */
function load() {
  delete require.cache[require.resolve(HANDLER)];
  return require(HANDLER);
}

function mockRes() {
  const res = {
    code: 0, body: null, headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; },
    status(c) { this.code = c; return this; },
    json(o) { this.body = o; return this; },
    send(s) { this.body = s; return this; },
    end() { return this; },
  };
  return res;
}

const jsonReq = (body, extra) => Object.assign({
  method: 'POST',
  headers: { 'content-type': 'application/json', accept: 'application/json',
             'x-forwarded-for': '203.0.113.' + Math.floor(Math.random() * 250) },
  body,
}, extra || {});

const GOOD = {
  first_name: 'Farah', last_name: 'Ismail', company: 'Company Sdn Bhd',
  email: 'farah@company.com.my', phone: '+60 12 345 6789',
  product: 'mimic', notes: 'Hiring 40 people this quarter.',
};

let ran = 0, sent = [];

/* A stub destination. Replacing global fetch is what keeps this test offline
   and lets it assert on exactly what the handler would have delivered. */
const realFetch = global.fetch;
global.fetch = async function (url, opts) {
  sent.push({ url, body: JSON.parse(opts.body) });
  return { ok: true, status: 200 };
};

async function check(name, fn) {
  sent = [];
  process.env.DEMO_WEBHOOK_URL = 'https://example.invalid/hook';
  delete process.env.RESEND_API_KEY;
  delete process.env.DEMO_TO_EMAIL;
  try {
    await fn();
    ran++;
    console.log('  ok    ' + name);
  } catch (err) {
    console.error('  FAIL  ' + name + '\n        ' + err.message);
    process.exitCode = 1;
  }
}

(async function () {
  console.log('api/demo.js\n');

  await check('a complete enquiry is delivered', async () => {
    const res = mockRes();
    await load()(jsonReq(GOOD), res);
    assert.strictEqual(res.code, 200, 'expected 200, got ' + res.code);
    assert.deepStrictEqual(res.body, { ok: true });
    assert.strictEqual(sent.length, 1, 'nothing was delivered');
    assert.match(sent[0].body.text, /Farah Ismail/);
    assert.match(sent[0].body.text, /farah@company\.com\.my/);
  });

  await check('the honeypot is accepted and delivers nothing', async () => {
    const res = mockRes();
    await load()(jsonReq(Object.assign({}, GOOD, { company_url: 'http://spam.example' })), res);
    assert.strictEqual(res.code, 200, 'a bot must not be told it failed');
    assert.strictEqual(sent.length, 0, 'the honeypot hit was delivered anyway');
  });

  await check('a missing required field is rejected', async () => {
    const res = mockRes();
    const body = Object.assign({}, GOOD); delete body.phone;
    await load()(jsonReq(body), res);
    assert.strictEqual(res.code, 400);
    assert.strictEqual(sent.length, 0);
  });

  await check('a malformed email is rejected', async () => {
    const res = mockRes();
    await load()(jsonReq(Object.assign({}, GOOD, { email: 'farah@company' })), res);
    assert.strictEqual(res.code, 400);
    assert.strictEqual(sent.length, 0);
  });

  await check('a form-encoded post works and gets HTML back', async () => {
    const res = mockRes();
    await load()({
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded',
                 'x-forwarded-for': '198.51.100.7' },
      body: new URLSearchParams(GOOD).toString(),
    }, res);
    assert.strictEqual(res.code, 200);
    assert.match(String(res.body), /<!doctype html>/i, 'no-JS path must get a page');
    assert.match(String(res.body), /Thank you/i);
    assert.strictEqual(sent.length, 1);
  });

  await check('GET is refused', async () => {
    const res = mockRes();
    await load()({ method: 'GET', headers: {} }, res);
    assert.strictEqual(res.code, 405);
    assert.strictEqual(res.headers.allow, 'POST');
  });

  await check('a cross-origin post is refused', async () => {
    const res = mockRes();
    await load()(jsonReq(GOOD, {
      headers: { 'content-type': 'application/json', accept: 'application/json',
                 origin: 'https://evil.example', host: 'talbotiq.com',
                 'x-forwarded-for': '198.51.100.9' },
    }), res);
    assert.strictEqual(res.code, 403);
    assert.strictEqual(sent.length, 0);
  });

  await check('a same-origin post is allowed', async () => {
    const res = mockRes();
    await load()(jsonReq(GOOD, {
      headers: { 'content-type': 'application/json', accept: 'application/json',
                 origin: 'https://talbotiq.com', host: 'talbotiq.com',
                 'x-forwarded-for': '198.51.100.11' },
    }), res);
    assert.strictEqual(res.code, 200);
    assert.strictEqual(sent.length, 1);
  });

  await check('the rate limit stops a flood from one address', async () => {
    const h = load();
    const ip = '198.51.100.42';
    let last = 0;
    for (let i = 0; i < 9; i++) {
      const res = mockRes();
      await h(jsonReq(GOOD, {
        headers: { 'content-type': 'application/json', accept: 'application/json',
                   'x-forwarded-for': ip },
      }), res);
      last = res.code;
    }
    assert.strictEqual(last, 429, 'nine posts from one IP should be throttled');
  });

  await check('with no destination set, the lead is logged not lost', async () => {
    delete process.env.DEMO_WEBHOOK_URL;
    const logged = [];
    const realErr = console.error;
    console.error = (m) => logged.push(String(m));
    const res = mockRes();
    await load()(jsonReq(GOOD), res);
    console.error = realErr;
    assert.strictEqual(res.code, 503);
    assert.ok(logged.some((l) => l.includes('farah@company.com.my')),
      'the enquiry must reach the log when it cannot be delivered');
  });

  global.fetch = realFetch;
  console.log('\n  ' + ran + ' passed'
    + (process.exitCode ? ', SOME FAILED' : ', none failed'));
})();
