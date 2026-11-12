// world5.js — Black Canyon and Hoover Dam (finished, as staggered 5-ft-lift columns, and as a single pour), the crest,
// intake towers, powerhouse, cableways, the ice plant on the lower cofferdam, the highway, a bread oven and the bread. Original code.
// Units: metres. River flows toward +z. Dam crest at y = 221.4 (726.4 ft). Upstream face is an arc of radius R centred downstream.
import { pushInst, pushBar, meshBox, meshSphere, meshLathe, V3, quatAxis, quatMul } from './engine.js';

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const qx = (a) => quatAxis([1, 0, 0], a), qy = (a) => quatAxis([0, 1, 0], a), qz = (a) => quatAxis([0, 0, 1], a);
export const Q0 = [0, 0, 0, 1];
export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vn(x, z) { const ix = Math.floor(x), iz = Math.floor(z); let fx = x - ix, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash2(ix, iz), hash2(ix + 1, iz), fx), lerp(hash2(ix, iz + 1), hash2(ix + 1, iz + 1), fx), fz); }
function fbm(x, z) { let s = 0, a = 0.5; for (let i = 0; i < 4; i++) { s += a * vn(x, z); x = x * 2.03 + 17.1; z = z * 2.03 + 9.7; a *= 0.5; } return s / 0.9375; }

// ---------------- dam geometry ----------------
export const H = 221.4, R = 180, CREST_T = 13.7, BASE_T = 201.2, LIFT = 1.524, DX = 18.3, NROW = 12, DS = BASE_T / NROW;
export const LAKE = 190, RIVER = 2;
export function thick(y) { return CREST_T + (BASE_T - CREST_T) * Math.pow(Math.max(0, 1 - y / H), 1.35); }
export function thickInv(s) { if (s <= CREST_T) return H; if (s >= BASE_T) return 0; return H * (1 - Math.pow((s - CREST_T) / (BASE_T - CREST_T), 1 / 1.35)); }
export function zU(x) { return R - Math.sqrt(Math.max(R * R - x * x, 0)); }
export function dzU(x) { return x / Math.sqrt(Math.max(R * R - x * x, 1)); }
export function halfW(y) { if (y <= 0) return 50; if (y <= 240) return 50 + 92 * Math.pow(y / H, 0.85); return halfW(240) + (y - 240) * 0.9; }
export function wallY(d) { if (d <= 50) return 0; const w240 = halfW(240); if (d <= w240) return H * Math.pow((d - 50) / 92, 1 / 0.85); return 240 + (d - w240) / 0.9; }
export const xExt = (y) => halfW(Math.max(y, 0)) + 16;

