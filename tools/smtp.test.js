/* CHECK lib/smtp.js — run it with `node tools/smtp.test.js`.
 *
 * Offline and fast. It exercises the three things in that file that can lose
 * or corrupt a lead, rather than the socket plumbing around them:
 *
 *   expect()     the multi-line response parser. The classic SMTP bug is
 *                reading "250-SIZE ..." as a complete reply and firing the
 *                next command into the middle of the server's greeting.
 *   stuff()      dot-stuffing. A note beginning a line with "." would end the
 *                DATA block early and truncate the enquiry.
 *   headerWord() RFC 2047. Names on this form are Malaysian; a non-ASCII
 *                subject sent raw is mangled or rejected.
 *
 * The TLS handshake and the live conversation are covered by posting to the
 * deployed endpoint, which is the only place they can be tested honestly.
 */

'use strict';

const assert = require('assert');
const { EventEmitter } = require('events');
const { _internals } = require('../lib/smtp.js');
const { expect, stuff, headerWord } = _internals;

let ran = 0;
async function check(name, fn) {
  try { await fn(); ran++; console.log('  ok    ' + name); }
  catch (e) { console.error('  FAIL  ' + name + '\n        ' + e.message); process.exitCode = 1; }
}

/* A socket stand-in: emits whatever chunks the test feeds it. */
function fakeSock(chunks, gapMs) {
  const s = new EventEmitter();
  s.removeListener = EventEmitter.prototype.removeListener.bind(s);
  let i = 0;
  const pump = () => {
    if (i >= chunks.length) return;
    s.emit('data', Buffer.from(chunks[i++]));
    setTimeout(pump, gapMs || 1);
  };
  setTimeout(pump, 1);
  return s;
}

(async function () {
  console.log('lib/smtp.js\n');

  await check('a multi-line 250 is read to its final line', async () => {
    const s = fakeSock([
      '250-PN2PR01CA0010.outlook.office365.com Hello\r\n250-SIZE 157286400\r\n',
      '250-PIPELINING\r\n250 STARTTLS\r\n',
    ]);
    const out = await expect(s, [250], 2000);
    assert.match(out, /STARTTLS/, 'stopped before the last line');
  });

  await check('a reply split mid-line is reassembled', async () => {
    const s = fakeSock(['23', '5 2.7.0 Authenticat', 'ion successful\r\n']);
    await expect(s, [235], 2000);
  });

  await check('an unexpected code rejects with the server text', async () => {
    const s = fakeSock(['535 5.7.139 Authentication unsuccessful\r\n']);
    await assert.rejects(() => expect(s, [235], 2000), /535 5\.7\.139/);
  });

  await check('a 250- continuation is never mistaken for the end', async () => {
    /* If the parser matched on "250" rather than "250 ", this resolves on the
       first line and the next command lands in the middle of the greeting. */
    const s = fakeSock(['250-ONE\r\n', '250-TWO\r\n', '250 THREE\r\n']);
    const out = await expect(s, [250], 2000);
    assert.match(out, /THREE/);
  });

  await check('silence times out rather than hanging the function', async () => {
    const s = fakeSock([]);
    await assert.rejects(() => expect(s, [220], 60), /timeout/i);
  });

  await check('a socket error rejects', async () => {
    const s = new EventEmitter();
    s.removeListener = EventEmitter.prototype.removeListener.bind(s);
    setTimeout(() => s.emit('error', new Error('ECONNRESET')), 5);
    await assert.rejects(() => expect(s, [220], 2000), /ECONNRESET/);
  });

  await check('a line starting with a dot cannot end the message early', () => {
    const body = 'Line one\n.\nLine three\n...and four';
    const out = stuff(body);
    assert.ok(!/\r\n\.\r\n/.test(out), 'a bare dot line survived: ' + JSON.stringify(out));
    assert.match(out, /\r\n\.\.\r\n/);
    assert.match(out, /\r\n\.\.\.\.and four/);
  });

  await check('every newline becomes CRLF', () => {
    assert.strictEqual(stuff('a\nb\r\nc'), 'a\r\nb\r\nc');
  });

  await check('an ascii header is left alone', () => {
    assert.strictEqual(headerWord('Demo request - Farah Ismail'), 'Demo request - Farah Ismail');
  });

  await check('a non-ascii header is encoded, not mangled', () => {
    const out = headerWord('Demo request — Farah Ismail');
    assert.match(out, /^=\?UTF-8\?B\?/);
    assert.strictEqual(
      Buffer.from(out.slice(10, -2), 'base64').toString('utf8'),
      'Demo request — Farah Ismail');
  });

  console.log('\n  ' + ran + ' passed' + (process.exitCode ? ', SOME FAILED' : ', none failed'));
})();
