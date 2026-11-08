// timeline.js — shots, verdict stamps and every lightning strike (shared by scene.js, hud.js and audio.py via timeline.json)
import { rng, TOWER_TIP, CAR_STRIKE, TREE_TOP, STORM1, RAIN1_R, STORM2, HOUSE } from './world2.js';

export const FPS = 30, DURATION = 57.4;
export const SHOTS = [
  { name: 'H_hook', t0: 0.0, t1: 3.6, set: 'T' },
  { name: 'T1a', t0: 3.6, t1: 5.9, set: 'T' }, { name: 'T1b', t0: 5.9, t1: 9.1, set: 'T' }, { name: 'T1c', t0: 9.1, t1: 12.4, set: 'T' },
  { name: 'C2a', t0: 12.4, t1: 14.7, set: 'C' }, { name: 'C2b', t0: 14.7, t1: 17.9, set: 'C' }, { name: 'C2c', t0: 17.9, t1: 21.2, set: 'C' },
  { name: 'F3a', t0: 21.2, t1: 23.5, set: 'FD' }, { name: 'F3b', t0: 23.5, t1: 26.7, set: 'FD' }, { name: 'F3c', t0: 26.7, t1: 30.0, set: 'FD' },
  { name: 'F4a', t0: 30.0, t1: 32.3, set: 'FN' }, { name: 'F4b', t0: 32.3, t1: 35.5, set: 'FN' }, { name: 'F4c', t0: 35.5, t1: 38.8, set: 'FN' },
  { name: 'S5a', t0: 38.8, t1: 41.1, set: 'S' }, { name: 'S5b', t0: 41.1, t1: 44.3, set: 'S' }, { name: 'S5c', t0: 44.3, t1: 47.6, set: 'SUN' },
  { name: 'W6a', t0: 47.6, t1: 50.9, set: 'W' }, { name: 'W6b', t0: 50.9, t1: 54.4, set: 'W' },
  { name: 'E_end', t0: 54.4, t1: 57.4, set: 'T' },
];
export const STAMPS = [[5.9, 'MYTH'], [14.7, 'MYTH'], [23.5, 'MYTH'], [32.3, 'MYTH'], [41.1, 'TRUE']];

// car: drives +x at 13 m/s, the strike at 14.7 s, then it coasts to a stop
export const CAR = { t0: 12.4, x0: -22, v: 13, ts: 14.7, tau: 0.75 };
export function carX(t) {
  const xs = CAR.x0 + CAR.v * (CAR.ts - CAR.t0);
  if (t < CAR.ts) return CAR.x0 + CAR.v * (t - CAR.t0);
  return xs + CAR.v * CAR.tau * (1 - Math.exp(-(t - CAR.ts) / CAR.tau));
}

