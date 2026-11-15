// timeline.js — shots, captions, counters and event times (shared by scene.js, hud.js and audio.py via timeline.json)
// Fast cut on a 140 BPM grid: most shots are 2 half-bars (1.714 s); the hook, the tease and the end card are 3 half-bars
// (2.571 s) with a camera punch on the middle beat.
export const BPM = 140, HB = 60 / BPM * 2; // half-bar = 0.857 s
export const FPS = 30;
const L = [['H_hook', 3],
  ['A_tall', 2], ['A_iron', 2], ['A_rivets', 2],
  ['B_heat', 2], ['B_top', 2], ['B_mid', 2], ['B_legs', 2],
  ['C_cube', 2], ['C_size', 2], ['C_foot', 2],
  ['D_spread', 2], ['D_tease', 3], ['D_reveal', 2], ['D_wide', 2],
  ['E_why', 2], ['E_holes', 2],
  ['F_end', 3]];
export const SHOTS = []; { let k = 0; for (const [name, n] of L) { SHOTS.push({ name, t0: +(k * HB).toFixed(4), t1: +((k + n) * HB).toFixed(4), set: 'P' }); k += n; } }
export const DURATION = SHOTS[SHOTS.length - 1].t1;
const S = Object.fromEntries(SHOTS.map(s => [s.name, s]));
export const T = (n, d = 0) => +(S[n].t0 + d).toFixed(4);
export const CUTS = SHOTS.slice(1).map(s => s.t0);

// captions: [t0, t1, html, source]. Words pop in one by one; <b> marks the gold keyword.
const OFF = 'SOURCE · TOUR EIFFEL (OFFICIAL SITE)';
const EIF = 'SOURCE · GUSTAVE EIFFEL (SETE PRESS KIT)';
const c = (n, html, src, d0 = 0.08, n1 = null) => [T(n, d0), +((n1 ? S[n1] : S[n]).t1 - 0.06).toFixed(4), html, src];
export const CAPS = [
  c('A_tall', 'It stands <b>330 m</b> tall', OFF),
  c('A_iron', 'Built from <b>7,300 tonnes</b> of iron', OFF),
  c('A_rivets', 'Held together by <b>2.5 million</b> rivets', OFF),
  c('B_heat', 'Now heat it past <b>1,538 °C</b>', 'SOURCE · ROYAL SOCIETY OF CHEMISTRY'),
  c('B_top', 'All <b>18,038</b> iron parts start to drip', OFF),
  c('B_mid', 'Floor after floor <b>pours</b> down', null),
  c('B_legs', 'Until <b>nothing</b> is left standing', null),
  c('C_cube', 'Now pack <b>all of it</b> into one cube', null),
  c('C_size', 'The whole tower? A cube just <b>9.8 m</b> wide', 'MATH · 7,300 t ÷ 7.874 t/m³ (NIST IRON DENSITY)'),
  c('C_foot', 'It fits under <b>one</b> of its own feet', 'SOURCE · TOUR EIFFEL · EACH PILLAR IS 25 M WIDE'),
  c('D_spread', 'Now spread it across the <b>125 m</b> base', OFF),
  c('D_tease', 'How <b>deep</b> is the puddle?', null, 0.12),
  c('D_reveal', 'Just <b>6 cm</b> deep', 'MATH · 927 m³ ÷ (125 m × 125 m)'),
  c('D_wide', 'The Eiffel Tower is mostly <b>air</b>', 'MATH · 330 M OF TOWER → 6 CM OF IRON'),
  c('E_why', 'Eiffel’s rule #1? Resist the <b>wind</b>', EIF),
  c('E_holes', 'So he left it full of <b>holes</b>', EIF),
];
// events
export const EV = {
  hookHit: 0.0,
  // big counters: [start, land]
  tall: [T('A_tall', 0.1), T('A_tall', 0.9)], iron: [T('A_iron', 0.1), T('A_iron', 0.95)], rivets: [T('A_rivets', 0.1), T('A_rivets', 1.0)],
  temp: [T('B_heat', 0.05), T('B_heat', 1.15)], cube: [T('C_size', 0.1), T('C_size', 0.85)], deep: [T('D_reveal', 0.0), T('D_reveal', 0.6)],
  // the melt front (m) falls from the antenna to the ground over three shots
  melt0: T('B_top', 0.0), melt1: T('B_legs', 1.45),
  gather0: T('C_cube', 0.05), gather1: T('C_cube', 1.5),
  slide0: T('C_foot', 0.35), slide1: T('C_foot', 1.1),
  spread0: T('D_spread', 0.25), spread1: T('D_spread', 1.6),
  reveal: T('D_reveal'), tease: T('D_tease'),
  rebuild0: T('F_end', 0.1), rebuild1: T('F_end', 2.0),
};
// the simulation HUD: [shot, temperature start (°C), end, tower height start (m), end]
export const GAUGE = [
  ['B_heat', 20, 1538, 330, 330], ['B_top', 1538, 1538, 330, 210], ['B_mid', 1538, 1538, 210, 90], ['B_legs', 1538, 1538, 90, 0],
];
// the melt front height at time t (m above the ground): eased per shot so each shot shows its own part of the tower going
export function meltFront(t) {
  const seg = [['B_top', 336, 205], ['B_mid', 205, 88], ['B_legs', 88, -3]];
  if (t < S.B_top.t0) return 400;
  for (const [n, a, b] of seg) { const s = S[n]; if (t < s.t1) { const u = Math.min(1, (t - s.t0) / ((s.t1 - s.t0) * (n === 'B_legs' ? 0.86 : 1))); return a + (b - a) * u; } }
  return -3;
}
