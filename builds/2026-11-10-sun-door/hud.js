// hud.js — title, scale chip, captions + sources, counters, 3D labels, end card. Deterministic per frame.
import { CAPS, LAPS } from './timeline.js';
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const env = (t, a, b, fi = 0.18, fo = 0.15) => Math.min(clamp((t - a) / fi, 0, 1), clamp((b - t) / fo, 0, 1));
const fmt = (n) => Math.round(n).toLocaleString('en-US');
let lastCap = -1;

export function hudAt(t, F = {}) {
  // hook title, on screen from frame 1
  const title = $('title'); title.style.opacity = t < 2.45 ? 1 : 1 - sm(2.45, 2.7, t);
  title.style.transform = `scale(${1.05 - 0.05 * sm(0, 0.4, t)})`;
  const g = $('guess'); g.style.opacity = env(t, 0.55, 2.68, 0.2, 0.15); g.style.transform = `translateX(-50%) scale(${1 + 0.05 * Math.sin(t * 7) * (t > 0.6 ? 1 : 0)})`;
  // scale chip
  const sc = $('scale'); let sa = Math.max(env(t, 2.8, 24.95, 0.25, 0.2), env(t, 29.7, 39.75, 0.25, 0.2));
  sc.textContent = t < 26 ? 'SCALE · SUN = 2 m DOOR' : 'SAME SCALE · SUN = 2 m DOOR'; sc.style.opacity = sa;
  // captions
  let idx = -1; for (let i = 0; i < CAPS.length; i++) if (t >= CAPS[i][0] && t < CAPS[i][1]) idx = i;
  const cap = $('cap');
  if (idx >= 0) {
    const [a, b, html, src] = CAPS[idx];
    if (idx !== lastCap) { $('capTxt').innerHTML = html; $('src').textContent = src || ''; lastCap = idx; }
    const ai = clamp((t - a) / 0.14, 0, 1), ao = clamp((b - t) / 0.12, 0, 1);
    cap.style.opacity = Math.min(ai, ao); cap.style.transform = `translateY(${(1 - ai) * 22}px) scale(${0.965 + 0.035 * ai})`;
  } else cap.style.opacity = 0;
  // counters
  let cv = null, cl = '', ca = 0, pop = 0;
  if (t >= 8.2 && t < 11.1) { const u = clamp((t - 8.3) / (10.6 - 8.3), 0, 1); const v = 1.3e6 * (Math.exp(3 * u) - 1) / (Math.exp(3) - 1);
    cv = `<b>${fmt(u >= 1 ? 1.3e6 : Math.round(v / 1000) * 1000)}</b>`; cl = 'EARTHS INSIDE THE SUN'; ca = env(t, 8.25, 11.05, 0.15, 0.12); pop = u >= 1 ? Math.exp(-(t - 10.6) / 0.12) : 0; }
  else if (t >= 13.5 && t < 19.0) { const d = Math.min(215, Math.floor(F.dist ?? 0)); cv = `<b>${d}</b> m`; cl = 'FROM THE SUN'; ca = env(t, 13.55, 18.95, 0.15, 0.12); pop = (t > 17.45 && t < 17.75) ? 1 - (t - 17.45) / 0.3 : 0; }
  else if (t >= 22.5 && t < 25.0) { const g2 = sm(23.2, 24.3, t); const km = (0.2155 + (6.465 - 0.2155) * g2); cv = `<b>${km.toFixed(1)}</b> km`; cl = 'SUN → NEPTUNE'; ca = env(t, 22.55, 24.95, 0.15, 0.12); pop = (t > 24.3 && t < 24.6) ? 1 - (t - 24.3) / 0.3 : 0; }
  else if (t >= 27.45 && t < 29.6) { cv = '<b>4.24</b>'; cl = 'LIGHT-YEARS AWAY'; ca = env(t, 27.5, 29.55, 0.15, 0.12); pop = t < 27.75 ? 1 - (t - 27.45) / 0.3 : 0; }
  else if (t >= 29.8 && t < 39.8) { const L = F.laps ?? 0; const km = Math.round(L * 40074 / 100) * 100; cv = `<b>${fmt(km)}</b> km`;
    cl = L >= LAPS - 0.002 ? '1.4 LAPS OF EARTH' : L >= 1 ? 'LAP 2 · AROUND EARTH' : 'LAP 1 · AROUND EARTH'; ca = env(t, 29.85, 39.75, 0.15, 0.15);
    pop = (L >= 1 && L < 1.02) ? 1 : 0; }
  const ce = $('counter'); ce.style.opacity = ca; if (cv !== null) { $('cv').innerHTML = cv; $('cl').textContent = cl; }
  $('cv').style.transform = `scale(${1 + 0.1 * clamp(pop, 0, 1)})`;
  // 3D labels
  const labs = F.labels || [];
  for (let i = 0; i < 3; i++) { const el = $('lab' + i); const L = labs[i];
    if (!L) { el.style.opacity = 0; continue; }
    el.textContent = L.txt; el.className = 'lab' + (L.small ? ' small' : '');
    el.style.left = clamp(L.x, 200, 800) + 'px'; el.style.top = clamp(L.y, 420, 1080) + 'px'; el.style.opacity = L.a; }
  // end card
  const ea = env(t, 43.35, 47.2, 0.3, 0.3); const end = $('end'); end.style.opacity = ea; end.style.transform = `translateY(${(1 - clamp((t - 43.35) / 0.4, 0, 1)) * 26}px)`;
}
