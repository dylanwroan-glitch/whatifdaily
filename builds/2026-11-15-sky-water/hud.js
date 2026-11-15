// hud.js — hook title, counters that roll and slam, the 3-2-1, "same instant" chips, word-pop captions, 3D labels,
// the cube's height bar, a rain layer and the end card. Deterministic per frame: everything is a function of t.
import { CAPS, CHIPS, COUNT, EV, SHOTS, DURATION, T, HB } from './timeline.js';
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const env = (t, a, b, fi = 0.12, fo = 0.1) => Math.min(clamp((t - a) / fi, 0, 1), clamp((b - t) / fo, 0, 1));
const back = (u) => { const c1 = 1.9, c3 = c1 + 1; u = clamp(u, 0, 1); return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }; // overshoot ease
const hsh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const fmt = (n) => Math.round(n).toLocaleString('en-US');
let lastCap = -1, rctx = null;

function drawRain(t, amt) {
  if (!rctx) rctx = $('rain').getContext('2d');
  rctx.clearRect(0, 0, 1080, 1920); if (amt <= 0.001) return;
  const N = Math.floor(760 * amt); rctx.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const a = hsh(i * 1.37), b = hsh(i * 2.71 + 3.3), c = hsh(i * 5.13 + 7.7);
    const speed = 2300 + c * 1600, len = 40 + c * 80, slant = 0.13;
    const y = ((b * 2300 + t * speed) % 2300) - 180; const x = ((a * 1240 + y * slant) % 1240) - 80;
    const al = (0.06 + 0.16 * c) * amt;
    rctx.strokeStyle = `rgba(205,218,240,${Math.min(0.6, al).toFixed(3)})`; rctx.lineWidth = 1.1 + c * 1.8;
    rctx.beginPath(); rctx.moveTo(x, y); rctx.lineTo(x + len * slant, y + len); rctx.stroke();
  }
}

// what the big counter shows at time t
function counterAt(t) {
  const inS = (n) => t >= T(n) && t < SHOTS.find(s => s.name === n).t1;
  const land = (t1) => (t >= t1 ? Math.exp(-(t - t1) / 0.12) : 0);
  if (inS('A_cloud')) { const [a, b] = EV.kg; const v = 500000 * sm(a, b, t);
    return { txt: fmt(v) + ' KG', lab: 'ONE 1 KM³ CLOUD · ABOUT 1.1 MILLION LB', pop: land(b), col: '#ffffff' }; }
  if (inS('D_total') || inS('D_cube')) { const [a, b] = EV.km3; const v = 12900 * sm(a, b, t);
    return { txt: fmt(v) + ' KM³', lab: 'ALL THE WATER IN THE SKY', pop: land(b), col: '#8fe0ff' }; }
  if (inS('E_tease')) { const f = Math.floor(t * 24); return { txt: `${Math.floor(hsh(f) * 9)}.${Math.floor(hsh(f * 3.1) * 10)} CM?`, lab: 'HOW DEEP?', pop: 0, col: '#ff7a6a' }; }
  if (inS('E_reveal') || inS('E_inch')) { const b = EV.cm[1]; return { txt: '2.5 CM', lab: '≈ 1 INCH · OVER THE WHOLE GLOBE', pop: land(b) * 1.4, col: '#ffd45e', big: 1 }; }
  if (inS('F_why')) { const [a, b] = EV.days; const n = 1 + Math.floor(8 * sm(a, b, t) + 1e-6); return { txt: 'DAY ' + n, lab: 'A DROP’S AVERAGE TIME UP THERE', pop: land(b), col: '#ffffff' }; }
  if (inS('F_refill')) { const [a, b] = EV.refills; const n = Math.max(1, Math.round(40 * sm(a, b, t))); return { txt: '≈ ' + n + '×', lab: 'SKY REFILLS EVERY YEAR', pop: land(b), col: '#8fe0ff' }; }
  return null;
}
function capHTML(html) { const out = []; const re = /<b>(.*?)<\/b>|([^\s<]+)/g; let m; while ((m = re.exec(html))) out.push(m[1] !== undefined ? '<b>' + m[1] + '</b>' : m[2]); return out; }

