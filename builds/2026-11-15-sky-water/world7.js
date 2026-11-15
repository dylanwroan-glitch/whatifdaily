// world7.js — "What if all the water in the sky fell at once?": a city under a storm deck, one big fair-weather cumulus,
// Earth from orbit, a rain-lashed ocean, a desert, the sky's water as one cube beside a Lake Superior cube, and a curb with a
// ruler for the flood. All original and procedural (meters).
import { pushInst, pushBar, meshBox, meshFace, meshSphere, meshLathe, V3, quatAxis, quatMul, quatFromTo } from './engine.js';

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const qx = (a) => quatAxis([1, 0, 0], a), qy = (a) => quatAxis([0, 1, 0], a), qz = (a) => quatAxis([0, 0, 1], a);
export const Q0 = [0, 0, 0, 1];
export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function dyn(E, mesh, cap, kinds, add = false) {
  const b = E.batch(mesh, new Float32Array(cap * 20), true); b.cap = cap; b.buf = new Float32Array(cap * 20); b.count = 0; b.kinds = kinds;
  b.add = add; if (add) { b.shadow = false; b.refl = false; } return b;
}
export function fill(E, b, arr) { const n = Math.min(b.cap, arr.length / 20); b.buf.set(arr.length > b.cap * 20 ? arr.slice(0, b.cap * 20) : arr); E.updateBatch(b, b.buf, n); return n; }
export function stat(E, mesh, arr, add = false) { const b = E.batch(mesh, new Float32Array(arr)); b.add = add; b.shadow = false; if (add) b.refl = false; return b; }
export function quatFromBasis(x, y, z) {
  const m00 = x[0], m10 = x[1], m20 = x[2], m01 = y[0], m11 = y[1], m21 = y[2], m02 = z[0], m12 = z[1], m22 = z[2];
  const tr = m00 + m11 + m22; let qw, qx2, qy2, qz2;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; qw = 0.25 * s; qx2 = (m21 - m12) / s; qy2 = (m02 - m20) / s; qz2 = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; qw = (m21 - m12) / s; qx2 = 0.25 * s; qy2 = (m01 + m10) / s; qz2 = (m02 + m20) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; qw = (m02 - m20) / s; qx2 = (m01 + m10) / s; qy2 = 0.25 * s; qz2 = (m12 + m21) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; qw = (m10 - m01) / s; qx2 = (m02 + m20) / s; qy2 = (m12 + m21) / s; qz2 = 0.25 * s; }
  return [qx2, qy2, qz2, qw];
}
export function billQ(cam, p, up = [0, 1, 0]) { // camera-facing quad; `up` sets the in-plane roll
  const z = V3.norm(V3.sub(cam, p)); let x = V3.cross(up, z); if (V3.len(x) < 1e-6) x = V3.cross([1, 0, 0], z); x = V3.norm(x); const y = V3.cross(z, x);
  return quatFromBasis(x, y, z);
}
export function meshes(E) {
  return {
    box: E.mesh('box', meshBox), face: E.mesh('face', () => meshFace(4)), sph: E.mesh('sph', () => meshSphere(12, 18)),
    sphMd: E.mesh('sphMd', () => meshSphere(64, 96)), cyl: E.mesh('cyl', () => meshLathe([[0.5, 0], [0.5, 1]], 24)),
    shaft: E.mesh('shaft', () => meshLathe([[0.55, 0], [0.5, 0.5], [0.44, 1]], 28, { caps: false })),
  };
}
const puff = (a, p, s, col, seed, ns = 1, under = 0.6, glow = 1, cu = 0) => pushInst(a, p, s, col, 13, Q0, seed, 0.9, [glow, ns, under, cu]);
const cuPuff = (a, p, s, seed, under = 0.62, ns = 1) => puff(a, p, s, [0.94, 0.95, 0.97], seed, ns, under, 1, 1);
// storm-cloud base seen from below (one big plane): e0 = luminance, e1 = pattern scale, e2 = lightning response
export function ceiling(a, y, col, lum, sc = 1, size = 600000, c = [0, -8000]) { pushInst(a, [c[0], y, c[1]], [size, 20, size], col, 41, Q0, 0, 0.9, [lum, sc, 1, 0]); }
// a dune field as one heightfield mesh: transverse ridges with a gentle windward side and a steep lee side (meters)
export function meshDunes(N, Wm, amp) {
  const v = [], idx = [];
  const H = (X, Z) => { const a = X / 520 + 0.35 * Math.sin(Z / 900) + 0.12 * Math.sin(Z / 260 + 1.3);
    const ph = a - Math.floor(a); const prof = ph < 0.78 ? ph / 0.78 : (1 - ph) / 0.22; const sm = prof * prof * (3 - 2 * prof);
    return amp * (0.55 + 0.45 * Math.sin(Z / 1700 + X / 3100)) * sm + 6 * Math.sin(X / 140 + Z / 210) * Math.sin(Z / 170); };
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const x = i / N - 0.5, z = j / N - 0.5; const X = x * Wm, Z = z * Wm; const h = H(X, Z); const e = 2;
    const dx = (H(X + e, Z) - H(X - e, Z)) / (2 * e), dz = (H(X, Z + e) - H(X, Z - e)) / (2 * e);
    const n = V3.norm([-dx, 1, -dz]);
    v.push(x, h, z, n[0] * Wm, n[1], n[2] * Wm, i / N, j / N);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const a = i * (N + 1) + j, b = a + N + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  return { v: new Float32Array(v), i: new Uint16Array(idx) };
}

