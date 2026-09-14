/* =============================================================================
   THE SITE ICON SET — every size the web actually asks for, from one mark
   -----------------------------------------------------------------------------
   The site shipped with no favicon at all: /favicon.ico answered 404, so every
   browser tab showed a generic page glyph and Slack, Teams, Telegram and
   Discord drew a blank square beside every shared link.

   THE MARK, NOT THE LOCKUP. The wordmark is unreadable below about 60px, so an
   icon has to be the chevron alone. It lives at x 0..91, y 0..85 of
   assets/brand/talbotiq-logo-header.png -- measured, not guessed -- and is
   centred on a SQUARE canvas, because stretching a 91x85 source into a square
   slot is the exact bug that started this whole thread of work.

   SAME TOOLING AS tools/build-og.mjs, FOR THE SAME REASON. It drives the Chrome
   already on the machine rather than adding an image library, because zero
   runtime and build dependencies is a stated rule in this repo. Chrome also
   resamples better than a hand-rolled box filter would.

   NOT PART OF THE BUILD. Run it by hand when the mark changes:

       node tools/build-icons.mjs

   WHAT IT CANNOT DO, stated plainly rather than faked:
     - safari-pinned-tab.svg needs a monochrome VECTOR of the mark, and there
       is no vector art for this logo anywhere in the repo. Tracing an
       approximation of a brand mark is worse than omitting it.
     - the 512px icons are a 5.6x upscale of a 91px source. Flat geometry takes
       that better than type would, but it is an upscale. Drop a higher
       resolution mark in as assets/brand/talbotiq-mark-hi.png and this tool
       prefers it automatically.
     - browserconfig.xml / mstile are deliberately absent: they are read only
       by IE11 and Edge Legacy, both end-of-life. Windows is served by
       favicon.ico and by the manifest, which is what Edge and Chrome read.
   ========================================================================== */