// strikes: t = time of the main return stroke (the leader starts 0.06 s earlier)
const R = rng(2026);
const S = [];
const add = (o) => S.push({ seed: S.length + 1, I: 26, levels: 6, rough: 0.2, branches: 6, prox: 1, ...o });
const towerTop = () => [(R() - 0.5) * 520, 760 + R() * 60, (R() - 0.5) * 520];
// hook + claim 1 (tower)
for (const t of [0.0, 1.55, 2.95]) add({ t, set: 'T', A: towerTop(), B: TOWER_TIP, thunder: 'close' });
add({ t: 4.45, set: 'T', A: [-1400, 800, -2300], B: [-1180, 0, -2150], I: 16, thunder: 'far' });
add({ t: 5.9, set: 'T', A: towerTop(), B: TOWER_TIP, thunder: 'close', I: 30 });
for (let k = 1; k < 25; k++) { const t = 5.9 + 2.95 * Math.pow(k / 24, 0.72); add({ t, set: 'T', A: towerTop(), B: TOWER_TIP, thunder: 'tick', branches: 3, I: 22 }); }
for (let k = 0; k < 8; k++) add({ t: 9.3 + k * 0.385, set: 'T', A: towerTop(), B: TOWER_TIP, thunder: k % 2 ? 'mid' : 'close', I: 24 });
// claim 2 (car)
add({ t: 13.25, set: 'C', A: [160, 560, -420], B: [190, 0, -380], I: 14, thunder: 'far' });
{ const cx = carX(14.7); const B = [cx + CAR_STRIKE[0], CAR_STRIKE[1], CAR_STRIKE[2]]; add({ t: 14.7, set: 'C', A: [B[0] - 140, 560, B[2] + 70], B, I: 30, thunder: 'close', car: 1 }); }
// claim 3 (sunny field, storm 10+ miles away)
add({ t: 22.35, set: 'FD', A: [STORM1[0] + 900, 1850, STORM1[2] + 700], B: [STORM1[0] + 1100, 0, STORM1[2] + 900], I: 22, levels: 6, thunder: 'none' });
add({ t: 23.5, set: 'FD', A: [-700, 10000, -12000], B: TREE_TOP, via: [TREE_TOP[0] - 420, 1700, TREE_TOP[2] - 380], I: 34, levels: 8, rough: 0.2, branches: 6, thunder: 'close', blue: 1 });
add({ t: 25.6, set: 'FD', A: [STORM1[0] - 800, 1850, STORM1[2] + 1400], B: [STORM1[0] - 600, 0, STORM1[2] + 1500], I: 22, thunder: 'none' });
add({ t: 27.75, set: 'FD', A: [900, 9800, -10500], B: [520, 0, -1800], via: [300, 1800, -2400], I: 34, levels: 8, rough: 0.2, branches: 6, thunder: 'mid', blue: 1 });
add({ t: 29.1, set: 'FD', A: [STORM1[0] + 300, 1850, STORM1[2] - 600], B: [STORM1[0] + 500, 0, STORM1[2] - 400], I: 22, thunder: 'none' });
// claim 4 (heat lightning: in-cloud flashes in a storm too far away to hear)
for (const t of [30.35, 30.95, 31.6, 32.3, 32.8, 33.45, 34.05, 34.7, 35.3, 35.95, 36.7, 37.45, 38.25]) {
  const p = [STORM2[0] + (R() - 0.5) * 5000, 2600 + R() * 3600, STORM2[2] + (R() - 0.5) * 3000];
  add({ t, set: 'FN', A: p, B: [p[0] + (R() - 0.5) * 5000, p[1] - 1200 + R() * 1200, p[2] + (R() - 0.5) * 2000], ic: 1, I: 6, levels: 6, rough: 0.18, branches: 4, thunder: 'none' });
}
// claim 5 (the channel, held in slow motion) — hold bolt for S5a/S5b
add({ t: 38.8, set: 'S', A: [140, 1150, -700], B: [0, 0, -500], I: 30, levels: 7, rough: 0.2, branches: 7, hold: [38.8, 44.3], thunder: 'none' });
add({ t: 41.1, set: 'S', A: [-420, 1150, -820], B: [-60, 0, -560], I: 34, levels: 7, thunder: 'close' });
// bonus: 1 mile away, seen from inside, thunder 5 s later (shown at 2x speed)
export const W_STRIKE = { t: 47.85, B: [-200, 0, HOUSE[2] - 1609], A: [-280, 1120, HOUSE[2] - 1540] };
add({ t: W_STRIKE.t, set: 'W', A: W_STRIKE.A, B: W_STRIKE.B, I: 30, thunder: 'delayed', delay: 2.4 });
add({ t: 51.1, set: 'W', A: [W_STRIKE.A[0] + 60, 1120, W_STRIKE.A[2] - 40], B: W_STRIKE.B, I: 30, thunder: 'delayed', delay: 2.4, seed2: 1 });
export const W_RING_SPEED = 1621 / 2.4; // m per shown second: 1 mile in 5 s, shown at 2x
// end (tower again, loops to the start)
for (const t of [54.45, 55.95, 57.32]) add({ t, set: 'T', A: towerTop(), B: TOWER_TIP, thunder: t > 57 ? 'none' : 'close' });
export const STRIKES = S;

// counters
export const COUNT1 = STRIKES.filter(s => s.set === 'T' && s.t >= 5.89 && s.t < 9.0).map(s => s.t);   // 25 per year
export const COUNT2 = STRIKES.filter(s => s.set === 'T' && s.t >= 9.2 && s.t < 12.2).map(s => s.t);   // 8 in 24 min
export const COUNT_W = [1, 2, 3, 4, 5].map(k => W_STRIKE.t + 0.48 * k);                                 // 1..5 seconds (2x)
