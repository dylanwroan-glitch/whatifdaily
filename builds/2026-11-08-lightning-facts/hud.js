// hud.js — title, claim cards, verdict stamps, captions + sources, counters, labels, rain. Deterministic per frame.
import { STAMPS, COUNT1, COUNT2, COUNT_W, W_STRIKE } from './timeline.js';
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const env = (t, a, b, fi = 0.18, fo = 0.15) => Math.min(clamp((t - a) / fi, 0, 1), clamp((b - t) / fo, 0, 1));

export const CLAIMS = [
  [3.65, 1, '“Lightning never strikes the same place twice.”'],
  [12.45, 2, '“Rubber tires protect you in a car.”'],
  [21.25, 3, '“No rain overhead? Then you’re safe.”'],
  [30.05, 4, '“Heat lightning is a harmless kind of lightning.”'],
  [38.85, 5, '“Lightning is hotter than the surface of the Sun.”'],
];
export const CAPS = [
  [6.45, 9.05, 'The Empire State Building: hit about <b>25 times</b> a year.', 'NWS via MPR News · Live Science'],
  [9.2, 12.3, 'Once, it got hit <b>8 times</b> in <b>24 minutes</b>.', 'Live Science · MPR News'],
  [15.25, 17.85, 'Rubber tires give <b>NO</b> protection.', 'National Weather Service'],
  [18.0, 21.1, 'A hard-top car’s <b>steel frame</b> is what gives protection.', 'National Weather Service'],
  [24.05, 26.65, 'Lightning can strike <b>10 miles</b> from any rain.', 'National Weather Service'],
  [26.8, 29.9, 'It often strikes <b>outside</b> heavy rain.', 'National Weather Service'],
  [32.85, 35.45, '“Heat lightning” is just lightning <b>too far away</b> to hear.', 'National Weather Service'],
  [35.6, 38.7, 'Thunder only carries about <b>10 miles</b>.', 'National Weather Service'],
  [41.65, 44.25, 'It can heat the air to <b>50,000°F</b>.', 'National Weather Service'],
  [44.4, 47.5, 'That’s <b>5×</b> hotter than the Sun’s surface.', 'National Weather Service'],
  [47.75, 50.8, 'Bonus: count from flash to thunder.', null],
  [51.0, 54.3, 'Every <b>5 seconds</b> = <b>1 mile</b> away.', 'National Weather Service'],
];
const STAMP_HOLD = 0.55;

let lastCap = -1, lastClaim = -1, lastStamp = -1, rctx = null;
const fmt = (n) => Math.round(n).toLocaleString('en-US');
function h1(x) { const s = Math.sin(x * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }

function drawRain(t, amt, flash) {
  if (!rctx) rctx = $('rain').getContext('2d');
  rctx.clearRect(0, 0, 1080, 1920); if (amt <= 0.001) return;
  const N = Math.floor(520 * amt); rctx.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const a = h1(i * 1.37), b = h1(i * 2.71 + 3.3), c = h1(i * 5.13 + 7.7);
    const speed = 2100 + c * 1500, len = 38 + c * 70, slant = 0.16;
    const y = ((b * 2300 + t * speed) % 2300) - 180; const x = ((a * 1240 + y * slant) % 1240) - 80;
    const al = (0.07 + 0.17 * c) * (1 + flash * 2.2) * amt;
    rctx.strokeStyle = `rgba(200,214,240,${Math.min(0.7, al).toFixed(3)})`; rctx.lineWidth = 1.1 + c * 1.7;
    rctx.beginPath(); rctx.moveTo(x, y); rctx.lineTo(x + len * slant, y + len); rctx.stroke();
  }
}

