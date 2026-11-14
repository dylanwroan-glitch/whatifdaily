// hud.js — hook title, rank slams, the falling temperature counter, thermometer, word-pop captions, 3D labels, end card.
// Deterministic per frame: everything is a function of t.
import { CAPS, RANKS, EV, SHOTS, DURATION, T } from './timeline.js';
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const env = (t, a, b, fi = 0.12, fo = 0.1) => Math.min(clamp((t - a) / fi, 0, 1), clamp((b - t) / fo, 0, 1));
const back = (u) => { const c1 = 1.9, c3 = c1 + 1; u = clamp(u, 0, 1); return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }; // overshoot ease
const hsh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const MINUS = '−';
let lastCap = -1, lastRank = '';

// the temperature the counter shows at time t (°C) and how it is formatted
function counterAt(t) {
  const tE = T('E_tease'), tR = T('E_rank'), tL = T('E_laser'), tB = T('E_tenb'), tZ = T('E_zero'), tEnd = T('F_end');
  if (t < RANKS[0].at || t >= tEnd) return null;
  if (t >= tE && t < tR) { // #1 tease: the digits scramble below −272
    const f = Math.floor(t * 30); let s = MINUS + '27' + (2 + Math.floor(hsh(f) * 2)) + '.';
    for (let k = 0; k < 3; k++) s += Math.floor(hsh(f * 3.1 + k * 7.7) * 10);
    return { txt: s + ' °C', lab: 'COLDER THAN ANYTHING IN NATURE?', val: -272.5, pop: 0, scr: 1 };
  }
  if (t >= tR && t < tB) { // roll from −272 to −273.15, then hold
    const u = sm(tR, tR + 0.6, t); const v = -272 - 1.15 * u;
    const pop = t >= tR + 0.6 ? Math.exp(-(t - tR - 0.6) / 0.12) : 0;
    return { txt: MINUS + Math.abs(v).toFixed(2) + ' °C', lab: t < tL ? 'COLD ATOM LAB · SPACE STATION' : 'ATOMS COOLING…', val: v, pop };
  }
  if (t >= tB && t < tEnd) { // the decimals type out: −273.1499999999
    const full = '273.1499999999'; const n = 6 + Math.floor(sm(tB + 0.1, tB + 1.3, t) * (full.length - 6) + 1e-6);
    const s = MINUS + full.slice(0, Math.min(full.length, n));
    const done = n >= full.length; const tDone = tB + 1.3;
    return { txt: (done ? '≈ ' : '') + s + ' °C', lab: done ? 'A TEN-BILLIONTH OF A DEGREE ABOVE ABSOLUTE ZERO' : 'ATOMS COOLING…', val: -273.1499999999, pop: done && t < tDone + 0.6 ? Math.exp(-(t - tDone) / 0.12) : 0 };
  }
  // ranks #5..#2: roll from the previous value
  let i = -1; for (let k = 0; k < 4; k++) if (t >= RANKS[k].at) i = k;
  const R = RANKS[i]; const prev = i > 0 ? RANKS[i - 1].c : 0;
  const u = sm(R.at + 0.05, R.at + 0.75, t); const v = prev + (R.c - prev) * u;
  const pop = t >= R.at + 0.75 ? Math.exp(-(t - R.at - 0.75) / 0.12) : 0;
  return { txt: MINUS + Math.abs(v).toFixed(R.dec) + ' °C', lab: R.lab, val: v, pop };
}

function capHTML(html) { // split into words; keep <b> groups as single gold words
  const out = []; const re = /<b>(.*?)<\/b>|([^\s<]+)/g; let m;
  while ((m = re.exec(html))) out.push(m[1] !== undefined ? '<b>' + m[1] + '</b>' : m[2]);
  return out;
}