// ======================= city (avenues every 120 m along z, streets every 84 m along x) =======================
export const ROAD = [120, 22, 84, 14];
export function buildCity(E, M) {
  const R = rng(715); const bld = [], gnd = [];
  const PAL = [[0.25, 0.26, 0.28], [0.3, 0.25, 0.21], [0.2, 0.23, 0.28], [0.34, 0.33, 0.31], [0.16, 0.17, 0.19], [0.27, 0.29, 0.32], [0.38, 0.36, 0.33]];
  let seed = 40;
  for (let i = -11; i <= 10; i++) for (let j = -16; j <= 15; j++) {
    const cx = (i + 0.5) * 120, cz = (j + 0.5) * 84; const hx = 44, hz = 30;
    const r = Math.hypot(cx - 60, cz + 900); const f = Math.exp(-Math.pow(r / 1100, 2));
    const n = 1 + ((R() * 2.6) | 0); let x = cx - hx;
    for (let k = 0; k < n; k++) {
      const w = k === n - 1 ? cx + hx - x : (2 * hx / n) * (0.75 + 0.5 * R());
      let h = 16 + (30 + 210 * f) * Math.pow(R(), 1.6); if (R() < 0.12 * f + 0.01) h = 150 + R() * 140 * (0.4 + f);
      const col = PAL[(R() * PAL.length) | 0].map(v => v * (0.85 + 0.3 * R()));
      const dd = 2 * hz * (0.72 + 0.28 * R()); const zz = cz + (R() - 0.5) * (2 * hz - dd);
      pushInst(bld, [x + w / 2, h / 2, zz], [w - 1.5, h, dd], col, 1, Q0, seed++, 0.75, [0.5 + 0.5 * R(), 1.2 * (0.7 + 0.6 * R()), R() < 0.45 ? 2.6 : 3.3, 0]);
      x += w;
    }
  }
  pushInst(gnd, [0, -0.5, 0], [9000, 1.0, 9000], [0.07, 0.07, 0.07], 10, Q0, 0, 0.9, [0, 0.35, 0, 0]);
  const gl2 = []; pushInst(gl2, [0, -0.8, 0], [9000, 1.0, 9000], [0.07, 0.07, 0.07], 10, Q0, 0, 0.9, [0, 0.35, 0, 0]);
  const B = { buildings: E.batch(M.box, new Float32Array(bld)), ground: stat(E, M.box, gnd), groundLow: stat(E, M.box, gl2) };
  B.groundLow.refl = false;
  B.buildings.shadow = false; B.ground.refl = false;
  // storm deck: low, dark, lumpy; a second higher layer for depth
  const d = []; ceiling(d, 760, [0.105, 0.112, 0.128], 1.0, 1.0);
  B.deck = stat(E, M.box, d); B.deck.refl = true;
  // rain shafts hanging from the deck (opaque, far away)
  const sh = [];
  for (let k = 0; k < 9; k++) { const x = -7000 + k * 1700 + (R() - 0.5) * 900, z = -4200 - R() * 5000; const r0 = 300 + R() * 450;
    pushInst(sh, [x, -5, z], [r0 * 2, 770, r0 * 2], [0.2, 0.215, 0.24], 15, Q0, k, 0.9); }
  B.shafts = stat(E, M.shaft, sh); B.shafts.refl = false;
  return B;
}

