// hud.js — hook title, the ride's trip computer (clock + altitude), counters that roll and slam, the "no gravity?" chip,
// word-pop captions, 3D labels and the end card. Deterministic per frame: everything is a function of t.
import { CAPS, EV, SHOTS, DURATION, T, HB, TRIP } from './timeline.js';
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const env = (t, a, b, fi = 0.12, fo = 0.1) => Math.min(clamp((t - a) / fi, 0, 1), clamp((b - t) / fo, 0, 1));
const back = (u) => { const c1 = 1.9, c3 = c1 + 1; u = clamp(u, 0, 1); return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }; // overshoot ease
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const S = Object.fromEntries(SHOTS.map(s => [s.name, s]));
const inS = (t, n) => t >= S[n].t0 && t < S[n].t1;
const land = (t, t1) => (t >= t1 ? Math.exp(-(t - t1) / 0.12) : 0);
let lastCap = -1;

// what the big counter shows at time t
function counterAt(t) {
  const roll = (k) => sm(EV[k][0], EV[k][1], t);
  if (inS(t, 'A_floor')) return { txt: fmt(100 * roll('kmh')) + ' KM/H', lab: '≈ 62 MPH · HIGHWAY SPEED', pop: land(t, EV.kmh[1]), col: '#ffffff' };
  if (inS(t, 'A_everest')) return { txt: fmt(8849 * roll('everest')) + ' M', lab: 'THE HEIGHT OF MOUNT EVEREST', pop: land(t, EV.everest[1]), col: '#ffffff' };
  if (inS(t, 'B_line')) return { txt: fmt(50 + 50 * roll('km100')) + ' KM', lab: 'THE EDGE OF SPACE', pop: land(t, EV.km100[1]) * 1.3, col: '#8fe0ff', big: 1 };
  if (inS(t, 'B_moon')) return { txt: fmt(160 * roll('moon')) + ' DAYS', lab: 'TO THE MOON AT 100 KM/H', pop: land(t, EV.moon[1]), col: '#ffffff' };
  if (inS(t, 'C_reveal')) return { txt: fmt(90 * roll('grav')) + '%', lab: 'OF EARTH’S GRAVITY, UP AT THE STATION', pop: land(t, EV.grav[1]) * 1.3, col: '#ffd45e', big: 1 };
  if (inS(t, 'C_side')) return { txt: fmt(28000 * roll('speed')) + ' KM/H', lab: '≈ 17,500 MPH · SIDEWAYS', pop: land(t, EV.speed[1]), col: '#8fe0ff' };
  if (inS(t, 'C_280')) return { txt: '×' + fmt(1 + 279 * roll('x280')), lab: 'YOUR CAR: 100 KM/H', pop: land(t, EV.x280[1]), col: '#ffd45e', big: 1 };
  if (inS(t, 'C_orbit')) return { txt: fmt(90 * roll('lap')) + ' MIN', lab: 'ONE LAP AROUND THE PLANET', pop: land(t, EV.lap[1]), col: '#ffffff' };
  return null;
}
function tripAt(t) {
  for (const [n, c0, c1, a0, a1] of TRIP) { if (!inS(t, n)) continue;
    const k = n === 'B_line' ? Math.pow(sm(S[n].t0 + 0.1, EV.line, t), 1.6) : sm(S[n].t0 + 0.05, S[n].t1 - 0.2, t);
    const c = Math.round(c0 + (c1 - c0) * k), a = a0 + (a1 - a0) * k;
    const h = Math.floor(c / 3600), m = Math.floor(c / 60) % 60, s = c % 60;
    const clock = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const alt = a < 10 ? a.toFixed(2) : a < 100 ? a.toFixed(1) : fmt(a);
    return { clock, alt: alt + ' KM', pop: n === 'B_line' ? land(t, EV.line) : 0, a: env(t, S[n].t0 + 0.04, S[n].t1, 0.06, 0.04) };
  }
  return null;
}
function capHTML(html) { const out = []; const re = /<b>(.*?)<\/b>|([^\s<]+)/g; let m; while ((m = re.exec(html))) out.push(m[1] !== undefined ? m[1].split(' ').map(w => '<b>' + w + '</b>').join(' ') : m[2]); return out.join(' ').split(' '); }

