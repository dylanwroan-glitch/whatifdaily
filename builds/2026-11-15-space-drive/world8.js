// world8.js — "Space is only 1 hour away by car": a highway whose road curls up into the sky, a red car, a cloud layer,
// Everest-height peaks, Earth's curve from 50 and 100 km, the space station, the Moon, and an orbit diagram.
// All original and procedural (meters).
import { pushInst, pushBar, meshBox, meshFace, meshSphere, meshLathe, V3, quatAxis, quatMul, quatFromTo, qrot } from './engine.js';

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
    sphMd: E.mesh('sphMd', () => meshSphere(64, 96)), sphHi: E.mesh('sphHi', () => meshSphere(128, 256)),
    cyl: E.mesh('cyl', () => meshLathe([[0.5, 0], [0.5, 1]], 20)),
    cone: E.mesh('cone', () => meshLathe([[0.5, 0], [0.02, 1]], 12)),
  };
}
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

// ======================= the road: a highway along -z that curls up into a vertical ribbon =======================
export const RR = 70, ARC = Math.PI * RR / 2; // ramp radius (m) and the arc's length
export function roadAt(s) { // road surface point, forward f and surface normal u at distance s (the ramp starts at s = 0, z = 0)
  if (s <= 0) return { p: [0, 0.02, -s], f: [0, 0, -1], u: [0, 1, 0], th: 0 };
  if (s <= ARC) { const th = s / RR; const c = Math.cos(th), n = Math.sin(th);
    return { p: [0, RR * (1 - c) + 0.02 * c, -RR * n + 0.02 * n], f: [0, n, -c], u: [0, c, n], th }; }
  return { p: [0, RR + (s - ARC), -RR + 0.02], f: [0, 1, 0], u: [0, 0, 1], th: Math.PI / 2 };
}
export const frameQ = (f, u) => quatFromBasis(V3.cross(f, u), u, sc(f, -1)); // local x = right, y = up (road normal), -z = forward
const ASPH = [0.055, 0.056, 0.06], LINE = [0.86, 0.86, 0.82], GLOW = [0.35, 0.8, 1.0];

