// hud.js — hook title, the simulation gauge (iron temperature + tower height, then the puddle's depth), counters that roll
// and slam, word-pop captions, 3D labels, a measuring bracket and the end card. Deterministic per frame: a function of t.
import { CAPS, EV, SHOTS, DURATION, T, HB, GAUGE, meltFront } from './timeline.js';
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ez = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const env = (t, a, b, fi = 0.12, fo = 0.1) => Math.min(clamp((t - a) / fi, 0, 1), clamp((b - t) / fo, 0, 1));
const back = (u) => { const c1 = 1.9, c3 = c1 + 1; u = clamp(u, 0, 1); return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const S = Object.fromEntries(SHOTS.map(s => [s.name, s]));
const inS = (t, n) => t >= S[n].t0 && t < S[n].t1;
const land = (t, t1) => (t >= t1 ? Math.exp(-(t - t1) / 0.12) : 0);
const CUBE = Math.cbrt(7.3e6 / 7874), SHEET = 7.3e6 / 7874 / (125 * 125);
let lastCap = -1;

function counterAt(t) {
  const roll = (k) => sm(EV[k][0], EV[k][1], t);
  if (inS(t, 'A_tall')) return { txt: fmt(330 * roll('tall')) + ' M', lab: '1,083 FT · WITH ITS ANTENNA', pop: land(t, EV.tall[1]), col: '#ffffff' };
  if (inS(t, 'A_iron')) return { txt: fmt(7300 * roll('iron')) + ' T', lab: 'OF IRON · METRIC TONNES', pop: land(t, EV.iron[1]), col: '#ffd45e' };
  if (inS(t, 'A_rivets')) return { txt: fmt(2500000 * roll('rivets')), lab: 'RIVETS', pop: land(t, EV.rivets[1]), col: '#ffffff' };
  if (inS(t, 'B_heat')) return { txt: fmt(20 + 1518 * roll('temp')) + ' °C', lab: 'IRON MELTS · 2,800 °F', pop: land(t, EV.temp[1]) * 1.2, col: '#ff9b42', big: 1 };
  if (inS(t, 'C_size')) return { txt: (9.8 * roll('cube')).toFixed(1) + ' M', lab: '≈ 32 FT ON EACH SIDE', pop: land(t, EV.cube[1]) * 1.3, col: '#ffd45e', big: 1 };
  if (inS(t, 'D_reveal')) return { txt: fmt(6 * roll('deep')) + ' CM', lab: '≈ 2.3 INCHES · NOT EVEN ANKLE-DEEP', pop: land(t, EV.deep[1]) * 1.4, col: '#ffd45e', big: 1 };
  return null;
}
function gaugeAt(t) {
  for (const [n, c0, c1, h0, h1] of GAUGE) { if (!inS(t, n)) continue;
    const k = n === 'B_heat' ? sm(EV.temp[0], EV.temp[1], t) : 0;
    const temp = Math.round(c0 + (c1 - c0) * k); const h = n === 'B_heat' ? 330 : clamp(meltFront(t), 0, 330);
    return { k1: 'IRON', v1: fmt(temp) + ' °C', k2: 'HEIGHT', v2: fmt(h) + ' M', a: env(t, S[n].t0 + 0.04, S[n].t1, 0.06, 0.04), pop: n === 'B_heat' ? land(t, EV.temp[1]) : 0 };
  }
  if (inS(t, 'D_spread')) { const s = ez(sm(EV.spread0, EV.spread1, t)); const h = Math.exp(Math.log(CUBE) + (Math.log(SHEET) - Math.log(CUBE)) * s); const w = Math.sqrt(CUBE * CUBE * CUBE / h);
    return { k1: 'DEPTH', v1: h >= 1 ? h.toFixed(2) + ' M' : Math.round(h * 100) + ' CM', k2: 'WIDTH', v2: (w < 100 ? w.toFixed(1) : fmt(w)) + ' M', a: env(t, S.D_spread.t0 + 0.1, S.D_spread.t1, 0.06, 0.04), pop: 0 }; }
  if (inS(t, 'D_tease')) return { k1: 'DEPTH', v1: Math.floor(t * 8) % 2 ? '?? CM' : '?? CM', k2: 'WIDTH', v2: '125 M', a: env(t, S.D_tease.t0, S.D_tease.t1, 0.04, 0.04), pop: 0, blink: Math.floor(t * 6) % 2 };
  return null;
}
function capHTML(html) { const out = []; const re = /<b>(.*?)<\/b>|([^\s<]+)/g; let m; while ((m = re.exec(html))) out.push(m[1] !== undefined ? m[1].split(' ').map(w => '<b>' + w + '</b>').join(' ') : m[2]); return out.join(' ').split(' '); }

export function hudAt(t, F = {}) {
  // ---- hook title, on screen from frame 1 ----
  const tEnd = T('A_tall'); const title = $('title'); title.style.opacity = 1 - sm(tEnd - 0.2, tEnd - 0.04, t);
  title.style.transform = `scale(${1.08 - 0.08 * back(t / 0.35)})`;
  const hint = $('hint'); hint.style.opacity = env(t, 0.55, tEnd - 0.04, 0.08, 0.12);
  hint.style.transform = `translateX(-50%) scale(${t < 0.55 ? 1.6 : 1 + 0.6 * (1 - back((t - 0.55) / 0.3)) + 0.03 * Math.sin(t * 9)})`;
  // ---- the simulation gauge ----
  const g = gaugeAt(t); const te = $('trip');
  if (g) { $('k1').textContent = g.k1; $('tc').textContent = g.v1; $('k2').textContent = g.k2; $('ta').textContent = g.v2; te.style.opacity = g.a;
    te.style.transform = `translateX(-50%) scale(${1 + 0.14 * clamp(g.pop, 0, 1)})`; $('tc').style.color = g.blink ? '#ffd45e' : '#fff'; }
  else te.style.opacity = 0;
  // ---- counter ----
  const C = counterAt(t); const ce = $('counter');
  if (C) { const cv = $('cv'); cv.textContent = C.txt; $('cl').textContent = C.lab; cv.style.color = C.col;
    const fs = Math.min(C.big ? 190 : 150, Math.floor(1350 / Math.max(C.txt.length, 1))); cv.style.fontSize = fs + 'px';
    cv.style.transform = `scale(${1 + 0.16 * clamp(C.pop, 0, 1.4)})`; ce.style.opacity = 1; }
  else ce.style.opacity = 0;
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
  // ---- small info chip (honest labels) ----
  const info = $('info'); let it = '', ia = 0;
  const seg = (n0, n1, txt) => { if (t >= T(n0) && t < T(n1)) { it = txt; ia = env(t, T(n0) + 0.15, T(n1), 0.1, 0.08); } };
  seg('B_heat', 'C_size', 'SIMULATION · STYLIZED · SPED UP'); seg('C_size', 'D_wide', 'THE REAL AMOUNT OF IRON · TO SCALE'); seg('D_wide', 'F_end', 'DIAGRAM');
  info.textContent = it; info.style.opacity = ia;
  // ---- 3D labels ----
  const labs = F.labels || [];
  for (let i = 0; i < 6; i++) { const el = $('lab' + i); const L = labs[i];
    if (!L || !L.txt) { el.style.opacity = 0; continue; }
    el.textContent = L.txt; el.className = 'lab' + (L.small ? ' small' : '');
    const hw = L.txt.length * (L.small ? 11 : 16); el.style.left = clamp(L.x, 70 + hw, Math.min(L.xmax ?? 900, 1000 - hw)) + 'px'; el.style.top = clamp(L.y, L.ymin ?? 480, L.ymax ?? 1060) + 'px'; el.style.opacity = L.a; }
  // ---- measuring bracket ----
  const ms = F.meas; const me = $('meas'), mt = $('measT');
  if (ms) { const y0 = Math.min(ms.y0, ms.y1), y1 = Math.max(ms.y0, ms.y1); me.style.left = ms.x + 'px'; me.style.top = y0 + 'px'; me.style.height = (y1 - y0) + 'px'; me.style.opacity = ms.a;
    mt.textContent = ms.txt; mt.style.left = (ms.x - 26) + 'px'; mt.style.top = ((y0 + y1) / 2) + 'px'; mt.style.opacity = ms.a; }
  else { me.style.opacity = 0; mt.style.opacity = 0; }
  // ---- end card ----
  const e0 = T('F_end'); const ea = env(t, e0 + 0.35, DURATION + 1, 0.2, 0.2); const end = $('end'); end.style.opacity = ea;
  end.style.transform = `scale(${0.7 + 0.3 * back((t - e0 - 0.35) / 0.3)})`;
  // ---- whole-frame punch: zoom kick on every cut, bigger on reveals ----
  let kick = 0;
  for (const s of SHOTS) { if (s.t0 <= 0) continue; const d = t - s.t0; if (d >= 0 && d < 0.3) kick = Math.max(kick, 0.022 * Math.exp(-d / 0.08)); }
  for (const at of [EV.tall[1], EV.iron[1], EV.rivets[1], EV.temp[1], EV.cube[1], EV.deep[1], EV.reveal]) { const d = t - at; if (d >= 0 && d < 0.5) kick = Math.max(kick, 0.06 * Math.exp(-d / 0.12)); }
  $('stage').style.transform = `scale(${1 + kick})`;
}