import { readFileSync, writeFileSync, mkdtempSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = join(ROOT, 'assets', 'brand');

const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((c) => { try { readFileSync(c); return true; } catch (e) { return false; } });
if (!CHROME) { console.error('No Chrome found. Set CHROME=/path/to/chrome.'); process.exit(1); }

/* Prefer a hi-res mark if one has been supplied; otherwise crop the mark out of
   the header lockup at its measured pixel bounds. */
const HI = join(BRAND, 'talbotiq-mark-hi.png');
const useHi = existsSync(HI);
const src = useHi ? HI : join(BRAND, 'talbotiq-logo-header.png');
const MARK = useHi ? null : { w: 91, h: 85 };
const b64 = 'data:image/png;base64,' + readFileSync(src).toString('base64');
console.log(useHi ? 'source: assets/brand/talbotiq-mark-hi.png (hi-res)'
                  : 'source: assets/brand/talbotiq-logo-header.png, mark cropped at 91x85');

const dir = mkdtempSync(join(tmpdir(), 'icons-'));

/* One icon. `pad` is the fraction of the canvas left clear on each side, `bg`
   is null for transparent or a CSS colour for an opaque tile. */
function icon(size, pad, bg, out) {
  const inner = Math.round(size * (1 - pad * 2));
  /* the mark is 91x85, so it is height-limited in a square box: scale to the
     smaller fit and centre, never stretch */
  const scale = MARK ? Math.min(inner / MARK.w, inner / MARK.h) : 1;
  const mw = MARK ? MARK.w * scale : inner;
  const mh = MARK ? MARK.h * scale : inner;
  const shot = join(dir, out);
  const html = `<!doctype html><meta charset="utf-8"><style>
 *{margin:0;padding:0}
 html,body{width:${size}px;height:${size}px;overflow:hidden;background:${bg || 'transparent'}}
 .box{position:relative;width:${size}px;height:${size}px;display:flex;
      align-items:center;justify-content:center}
 .clip{position:relative;width:${mw}px;height:${mh}px;overflow:hidden}
 .clip img{position:absolute;left:0;top:0;width:${MARK ? (420 * scale) : inner}px;height:auto;
           image-rendering:auto}
</style><div class="box"><div class="clip"><img src="${b64}" alt=""></div></div>`;
  const page = join(dir, out + '.html');
  writeFileSync(page, html);
  const args = ['--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${size},${size}`,
    '--virtual-time-budget=4000', '--screenshot=' + shot];
  if (!bg) args.push('--default-background-color=00000000');
  args.push('file://' + page);
  execFileSync(CHROME, args, { stdio: 'ignore' });
  return shot;
}

if (!existsSync(BRAND)) mkdirSync(BRAND, { recursive: true });

/* Transparent, for tabs and for the manifest. 8% padding keeps the mark off the
   very edge without wasting the tiny sizes. */
const PLAN = [
  { size: 16,  pad: 0.02, bg: null, dest: join(BRAND, 'favicon-16.png') },
  { size: 32,  pad: 0.04, bg: null, dest: join(BRAND, 'favicon-32.png') },
  { size: 48,  pad: 0.06, bg: null, dest: join(BRAND, 'favicon-48.png') },
  { size: 192, pad: 0.08, bg: null, dest: join(BRAND, 'icon-192.png') },
  { size: 512, pad: 0.08, bg: null, dest: join(BRAND, 'icon-512.png') },
  /* iOS composites apple-touch-icon onto BLACK, so a transparent PNG ships as a
     dark tile. Opaque white, and padded 14% because iOS rounds the corners. */
  { size: 180, pad: 0.14, bg: '#ffffff', dest: join(BRAND, 'apple-touch-icon.png') },
  /* Android adaptive icons crop to a circle inscribed in the middle 80%, so a
     maskable icon needs its art inside a 20% safe zone -- and opaque, or the
     launcher fills the corners itself. */
  { size: 512, pad: 0.22, bg: '#ffffff', dest: join(BRAND, 'maskable-512.png') },
];

const made = [];
for (const s of PLAN) {
  const tmp = icon(s.size, s.pad, s.bg, `i-${s.size}-${s.pad}-${s.bg ? 'op' : 'tr'}.png`);
  renameSync(tmp, s.dest);
  made.push(s.dest);
  console.log(`  ${s.size}x${s.size}  pad ${(s.pad * 100).toFixed(0)}%  ${s.bg ? 'opaque' : 'transparent'}  -> ${s.dest.slice(ROOT.length + 1)}`);
}

/* ---- favicon.ico, written by hand ---------------------------------------
   A real multi-image ICO, because /favicon.ico is requested automatically by
   browsers and by several link-preview tools no matter what the page declares,
   and because it is what Windows reads. The container is trivial: a 6-byte
   ICONDIR, one 16-byte ICONDIRENTRY per image, then the PNG bytes verbatim.
   PNG-inside-ICO is supported from Windows Vista on, which is every Windows
   that can run a current browser. Pure Buffer work, no dependency. */
function writeIco(pngPaths, dest) {
  const imgs = pngPaths.map((p) => readFileSync(p));
  const n = imgs.length;
  const dirSize = 6 + n * 16;
  const head = Buffer.alloc(dirSize);
  head.writeUInt16LE(0, 0);      // reserved
  head.writeUInt16LE(1, 2);      // 1 = icon
  head.writeUInt16LE(n, 4);
  let offset = dirSize;
  imgs.forEach((buf, i) => {
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    const o = 6 + i * 16;
    head.writeUInt8(w >= 256 ? 0 : w, o);      // 0 means 256
    head.writeUInt8(h >= 256 ? 0 : h, o + 1);
    head.writeUInt8(0, o + 2);                 // palette count
    head.writeUInt8(0, o + 3);                 // reserved
    head.writeUInt16LE(1, o + 4);              // colour planes
    head.writeUInt16LE(32, o + 6);             // bits per pixel
    head.writeUInt32LE(buf.length, o + 8);
    head.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  writeFileSync(dest, Buffer.concat([head, ...imgs]));
  return offset;
}
const icoBytes = writeIco(
  [join(BRAND, 'favicon-16.png'), join(BRAND, 'favicon-32.png'), join(BRAND, 'favicon-48.png')],
  join(ROOT, 'favicon.ico'));
console.log(`  favicon.ico  16 + 32 + 48  ${icoBytes} bytes  -> favicon.ico`);

/* ---- the manifest -------------------------------------------------------- */
const manifest = {
  name: 'TALBOTIQ',
  short_name: 'TALBOTIQ',
  icons: [
    { src: '/assets/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/assets/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/assets/brand/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  theme_color: '#02A885',
  background_color: '#ffffff',
  display: 'browser',
  start_url: '/',
};
writeFileSync(join(ROOT, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
console.log('  site.webmanifest');
console.log('\nnext: node build.js && node tools/fix-pages.js && npx vercel --prod');
