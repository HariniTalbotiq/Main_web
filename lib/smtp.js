/* A MINIMAL SMTP SUBMISSION CLIENT — enough to post one plain-text message.
 *
 * WHY THIS EXISTS RATHER THAN `require('nodemailer')`. This repo carries zero
 * runtime dependencies on purpose; package.json has no `dependencies` key at
 * all, and the README states the rule. Node has no SMTP client built in, so it
 * was either a dependency or this. Submission of a single message over
 * STARTTLS is a small, fully specified subset of RFC 5321, it is exercised by
 * tools/smtp.test.js, and every failure path in api/demo.js already falls back
 * to logging the lead — so a bug here degrades to "written to the log" rather
 * than "silently lost".
 *
 * WHAT IT DOES NOT DO, deliberately: no connection pooling, no attachments, no
 * HTML alternative parts, no DSN, no 8BITMIME negotiation, no OAuth. If any of
 * those are ever needed, that is the moment to take the dependency instead of
 * growing this.
 */

'use strict';

const net = require('net');
const tls = require('tls');

const CRLF = '\r\n';

/* Read until a line that is `NNN ` — a space after the code, not a hyphen,
   which is what terminates a multi-line greeting like:
       250-SIZE 157286400
       250 STARTTLS
   Getting this wrong is the classic SMTP bug: you read the first chunk, see
   250, and send the next command into the middle of the server's reply. */
function expect(sock, codes, timeoutMs) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const done = (fn, arg) => {
      clearTimeout(timer);
      sock.removeListener('data', onData);
      sock.removeListener('error', onErr);
      fn(arg);
    };
    const timer = setTimeout(
      () => done(reject, new Error('SMTP timeout waiting for ' + codes.join('/'))), timeoutMs);
    const onErr = (e) => done(reject, e);
    const onData = (chunk) => {
      buf += chunk.toString('utf8');
      const lines = buf.split(CRLF);
      /* the last element is an incomplete line (or '') */
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) {
          const code = parseInt(lines[i].slice(0, 3), 10);
          if (codes.indexOf(code) === -1) {
            return done(reject, new Error('SMTP ' + lines[i].trim()));
          }
          return done(resolve, buf);
        }
      }
    };
    sock.on('data', onData);
    sock.on('error', onErr);
  });
}

function send(sock, line) { sock.write(line + CRLF); }

/* A header value that is not plain ASCII has to be encoded, or the server is
   entitled to mangle it — and names on this form are Malaysian, so accented
   and non-latin characters are ordinary, not exotic. */
function headerWord(s) {
  return /^[\x20-\x7E]*$/.test(s)
    ? s
    : '=?UTF-8?B?' + Buffer.from(s, 'utf8').toString('base64') + '?=';
}

/* RFC 5321 §4.5.2: a line of the body that begins with '.' gets another '.'
   in front, or it would terminate the DATA block early. Truncating a lead at
   the first line someone started with a full stop is exactly the kind of
   silent data loss this file must not have. */
const stuff = (body) => body.replace(/\r?\n/g, CRLF).replace(/^\./gm, '..');

/**
 * @param {{host:string, port?:number, user:string, pass:string,
 *          from:string, to:string, replyTo?:string,
 *          subject:string, text:string, timeoutMs?:number}} o
 */
async function sendMail(o) {
  const port = Number(o.port) || 587;
  const timeoutMs = Number(o.timeoutMs) || 15000;
  const me = (o.from.split('@')[1] || 'localhost');

  let sock = net.createConnection({ host: o.host, port });
  sock.setTimeout(timeoutMs, () => sock.destroy(new Error('SMTP connect timeout')));
  await new Promise((res, rej) => {
    sock.once('connect', res);
    sock.once('error', rej);
  });

  try {
    await expect(sock, [220], timeoutMs);
    send(sock, 'EHLO ' + me);
    await expect(sock, [250], timeoutMs);

    /* Port 587 submission is plaintext until STARTTLS. The credentials must
       never cross the wire before this upgrade completes. */
    send(sock, 'STARTTLS');
    await expect(sock, [220], timeoutMs);
    const secure = tls.connect({ socket: sock, servername: o.host });
    await new Promise((res, rej) => {
      secure.once('secure', res);
      secure.once('error', rej);
    });
    if (!secure.authorized && secure.authorizationError) {
      throw new Error('SMTP TLS not trusted: ' + secure.authorizationError);
    }
    sock = secure;

    send(sock, 'EHLO ' + me);
    await expect(sock, [250], timeoutMs);

    send(sock, 'AUTH LOGIN');
    await expect(sock, [334], timeoutMs);
    send(sock, Buffer.from(o.user, 'utf8').toString('base64'));
    await expect(sock, [334], timeoutMs);
    send(sock, Buffer.from(o.pass, 'utf8').toString('base64'));
    await expect(sock, [235], timeoutMs);

    send(sock, 'MAIL FROM:<' + o.from + '>');
    await expect(sock, [250], timeoutMs);
    send(sock, 'RCPT TO:<' + o.to + '>');
    await expect(sock, [250, 251], timeoutMs);
    send(sock, 'DATA');
    await expect(sock, [354], timeoutMs);

    const headers = [
      'From: ' + headerWord(o.fromName || 'TalbotIQ website') + ' <' + o.from + '>',
      'To: <' + o.to + '>',
      o.replyTo ? 'Reply-To: <' + o.replyTo + '>' : null,
      'Subject: ' + headerWord(o.subject),
      'Date: ' + new Date().toUTCString(),
      'Message-ID: <' + Date.now() + '.' + Math.random().toString(36).slice(2)
        + '@' + me + '>',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      'Auto-Submitted: auto-generated',
    ].filter(Boolean).join(CRLF);

    sock.write(headers + CRLF + CRLF + stuff(o.text) + CRLF + '.' + CRLF);
    await expect(sock, [250], timeoutMs);

    send(sock, 'QUIT');
  } finally {
    sock.destroy();
  }
}

module.exports = { sendMail, _internals: { headerWord, stuff, expect } };
