// hud.js — hook title, captions + sources, top counter, info chip, 3D labels, end card. Deterministic per frame.
import { CAPS, EV } from './timeline.js';
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const env = (t, a, b, fi = 0.18, fo = 0.15) => Math.min(clamp((t - a) / fi, 0, 1), clamp((b - t) / fo, 0, 1));
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const ramp = (t, a, b, p = 2.2) => { const u = clamp((t - a) / (b - a), 0, 1); return 1 - Math.pow(1 - u, p); };
let lastCap = -1;

export function hudAt(t, F = {}) {
  // hook title, on screen from frame 1
  const title = $('title'); title.style.opacity = t < 2.4 ? 1 : 1 - sm(2.4, 2.62, t);
  title.style.transform = `scale(${1.05 - 0.05 * sm(0, 0.4, t)})`;
  const g = $('guess'); g.style.opacity = env(t, 0.45, 2.6, 0.2, 0.15); g.style.transform = `translateX(-50%) scale(${1 + 0.04 * Math.sin(t * 7) * (t > 0.5 ? 1 : 0)})`;
  // info chip
  const sc = $('scale'); let txt = '', sa = 0;
  if (t >= 10.2 && t < 12.8) { txt = 'THERMAL VIEW · STYLIZED'; sa = env(t, 10.9, 12.75, 0.2, 0.15); }
  else if (t >= 12.8 && t < 25.8) { txt = 'SIMULATION · ONE SINGLE POUR'; sa = env(t, 12.9, 25.75, 0.2, 0.15); }
  else if (t >= 31.0 && t < 38.8) { txt = 'X-RAY VIEW · STYLIZED'; sa = env(t, 31.1, 38.75, 0.2, 0.15); }
  else if (t >= 41.4 && t < 42.95) { txt = 'THERMAL VIEW · STYLIZED'; sa = env(t, 41.5, 42.95, 0.2, 0.15); }
  else if (t >= 44.0 && t < 46.4) { txt = 'X-RAY VIEW · STYLIZED'; sa = env(t, 44.1, 46.35, 0.2, 0.15); }
  else if (t >= 48.8 && t < 53.8) { txt = 'NOT TO SCALE'; sa = env(t, 49.0, 53.75, 0.2, 0.15); }
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
  if (t >= 2.6 && t < 5.0) { const k = ramp(t, EV.tall0, EV.tall1); cv = `<b>${fmt(726 * k)}</b> ft`; cl = 'FOUNDATION ROCK TO ROADWAY'; ca = env(t, 2.7, 4.95, 0.15, 0.12); pop = t >= EV.tall1 ? Math.exp(-(t - EV.tall1) / 0.15) : 0; }
  else if (t >= 5.0 && t < 7.6) { const k = ramp(t, EV.conc0, EV.conc1); cv = `<b>${fmt(3250000 * k)}</b>`; cl = 'CUBIC YARDS OF CONCRETE'; ca = env(t, 5.1, 7.55, 0.15, 0.12); pop = t >= EV.conc1 ? Math.exp(-(t - EV.conc1) / 0.15) : 0; }
  else if (t >= 18.0 && t < 20.6) { const y = F.years ?? 0; cv = `<b>${fmt(Math.floor(y))}</b>`; cl = 'YEARS TO COOL'; ca = env(t, 18.1, 20.55, 0.15, 0.12); pop = t >= EV.years1 ? Math.exp(-(t - EV.years1) / 0.15) : 0; }
  else if (t >= 23.2 && t < 25.8) { cv = '<b>2058</b>'; cl = 'STILL COOLING UNTIL'; ca = env(t, 23.3, 25.75, 0.15, 0.12); pop = Math.exp(-(t - EV.y2058) / 0.15) * (t >= EV.y2058 ? 1 : 0); }
  else if (t >= 28.4 && t < 31.0) { cv = '<b>5</b> ft'; cl = 'PER POUR'; ca = env(t, 28.5, 30.95, 0.15, 0.12); pop = t >= EV.lift1 ? Math.exp(-(t - EV.lift1) / 0.15) : 0; }
  else if (t >= 33.6 && t < 36.2) { const k = ramp(t, EV.miles0, EV.miles1); cv = `<b>${fmt(582 * k)}</b>`; cl = 'MILES OF STEEL PIPE'; ca = env(t, 33.7, 36.15, 0.15, 0.12); pop = t >= EV.miles1 ? Math.exp(-(t - EV.miles1) / 0.15) : 0; }
  else if (t >= 38.8 && t < 41.4) { const k = ramp(t, EV.ice0, EV.ice1); cv = `<b>${fmt(1000 * k)}</b>`; cl = 'TONS OF ICE A DAY'; ca = env(t, 38.9, 41.35, 0.15, 0.12); pop = t >= EV.ice1 ? Math.exp(-(t - EV.ice1) / 0.15) : 0; }
  else if (t >= 41.4 && t < 44.0) { cv = '<b>1935</b>'; cl = 'COOLING DONE BY MARCH'; ca = env(t, 41.5, 43.95, 0.15, 0.12); pop = Math.exp(-(t - 41.6) / 0.15) * (t >= 41.6 ? 1 : 0); }
  else if (t >= 48.8 && t < 51.4) { const k = ramp(t, EV.loaves0, EV.loaves1); cv = `<b>${fmt(500000 * k)}</b>`; cl = 'LOAVES OF BREAD A DAY'; ca = env(t, 48.9, 51.35, 0.15, 0.12); pop = t >= EV.loaves1 ? Math.exp(-(t - EV.loaves1) / 0.15) : 0; }
  else if (t >= 51.4 && t < 53.8) { const u = clamp((t - EV.yrs0) / (EV.yrs1 - EV.yrs0), 0, 1); const k = u >= 1 ? 1 : (Math.exp(3.2 * u) - 1) / (Math.exp(3.2) - 1);
    cv = `<b>${fmt(u >= 1 ? 547500000 : 500000 + Math.floor(547000000 * k / 9973) * 9973)}</b>`; cl = 'LOAVES IN 3 YEARS'; ca = env(t, 51.5, 53.75, 0.15, 0.12); pop = u >= 1 ? Math.exp(-(t - EV.yrs1) / 0.15) : 0; }
  const ce = $('counter'); ce.style.opacity = ca; if (cv !== null) { $('cv').innerHTML = cv; $('cl').textContent = cl; }
  $('cv').style.transform = `scale(${1 + 0.1 * clamp(pop, 0, 1)})`;
  // 3D labels
  const labs = F.labels || [];
  for (let i = 0; i < 6; i++) { const el = $('lab' + i); const L = labs[i];
    if (!L) { el.style.opacity = 0; continue; }
    el.textContent = L.txt; el.className = 'lab' + (L.small ? ' small' : '');
    el.style.left = clamp(L.x, 210, 740) + 'px'; el.style.top = clamp(L.y, L.ymin ?? 440, 1060) + 'px'; el.style.opacity = L.a; }
  // end card
  const ea = env(t, 54.0, 57.3, 0.3, 0.3); const end = $('end'); end.style.opacity = ea; end.style.transform = `translateY(${(1 - clamp((t - 54.0) / 0.4, 0, 1)) * 26}px)`;
}
