// world.js — builds every object in the film (all original, procedural)
import { V3, quatFromTo, quatAxis, quatMul, qrot, meshBox, meshFace, meshLathe, meshSphere, meshPrism, pushInst, pushBar } from './engine.js';

export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
const conj = (q) => [-q[0], -q[1], -q[2], q[3]];

// ---------------- Statue of Liberty (voxel skin + Eiffel-style skeleton) ----------------
export const STATUE_BASE = [0, 49, 0];
const ROBE = [ // y, rx, rz, zc
  [0, 6.6, 5.6, 0.2], [4, 6.2, 5.2, 0.25], [10, 5.8, 4.7, 0.3], [16, 5.5, 4.3, 0.3], [20, 5.35, 4.1, 0.3],
  [23.5, 5.6, 4.0, 0.25], [26.5, 6.0, 3.6, 0.2], [27.6, 4.2, 2.8, 0.2], [28.2, 2.0, 1.8, 0.2]];
function robeAt(y) { let i = 0; while (i < ROBE.length - 2 && y > ROBE[i + 1][0]) i++;
  const a = ROBE[i], b = ROBE[i + 1]; const t = clamp((y - a[0]) / (b[0] - a[0]), 0, 1); return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)]; }
const SHOULDER_R = [-4.6, 26.0, 0.3], ELBOW_R = [-5.6, 33.0, 0.9], HAND_R = [-6.0, 38.5, 1.2], TORCH_TOP = [-6.05, 42.2, 1.25];
const SHOULDER_L = [4.7, 25.5, 0.3], ELBOW_L = [5.5, 20.0, 1.8], HAND_L = [4.3, 21.6, 3.7];
const TABLET_C = [5.9, 22.6, 2.6]; const TABLET_Q = quatMul(quatAxis([0, 1, 0], 0.5), quatAxis([0, 0, 1], -0.22)); const TABLET_H = [0.32, 3.6, 2.07];
function segDist(p, a, b) { const ab = V3.sub(b, a), ap = V3.sub(p, a); const t = clamp(V3.dot(ap, ab) / V3.dot(ab, ab), 0, 1); return V3.len(V3.sub(ap, V3.scale(ab, t))); }
function inEll(p, c, r, q) { let l = V3.sub(p, c); if (q) l = qrot(conj(q), l); return (l[0] / r[0]) ** 2 + (l[1] / r[1]) ** 2 + (l[2] / r[2]) ** 2 <= 1; }
function inBox(p, c, h, q) { let l = V3.sub(p, c); if (q) l = qrot(conj(q), l); return Math.abs(l[0]) <= h[0] && Math.abs(l[1]) <= h[1] && Math.abs(l[2]) <= h[2]; }
const SPIKES = []; for (let k = 0; k < 7; k++) { const th = (-72 + k * 24) * Math.PI / 180; SPIKES.push(V3.norm([Math.sin(th), Math.cos(th), -0.28])); }
const CROWN_C = [0, 32.9, 0.15];
const FOLDS = []; { const R = rng(77); for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2 + R() * 0.2; FOLDS.push({ a, y0: 1 + R() * 3, y1: 12 + R() * 10, r: 0.45 + R() * 0.35 }); } }
function insideStatue(p) {
  const [x, y, z] = p;
  if (y >= 0 && y <= 28.2) { const [rx, rz, zc] = robeAt(y); if ((x / rx) ** 2 + ((z - zc) / rz) ** 2 <= 1) return true; }
  for (const f of FOLDS) { if (y < f.y0 || y > f.y1) continue; const [rx, rz, zc] = robeAt(y); const cx = Math.cos(f.a) * rx * 0.98, cz = zc + Math.sin(f.a) * rz * 0.98;
    if ((x - cx) ** 2 + (z - cz) ** 2 <= f.r * f.r) return true; }
  if (inEll(p, [0, 28.7, 0.2], [1.5, 1.3, 1.5])) return true; // neck
  if (inEll(p, [0, 31.2, 0.35], [1.75, 2.6, 2.05])) return true; // head
  if (inBox(p, [0, 31.0, 2.3], [0.28, 0.75, 0.45])) return true; // nose
  if (inEll(p, [0, 31.2, -1.6], [1.4, 1.5, 1.05])) return true; // hair bun
  if (inBox(p, [0, 32.75, 0.2], [2.0, 0.55, 2.25])) return true; // diadem
  for (const d of SPIKES) { const c = V3.add(CROWN_C, V3.scale(d, 2.5)); if (inBox(p, c, [0.36, 2.2, 0.2], quatFromTo([0, 1, 0], d))) return true; }
  if (segDist(p, SHOULDER_R, ELBOW_R) <= 1.75 || segDist(p, ELBOW_R, HAND_R) <= 1.35) return true; // raised arm
  if (inEll(p, [-4.7, 27.8, 0.3], [1.9, 2.6, 2.0])) return true; // sleeve drape
  if (inEll(p, [-6.0, 38.9, 1.2], [1.0, 1.1, 1.0])) return true; // hand
  if (segDist(p, HAND_R, TORCH_TOP) <= 0.6) return true; // torch handle
  if (inBox(p, [-6.05, 42.5, 1.25], [1.7, 0.45, 1.7])) return true; // torch balcony
  if (segDist(p, SHOULDER_L, ELBOW_L) <= 1.5 || segDist(p, ELBOW_L, HAND_L) <= 1.2) return true; // left arm
  if (inBox(p, TABLET_C, TABLET_H, TABLET_Q)) return true; // tablet
  if (inBox(p, [0.9, 22.0, 3.55], [1.1, 6.0, 0.55], quatAxis([0, 0, 1], -0.5))) return true; // sash
  if (inBox(p, [-1.6, 0.6, 5.6], [0.9, 0.6, 1.3])) return true; // toes
  return false;
}
export function buildStatue(E) {
  const vs = 0.5, B = STATUE_BASE;
  const xs = [-9, 8], ys = [0, 44], zs = [-6, 8];
  const nx = Math.ceil((xs[1] - xs[0]) / vs), ny = Math.ceil((ys[1] - ys[0]) / vs), nz = Math.ceil((zs[1] - zs[0]) / vs);
  const grid = new Uint8Array(nx * ny * nz); const id = (i, j, k) => (j * nz + k) * nx + i;
  for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    const p = [xs[0] + (i + 0.5) * vs, ys[0] + (j + 0.5) * vs, zs[0] + (k + 0.5) * vs]; if (insideStatue(p)) grid[id(i, j, k)] = 1; }
  const R = rng(9), faces = [[], [], [], [], [], []], vox = [];
  const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const g = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) ? 0 : grid[id(i, j, k)];
  for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    if (!grid[id(i, j, k)]) continue;
    if (g(i + 1, j, k) && g(i - 1, j, k) && g(i, j + 1, k) && g(i, j - 1, k) && g(i, j, k + 1) && g(i, j, k - 1)) continue;
    const lp = [xs[0] + (i + 0.5) * vs, ys[0] + (j + 0.5) * vs, zs[0] + (k + 0.5) * vs];
    const p = V3.add(B, lp);
    const nz3 = 0.5 + 0.5 * Math.sin(lp[0] * 0.21 + lp[1] * 0.13) * Math.cos(lp[2] * 0.19 - lp[1] * 0.07);
    const n = clamp(0.55 * R() + 0.45 * nz3, 0.001, 0.999);
    const tint = 0.9 + 0.2 * R();
    const col = [0.30 * tint, 0.56 * tint, 0.47 * tint];
    for (let d = 0; d < 6; d++) { const [a, b2, c] = DIRS[d]; if (!g(i + a, j + b2, k + c)) pushInst(faces[d], p, [vs * 1.02, vs * 1.02, vs * 1.02], col, 3, [0, 0, 0, 1], n, 0.85); }
    vox.push({ p, n, out: V3.norm([lp[0], 0.35, lp[2] - 0.3]) });
  }
  const box = E.mesh('box', meshBox);
  const skin = faces.map((f, d) => E.batch(E.mesh('face' + d, () => meshFace(d)), new Float32Array(f)));
  // ---- skeleton ----
  const sk = [];
  const IRON = [0.11, 0.1, 0.095], STEEL = [0.42, 0.44, 0.47];
  const P = (x, y, z) => V3.add(B, [x, y, z]);
  const posts = [[1.6, 1.6], [-1.6, 1.6], [-1.6, -1.6], [1.6, -1.6]];
  for (const [x, z] of posts) pushBar(sk, P(x, -8, z), P(x, 29.6, z), 0.42, IRON, 0, 0, 0.6);
  for (let y = -6; y <= 29; y += 3) {
    for (let a = 0; a < 4; a++) { const [x0, z0] = posts[a], [x1, z1] = posts[(a + 1) % 4]; pushBar(sk, P(x0, y, z0), P(x1, y, z1), 0.28, IRON);
      if (y + 3 <= 29.6) pushBar(sk, P(x0, y, z0), P(x1, y + 3, z1), 0.2, IRON); }
  }
  const rings = [];
  for (let y = 1; y <= 27; y += 2.5) {
    const [rx, rz, zc] = robeAt(y); const pts = [];
    for (let s = 0; s < 14; s++) { const a = (s / 14) * Math.PI * 2; pts.push(P(Math.cos(a) * rx * 0.9, y, zc + Math.sin(a) * rz * 0.9)); }
    for (let s = 0; s < 14; s++) pushBar(sk, pts[s], pts[(s + 1) % 14], 0.21, STEEL, 0, 0, 0.45);
    for (let s = 0; s < 14; s += 2) { const pc = posts[Math.floor(((s / 14) * 4 + 0.5)) % 4]; pushBar(sk, pts[s], P(pc[0], y + 0.8, pc[1]), 0.15, STEEL, 0, 0, 0.45); }
    rings.push(pts);
  }
  for (let r = 0; r < rings.length - 1; r++) for (let s = 0; s < 14; s++) {
    pushBar(sk, rings[r][s], rings[r + 1][s], 0.16, STEEL, 0, 0, 0.45);
    if ((s + r) % 3 === 0) pushBar(sk, rings[r][s], rings[r + 1][(s + 1) % 14], 0.1, STEEL, 0, 0, 0.45);
  }
  // head cage
  for (const [y, rx, rz] of [[29.3, 1.4, 1.7], [30.8, 1.55, 1.85], [32.3, 1.5, 1.8], [33.4, 1.0, 1.2]]) {
    const pts = []; for (let s = 0; s < 10; s++) { const a = (s / 10) * Math.PI * 2; pts.push(P(Math.cos(a) * rx, y, 0.3 + Math.sin(a) * rz)); }
    for (let s = 0; s < 10; s++) { pushBar(sk, pts[s], pts[(s + 1) % 10], 0.11, STEEL); if (s % 3 === 0) pushBar(sk, pts[s], P(0, y - 1.5, 0.2), 0.1, STEEL); }
  }
  for (const d of SPIKES) { const a = V3.add(P(...CROWN_C), V3.scale(d, 0.5)), b = V3.add(P(...CROWN_C), V3.scale(d, 4.5)); pushBar(sk, a, b, 0.14, STEEL); }
  // raised arm truss
  const armPts = [SHOULDER_R, ELBOW_R, HAND_R, TORCH_TOP];
  for (let s = 0; s < armPts.length - 1; s++) {
    const a = armPts[s], b = armPts[s + 1]; const d = V3.norm(V3.sub(b, a)); const u = V3.norm(V3.cross(d, [0, 0, 1])), w = V3.norm(V3.cross(d, u));
    const rr = s === 2 ? 0.35 : 0.8; const offs = [V3.scale(u, rr), V3.scale(u, -rr), V3.scale(w, rr), V3.scale(w, -rr)];
    for (const o of offs) pushBar(sk, P(...V3.add(a, o)), P(...V3.add(b, o)), 0.14, STEEL);
    const L = V3.len(V3.sub(b, a)); const nseg = Math.max(2, Math.round(L / 1.3));
    for (let k = 0; k < nseg; k++) { const t0 = k / nseg, t1 = (k + 1) / nseg; const p0 = V3.lerp(a, b, t0), p1 = V3.lerp(a, b, t1);
      pushBar(sk, P(...V3.add(p0, offs[k % 2])), P(...V3.add(p1, offs[(k + 1) % 2])), 0.1, STEEL); pushBar(sk, P(...V3.add(p0, offs[2 + k % 2])), P(...V3.add(p1, offs[2 + (k + 1) % 2])), 0.1, STEEL); }
  }
  pushBar(sk, P(1.6, 25, 1.6), P(...SHOULDER_R), 0.2, IRON); pushBar(sk, P(-1.6, 27, 1.6), P(...ELBOW_R), 0.2, IRON);
  // torch balcony frame
  { const c = [-6.05, 42.5, 1.25]; const pts = [[1.6, 1.6], [-1.6, 1.6], [-1.6, -1.6], [1.6, -1.6]].map(([x, z]) => P(c[0] + x, c[1], c[2] + z));
    for (let s = 0; s < 4; s++) { pushBar(sk, pts[s], pts[(s + 1) % 4], 0.13, STEEL); pushBar(sk, pts[s], P(c[0], c[1] - 0.8, c[2]), 0.1, STEEL); } }
  // left arm + tablet frame
  pushBar(sk, P(...SHOULDER_L), P(...ELBOW_L), 0.16, STEEL); pushBar(sk, P(...ELBOW_L), P(...HAND_L), 0.14, STEEL); pushBar(sk, P(1.6, 24, 1.6), P(...SHOULDER_L), 0.18, IRON);
  { const corners = [[0, 1, 1], [0, 1, -1], [0, -1, -1], [0, -1, 1]].map(([a, b2, c]) => P(...V3.add(TABLET_C, qrot(TABLET_Q, [0, b2 * TABLET_H[1] * 0.9, c * TABLET_H[2] * 0.9]))));
    for (let s = 0; s < 4; s++) pushBar(sk, corners[s], corners[(s + 1) % 4], 0.13, STEEL); pushBar(sk, corners[0], corners[2], 0.09, STEEL); pushBar(sk, corners[1], corners[3], 0.09, STEEL);
    pushBar(sk, V3.lerp(corners[2], corners[3], 0.5), P(1.6, 20, 1.6), 0.14, STEEL); }
  const skeleton = E.batch(box, new Float32Array(sk));
  // ---- gold-leaf flame (stays when copper goes) ----
  const gl = []; const GOLD = [1.0, 0.62, 0.2];
  const prof = []; for (let k = 0; k <= 16; k++) { const u = k / 16; const r = Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - 0.35 * u) * 1.35 + (u < 0.06 ? 0.55 * (1 - u / 0.06) : 0); prof.push([Math.max(0.02, r), u * 4.4]); }
  prof[prof.length - 1][0] = 0.0;
  const flameMesh = E.mesh('flame', () => meshLathe(prof, 20));
  pushInst(gl, P(-6.05, 42.9, 1.25), [1, 1, 1], GOLD, 2, quatAxis([0, 0, 1], 0.06), 0, 0.3, [1.6, 77.0, 1, 1]);
  const gold = E.batch(flameMesh, new Float32Array(gl));
  return { skin, skeleton, gold, vox };
}

