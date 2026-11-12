// timeline.js — shots, captions, counters and event times (shared by scene.js, hud.js and audio.py via timeline.json)
export const FPS = 30, DURATION = 57.0;
// sets: D = Black Canyon + dam, R = the highway, F = close-up on one column, X = x-ray of the cooling pipes, I = ice plant, O = oven
export const SHOTS = [
  { name: 'H_hook', t0: 0.0, t1: 2.6, set: 'D' },
  { name: 'A_tall', t0: 2.6, t1: 5.0, set: 'D' },
  { name: 'A_conc', t0: 5.0, t1: 7.6, set: 'D' },
  { name: 'A_road', t0: 7.6, t1: 10.2, set: 'R' },
  { name: 'B_heat', t0: 10.2, t1: 12.8, set: 'F' },
  { name: 'B_pour', t0: 12.8, t1: 15.4, set: 'D' },
  { name: 'B_core', t0: 15.4, t1: 18.0, set: 'D' },
  { name: 'B_years', t0: 18.0, t1: 20.6, set: 'D' },
  { name: 'B_crack', t0: 20.6, t1: 23.2, set: 'D' },
  { name: 'B_2058', t0: 23.2, t1: 25.8, set: 'D' },
  { name: 'C_cols', t0: 25.8, t1: 28.4, set: 'D' },
  { name: 'C_lifts', t0: 28.4, t1: 31.0, set: 'F' },
  { name: 'C_pipes', t0: 31.0, t1: 33.6, set: 'X' },
  { name: 'C_miles', t0: 33.6, t1: 36.2, set: 'X' },
  { name: 'C_river', t0: 36.2, t1: 38.8, set: 'X' },
  { name: 'C_ice', t0: 38.8, t1: 41.4, set: 'I' },
  { name: 'C_done', t0: 41.4, t1: 44.0, set: 'D' },
  { name: 'C_grout', t0: 44.0, t1: 46.4, set: 'X' },
  { name: 'D_oven', t0: 46.4, t1: 48.8, set: 'O' },
  { name: 'D_loaves', t0: 48.8, t1: 51.4, set: 'D' },
  { name: 'D_3yrs', t0: 51.4, t1: 53.8, set: 'D' },
  { name: 'E_end', t0: 53.8, t1: 57.0, set: 'D' },
];
const BOR = 'SOURCE · U.S. BUREAU OF RECLAMATION';
// [t0, t1, html, source]
export const CAPS = [
  [2.75, 4.95, '<b>726 feet</b> tall, from rock to roadway.', BOR],
  [5.15, 7.55, '<b>3.25 million</b> cubic yards of concrete.', BOR],
  [7.75, 10.15, 'Enough for a highway from <b>San Francisco</b> to <b>New York</b>.', BOR],
  [10.35, 12.75, 'But curing concrete makes its own <b>heat</b>.', BOR],
  [12.95, 15.35, 'Now pour the whole dam <b>in one go</b>…', 'SIMULATION'],
  [15.55, 17.95, '…it would get so <b>hot</b> inside…', BOR],
  [18.15, 20.55, '…it would take <b>125 years</b> to cool.', BOR],
  [20.75, 23.15, 'The stress would make it <b>crack and crumble</b>.', BOR],
  [23.35, 25.75, 'Poured in 1933? Still cooling until <b>2058</b>.', 'MATH · 1933 + 125 YEARS'],
  [25.95, 28.35, 'So they built it as <b>columns</b>…', BOR],
  [28.55, 30.95, '…rising <b>5 feet</b> at a time.', BOR],
  [31.15, 33.55, 'Inside each one: steel <b>cooling pipes</b>.', BOR],
  [33.75, 36.15, 'More than <b>582 miles</b> of pipe.', BOR],
  [36.35, 38.75, 'First, <b>river water</b> ran through them…', BOR],
  [38.95, 41.35, '…then chilled water from an <b>ice plant</b>.', BOR],
  [41.55, 43.95, 'Cooling done by <b>1935</b>. Not 2058.', BOR],
  [44.15, 46.35, 'Then the pipes were cut and filled with <b>grout</b>.', BOR],
  [46.55, 48.75, 'And all that heat, in a <b>baking oven</b>?', BOR],
  [48.95, 51.35, 'It could bake <b>500,000 loaves</b> of bread a day…', BOR],
  [51.55, 53.75, '…for <b>3 years</b>.', 'RECLAMATION · MATH: 500,000 × 365 × 3'],
];
export const CUTS = SHOTS.slice(1).map(s => s.t0);
// events
export const EV = {
  tall0: 2.8, tall1: 3.9, conc0: 5.2, conc1: 6.4, road0: 7.6,
  heat0: 10.6, heat1: 12.2, pour0: 13.0, pour1: 14.7, cut0: 15.45, cut1: 16.3,
  years0: 18.25, years1: 20.1, crack0: 20.8, crack1: 22.6, y2058: 23.45,
  cols0: 25.8, lift0: 28.75, lift1: 30.2, pipes0: 31.2, miles0: 33.8, miles1: 35.3,
  river0: 36.4, ice0: 39.0, ice1: 40.4, done0: 41.6, done1: 43.0, grout0: 44.3, grout1: 46.0,
  oven0: 46.5, loaves0: 49.0, loaves1: 50.3, yrs0: 51.6, yrs1: 52.9, end0: 54.0,
};
// the 125 years of the single pour, as a function of t inside B_years (eased so the early decades fly by)
export function yearsAt(t) { if (t < EV.years0) return 0; const u = Math.min(1, (t - EV.years0) / (EV.years1 - EV.years0)); return 125 * (1 - Math.pow(1 - u, 1.7)); }