export function hudAt(t, F = {}) {
  drawRain(t, F.rain || 0);
  // ---- hook title, on screen from frame 1 ----
  const tEnd = T('A_cloud'); const title = $('title'); title.style.opacity = 1 - sm(tEnd - 0.2, tEnd - 0.04, t);
  title.style.transform = `scale(${1.08 - 0.08 * back(t / 0.35)})`;
  const hint = $('hint'); hint.style.opacity = env(t, 0.5, tEnd - 0.04, 0.08, 0.12);
  hint.style.transform = `translateX(-50%) scale(${t < 0.5 ? 1.6 : 1 + 0.6 * (1 - back((t - 0.5) / 0.3)) + 0.03 * Math.sin(t * 9)})`;
  // ---- counter ----
  const C = counterAt(t); const ce = $('counter');
  if (C) { const cv = $('cv'); cv.textContent = C.txt; $('cl').textContent = C.lab; cv.style.color = C.col;
    const fs = Math.min(C.big ? 190 : 150, Math.floor(1750 / Math.max(C.txt.length, 1))); cv.style.fontSize = fs + 'px';
    cv.style.transform = `scale(${1 + 0.16 * clamp(C.pop, 0, 1.4)})`; ce.style.opacity = 1; }
  else ce.style.opacity = 0;
  // ---- 3-2-1 ----
  const cnt = $('count'); let ci = -1; for (let i = 0; i < COUNT.length; i++) if (t >= COUNT[i][0] && t < COUNT[i][0] + HB) ci = i;
  if (ci >= 0) { const u = (t - COUNT[ci][0]) / 0.22; cnt.textContent = COUNT[ci][1]; cnt.style.opacity = clamp(u * 3, 0, 1) * (1 - sm(COUNT[ci][0] + HB - 0.12, COUNT[ci][0] + HB - 0.02, t));
    cnt.style.transform = `scale(${0.55 + 0.45 * back(u)})`; } else cnt.style.opacity = 0;
  // ---- "same instant" chip ----
  const chip = $('chip'); let ch = null; for (const c of CHIPS) if (t >= c[0] && t < c[1]) ch = c;
  if (ch) { chip.textContent = ch[2]; const u = (t - ch[0]) / 0.25; chip.style.opacity = env(t, ch[0] + 0.02, ch[1], 0.06, 0.06); chip.style.transform = `translateX(-50%) scale(${0.7 + 0.3 * back(u)})`; }
  else chip.style.opacity = 0;
  // ---- captions: words pop in one by one ----
  let idx = -1; for (let i = 0; i < CAPS.length; i++) if (t >= CAPS[i][0] && t < CAPS[i][1]) idx = i;
  const cap = $('cap');
  if (idx >= 0) {
    const [a, b, html, src] = CAPS[idx];
    if (idx !== lastCap) { $('capTxt').innerHTML = capHTML(html).map(w => `<span class="w">${w}</span>`).join(' '); $('src').textContent = src || ''; lastCap = idx; }
    const ws = $('capTxt').children; const step = Math.min(0.085, 0.55 / Math.max(ws.length, 1));
    for (let k = 0; k < ws.length; k++) { const uu = (t - a - k * step) / 0.13; const s = uu <= 0 ? 0 : 0.55 + 0.45 * back(uu);
      ws[k].style.opacity = uu <= 0 ? 0 : clamp(uu * 2.5, 0, 1); ws[k].style.transform = `scale(${s}) translateY(${(1 - clamp(uu, 0, 1)) * 18}px)`; }
    cap.style.opacity = clamp((b - t) / 0.08, 0, 1); $('src').style.opacity = clamp((t - a - 0.25) / 0.15, 0, 1) * 0.88;
  } else cap.style.opacity = 0;
  // ---- small info chip (honest labels for stylized views) ----
  const info = $('info'); let it = '', ia = 0;
  const seg = (n0, n1, txt) => { if (t >= T(n0) && t < T(n1)) { it = txt; ia = env(t, T(n0) + 0.15, T(n1), 0.1, 0.08); } };
  seg('A_clear', 'B_globe', 'WATER VAPOR · STYLIZED'); seg('C_drop', 'C_city', 'WHAT-IF SCENARIO'); seg('D_cube', 'E_tease', 'CUBES TO SCALE · MATH FROM USGS / EPA VOLUMES');
  seg('F_why', 'F_refill', 'TIME-LAPSE · STYLIZED');
  info.textContent = it; info.style.opacity = ia;
  // ---- 3D labels ----
  const labs = F.labels || [];
  for (let i = 0; i < 6; i++) { const el = $('lab' + i); const L = labs[i];
    if (!L) { el.style.opacity = 0; continue; }
    el.textContent = L.txt; el.className = 'lab' + (L.small ? ' small' : '') + (L.tiny ? ' tiny' : '');
    el.style.left = clamp(L.x, 150, L.xmax ?? 900) + 'px'; el.style.top = clamp(L.y, L.ymin ?? 480, L.ymax ?? 1060) + 'px'; el.style.opacity = L.a; }
  // ---- the cube's height bar ----
  const ms = $('meas'), mt = $('measT'); const m = F.meas;
  if (m && m.a > 0) { const y0 = clamp(Math.min(m.y0, m.y1), 0, 1920), y1 = clamp(Math.max(m.y0, m.y1), 0, 1920); const grow = sm(0, 1, m.a);
    const yy0 = y1 - (y1 - y0) * grow; ms.style.left = m.x + 'px'; ms.style.top = yy0 + 'px'; ms.style.height = (y1 - yy0) + 'px'; ms.style.opacity = 1;
    mt.textContent = m.txt; mt.style.left = (m.x - 26) + 'px'; mt.style.top = ((yy0 + y1) / 2) + 'px'; mt.style.opacity = grow; }
  else { ms.style.opacity = 0; mt.style.opacity = 0; }
  // ---- end card ----
  const e0 = T('F_end'); const ea = env(t, e0 + 0.1, DURATION + 1, 0.2, 0.2); const end = $('end'); end.style.opacity = ea;
  end.style.transform = `scale(${0.7 + 0.3 * back((t - e0 - 0.1) / 0.3)})`;
  // ---- whole-frame punch: zoom kick on every cut, bigger on reveals ----
  let kick = 0;
  for (const s of SHOTS) { if (s.t0 <= 0) continue; const d = t - s.t0; if (d >= 0 && d < 0.3) kick = Math.max(kick, 0.022 * Math.exp(-d / 0.08)); }
  for (const at of [EV.kg[1], EV.km3[1], EV.cm[1], EV.drop, ...COUNT.map(c => c[0]), EV.refills[1]]) { const d = t - at; if (d >= 0 && d < 0.5) kick = Math.max(kick, 0.06 * Math.exp(-d / 0.12)); }
  $('stage').style.transform = `scale(${1 + kick})`;
}