// ---------------- Liberty Island, Fort Wood, pedestal ----------------
export function buildIsland(E) {
  const box = E.mesh('box', meshBox); const a = [];
  pushInst(a, [0, 0.55, 8], [262, 1.1, 196], [0.22, 0.21, 0.2], 0, undefined, 0, 0.9);
  pushInst(a, [0, 1.2, 8], [240, 2.0, 178], [0.035, 0.065, 0.03], 11, undefined, 0, 0.95);
  const G = [0.40, 0.385, 0.36], GR = [0.52, 0.49, 0.44];
  pushInst(a, [0, 16.2, 0], [31, 12, 31], G, 0, undefined, 0, 0.9);
  pushInst(a, [0, 22.9, 0], [25.5, 1.4, 25.5], G, 0, undefined, 0, 0.9);
  pushInst(a, [0, 32, 0], [21.5, 17, 21.5], GR, 0, undefined, 0, 0.85);
  pushInst(a, [0, 43.0, 0], [19.6, 5.2, 19.6], GR, 0, undefined, 0, 0.85);
  pushInst(a, [0, 46.3, 0], [22.4, 1.4, 22.4], GR, 0, undefined, 0, 0.85);
  pushInst(a, [0, 48.0, 0], [17.6, 2.0, 17.6], GR, 0, undefined, 0, 0.85);
  for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = -1; k <= 1; k++) {
    const t = [nz !== 0 ? k * 5.2 : 0, 0, nx !== 0 ? k * 5.2 : 0];
    pushInst(a, [nx * 9.85 + t[0], 43.2, nz * 9.85 + t[2]], [nz !== 0 ? 2.2 : 0.2, 3.8, nx !== 0 ? 2.2 : 0.2], [0.03, 0.03, 0.035], 0, undefined, 0, 0.9);
    pushInst(a, [nx * 10.8 + t[0], 33.5, nz * 10.8 + t[2]], [nz !== 0 ? 2.6 : 0.2, 9.0, nx !== 0 ? 2.6 : 0.2], [0.47, 0.44, 0.40], 0, undefined, 0, 0.85);
  }
  const R = rng(5);
  const sph = E.mesh('sphere', () => meshSphere(12, 16)); const trees = [];
  for (let k = 0; k < 46; k++) { const ang = R() * Math.PI * 2, rad = 62 + R() * 40; const x = Math.cos(ang) * rad * 1.15, z = 8 + Math.sin(ang) * rad * 0.82;
    if (Math.abs(x) > 118 || Math.abs(z - 8) > 86) continue; const s = 7 + R() * 6; pushInst(trees, [x, 2.2 + s * 0.45, z], [s, s * 0.9, s], [0.02, 0.045, 0.02], 0, undefined, 0, 0.95); }
  const lamps = [];
  for (let k = 0; k < 28; k++) { const ang = (k / 28) * Math.PI * 2; const x = Math.cos(ang) * 112, z = 8 + Math.sin(ang) * 84;
    pushInst(lamps, [x, 4.2, z], [0.7, 0.7, 0.7], [1.0, 0.82, 0.6], 2, undefined, 0, 0.5, [5, 9000 + k, 1, 0]); }
  const poly = []; for (let k = 0; k < 22; k++) { const r = k % 2 === 0 ? 50 : 36; const ang = (k / 22) * Math.PI * 2 + 0.08; poly.push([Math.cos(ang) * r, Math.sin(ang) * r]); }
  const fortMesh = E.mesh('fort', () => meshPrism(poly, 8)); const fort = [];
  pushInst(fort, [0, 2.2, 0], [1, 1, 1], [0.36, 0.345, 0.32], 0, undefined, 0, 0.9);
  return [E.batch(box, new Float32Array(a)), E.batch(sph, new Float32Array(trees)), E.batch(box, new Float32Array(lamps)), E.batch(fortMesh, new Float32Array(fort))];
}