// ---------------- terrain ----------------
export function terrainY(x, z) {
  let c = 0, k = 1, floorY = -3;
  if (z > 360) c = 34 * Math.sin((z - 360) / 300) * Math.min(1, (z - 360) / 200);
  if (z < -110) { const u = (-110 - z) / 280; k = 1 + 1.7 * Math.pow(u, 1.2); floorY = -3 - 30 * Math.min(1, u); }
  let d = Math.abs(x - c) / k;
  const nearDam0 = 1 - sstep(70, 170, Math.abs(z - 100));
  if (d > 46) d += ((fbm(z * 0.011 + 5, x * 0.003) - 0.5) * 30 + (vn(z * 0.05, x * 0.05 + 3) - 0.5) * 8) * lerp(1, 0.3, nearDam0) + 3 * nearDam0; // buttresses and gullies along the walls
  let y = d <= 50 ? floorY : Math.max(floorY, wallY(d));
  if (y > 300) y = 300 + (y - 300) * 0.04;
  const nearDam = 1 - sstep(60, 160, Math.abs(z - 100)) * 1; // calm walls where the dam meets the rock
  const wall = sstep(50, 66, d) * (1 - sstep(195, 235, d));
  const amp = lerp(1, 0.5, nearDam);
  y += ((fbm(x * 0.018 + 3, z * 0.018) - 0.5) * 20 + (vn(x * 0.09, z * 0.09) - 0.5) * 5) * wall * amp;
  const pl = sstep(205, 270, d);
  y += pl * ((fbm(x * 0.0022, z * 0.0022) - 0.5) * 80 + (vn(x * 0.012, z * 0.012) - 0.5) * 12);
  return y;
}
function gridMesh(X, Z, fy) { // heightfield grid -> mesh (pos, normal, uv)
  const nx = X.length, nz = Z.length; const v = new Float32Array(nx * nz * 8); const Y = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) Y[j * nx + i] = fy(X[i], Z[j]);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(nx - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(nz - 1, j + 1);
    const dx = (Y[j * nx + i1] - Y[j * nx + i0]) / (X[i1] - X[i0]), dz = (Y[j1 * nx + i] - Y[j0 * nx + i]) / (Z[j1] - Z[j0]);
    const n = V3.norm([-dx, 1, -dz]); const o = (j * nx + i) * 8;
    v[o] = X[i]; v[o + 1] = Y[j * nx + i]; v[o + 2] = Z[j]; v[o + 3] = n[0]; v[o + 4] = n[1]; v[o + 5] = n[2]; v[o + 6] = i / (nx - 1); v[o + 7] = j / (nz - 1);
  }
  const idx = new Uint16Array((nx - 1) * (nz - 1) * 6); let m = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c2 = a + nx, d = c2 + 1; idx[m++] = a; idx[m++] = c2; idx[m++] = b; idx[m++] = b; idx[m++] = c2; idx[m++] = d; }
  return { v, i: idx };
}
function terrainMesh() {
  const hx = [0, 10, 20]; for (let v = 30; v < 250; v += 2.2) hx.push(v); let v = 250, st = 4; while (v < 2600) { hx.push(v); v += st; st *= 1.12; } hx.push(2600);
  const X = [...hx.slice(1).map(a => -a).reverse(), ...hx];
  const Z = []; let z = -2600, s = 190; const zs = []; { let zz = -205, ss = 5; while (zz > -2600) { zs.push(zz); zz -= ss; ss *= 1.12; } zs.push(-2600); }
  Z.push(...zs.reverse()); for (let q = -200; q <= 520; q += 5) Z.push(q); { let zz = 525, ss = 5; while (zz < 3200) { Z.push(zz); zz += ss; ss *= 1.12; } Z.push(3200); }
  void z; void s;
  return gridMesh(X, Z, terrainY);
}

