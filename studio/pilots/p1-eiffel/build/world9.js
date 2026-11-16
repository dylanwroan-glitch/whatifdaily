// world9.js — "What if you melted the Eiffel Tower?": a stylized lattice tower (four curved legs, arches, three floors,
// the shaft, the top and its antenna), the Champ de Mars, the Seine, Haussmann blocks, and the molten iron (drops, pool,
// cube, sheet), plus a ruler for the close-up. All original and procedural, in meters. The tower stands at the origin with
// its legs on the diagonals; the Champ de Mars runs along +z, the Seine along x at z ≈ -185.
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
export function billQ(cam, p, up = [0, 1, 0]) {
  const z = V3.norm(V3.sub(cam, p)); let x = V3.cross(up, z); if (V3.len(x) < 1e-6) x = V3.cross([1, 0, 0], z); x = V3.norm(x); const y = V3.cross(z, x);
  return quatFromBasis(x, y, z);
}
export function meshes(E) {
  return {
    box: E.mesh('box', meshBox), face: E.mesh('face', () => meshFace(4)), sph: E.mesh('sph', () => meshSphere(12, 18)),
    sphLo: E.mesh('sphLo', () => meshSphere(6, 8)), sphMd: E.mesh('sphMd', () => meshSphere(24, 36)),
    cyl: E.mesh('cyl', () => meshLathe([[0.5, 0], [0.5, 1]], 16)),
  };
}
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ======================= the tower =======================
export const H1 = 57, H2 = 115.7, H3 = 276, HTOP = 330;
export const xo = (h) => 62.5 * Math.exp(-h / 101);                          // outer edge of a leg (m from the axis), h <= H2
export const xi = (h) => 37.5 * Math.pow(Math.max(0, 1 - h / 118), 1.1);    // inner edge of a leg
export const Wsh = (h) => 6 + 14 * Math.pow(Math.max(0, (H3 - h) / (H3 - 115.7)), 1.8); // half-width of the upper shaft
export const PAINT = [0.115, 0.078, 0.052];
// members: bars [ax,ay,az,bx,by,bz,thickness,type] (type 0 chord, 1 horizontal, 2 diagonal, 3 post, 4 arch, 5 antenna)
// and axis-aligned boxes [cx,cy,cz,sx,sy,sz,type] (type 10 deck, 11 frieze, 12 cabin)
export function towerModel() {
  const bars = [], boxes = [];
  const B = (A, Bp, t, ty) => bars.push([A[0], A[1], A[2], Bp[0], Bp[1], Bp[2], t, ty]);
  const panel = (A0, A1, B0, B1, n, td, tp) => { // a face panel between bottom A0-A1 and top B0-B1, split into n sub-panels
    for (let i = 0; i < n; i++) { const u0 = i / n, u1 = (i + 1) / n;
      const a0 = lerp3(A0, A1, u0), a1 = lerp3(A0, A1, u1), b0 = lerp3(B0, B1, u0), b1 = lerp3(B0, B1, u1);
      B(a0, b1, td, 2); B(a1, b0, td, 2); if (i > 0) B(a0, b0, tp, 3); }
  };
  // ---- the four legs, ground to the second floor ----
  const K = 18;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const P = (h, ca, cb) => [sx * (ca ? xo(h) : xi(h)), h, sz * (cb ? xo(h) : xi(h))];
    const ring = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let k = 0; k < K; k++) {
      const h0 = H2 * k / K, h1 = H2 * (k + 1) / K, u = k / K; const tc = lerp(2.4, 1.3, u);
      for (const [ca, cb] of ring) B(P(h0, ca, cb), P(h1, ca, cb), tc, 0);
      for (let f = 0; f < 4; f++) { const c0 = ring[f], c1 = ring[(f + 1) % 4];
        const A0 = P(h0, ...c0), A1 = P(h0, ...c1), B0 = P(h1, ...c0), B1 = P(h1, ...c1);
        if (k % 2 === 0 || k === K - 1) B(A0, A1, 0.75, 1);
        const wdt = V3.len(V3.sub(A1, A0)); const n = Math.max(1, Math.min(3, Math.round(wdt / ((h1 - h0) * 1.15))));
        panel(A0, A1, B0, B1, n, lerp(0.62, 0.42, u), 0.4); }
    }
  }
  // ---- the four arches under the first floor (in the outer faces, between the legs) ----
  for (let f = 0; f < 4; f++) {
    const yb = 9, Ha = 34, R = xi(yb) - 0.6, NS = 22; const pts = [];
    for (let i = 0; i <= NS; i++) { const th = Math.PI * i / NS; const s = -R * Math.cos(th), y = yb + Ha * Math.sin(th); const o = xo(y) - 1.6;
      pts.push(f === 0 ? [s, y, o] : f === 1 ? [s, y, -o] : f === 2 ? [o, y, s] : [-o, y, s]); }
    for (let i = 0; i < NS; i++) B(pts[i], pts[i + 1], 1.5, 4);
    for (let i = 2; i < NS - 1; i += 2) { const p = pts[i]; const top = [p[0], H1 - 7, p[2]]; if (top[1] - p[1] > 1.5) B(p, top, 0.42, 3); }
  }
  // ---- the upper shaft, second floor to the top ----
  const K2 = 26; const C = (h, i) => { const w = Wsh(h); const s = [[1, 1], [-1, 1], [-1, -1], [1, -1]][i]; return [s[0] * w, h, s[1] * w]; };
  for (let k = 0; k < K2; k++) {
    const h0 = H2 + (H3 - H2) * k / K2, h1 = H2 + (H3 - H2) * (k + 1) / K2, u = k / K2; const tc = lerp(1.5, 0.8, u);
    for (let i = 0; i < 4; i++) B(C(h0, i), C(h1, i), tc, 0);
    for (let i = 0; i < 4; i++) { const A0 = C(h0, i), A1 = C(h0, (i + 1) % 4), B0 = C(h1, i), B1 = C(h1, (i + 1) % 4);
      if (k % 2 === 0) B(A0, A1, 0.55, 1);
      const wdt = 2 * Wsh(h0); const n = Math.max(1, Math.min(4, Math.round(wdt / ((h1 - h0) * 1.2))));
      panel(A0, A1, B0, B1, n, lerp(0.46, 0.3, u), 0.32); }
  }
  // ---- floors: decks (rings with an open middle), friezes, pavilions; the top cabins, lantern and antenna ----
  const ring = (y, ri, ro, th) => {
    boxes.push([0, y, (ri + ro) / 2, 2 * ro, th, ro - ri, 10], [0, y, -(ri + ro) / 2, 2 * ro, th, ro - ri, 10],
      [(ri + ro) / 2, y, 0, ro - ri, th, 2 * ri, 10], [-(ri + ro) / 2, y, 0, ro - ri, th, 2 * ri, 10]); };
  const frieze = (y0, y1, r, th) => { const yc = (y0 + y1) / 2, hh = y1 - y0;
    boxes.push([0, yc, r, 2 * r + th, hh, th, 11], [0, yc, -r, 2 * r + th, hh, th, 11], [r, yc, 0, th, hh, 2 * r, 11], [-r, yc, 0, th, hh, 2 * r, 11]); };
  ring(H1, 17.5, 37.0, 1.4); frieze(H1 - 6.5, H1 + 0.7, 37.0, 1.0);
  for (const [x, z] of [[27, 0], [-27, 0], [0, 27], [0, -27]]) boxes.push([x, H1 + 2.6, z, x ? 8 : 22, 4.6, x ? 22 : 8, 12]);
  ring(H2, 8.5, 21.5, 1.2); frieze(H2 - 2.6, H2 + 0.6, 21.5, 0.8);
  boxes.push([0, H2 + 2.2, 0, 9, 4.4, 9, 12]);
  boxes.push([0, H3, 0, 18, 1.2, 18, 10], [0, H3 + 3.6, 0, 13, 6.2, 13, 12], [0, H3 + 9.5, 0, 9, 5.6, 9, 12], [0, H3 + 17.0, 0, 5.2, 9.4, 5.2, 12]);
  B([0, H3 + 21.7, 0], [0, 312, 0], 1.6, 5); B([0, 312, 0], [0, 322, 0], 1.0, 5); B([0, 322, 0], [0, HTOP, 0], 0.5, 5);
  // the lift shaft running up the middle of the upper tower (gives the open shaft some depth)
  for (let k = 0; k < 10; k++) { const h0 = H2 + 1 + (H3 - H2 - 2) * k / 10, h1 = H2 + 1 + (H3 - H2 - 2) * (k + 1) / 10; for (const [x, z] of [[1.6, 1.6], [-1.6, 1.6], [-1.6, -1.6], [1.6, -1.6]]) B([x, h0, z], [x, h1, z], 0.35, 3); }
  return { bars, boxes };
}

