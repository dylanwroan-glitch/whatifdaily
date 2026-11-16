// timeline.js — the narrated cut: shots, events and captions come from plan.py (edit.js), which times every shot to its
// voice line and lands every counter on the spoken number.
import { EDIT, CAPTIONS } from './edit.js';
export const BPM = 120, HB = 60 / BPM * 2;
export const FPS = EDIT.FPS;
export const SHOTS = EDIT.SHOTS;
export const DURATION = EDIT.DURATION;
const S = Object.fromEntries(SHOTS.map(s => [s.name, s]));
export const T = (n, d = 0) => +(S[n].t0 + d).toFixed(4);
export const CUTS = EDIT.CUTS;
export const CAPS = [];            // the old on-screen sentences are replaced by narration captions
export const NCAPS = CAPTIONS;     // word-synced narration captions
export const EV = EDIT.EV;
export const GAUGE = [
  ['B_heat', 20, 1538, 330, 330], ['B_top', 1538, 1538, 330, 210], ['B_mid', 1538, 1538, 210, 90], ['B_legs', 1538, 1538, 90, 0],
];
export function meltFront(t) {
  const seg = [['B_top', 336, 205], ['B_mid', 205, 88], ['B_legs', 88, -3]];
  if (t < S.B_top.t0) return 400;
  for (const [n, a, b] of seg) { const s = S[n]; if (t < s.t1) { const u = Math.min(1, (t - s.t0) / ((s.t1 - s.t0) * (n === 'B_legs' ? 0.86 : 1))); return a + (b - a) * u; } }
  return -3;
}
