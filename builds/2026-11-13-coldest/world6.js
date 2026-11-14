// world6.js — "Where's the coldest place in the universe?": an Antarctic research station at night under an aurora,
// Pluto and Charon, the Boomerang Nebula, Earth with a space station, and the inside of a cold-atom lab. Original, procedural.
import { pushInst, pushBar, meshBox, meshFace, meshSphere, meshLathe, V3, quatAxis, quatMul, quatFromTo } from './engine.js';

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const qx = (a) => quatAxis([1, 0, 0], a), qy = (a) => quatAxis([0, 1, 0], a), qz = (a) => quatAxis([0, 0, 1], a);
export const Q0 = [0, 0, 0, 1];
export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function dyn(E, mesh, cap, kinds, add = false) {
  const b = E.batch(mesh, new Float32Array(cap * 20), true); b.cap = cap; b.buf = new Float32Array(cap * 20); b.count = 0; b.kinds = kinds;
  b.add = add; if (add) { b.shadow = false; b.refl = false; } return b;
}
export function fill(E, b, arr) { const n = Math.min(b.cap, arr.length / 20); b.buf.set(arr.length > b.cap * 20 ? arr.slice(0, b.cap * 20) : arr); E.updateBatch(b, b.buf, n); return n; }
export function stat(E, mesh, arr, add = false) { const b = E.batch(mesh, new Float32Array(arr)); b.add = add; if (add) { b.shadow = false; b.refl = false; } return b; }

// quaternion from an orthonormal basis (columns x, y, z)
export function quatFromBasis(x, y, z) {
  const m00 = x[0], m10 = x[1], m20 = x[2], m01 = y[0], m11 = y[1], m21 = y[2], m02 = z[0], m12 = z[1], m22 = z[2];
  const tr = m00 + m11 + m22; let qw, qx2, qy2, qz2;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; qw = 0.25 * s; qx2 = (m21 - m12) / s; qy2 = (m02 - m20) / s; qz2 = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; qw = (m21 - m12) / s; qx2 = 0.25 * s; qy2 = (m01 + m10) / s; qz2 = (m02 + m20) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; qw = (m02 - m20) / s; qx2 = (m01 + m10) / s; qy2 = 0.25 * s; qz2 = (m12 + m21) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; qw = (m10 - m01) / s; qx2 = (m02 + m20) / s; qy2 = (m12 + m21) / s; qz2 = 0.25 * s; }
  return [qx2, qy2, qz2, qw];
}
// camera-facing quad orientation; `up` sets the in-plane roll (projected onto the view plane)
export function billQ(cam, p, up = [0, 1, 0]) {
  const z = V3.norm(V3.sub(cam, p)); let x = V3.cross(up, z); if (V3.len(x) < 1e-6) x = V3.cross([1, 0, 0], z); x = V3.norm(x); const y = V3.cross(z, x);
  return quatFromBasis(x, y, z);
}

export function meshes(E) {
  return {
    box: E.mesh('box', meshBox), face: E.mesh('face', () => meshFace(4)), sph: E.mesh('sph', () => meshSphere(14, 20)),
    sphMd: E.mesh('sphMd', () => meshSphere(64, 96)), sphHi: E.mesh('sphHi', () => meshSphere(128, 192)),
    cyl: E.mesh('cyl', () => meshLathe([[0.5, 0], [0.5, 1]], 28)),
    coil: E.mesh('coil', () => meshLathe([[0.36, 0], [0.5, 0], [0.5, 0.3], [0.36, 0.3], [0.36, 0]], 40, { caps: false })),
    cone: E.mesh('cone', () => meshLathe([[0.5, 0], [0.22, 1]], 24)),
  };
}