export function hudAt(t, F = {}) {
  // ---- hook title, on screen from frame 1 ----
  const title = $('title'); const ta = 1 - sm(2.32, 2.55, t);
  title.style.opacity = ta; title.style.transform = `scale(${1.08 - 0.08 * back(t / 0.35)})`;
  const hint = $('hint'); hint.style.opacity = env(t, 0.55, 2.55, 0.1, 0.12); hint.style.transform = `translateX(-50%) scale(${t < 0.55 ? 1.6 : 1 + 0.6 * (1 - back((t - 0.55) / 0.3)) + 0.03 * Math.sin(t * 9)})`;
  // ---- rank slam ----
  let r = null; for (const R of RANKS) if (t >= R.at && t < R.until) r = R;
  const tease = t >= T('E_tease') && t < T('E_rank');
  const rk = $('rank');
  if (r || tease) {
    const at = tease ? T('E_tease') : r.at; const u = (t - at) / 0.28;
    const key = tease ? '#1?' : r.rank;
    if (key !== lastRank) { $('rn').textContent = tease ? '#1' : r.rank; $('rp').textContent = tease ? '???' : r.place; lastRank = key; }
    rk.style.opacity = clamp(u * 3, 0, 1) * (1 - sm((tease ? T('E_rank') : r.until) - 0.08, (tease ? T('E_rank') : r.until), t));
    const big = (r && r.rank === '#1') ? 1.25 : 1.0;
    rk.style.transform = `scale(${(0.6 + 0.4 * back(u)) * big + (tease ? 0.03 * Math.sin(t * 40) : 0)})`;
    $('rp').style.color = (r && r.rank === '#1') ? '#7fe3ff' : '#fff';
  } else rk.style.opacity = 0;
  // ---- counter ----
  const C = counterAt(t); const ce = $('counter');
  if (C) {
    const cv = $('cv'); cv.textContent = C.txt; $('cl').textContent = C.lab;
    const len = C.txt.length; const fs = Math.min(150, Math.floor(1700 / Math.max(len, 1)));
    cv.style.fontSize = fs + 'px'; cv.style.transform = `scale(${1 + 0.14 * clamp(C.pop, 0, 1)})`;
    cv.style.color = C.scr ? '#ff6a6a' : '#9fe8ff';
    ce.style.opacity = Math.min(clamp((t - RANKS[0].at) / 0.1, 0, 1), 1);
    ce.style.top = (r && r.rank === '#1') ? '300px' : '236px';
  } else ce.style.opacity = 0;
  // ---- thermometer: level from +20 °C (top) to absolute zero (bottom) ----
  const th = $('thermo');
  if (C) { const frac = clamp((C.val + 273.15) / 293.15, 0, 1); $('merc').style.height = (frac * 100).toFixed(2) + '%'; th.style.opacity = clamp((t - RANKS[0].at) / 0.2, 0, 1) * 0.95; }
  else th.style.opacity = 0;
  // ---- captions: words pop in one by one ----
  let idx = -1; for (let i = 0; i < CAPS.length; i++) if (t >= CAPS[i][0] && t < CAPS[i][1]) idx = i;
  const cap = $('cap');
  if (idx >= 0) {
    const [a, b, html, src] = CAPS[idx];
    if (idx !== lastCap) { $('capTxt').innerHTML = capHTML(html).map(w => `<span class="w">${w}</span>`).join(' '); $('src').textContent = src || ''; lastCap = idx; }
    const ws = $('capTxt').children; const step = Math.min(0.085, 0.55 / Math.max(ws.length, 1));
    for (let k = 0; k < ws.length; k++) { const u = (t - a - k * step) / 0.13; const s = u <= 0 ? 0 : 0.55 + 0.45 * back(u);
      ws[k].style.opacity = u <= 0 ? 0 : clamp(u * 2.5, 0, 1); ws[k].style.transform = `scale(${s}) translateY(${(1 - clamp(u, 0, 1)) * 18}px)`; }
    cap.style.opacity = clamp((b - t) / 0.08, 0, 1); $('src').style.opacity = clamp((t - a - 0.25) / 0.15, 0, 1) * 0.88;
  } else cap.style.opacity = 0;
  // ---- small info chip (stylized views) ----
  const info = $('info'); let it = '', ia = 0;
  if (t >= T('C_glow') && t < T('C_one')) { it = 'COSMIC MICROWAVE BACKGROUND · STYLIZED'; ia = env(t, T('C_glow') + 0.1, T('C_one'), 0.1, 0.08); }
  else if (t >= T('D_rank') && t < T('E_tease')) { it = 'ARTIST’S IMPRESSION'; ia = env(t, T('D_rank') + 0.3, T('E_tease'), 0.1, 0.08); }
  else if (t >= T('E_laser') && t < T('E_known')) { it = 'INSIDE THE LAB · STYLIZED'; ia = env(t, T('E_laser') + 0.1, T('E_known'), 0.1, 0.08); }
  else if (t >= T('B_rank') && t < T('C_rank')) { it = 'NOT TO SCALE'; ia = env(t, T('B_rank') + 0.3, T('C_rank'), 0.1, 0.08); }
  info.textContent = it; info.style.opacity = ia;
  // ---- 3D labels ----
  const labs = F.labels || [];
  for (let i = 0; i < 3; i++) { const el = $('lab' + i); const L = labs[i];
    if (!L) { el.style.opacity = 0; continue; }
    el.textContent = L.txt; el.className = 'lab' + (L.small ? ' small' : '');
    el.style.left = clamp(L.x, 200, 760) + 'px'; el.style.top = clamp(L.y, L.ymin ?? 520, 1040) + 'px'; el.style.opacity = L.a; }
  // ---- end card ----
  const e0 = T('F_end'); const ea = env(t, e0 + 0.1, DURATION + 1, 0.2, 0.2); const end = $('end'); end.style.opacity = ea;
  end.style.transform = `scale(${0.7 + 0.3 * back((t - e0 - 0.1) / 0.3)})`;
  // ---- whole-frame punch: zoom kick on every cut, bigger on rank reveals ----
  let kick = 0;
  for (const s of SHOTS) { if (s.t0 <= 0) continue; const d = t - s.t0; if (d >= 0 && d < 0.3) kick = Math.max(kick, 0.022 * Math.exp(-d / 0.08)); }
  for (const R of RANKS) { const d = t - R.at; if (d >= 0 && d < 0.5) kick = Math.max(kick, 0.07 * Math.exp(-d / 0.12)); }
  $('stage').style.transform = `scale(${1 + kick})`;
}
