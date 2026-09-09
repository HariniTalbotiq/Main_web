#!/usr/bin/env node
/* The check for the one place in assets/js/chat.js where model output reaches
 * innerHTML.
 *
 *   node tools/chat-render.test.js
 *
 * That file is a browser IIFE with nothing exported, so this lifts the block
 * between its two PURE-RENDER markers and runs it here. Two of the cases below
 * are regressions that actually shipped and were caught in review, and they are
 * the reason this file exists rather than a nicer-looking abstraction:
 *
 *   - a bolded word at the end of a line welded the next sentence onto it,
 *     because the newline was decided by testing whether the output so far
 *     ended in ">";
 *   - "//evil.example/x.html" passed the href allowlist, because the second
 *     slash fell inside the character class.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'assets', 'js', 'chat.js');
const src = fs.readFileSync(SRC, 'utf8');

const START = 'PURE-RENDER BLOCK — start';
const END = 'PURE-RENDER BLOCK — end';
const a = src.indexOf(START);
const b = src.indexOf(END);
if (a < 0 || b < 0 || b < a) {
  console.error('the PURE-RENDER markers are missing or out of order in ' + SRC);
  process.exit(1);
}
/* from the end of the opening marker's comment to the start of the closing one */
const block = src.slice(src.indexOf('*/', a) + 2, src.lastIndexOf('/*', b));

let rich;
try {
  rich = new Function(block + '\n;return rich;')();
} catch (e) {
  console.error('the extracted render block does not run standalone: ' + e.message);
  process.exit(1);
}
if (typeof rich !== 'function') {
  console.error('rich() was not defined by the extracted block');
  process.exit(1);
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

/* ----------------------------------------------------------- the two bugs */

test('a bolded word at the end of a line does not weld the next sentence on', () => {
  const out = rich('It is built for **hiring**\nATS is the product.');
  assert.ok(!/<\/strong>ATS/.test(out), 'the newline was dropped again: ' + out);
  assert.ok(/<\/strong>\nATS is the product\./.test(out), out);
});

test('a line ending in a link keeps its newline too', () => {
  const out = rich('Start at /index.html\nThen read /about.html');
  assert.strictEqual((out.match(/\n/g) || []).length, 1, out);
  assert.ok(/<\/a>\nThen read/.test(out), out);
});

test('a protocol-relative url is not a link', () => {
  for (const bad of ['//evil.example/login.html', '//evil.example', '///x.html']) {
    const out = rich('[Book a demo](' + bad + ')');
    assert.ok(!/<a /.test(out), bad + ' became a link: ' + out);
  }
  const bare = rich('See //evil.example/x.html for details');
  assert.ok(!/<a /.test(bare), 'bare protocol-relative path linked: ' + bare);
});

/* ------------------------------------------------------- escaping and hrefs */

test('markup in model output is escaped, never executed', () => {
  const out = rich('<script>alert(1)</script> and <img src=x onerror="alert(1)">');
  assert.ok(!/<script|<img/.test(out), out);
  assert.ok(out.includes('&lt;script&gt;'), out);
  assert.ok(out.includes('&quot;'), 'quotes must be escaped for attribute safety');
});

test('only same-site absolute paths become links', () => {
  const ok = ['/index.html', '/products/recapr.html', '/contact.html#form', '/'];
  for (const href of ok) {
    assert.ok(rich('[x](' + href + ')').includes('<a href="' + href + '">x</a>'),
      href + ' should be a link');
  }
  const no = ['javascript:alert(1)', 'https://evil.example/x', 'data:text/html,x',
    'mailto:a@b.c', '../secret.html', 'products/recapr.html'];
  for (const href of no) {
    const out = rich('[x](' + href + ')');
    assert.ok(!/<a /.test(out), href + ' must not become a link: ' + out);
  }
});

test('a link label cannot smuggle markup through', () => {
  const out = rich('[<img src=x onerror=alert(1)>](/index.html)');
  assert.ok(!/<img/.test(out), out);
  assert.ok(/<a href="\/index\.html">&lt;img/.test(out), out);
});

/* --------------------------------------------------- paragraphs and lists */

test('bullets become one list, and following prose is not swallowed', () => {
  const out = rich('We do three things:\n- hiring\n- managing\n- the layer\nThat is all.');
  assert.strictEqual((out.match(/<ul>/g) || []).length, 1, out);
  assert.strictEqual((out.match(/<li>/g) || []).length, 3, out);
  assert.ok(out.startsWith('We do three things:'), out);
  assert.ok(out.endsWith('That is all.'), out);
});

test('two separate lists stay separate', () => {
  const out = rich('- a\n- b\nmiddle\n- c');
  assert.strictEqual((out.match(/<ul>/g) || []).length, 2, out);
  assert.ok(out.includes('</ul>middle<ul>'), out);
});

test('blank lines between paragraphs survive, but not before a list', () => {
  const kept = rich('First.\n\nSecond.');
  assert.ok(kept.includes('First.\n\nSecond.'), JSON.stringify(kept));
  const trimmed = rich('Intro:\n\n- one');
  assert.ok(!/\n\s*<ul>/.test(trimmed), 'blank line kept before the list: ' + JSON.stringify(trimmed));
});

test('asterisk bullets work as well as hyphens', () => {
  assert.strictEqual((rich('* a\n* b').match(/<li>/g) || []).length, 2);
});

test('plain replies pass through unchanged apart from escaping', () => {
  assert.strictEqual(rich('We build ten products.'), 'We build ten products.');
  assert.strictEqual(rich(''), '');
  assert.strictEqual(rich('Ampersands & angle < brackets'),
    'Ampersands &amp; angle &lt; brackets');
});

test('the whole thing is idempotent on its own output being re-escaped', () => {
  /* not a real code path, but it proves esc() runs before any rule and so
     cannot be tricked by a reply that already contains entities */
  const out = rich('&lt;script&gt;');
  assert.ok(!/<script/.test(out), out);
  assert.strictEqual(out, '&amp;lt;script&amp;gt;');
});

/* -------------------------------------------------------------------- run */

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n         ' + e.message); }
}
console.log('\n' + (tests.length - failed) + '/' + tests.length + ' passed');
process.exit(failed ? 1 : 0);