// ---------------- Manhattan-ish city ----------------
export const ROAD = { AS: 90, AW: 22, SS: 60, SW: 14 };
export function buildCity(E) {
  const box = E.mesh('box', meshBox); const R = rng(2024);
  const bld = [], det = [], lamps = [], bb = [];
  const PAL = [[0.20, 0.21, 0.23], [0.25, 0.19, 0.15], [0.14, 0.17, 0.22], [0.29, 0.27, 0.24], [0.11, 0.11, 0.12], [0.22, 0.23, 0.26]];
  const X0 = -6, X1 = 6, Z0 = -46, Z1 = -14; // block indices: x between avenues k..k+1, z between streets j..j+1
  let seedc = 1;
  function tower(cx, cz, w, d, h, style) {
    const col = PAL[style.pal].map(v => v * (0.85 + 0.3 * R()));
    const cell = style.glass ? 2.5 : 3.2; const lit = 0.65 + 0.55 * R(); const str = 1.55 * (0.7 + 0.6 * R());
    const seed = seedc++;
    let y = 1, ww = w, dd = d, remaining = h; const tiers = h > 110 ? (h > 240 ? 3 : 2) : 1;
    for (let t = 0; t < tiers; t++) {
      const th = t === tiers - 1 ? remaining : remaining * (0.55 + 0.15 * R());
      pushInst(bld, [cx, y + th / 2, cz], [ww, th, dd], col, 1, undefined, seed, 0.75, [lit, str, cell, y - 1]);
      y += th; remaining -= th; ww *= 0.72 + 0.1 * R(); dd *= 0.72 + 0.1 * R();
    }
    if (h > 200) pushInst(det, [cx, y + 0.8, cz], [1.4, 1.4, 1.4], [1.0, 0.08, 0.05], 2, undefined, 0, 0.5, [9, seed, 3, 0]);
    if (h > 330 && style.spire) { pushInst(det, [cx, y + 38, cz], [1.6, 76, 1.6], [0.5, 0.52, 0.55], 0, undefined, 0, 0.4);
      pushInst(det, [cx, y + 77, cz], [1.6, 1.6, 1.6], [1.0, 0.9, 0.8], 2, undefined, 0, 0.5, [12, seed + 0.5, 3, 0]); }
    if (h < 70 && R() < 0.35) { pushInst(det, [cx + (R() - 0.5) * w * 0.5, y + 2.5, cz + (R() - 0.5) * d * 0.5], [3.2, 5, 3.2], [0.18, 0.12, 0.08], 0, undefined, 0, 0.9); }
    return y;
  }
  const special = new Map([['0,-16', { h: 395, spire: true }], ['-2,-15', { h: 300 }], ['2,-17', { h: 330 }], ['-1,-36', { h: 380, spire: true }], ['1,-33', { h: 310 }], ['3,-38', { h: 290 }]]);
  for (let i = X0; i < X1; i++) for (let j = Z0; j < Z1; j++) {
    const bx0 = i * ROAD.AS + ROAD.AW / 2 + 4, bx1 = (i + 1) * ROAD.AS - ROAD.AW / 2 - 4;
    const bz0 = j * ROAD.SS + ROAD.SW / 2 + 4, bz1 = (j + 1) * ROAD.SS - ROAD.SW / 2 - 4;
    const zc = (bz0 + bz1) / 2; const W = bx1 - bx0, D = bz1 - bz0;
    let base, tallP, tallH;
    if (zc > -1150) { base = [40, 150]; tallP = 0.3; tallH = [160, 300]; }
    else if (zc > -1700) { base = [14, 55]; tallP = 0.06; tallH = [70, 130]; }
    else { base = [55, 200]; tallP = 0.25; tallH = [200, 330]; }
    const sp = special.get(i + ',' + j);
    if (sp) { tower((bx0 + bx1) / 2, zc, W * 0.8, D * 0.92, sp.h, { pal: 4, glass: true, spire: sp.spire }); continue; }
    if (R() < tallP) { const h = lerp(tallH[0], tallH[1], R()); tower((bx0 + bx1) / 2, zc, W * (0.6 + 0.3 * R()), D * (0.8 + 0.2 * R()), h, { pal: (R() * 6) | 0, glass: R() < 0.5 }); continue; }
    const n = 2 + ((R() * 2.2) | 0); let x = bx0;
    for (let k = 0; k < n; k++) {
      const w = k === n - 1 ? bx1 - x : (W / n) * (0.75 + 0.5 * R()); const h = lerp(base[0], base[1], Math.pow(R(), 1.6));
      if (D > 30 && h < 60 && R() < 0.5) { tower(x + w / 2, bz0 + D * 0.25, w - 0.6, D / 2 - 0.6, h, { pal: (R() * 6) | 0, glass: false });
        tower(x + w / 2, bz0 + D * 0.75, w - 0.6, D / 2 - 0.6, h * (0.7 + 0.6 * R()), { pal: (R() * 6) | 0, glass: false }); }
      else tower(x + w / 2, zc, w - 0.6, D - 0.6, h, { pal: (R() * 6) | 0, glass: R() < 0.35 });
      x += w;
    }
  }
  // street lamps along avenues
  for (let k = X0; k <= X1; k++) for (const side of [-1, 1]) for (let m = Math.ceil(-2780 / 30); m <= Math.floor(-760 / 30); m++) {
    const x = k * ROAD.AS + side * (ROAD.AW / 2 + 1), z = m * 30;
    if (Math.abs(z - 60 * Math.round(z / 60)) < 9) continue;
    pushInst(lamps, [x, 5, z], [0.35, 10, 0.35], [0.05, 0.05, 0.055], 0, undefined, 0, 0.6);
    pushInst(lamps, [x - side * 1.3, 10, z], [2.6, 0.3, 0.6], [1.0, 0.8, 0.55], 2, undefined, 0, 0.5, [6.5, k * 1000 + m + side * 0.5, 1, 0]);
  }
  // billboards facing avenue 0 near the street camera
  for (let m = 0; m < 26; m++) { const side = m % 2 ? 1 : -1; const z = -1360 - m * 14 - R() * 6; const h = 12 + R() * 30;
    const q = side > 0 ? quatAxis([0, 1, 0], -Math.PI / 2) : quatAxis([0, 1, 0], Math.PI / 2);
    pushInst(bb, [side * 15.3, h, z], [10 + R() * 6, 6 + R() * 8, 0.3], [1, 1, 1], 9, q, R(), 0.5, [2.6 + 1.6 * R(), 5000 + m, 1, 0]); }
  // ground with procedural roads
  const gnd = []; pushInst(gnd, [0, 0.5, -1760], [1300, 1.0, 2140], [0.07, 0.07, 0.07], 10, undefined, 0, 0.9);
  // shores (Jersey / Brooklyn hints)
  const shore = [];
  for (const [cx, cz, w, d, hmax, n] of [[-1150, -1100, 600, 1500, 140, 90], [1150, -1100, 600, 1500, 45, 110]]) {
    pushInst(gnd, [cx, 0.5, cz], [w, 1.0, d], [0.05, 0.05, 0.05], 0, undefined, 0, 0.9);
    for (let k = 0; k < n; k++) { const x = cx + (R() - 0.5) * w * 0.9, z = cz + (R() - 0.5) * d * 0.9; const h = 10 + Math.pow(R(), 2.2) * hmax;
      pushInst(shore, [x, 1 + h / 2, z], [18 + R() * 25, h, 18 + R() * 25], [0.15, 0.15, 0.16], 1, undefined, seedc++, 0.8, [0.9, 1.5, 3.2, 0]); }
  }
  return { buildings: E.batch(box, new Float32Array(bld)), details: E.batch(box, new Float32Array(det)), lamps: E.batch(box, new Float32Array(lamps)),
    billboards: E.batch(box, new Float32Array(bb)), ground: E.batch(box, new Float32Array(gnd)), shore: E.batch(box, new Float32Array(shore)) };
}