// precomputed per-member data for fast per-frame emission
export function prepTower(model) {
  const nb = model.bars.length; const bar = new Float32Array(nb * 12); // ax,ay,az, dx,dy,dz (unit), L, t, type, ylo, yhi, mass
  let mass = 0; const masses = [];
  model.bars.forEach((b, i) => { const A = [b[0], b[1], b[2]], Bp = [b[3], b[4], b[5]]; let lo = A, hi = Bp; if (hi[1] < lo[1]) { lo = Bp; hi = A; }
    const d = V3.sub(hi, lo), L = V3.len(d); const u = V3.scale(d, 1 / Math.max(L, 1e-6)); const m = b[6] * b[6] * L * (b[7] === 0 ? 1.0 : 0.55);
    bar.set([lo[0], lo[1], lo[2], u[0], u[1], u[2], L, b[6], b[7], lo[1], hi[1], m], i * 12); mass += m; masses.push([lo[1], hi[1], m]); });
  for (const x of model.boxes) { const m = x[3] * x[4] * x[5] * (x[6] === 10 ? 0.06 : x[6] === 11 ? 0.12 : 0.03); mass += m; masses.push([x[1] - x[4] / 2, x[1] + x[4] / 2, m]); }
  // melted mass fraction as a function of the melt front height (sampled every meter)
  const above = new Float32Array(341);
  for (let h = 0; h <= 340; h++) { let s = 0; for (const [lo, hi, m] of masses) s += hi <= h ? 0 : lo >= h ? m : m * (hi - h) / Math.max(hi - lo, 1e-6); above[h] = s / mass; }
  const qs = []; for (let i = 0; i < nb; i++) { const o = i * 12; qs.push(quatFromTo([0, 1, 0], [bar[o + 3], bar[o + 4], bar[o + 5]])); }
  return { bar, nb, boxes: model.boxes, qs, mass, above };
}
export const meltedFrac = (TW, F) => { if (F >= 340) return 0; if (F <= 0) return 1; const i = Math.floor(F), f = F - i; return TW.above[i] * (1 - f) + TW.above[Math.min(340, i + 1)] * f; };

