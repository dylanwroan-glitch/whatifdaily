// timeline.js — shots, captions, counters and the flying Earth's path (shared by scene.js, hud.js and audio.py via timeline.json)
export const FPS = 30, DURATION = 47.0;
export const SHOTS = [
  { name: 'H_door', t0: 0.0, t1: 2.7, set: 'P' },
  { name: 'P1_nickel', t0: 2.7, t1: 5.4, set: 'P' },
  { name: 'P2_109', t0: 5.4, t1: 8.1, set: 'P' },
  { name: 'P3_fill', t0: 8.1, t1: 11.1, set: 'P' },
  { name: 'P4_launch', t0: 11.1, t1: 13.5, set: 'P' },
  { name: 'S1_chase', t0: 13.5, t1: 16.2, set: 'S' },
  { name: 'S2_land', t0: 16.2, t1: 19.0, set: 'S' },
  { name: 'S3_look', t0: 19.0, t1: 21.8, set: 'S' },
  { name: 'T1_up', t0: 21.8, t1: 25.0, set: 'T' },
  { name: 'X1_warp', t0: 25.0, t1: 27.4, set: 'X' },
  { name: 'X2_proxima', t0: 27.4, t1: 29.6, set: 'X' },
  { name: 'G1_start', t0: 29.6, t1: 32.6, set: 'G' },
  { name: 'G2_lap', t0: 32.6, t1: 36.2, set: 'G' },
  { name: 'G3_reveal', t0: 36.2, t1: 39.8, set: 'G' },
  { name: 'E1_porch', t0: 39.8, t1: 43.2, set: 'P' },
  { name: 'E2_end', t0: 43.2, t1: 47.0, set: 'P' },
];
// [t0, t1, html, source]
export const CAPS = [
  [2.85, 5.3, 'Earth would be the size of a <b>nickel</b>.', 'SOURCE · NASA'],
  [5.55, 8.0, 'The Sun is <b>109×</b> wider than Earth.', 'SOURCE · NASA'],
  [8.25, 11.0, '<b>1.3 million</b> Earths would fit inside it.', 'SOURCE · NASA'],
  [11.25, 13.4, 'So where does <b>Earth</b> go?', null],
  [13.65, 16.1, 'Way past the <b>neighbors</b>…', null],
  [16.4, 18.9, 'Earth sits <b>215 meters</b> down the street.', 'SCALE MATH · NASA DATA'],
  [19.15, 21.7, 'From here, it looks as big as our <b>Sun</b> does.', 'SCALE MATH · NASA DATA'],
  [22.0, 24.9, 'Neptune? <b>6.5 km</b> away.', 'SCALE MATH · NASA DATA'],
  [25.15, 27.3, 'Now the <b>nearest</b> star…', null],
  [27.55, 29.5, 'Proxima Centauri: <b>4.24 light-years</b>.', 'SOURCE · NASA'],
  [29.75, 32.5, 'At door scale, that’s <b>57,600 km</b>.', 'SCALE MATH · NASA DATA'],
  [32.75, 36.1, 'One lap around Earth? <b>Not enough.</b>', null],
  [36.35, 39.7, '<b>1.4×</b> around the entire planet.', 'SCALE MATH · NASA DATA'],
  [39.95, 43.1, 'Just to reach the Sun’s <b>next-door</b> neighbor.', null],
];
export const CUTS = SHOTS.slice(1).map(s => s.t0);
// the globe trip: laps as a function of time (0 -> 1.438)
export const LAPS = 57630 / 40074;
export const TRIP = { t0: 30.2, tLap: 34.0, t1: 37.6 };
export function laps(t) {
  if (t <= TRIP.t0) return 0;
  if (t < TRIP.tLap) { const u = (t - TRIP.t0) / (TRIP.tLap - TRIP.t0); return u * u * (3 - 2 * u) * 0.35 + u * 0.65; }
  const u = Math.min(1, (t - TRIP.tLap) / (TRIP.t1 - TRIP.tLap)); return 1 + (LAPS - 1) * (1 - Math.pow(1 - u, 2.2));
}
// minis pouring into the Sun (P3)
export const FILL = { t0: 8.2, t1: 10.7 };
export const LAUNCH = 11.35, LANDED = 17.45;