// finished (or single-pour) dam: upstream face, downstream face, crest, end caps
function damMesh() {
  const NA = 120, NY = 70; const v = [], idx = [];
  const yAt = (k) => -6 + (H + 6) * (k / NY);
  const P = (a, y, down) => { const x = a * xExt(y); const z = zU(x) + (down ? thick(Math.max(y, 0)) : 0); return [x, y, z]; };
  const face = (down) => {
    const base = v.length / 8;
    for (let k = 0; k <= NY; k++) for (let i = 0; i <= NA; i++) {
      const a = -1 + 2 * i / NA, y = yAt(k); const p = P(a, y, down);
      const pa = V3.sub(P(Math.min(1, a + 0.01), y, down), P(Math.max(-1, a - 0.01), y, down));
      const py = V3.sub(P(a, Math.min(H, y + 0.5), down), P(a, Math.max(-6, y - 0.5), down));
      let n = V3.norm(V3.cross(pa, py)); if ((down && n[2] < 0) || (!down && n[2] > 0)) n = V3.scale(n, -1);
      v.push(p[0], p[1], p[2], n[0], n[1], n[2], i / NA, k / NY);
    }
    for (let k = 0; k < NY; k++) for (let i = 0; i < NA; i++) { const a = base + k * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  };
  face(false); face(true);
  { const base = v.length / 8; // crest top
    for (let i = 0; i <= NA; i++) { const a = -1 + 2 * i / NA; const pu = P(a, H, false), pd = P(a, H, true); v.push(...pu, 0, 1, 0, i / NA, 0, ...pd, 0, 1, 0, i / NA, 1); }
    for (let i = 0; i < NA; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); } }
  for (const side of [-1, 1]) { const base = v.length / 8; // end caps (buried in the rock)
    for (let k = 0; k <= NY; k++) { const y = yAt(k); const pu = P(side, y, false), pd = P(side, y, true); v.push(...pu, side, 0, 0, 0, k / NY, ...pd, side, 0, 0, 1, k / NY); }
    for (let k = 0; k < NY; k++) { const a = base + k * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); } }
  return { v: new Float32Array(v), i: new Uint16Array(idx) };
}
function sectionMesh() { // the dam's cross-section in the plane x = 0
  const v = [], idx = []; const NY = 90;
  for (let k = 0; k <= NY; k++) { const y = -6 + (H + 6) * k / NY; v.push(0, y, 0, 1, 0, 0, 0, k / NY, 0, y, thick(Math.max(y, 0)), 1, 0, 0, 1, k / NY); }
  for (let k = 0; k < NY; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  return { v: new Float32Array(v), i: new Uint16Array(idx) };
}
function lakeMesh() { // flat water surface upstream of the dam, its downstream edge hugging the arch
  const v = [], idx = []; const xs = []; for (let x = -2600; x < -200; x += 100) xs.push(x); for (let x = -200; x <= 200; x += 2.5) xs.push(x); for (let x = 300; x <= 2600; x += 100) xs.push(x);
  for (const x of xs) { const ze = Math.abs(x) < 175 ? zU(x) + 1.0 : zU(175) + 1.0; v.push(x, 0, -2600, 0, 1, 0, 0, 0, x, 0, ze, 0, 1, 0, 0, 1); }
  for (let i = 0; i < xs.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  return { v: new Float32Array(v), i: new Uint16Array(idx) };
}
function pileMesh() { // a smooth mound filling the canyon below the dam (scaled in y as it grows)
  const X = []; for (let x = -240; x <= 240; x += 6) X.push(x); const Z = []; for (let z = 150; z <= 1100; z += 8) Z.push(z);
  return gridMesh(X, Z, (x, z) => { const dz = z - 205; const prof = sstep(-30, 120, dz) * (1 - sstep(500, 880, dz)) ; const w = Math.max(0, 1 - Math.pow(Math.abs(x) / 230, 2));
    return (Math.pow(w, 0.55) * prof - 0.02) * 1.0 + (vn(x * 0.05, z * 0.05) - 0.5) * 0.03 * prof; });
}
function loafMesh() { // a loaf: an elongated, flat-bottomed dome (scaled per instance)
  const m = meshSphere(10, 18); const v = m.v;
  for (let k = 0; k < v.length; k += 8) { if (v[k + 1] < -0.18) { v[k + 1] = -0.18 + (v[k + 1] + 0.18) * 0.15; v[k + 4] = Math.min(v[k + 4], -0.6); } }
  return m;
}

export function meshes(E) {
  return {
    box: E.mesh('box', meshBox), sph: E.mesh('sph', () => meshSphere(12, 18)), terrain: E.mesh('terrain', terrainMesh), dam: E.mesh('dam', damMesh),
    section: E.mesh('section', sectionMesh), lake: E.mesh('lake', lakeMesh), pile: E.mesh('pile', pileMesh), loaf: E.mesh('loaf', loafMesh),
    tower: E.mesh('tower', () => meshLathe([[10.5, 0], [9.6, 3], [9.6, 118], [11.8, 126], [11.8, 133], [10.2, 135], [8.2, 140], [4.5, 144.5], [0.6, 147]], 28)),
    bucket: E.mesh('bucket', () => meshLathe([[0.4, 0], [1.25, 0.4], [1.45, 2.4], [1.5, 2.6], [1.45, 2.7]], 20, { caps: false })),
    stack: E.mesh('stack', () => meshLathe([[1.6, 0], [1.3, 30], [1.4, 31], [1.4, 32]], 16)),
  };
}

// ---------------- the columns (5-ft lifts) ----------------
export function columnList() {
  const L = [];
  for (let i = -9; i <= 8; i++) for (let j = 0; j < NROW; j++) {
    const xc = (i + 0.5) * DX, sc = (j + 0.5) * DS; const xin = Math.max(0, Math.abs(xc) - DX / 2);
    const yTop = thickInv(sc); const yBot = xin <= 50 ? -5 : wallY(xin) - 28;
    if (yBot >= yTop - 26) continue; if (xin > xExt(yTop) - 2) continue;
    const r = rng(1000 + (i + 20) * 31 + j)();
    L.push({ i, j, xc, sc, yTop, yBot, slope: dzU(xc), stag: ((i + j) & 1 ? 1 : -1) * 6 + Math.round((r - 0.5) * 6), r });
  }
  return L;
}
// height of a column (top y) at construction progress p (0..1), quantized to 5-ft lifts
export function colTop(c, p) {
  const span = c.yTop - c.yBot; const lifts = Math.floor(span / LIFT);
  const n = clamp(Math.round(p * (lifts + 14) - 7 + c.stag), 0, lifts);
  return c.yBot + n * LIFT;
}
export function pushColumn(a, c, top, heat, decay, gap = 0.9) {
  const h = top - c.yBot; if (h <= 0.05) return;
  const sx = DX - gap, sz = DS - gap;
  pushInst(a, [c.xc, c.yBot + h / 2, zU(c.xc) + c.sc], [sx, h, sz], [1, 1, 1], 27, Q0, c.r * 100, 0.8, [heat, decay, c.slope * sx / sz, 5]);
}
export function colPoint(c, lx, y, ls) { // a point inside column c: lx, ls in metres from its centre (along x, along the river)
  const x = c.xc + lx; return [x, y, zU(c.xc) + c.sc + ls + c.slope * lx];
}

// ---------------- static batches ----------------
export function buildCanyon(E, M) {
  const B = {};
  const t = []; pushInst(t, [0, 0, 0], [1, 1, 1], [1, 1, 1], 26, Q0, 0, 0.9, [0, 0, 0, 0]);
  B.terrain = E.batch(M.terrain, new Float32Array(t), true); B.terrain.buf = new Float32Array(20);
  const d = []; pushInst(d, [0, 0, 0], [1, 1, 1], [1, 1, 1], 27, Q0, 0, 0.8, [0, 0, 0, 1]);
  B.dam = E.batch(M.dam, new Float32Array(d)); B.dam.cut = true;
  const sct = []; pushInst(sct, [0.02, 0, 0], [1, 1, 1], [1, 1, 1], 30, Q0, 0, 0.8, [0, 0, 0, 0]); B.section = E.batch(M.section, new Float32Array(sct)); B.section.shadow = false;
  const lk = []; pushInst(lk, [0, LAKE, 0], [1, 1, 1], [0.02, 0.07, 0.085], 29, Q0, 0, 0.1, [0, 0, 0, 0]); B.lake = E.batch(M.lake, new Float32Array(lk)); B.lake.shadow = false; B.lake.refl = false;
  // river strips (used when the reflective water plane is off)
  const rv = []; pushInst(rv, [0, RIVER, 1800], [260, 0.2, 2700], [0.02, 0.06, 0.07], 29, Q0, 0, 0.1, [0, 0, 0, 0]);
  B.riverDown = E.batch(M.box, new Float32Array(rv)); B.riverDown.shadow = false;
  const rv2 = []; pushInst(rv2, [0, RIVER, 1850], [260, 0.2, 2700], [0.02, 0.06, 0.07], 29, Q0, 0, 0.1, [0, 0, 0, 0]);
  pushInst(rv2, [0, RIVER, -1500], [700, 0.2, 2400], [0.02, 0.06, 0.07], 29, Q0, 0, 0.1, [0, 0, 0, 0]);
  B.riverConstr = E.batch(M.box, new Float32Array(rv2)); B.riverConstr.shadow = false;
  // crest: road, parapets, towers along the arch; intake towers + bridges; powerhouse wings
  const cr = [], tw = [];
  const segs = 64; const xe = xExt(H) - 14;
  for (let k = 0; k < segs; k++) {
    const x0 = -xe + 2 * xe * k / segs, x1 = -xe + 2 * xe * (k + 1) / segs, xm = (x0 + x1) / 2; const L = Math.hypot(x1 - x0, zU(x1) - zU(x0));
    const ang = Math.atan(dzU(xm)); const q = qy(-ang); const z0 = zU(xm);
    const nrm = [-Math.sin(ang), 0, Math.cos(ang)]; // downstream normal of the arch
    const at = (s, y) => [xm + nrm[0] * s, y, z0 + nrm[2] * s];
    pushInst(cr, at(CREST_T * 0.5, H + 0.15), [L + 0.1, 0.3, CREST_T - 2.2], [0.12, 0.12, 0.13], 0, q, 0, 0.6);
    pushInst(cr, at(0.5, H + 0.8), [L + 0.1, 1.6, 0.9], [0.66, 0.62, 0.56], 27, q, k, 0.8, [0, 0, 0, 3]);
    pushInst(cr, at(CREST_T - 0.5, H + 0.8), [L + 0.1, 1.6, 0.9], [0.66, 0.62, 0.56], 27, q, k + 99, 0.8, [0, 0, 0, 3]);
    if (k % 9 === 4) { pushInst(cr, at(CREST_T + 2.5, H - 6), [7, 24, 7], [0.66, 0.62, 0.56], 27, q, k + 7, 0.8, [0, 0, 0, 3]); pushInst(cr, at(CREST_T + 2.5, H + 6.6), [7.6, 1.2, 7.6], [0.7, 0.66, 0.6], 27, q, k + 8, 0.8, [0, 0, 0, 3]); }
  }
  for (const sx of [-1, 1]) for (const zt of [-14, -66]) {
    pushInst(tw, [sx * 104, 90, zt], [1, 1, 1], [0.66, 0.62, 0.56], 27, Q0, 3 + zt, 0.8, [0, 0, 0, 3]);
  }
  B.crest = E.batch(M.box, new Float32Array(cr)); B.towers = E.batch(M.tower, new Float32Array(tw));
  const br = []; for (const sx of [-1, 1]) for (const zt of [-14, -66]) pushInst(br, [sx * 125, 226.5, zt], [32, 2.2, 4], [0.6, 0.57, 0.52], 27, Q0, 1, 0.8, [0, 0, 0, 3]);
  // powerhouse wings at the toe
  const zt0 = 203;
  for (const sx of [-1, 1]) {
    pushInst(br, [sx * 38, 22, zt0 + 75], [28, 44, 150], [0.64, 0.6, 0.54], 27, Q0, 5 + sx, 0.8, [0, 0, 0, 3]);
    pushInst(br, [sx * 38, 44.6, zt0 + 75], [29, 1.2, 151], [0.5, 0.48, 0.45], 27, Q0, 6 + sx, 0.8, [0, 0, 0, 3]);
    for (let k = 0; k < 9; k++) pushInst(br, [sx * 23.9, 26, zt0 + 12 + k * 16], [0.4, 22, 7], [0.06, 0.07, 0.08], 0, Q0, 0, 0.3);
    for (let k = 0; k < 6; k++) pushInst(br, [sx * 38 + (k % 2 ? 6 : -6), 48, zt0 + 20 + k * 22], [6, 6, 8], [0.42, 0.42, 0.44], 19, Q0, 0, 0.5, [2, 0.5, 0, 0]);
  }
  B.bridges = E.batch(M.box, new Float32Array(br));
  return B;
}

// cableways across the canyon (construction): towers on both rims, five cables, trolleys + buckets
export const CABLES = [10, 52, 94, 136, 178];
export function cableSag(x, z) { return 336 - 22 * (1 - Math.pow(x / 270, 2)); }
export function buildCableways(E, M) {
  const a = [];
  for (const z of CABLES) for (const sx of [-1, 1]) {
    const x = sx * 272; const y0 = terrainY(x, z);
    pushBar(a, [x, y0 - 4, z], [x, 342, z], 1.6, [0.25, 0.24, 0.23], 19, 0, 0.6, [2, 0.6, 0, 0]);
    pushBar(a, [x - sx * 5, y0 - 4, z - 4], [x, 342, z], 0.9, [0.25, 0.24, 0.23], 19, 0, 0.6, [2, 0.6, 0, 0]);
    pushBar(a, [x - sx * 5, y0 - 4, z + 4], [x, 342, z], 0.9, [0.25, 0.24, 0.23], 19, 0, 0.6, [2, 0.6, 0, 0]);
  }
  for (const z of CABLES) for (let k = 0; k < 24; k++) { const x0 = -272 + 544 * k / 24, x1 = -272 + 544 * (k + 1) / 24;
    pushBar(a, [x0, cableSag(x0, z) + (k === 0 ? 6 : 0), z], [x1, cableSag(x1, z) + (k === 23 ? 6 : 0), z], 0.35, [0.1, 0.1, 0.1], 0, 0, 0.5); }
  const B = E.batch(M.box, new Float32Array(a)); return B;
}
// lower cofferdam with the refrigeration (ice) plant
export const PLANT = [8, 0, 452];
export function buildIcePlant(E, M) {
  const a = [], s = [];
  const zc = PLANT[2];
  for (let k = 0; k < 4; k++) pushInst(a, [0, 4 + k * 6, zc], [230 - k * 18, 7, 70 - k * 13], [0.55, 0.45, 0.33], 26, Q0, 0, 0.9, [1, 0, 0, 0]);
  const top = 25.5;
  pushInst(a, [PLANT[0], top + 9, zc - 2], [34, 18, 15], [0.72, 0.7, 0.66], 27, Q0, 2, 0.8, [0, 0, 0, 3]);
  pushInst(a, [PLANT[0], top + 18.6, zc - 2], [35, 1.2, 16], [0.3, 0.3, 0.31], 0, Q0, 0, 0.6);
  pushInst(a, [PLANT[0] - 22, top + 6, zc - 2], [10, 12, 12], [0.7, 0.68, 0.64], 27, Q0, 3, 0.8, [0, 0, 0, 3]);
  for (let k = 0; k < 6; k++) pushInst(a, [PLANT[0] - 12 + k * 5, top + 9, zc + 5.6], [2.8, 4, 0.2], [0.05, 0.06, 0.07], 0, Q0, 0, 0.3);
  for (let k = 0; k < 5; k++) pushInst(a, [PLANT[0] + 22, top + 2 + k * 2.6, zc - 8 + k * 0.0], [6, 0.6, 14], [0.5, 0.52, 0.55], 19, Q0, 0, 0.4, [2, 0.5, 0, 0]);
  pushInst(s, [PLANT[0] - 6, top + 18, zc - 6], [1, 1, 1], [0.3, 0.29, 0.28], 19, Q0, 0, 0.6, [0, 0.4, 0, 0]);
  pushInst(s, [PLANT[0] + 4, top + 18, zc - 6], [0.8, 0.8, 0.8], [0.3, 0.29, 0.28], 19, Q0, 0, 0.6, [0, 0.4, 0, 0]);
  // chilled-water mains running up the canyon floor to the dam (frosted)
  for (const ox of [-3, 3]) pushBar(a, [PLANT[0] + 12 + ox, top - 3, zc - 30], [PLANT[0] + 12 + ox, 2.2, 240], 1.3, [0.78, 0.84, 0.9], 19, 0, 0.5, [2, 0.4, 0, 0.15]);
  return { boxes: E.batch(M.box, new Float32Array(a)), stacks: E.batch(M.stack, new Float32Array(s)) };
}

// ---------------- the highway (separate set) ----------------
export function buildRoadSet(E, M) {
  const g = [], m = [];
  pushInst(g, [0, -0.5, 0], [60000, 1, 60000], [1, 1, 1], 26, Q0, 0, 0.9, [1, 0, 0, 0]);
  const R2 = rng(77);
  for (let k = 0; k < 70; k++) { const x = (R2() - 0.2) * 9000, side = R2() < 0.5 ? -1 : 1, z = side * (300 + R2() * 3500); const w = 80 + R2() * 500, h = 30 + R2() * 160;
    const dz = w * (0.4 + R2()), rot = qy(R2() * 3);
    pushInst(m, [x, h / 2 - 2, z], [w, h, dz], [1, 1, 1], 26, rot, k, 0.9, [0, 0, 0, 0]);
    pushInst(m, [x, h + 1, z], [w * 0.96, 6, dz * 0.96], [1, 1, 1], 26, rot, k + 50, 0.9, [0, 0, 0, 0]); }
  return { ground: E.batch(M.box, new Float32Array(g)), mesas: E.batch(M.box, new Float32Array(m)) };
}

// ---------------- the oven (separate set) ----------------
export function buildOven(E, M) {
  const a = [], gl = [], rk = [];
  const W = 3.2, D = 3.6, Hh = 1.7; // chamber
  pushInst(a, [0, -0.15, -D / 2], [W + 1.2, 0.3, D + 1.2], [1, 1, 1], 26, Q0, 0, 0.9, [2, 0, 0, 0]);
  pushInst(a, [0, Hh / 2, -D - 0.25], [W + 1.2, Hh + 1.6, 0.5], [1, 1, 1], 26, Q0, 1, 0.9, [2, 0, 0, 0]);
  for (const sx of [-1, 1]) pushInst(a, [sx * (W / 2 + 0.25), Hh / 2, -D / 2], [0.5, Hh + 1.2, D + 0.5], [1, 1, 1], 26, Q0, 2, 0.9, [2, 0, 0, 0]);
  for (let k = 0; k < 9; k++) { const ang = Math.PI * (k + 0.5) / 9; const x = Math.cos(ang) * W / 2, y = Hh + Math.sin(ang) * 0.75;
    pushInst(a, [x, y, -D / 2], [0.62, 0.32, D + 0.5], [1, 1, 1], 26, qz(ang - Math.PI / 2), 3 + k, 0.9, [2, 0, 0, 0]); }
  // front wall with the mouth
  pushInst(a, [-(W / 2 + 0.2), Hh / 2 + 0.3, 0.25], [1.6, Hh + 2.2, 0.5], [1, 1, 1], 26, Q0, 4, 0.9, [2, 0, 0, 0]);
  pushInst(a, [(W / 2 + 0.2), Hh / 2 + 0.3, 0.25], [1.6, Hh + 2.2, 0.5], [1, 1, 1], 26, Q0, 5, 0.9, [2, 0, 0, 0]);
  pushInst(a, [0, Hh + 0.85, 0.25], [W + 3.2, 1.0, 0.5], [1, 1, 1], 26, Q0, 6, 0.9, [2, 0, 0, 0]);
  pushInst(a, [0, -0.6, 0.6], [W + 3.6, 1.2, 1.4], [1, 1, 1], 26, Q0, 7, 0.9, [2, 0, 0, 0]);
  // glowing burner strips along the floor edges and the back
  for (const sx of [-1, 1]) pushInst(gl, [sx * (W / 2 - 0.12), 0.06, -D / 2], [0.12, 0.08, D - 0.3], [1.0, 0.42, 0.08], 2, Q0, 0, 0.5, [7, 0, 0, 0]);
  pushInst(gl, [0, 0.06, -D + 0.12], [W - 0.3, 0.08, 0.12], [1.0, 0.42, 0.08], 2, Q0, 0, 0.5, [7, 0, 0, 0]);
  // racks
  for (const y of [0.45, 1.05]) { for (let k = 0; k < 7; k++) pushBar(rk, [-W / 2 + 0.2, y, -0.4 - k * 0.48], [W / 2 - 0.2, y, -0.4 - k * 0.48], 0.025, [0.5, 0.5, 0.52], 19, 0, 0.4, [2, 0.6, 0, 0]);
    for (const sx of [-1, 1]) pushBar(rk, [sx * (W / 2 - 0.2), y, -0.3], [sx * (W / 2 - 0.2), y, -D + 0.3], 0.035, [0.5, 0.5, 0.52], 19, 0, 0.4, [2, 0.6, 0, 0]); }
  return { brick: E.batch(M.box, new Float32Array(a)), glow: E.batch(M.box, new Float32Array(gl)), racks: E.batch(M.box, new Float32Array(rk)), W, D, Hh };
}

// dynamic batch helper
export function dyn(E, mesh, cap, kinds) { const b = E.batch(mesh, new Float32Array(cap * 20), true); b.cap = cap; b.buf = new Float32Array(cap * 20); b.count = 0; b.kinds = kinds; return b; }
export function fill(E, b, arr) { const n = Math.min(b.cap, arr.length / 20); b.buf.set(arr.length > b.cap * 20 ? arr.slice(0, b.cap * 20) : arr); E.updateBatch(b, b.buf, n); return n; }