// ======================= A: Antarctic station at night =======================
export const STATION = { screen: [1.6, 0, -25], mast: [-3, 0, -24], radio: [32, 0, -10] };
export const AURORA = [ // [x, y, z, width, height, yaw, seed, intensity]
  [-700, 1050, -2700, 5200, 1700, 0.12, 0.3, 1.0], [1700, 1250, -3900, 6200, 1900, -0.22, 1.7, 0.8], [-2900, 950, -1900, 3600, 1300, 0.65, 3.1, 0.7], [3200, 900, -1600, 3000, 1100, -0.8, 5.2, 0.5],
];
export function buildStation(E, M) {
  const R = rng(1313); const a = [], snow = [], win = [], glow = [], aur = [];
  pushInst(snow, [0, -0.5, -2000], [24000, 1, 24000], [0.72, 0.74, 0.78], 37, Q0, 0, 0.8, [0.9, 0, 0, 0]);
  const BLD = [
    { p: [0, 0, 0], s: [26, 4.6, 9], col: [0.6, 0.12, 0.05] }, { p: [-22, 0, 6], s: [12, 3.6, 7], col: [0.66, 0.55, 0.15] },
    { p: [20, 0, 10], s: [13, 5.2, 10], col: [0.2, 0.28, 0.4] }, { p: [-9, 0, -17], s: [5, 2.8, 4], col: [0.62, 0.14, 0.07] },
  ];
  for (const b of BLD) {
    const [x, , z] = b.p, [w, h, d] = b.s;
    pushInst(a, [x, h / 2, z], [w, h, d], b.col, 0, Q0, 0, 0.85);
    pushInst(snow, [x, h + 0.28, z], [w + 0.5, 0.56, d + 0.5], [1, 1, 1], 37, Q0, 0, 0.8, [0.4, 0, 0, 0]);
    // snow drift piled against the windward (-x) wall and along the back
    pushInst(snow, [x - w / 2 - 0.6, 0.6, z], [3.2, 2.0, d * 1.25], [1, 1, 1], 37, Q0, 0, 0.8, [0.4, 0, 0, 0]);
    pushInst(snow, [x, 0.35, z - d / 2 - 0.9], [w * 1.05, 1.1, 2.4], [1, 1, 1], 37, Q0, 0, 0.8, [0.4, 0, 0, 0]);
    // windows on both long faces, door on the front
    const nw = Math.max(2, Math.floor(w / 3.4));
    for (const side of [1, -1]) for (let k = 0; k < nw; k++) {
      const wx = x - w / 2 + (k + 0.5) * w / nw; const on = R() < 0.75; const I = on ? 1.6 + R() * 1.6 : 0;
      pushInst(win, [wx, h * 0.55, z + side * (d / 2 + 0.03)], [1.1, 0.9, 0.08], on ? [1.0, 0.7, 0.38] : [0.05, 0.06, 0.08], 2, Q0, 0, 0.3, [I, 0, 0, 0]);
    }
    pushInst(a, [x + w * 0.3, 1.05, z + d / 2 + 0.05], [1.0, 2.1, 0.1], [0.12, 0.12, 0.13], 0, Q0, 0, 0.6);
    pushInst(glow, [x + w * 0.3, 2.45, z + d / 2 + 0.25], [0.5, 0.18, 0.3], [1.0, 0.82, 0.55], 2, Q0, 0, 0.3, [5.0, 0, 0, 0]);
  }
  // weather mast with anemometer and wind vane
  const [mx, , mz] = STATION.mast;
  pushBar(a, [mx, 0, mz], [mx, 9.5, mz], 0.12, [0.7, 0.7, 0.72], 0, 0, 0.5);
  for (let k = 0; k < 3; k++) { const ang = k * 2.094 + 0.3; const e = [mx + Math.cos(ang) * 0.6, 9.6, mz + Math.sin(ang) * 0.6];
    pushBar(a, [mx, 9.6, mz], e, 0.04, [0.7, 0.7, 0.72], 0, 0, 0.5); pushInst(a, e, [0.16, 0.16, 0.16], [0.75, 0.75, 0.78], 0, Q0, 0, 0.5); }
  pushBar(a, [mx - 0.8, 8.8, mz], [mx + 0.8, 8.8, mz], 0.05, [0.7, 0.7, 0.72], 0, 0, 0.5);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pushBar(a, [mx, 6, mz], [mx + sx * 3.5, 0, mz + sz * 3.5], 0.015, [0.35, 0.35, 0.36], 0, 0, 0.5); // guy wires
  // the thermometer screen (white louvred box on legs) — the instrument that logs the air temperature
  const [sx0, , sz0] = STATION.screen;
  for (const ox of [-0.35, 0.35]) for (const oz of [-0.28, 0.28]) pushBar(a, [sx0 + ox, 0, sz0 + oz], [sx0 + ox, 1.25, sz0 + oz], 0.05, [0.8, 0.8, 0.82], 0, 0, 0.6);
  pushInst(a, [sx0, 1.6, sz0], [0.95, 0.72, 0.72], [0.86, 0.88, 0.9], 0, Q0, 0, 0.7);
  for (let k = 0; k < 6; k++) for (const s of [1, -1]) pushInst(a, [sx0, 1.3 + k * 0.11, sz0 + s * 0.365], [0.9, 0.025, 0.02], [0.45, 0.47, 0.5], 0, Q0, 0, 0.7);
  pushInst(a, [sx0, 2.0, sz0], [1.15, 0.06, 0.9], [0.88, 0.9, 0.92], 0, Q0, 0, 0.7);
  pushInst(snow, [sx0, 2.06, sz0], [1.12, 0.05, 0.86], [1, 1, 1], 37, Q0, 0, 0.8, [0.6, 0, 0, 0]);
  // radio mast: three-leg lattice with a red beacon
  const [rx, , rz] = STATION.radio; const H = 30, rr = 0.7;
  const leg = (k, y) => [rx + Math.cos(k * 2.094) * rr, y, rz + Math.sin(k * 2.094) * rr];
  for (let k = 0; k < 3; k++) pushBar(a, leg(k, 0), leg(k, H), 0.08, [0.75, 0.2, 0.15], 0, 0, 0.6);
  for (let y = 0; y < H; y += 1.5) for (let k = 0; k < 3; k++) pushBar(a, leg(k, y), leg((k + 1) % 3, y + 1.5), 0.035, [0.8, 0.8, 0.8], 0, 0, 0.6);
  pushInst(glow, [rx, H + 0.3, rz], [0.5, 0.5, 0.5], [1.0, 0.1, 0.05], 2, Q0, 0, 0.3, [9, 0, 0, 0]);
  // fuel tanks
  for (let k = 0; k < 3; k++) pushInst(a, [-38, 1.55, -9 + k * 3.6], [3.1, 9, 3.1], [0.72, 0.73, 0.7], 0, qz(Math.PI / 2), 0, 0.5);
  // tracked vehicle
  pushInst(a, [9, 1.65, -9], [4.2, 1.5, 2.5], [0.85, 0.36, 0.05], 0, Q0, 0, 0.6);
  pushInst(a, [10.3, 2.9, -9], [1.7, 1.2, 2.3], [0.85, 0.36, 0.05], 0, Q0, 0, 0.6);
  pushInst(win, [11.17, 3.0, -9], [0.05, 0.7, 1.9], [0.3, 0.45, 0.6], 0, Q0, 0, 0.2);
  for (const s of [-1, 1]) { pushInst(a, [9, 0.5, -9 + s * 1.15], [4.6, 1.0, 0.65], [0.08, 0.08, 0.08], 0, Q0, 0, 0.9);
    pushInst(glow, [11.2, 1.9, -9 + s * 0.8], [0.12, 0.25, 0.35], [1.0, 0.95, 0.85], 2, Q0, 0, 0.3, [6, 0, 0, 0]); }
  // path flags from the camera's approach to the main hall
  for (let k = 0; k < 14; k++) { const z = 70 - k * 4.6, x = -4 + Math.sin(k * 0.5) * 1.2;
    pushBar(a, [x, 0, z], [x, 1.7, z], 0.03, [0.15, 0.15, 0.15], 0, 0, 0.7); pushInst(a, [x + 0.22, 1.55, z], [0.42, 0.28, 0.02], [0.75, 0.05, 0.04], 0, Q0, 0, 0.7); }
  // floodlight poles
  for (const [x, z] of [[-6, 9], [12, 12], [-16, -4]]) { pushBar(a, [x, 0, z], [x, 6, z], 0.1, [0.25, 0.25, 0.27], 0, 0, 0.6);
    pushInst(glow, [x, 6.1, z + 0.2], [0.7, 0.35, 0.3], [1.0, 0.85, 0.6], 2, Q0, 0, 0.3, [6, 0, 0, 0]); }
  // aurora curtains (additive)
  for (const [x, y, z, w, h, yaw, seed, I] of AURORA) pushInst(aur, [x, y, z], [w, h, 0.001], [1, 1, 1], 33, qy(yaw), 0, 0.5, [2, 1.1 * I, seed, 0]);
  const B = {
    snow: E.batch(M.box, new Float32Array(snow)), solid: E.batch(M.box, new Float32Array(a)), win: E.batch(M.box, new Float32Array(win)),
    glow: E.batch(M.box, new Float32Array(glow)), aurora: stat(E, M.face, aur, true),
  };
  B.snow.shadow = false; B.win.shadow = false; B.glow.shadow = false;
  return B;
}
export const STATION_LIGHTS = [
  { p: [0, 3.5, 7], c: [1.0, 0.72, 0.45], i: 1.4, r: 22 }, { p: [-22, 3, 11], c: [1.0, 0.72, 0.45], i: 1.0, r: 16 }, { p: [20, 4, 16], c: [1.0, 0.72, 0.45], i: 1.0, r: 18 },
  { p: [-6, 6, 9.6], c: [1.0, 0.85, 0.6], i: 1.6, r: 26 }, { p: [12, 6, 12.6], c: [1.0, 0.85, 0.6], i: 1.3, r: 24 }, { p: [-16, 6, -3.4], c: [1.0, 0.85, 0.6], i: 1.4, r: 26 },
  { p: [1.6, 3.2, -22.5], c: [0.8, 0.9, 1.0], i: 0.9, r: 9 }, { p: [11.5, 1.9, -9], c: [1.0, 0.95, 0.85], i: 1.2, r: 14 },
];

