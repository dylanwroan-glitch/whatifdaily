// timeline.js — shots, captions, ranks, counters and event times (shared by scene.js, hud.js and audio.py via timeline.json)
// Fast cut: every shot is 2 half-bars at 140 BPM (1.714 s); the hook, the #1 build-up and the end card are 3 half-bars.
export const BPM = 140, HB = 60 / BPM * 2; // half-bar = 0.857 s
export const FPS = 30;
const L = [['H_hook', 3, 'A'],
  ['A_rank', 2, 'A'], ['A_screen', 2, 'A'], ['A_up', 2, 'A'],
  ['B_rank', 2, 'P'], ['B_far', 2, 'P'], ['B_ice', 2, 'P'],
  ['C_rank', 2, 'S'], ['C_glow', 2, 'S'], ['C_one', 2, 'S'],
  ['D_rank', 2, 'N'], ['D_far', 2, 'N'], ['D_wind', 2, 'N'],
  ['E_tease', 3, 'E'], ['E_rank', 2, 'E'], ['E_laser', 2, 'L'], ['E_tenb', 2, 'L'], ['E_zero', 2, 'L'], ['E_known', 2, 'E'], ['E_orbit', 2, 'E'],
  ['F_end', 3, 'A']];
export const SHOTS = []; { let k = 0; for (const [name, n, set] of L) { SHOTS.push({ name, t0: +(k * HB).toFixed(4), t1: +((k + n) * HB).toFixed(4), set }); k += n; } }
export const DURATION = SHOTS[SHOTS.length - 1].t1;
const S = Object.fromEntries(SHOTS.map(s => [s.name, s]));
export const T = (n, d = 0) => +(S[n].t0 + d).toFixed(4);
export const CUTS = SHOTS.slice(1).map(s => s.t0);

// ranks: [shot where it is revealed, rank label, place, temperature °C (counter target), counter label]
export const RANKS = [
  { at: T('A_rank'), until: T('B_rank'), rank: '#5', place: 'ANTARCTICA', c: -89.2, dec: 1, lab: 'COLDEST EVER RECORDED ON EARTH' },
  { at: T('B_rank'), until: T('C_rank'), rank: '#4', place: 'PLUTO', c: -232, dec: 0, lab: 'AVERAGE TEMPERATURE' },
  { at: T('C_rank'), until: T('D_rank'), rank: '#3', place: 'DEEP SPACE', c: -270, dec: 0, lab: 'THE BIG BANG’S AFTERGLOW' },
  { at: T('D_rank'), until: T('E_tease'), rank: '#2', place: 'BOOMERANG NEBULA', c: -272, dec: 0, lab: 'COLDEST NATURAL OBJECT FOUND SO FAR' },
  { at: T('E_rank'), until: T('F_end'), rank: '#1', place: 'COLD ATOM LAB', c: -273.1499999999, dec: 10, lab: 'A TEN-BILLIONTH OF A DEGREE ABOVE ABSOLUTE ZERO' },
];

// captions: [t0, t1, html, source]. Words pop in one by one; <b> marks the gold keyword.
const WMO = 'SOURCE · WORLD METEOROLOGICAL ORGANIZATION', NASA = 'SOURCE · NASA', ESA = 'SOURCE · ESA / HUBBLE', JPL = 'SOURCE · NASA / JPL';
const c = (n, html, src, d0 = 0.08, d1 = 0) => [T(n, d0), +(SHOTS.find(s => s.name === n).t1 - 0.06 + d1).toFixed(4), html, src];
export const CAPS = [
  c('A_rank', 'Coldest ever recorded on <b>Earth</b>', WMO),
  c('A_screen', '<b>−89.2 °C</b> (−128.6 °F) at Vostok Station', WMO),
  c('A_up', 'And that’s the <b>warmest</b> one on this list.', null),
  c('B_rank', 'Pluto averages <b>−232 °C</b>', NASA),
  c('B_far', '<b>5.9 billion km</b> from the Sun, on average', NASA),
  c('B_ice', 'Plains that appear to be <b>frozen nitrogen</b>', NASA),
  c('C_rank', 'The glow filling space: <b>−270 °C</b>', ESA),
  c('C_glow', 'The leftover glow of the <b>Big Bang</b>', ESA),
  c('C_one', 'Only <b>one</b> object found is colder…', ESA),
  c('D_rank', 'The Boomerang Nebula: <b>−272 °C</b>', ESA),
  c('D_far', '<b>5,000 light-years</b> away, in Centaurus', ESA),
  c('D_wind', 'Gas racing out at <b>500,000 km/h</b> chills it', ESA),
  c('E_tease', 'Nothing in nature is <b>known</b> to get colder than #1', JPL, 0.25),
  c('E_rank', 'It’s a box on the <b>space station</b>', JPL),
  c('E_laser', 'Its lasers chill atoms to…', 'SOURCE · NASA'),
  c('E_tenb', '<b>a ten-billionth</b> of a degree…', JPL),
  c('E_zero', '…above <b>absolute zero</b> (−273.15 °C)', 'SOURCE · NASA / JPL · NIST'),
  c('E_known', 'Regularly the <b>coldest known spot</b> in the universe', JPL),
  c('E_orbit', 'And it circles Earth about every <b>90 minutes</b>', NASA),
];
// events
export const EV = {
  hookHit: 0.0, aRank: T('A_rank'), bRank: T('B_rank'), cRank: T('C_rank'), dRank: T('D_rank'), eRank: T('E_rank'),
  laser: T('E_laser', 0.15), zero: T('E_zero'), end: T('F_end'),
};