export function buildRoad(E, M) {
  const R = rng(808); const g = [], rd = [], ln = [], glow = [], trees = [], hills = [], piers = [];
  // ground: wide prairie, a darker band of fields, distant hills
  for (let i = -30; i < 30; i++) for (let j = -30; j < 30; j++) { const T = Math.max(Math.abs(i + 0.5), Math.abs(j + 0.5)) < 12 ? 1 : 0; if (!T && (i % 2 || j % 2)) continue; const sz = T ? 400 : 800;
    pushInst(g, [(i + (T ? 0.5 : 1)) * 400, -0.85, (j + (T ? 0.5 : 1)) * 400], [sz, 1.0, sz], [0.05, 0.13, 0.035], 11, Q0, 0, 0.95); }
  for (let k = 0; k < 14; k++) { const w = 120 + R() * 380; const x = (k % 2 ? 1 : -1) * (w / 2 + 16 + R() * 700), z = 1400 - k * 260 - R() * 120;
    pushInst(g, [x, -0.83, z], [w, 1.0, 90 + R() * 200], [0.045 + R() * 0.04, 0.11 + R() * 0.05, 0.03], 11, qy(R() * 0.3 - 0.15), 0, 0.95); }
  for (let k = 0; k < 46; k++) { const a = R() * Math.PI * 2, rr = 9000 + R() * 16000; const w = 1500 + R() * 3500, h = 200 + R() * 700;
    pushInst(hills, [Math.cos(a) * rr, -h * 0.35, Math.sin(a) * rr], [w, h * 2, w * (0.5 + 0.7 * R())], [0.1, 0.15, 0.06].map(v => v * (0.8 + 0.4 * R())), 11, qy(R() * 3), 0, 0.95); }
  // the straight highway (s < 0, z from 0 to +1500)
  for (let z = 25; z < 1500; z += 50) { pushInst(rd, [0, -0.28, z], [12, 0.6, 50.02], ASPH, 0, Q0, 0, 0.9);
    for (const x of [-7, 7]) pushInst(rd, [x, -0.25, z], [2, 0.5, 50.02], [0.13, 0.12, 0.1], 0, Q0, 0, 0.95);   // gravel shoulders
    for (const x of [-5.4, 5.4]) pushInst(ln, [x, 0.03, z], [0.18, 0.02, 50.02], LINE, 0, Q0, 0, 0.6); }
  for (let z = 4; z < 1500; z += 10) pushInst(ln, [0, 0.03, z], [0.16, 0.02, 3.2], LINE, 0, Q0, 0, 0.6);
  // the arc: 1 m segments; lines and lights follow it
  for (let s = 0; s < ARC; s += 1.0) {
    const r0 = roadAt(s + 0.5); const q = frameQ(r0.f, r0.u);
    pushInst(rd, add(r0.p, sc(r0.u, -0.17)), [12, 0.34, 1.08], ASPH, 0, q, 0, 0.9);
    for (const x of [-5.4, 5.4]) pushInst(ln, add(add(r0.p, [x, 0, 0]), sc(r0.u, 0.012)), [0.18, 0.02, 1.08], LINE, 0, q, 0, 0.6);
    if (s % 10 < 3.0) pushInst(ln, add(r0.p, sc(r0.u, 0.012)), [0.16, 0.02, 1.08], LINE, 0, q, 0, 0.6);
    if (Math.round(s) % 6 === 0) for (const x of [-6.3, 6.3]) pushInst(glow, add(add(r0.p, [x, 0, 0]), sc(r0.u, 0.2)), [0.3, 0.3, 0.3], GLOW, 2, q, 0, 0.5, [5.0, 0, 0, 0]);
  }
  // concrete piers under the arc
  for (let s = 18; s < ARC * 0.7; s += 16) { const r0 = roadAt(s); const y = r0.p[1] - 0.4; if (y < 2) continue; pushInst(piers, [0, (y - 0.5) / 2, r0.p[2] + 1.0], [2.2, y + 0.5, 1.6], [0.2, 0.2, 0.21], 0, Q0, 0, 0.9); }
  // roadside trees along the straight
  const tr = [], cn = [];
  for (let k = 0; k < 90; k++) { const side = k % 2 ? 1 : -1; const z = 30 + k * 16 + R() * 10; const x = side * (13 + R() * 40); const h = 5 + R() * 6;
    pushInst(tr, [x, (h * 0.45 - 0.5) / 2, z], [0.5, h * 0.45 + 0.5, 0.5], [0.18, 0.12, 0.07], 0, Q0, 0, 0.9);
    pushInst(cn, [x, h * 0.62, z], [h * 0.75, h * 0.72, h * 0.75], [0.07, 0.14, 0.05].map(v => v * (0.75 + 0.5 * R())), 11, Q0, 0, 0.95); }
  const B = { ground: stat(E, M.box, g), hills: stat(E, M.sph, hills), road: stat(E, M.box, rd), lines: stat(E, M.box, ln), glow: stat(E, M.box, glow),
    trunks: stat(E, M.box, tr), canopy: stat(E, M.sph, cn), piers: stat(E, M.box, piers) };
  B.ribbon = dyn(E, M.box, 2600, [0, 2]); B.car = dyn(E, M.box, 32, [0, 2, 44]); B.wheels = dyn(E, M.cyl, 8, [44]);
  B.car.shadow = true; B.wheels.shadow = true;
  return B;
}
// the vertical section as seen from anywhere: y from y0 (its base) up to y1, surface plane z = zs; dashes and lights only near yc
export function ribbon(a, y0, y1, zs, yc, win = 700) {
  const q = frameQ([0, 1, 0], [0, 0, 1]);
  // long pieces, short near yc and growing with distance from it (SwiftShader drops giant near-clipped triangles)
  const cuts = [y0]; let y = y0;
  while (y < y1) { const d = Math.abs(y - yc); const L = Math.max(60, d * 0.3); y = Math.min(y1, y + L); cuts.push(y); }
  for (let i = 0; i + 1 < cuts.length; i++) { const A = cuts[i], B = cuts[i + 1], L = B - A + 0.02, ym = (A + B) / 2;
    pushInst(a, [0, ym, zs - 0.17], [12, 0.34, L], ASPH, 0, q, 0, 0.9);
    for (const x of [-5.4, 5.4]) pushInst(a, [x, ym, zs + 0.012], [0.18, 0.02, L], LINE, 0, q, 0, 0.6);
    for (const x of [-6.3, 6.3]) pushInst(a, [x, ym, zs + 0.2], [0.22, 0.22, L], GLOW, 2, q, 0, 0.5, [4.0, 0, 0, 0]); }
  const lo = Math.max(y0, yc - win), hi = Math.min(y1, yc + win);
  for (let y2 = Math.ceil(lo / 10) * 10; y2 < hi; y2 += 10) pushInst(a, [0, y2, zs + 0.012], [0.16, 0.02, 3.2], LINE, 0, q, 0, 0.6);
  for (let y2 = Math.ceil(lo / 6) * 6; y2 < hi; y2 += 6) for (const x of [-6.3, 6.3]) pushInst(a, [x, y2, zs + 0.2], [0.3, 0.3, 0.3], GLOW, 2, q, 0, 0.5, [5.0, 0, 0, 0]);
}
// the car: a red hatchback, forward = local -z; p = contact point on the road, q = frame
export const PAINT = [0.6, 0.03, 0.025];
export function car(a, w, p, q, opt = {}) {
  const part = (lp, s, col, kind, e = [0, 0, 0, 0], rough = 0.35) => pushInst(a, add(p, qrot(q, lp)), s, col, kind, q, 0, rough, e);
  const paint = opt.paint || PAINT;
  part([0, 0.64, 0], [1.84, 0.66, 4.3], paint, 44, [0, 0, 0, 0], 0.3);                  // body
  part([0, 0.98, 1.0], [1.8, 0.06, 2.0], paint, 44, [0, 0, 0, 0], 0.3);                 // shoulder line
  part([0, 1.27, 0.55], [1.56, 0.56, 2.3], [0.02, 0.02, 0.025], 44, [1, 0, 0, 0], 0.1);  // glasshouse
  part([0, 1.57, 0.6], [1.58, 0.07, 1.9], paint, 44, [0, 0, 0, 0], 0.3);                // roof
  part([0, 0.84, -1.55], [1.8, 0.08, 1.2], paint, 44, [0, 0, 0, 0], 0.3);               // hood
  part([0, 0.42, -2.18], [1.86, 0.3, 0.12], [0.03, 0.03, 0.035], 44, [2, 0, 0, 0]);       // bumpers
  part([0, 0.42, 2.18], [1.86, 0.3, 0.12], [0.03, 0.03, 0.035], 44, [2, 0, 0, 0]);
  part([0, 0.6, -2.2], [1.2, 0.22, 0.04], [0.02, 0.02, 0.022], 44, [2, 0, 0, 0]);                                  // grille
  for (const x of [-1.0, 1.0]) part([x, 1.08, -0.65], [0.18, 0.12, 0.22], paint, 44, [0, 0, 0, 0], 0.3);         // mirrors
  const hl = opt.lights ?? 1;
  for (const x of [-0.62, 0.62]) { part([x, 0.74, -2.16], [0.42, 0.15, 0.06], [1.0, 0.95, 0.86], 2, [3.5 * hl, 0, 0, 0]); part([x, 0.8, 2.16], [0.42, 0.13, 0.06], [1.0, 0.07, 0.04], 2, [2.6 * hl, 0, 0, 0]); }
  // wheels on the cylinder batch: axis along local x
  const qw = quatMul(q, qz(Math.PI / 2)); const spin = opt.spin || 0;
  for (const [x, z] of [[-0.93, -1.38], [0.93, -1.38], [-0.93, 1.38], [0.93, 1.38]]) {
    const lp = [x + 0.13, 0.34, z]; pushInst(w, add(p, qrot(q, lp)), [0.68, 0.26, 0.68], [0.03, 0.03, 0.03], 44, quatMul(qw, quatAxis([0, 1, 0], spin)), 0, 0.8, [2, 0, 0, 0]);
    const lr = [x + (x > 0 ? 0.15 : -0.13), 0.34, z]; pushInst(w, add(p, qrot(q, lr)), [0.4, 0.02, 0.4], [0.62, 0.63, 0.65], 44, qw, 0, 0.3, [3, 0, 0, 0]); }
}

