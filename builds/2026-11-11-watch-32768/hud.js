// hud.js — hook title, captions + sources, top counter, info chip, 3D labels, end card. Deterministic per frame.
import { CAPS, HALF_T, EV } from './timeline.js';
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const env = (t, a, b, fi = 0.18, fo = 0.15) => Math.min(clamp((t - a) / fi, 0, 1), clamp((b - t) / fo, 0, 1));
const fmt = (n) => Math.round(n).toLocaleString('en-US');
let lastCap = -1;

export function hudAt(t, F = {}) {
  // hook title, on screen from frame 1
  const title = $('title'); title.style.opacity = t < 2.4 ? 1 : 1 - sm(2.4, 2.62, t);
  title.style.transform = `scale(${1.05 - 0.05 * sm(0, 0.4, t)})`;
  const g = $('guess'); g.style.opacity = env(t, 0.45, 2.6, 0.2, 0.15); g.style.transform = `translateX(-50%) scale(${1 + 0.04 * Math.sin(t * 7) * (t > 0.5 ? 1 : 0)})`;
  // info chip
  const sc = $('scale'); let txt = '', sa = 0;
  if (t >= 12.6 && t < 17.8) { txt = 'SLOW MOTION'; sa = env(t, 12.7, 17.75, 0.2, 0.15); }
  else if (t >= 17.8 && t < 28.4) { txt = `HALVINGS · ${F.halvings ?? 0} / 15`; sa = env(t, 17.95, 28.35, 0.2, 0.15); }
  else if (t >= 36.2 && t < 39.0) { txt = 'CESIUM ATOM · STYLIZED'; sa = env(t, 36.3, 38.95, 0.2, 0.15); }
  else if (t >= 44.6 && t < 48.4) { txt = 'NIST-F4 · NIST, 2025'; sa = env(t, 44.7, 48.35, 0.2, 0.15); }
  sc.textContent = txt; sc.style.opacity = sa;
  // captions
  let idx = -1; for (let i = 0; i < CAPS.length; i++) if (t >= CAPS[i][0] && t < CAPS[i][1]) idx = i;
  const cap = $('cap');
  if (idx >= 0) {
    const [a, b, html, src] = CAPS[idx];
    if (idx !== lastCap) { $('capTxt').innerHTML = html; $('src').textContent = src || ''; lastCap = idx; }
    const ai = clamp((t - a) / 0.14, 0, 1), ao = clamp((b - t) / 0.12, 0, 1);
    cap.style.opacity = Math.min(ai, ao); cap.style.transform = `translateY(${(1 - ai) * 22}px) scale(${0.965 + 0.035 * ai})`;
  } else cap.style.opacity = 0;
  // counter
  let cv = null, cl = '', ca = 0, pop = 0;
  if (t >= 15.2 && t < 17.8) { const u = clamp((t - EV.count0) / (EV.count1 - EV.count0), 0, 1); const k = 1 - Math.pow(1 - u, 2.2);
    cv = `<b>${fmt(32768 * k)}</b>`; cl = 'VIBRATIONS EVERY SECOND'; ca = env(t, 15.3, 17.75, 0.15, 0.12); pop = u >= 1 ? Math.exp(-(t - EV.count1) / 0.15) : 0; }
  else if (t >= 17.8 && t < 28.4) { const n = F.halvings ?? 0; cv = `<b>${fmt(32768 / Math.pow(2, n))}</b>`; cl = n >= 15 ? 'PULSE PER SECOND' : 'PULSES PER SECOND';
    ca = env(t, 17.9, 28.35, 0.15, 0.12); const last = n > 0 ? HALF_T[n - 1] : -9; pop = Math.exp(-(t - last) / 0.09) * (n >= 15 ? 1.6 : 1); }
  else if (t >= 28.4 && t < 31.0) { cv = '<b>1</b>'; cl = 'PULSE PER SECOND'; ca = env(t, 28.45, 30.95, 0.1, 0.15); }
  else if (t >= 36.2 && t < 39.0) { const u = clamp((t - EV.atomCount0) / (EV.atomCount1 - EV.atomCount0), 0, 1); const k = u >= 1 ? 1 : (Math.exp(4 * u) - 1) / (Math.exp(4) - 1);
    cv = `<b>${fmt(u >= 1 ? 9192631770 : Math.floor(9192631770 * k / 997) * 997)}</b>`; cl = 'CESIUM VIBRATIONS = 1 SECOND'; ca = env(t, 36.3, 38.95, 0.15, 0.12); pop = u >= 1 ? Math.exp(-(t - EV.atomCount1) / 0.15) : 0; }
  else if (t >= 39.0 && t < 41.6) { cv = '<b>1967</b>'; cl = 'THE CESIUM SECOND, SINCE'; ca = env(t, 39.1, 41.55, 0.15, 0.12); pop = Math.exp(-(t - 39.15) / 0.15); }
  else if (t >= 44.6 && t < 46.5) { const u = clamp((t - EV.years0) / (EV.years1 - EV.years0), 0, 1); const k = u >= 1 ? 1 : (Math.exp(3.5 * u) - 1) / (Math.exp(3.5) - 1);
    cv = `<b>${fmt(u >= 1 ? 1e8 : Math.floor(1e8 * k / 9973) * 9973)}</b>`; cl = 'YEARS OF TICKING'; ca = env(t, 44.7, 46.45, 0.15, 0.12); pop = u >= 1 ? Math.exp(-(t - EV.years1) / 0.15) : 0; }
  else if (t >= 46.5 && t < 48.4) { cv = '<b>&lt; 1</b> s'; cl = 'TOTAL ERROR'; ca = env(t, 46.6, 48.35, 0.15, 0.12); pop = Math.exp(-(t - 46.65) / 0.15); }
  const ce = $('counter'); ce.style.opacity = ca; if (cv !== null) { $('cv').innerHTML = cv; $('cl').textContent = cl; }
  $('cv').style.transform = `scale(${1 + 0.1 * clamp(pop, 0, 1)})`;
  // 3D labels
  const labs = F.labels || [];
  for (let i = 0; i < 6; i++) { const el = $('lab' + i); const L = labs[i];
    if (!L) { el.style.opacity = 0; continue; }
    el.textContent = L.txt; el.className = 'lab' + (L.small ? ' small' : '');
    el.style.left = clamp(L.x, 210, 740) + 'px'; el.style.top = clamp(L.y, L.ymin ?? 440, 1060) + 'px'; el.style.opacity = L.a; }
  // end card
  const ea = env(t, 51.2, 55.3, 0.3, 0.3); const end = $('end'); end.style.opacity = ea; end.style.transform = `translateY(${(1 - clamp((t - 51.2) / 0.4, 0, 1)) * 26}px)`;
}