// ======================= one fair-weather cumulus over the city (about 1 km across) =======================
export const CU = [150, 0, -2300]; // the hero cloud's ground point (base at 1,330 m, about 1.2 km wide)
export const CU_LIST = (() => { const R = rng(9090); const L = [{ p: [CU[0], 1330, CU[2]], w: 1250, h: 980, seed: 0.37, dark: 0.15 }];
  for (let k = 0; k < 18; k++) { const ang = R() * Math.PI * 2, rr = 4500 + R() * 11000; const w = 500 + R() * 700;
    L.push({ p: [CU[0] + Math.cos(ang) * rr, 1350 + R() * 250, CU[2] + Math.sin(ang) * rr], w, h: w * 0.7, seed: R() * 9, dark: 0.1 }); }
  return L; })();
export function buildCumulus(E, M) {
  const B = { cloud: dyn(E, M.face, 24, [42]) }; B.cloud.cut = true; B.cloud.shadow = false; B.cloud.refl = false;
  B.motes = dyn(E, M.face, 420, [33], true);
  return B;
}

// ======================= Earth from orbit =======================
export const EARTH_R = 6.371e6;
export function buildGlobe(E, M) {
  const B = {}; B.earth = dyn(E, M.sphMd, 1, [17]); B.earth.shadow = false;
  B.atmo = dyn(E, M.sphMd, 2, [38], true); return B;
}

// ======================= open ocean under a storm =======================
export function buildOcean(E, M) {
  const R = rng(4411); const d = [], sh = [];
  ceiling(d, 620, [0.1, 0.108, 0.122], 1.0, 1.25);

  const B = { deck: stat(E, M.box, d) };
  B.deck.refl = true;
  B.tl = dyn(E, M.face, 60, [42]); B.tl.cut = true; B.tl.shadow = false; B.tl.refl = false; // time-lapse clouds that grow and fade
  return B;
}
export const TL_CLOUDS = (() => { const R = rng(5150); const P = [];
  for (let k = 0; k < 46; k++) { const cz = -1800 - R() * 12000; const cx = (R() - 0.5) * (2000 + -cz * 0.9); const w = 700 + R() * 900;
    P.push({ p: [cx, 900 + R() * 300, cz], w, h: w * 0.75, ph: R(), seed: R() * 9 }); }
  return P.sort((a, b) => a.p[2] - b.p[2]); })();

// ======================= desert dunes under a storm =======================
export function buildDesert(E, M) {
  const R = rng(2626); const g = [], dn = [], d = [], sh = [];
  pushInst(g, [0, -1, -20000], [90000, 2, 90000], [1, 1, 1], 26, Q0, 0, 0.9, [1, 0, 0, 0]);
  pushInst(dn, [0, -4, -3600], [9000, 1, 9000], [1, 1, 1], 26, qy(0.42), 0, 0.9, [1, 0, 0, 0]);
  ceiling(d, 1050, [0.13, 0.115, 0.105], 1.0, 0.9);

  const dm = E.mesh('dunes', () => meshDunes(230, 9000, 38));
  const B = { ground: stat(E, M.box, g), dunes: stat(E, dm, dn), deck: stat(E, M.box, d) };
  return B;
}

// ======================= the cubes: all the sky's water vs. Lake Superior =======================
export const SKY_SIDE = 23450;   // ∛(12,900 km³) = 23.45 km
export const LAKE_SIDE = 22960;  // ∛(12,100 km³) = 22.96 km
export const SKY_C = [0, 0, 0], LAKE_C = [SKY_SIDE / 2 + 9000 + LAKE_SIDE / 2, 0, 2500], CLOUD_MARK = [-21000, 1700, 19000];
export const Q_CLOUDS = (() => { const R = rng(3232); const L = [{ p: CLOUD_MARK, w: 2600, h: 1900, seed: 1.3, dark: 0.1 }];
  for (let k = 0; k < 100; k++) { const x = (R() - 0.5) * 200000, z = (R() - 0.5) * 200000; if (Math.abs(x - 10000) < 26000 && Math.abs(z) < 18000) continue;
    const w = 1500 + R() * 2400; L.push({ p: [x, 1500 + R() * 600, z], w, h: w * 0.72, seed: R() * 9, dark: 0.1 }); }
  return L; })();