export function hudAt(t, F = {}) {
  drawRain(t, F.rain || 0, F.flash || 0);
  // hook title: on screen from frame 1
  const ta = t < 3.25 ? 1 : 1 - sm(3.25, 3.55, t); const title = $('title');
  title.style.opacity = ta; title.style.transform = `scale(${1.04 - 0.04 * sm(0, 0.35, t)})`;
  const g = $('guess'); g.style.opacity = env(t, 0.9, 3.5, 0.25, 0.2); g.style.transform = `translateX(-50%) scale(${1 + 0.06 * Math.sin(t * 7) * (t > 0.9 ? 1 : 0)})`;
  // progress dots
  $('dots').style.opacity = env(t, 3.6, 44.3, 0.3, 0.25);
  const dots = document.querySelectorAll('.dot');
  dots.forEach((d, i) => {
    const [ts, verdict] = STAMPS[i]; const claimT = CLAIMS[i][0];
    d.classList.toggle('cur', t >= claimT && t < ts + 0.2);
    const done = t >= ts; d.classList.toggle('myth', done && verdict === 'MYTH'); d.classList.toggle('true', done && verdict === 'TRUE');
    d.textContent = done ? (verdict === 'MYTH' ? '✗' : '✓') : String(i + 1);
  });
  // claim card (ends just after its stamp lands)
  let ci = -1; for (let i = 0; i < CLAIMS.length; i++) if (t >= CLAIMS[i][0] && t < STAMPS[i][0] + STAMP_HOLD) ci = i;
  const cl = $('claim');
  if (ci >= 0) {
    if (ci !== lastClaim) { $('cn').textContent = `#${CLAIMS[ci][1]} · MYTH OR FACT?`; $('ct').innerHTML = CLAIMS[ci][2]; lastClaim = ci; }
    const a = CLAIMS[ci][0], b = STAMPS[ci][0] + STAMP_HOLD; const ai = clamp((t - a) / 0.16, 0, 1);
    const dim = t >= STAMPS[ci][0] ? 0.45 : 1;
    cl.style.opacity = Math.min(ai, clamp((b - t) / 0.12, 0, 1)) * dim; cl.style.transform = `translateY(${(1 - ai) * 26}px)`;
  } else cl.style.opacity = 0;
  // verdict stamp
  let si = -1; for (let i = 0; i < STAMPS.length; i++) if (t >= STAMPS[i][0] && t < STAMPS[i][0] + STAMP_HOLD + 0.12) si = i;
  const st = $('stamp');
  if (si >= 0) {
    const [ts, v] = STAMPS[si]; if (si !== lastStamp) { st.textContent = v; st.className = v === 'MYTH' ? 'myth' : 'true'; lastStamp = si; }
    const u = t - ts; const sc = u < 0.1 ? 1.9 - 0.9 * (u / 0.1) : 1 + 0.04 * Math.exp(-(u - 0.1) / 0.06);
    st.style.opacity = Math.min(1, u / 0.04) * clamp((ts + STAMP_HOLD + 0.12 - t) / 0.12, 0, 1);
    st.style.transform = `translate(-50%,-50%) rotate(-9deg) scale(${sc})`;
  } else st.style.opacity = 0;
  // fact captions
  let idx = -1; for (let i = 0; i < CAPS.length; i++) if (t >= CAPS[i][0] && t < CAPS[i][1]) idx = i;
  const cap = $('cap');
  if (idx >= 0) {
    const [a, b, html, src] = CAPS[idx];
    if (idx !== lastCap) { $('capTxt').innerHTML = html; $('src').textContent = src ? 'SOURCE · ' + src.toUpperCase() : ''; lastCap = idx; }
    const ai = clamp((t - a) / 0.16, 0, 1), ao = clamp((b - t) / 0.14, 0, 1);
    cap.style.opacity = Math.min(ai, ao); cap.style.transform = `translateY(${(1 - ai) * 22}px) scale(${0.965 + 0.035 * ai})`;
  } else cap.style.opacity = 0;
  // counters
  let cv = null, cls = '', ca = 0;
  if (t >= 5.9 && t < 9.1) { const n = COUNT1.filter(x => t >= x).length; cv = `<b>${n}</b>`; cls = n >= 25 ? 'STRIKES IN 1 YEAR · ON AVERAGE' : 'STRIKES · 1-YEAR TIME-LAPSE'; ca = env(t, 5.9, 9.1, 0.1, 0.12); }
  else if (t >= 9.1 && t < 12.4) { const n = COUNT2.filter(x => t >= x).length; const m = Math.min(24, Math.floor(24 * clamp((t - 9.18) / (12.0 - 9.18), 0, 1)));
    cv = `<b>${n}</b>`; cls = `STRIKES · MINUTE ${m} OF 24`; ca = env(t, 9.1, 12.4, 0.1, 0.12); }
  else if (t >= 41.6 && t < 44.3) { const v = 50000 * sm(41.75, 43.3, t); cv = `<b>${fmt(Math.round(v / 100) * 100)}</b>°F`; cls = 'AIR IN THE LIGHTNING CHANNEL'; ca = env(t, 41.62, 44.3, 0.12, 0.12); }
  else if (t >= W_STRIKE.t && t < 50.9) { const n = COUNT_W.filter(x => t >= x).length; cv = n ? `<b>${n}</b>` : '0'; cls = n >= 5 ? 'SECONDS · THUNDER!' : 'SECONDS · SHOWN AT 2× SPEED'; ca = env(t, W_STRIKE.t + 0.1, 50.9, 0.12, 0.12); }
  else if (t >= 50.9 && t < 54.4) { cv = '<b>5</b> s'; cls = '= ABOUT 1 MILE'; ca = env(t, 50.9, 54.35, 0.15, 0.12); }
  const ce = $('counter'); ce.style.opacity = ca; if (cv !== null) { $('cv').innerHTML = cv; $('cl').textContent = cls; }
  // counter pop on each new strike
  let pop = 0; for (const x of [...COUNT1, ...COUNT2, ...COUNT_W]) if (t >= x && t < x + 0.12) pop = Math.max(pop, 1 - (t - x) / 0.12);
  $('cv').style.transform = `scale(${1 + 0.12 * pop})`;
  // mode chip
  let mode = null, ma = 0;
  if (t >= 14.7 && t < 21.2) { mode = 'SLOW MOTION'; ma = env(t, 14.85, 21.15, 0.2, 0.15); }
  else if (t >= 38.8 && t < 41.1) { mode = 'SLOW MOTION'; ma = env(t, 38.85, 41.05, 0.2, 0.12); }
  else if (t >= 32.3 && t < 35.5) { mode = 'NO THUNDER · NO SOUND'; ma = env(t, 32.9, 35.45, 0.2, 0.15); }
  const me = $('mode'); me.style.opacity = ma; if (mode) me.textContent = mode;
  // comparison bars (sun vs lightning)
  const ba = env(t, 44.5, 47.5, 0.25, 0.2); $('bars').style.opacity = ba;
  document.querySelector('#b1 .bf').style.width = (20 * sm(44.6, 45.2, t)) + '%';
  document.querySelector('#b2 .bf').style.width = (100 * sm(45.0, 46.0, t)) + '%';
  // 3D labels
  const labs = F.labels || [];
  for (let i = 0; i < 3; i++) { const el = $('lab' + i); const L = labs[i];
    if (!L) { el.style.opacity = 0; continue; }
    el.textContent = L.txt; el.className = 'lab' + (L.small ? ' small' : '');
    el.style.left = clamp(L.x, 200, 780) + 'px'; el.style.top = clamp(L.y, 440, 1060) + 'px'; el.style.opacity = L.a; }
  // end card
  const ea = env(t, 54.6, 58.0, 0.3, 0.3); const end = $('end'); end.style.opacity = ea; end.style.transform = `translateY(${(1 - clamp((t - 54.6) / 0.4, 0, 1)) * 26}px)`;
}
