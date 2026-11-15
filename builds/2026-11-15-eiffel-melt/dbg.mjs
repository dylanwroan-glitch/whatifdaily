// dbg.mjs — render one frame with an optional debug hook: node dbg.mjs <t> <out.jpg> "<js for window.__dbg body>"
let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('/opt/npm-tools/node_modules/playwright/index.mjs')); }
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
const server = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; const p = path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(b); }); });
const PORT = 8790 + Math.floor(Math.random() * 100); await new Promise(r => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${PORT}/?w=720&h=1280&msaa=4`);
await page.waitForFunction('window.__ready === true || !!window.__err', null, { timeout: 180000 });
const err = await page.evaluate('window.__err'); if (err) { console.log(err); process.exit(1); }
const jobs = process.argv.slice(2); // triples: t out code
for (let i = 0; i < jobs.length; i += 3) { const [t, out, code] = jobs.slice(i, i + 3);
  await page.evaluate(code ? `window.__dbg = (S, batches, B) => { ${code} }` : 'window.__dbg = null');
  await page.evaluate(`renderAt(${t})`); fs.writeFileSync(path.join(ROOT, out), await page.screenshot({ type: 'jpeg', quality: 90 })); console.log('wrote', out); }
await browser.close(); server.close();