// ---------------- traffic on avenue 0 ----------------
export function buildCars(E) {
  const box = E.mesh('box', meshBox); const R = rng(31); const cars = [];
  const lanes = [{ x: -8.0, dir: 1 }, { x: -3.0, dir: 1 }, { x: 3.0, dir: -1 }, { x: 8.0, dir: -1 }];
  const COLS = [[0.02, 0.02, 0.025], [0.25, 0.26, 0.28], [0.5, 0.5, 0.52], [0.18, 0.03, 0.03], [0.03, 0.06, 0.15], [0.6, 0.6, 0.62]];
  for (const ln of lanes) {
    let z = -2750 + R() * 10;
    while (z < -1240) {
      const taxi = R() < 0.32; const len = taxi ? 4.8 : 4.3 + R() * 1.0;
      cars.push({ x: ln.x + (R() - 0.5) * 0.6, z0: z, dir: ln.dir, v: 9 + R() * 4, len, taxi, col: taxi ? [0.85, 0.55, 0.03] : COLS[(R() * COLS.length) | 0] });
      z += len + 7 + R() * 16;
    }
  }
  const data = new Float32Array(cars.length * 6 * 20);
  const b = E.batch(box, data, true);
  b.cars = cars; b.data = data;
  return b;
}
export function updateCars(E, b, t, tBlack) {
  const a = []; const tau = 2.6;
  for (const c of b.cars) {
    const dist = t < tBlack ? c.v * t : c.v * tBlack + c.v * tau * (1 - Math.exp(-(t - tBlack) / tau));
    const z = c.z0 - c.dir * dist; if (z > -1238 || z < -2790) continue;
    const f = -c.dir; // forward z sign (dir 1 = northbound = -z)
    pushInst(a, [c.x, 1.0 + 0.75, z], [1.9, 1.1, c.len], c.col, 0, undefined, 0, 0.35);
    pushInst(a, [c.x, 1.0 + 1.65, z - f * 0.3], [1.7, 0.75, c.len * 0.5], c.taxi ? c.col : c.col.map(v => v * 0.6), 0, undefined, 0, 0.2);
    for (const s of [-0.62, 0.62]) {
      pushInst(a, [c.x + s, 1.0 + 0.85, z + f * (c.len / 2 + 0.02)], [0.42, 0.22, 0.12], [1.0, 0.95, 0.85], 2, undefined, 0, 0.5, [8, 0, 2, 0]);
      pushInst(a, [c.x + s, 1.0 + 0.95, z - f * (c.len / 2 + 0.02)], [0.38, 0.2, 0.1], [1.0, 0.05, 0.03], 2, undefined, 0, 0.5, [5, 0, 2, 0]);
    }
  }
  const n = a.length / 20; b.data.set(a); E.updateBatch(b, b.data, n);
}