// heat colour handled in the shader (kind 45). Emit the tower clipped at the melt front F (m): members above it are gone,
// members crossing it are cut there and glow white-hot at the cut, everything within ~45 m below glows; `warm` is a whole-tower glow
export function emitTower(a, TW, F, warm = 0, opt = {}) {
  const { bar, nb, qs } = TW; const glowZone = opt.zone ?? 46; const rebuild = !!opt.rebuild; const tips = opt.tips;
  for (let i = 0; i < nb; i++) {
    const o = i * 12; const ylo = bar[o + 9], yhi = bar[o + 10]; if (ylo >= F) continue;
    let L = bar[o + 6]; let cut = false;
    if (yhi > F) { const dy = bar[o + 4]; L = dy > 1e-4 ? Math.min(L, (F - ylo) / dy) : L; cut = true; if (L < 0.05) continue; }
    const px = bar[o] + bar[o + 3] * L / 2, py = bar[o + 1] + bar[o + 4] * L / 2, pz = bar[o + 2] + bar[o + 5] * L / 2;
    const top = ylo + bar[o + 4] * L; const dist = F - top;
    let heat = warm * (0.2 + 0.8 * Math.min(1, top / 300));
    if (F < 340) heat = Math.max(heat, dist < glowZone ? Math.pow(1 - dist / glowZone, 1.5) * 0.95 : 0);
    if (rebuild) heat = F < 340 ? (dist < glowZone ? Math.pow(1 - dist / glowZone, 1.6) * 0.9 : 0) : 0;
    const t = bar[o + 7] * (cut ? 1.25 : 1) * (1 + 0.25 * heat * heat);
    pushInst(a, [px, py, pz], [t, L, t], PAINT, 45, qs[i], i * 0.618 % 1, 0.7, [heat, 0, 0, 0]);
    if (cut && tips && (i % 3 === 0)) tips.push([bar[o] + bar[o + 3] * L, top, bar[o + 2] + bar[o + 5] * L, t]);
  }
  for (const x of TW.boxes) {
    const y0 = x[1] - x[4] / 2, y1 = x[1] + x[4] / 2; if (y0 >= F) continue;
    const yt = Math.min(y1, F); const hh = yt - y0; if (hh < 0.05) continue; const dist = F - yt;
    let heat = warm * (0.2 + 0.8 * Math.min(1, yt / 300));
    if (F < 340) heat = Math.max(heat, dist < glowZone ? Math.pow(1 - dist / glowZone, 1.4) * 1.05 : 0);
    if (rebuild) heat = F < 340 ? (dist < glowZone ? Math.pow(1 - dist / glowZone, 1.6) : 0) : 0;
    const col = x[6] === 12 ? [0.2, 0.16, 0.12] : PAINT;
    pushInst(a, [x[0], y0 + hh / 2, x[2]], [x[3], hh, x[5]], col, 45, Q0, 0.3, 0.7, [heat, 0, 0, x[6] === 12 ? 1 : 0]);
  }
}
// the same members as faint additive lines (the "ghost" of the tower)
export function emitGhost(a, TW, I, col = [0.35, 0.78, 1.0], ymax = 400) {
  const { bar, nb, qs } = TW;
  for (let i = 0; i < nb; i++) { const o = i * 12; if (bar[o + 9] > ymax) continue; const L = bar[o + 6], t = Math.max(0.28, bar[o + 7] * 0.5);
    pushInst(a, [bar[o] + bar[o + 3] * L / 2, bar[o + 1] + bar[o + 4] * L / 2, bar[o + 2] + bar[o + 5] * L / 2], [t, L, t], col, 2, qs[i], 0, 0.5, [I * (bar[o + 8] === 0 ? 1.0 : 0.6), 0, 0, 0]); }
  for (const x of TW.boxes) if (x[6] !== 12 && x[1] < ymax) { // floor outlines
    const [cx, cy, cz, sx, , sz] = x; for (const [p, s] of [[[cx, cy, cz - sz / 2], [sx, 0.3, 0.3]], [[cx, cy, cz + sz / 2], [sx, 0.3, 0.3]], [[cx - sx / 2, cy, cz], [0.3, 0.3, sz]], [[cx + sx / 2, cy, cz], [0.3, 0.3, sz]]])
      pushInst(a, p, s, col, 2, Q0, 0, 0.5, [I * 0.7, 0, 0, 0]); }
}

