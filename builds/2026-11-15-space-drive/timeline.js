// timeline.js — shots, captions, counters and event times (shared by scene.js, hud.js and audio.py via timeline.json)
// Fast cut on a 140 BPM grid: most shots are 2 half-bars (1.714 s); the hook, the Kármán line, the tease and the end card
// are 3 half-bars (2.571 s) with a camera punch on the middle beat.
export const BPM = 140, HB = 60 / BPM * 2; // half-bar = 0.857 s
export const FPS = 30;
const L = [['H_hook', 3, 'R'],
  ['A_point', 2, 'R'], ['A_floor', 2, 'R'], ['A_clouds', 2, 'K'], ['A_everest', 2, 'E'],
  ['B_dark', 2, 'S'], ['B_line', 3, 'S'], ['B_iss', 2, 'I'], ['B_moon', 2, 'M'],
  ['C_tease', 3, 'I'], ['C_reveal', 2, 'G'], ['C_fall', 2, 'G'], ['C_side', 2, 'V'], ['C_280', 2, 'R'],
  ['C_miss', 2, 'G'], ['C_orbit', 2, 'G'],
  ['D_end', 3, 'R']];
export const SHOTS = []; { let k = 0; for (const [name, n, set] of L) { SHOTS.push({ name, t0: +(k * HB).toFixed(4), t1: +((k + n) * HB).toFixed(4), set }); k += n; } }
export const DURATION = SHOTS[SHOTS.length - 1].t1;
const S = Object.fromEntries(SHOTS.map(s => [s.name, s]));
export const T = (n, d = 0) => +(S[n].t0 + d).toFixed(4);
export const CUTS = SHOTS.slice(1).map(s => s.t0);

// captions: [t0, t1, html, source]. Words pop in one by one; <b> marks the gold keyword.
const NASA = 'SOURCE · NASA';
const c = (n, html, src, d0 = 0.08, n1 = null) => [T(n, d0), +((n1 ? S[n1] : S[n]).t1 - 0.06).toFixed(4), html, src];
export const CAPS = [
  c('A_point', 'Point your car <b>straight up</b>', null),
  c('A_floor', 'Drive at highway speed: <b>100 km/h</b>', 'SCENARIO · 100 KM/H ≈ 62 MPH'),
  c('A_clouds', 'After <b>1 minute,</b> you’re up in the clouds', 'MATH · 1 MIN AT 100 KM/H = 1.7 KM'),
  c('A_everest', 'Just over <b>5 minutes:</b> higher than Everest', 'SOURCE · AP · EVEREST = 8,848.86 M'),
  c('B_dark', '<b>30 minutes</b> in, the sky turns black', 'MATH · 30 MIN AT 100 KM/H = 50 KM'),
  c('B_line', '<b>1 hour:</b> 100 km up. Welcome to <b>space.</b>', 'SOURCE · FAI (THE KÁRMÁN LINE)'),
  c('B_iss', 'The space station? <b>3–4 hours</b> up the road', 'MATH · NASA: 200–250 MILES UP'),
  c('B_moon', 'The Moon? <b>160 days</b> of nonstop driving', 'MATH · NASA: 384,400 KM ÷ 100 KM/H'),
  c('C_tease', 'So why do astronauts <b>float?</b>', null, 0.12),
  c('C_reveal', 'Gravity up there is still about <b>90%</b>', NASA),
  c('C_fall', 'They’re not floating. They’re <b>falling.</b>', NASA),
  c('C_side', 'But sideways, at about <b>28,000 km/h</b>', 'SOURCE · NASA (17,500 MPH)'),
  c('C_280', 'That’s <b>280×</b> faster than your car', 'MATH · 28,000 ÷ 100'),
  c('C_miss', 'So fast they keep <b>missing</b> the ground', NASA),
  c('C_orbit', 'All the way around Earth every <b>90 minutes</b>', NASA),
];
// events
export const EV = {
  hookHit: 0.0, ramp: T('A_point', 0.2), line: T('B_line', 1.5), tease: T('C_tease'), reveal: T('C_reveal'),
  // big counters: [start, land]
  kmh: [T('A_floor', 0.1), T('A_floor', 0.9)], everest: [T('A_everest', 0.1), T('A_everest', 0.95)],
  km100: [T('B_line', 0.15), T('B_line', 1.5)], moon: [T('B_moon', 0.15), T('B_moon', 1.05)],
  grav: [T('C_reveal', 0.05), T('C_reveal', 0.7)], speed: [T('C_side', 0.1), T('C_side', 1.0)],
  x280: [T('C_280', 0.1), T('C_280', 0.75)], lap: [T('C_orbit', 0.1), T('C_orbit', 1.25)],
};
// trip computer: [shot, clock start (s), clock end (s), altitude start (km), altitude end (km)]; the ride's own clock at 100 km/h
export const TRIP = [
  ['A_floor', 0, 7, 0.0, 0.19], ['A_clouds', 52, 60, 1.44, 1.67], ['A_everest', 305, 319, 8.47, 8.85],
  ['B_dark', 1780, 1800, 49.4, 50.0], ['B_line', 1800, 3600, 50.0, 100.0], ['B_iss', 13800, 14400, 383, 400],
];
