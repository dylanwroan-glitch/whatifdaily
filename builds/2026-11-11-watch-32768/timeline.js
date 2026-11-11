// timeline.js — shots, captions, counters and event times (shared by scene.js, hud.js and audio.py via timeline.json)
export const FPS = 30, DURATION = 55.0;
export const SHOTS = [
  { name: 'H_hook', t0: 0.0, t1: 2.6, set: 'W' },
  { name: 'A_flip', t0: 2.6, t1: 5.0, set: 'W' },
  { name: 'A_explode', t0: 5.0, t1: 7.6, set: 'W' },
  { name: 'B_can', t0: 7.6, t1: 10.0, set: 'W' },
  { name: 'B_open', t0: 10.0, t1: 12.6, set: 'W' },
  { name: 'B_zap', t0: 12.6, t1: 15.2, set: 'W' },
  { name: 'B_count', t0: 15.2, t1: 17.8, set: 'W' },
  { name: 'C_why', t0: 17.8, t1: 20.2, set: 'C' },
  { name: 'C_half1', t0: 20.2, t1: 23.0, set: 'C' },
  { name: 'C_half2', t0: 23.0, t1: 25.8, set: 'C' },
  { name: 'C_half3', t0: 25.8, t1: 28.4, set: 'C' },
  { name: 'D_tick', t0: 28.4, t1: 31.0, set: 'W' },
  { name: 'D_gears', t0: 31.0, t1: 33.6, set: 'W' },
  { name: 'E_twist', t0: 33.6, t1: 36.2, set: 'A' },
  { name: 'E_cesium', t0: 36.2, t1: 39.0, set: 'A' },
  { name: 'E_since', t0: 39.0, t1: 41.6, set: 'A' },
  { name: 'E_fountain', t0: 41.6, t1: 44.6, set: 'A' },
  { name: 'P_dino1', t0: 44.6, t1: 46.5, set: 'P' },
  { name: 'P_dino2', t0: 46.5, t1: 48.4, set: 'P' },
  { name: 'F_back', t0: 48.4, t1: 51.0, set: 'W' },
  { name: 'F_end', t0: 51.0, t1: 55.0, set: 'W' },
];
// [t0, t1, html, source]
export const CAPS = [
  [2.75, 4.95, 'Pop the back off a <b>quartz</b> watch…', null],
  [5.15, 7.55, 'A battery. A coil. Tiny gears. And…', null],
  [7.75, 9.95, '…this tiny can: the watch’s <b>heartbeat</b>.', null],
  [10.15, 12.55, 'Inside: a <b>quartz</b> tuning fork.', 'SOURCE · LIVE SCIENCE'],
  [12.75, 15.15, 'Run electricity through it and it <b>vibrates</b>.', 'SOURCE · LIVE SCIENCE'],
  [15.35, 17.75, '<b>32,768</b> times every second.', 'SOURCE · NIST'],
  [17.95, 20.15, 'So why such a <b>weird</b> number?', null],
  [20.35, 22.95, 'The chip splits it in <b>half</b>…', 'MATH · 32,768 = 2¹⁵'],
  [23.15, 25.75, '…and again, and again, and again…', 'MATH · 32,768 = 2¹⁵'],
  [26.5, 28.35, '<b>15</b> halvings later: exactly <b>1</b>.', 'MATH · 32,768 = 2¹⁵'],
  [28.55, 30.95, '<b>1</b> pulse per second. That’s your <b>tick</b>.', 'SOURCE · NIST'],
  [31.15, 33.55, 'Every tick = <b>32,768</b> vibrations, counted.', 'SOURCE · NIST'],
  [33.75, 36.15, 'But quartz doesn’t decide how long a <b>second</b> is.', null],
  [36.35, 38.95, '<b>9,192,631,770</b> cesium vibrations = 1 second.', 'SOURCE · NIST'],
  [39.15, 41.55, 'The official definition since <b>1967</b>.', 'SOURCE · NIST'],
  [41.75, 44.55, 'NIST’s <b>NIST-F4</b> clock: a cesium fountain.', 'SOURCE · NIST (2025)'],
  [44.75, 46.45, 'Started <b>100 million</b> years ago…', 'SOURCE · NIST'],
  [46.65, 48.3, '…it’d be off by less than <b>1 second</b> today.', 'SOURCE · NIST'],
  [48.6, 50.9, 'Your watch? Still counting to <b>32,768</b>. Right now.', 'SOURCE · NIST'],
];
export const CUTS = SHOTS.slice(1).map(s => s.t0);
// the 15 halvings: 32,768 -> 1 (accelerating)
export const HALF_T = (() => { const a = [20.5]; let d = 0.9; for (let k = 1; k < 15; k++) { a.push(a[k - 1] + d); d *= 0.87; } return a.map(x => Math.round(x * 1000) / 1000); })();
export function halvings(t) { let n = 0; for (const h of HALF_T) if (t >= h) n++; return n; }
// watch ticks: the second hand (and the motor) step once a second, on the half second
export function tickCount(t) { return Math.max(0, Math.floor(t - 0.5) + 1); }
export function tickPhase(t) { const f = t - 0.5 - Math.floor(t - 0.5); return t < 0.5 ? 1 : f; } // 0 at a tick, 1 just before the next
// events
export const EV = { flipT0: 2.75, flipT1: 3.95, backPop: 4.05, backFly: 4.35, explode0: 5.1, explode1: 6.5, shell0: 10.25, shell1: 11.1,
  zap0: 12.75, count0: 15.45, count1: 16.45, fountainToss: [42.0, 43.55], atomCount0: 36.45, atomCount1: 37.7, years0: 44.75, years1: 45.9 };
