// world3.js — "If the Sun were a door": suburban street at dusk, the door-sized Sun, a nickel-sized Earth,
// a town for the aerial shots, a red dwarf, and a globe. All original, procedural.
import { V3, quatAxis, quatFromTo, meshBox, meshLathe, meshSphere, pushInst, pushBar } from './engine.js';

export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;

// ---------- layout (meters). The street runs along z at x = 0; the hero house is on the +x side, facing -x ----------
export const PORCH_Y = 0.47;
export const SUN_D = 2.0;                                  // the Sun, shrunk to the height of a door
export const SUNC = [14.75, PORCH_Y + 1.0, -1.75];          // standing on the porch next to the door
export const DOOR = { x: 16.0, z: 0.75, w: 1.0, h: 2.0 };
export const SCALE = 2.0 / 1392000;                         // model meters per real km (Sun diameter 1,392,000 km -> 2 m)
export const EARTH_D = 12756 * SCALE;                       // 0.0183 m
export const AU = 150e6 * SCALE;                            // 215.5 m
export const TABLE = [14.05, PORCH_Y + 0.56, -0.35];        // top-centre of the little side table
const EARTH_ON_TABLE_X = 14.02;
export const EARTH_ON_TABLE = [14.02, TABLE[1] + EARTH_D / 2, -0.37];
const DB = V3.norm([SUNC[0] - EARTH_ON_TABLE_X, 0, SUNC[2] - (-0.37)]);
export const DIR_BALL = DB; export const RIGHT_BALL = [-DB[2], 0, DB[0]];
export const NICKEL = [14.02 + RIGHT_BALL[0] * 0.025 + DB[0] * 0.004, TABLE[1] + 0.0106, -0.37 + RIGHT_BALL[2] * 0.025 + DB[2] * 0.004];
export const MAILBOX = [5.3, 0, SUNC[2] - Math.sqrt(AU * AU - (SUNC[0] - 5.3) ** 2)];
export const EARTH_ON_MAILBOX = [MAILBOX[0], 1.31 + EARTH_D / 2, MAILBOX[2]];
export const ROAD = { AS: 160, AW: 8, SS: 220, SW: 7, org: [0, 110] };
export const NEPTUNE_R = 30 * AU;                           // 6,465 m

const SIDING = [[0.36, 0.39, 0.44], [0.45, 0.4, 0.33], [0.33, 0.37, 0.33], [0.5, 0.47, 0.42], [0.42, 0.33, 0.3], [0.3, 0.34, 0.4]];
const ROOF = [[0.09, 0.085, 0.085], [0.12, 0.08, 0.07], [0.07, 0.08, 0.09]];
const TRIM = [0.7, 0.69, 0.66];
const WARM = [1.0, 0.68, 0.38];

function house(a, win, x, z, face, R, opt = {}) { // face = -1: facade at the low-x side (house on +x side of the street)
  const w = opt.w || (9 + R() * 4), d = opt.d || (9 + R() * 2.5), h = opt.h || (5.2 + R() * 1.3);
  const cx = x + (face < 0 ? d / 2 : -d / 2);
  const col = opt.col || SIDING[Math.floor(R() * SIDING.length)];
  pushInst(a, [cx, h / 2, z], [d, h, w], col, 0, undefined, 0, 0.85);
  // pitched roof, ridge along z
  const rc = ROOF[Math.floor(R() * ROOF.length)]; const pitch = 0.5 + R() * 0.15; const half = d / 2 + 0.5;
  const L = half / Math.cos(pitch);
  for (const s of [-1, 1]) {
    const q = quatAxis([0, 0, 1], -s * pitch);
    pushInst(a, [cx + s * half / 2, h + Math.tan(pitch) * half / 2 + 0.05, z], [L, 0.22, w + 0.9], rc, 0, q, 0, 0.9);
  }
  // facade: door + windows (emissive), some dark
  const fx = x + face * 0.03;
  if (!opt.noDoor) pushInst(a, [fx, 1.05, z + (R() - 0.5) * w * 0.3], [0.1, 2.1, 1.0], [0.16, 0.07, 0.05], 0, undefined, 0, 0.7);
  const rows = h > 5.6 ? [1.55, 4.2] : [1.55, 3.9];
  for (const y of rows) for (const zz of [-w * 0.3, w * 0.3]) {
    if (opt.skipWin && opt.skipWin(y, zz)) continue;
    const on = R() < 0.72; const k = on ? 0.8 + R() * 1.0 : 0;
    pushInst(win, [fx + face * 0.02, y, z + zz], [0.08, 1.2, 1.35], on ? WARM : [0.05, 0.06, 0.08], on ? 2 : 0, undefined, 0, 0.3, [k, 0, 0, 0]);
  }
  return { cx, w, d, h };
}