// ======================= K: the cloud layer around 1.3 to 1.9 km =======================
export const CL_LIST = (() => { const R = rng(1717); const L = [];
  for (let k = 0; k < 70; k++) { const a = R() * Math.PI * 2, rr = 60 + Math.pow(R(), 0.8) * 9000; const w = 500 + R() * 900;
    L.push({ p: [Math.cos(a) * rr, 1250 + R() * 160, -RR + Math.sin(a) * rr], w, h: w * 0.36, seed: R() * 9, dark: 0.08 }); }
  return L.sort((x, y) => V3.len(y.p) - V3.len(x.p)); })();
export function buildClouds(E, M) { const B = { cloud: dyn(E, M.face, 80, [42]) }; B.cloud.cut = true; B.cloud.shadow = false; B.cloud.refl = false; return B; }

// ======================= E: peaks around 8.8 km =======================
export function meshPeak(N, Wm, Hm, seed) { // a ridged pyramid peak as one heightfield (x, z in [-0.5, 0.5] of Wm; y in meters)
  const v = [], idx = []; const R = rng(seed); const ph = [R() * 6, R() * 6, R() * 6, R() * 6];
  const H = (X, Z) => { const r = Math.hypot(X, Z) / (Wm * 0.5); const a = Math.atan2(Z, X);
    const ridges = 0.16 * Math.pow(Math.abs(Math.cos(a * 1.5 + ph[0])), 3) + 0.06 * Math.abs(Math.sin(a * 4 + ph[1]));
    let h = Math.pow(clamp(1 - r * (1 - ridges * 0.9), 0, 1), 1.45);
    const n = Math.sin(X / 210 + ph[2]) * Math.sin(Z / 170 + ph[3]) * 0.04 + Math.sin(X / 63 + Z / 81) * 0.012 + Math.abs(Math.sin(X / 37 - Z / 29)) * 0.01;
    return Hm * clamp(h + n * h, 0, 1.2); };
  let mx = 0; for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) mx = Math.max(mx, H((i / N - 0.5) * Wm, (j / N - 0.5) * Wm));
  const H0 = H; const Hs = (X, Z) => H0(X, Z) * Hm / mx;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const x = i / N - 0.5, z = j / N - 0.5; const X = x * Wm, Z = z * Wm; const h = Hs(X, Z); const e = 4;
    const dx = (Hs(X + e, Z) - Hs(X - e, Z)) / (2 * e), dz = (Hs(X, Z + e) - Hs(X, Z - e)) / (2 * e);
    const n = V3.norm([-dx, 1, -dz]); v.push(x, h, z, n[0] * Wm, n[1], n[2] * Wm, i / N, j / N);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const a = i * (N + 1) + j, b = a + N + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  return { v: new Float32Array(v), i: new Uint16Array(idx) };
}
export const PLATEAU = 5200, EVEREST = 8849, PEAK_C = [6600, PLATEAU, 1030];
export function buildPeaks(E, M) {
  const R = rng(4848); const p = [], g = [];
  const pm = E.mesh('peak', () => meshPeak(200, 9000, EVEREST - PLATEAU, 11));
  const pm2 = E.mesh('peak2', () => meshPeak(120, 8000, 2700, 23));
  pushInst(p, PEAK_C, [9000, 1, 9000], [1, 1, 1], 43, qy(0.5), 0, 0.9, [7200, 1, 0, 0]);
  const P2 = [];
  for (const [x, z, h, w] of [[-5200, -6500, 1.0, 1.0], [7400, -8200, 0.92, 1.1], [-9800, -1500, 0.85, 1.25], [3400, -12500, 0.95, 1.3], [-2500, -14500, 0.8, 1.4], [12500, -2600, 0.75, 1.2]])
    pushInst(P2, [x, PLATEAU - 100, z], [8000 * w, h, 8000 * w], [1, 1, 1], 43, qy(R() * 6), 0, 0.9, [7000, 1, 0, 0]);
  for (let i = -12; i < 12; i++) for (let j = -12; j < 12; j++) pushInst(g, [(i + 0.5) * 6000, PLATEAU - 60, (j + 0.5) * 6000], [6000, 2, 6000], [0.3, 0.29, 0.28], 43, Q0, 0, 0.9, [5000, 0.8, 0, 0]);
  const B = { peak: stat(E, pm, p), peaks: stat(E, pm2, P2), plateau: stat(E, M.box, g) };
  B.sea = dyn(E, M.face, 90, [42]); B.sea.cut = true; B.sea.shadow = false; B.sea.refl = false;
  return B;
}
export const SEA_LIST = (() => { const R = rng(5959); const L = [];
  for (let k = 0; k < 90; k++) { const a = R() * Math.PI * 2, rr = 1500 + Math.pow(R(), 0.7) * 30000; const w = 2500 + R() * 4000;
    L.push({ p: [Math.cos(a) * rr, 5600 + R() * 500, -RR + Math.sin(a) * rr], w, h: w * 0.45, seed: R() * 9, dark: 0.05 }); }
  return L.sort((x, y) => V3.len(y.p) - V3.len(x.p)); })();