// ======================= molten iron: drops, pool =======================
export const IRON_V = 7.3e6 / 7874;            // m³ of iron: 7,300 t ÷ 7,874 kg/m³ (NIST) = 927 m³
export const CUBE = Math.cbrt(IRON_V);          // 9.75 m
export const SHEET = IRON_V / (125 * 125);      // 0.0593 m
// a deterministic shower of drops: each leaves the melt front at its spawn time and falls (time is sped up: g' = 300 m/s²)
export function makeDrops(n, t0, t1, frontAt) {
  const R = rng(4242); const D = [];
  for (let i = 0; i < n; i++) {
    const ts = t0 + (t1 - t0) * Math.pow(R(), 0.9); const y0 = Math.max(1, frontAt(ts));
    let x, z; const e = R() * 4 | 0, s = R() * 2 - 1;
    if (y0 > H2) { const w = Wsh(Math.min(y0, H3)) * (y0 > H3 ? 0.4 : 1); x = e < 2 ? (e ? w : -w) : s * w; z = e < 2 ? s * w : (e === 2 ? w : -w); }
    else { const sx = R() < 0.5 ? -1 : 1, sz = R() < 0.5 ? -1 : 1; const a = xi(y0), b = xo(y0); const u = lerp(a, b, R()), v = R() < 0.5 ? a : b;
      [x, z] = R() < 0.5 ? [sx * u, sz * v] : [sx * v, sz * u]; }
    D.push({ ts, p: [x, y0, z], v: [(R() - 0.5) * 6 + x * 0.04, -R() * 4, (R() - 0.5) * 6 + z * 0.04], s: 0.5 + R() * 0.9 });
  }
  return D;
}
export const G2 = 300;
export function emitDrops(a, D, t, cam, I = 1) {
  for (const d of D) { const k = t - d.ts; if (k < 0) continue;
    const y = d.p[1] + d.v[1] * k - 0.5 * G2 * k * k; if (y < 0.3) { if (k < 0.25 + (d.p[1] + 0) * 0) { /* splash */ } continue; }
    const x = d.p[0] + d.v[0] * k, z = d.p[2] + d.v[2] * k; const vy = d.v[1] - G2 * k;
    const len = Math.min(16, 0.8 + Math.abs(vy) * 0.03) * d.s; const p = [x, y + len * 0.5, z];
    const dist = V3.len(V3.sub(p, cam)); const w = Math.max(0.28 * d.s, dist * 0.0012);
    pushInst(a, p, [w, len, w], [1.0, 0.5, 0.14], 2, Q0, 0, 0.5, [2.0 * I, 0, 0, 0]);
  }
}
// splashes: short-lived glowing discs where drops land
export function emitSplashes(a, D, t, I = 1) {
  for (const d of D) { const k = t - d.ts; if (k < 0) continue;
    const A = 0.5 * G2, Bq = -d.v[1], Cq = -(d.p[1] - 0.3); const kl = (-Bq + Math.sqrt(Bq * Bq - 4 * A * Cq)) / (2 * A); // time of landing
    const u = (k - kl) / 0.3; if (u < 0 || u > 1) continue;
    const x = d.p[0] + d.v[0] * kl, z = d.p[2] + d.v[2] * kl; const r = (1.2 + 3 * u) * d.s;
    pushInst(a, [x, 0.35, z], [r, 0.25 + 0.6 * (1 - u), r], [1.0, 0.6, 0.2], 2, Q0, 0, 0.5, [2.5 * (1 - u) * I, 0, 0, 0]);
  }
}