export function buildCubes(E, M) {
  const R = rng(3131); const g = [], hills = [], cl = [], town = [];
  pushInst(g, [0, -1, 0], [900000, 2, 900000], [0.05, 0.075, 0.035], 11, Q0, 0, 0.95);
  for (let k = 0; k < 60; k++) { const a = R() * Math.PI * 2, rr = 30000 + R() * 160000; const w = 6000 + R() * 16000, h = 600 + R() * 1800;
    pushInst(hills, [Math.cos(a) * rr, -h * 0.3, Math.sin(a) * rr], [w, h * 2, w * (0.6 + 0.6 * R())], [0.06, 0.08, 0.045].map(v => v * (0.8 + 0.4 * R())), 11, qy(R() * 3), 0, 0.95); }

  // a small town at the foot of the sky cube, for scale
  for (let k = 0; k < 260; k++) { const x = -SKY_SIDE / 2 - 2500 - R() * 6000, z = SKY_SIDE / 2 + 1500 + R() * 7000 - 6000; const w = 30 + R() * 70, h = 12 + Math.pow(R(), 3) * 120;
    pushInst(town, [x, h / 2, z], [w, h, w * (0.6 + 0.8 * R())], [0.5, 0.48, 0.45].map(v => v * (0.7 + 0.5 * R())), 0, Q0, 0, 0.8); }
  const B = { ground: stat(E, M.box, g), hills: stat(E, M.sph, hills), town: stat(E, M.box, town) };
  B.clouds = dyn(E, M.face, 110, [42]); B.clouds.cut = true; B.clouds.shadow = false; B.clouds.refl = false;
  B.cube = dyn(E, M.box, 2, [39]); B.cube.cut = true; B.cube.shadow = false; B.cube.refl = false;
  B.lake = dyn(E, M.box, 2, [39]); B.lake.cut = true; B.lake.shadow = false; B.lake.refl = false;
  return B;
}

// ======================= the curb, a ruler and a shoe (the flood close-up) =======================
// The curb runs along z at the east edge of the avenue at x = 0: road edge x = 11, sidewalk from 11 to 15 at +0.15 m.
export const CURB_X = 11.0, RULER = [10.86, 0, 0.0], SHOE = [10.62, 0, 0.3];
export function buildStreet(E, M) {
  const a = [], s = [];
  pushInst(a, [8, -0.149, 0], [12, 0.302, 30], [1, 1, 1], 40, Q0, 0, 0.8, [0.6, 0, 0, 1]);                  // asphalt slab (close-up material), top at +0.002
  pushInst(a, [CURB_X + 0.15, 0.08, 0], [0.3, 0.16, 30], [0.58, 0.57, 0.55], 40, Q0, 0, 0.8, [0.5, 0, 0, 2]);   // curb
  pushInst(a, [CURB_X + 2.15, 0.075, 0], [3.7, 0.15, 30], [0.5, 0.5, 0.48], 40, Q0, 0, 0.8, [0.5, 0, 0, 2]);  // sidewalk
  for (let z = -14; z <= 14; z += 1.6) pushInst(a, [CURB_X + 2.15, 0.151, z], [3.7, 0.002, 0.012], [0.2, 0.2, 0.2], 0, Q0, 0, 0.9); // slab joints
  // storm drain grate in the gutter
  pushInst(a, [CURB_X - 0.28, 0.0025, -1.4], [0.5, 0.004, 0.9], [0.04, 0.04, 0.045], 0, Q0, 0, 0.5);
  for (let k = 0; k < 9; k++) pushInst(a, [CURB_X - 0.28, 0.003, -1.8 + k * 0.1], [0.42, 0.004, 0.035], [0.005, 0.005, 0.006], 0, Q0, 0, 0.9);
  // ruler: 30 cm, standing on the asphalt in front of the curb, face toward -x
  pushInst(s, [RULER[0], 0.15, RULER[2]], [0.032, 0.30, 0.0035], [1, 1, 1], 40, qy(-Math.PI / 2), 0, 0.5, [0, 0, 0, 0]);
  const B = { street: stat(E, M.box, a), props: stat(E, M.box, s) };
  B.street.refl = false; B.props.refl = true;
  B.drops = dyn(E, M.face, 520, [33], true);
  return B;
}