// ======================= S / I / V: Earth below (car or station near the origin) =======================
export const EARTH_R = 6.371e6;
export function buildEarth(E, M) {
  const B = {}; B.earth = dyn(E, M.sphHi, 1, [17]); B.earth.shadow = false;
  B.atmo = dyn(E, M.sphHi, 2, [38], true);
  B.grid = dyn(E, M.face, 1700, [33], true);
  B.fx = dyn(E, M.face, 400, [33], true); // streaks, glows
  return B;
}
export function buildStation(E, M) { // a stylized orbiting laboratory: truss, 8 solar wings, radiators, a chain of modules (origin = truss centre)
  const a = [], pan = [], mod = [], rad = [], bars = [];
  const TRUSS = [0.55, 0.56, 0.58];
  pushInst(a, [0, 0, 0], [104, 2.4, 2.8], TRUSS, 19, Q0, 0, 0.45, [2, 0.5, 0, 0]);
  for (let x = -50; x < 50; x += 4) { pushBar(bars, [x, 1.25, 1.45], [x + 4, -1.25, 1.45], 0.12, [0.4, 0.4, 0.42], 0, 0, 0.5); pushBar(bars, [x, -1.25, -1.45], [x + 4, 1.25, -1.45], 0.12, [0.4, 0.4, 0.42], 0, 0, 0.5); }
  const tilt = 0.5;
  for (const xw of [-52, -38, 38, 52]) for (const sz of [-1, 1]) {
    const zc = sz * 19.5;
    for (const ox of [-2.95, 2.95]) { const pp = [xw + ox, 0, zc]; const pr = rotX(pp, [xw, 0, 0], tilt); pushInst(pan, pr, [4.8, 0.08, 33], [1, 1, 1], 36, qx(tilt), 0, 0.4, [0, 0, 0, 0]); }
    pushBar(a, rotX([xw, 0, sz * 2.2], [xw, 0, 0], tilt), rotX([xw, 0, sz * 36.5], [xw, 0, 0], tilt), 0.28, [0.82, 0.82, 0.84], 0, 0, 0.5);
    pushInst(a, [xw, 0, 0], [2.4, 3.2, 3.6], TRUSS, 19, Q0, 0, 0.45, [2, 0.5, 0, 0]);
  }
  for (const xr of [-14, 14]) pushInst(rad, [xr, -1.2, 0], [12, 0.12, 3.2], [0.9, 0.9, 0.92], 36, Q0, 0, 0.5, [2, 0, 0, 0]);
  for (const xr of [-24, 24]) for (const s of [-1, 1]) pushInst(rad, [xr, -4, s * 6.5], [2.8, 0.1, 10], [0.9, 0.9, 0.92], 36, qx(s * 0.2), 0, 0.5, [2, 0, 0, 0]);
  const US = [0.88, 0.89, 0.9], RU = [0.84, 0.83, 0.78];
  const modZ = (z0, z1, d, col, x = 0, y = -4.2) => pushInst(mod, [x, y, z0], [d, z1 - z0, d], col, 36, qx(Math.PI / 2), 0, 0.6, [1, 0, 0, 0]);
  modZ(1.5, 10.0, 4.3, US); modZ(10.0, 17.2, 4.4, US); modZ(-4.0, 1.5, 4.6, US); modZ(-16.5, -4.0, 4.1, RU); modZ(-29.5, -16.5, 4.2, RU);
  pushInst(mod, [2.2, -4.2, 13.6], [4.4, 11.0, 4.4], US, 36, qz(-Math.PI / 2), 0, 0.6, [1, 0, 0, 0]);
  pushInst(mod, [-2.2, -4.2, 13.6], [4.5, 7.0, 4.5], US, 36, qz(Math.PI / 2), 0, 0.6, [1, 0, 0, 0]);
  pushInst(mod, [0, -4.2, 17.2], [2.6, 2.4, 2.6], [0.7, 0.7, 0.72], 36, qx(Math.PI / 2), 0, 0.6, [1, 0, 0, 0]);
  pushInst(mod, [0, -4.2, -32.7], [2.6, 3.2, 2.6], [0.7, 0.7, 0.72], 36, qx(Math.PI / 2), 0, 0.6, [1, 0, 0, 0]);
  pushBar(a, [0, -1.2, 0], [0, -2.0, 0], 1.4, [0.7, 0.7, 0.7], 0, 0, 0.6);
  for (const s of [-1, 1]) pushInst(pan, [s * 9.5, -4.2, -23], [13, 0.06, 3.2], [1, 1, 1], 36, Q0, 0, 0.4, [0, 0, 0, 0]);
  pushInst(mod, [0, -4.2, 18.6], [2.4, 4.2, 2.4], [0.35, 0.37, 0.3], 36, qx(Math.PI / 2), 0, 0.6, [1, 0, 0, 0]);
  const B = { solid: E.batch(M.box, new Float32Array(a)), bars: E.batch(M.box, new Float32Array(bars)), panels: E.batch(M.box, new Float32Array(pan)), rads: E.batch(M.box, new Float32Array(rad)), mods: E.batch(M.cyl, new Float32Array(mod)) };
  for (const k in B) B[k].shadow = false;
  return B;
}
function rotX(p, c, ang) { const y = p[1] - c[1], z = p[2] - c[2]; const cs = Math.cos(ang), sn = Math.sin(ang); return [p[0], c[1] + y * cs - z * sn, c[2] + y * sn + z * cs]; }