// ======================= P: Pluto and Charon (Pluto radius = 100 units) =======================
export const PLUTO_R = 100, CHARON = [380, 400, -1400];
export function buildPluto(E, M) {
  const B = {};
  B.pluto = dyn(E, M.sphHi, 1, [35]); B.pluto.shadow = false;
  const c = []; pushInst(c, CHARON, [102, 102, 102], [1, 1, 1], 35, qy(0.4), 0, 0.9, [1, 1, 0, 0]); B.charon = stat(E, M.sphMd, c); B.charon.shadow = false;
  B.haze = dyn(E, M.sphMd, 1, [38], true);
  return B;
}

// ======================= N: Boomerang Nebula (stylized) =======================
export function buildStars(E, M) { // foreground stars for parallax in space shots (additive sprites, re-oriented every frame)
  return dyn(E, M.face, 700, [33], true);
}
export const STARFIELD = (() => { const R = rng(77); const P = []; for (let k = 0; k < 600; k++) { const u = R() * 2 - 1, th = R() * 6.2832, rr = 900 + R() * 5000; const s = Math.sqrt(1 - u * u);
  P.push({ p: [Math.cos(th) * s * rr, u * rr, Math.sin(th) * s * rr], size: 3 + R() * 9, col: R() < 0.2 ? [1.0, 0.8, 0.6] : R() < 0.5 ? [0.75, 0.85, 1.0] : [1, 1, 1], I: 0.6 + R() * 1.6 }); } return P; })();