export function buildStreet(E) {
  const box = E.mesh('box', meshBox), sph = E.mesh('sphere', () => meshSphere(10, 14)), sphHi = E.mesh('sphereHi', () => meshSphere(48, 72));
  const R = rng(1010);
  const g = []; pushInst(g, [0, -0.5, -3000], [40000, 1, 40000], [0.07, 0.07, 0.07], 10, undefined, 0, 0.9, [1, 1, 0, 0]);
  const a = [], win = [], tree = [], lamp = [], lampHead = [];
  // ----- hero house (facade at x = 16) -----
  const H = { x: 16, w: 13, d: 10, h: 6.0 };
  pushInst(a, [H.x + H.d / 2, H.h / 2, 0], [H.d, H.h, H.w], [0.4, 0.43, 0.48], 0, undefined, 0, 0.85);
  for (const s of [-1, 1]) { const pitch = 0.55, half = H.d / 2 + 0.6, L = half / Math.cos(pitch);
    pushInst(a, [H.x + H.d / 2 + s * half / 2, H.h + Math.tan(pitch) * half / 2 + 0.05, 0], [L, 0.24, H.w + 1.0], [0.1, 0.09, 0.09], 0, quatAxis([0, 0, 1], -s * pitch), 0, 0.9); }
  // porch: floor, steps, posts, roof, rail
  const WOOD = [0.24, 0.16, 0.1];
  pushInst(a, [14.7, PORCH_Y / 2, -0.4], [2.6, PORCH_Y, 7.4], WOOD, 0, undefined, 0, 0.75);
  pushInst(a, [13.2, PORCH_Y * 0.33, 1.3], [0.45, PORCH_Y * 0.66, 2.0], [0.3, 0.3, 0.3], 0, undefined, 0, 0.8);
  pushInst(a, [12.85, PORCH_Y * 0.16, 1.3], [0.4, PORCH_Y * 0.33, 2.0], [0.3, 0.3, 0.3], 0, undefined, 0, 0.8);
  for (const z of [-4.0, 2.45]) pushInst(a, [13.55, PORCH_Y + 1.35, z], [0.16, 2.7, 0.16], TRIM, 0, undefined, 0, 0.6);
  pushInst(a, [14.7, PORCH_Y + 2.78, -0.4], [2.9, 0.16, 7.8], [0.6, 0.6, 0.58], 0, undefined, 0, 0.7);
  pushInst(a, [13.55, PORCH_Y + 0.85, -2.1], [0.06, 0.06, 3.8], TRIM, 0, undefined, 0, 0.6);
  for (let z = -3.9; z < -0.3; z += 0.32) pushInst(a, [13.55, PORCH_Y + 0.42, z], [0.04, 0.84, 0.04], TRIM, 0, undefined, 0, 0.6);
  // door + frame
  const D = DOOR;
  pushInst(a, [D.x - 0.04, PORCH_Y + D.h / 2, D.z], [0.06, D.h, D.w], [0.34, 0.07, 0.05], 0, undefined, 0, 0.55);
  for (const s of [-1, 1]) pushInst(a, [D.x - 0.06, PORCH_Y + D.h / 2 + 0.06, D.z + s * (D.w / 2 + 0.06)], [0.08, D.h + 0.12, 0.12], TRIM, 0, undefined, 0, 0.6);
  pushInst(a, [D.x - 0.06, PORCH_Y + D.h + 0.09, D.z], [0.08, 0.12, D.w + 0.24], TRIM, 0, undefined, 0, 0.6);
  for (const [y, z] of [[PORCH_Y + 0.55, 0], [PORCH_Y + 1.45, 0]]) pushInst(a, [D.x - 0.075, y, D.z], [0.02, 0.62, 0.72], [0.28, 0.055, 0.04], 0, undefined, 0, 0.5);
  pushInst(a, [D.x - 0.1, PORCH_Y + 1.0, D.z + 0.36], [0.06, 0.06, 0.06], [0.8, 0.65, 0.3], 0, undefined, 0, 0.3);
  // house number plate + porch windows
  for (const [y, z] of [[PORCH_Y + 1.35, 3.6], [PORCH_Y + 1.35, -4.9], [4.3, 3.6], [4.3, -1.5], [4.3, -4.9]])
    pushInst(win, [H.x - 0.05, y, z], [0.08, 1.25, 1.4], WARM, 2, undefined, 0, 0.3, [z === -1.5 ? 0.0 : 1.0, 0, 0, 0]);
  // side table with the Earth and the nickel
  const T = TABLE;
  pushInst(a, [T[0], T[1] - 0.02, T[2]], [0.46, 0.04, 0.46], [0.11, 0.085, 0.07], 0, undefined, 0, 0.55);
  for (const [dx, dz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) pushInst(a, [T[0] + dx, (PORCH_Y + T[1] - 0.04) / 2, T[2] + dz], [0.035, T[1] - 0.04 - PORCH_Y, 0.035], [0.16, 0.1, 0.06], 0, undefined, 0, 0.6);
  // ----- the rest of the street -----
  for (let z = -470; z <= 130; z += 24) {
    for (const side of [-1, 1]) {
      if (side > 0 && Math.abs(z) < 14) continue; // hero house
      const zz = z + (R() - 0.5) * 3 + (side < 0 ? 11 : 0);
      if (Math.abs(((zz - ROAD.org[1]) % ROAD.SS + ROAD.SS) % ROAD.SS - ROAD.SS / 2) > ROAD.SS / 2 - 14) continue; // keep cross streets clear
      house(a, win, side * (16 + R() * 2), zz, side > 0 ? -1 : 1, R);
      const tz = zz + (R() - 0.5) * 8, tx = side * (9.5 + R() * 3); const s = 3.2 + R() * 2.2;
      pushInst(tree, [tx, s * 0.9 + 1.2, tz], [s, s * 1.15, s], [0.03, 0.06, 0.025].map(v => v * (0.8 + 0.5 * R())), 0, undefined, 0, 0.95);
      pushInst(a, [tx, 0.9, tz], [0.25, 1.8, 0.25], [0.06, 0.045, 0.03], 0, undefined, 0, 0.9);
    }
  }
  // street lamps every 60 m, both sides (match the lamp pools painted by the ground shader)
  for (let z = -510; z <= 150; z += 60) for (const side of [-1, 1]) {
    const lz = z + 30 + ROAD.org[1] - 110 + 110; const x = side * 4.6;
    pushInst(lamp, [x, 2.6, lz - 0], [0.12, 5.2, 0.12], [0.08, 0.08, 0.085], 0, undefined, 0, 0.6);
    pushInst(lamp, [x - side * 0.6, 5.2, lz], [1.3, 0.1, 0.1], [0.08, 0.08, 0.085], 0, undefined, 0, 0.6);
    pushInst(lampHead, [x - side * 1.15, 5.1, lz], [0.42, 0.12, 0.25], [1.0, 0.8, 0.55], 2, undefined, 0, 0.4, [3.2, 0, 0, 0]);
  }
  // mailbox with Earth's landing spot (215 m from the Sun's centre)
  pushInst(a, [MAILBOX[0], 0.555, MAILBOX[2]], [0.09, 1.11, 0.09], [0.12, 0.1, 0.08], 0, undefined, 0, 0.8);
  pushInst(a, [MAILBOX[0], 1.2, MAILBOX[2]], [0.22, 0.18, 0.48], [0.035, 0.05, 0.04], 0, undefined, 0, 0.45);
  pushInst(a, [MAILBOX[0], 1.3, MAILBOX[2]], [0.022, 0.02, 0.022], [0.6, 0.6, 0.6], 0, undefined, 0, 0.5); // tiny stand
  const b = {
    ground: E.batch(box, new Float32Array(g)), static: E.batch(box, new Float32Array(a)), win: E.batch(box, new Float32Array(win)),
    trees: E.batch(sph, new Float32Array(tree)), lamps: E.batch(box, new Float32Array(lamp)), lampHeads: E.batch(box, new Float32Array(lampHead)),
  };
  b.ground.shadow = false; b.win.shadow = false; b.lampHeads.shadow = false;
  // the Sun (door-sized)
  b.sun = E.batch(sphHi, new Float32Array(20), true); b.sun.kinds = [14]; b.sun.shadow = false; b.sun.buf = new Float32Array(20);
  // the nickel (21.21 mm across, 1.95 mm thick)
  const nk = E.mesh('nickel', () => meshLathe([[0.0, 0], [0.0102, 0], [0.0106, 0.0003], [0.0106, 0.00165], [0.0102, 0.00195], [0.0, 0.00195]], 48));
  const n = []; const qn = quatFromTo([0, 1, 0], V3.scale(DB, -1)); const back = V3.scale(DB, 0.00098);
  pushInst(n, [NICKEL[0] + back[0], NICKEL[1], NICKEL[2] + back[2]], [1, 1, 1], [0.6, 0.6, 0.6], 18, qn, 0, 0.35);
  b.nickel = E.batch(nk, new Float32Array(n));
  // dynamic: the Earth (and its copies), trails, rings, markers
  b.earth = E.batch(E.mesh('sphereMd', () => meshSphere(28, 40)), new Float32Array(2 * 20), true); b.earth.kinds = [17];
  b.minis = E.batch(E.mesh('sphereLo', () => meshSphere(7, 10)), new Float32Array(2600 * 20), true); b.minis.kinds = [17]; b.minis.shadow = false;
  b.fx = E.batch(box, new Float32Array(4000 * 20), true); b.fx.kinds = [2]; b.fx.shadow = false; b.fx.refl = false;
  return b;
}

// town around the street (aerial shots): a house on every lot along the other avenues
export function buildTown(E) {
  const box = E.mesh('box', meshBox); const R = rng(77);
  const a = [], w = [];
  for (let k = -10; k <= 10; k++) {
    const ax = k * ROAD.AS; if (k === 0) continue;
    for (let z = -1700; z <= 1700; z += 26) for (const side of [-1, 1]) {
      const zz = z + (R() - 0.5) * 4; const rel = ((zz - ROAD.org[1]) % ROAD.SS + ROAD.SS) % ROAD.SS;
      if (Math.abs(rel - ROAD.SS / 2) > ROAD.SS / 2 - 14) continue;
      if (Math.hypot(ax, zz) > 1900 + R() * 300) continue;
      const x = ax + side * (17 + R() * 3); const ww = 9 + R() * 4, d = 9 + R() * 2, h = 5 + R() * 1.4;
      pushInst(a, [x + side * d / 2, h / 2, zz], [d, h + 1.6, ww], SIDING[Math.floor(R() * SIDING.length)], 0, undefined, 0, 0.85);
      if (R() < 0.75) pushInst(w, [x - side * 0.03, 2.2, zz], [0.1, 1.4, ww * 0.6], WARM, 2, undefined, 0, 0.3, [0.7 + R(), 0, 0, 0]);
    }
  }
  const b = { houses: E.batch(box, new Float32Array(a)), wins: E.batch(box, new Float32Array(w)) };
  b.houses.shadow = false; b.wins.shadow = false; return b;
}

// red dwarf + globe
export function buildSpace(E) {
  const sphHi = E.mesh('sphereHi', () => meshSphere(48, 72));
  const s = []; pushInst(s, [0, 0, 0], [100, 100, 100], [1, 1, 1], 14, undefined, 0, 0.5, [1.25, 1, 0, 0]);
  const red = E.batch(sphHi, new Float32Array(s)); red.shadow = false;
  const g = E.batch(E.mesh('sphereGl', () => meshSphere(96, 144)), new Float32Array(20), true); g.kinds = [17]; g.shadow = false;
  return { red, globe: g };
}

// ---------- helpers ----------
export function pushRing(a, c, r, w, col, I, n = 96, y = null) {
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
    pushBar(a, [c[0] + Math.cos(a0) * r, y ?? c[1], c[2] + Math.sin(a0) * r], [c[0] + Math.cos(a1) * r, y ?? c[1], c[2] + Math.sin(a1) * r], w, col, 2, 0, 0.5, [I, 0, 0, 0]);
  }
}
export function latLon(lat, lon, r = 1) { // globe local coordinates (matches the planet shader's uv mapping)
  const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
  return [Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r];
}
export function rotAxis(v, ax, ang) { // Rodrigues
  const k = V3.norm(ax), c = Math.cos(ang), s = Math.sin(ang), d = V3.dot(k, v);
  const cr = V3.cross(k, v);
  return [v[0] * c + cr[0] * s + k[0] * d * (1 - c), v[1] * c + cr[1] * s + k[1] * d * (1 - c), v[2] * c + cr[2] * s + k[2] * d * (1 - c)];
}