export function hudAt(t, F = {}) {
  // ---- hook title, on screen from frame 1 ----
  const tEnd = T('A_point'); const title = $('title'); title.style.opacity = 1 - sm(tEnd - 0.2, tEnd - 0.04, t);
  title.style.transform = `scale(${1.08 - 0.08 * back(t / 0.35)})`;
  const hint = $('hint'); hint.style.opacity = env(t, 0.55, tEnd - 0.04, 0.08, 0.12);
  hint.style.transform = `translateX(-50%) scale(${t < 0.55 ? 1.6 : 1 + 0.6 * (1 - back((t - 0.55) / 0.3)) + 0.03 * Math.sin(t * 9)})`;
  // ---- trip computer ----
  const tr = tripAt(t); const te = $('trip');
  if (tr) { $('tc').textContent = tr.clock; $('ta').textContent = tr.alt; te.style.opacity = tr.a; te.style.transform = `translateX(-50%) scale(${1 + 0.14 * clamp(tr.pop, 0, 1)})`; }
  else te.style.opacity = 0;
  // ---- counter ----
  const C = counterAt(t); const ce = $('counter');
  if (C) { const cv = $('cv'); cv.textContent = C.txt; $('cl').textContent = C.lab; cv.style.color = C.col;
    const fs = Math.min(C.big ? 190 : 150, Math.floor(1350 / Math.max(C.txt.length, 1))); cv.style.fontSize = fs + 'px';
    cv.style.transform = `scale(${1 + 0.16 * clamp(C.pop, 0, 1.4)})`; ce.style.opacity = 1; }
  else ce.style.opacity = 0;
  // ---- the myth chip in the tease ----
  const wn = $('warn'); const w0 = T('C_tease', 0.55), w1 = T('C_reveal');
  if (t >= w0 && t < w1) { const uu = (t - w0) / 0.25; wn.style.opacity = env(t, w0, w1 - 0.02, 0.05, 0.05); wn.style.transform = `translateX(-50%) scale(${0.6 + 0.4 * back(uu)}) rotate(${Math.sin(t * 40) * 1.2 * (t > w1 - 0.6 ? 1 : 0.3)}deg)`; }
  else wn.style.opacity = 0;
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
  // ---- small info chip (honest labels for the stylized views) ----
  const info = $('info'); let it = '', ia = 0;
  const seg = (n0, n1, txt) => { if (t >= T(n0) && t < T(n1)) { it = txt; ia = env(t, T(n0) + 0.15, T(n1), 0.1, 0.08); } };
  seg('A_point', 'B_moon', 'WHAT-IF SCENARIO · STYLIZED'); seg('B_moon', 'C_tease', 'EARTH AND MOON TO SCALE');
  seg('C_reveal', 'C_side', 'DIAGRAM · NOT TO SCALE'); seg('C_side', 'C_280', 'STYLIZED · NOT TO SCALE'); seg('C_miss', 'D_end', 'DIAGRAM · NOT TO SCALE');
  info.textContent = it; info.style.opacity = ia;
  // ---- 3D labels ----
  const labs = F.labels || [];
  for (let i = 0; i < 6; i++) { const el = $('lab' + i); const L = labs[i];
    if (!L || !L.txt) { el.style.opacity = 0; continue; }
    el.textContent = L.txt; el.className = 'lab' + (L.small ? ' small' : '') + (L.tiny ? ' tiny' : '');
    const hw = L.txt.length * (L.small ? 11 : 16); el.style.left = clamp(L.x, 70 + hw, Math.min(L.xmax ?? 900, 1000 - hw)) + 'px'; el.style.top = clamp(L.y, L.ymin ?? 480, L.ymax ?? 1060) + 'px'; el.style.opacity = L.a; }
  // ---- end card ----
  const e0 = T('D_end'); const ea = env(t, e0 + 0.35, DURATION + 1, 0.2, 0.2); const end = $('end'); end.style.opacity = ea;
  end.style.transform = `scale(${0.7 + 0.3 * back((t - e0 - 0.35) / 0.3)})`;
  // ---- whole-frame punch: zoom kick on every cut, bigger on reveals ----
  let kick = 0;
  for (const s of SHOTS) { if (s.t0 <= 0) continue; const d = t - s.t0; if (d >= 0 && d < 0.3) kick = Math.max(kick, 0.022 * Math.exp(-d / 0.08)); }
  for (const at of [EV.kmh[1], EV.everest[1], EV.line, EV.moon[1], EV.grav[1], EV.speed[1], EV.x280[1], EV.lap[1]]) { const d = t - at; if (d >= 0 && d < 0.5) kick = Math.max(kick, 0.06 * Math.exp(-d / 0.12)); }
  $('stage').style.transform = `scale(${1 + kick})`;
}
