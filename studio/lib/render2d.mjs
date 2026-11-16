// render2d.mjs — render any studio page (index.html exposing window.renderAt(t) and window.__meta = {DURATION, FPS})
// to an MP4 with headless Chrome + ffmpeg. Optional time range so two processes can split one video.
// usage: node render2d.mjs <page_dir> <out.mp4> [t0] [t1]        stills: node render2d.mjs <page_dir> --stills <out_dir> t1 t2 ...
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('/opt/npm-tools/node_modules/playwright/index.mjs')); }
import http from 'http'; import fs from 'fs'; import path from 'path'; import { spawn } from 'child_process';

const ROOT = path.resolve(process.argv[2]); const STUDIO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  const base = u.startsWith('/studio/') ? STUDIO : ROOT; const p = path.join(base, u.replace(/^\/studio\//, '/'));
  if (!p.startsWith(base)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(b); });
});
const PORT = +(process.env.PORT || 8900 + Math.floor(Math.random() * 90)); await new Promise(r => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('[pageerror]', e.message)); page.on('console', m => { if (m.type() === 'error') console.log('[page]', m.text()); });
await page.goto(`http://localhost:${PORT}/index.html`);
await page.waitForFunction('window.__ready === true || !!window.__err', null, { timeout: 120000 });
const err = await page.evaluate('window.__err'); if (err) { console.log('SETUP ERROR\n' + err); process.exit(1); }
const meta = await page.evaluate('window.__meta');

if (process.argv[3] === '--stills') {
  const dir = process.argv[4]; fs.mkdirSync(dir, { recursive: true });
  for (const t of process.argv.slice(5).map(Number)) { await page.evaluate(`renderAt(${t})`); fs.writeFileSync(path.join(dir, `s_${t.toFixed(2)}.jpg`), await page.screenshot({ type: 'jpeg', quality: 90 })); console.log('still', t); }
} else {
  const out = process.argv[3]; const t0 = +(process.argv[4] ?? 0), t1 = +(process.argv[5] ?? meta.DURATION);
  const f0 = Math.round(t0 * meta.FPS), f1 = Math.round(t1 * meta.FPS); const tmp = out.replace(/\.mp4$/, '.tmp.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(meta.FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(meta.FPS), tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const st = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate(`renderAt(${f / meta.FPS})`);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 60 === 0) console.log(path.basename(out), f - f0, '/', f1 - f0, ((Date.now() - st) / (f - f0 + 1)).toFixed(0) + ' ms/frame');
  }
  ff.stdin.end(); const code = await new Promise(r => ff.on('close', r)); if (code === 0) fs.renameSync(tmp, out); console.log('done', out, code);
}
await browser.close(); server.close();
