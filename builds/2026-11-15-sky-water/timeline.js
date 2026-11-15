// timeline.js — shots, captions, counters and event times (shared by scene.js, hud.js and audio.py via timeline.json)
// Fast cut on a 140 BPM grid: most shots are 2 half-bars (1.714 s); the hook, the countdown, the flood build-up
// and the end card are 3 half-bars (2.571 s) with a camera punch on the middle beat.
export const BPM = 140, HB = 60 / BPM * 2; // half-bar = 0.857 s
export const FPS = 30;
const L = [['H_hook', 3, 'C'],
  ['A_cloud', 2, 'K'], ['A_clear', 2, 'K'],
  ['B_globe', 2, 'G'], ['B_count', 3, 'G'],
  ['C_drop', 2, 'G'], ['C_city', 2, 'R'], ['C_ocean', 2, 'O'], ['C_desert', 2, 'D'],
  ['D_total', 2, 'Q'], ['D_cube', 2, 'Q'], ['D_lake', 2, 'Q'],
  ['E_tease', 3, 'S'], ['E_reveal', 2, 'S'], ['E_inch', 2, 'S'],
  ['F_why', 2, 'O'], ['F_refill', 2, 'G'],
  ['F_end', 3, 'C']];
export const SHOTS = []; { let k = 0; for (const [name, n, set] of L) { SHOTS.push({ name, t0: +(k * HB).toFixed(4), t1: +((k + n) * HB).toFixed(4), set }); k += n; } }
export const DURATION = SHOTS[SHOTS.length - 1].t1;
const S = Object.fromEntries(SHOTS.map(s => [s.name, s]));
export const T = (n, d = 0) => +(S[n].t0 + d).toFixed(4);
export const CUTS = SHOTS.slice(1).map(s => s.t0);

// captions: [t0, t1, html, source]. Words pop in one by one; <b> marks the gold keyword.
const USGS = 'SOURCE · USGS', NOAA = 'SOURCE · NOAA';
const c = (n, html, src, d0 = 0.08, d1 = 0) => [T(n, d0), +(SHOTS.find(s => s.name === n).t1 - 0.06 + d1).toFixed(4), html, src];
export const CAPS = [
  c('A_cloud', 'One puffy cloud holds about <b>500,000 kg</b> of water', USGS),
  c('A_clear', 'Even clear air holds water <b>too small to see</b>', USGS),
  c('B_globe', 'Now drop <b>all of it.</b> Every cloud. Every drop.', null),
  c('C_drop', 'All the water in the sky falls <b>at once</b>', null),
  c('D_total', 'That’s about <b>12,900 km³</b> of water', USGS),
  c('D_cube', 'Squeezed into one cube: <b>23 km</b> tall', 'MATH · ∛12,900 KM³ ≈ 23.5 KM'),
  c('D_lake', 'More water than all of <b>Lake Superior</b>', 'SOURCE · USGS · EPA'),
  c('E_tease', 'So how deep would the flood be?', null, 0.12),
  c('E_reveal', 'It would cover the globe just <b>2.5 cm</b> deep', USGS),
  c('E_inch', 'About <b>1 inch.</b> That’s it.', USGS),
  c('F_why', 'Each drop only stays up there about <b>9 days</b>', NOAA),
  c('F_refill', 'So the sky refills about <b>40 times a year</b>', 'MATH · 365 DAYS ÷ 9 DAYS'),
];
// "same instant" chips over the replays
export const CHIPS = [[T('C_city'), T('C_ocean'), 'SAME INSTANT · A CITY'], [T('C_ocean'), T('C_desert'), 'SAME INSTANT · OPEN OCEAN'], [T('C_desert'), T('D_total'), 'SAME INSTANT · A DESERT']];
// countdown slams inside B_count, one per half-bar
export const COUNT = [[T('B_count'), '3'], [T('B_count', HB), '2'], [T('B_count', 2 * HB), '1']];
// events
export const EV = {
  hookHit: 0.0, drop: T('C_drop'), cube: T('D_total'), lake: T('D_lake', 0.3), tease: T('E_tease'), reveal: T('E_reveal'),
  why: T('F_why'), refill: T('F_refill'), end: T('F_end'),
  // big counters: [start, land]
  kg: [T('A_cloud', 0.1), T('A_cloud', 0.85)], km3: [T('D_total', 0.1), T('D_total', 1.0)], cm: [T('E_reveal'), T('E_reveal', 0.25)],
  days: [T('F_why', 0.1), T('F_why', 1.1)], refills: [T('F_refill', 0.1), T('F_refill', 1.0)],
};
