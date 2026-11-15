// render.mjs — drives headless Chrome to render stills or full shots, piping JPEG frames to ffmpeg.
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('/opt/npm-tools/node_modules/playwright/index.mjs')); }
import http from 'http'; import fs from 'fs'; import path from 'path'; import { spawn } from 'child_process';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  const p = path.join(ROOT, u); if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(b); });
});
const PORT = +(process.env.PORT || 8777); await new Promise(r => server.listen(PORT, r));
const chromePath = process.env.CHROME || ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => fs.existsSync(p));
const gpuArgs = process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'];
const browser = await chromium.launch({ ...(chromePath ? { executablePath: chromePath } : {}), headless: !process.env.GPU, args: gpuArgs });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', m => console.log('[page]', m.text())); page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto('http://localhost:' + PORT + '/' + (process.env.Q || '?w=720&h=1280&msaa=4'));
await page.waitForFunction('window.__ready === true || !!window.__err', null, { timeout: 180000 });
const err = await page.evaluate('window.__err');
if (err) { console.log('SETUP ERROR\n' + err); await browser.close(); server.close(); process.exit(1); }
console.log('info', JSON.stringify(await page.evaluate('window.__info')));

const mode = process.argv[2];
if (mode === 'stills') {
  const dir = path.join(ROOT, 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const t of process.argv.slice(3).map(Number)) {
    const t0 = Date.now(); const shot = await page.evaluate(`renderAt(${t})`);
    fs.writeFileSync(path.join(dir, `s_${t.toFixed(2)}.jpg`), await page.screenshot({ type: 'jpeg', quality: 92 }));
    console.log('still', t, shot, Date.now() - t0, 'ms');
  }
} else if (mode === 'shots') {
  const meta = await page.evaluate('window.__meta'); const names = process.argv.slice(3);
  const dir = path.join(ROOT, 'out'); fs.mkdirSync(dir, { recursive: true });
  for (const s of meta.SHOTS) {
    if (names.length && !names.includes(s.name)) continue;
    const n = Math.round((s.t1 - s.t0) * meta.FPS);
    const tmp = path.join(dir, `${s.name}.tmp.mp4`), fin = path.join(dir, `${s.name}.mp4`);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = 0; f < n; f++) {
      const t = s.t0 + f / meta.FPS;
      await page.evaluate(`renderAt(${t})`);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 45 === 0) console.log(s.name, f, '/', n, ((Date.now() - t0) / (f + 1)).toFixed(0) + ' ms/frame');
    }
    ff.stdin.end(); const code = await new Promise(r => ff.on('close', r));
    if (code === 0) fs.renameSync(tmp, fin);
    console.log('done', s.name, 'exit', code, ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  }
}
await browser.close(); server.close();