// ---------------- copper flecks from the dissolving skin ----------------
export function buildFlecks(E, vox) {
  const sel = vox.filter((v, i) => i % 4 === 0); const R = rng(44);
  for (const v of sel) { v.vel = V3.add(V3.scale(v.out, 4 + R() * 7), [(R() - 0.5) * 3, 2 + R() * 5, (R() - 0.5) * 3]); v.life = 0.9 + R() * 1.1; v.sz = 0.22 + R() * 0.25; }
  const data = new Float32Array(sel.length * 20); const b = E.batch(E.mesh('box', meshBox), data, true); b.sel = sel; b.data = data; b.shadow = false; return b;
}
export function updateFlecks(E, b, t, t0, dur) { // voxel with seed n vanishes at t0 + n/1.02*dur
  const a = []; const k = 1.4, g = 5.0;
  for (const v of b.sel) {
    const ts = t0 + (v.n / 1.02) * dur; const tau = t - ts; if (tau < 0 || tau > v.life) continue;
    const e = (1 - Math.exp(-k * tau)) / k;
    const p = [v.p[0] + v.vel[0] * e, v.p[1] + v.vel[1] * e - g * (tau - e) / k, v.p[2] + v.vel[2] * e];
    const life = 1 - tau / v.life; const s = v.sz * (0.4 + 0.6 * life);
    pushInst(a, p, [s, s, s], [0.6, 0.3, 0.15], 12, quatAxis([v.out[0], 1, v.out[2]], tau * 6), 0, 0.5, [7 * life * life, 0, 0, 1]);
  }
  const n = a.length / 20; if (n) b.data.set(a); E.updateBatch(b, b.data, n);
}

