// hud.js — captions, sources, clock, gauge, chips. Deterministic per frame.
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const CAPS = [
  [6.9, 9.9, 'Copper carries the power in almost <b>everything</b>.', null],
  [10.1, 13.3, 'About <b>¾ of all copper</b> ends up in electrical uses.', 'USGS'],
  [16.85, 19.9, '<b>0.00 s:</b> every copper wire on Earth is gone.', null],
  [20.1, 22.6, 'The power grid goes down with it.', null],
  [22.8, 25.35, 'Each car just lost about <b>1.5 km</b> of copper wire.', 'USGS'],
  [25.9, 29.2, 'Lady Liberty’s skin is copper, just <b>3/32 of an inch</b> thick.', 'National Park Service'],
  [29.4, 32.2, 'That’s about as thick as <b>two pennies</b>.', 'National Park Service'],
  [32.4, 36.0, 'Left standing: the skeleton <b>Gustave Eiffel</b> designed.', 'National Park Service'],
  [36.2, 40.35, 'Her flame is copper under <b>24k gold leaf</b>. Only the gold stays.', 'National Park Service'],
  [40.9, 43.8, 'Every penny since 1982 is <b>97.5% zinc</b>. It turns gray.', 'U.S. Mint, via Live Science'],
  [43.95, 47.35, 'Older pennies were <b>95% copper</b>. Those just crumble.', 'U.S. Mint, via Live Science'],
  [49.15, 51.6, '<b>5.00 s:</b> copper is back.', null],
  [51.8, 54.85, 'The lights aren’t.', null],
  [55.3, 58.4, 'A dead grid has to restart <b>piece by piece</b>.', null],
  [58.6, 61.4, 'In 2003, New York needed <b>29 hours</b> to get its power back.', 'CBS News / Con Edison'],
];
const CHIPS = [[25.6, 30.0, 'SAME INSTANT · LIBERTY ISLAND'], [40.6, 44.6, 'SAME INSTANT · YOUR SPARE CHANGE']];
const COUNT = [[13.8, 14.62, '3'], [14.8, 15.62, '2'], [15.8, 16.48, '1']];

function env(t, a, b, fi = 0.18, fo = 0.15) { return Math.min(clamp((t - a) / fi, 0, 1), clamp((b - t) / fo, 0, 1)); }
let lastCap = -1;
function fmtClock(sec) {
  if (sec < 60) return 'T+' + sec.toFixed(2) + ' s';
  if (sec < 3600) return 'T+' + Math.floor(sec / 60) + ' min';
  return 'T+' + Math.floor(sec / 3600) + ' h';
}
export function hudAt(t) {
  // title
  const ta = env(t, 0.35, 5.9, 0.5, 0.45); const title = $('title');
  title.style.opacity = ta; title.style.transform = `translateY(${(1 - clamp((t - 0.35) / 0.6, 0, 1)) * 24}px)`;
  // location chip
  $('loc').style.opacity = env(t, 0.7, 16.5, 0.4, 0.12);
  // gauge
  let g = 1; if (t >= 16.5 && t < 25.5) g = 0; else if (t >= 26.3 && t < 40.5) g = 0; else if (t >= 41.2 && t < 49.0) g = 0; else if (t >= 47.5 && t < 49.0) g = 0;
  let drop = 0; for (const tt of [16.5, 26.3, 41.2]) if (t >= tt && t < tt + 0.3) drop = 1 - (t - tt) / 0.3;
  let rise = 0; if (t >= 49.0 && t < 49.35) rise = (t - 49.0) / 0.35;
  let gv = g ? (rise ? rise : 1) : drop; if (t >= 25.5 && t < 26.3) gv = 1; if (t >= 40.5 && t < 41.2) gv = 1;
  $('gauge').style.opacity = env(t, 1.0, 64.0, 0.4, 0.3) * (t > 61.5 ? 1 - sm(61.5, 61.9, t) : 1);
  $('gv').textContent = Math.round(gv * 100) + '%'; $('gb').style.transform = `scaleX(${gv})`;
  $('gauge').classList.toggle('zero', gv < 0.01);
  // clock
  let ct = null, cl = '';
  if (t >= 16.5 && t < 25.5) { ct = fmtClock((t - 16.5) / 20); cl = 'SLOW MOTION · 20×'; }
  else if (t >= 25.5 && t < 40.5) { ct = fmtClock(Math.max(0, t - 26.3) / 20); cl = 'SLOW MOTION · 20×'; }
  else if (t >= 40.5 && t < 47.5) { ct = fmtClock(Math.max(0, t - 41.2) / 20); cl = 'SLOW MOTION · 20×'; }
  else if (t >= 47.5 && t < 55.0) { ct = fmtClock(t < 49 ? 4.85 + (t - 47.5) / 10 : 5.0); cl = t < 49 ? 'SLOW MOTION · 10×' : 'REAL TIME'; }
  else if (t >= 55.0 && t < 61.5) { const u = sm(55.3, 61.2, t); const sec = 5 * Math.pow((29 * 3600) / 5, u); ct = fmtClock(sec); cl = 'TIME-LAPSE'; }
  const ca = ct ? env(t, t < 25.5 ? 16.5 : (t < 40.5 ? 25.5 : (t < 47.5 ? 40.5 : (t < 55 ? 47.5 : 55.0))), t < 25.5 ? 25.5 : (t < 40.5 ? 40.5 : (t < 47.5 ? 47.5 : (t < 55 ? 55.0 : 61.5))), 0.12, 0.12) : 0;
  $('clock').style.opacity = t >= 55.0 && t < 61.5 ? env(t, 55.0, 61.5, 0.2, 0.3) : ca;
  if (ct) { $('ct').textContent = ct; $('cl').textContent = cl; }
  // chip
  let chip = null, chipA = 0; for (const [a, b, s] of CHIPS) if (t >= a && t < b) { chip = s; chipA = env(t, a, b, 0.25, 0.3); }
  $('tag').style.opacity = chipA; if (chip) $('tag').textContent = chip;
  // countdown
  let cn = null, cA = 0, cS = 1; for (const [a, b, s] of COUNT) if (t >= a && t < b) { cn = s; const u = (t - a) / (b - a); cA = Math.min(1, u / 0.1) * (1 - sm(0.75, 1, u)); cS = 1.25 - 0.25 * Math.min(1, u / 0.2); }
  const cel = $('count'); cel.style.opacity = cA; if (cn) cel.textContent = cn; cel.style.transform = `translate(-50%,-50%) scale(${cS})`;
  // captions
  let idx = -1; for (let i = 0; i < CAPS.length; i++) if (t >= CAPS[i][0] && t < CAPS[i][1]) idx = i;
  const cap = $('cap');
  if (idx >= 0) {
    const [a, b, html, src] = CAPS[idx];
    if (idx !== lastCap) { $('capTxt').innerHTML = html; $('src').textContent = src ? 'SOURCE · ' + src.toUpperCase() : ''; lastCap = idx; }
    const ai = clamp((t - a) / 0.18, 0, 1), ao = clamp((b - t) / 0.15, 0, 1);
    cap.style.opacity = Math.min(ai, ao); cap.style.transform = `translateY(${(1 - ai) * 22}px) scale(${0.965 + 0.035 * ai})`;
  } else cap.style.opacity = 0;
  // end card
  const ea = env(t, 61.6, 64.5, 0.35, 0.3); const end = $('end'); end.style.opacity = ea; end.style.transform = `translateY(${(1 - clamp((t - 61.6) / 0.5, 0, 1)) * 26}px)`;
}