// ======================= M: Earth and the Moon to scale; G: the orbit diagram =======================
export const MOON_R = 1.7374e6, MOON_D = 3.844e8;
export function buildSpace(E, M) {
  const B = {};
  B.earth = dyn(E, M.sphMd, 1, [17]); B.earth.shadow = false; B.atmo = dyn(E, M.sphMd, 2, [38], true);
  B.moon = dyn(E, M.sphMd, 1, [35]); B.moon.shadow = false;
  B.lines = dyn(E, M.box, 1600, [2]); B.lines.shadow = false;  // dashed paths, arcs, the orbit ring, arrows
  B.glows = dyn(E, M.face, 200, [33], true);                     // markers, impact flashes
  return B;
}
// Newton's cannonball: horizontal launch at r0 (Earth radii) with k × circular speed; returns points until it hits the ground
export function trajectory(k, r0 = 1.09, maxT = 40) {
  let p = [0, r0], v = [-k / Math.sqrt(r0), 0]; const pts = [[0, r0, 0]]; const dt = 0.002; let t = 0, prev = Math.atan2(r0, 0), sweep = 0;
  const acc = (q) => { const r = Math.hypot(q[0], q[1]); return [-q[0] / r ** 3, -q[1] / r ** 3]; };
  while (t < maxT) {
    const a0 = acc(p); v = [v[0] + a0[0] * dt / 2, v[1] + a0[1] * dt / 2]; p = [p[0] + v[0] * dt, p[1] + v[1] * dt]; const a1 = acc(p); v = [v[0] + a1[0] * dt / 2, v[1] + a1[1] * dt / 2];
    t += dt; const th = Math.atan2(p[1], p[0]); let d = th - prev; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; sweep += d; prev = th;
    const r = Math.hypot(p[0], p[1]);
    if (r < 1.0) { pts.push([p[0] / r, p[1] / r, t]); break; }
    const last = pts[pts.length - 1]; if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.01) pts.push([p[0], p[1], t]);
    if (Math.abs(sweep) > 2 * Math.PI + 0.01) break;
  }
  return pts;
}