// ---------------- tabletop: pennies + candle ----------------
export function makeCoinTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
  x.fillStyle = 'rgb(150,150,150)'; x.beginPath(); x.arc(S / 2, S / 2, S * 0.49, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgb(95,95,95)'; x.beginPath(); x.arc(S / 2, S / 2, S * 0.43, 0, Math.PI * 2); x.fill();
  // stylized bust facing right
  x.fillStyle = 'rgb(175,175,175)';
  x.beginPath(); x.ellipse(S * 0.5, S * 0.42, S * 0.12, S * 0.15, -0.15, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(S * 0.33, S * 0.78); x.quadraticCurveTo(S * 0.36, S * 0.56, S * 0.47, S * 0.55); x.quadraticCurveTo(S * 0.62, S * 0.57, S * 0.68, S * 0.78); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(S * 0.61, S * 0.42); x.lineTo(S * 0.645, S * 0.46); x.lineTo(S * 0.6, S * 0.47); x.fill();
  x.fillStyle = 'rgb(165,165,165)'; x.font = `bold ${S * 0.07}px Inter, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const arc = (txt, r, a0, a1) => { const n = txt.length; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / n; x.save(); x.translate(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); x.rotate(a + Math.PI / 2); x.fillText(txt[i], 0, 0); x.restore(); } };
  arc('IN GOD WE TRUST', S * 0.37, -Math.PI * 0.82, -Math.PI * 0.18);
  x.save(); x.translate(S * 0.21, S * 0.52); x.rotate(-Math.PI / 2); x.font = `bold ${S * 0.065}px Inter, sans-serif`; x.fillText('LIBERTY', 0, 0); x.restore();
  x.font = `bold ${S * 0.07}px Inter, sans-serif`; x.fillText('1999', S * 0.76, S * 0.62);
  x.filter = 'blur(1.5px)'; x.drawImage(c, 0, 0); x.filter = 'none';
  return c;
}
export const COINS = [
  { p: [-1.7, 0, 0.6], rot: 0.4, old: false, stack: 4 }, { p: [0.6, 0, 1.4], rot: 2.1, old: false }, { p: [2.0, 0, -0.2], rot: 4.4, old: false },
  { p: [0.7, 0, -2.9], rot: 1.0, old: true }, { p: [1.3, 0, 2.9], rot: 5.2, old: false }, { p: [-2.3, 0, 2.6], rot: 3.3, old: false },
  { p: [3.0, 0, 1.7], rot: 0.2, old: false }, { p: [-3.4, 0, -0.9], rot: 2.7, old: false }];
export function buildTable(E) {
  const box = E.mesh('box', meshBox);
  const coinMesh = E.mesh('coin', () => meshLathe([[1.0, 0], [1.0, 0.15]], 48));
  const tab = []; pushInst(tab, [0, -1, 0], [80, 2, 50], [0.3, 0.2, 0.1], 6, undefined, 0, 0.6);
  const coins = [], oldc = [];
  for (const c of COINS) {
    const n = c.stack || 1;
    for (let s = 0; s < n; s++) {
      const q = quatMul(quatAxis([0, 1, 0], c.rot + s * 0.9), quatAxis([1, 0, 0], s ? 0.02 * (s % 2 ? 1 : -1) : 0));
      const p = [c.p[0] + (s ? (s % 2 ? 0.06 : -0.05) : 0), s * 0.155, c.p[2] + (s ? 0.04 * s : 0)];
      pushInst(c.old ? oldc : coins, p, [1, 1, 1], [1, 1, 1], 5, q, 0, 0.35, [c.old ? 0 : 1, 0, 0, 0]);
    }
  }
  const candle = []; pushInst(candle, [6.6, 1.8, -10.5], [1.5, 3.6, 1.5], [0.9, 0.86, 0.78], 7, undefined, 0, 0.6, [1, 0, 0, 0]);
  const flame = []; pushInst(flame, [6.6, 4.2, -10.5], [0.3, 0.8, 0.3], [1, 1, 1], 8, undefined, 1.3, 0.5, [1, 0, 0, 0]);
  const wick = []; pushInst(wick, [6.6, 3.68, -10.5], [0.06, 0.3, 0.06], [0.02, 0.02, 0.02], 0, undefined, 0, 0.9);
  const sph = E.mesh('sphere', () => meshSphere(12, 16)); const cyl = E.mesh('cyl', () => meshLathe([[0.5, -0.5], [0.5, 0.5]], 32));
  return { table: E.batch(box, new Float32Array(tab)), coins: E.batch(coinMesh, new Float32Array(coins)), old: E.batch(coinMesh, new Float32Array(oldc)),
    candle: E.batch(cyl, new Float32Array(candle)), wick: E.batch(box, new Float32Array(wick)), flame: E.batch(sph, new Float32Array(flame)) };
}
export function buildDust(E) {
  const R = rng(88); const old = COINS.find(c => c.old); const parts = [];
  for (let k = 0; k < 1400; k++) { const r = Math.sqrt(R()) * 0.97, a = R() * Math.PI * 2;
    parts.push({ p: [old.p[0] + Math.cos(a) * r, 0.01 + R() * 0.14, old.p[2] + Math.sin(a) * r], v: [(R() - 0.5) * 0.45, 0.05 + R() * 0.3, (R() - 0.5) * 0.45], sz: 0.012 + R() * 0.03, d: R() * 0.5 }); }
  const data = new Float32Array(parts.length * 20); const b = E.batch(E.mesh('box', meshBox), data, true); b.parts = parts; b.data = data; return b;
}
export function updateDust(E, b, t, t0) {
  const a = []; const g = 2.4;
  for (const q of b.parts) { const tau = t - t0 - q.d; if (tau < 0) { continue; }
    const tc = (q.v[1] + Math.sqrt(q.v[1] * q.v[1] + 2 * g * (q.p[1] - 0.02))) / g; const tt = Math.min(tau, tc);
    const p = [q.p[0] + q.v[0] * tt, Math.max(0.02, q.p[1] + q.v[1] * tt - 0.5 * g * tt * tt), q.p[2] + q.v[2] * tt];
    pushInst(a, p, [q.sz, q.sz, q.sz], [0.62, 0.63, 0.66], 12, quatAxis([1, 0.3, 0.2], tt * 9 + q.d * 10), 0, 0.8, [0, 0, 0, 1]); }
  const n = a.length / 20; if (n) b.data.set(a); E.updateBatch(b, b.data, n);
}