// ======================= E: Earth and the space station (meters; station at the origin) =======================
export const EARTH_R = 6.371e6, ALT = 420e3, EARTH_C = [0, -(6.371e6 + 420e3), 0];
export function buildEarth(E, M) {
  const B = {};
  B.earth = dyn(E, M.sphMd, 1, [17]); B.earth.shadow = false;
  B.atmo = dyn(E, M.sphMd, 1, [38], true);
  return B;
}
export function buildStation3(E, M) { // a stylized orbiting laboratory: truss, 8 solar wings, radiators, a chain of modules
  const a = [], pan = [], mod = [], rad = [], bars = [];
  const TRUSS = [0.55, 0.56, 0.58];
  pushInst(a, [0, 0, 0], [104, 2.4, 2.8], TRUSS, 19, Q0, 0, 0.45, [2, 0.5, 0, 0]);
  for (let x = -50; x < 50; x += 4) { pushBar(bars, [x, 1.25, 1.45], [x + 4, -1.25, 1.45], 0.12, [0.4, 0.4, 0.42], 0, 0, 0.5); pushBar(bars, [x, -1.25, -1.45], [x + 4, 1.25, -1.45], 0.12, [0.4, 0.4, 0.42], 0, 0, 0.5); }
  const tilt = 0.5;
  for (const xw of [-52, -38, 38, 52]) for (const sz of [-1, 1]) {
    const zc = sz * 19.5;
    for (const ox of [-2.95, 2.95]) { // two blankets per wing
      const p = [xw + ox, 0, zc]; const pr = rotX(p, [xw, 0, 0], tilt);
      pushInst(pan, pr, [4.8, 0.08, 33], [1, 1, 1], 36, qx(tilt), 0, 0.4, [0, 0, 0, 0]);
    }
    pushBar(a, rotX([xw, 0, sz * 2.2], [xw, 0, 0], tilt), rotX([xw, 0, sz * 36.5], [xw, 0, 0], tilt), 0.28, [0.82, 0.82, 0.84], 0, 0, 0.5);
    pushInst(a, [xw, 0, 0], [2.4, 3.2, 3.6], TRUSS, 19, Q0, 0, 0.45, [2, 0.5, 0, 0]);
  }
  for (const xr of [-14, 14]) pushInst(rad, [xr, -1.2, 0], [12, 0.12, 3.2], [0.9, 0.9, 0.92], 36, qx(0.0), 0, 0.5, [2, 0, 0, 0]);
  for (const xr of [-24, 24]) for (const s of [-1, 1]) pushInst(rad, [xr, -4, s * 6.5], [2.8, 0.1, 10], [0.9, 0.9, 0.92], 36, qx(s * 0.2), 0, 0.5, [2, 0, 0, 0]);
  // modules along z, below the truss
  const US = [0.88, 0.89, 0.9], RU = [0.84, 0.83, 0.78];
  const modZ = (z0, z1, d, col, x = 0, y = -4.2) => pushInst(mod, [x, y, z0], [d, z1 - z0, d], col, 36, qx(Math.PI / 2), 0, 0.6, [1, 0, 0, 0]);
  modZ(1.5, 10.0, 4.3, US); modZ(10.0, 17.2, 4.4, US); modZ(-4.0, 1.5, 4.6, US); modZ(-16.5, -4.0, 4.1, RU); modZ(-29.5, -16.5, 4.2, RU);
  pushInst(mod, [2.2, -4.2, 13.6], [4.4, 11.0, 4.4], US, 36, qz(-Math.PI / 2), 0, 0.6, [1, 0, 0, 0]);   // side lab, +x
  pushInst(mod, [-2.2, -4.2, 13.6], [4.5, 7.0, 4.5], US, 36, qz(Math.PI / 2), 0, 0.6, [1, 0, 0, 0]);    // side lab, -x
  pushInst(mod, [0, -4.2, 17.2], [2.6, 2.4, 2.6], [0.7, 0.7, 0.72], 36, qx(Math.PI / 2), 0, 0.6, [1, 0, 0, 0]);
  pushInst(mod, [0, -4.2, -32.7], [2.6, 3.2, 2.6], [0.7, 0.7, 0.72], 36, qx(Math.PI / 2), 0, 0.6, [1, 0, 0, 0]);
  pushBar(a, [0, -1.2, 0], [0, -2.0, 0], 1.4, [0.7, 0.7, 0.7], 0, 0, 0.6);
  // the aft module's own small solar wings
  for (const s of [-1, 1]) pushInst(pan, [s * 9.5, -4.2, -23], [13, 0.06, 3.2], [1, 1, 1], 36, Q0, 0, 0.4, [0, 0, 0, 0]);
  // a docked capsule at the forward end
  pushInst(mod, [0, -4.2, 18.6], [2.4, 4.2, 2.4], [0.35, 0.37, 0.3], 36, qx(Math.PI / 2), 0, 0.6, [1, 0, 0, 0]);
  const B = { solid: E.batch(M.box, new Float32Array(a)), bars: E.batch(M.box, new Float32Array(bars)), panels: E.batch(M.box, new Float32Array(pan)), rads: E.batch(M.box, new Float32Array(rad)), mods: E.batch(M.cyl, new Float32Array(mod)) };
  return B;
}
function rotX(p, c, ang) { const y = p[1] - c[1], z = p[2] - c[2]; const cs = Math.cos(ang), sn = Math.sin(ang); return [p[0], c[1] + y * cs - z * sn, c[2] + y * sn + z * cs]; }