// ======================= Paris =======================
const STONE = [0.6, 0.53, 0.42], ZINC = [0.2, 0.22, 0.25], ASPH = [0.07, 0.07, 0.075], GRAVEL = [0.42, 0.37, 0.29], LAWN = [0.07, 0.15, 0.04];
export function buildParis(E, M) {
  const R = rng(1889); const g = [], lawn = [], paths = [], trunks = [], crowns = [], bld = [], roofs = [], water = [], quay = [], center = [], pads = [];
  // base ground (asphalt-grey city floor) in tiles; the esplanade under the tower is its own tile so it can be swapped out
  for (let i = -6; i < 6; i++) for (let j = -6; j < 6; j++) { const x = (i + 0.5) * 900, z = (j + 0.5) * 900; pushInst(g, [x, -0.7, z], [900, 1.0, 900], [0.11, 0.105, 0.1], 0, Q0, 0, 0.95); }
  pushInst(center, [0, -0.25, 0], [125, 0.5, 125], GRAVEL, 0, Q0, 0, 0.95);   // the esplanade under the tower (top at y = 0)
  for (const [x, z] of [[-1, 0], [1, 0]]) pushInst(paths, [x * 101.25, -0.15, 0], [77.5, 0.3, 125], GRAVEL, 0, Q0, 0, 0.95);
  pushInst(paths, [0, -0.15, -81.25], [280, 0.3, 37.5], GRAVEL, 0, Q0, 0, 0.95);
  // stone footings under the four legs (flush with the ground)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pushInst(pads, [sx * 50, 0.0, sz * 50], [25, 0.12, 25], [0.5, 0.46, 0.4], 0, Q0, 0, 0.9);
  // lamp posts around the esplanade (scale references: about 4 m tall)
  const lamps = [];
  for (const k of [-50, -25, 0, 25, 50]) for (const [x, z] of [[66, k], [-66, k], [k, -66]]) {
    pushInst(lamps, [x, 2.0, z], [0.2, 4.0, 0.2], [0.03, 0.045, 0.035], 0, Q0, 0, 0.6); pushInst(lamps, [x, 4.25, z], [0.55, 0.7, 0.55], [0.04, 0.05, 0.04], 0, Q0, 0, 0.6); }
  // the Champ de Mars: lawn parterres between gravel paths, running from the tower along +z
  pushInst(paths, [0, -0.15, 520], [250, 0.3, 900], GRAVEL, 0, Q0, 0, 0.95);
  for (let j = 0; j < 6; j++) for (const sx of [-1, 1]) { const z0 = 95 + j * 135; pushInst(lawn, [sx * 58, 0.075, z0 + 60], [80, 0.15, 120], LAWN, 11, Q0, 0, 0.95); }
  // tree rows along both sides of the park and along the quai
  for (const xr of [-112, -124, 112, 124]) for (let z = 90; z < 960; z += 11) { const h = 9 + R() * 4; const x = xr + (R() - 0.5) * 1.5;
    pushInst(trunks, [x, h * 0.25, z], [0.6, h * 0.5, 0.6], [0.16, 0.12, 0.08], 0, Q0, 0, 0.9);
    pushInst(crowns, [x, h * 0.68, z + (R() - 0.5) * 2], [h * 0.75, h * 0.7, h * 0.75], [0.05, 0.11, 0.03].map(v => v * (0.75 + 0.5 * R())), 11, Q0, 0, 0.95); }
  for (const zr of [-66, -76]) for (let x = -700; x < 700; x += 12) { if (Math.abs(x) < 70) continue; const h = 9 + R() * 4;
    pushInst(trunks, [x, h * 0.25, zr], [0.6, h * 0.5, 0.6], [0.16, 0.12, 0.08], 0, Q0, 0, 0.9);
    pushInst(crowns, [x, h * 0.68, zr], [h * 0.75, h * 0.7, h * 0.75], [0.05, 0.11, 0.03].map(v => v * (0.75 + 0.5 * R())), 11, Q0, 0, 0.95); }
  // the Seine between stone quays, with the bridge on the tower's axis
  pushInst(water, [0, -4.0, -185], [8000, 0.2, 150], [0.03, 0.06, 0.07], 29, Q0, 0, 0.3);
  for (const zq of [-108, -262]) pushInst(quay, [0, -2, zq], [8000, 4.2, 4], [0.45, 0.4, 0.33], 0, Q0, 0, 0.9);
  pushInst(quay, [0, -0.6, -185], [35, 1.2, 160], [0.5, 0.45, 0.37], 0, Q0, 0, 0.9);
  for (const zp of [-145, -185, -225]) pushInst(quay, [0, -3, zp], [33, 5, 7], [0.42, 0.38, 0.31], 0, Q0, 0, 0.9);
  // Haussmann blocks: cream stone with grey zinc roofs, on a loose grid, kept off the park, the esplanade and the river
  const blockOK = (x, z) => !(Math.abs(x) < 150 && z > -95) && !(z < -95 && z > -285) && !(Math.abs(x) < 120 && z < -285 && z > -520);
  for (let i = -26; i <= 26; i++) for (let j = -26; j <= 26; j++) {
    const cx = i * 92 + (R() - 0.5) * 6, cz = j * 78 + (R() - 0.5) * 6; if (!blockOK(cx, cz)) continue; if (Math.hypot(cx, cz) > 2300) continue;
    const bw = 66 + R() * 8, bd = 54 + R() * 8;
    // perimeter block: 4-6 buildings around a courtyard
    const n = 2 + (R() * 2 | 0); const hBase = 18 + R() * 5;
    for (let k = 0; k < n; k++) { const w = bw / n; const h = hBase + (R() - 0.5) * 3; const x = cx - bw / 2 + w * (k + 0.5);
      for (const zz of [cz - bd / 2 + 6, cz + bd / 2 - 6]) { pushInst(bld, [x, h / 2, zz], [w - 0.4, h, 12], STONE.map(v => v * (0.88 + 0.22 * R())), 1, Q0, R() * 100, 0.85, [0, 0, 3.0, 0]);
        pushInst(roofs, [x, h + 1.6, zz], [w - 1.4, 3.2, 10.2], ZINC.map(v => v * (0.85 + 0.3 * R())), 0, Q0, 0, 0.6); } }
    for (const xx of [cx - bw / 2 + 6, cx + bw / 2 - 6]) { const h = hBase + (R() - 0.5) * 3; pushInst(bld, [xx, h / 2, cz], [12, h, bd - 24], STONE.map(v => v * (0.88 + 0.22 * R())), 1, Q0, R() * 100, 0.85, [0, 0, 3.0, 0]);
      pushInst(roofs, [xx, h + 1.6, cz], [10.2, 3.2, bd - 25], ZINC.map(v => v * (0.85 + 0.3 * R())), 0, Q0, 0, 0.6); }
  }
  // a big domed landmark-free hill across the river (the Trocadéro gardens) as a grassy slope
  pushInst(lawn, [0, 2, -420], [230, 4, 260], [0.06, 0.13, 0.035], 11, Q0, 0, 0.95);
  const S = { ground: stat(E, M.box, g), center: stat(E, M.box, center), paths: stat(E, M.box, paths), lawn: stat(E, M.box, lawn), pads: stat(E, M.box, pads),
    trunks: stat(E, M.box, trunks), lamps: stat(E, M.box, lamps), crowns: stat(E, M.sphLo, crowns), bld: stat(E, M.box, bld), roofs: stat(E, M.box, roofs),
    water: stat(E, M.box, water), quay: stat(E, M.box, quay) };
  for (const k of ['trunks', 'crowns']) S[k].shadow = true;
  S.list = [S.ground, S.center, S.paths, S.lawn, S.pads, S.water, S.quay, S.trunks, S.crowns, S.lamps, S.bld, S.roofs];
  return S;
}

// a faceless standing figure for scale (1.75 m), facing +z, at p (feet on the ground)
export function person(a, p, rotY = 0, col = [0.06, 0.07, 0.09]) {
  const q = quatAxis([0, 1, 0], rotY); const P = (x, y, z) => { const r = qrot(q, [x, y, z]); return [p[0] + r[0], p[1] + r[1], p[2] + r[2]]; };
  for (const sx of [-1, 1]) { pushInst(a, P(sx * 0.1, 0.43, 0), [0.14, 0.86, 0.16], col, 0, q, 0, 0.8); pushInst(a, P(sx * 0.25, 1.12, 0), [0.1, 0.62, 0.11], col, 0, quatMul(q, quatAxis([0, 0, 1], sx * 0.08)), 0, 0.8); }
  pushInst(a, P(0, 1.16, 0), [0.4, 0.62, 0.22], [col[0] * 1.6, col[1] * 1.8, col[2] * 2.6], 0, q, 0, 0.8);
  pushInst(a, P(0, 1.55, 0), [0.12, 0.12, 0.12], col, 0, q, 0, 0.8);
  pushInst(a, P(0, 1.65, 0), [0.21, 0.24, 0.22], [0.09, 0.07, 0.06], 0, q, 0, 0.8);
}