// ======================= L: inside the cold-atom lab (meters; the glass cell at the origin + 0.16 m) =======================
export const CELL = [0, 0.16, 0];
export const BEAMS = [[[0.34, 0.16, 0], [-0.34, 0.16, 0]], [[0, 0.16, 0.3], [0, 0.16, -0.3]], [[0.2, 0.46, 0.2], [-0.106, 0.0, -0.106]]];
export function buildLab(E, M) {
  const a = [], met = [], glass = [], coils = [], bb = [];
  pushInst(bb, [0, -0.015, 0], [1.1, 0.03, 0.8], [0.13, 0.13, 0.14], 22, Q0, 0, 0.6, [40, 0, 1, 0]);
  // glass cell on a steel stem + ion pump body
  pushInst(met, [0, 0.06, 0], [0.026, 0.12, 0.026], [0.62, 0.63, 0.66], 19, Q0, 1, 0.3, [1, 0.6, 0, 0]);
  pushInst(met, [0, 0.03, -0.2], [0.16, 0.06, 0.14], [0.5, 0.52, 0.56], 19, Q0, 2, 0.35, [2, 0.6, 0, 0]);
  pushBar(met, [0, 0.05, -0.13], [0, 0.05, -0.01], 0.022, [0.62, 0.63, 0.66], 19, 1, 0.3, [1, 0.6, 0, 0]);
  // anti-Helmholtz coils above and below the cell
  for (const y of [0.105, 0.19]) pushInst(coils, [0, y, 0], [0.13, 0.05, 0.13], [0.78, 0.42, 0.2], 19, Q0, 4, 0.35, [3, 1, 70, 0]);
  // beam launchers (fibre collimators on posts) at both ends of each beam
  for (const [A, B2] of BEAMS) for (const P of [A, B2]) {
    const d = V3.norm(V3.sub(CELL, P)); const q = quatFromTo([0, 1, 0], d);
    pushInst(met, P, [0.03, 0.06, 0.03], [0.3, 0.31, 0.33], 19, q, 5, 0.35, [1, 0.5, 0, 0]);
    pushInst(glass, V3.add(P, V3.scale(d, 0.032)), [0.026, 0.006, 0.026], [1, 1, 1], 21, q, 6, 0.2, [0.1, 0.3, 0, 0]);
    if (P[1] > 0.02) pushBar(met, [P[0], 0, P[2]], [P[0], P[1] - 0.03, P[2]], 0.012, [0.55, 0.56, 0.6], 19, 7, 0.35, [1, 0.5, 0, 0]);
  }
  // cables and small optics around the edges
  const R = rng(9);
  for (let k = 0; k < 14; k++) { const x = (R() - 0.5) * 0.9, z = (R() - 0.5) * 0.65; if (Math.hypot(x, z) < 0.3) continue;
    pushInst(met, [x, 0.03, z], [0.025, 0.06, 0.025], [0.25, 0.26, 0.28], 19, Q0, k, 0.4, [1, 0.5, 0, 0]);
    pushInst(glass, [x, 0.07, z], [0.022, 0.022, 0.004], [1, 1, 1], 21, qy(R() * 3), k, 0.2, [0.1, 0.25, 0, 0]); }
  // enclosure walls (dark brushed metal)
  pushInst(a, [0, 0.3, -0.42], [1.2, 0.7, 0.02], [0.035, 0.04, 0.05], 19, Q0, 0, 0.4, [2, 0.4, 0, 0]);
  pushInst(a, [-0.58, 0.3, 0], [0.02, 0.7, 0.86], [0.035, 0.04, 0.05], 19, Q0, 0, 0.4, [2, 0.4, 0, 0]);
  const B = { bb: E.batch(M.box, new Float32Array(bb)), met: E.batch(M.box, new Float32Array(met)), glass: E.batch(M.box, new Float32Array(glass)),
    coils: E.batch(M.coil, new Float32Array(coils)), walls: E.batch(M.box, new Float32Array(a)) };
  const cg = []; pushInst(cg, CELL, [0.034, 0.07, 0.034], [0.55, 0.75, 1.0], 38, Q0, 0, 0.5, [0.5, 1.5, 0, 0]); B.cell = stat(E, M.box, cg, true);
  const fr = []; const hx = 0.017, hy = 0.035;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pushBar(fr, [sx * hx, CELL[1] - hy, sz * hx], [sx * hx, CELL[1] + hy, sz * hx], 0.0012, [0.7, 0.8, 0.9], 19, 0, 0.3, [0, 0.3, 0, 0]);
  for (const y of [-hy, hy]) for (const s2 of [-1, 1]) { pushBar(fr, [-hx, CELL[1] + y, s2 * hx], [hx, CELL[1] + y, s2 * hx], 0.0012, [0.7, 0.8, 0.9], 19, 0, 0.3, [0, 0.3, 0, 0]); pushBar(fr, [s2 * hx, CELL[1] + y, -hx], [s2 * hx, CELL[1] + y, hx], 0.0012, [0.7, 0.8, 0.9], 19, 0, 0.3, [0, 0.3, 0, 0]); }
  B.frame = E.batch(M.box, new Float32Array(fr));
  B.beams = dyn(E, M.box, 12, [2]); B.beams.shadow = false;
  B.atoms = dyn(E, M.face, 700, [33], true);
  return B;
}
