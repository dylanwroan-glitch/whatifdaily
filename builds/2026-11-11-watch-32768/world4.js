// world4.js — "Why does your watch count to 32,768?": a quartz wristwatch and its movement (millimetres), the divider chip
// (abstract units), an atomic-fountain lab (metres) and a dusk plain with a sauropod (metres). All original, procedural geometry.
import { V3, quatAxis, quatMul, qrot, quatFromTo, meshBox, meshLathe, meshSphere, meshPrism, pushInst, pushBar } from './engine.js';

export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const Q0 = [0, 0, 0, 1];
export const qx = (a) => quatAxis([1, 0, 0], a), qy = (a) => quatAxis([0, 1, 0], a), qz = (a) => quatAxis([0, 0, 1], a);
export const qconj = (q) => [-q[0], -q[1], -q[2], q[3]];

export const STEEL = [0.74, 0.75, 0.77], STEEL_D = [0.42, 0.43, 0.45], BRASS = [0.86, 0.64, 0.33], COPPER = [0.88, 0.45, 0.24], GOLD = [0.95, 0.72, 0.36];
export const RED = [0.8, 0.07, 0.05];

// star-shaped gear outline: n trapezoid teeth, outer radius r, tooth depth d (angles increase -> outward normals)
export function gearPoly(n, r, d, tip = 0.13, root = 0.3) {
  const pts = []; const w = Math.PI * 2 / n;
  for (let k = 0; k < n; k++) { const c = k * w;
    for (const [da, rr] of [[-root, r - d], [-tip, r], [tip, r], [root, r - d]]) pts.push([Math.cos(c + da * w) * rr, Math.sin(c + da * w) * rr]); }
  return pts;
}
export function meshes(E) {
  return {
    box: E.mesh('box', meshBox),
    cyl: E.mesh('cyl48', () => meshLathe([[0.5, -0.5], [0.5, 0.5]], 48)),
    cylLo: E.mesh('cyl12', () => meshLathe([[0.5, -0.5], [0.5, 0.5]], 12)),
    sph: E.mesh('sph', () => meshSphere(16, 24)),
    sphLo: E.mesh('sphLo', () => meshSphere(7, 10)),
    cone: E.mesh('cone', () => meshLathe([[0.5, 0], [0, 1]], 20)),
    dome: E.mesh('dome', () => meshLathe([[0, 0], [0.5, 0], [0.49, 0.2], [0.42, 0.55], [0.27, 0.85], [0, 1.0]], 32)),
    tube: E.mesh('tube', () => meshLathe([[0.5, 0], [0.5, 0.86], [0.46, 0.95], [0.3, 1.0], [0, 1.0]], 40, { caps: false })),
    half: E.mesh('half', () => meshLathe([[0.5, 0], [0.5, 1]], 32, { a0: 0, a1: Math.PI, caps: false })),
    caseMid: E.mesh('caseMid', () => meshLathe([[17.6, 0.6], [19.3, 0.6], [19.95, 1.5], [20.25, 3.2], [20.25, 7.2], [19.95, 8.7], [19.4, 9.5], [17.6, 9.5], [17.6, 0.6]], 96, { caps: false })),
    bezel: E.mesh('bezel', () => meshLathe([[17.1, 9.4], [19.45, 9.4], [19.65, 9.9], [19.3, 10.45], [17.5, 10.6], [17.1, 10.3], [17.1, 9.4]], 96, { caps: false })),
    back: E.mesh('back', () => meshLathe([[0, 0], [15.8, 0], [17.3, 0.45], [17.5, 1.3], [17.5, 1.6], [0, 1.6]], 96)),
    g40: E.mesh('g40', () => meshPrism(gearPoly(40, 3.6, 0.32), 0.32)),
    g48: E.mesh('g48', () => meshPrism(gearPoly(48, 4.4, 0.32), 0.32)),
    g60: E.mesh('g60', () => meshPrism(gearPoly(60, 5.0, 0.3), 0.32)),
    g32: E.mesh('g32', () => meshPrism(gearPoly(32, 3.0, 0.3), 0.32)),
    pin: E.mesh('pin', () => meshPrism(gearPoly(10, 0.95, 0.25), 0.9)),
    knurl: E.mesh('knurl', () => meshPrism(gearPoly(26, 2.45, 0.16, 0.2, 0.32), 3.0)),
    cog: E.mesh('cog', () => meshPrism(gearPoly(14, 0.5, 0.09), 1.0)),
  };
}

// ---------- instanced rig: parts with tags, re-emitted every frame through a transform ----------
export class Rig {
  constructor(E, M) { this.E = E; this.M = M; this.parts = []; this.batches = {}; }
  add(mesh, p, s, c, kind = 0, q = Q0, rough = 0.5, e = [0, 0, 0, 0], tag = null, layer = 0, seed = 0) {
    const part = { mesh, p, s, c, kind, q, rough, e, tag, layer, seed }; this.parts.push(part); return part;
  }
  finalize(extra = {}) {
    const info = {};
    for (const p of this.parts) { const i = info[p.mesh] || (info[p.mesh] = { n: 0, kinds: new Set() }); i.n++; i.kinds.add(p.kind); }
    for (const m in extra) { const i = info[m] || (info[m] = { n: 0, kinds: new Set() }); i.n += extra[m].n; for (const k of extra[m].kinds) i.kinds.add(k); }
    for (const m in info) {
      const cap = info[m].n + 8; const b = this.E.batch(this.M[m], new Float32Array(cap * 20), true);
      b.cap = cap; b.buf = new Float32Array(cap * 20); b.name = m; b.kinds = [...info[m].kinds].sort((x, y) => x - y); this.batches[m] = b;
    }
    return this;
  }
  emit(xf, extras = null) {
    const acc = {}; for (const m in this.batches) acc[m] = [];
    for (const part of this.parts) { const r = xf(part); if (!r) continue;
      pushInst(acc[part.mesh], r.p, r.s || part.s, r.c || part.c, part.kind, r.q || part.q, part.seed, part.rough, r.e || part.e); }
    if (extras) for (const m in extras) if (acc[m]) { const a = acc[m], x = extras[m]; for (let i = 0; i < x.length; i++) a.push(x[i]); }
    const out = [];
    for (const m in this.batches) { const b = this.batches[m]; const a = acc[m]; const n = Math.min(b.cap, a.length / 20);
      if (n > 0) b.buf.set(a.length > b.cap * 20 ? a.slice(0, b.cap * 20) : a); this.E.updateBatch(b, b.buf, n); out.push(b); }
    return out;
  }
}
// a box from A to B (local x along A->B, local y kept as close to world-up as possible), cross-section h (y) by w (z)
export function boxQ(A, B) { const d = V3.sub(B, A); const L = V3.len(d); const yaw = Math.atan2(-d[2], d[0]); const pitch = Math.asin(clamp(d[1] / (L || 1), -1, 1));
  return { p: V3.scale(V3.add(A, B), 0.5), q: quatMul(qy(yaw), qz(pitch)), L }; }

// ================= THE WATCH (mm). Local frame: dial faces +y, 12 o'clock at -z, 3 o'clock at +x, case-back bottom at y = 0 =================
export const LAYER_OFF = [0, 10, 18, 26, 34, 42, 70];   // explode distance per layer (along -local y = up when the watch lies face-down)
export const CAN_P = [-11.2, 2.35, -4.6];                  // header end of the crystal can (watch-local)
export const CAN_YAW = -0.62;                              // can axis direction in the local xz plane
export const CAN_Q = qy(-CAN_YAW);
export const CAN_DIR = [Math.cos(CAN_YAW), 0, Math.sin(CAN_YAW)];
export const COIL_C = [5.6, 2.25, -7.6], ROTOR_C = [5.9, 2.35, -2.5];
export function buildWatch(E, M) {
  const R = new Rig(E, M);
  const S1 = [1, 1, 1];
  // ---- case, bezel, lugs, crown (layer 0) ----
  R.add('caseMid', [0, 0, 0], S1, STEEL, 19, Q0, 0.2, [2, 0.5, 0, 0]);
  R.add('bezel', [0, 0, 0], S1, STEEL, 19, Q0, 0.1, [0, 0, 0, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    R.add('box', [sx * 8.4, 5.4, sz * 22.0], [3.0, 4.6, 9.6], STEEL, 19, Q0, 0.16, [2, 0.6, 0, 0]);
    R.add('box', [sx * 8.4, 7.75, sz * 21.4], [3.0, 0.4, 8.4], STEEL, 19, Q0, 0.08, [0, 0, 0, 0]);
  }
  R.add('knurl', [20.0, 5.3, 0], S1, STEEL, 19, qz(-Math.PI / 2), 0.22, [0, 0, 0, 0]);
  R.add('cyl', [21.2, 5.3, 0], [1.4, 2.6, 1.4], STEEL, 19, qz(-Math.PI / 2), 0.2, [0, 0, 0, 0]);
  // ---- dial, markers, hands (layer 0) ----
  R.add('cyl', [0, 6.85, 0], [34.9, 0.3, 34.9], [0.02, 0.05, 0.13], 20, Q0, 0.4, [0, 0, 0, 0]);
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2; const rr = 13.2; const q = qy(-a);
    const offs = k === 0 ? [-0.9, 0.9] : [0];
    for (const o of offs) {
      const p = [Math.sin(a) * rr + Math.cos(a) * o, 7.18, -Math.cos(a) * rr + Math.sin(a) * o];
      R.add('box', p, [k % 3 === 0 ? 1.35 : 1.1, 0.36, k % 3 === 0 ? 4.4 : 3.4], STEEL, 19, q, 0.1, [0, 0, 0, 0]);
      R.add('box', [p[0], 7.37, p[2]], [0.5, 0.04, k % 3 === 0 ? 3.4 : 2.5], [0.85, 0.95, 0.85], 2, q, 0.5, [0.25, 0, 0, 1]);
    }
  }
  R.add('box', [0, 7.65, -3.3], [1.9, 0.26, 9.6], STEEL, 19, Q0, 0.1, [0, 0, 0, 0], { type: 'hand', which: 'h' });
  R.add('box', [0, 7.69, -4.8], [0.6, 0.05, 5.4], [0.85, 0.95, 0.85], 2, Q0, 0.5, [0.3, 0, 0, 1], { type: 'hand', which: 'h' });
  R.add('box', [0, 7.95, -5.7], [1.35, 0.26, 15.4], STEEL, 19, Q0, 0.1, [0, 0, 0, 0], { type: 'hand', which: 'm' });
  R.add('box', [0, 8.0, -7.8], [0.45, 0.05, 9.0], [0.85, 0.95, 0.85], 2, Q0, 0.5, [0.3, 0, 0, 1], { type: 'hand', which: 'm' });
  R.add('cyl', [0, 7.8, 0], [3.4, 0.3, 3.4], STEEL, 19, Q0, 0.12, [0, 0, 0, 0]);
  R.add('box', [0, 8.25, -4.9], [0.42, 0.18, 19.8], RED, 0, Q0, 0.3, [0, 0, 0, 0], { type: 'hand', which: 's' });
  R.add('cyl', [0, 8.25, 3.7], [2.1, 0.18, 2.1], RED, 0, Q0, 0.3, [0, 0, 0, 0], { type: 'hand', which: 's' });
  R.add('cyl', [0, 8.42, 0], [2.3, 0.32, 2.3], RED, 0, Q0, 0.3, [0, 0, 0, 0], { type: 'hand', which: 's' });
  // ---- strap (computed per frame from the watch's state): segment, flat run, keeper, stitches ----
  const LEATHER = [0.055, 0.03, 0.019];
  for (const side of [-1, 1]) {
    R.add('box', [0, 0, 0], [14.6, 2.6, 1], LEATHER, 11, Q0, 0.55, [0, 0, 0, 0], { type: 'strap', seg: 0, side });
    R.add('box', [0, 0, 0], [14.6, 2.6, 1], LEATHER, 11, Q0, 0.55, [0, 0, 0, 0], { type: 'strap', seg: 1, side });
    R.add('box', [0, 0, 0], [15.6, 3.6, 3.2], [0.04, 0.022, 0.014], 11, Q0, 0.5, [0, 0, 0, 0], { type: 'strap', seg: 2, side });
    for (const sx of [-1, 1]) for (let i = 0; i < 26; i++) R.add('box', [0, 0, 0], [0.45, 0.4, 1.7], [0.62, 0.52, 0.38], 0, Q0, 0.6, [0, 0, 0, 0], { type: 'stitch', side, sx, i });
  }
  // ---- movement plate (layer 1) ----
  R.add('cyl', [0, 4.9, 0], [33, 2.6, 33], [0.03, 0.03, 0.034], 0, Q0, 0.35, [0, 0, 0, 0], null, 1);
  R.add('cyl', [12.5, 3.4, 0], [0.9, 8.0, 0.9], STEEL, 19, qz(-Math.PI / 2), 0.2, [0, 0, 0, 0], null, 1); // stem
  for (const [x, z] of [[-12, 8], [11, -9], [-2, 13.5]]) R.add('cyl', [x, 3.4, z], [1.6, 0.8, 1.6], [0.06, 0.06, 0.065], 0, Q0, 0.4, [0, 0, 0, 0], null, 1);
  // ---- gear train + bridge (layer 2) ----
  const gears = [['g60', [0.2, 2.75, 0.6], 1 / 60], ['g48', [5.4, 2.15, 6.9], -1 / 30], ['g40', [9.6, 2.45, 1.4], 1 / 12], ['g32', [1.4, 1.95, 11.0], -1 / 8]];
  for (const [gi, [m, p, rate]] of gears.entries()) {
    R.add(m, p, S1, BRASS, 19, Q0, 0.18, [1, 0.6, 0, 0], { type: 'gear', rate }, 2, gi * 0.37 + 0.1);
    R.add('pin', [p[0], p[1] - 0.9, p[2]], S1, BRASS, 19, Q0, 0.22, [0, 0, 0, 0], { type: 'gear', rate: rate * 4 }, 2);
    R.add('cyl', [p[0], p[1] - 0.95, p[2]], [0.5, 1.3, 0.5], STEEL, 19, Q0, 0.2, [0, 0, 0, 0], null, 2);
  }
  { const b = boxQ([1.6, 1.7, 9.4], [10.2, 1.7, 1.9]); R.add('box', b.p, [b.L + 3, 0.45, 4.2], STEEL, 19, b.q, 0.28, [2, 0.7, 0, 0], null, 2);
    for (const p of [[2.3, 1.42, 8.8], [9.5, 1.42, 2.5]]) { R.add('cyl', p, [1.7, 0.4, 1.7], [0.2, 0.28, 0.6], 19, Q0, 0.18, [0, 0, 0, 0], null, 2);
      R.add('box', [p[0], p[1] - 0.22, p[2]], [1.5, 0.08, 0.28], [0.02, 0.02, 0.03], 0, b.q, 0.5, [0, 0, 0, 0], null, 2); }
    R.add('cyl', [5.9, 1.44, 5.6], [0.95, 0.12, 0.95], [0.75, 0.04, 0.08], 0, Q0, 0.08, [0, 0, 0, 0], null, 2); }
  // ---- stepping motor: coil, yokes, rotor (layer 3) ----
  R.add('cyl', COIL_C, [3.3, 7.2, 3.3], COPPER, 19, qz(-Math.PI / 2), 0.25, [3, 0.9, 72, 0], { type: 'coil' }, 3);
  for (const x of [1.85, 9.35]) R.add('cyl', [x, COIL_C[1], COIL_C[2]], [4.0, 0.35, 4.0], [0.05, 0.05, 0.06], 0, qz(-Math.PI / 2), 0.4, [0, 0, 0, 0], null, 3);
  for (const [A, B] of [[[1.5, 2.55, -7.6], [4.5, 2.55, -2.6]], [[9.7, 2.55, -7.6], [7.3, 2.55, -2.6]]]) { const b = boxQ(A, B); R.add('box', b.p, [b.L + 1.2, 0.5, 1.3], STEEL_D, 19, b.q, 0.3, [2, 0.6, 0, 0], null, 3); }
  R.add('box', [COIL_C[0], 2.85, COIL_C[2]], [9.6, 0.35, 1.2], STEEL_D, 19, Q0, 0.3, [2, 0.6, 0, 0], null, 3);
  R.add('cyl', ROTOR_C, [2.7, 0.9, 2.7], [0.16, 0.13, 0.14], 19, Q0, 0.3, [1, 0.5, 0, 0], { type: 'rotor' }, 3);
  R.add('box', [0, 0, 0], [1.1, 0.12, 0.5], [0.9, 0.9, 0.92], 0, Q0, 0.4, [0, 0, 0, 0], { type: 'rotorMark', c: [ROTOR_C[0], ROTOR_C[1] - 0.5, ROTOR_C[2]], off: [0.65, 0, 0] }, 3);
  R.add('box', [0, 0, 0], [1.1, 0.12, 0.5], [0.75, 0.1, 0.08], 0, Q0, 0.4, [0, 0, 0, 0], { type: 'rotorMark', c: [ROTOR_C[0], ROTOR_C[1] - 0.5, ROTOR_C[2]], off: [-0.65, 0, 0] }, 3);
  // ---- circuit board, chip, crystal can (layer 4) ----
  const pcbQ = qy(0.42);
  R.add('box', [-4.6, 3.1, -9.6], [14.2, 0.35, 6.4], [0.012, 0.035, 0.022], 0, pcbQ, 0.35, [0, 0, 0, 0], null, 4);
  R.add('dome', [-3.4, 2.92, -9.9], [4.6, 0.95, 4.6], [0.012, 0.012, 0.014], 0, qx(Math.PI), 0.25, [0, 0, 0, 0], { type: 'chip' }, 4);
  { const r = rng(44); for (let i = 0; i < 6; i++) { const lp = qrot(pcbQ, [1.5 + i * 1.0 - (i > 2 ? 3.2 : 0), 0, (i > 2 ? 1.9 : -1.9)]);
      const p = [-4.6 + lp[0], 2.82, -9.6 + lp[2]];
      R.add('box', p, [0.9, 0.45, 0.5], [0.55, 0.45, 0.32], 0, pcbQ, 0.4, [0, 0, 0, 0], null, 4);
      for (const e of [-0.42, 0.42]) { const pe = V3.add(p, qrot(pcbQ, [e, 0, 0])); R.add('box', pe, [0.18, 0.47, 0.52], STEEL, 19, pcbQ, 0.2, [0, 0, 0, 0], null, 4); } } }
  for (let i = 0; i < 7; i++) { const lp = qrot(pcbQ, [-6.2 + i * 2.0, 0, 2.6]); R.add('box', [-4.6 + lp[0], 2.9, -9.6 + lp[2]], [0.9, 0.06, 0.6], GOLD, 19, pcbQ, 0.25, [0, 0, 0, 0], null, 4); }
  // crystal can sub-assembly (can-local: axis +x from the header at x = 0)
  const CQ = qz(-Math.PI / 2); const QZ = [0.92, 0.9, 1.0];
  R.add('tube', [0.8, 0, 0], [2.0, 5.7, 2.0], [0.8, 0.81, 0.83], 19, CQ, 0.22, [2, 0.6, 0, 0], { type: 'can', sub: 'shell' }, 4);
  R.add('cyl', [0.4, 0, 0], [2.0, 0.8, 2.0], [0.78, 0.72, 0.6], 19, CQ, 0.25, [0, 0, 0, 0], { type: 'can', sub: 'fix' }, 4);
  R.add('cyl', [-0.05, 0, 0], [1.6, 0.12, 1.6], [0.12, 0.2, 0.18], 0, CQ, 0.1, [0, 0, 0, 0], { type: 'can', sub: 'fix' }, 4);
  for (const z of [-0.42, 0.42]) {
    R.add('cyl', [-1.6, 0, z], [0.17, 3.2, 0.17], [0.8, 0.8, 0.78], 19, CQ, 0.2, [0, 0, 0, 0], { type: 'can', sub: 'fix' }, 4);
    R.add('box', [1.0, 0, z * 0.7], [0.6, 0.12, 0.12], [0.8, 0.8, 0.78], 19, Q0, 0.2, [0, 0, 0, 0], { type: 'can', sub: 'fix' }, 4);
  }
  R.add('box', [1.75, 0, 0], [1.1, 0.34, 1.16], QZ, 21, Q0, 0.3, [0, 0, 0, 0], { type: 'can', sub: 'quartz' }, 4);
  for (const yy of [0.176, -0.176]) R.add('box', [1.75, yy, 0], [0.9, 0.02, 0.85], GOLD, 19, Q0, 0.2, [0, 0, 0, 0], { type: 'can', sub: 'elec' }, 4);
  for (const side of [-1, 1]) {
    const root = [2.3, 0, side * 0.43];
    R.add('box', [0, 0, 0], [3.3, 0.34, 0.3], QZ, 21, Q0, 0.3, [0, 0, 0, 0], { type: 'can', sub: 'tine', side, root, off: [1.65, 0, 0] }, 4);
    R.add('box', [0, 0, 0], [3.0, 0.02, 0.17], GOLD, 19, Q0, 0.2, [0, 0, 0, 0], { type: 'can', sub: 'tine', side, root, off: [1.6, 0.176, 0], elec: 1 }, 4);
    R.add('box', [0, 0, 0], [3.0, 0.02, 0.17], GOLD, 19, Q0, 0.2, [0, 0, 0, 0], { type: 'can', sub: 'tine', side, root, off: [1.6, -0.176, 0], elec: 1 }, 4);
    R.add('box', [0, 0, 0], [3.0, 0.2, 0.02], GOLD, 19, Q0, 0.2, [0, 0, 0, 0], { type: 'can', sub: 'tine', side, root, off: [1.6, 0, side * 0.156], elec: 1 }, 4);
  }
  // ---- battery + clip (layer 5) ----
  R.add('cyl', [-7.0, 2.65, 4.4], [11.6, 1.6, 11.6], [0.8, 0.81, 0.83], 19, Q0, 0.16, [1, 0.6, 0, 0], null, 5);
  R.add('cyl', [-7.0, 1.82, 4.4], [10.0, 0.1, 10.0], [0.66, 0.67, 0.69], 19, Q0, 0.2, [1, 0.8, 0, 0], null, 5);
  { const b = boxQ([-2.6, 1.7, 1.2], [-1.0, 1.7, 9.6]); R.add('box', b.p, [b.L, 0.25, 2.6], STEEL, 19, b.q, 0.22, [2, 0.7, 0, 0], null, 5); }
  // ---- case back (layer 6) ----
  R.add('back', [0, 0, 0], S1, STEEL, 19, Q0, 0.22, [1, 0.9, 0, 0], { type: 'back' }, 6);
  R.finalize({ box: { n: 40, kinds: [2] }, sphLo: { n: 40, kinds: [2] } });
  return R;
}
// strap geometry in watch-local coordinates; down = 0 lying face-up on the table, 1 face-down
export function strapSeg(seg, side, down) {
  const yflat = lerp(1.3, 9.3, down);
  const A = [0, 5.0, side * 23.6], B = [0, yflat, side * 33.0], C = [0, yflat, side * 118.0];
  if (seg === 0) return boxQ(A, B);
  if (seg === 1) return boxQ(B, C);
  return { p: [0, yflat, side * 48.0], q: Q0, L: 3.2 };
}

// ================= THE DIVIDER CHIP (abstract units: 15 halving stages along +x) =================
export const STAGE_SP = 12, NSTAGE = 15;
export function buildChip(E, M) {
  const r = rng(321);
  const g = []; pushInst(g, [90, -0.5, 0], [700, 1, 500], [1, 1, 1], 22, Q0, 0, 0.5, [1.1, 0.16, 0, 0]);
  const ground = E.batch(M.box, new Float32Array(g)); ground.shadow = false;
  const st = [], cy = [];
  const x0 = -16, x1 = NSTAGE * STAGE_SP + 34;
  pushInst(st, [(x0 + x1) / 2, 0.07, 0], [x1 - x0, 0.14, 1.1], [0.8, 0.6, 0.28], 19, Q0, 0, 0.25, [2, 0.4, 0, 0]);
  for (const z of [-3.6, 3.6]) pushInst(st, [(x0 + x1) / 2, 0.05, z], [x1 - x0, 0.1, 0.3], [0.55, 0.42, 0.2], 19, Q0, 0, 0.3, [0, 0, 0, 0]);
  for (let k = 1; k <= NSTAGE; k++) {
    const x = k * STAGE_SP;
    pushInst(st, [x, 1.0, 0], [5.0, 2.0, 5.0], [0.07, 0.08, 0.1], 19, Q0, k, 0.32, [2, 0.5, 0, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pushInst(st, [x + sx * 2.9, 0.12, sz * 1.6], [0.8, 0.24, 0.5], [0.85, 0.65, 0.3], 19, Q0, 0, 0.25, [0, 0, 0, 0]);
    for (const sz of [-1, 1]) { pushInst(st, [x, 0.06, sz * 6.5], [0.35, 0.12, 6.0], [0.55, 0.42, 0.2], 19, Q0, 0, 0.3, [0, 0, 0, 0]); }
  }
  // the crystal at the start of the line (a small upright tuning fork) and the motor coil at the end
  for (const z of [-0.5, 0.5]) pushInst(st, [-10, 2.6, z], [0.7, 4.2, 0.55], [0.92, 0.9, 1.0], 21, Q0, 3, 0.3, [0.6, 0.5, 0, 0]);
  pushInst(st, [-10, 0.6, 0], [0.9, 1.2, 1.6], [0.92, 0.9, 1.0], 21, Q0, 3, 0.3, [0.6, 0.5, 0, 0]);
  pushInst(cy, [x1 - 8, 1.8, 0], [3.2, 7.0, 3.2], COPPER, 19, qz(-Math.PI / 2), 0, 0.25, [3, 0.9, 40, 0]);
  // city of components
  for (let i = 0; i < 300; i++) {
    const x = -40 + r() * 270, z = (r() < 0.5 ? -1 : 1) * (8 + Math.pow(r(), 0.8) * 80);
    const w = 1 + r() * 5, d = 1 + r() * 5, h = 0.2 + Math.pow(r(), 2) * 3.2;
    const c = r() < 0.3 ? [0.5, 0.38, 0.18] : [0.04 + r() * 0.05, 0.045 + r() * 0.05, 0.06 + r() * 0.06];
    pushInst(st, [x, h / 2, z], [w, h, d], c, 19, qy(r() < 0.2 ? Math.PI / 4 : 0), r(), 0.35 + r() * 0.3, [2, 0.5, 0, 0]);
    if (r() < 0.22) pushInst(st, [x, h + 0.04, z], [w * 0.5, 0.08, d * 0.5], r() < 0.5 ? [0.3, 0.7, 1.0] : [1.0, 0.55, 0.2], 2, Q0, 0, 0.5, [1.2 + r() * 2, 0, 0, 0]);
  }
  const statics = E.batch(M.box, new Float32Array(st));
  const coil = E.batch(M.cyl, new Float32Array(cy));
  const dyn = E.batch(M.box, new Float32Array(3000 * 20), true); dyn.cap = 3000; dyn.buf = new Float32Array(3000 * 20); dyn.kinds = [2, 19]; dyn.shadow = false;
  return { ground, statics, coil, dyn };
}

// ================= THE ATOMIC FOUNTAIN LAB (metres) =================
export const FOUNT = { chamber: [0, 1.15, 0], tubeTop: 2.95, cavity: 1.62, shield0: 1.86 };
export function buildLab(E, M) {
  const r = rng(77);
  const b = [], c = [], h = [], s = [];
  pushInst(b, [0, -0.5, 0], [60, 1, 60], [0.03, 0.03, 0.033], 0, Q0, 0, 0.22, [0, 0, 0, 0]);
  pushInst(b, [0, 0.85, 0], [2.8, 0.12, 1.5], [0.13, 0.135, 0.14], 22, Q0, 0, 0.3, [40, 0, 1, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pushInst(b, [sx * 1.15, 0.4, sz * 0.55], [0.18, 0.8, 0.18], [0.1, 0.1, 0.11], 19, Q0, 0, 0.4, [2, 0.5, 0, 0]);
  // lower chamber with flanges
  const C0 = FOUNT.chamber; const ch = [], chc = [];
  pushInst(ch, C0, [0.34, 0.34, 0.34], [0.7, 0.71, 0.73], 19, Q0, 0, 0.22, [2, 0.7, 0, 0]);
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) pushInst(chc, V3.add(C0, V3.scale(d, 0.2)), [0.13, 0.07, 0.13], [0.75, 0.76, 0.78], 19, quatFromTo([0, 1, 0], d), 0, 0.18, [1, 0.5, 0, 0]);
  pushInst(c, [0, 0.98, 0], [0.16, 0.1, 0.16], [0.6, 0.6, 0.62], 19, Q0, 0, 0.25, [0, 0, 0, 0]);
  // vertical tube: cage rods + rings, microwave cavity, shields (half shell, turned to the camera per frame), top cap
  const T0 = 1.32, T1 = FOUNT.tubeTop;
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; pushInst(c, [Math.cos(a) * 0.075, (T0 + T1) / 2, Math.sin(a) * 0.075], [0.012, T1 - T0, 0.012], [0.75, 0.76, 0.78], 19, Q0, 0, 0.2, [0, 0, 0, 0]); }
  for (let y = T0 + 0.08; y < T1; y += 0.17) for (let k = 0; k < 20; k++) { const a0 = k / 20 * Math.PI * 2, a1 = (k + 1) / 20 * Math.PI * 2;
    pushBar(s, [Math.cos(a0) * 0.08, y, Math.sin(a0) * 0.08], [Math.cos(a1) * 0.08, y, Math.sin(a1) * 0.08], 0.009, [0.7, 0.71, 0.73], 19, 0, 0.25, [0, 0, 0, 0]); }
  pushInst(c, [0, FOUNT.cavity, 0], [0.24, 0.15, 0.24], COPPER, 19, Q0, 0, 0.22, [1, 0.6, 0, 0]);
  pushInst(c, [0, T1 + 0.05, 0], [0.32, 0.1, 0.32], [0.62, 0.63, 0.65], 19, Q0, 0, 0.25, [1, 0.6, 0, 0]);
  pushInst(c, [0, T0 - 0.01, 0], [0.2, 0.06, 0.2], [0.62, 0.63, 0.65], 19, Q0, 0, 0.25, [0, 0, 0, 0]);
  pushInst(h, [0, FOUNT.shield0, 0], [0.46, T1 - FOUNT.shield0 - 0.03, 0.46], [0.5, 0.51, 0.53], 19, Q0, 0, 0.4, [2, 0.6, 0, 0]);
  pushInst(h, [0, FOUNT.shield0 + 0.05, 0], [0.38, T1 - FOUNT.shield0 - 0.13, 0.38], [0.66, 0.67, 0.69], 19, Q0, 0, 0.3, [2, 0.6, 0, 0]);
  // frame posts, laser heads and mirrors on posts
  for (const [x, z] of [[-0.62, -0.5], [0.62, -0.5], [-0.62, 0.5], [0.62, 0.5]]) pushInst(b, [x, 2.0, z], [0.045, 2.2, 0.045], [0.55, 0.56, 0.58], 19, Q0, 0, 0.35, [2, 0.6, 0, 0]);
  pushInst(b, [0, 3.08, 0], [1.3, 0.05, 1.06], [0.5, 0.51, 0.53], 19, Q0, 0, 0.35, [2, 0.6, 0, 0]);
  const LASER_SRC = [];
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) { const p = V3.add([0, C0[1], 0], V3.scale(d, d[0] ? 1.2 : 0.62));
    pushInst(b, V3.add(p, V3.scale(d, 0.12)), [d[0] ? 0.3 : 0.12, 0.12, d[2] ? 0.3 : 0.12], [0.08, 0.08, 0.09], 19, Q0, 0, 0.3, [2, 0.5, 0, 0]);
    pushInst(c, [p[0] + d[0] * 0.12, (0.91 + C0[1] - 0.06) / 2, p[2] + d[2] * 0.12], [0.035, C0[1] - 0.06 - 0.91, 0.035], [0.6, 0.6, 0.62], 19, Q0, 0, 0.3, [0, 0, 0, 0]);
    LASER_SRC.push(p); }
  for (let i = 0; i < 14; i++) { const x = (r() - 0.5) * 2.4, z = (r() < 0.5 ? -1 : 1) * (0.3 + r() * 0.35); if (Math.abs(x) < 0.3) continue;
    pushInst(c, [x, 0.97, z], [0.025, 0.12, 0.025], [0.6, 0.6, 0.62], 19, Q0, 0, 0.3, [0, 0, 0, 0]);
    pushInst(c, [x, 1.05, z], [0.06, 0.012, 0.06], [0.75, 0.76, 0.78], 19, qx(Math.PI / 2), 0, 0.15, [0, 0, 0, 0]); }
  // electronics racks with blinking LEDs and cables
  for (const [x, z, w] of [[-2.2, -1.6, 0.7], [-1.4, -1.9, 0.7], [2.3, -1.5, 0.7]]) {
    pushInst(b, [x, 1.05, z], [w, 2.1, 0.6], [0.035, 0.036, 0.04], 19, Q0, 0, 0.45, [2, 0.3, 0, 0]);
    for (let k = 0; k < 9; k++) { const y = 0.3 + k * 0.2; pushInst(b, [x, y, z + 0.305], [w * 0.92, 0.012, 0.01], [0.15, 0.15, 0.16], 19, Q0, 0, 0.4, [0, 0, 0, 0]);
      for (let j = 0; j < 5; j++) pushInst(b, [x - w * 0.35 + j * 0.06, y + 0.07, z + 0.31], [0.018, 0.018, 0.01], r() < 0.6 ? [0.2, 1.0, 0.35] : [1.0, 0.6, 0.15], 2, Q0, 0, 0.5, [2.5, r() * 99, 3, 0]); }
  }
  for (let i = 0; i < 10; i++) { const A = [-1.8 + r() * 0.8, 0.02, -1.3], B = [(r() - 0.5) * 1.2, 0.02, -0.3]; pushBar(s, A, B, 0.025, [0.02, 0.02, 0.025], 0, 0, 0.5, [0, 0, 0, 0]); }
  const boxes = E.batch(M.box, new Float32Array(b)); const cyls = E.batch(M.cyl, new Float32Array(c));
  const bars = E.batch(M.box, new Float32Array(s)); const chamber = E.batch(M.box, new Float32Array(ch)); const chamberC = E.batch(M.cyl, new Float32Array(chc));
  const shields = E.batch(M.half, new Float32Array(h)); shields.srcData = new Float32Array(h);
  const dyn = E.batch(M.box, new Float32Array(400 * 20), true); dyn.cap = 400; dyn.buf = new Float32Array(400 * 20); dyn.kinds = [2]; dyn.shadow = false;
  const dynS = E.batch(M.sphLo, new Float32Array(500 * 20), true); dynS.cap = 500; dynS.buf = new Float32Array(500 * 20); dynS.kinds = [0, 2]; dynS.shadow = false;
  return { boxes, cyls, bars, shields, dyn, dynS, LASER_SRC, chamber, chamberC };
}

// ================= DUSK, 100 MILLION YEARS AGO (metres) =================
export const DINO_Z = -16;
export function buildDusk(E, M) {
  const r = rng(1001);
  const b = [], cn = [], cyl = [];
  pushInst(b, [0, -0.5, -400], [6000, 1, 6000], [0.045, 0.05, 0.028], 11, Q0, 0, 0.9, [0, 0, 0, 0]);
  // volcano + glow, distant ridges
  pushInst(cn, [-260, -2, -900], [620, 230, 620], [0.03, 0.026, 0.028], 0, Q0, 0, 0.9, [0, 0, 0, 0]);
  pushInst(cyl, [-260, 224, -900], [70, 6, 70], [1.0, 0.36, 0.08], 2, Q0, 0, 0.5, [4.0, 0, 0, 0]);
  for (let i = 0; i < 9; i++) pushInst(cn, [-700 + i * 190 + r() * 60, -4, -1300 - r() * 300], [500 + r() * 400, 90 + r() * 120, 400], [0.035, 0.03, 0.04], 0, Q0, 0, 0.9, [0, 0, 0, 0]);
  // conifers (trunk + stacked cones) in the middle distance
  for (let i = 0; i < 46; i++) {
    const x = -160 + r() * 320, z = -40 - Math.pow(r(), 0.7) * 160; if (Math.abs(x) < 25 && z > -60) continue;
    const H = 9 + r() * 16, w = H * (0.26 + r() * 0.08);
    pushInst(cyl, [x, H * 0.2, z], [w * 0.12, H * 0.4, w * 0.12], [0.03, 0.022, 0.018], 0, Q0, 0, 0.9, [0, 0, 0, 0]);
    for (let k = 0; k < 3; k++) pushInst(cn, [x, H * (0.22 + k * 0.22), z], [w * (1 - k * 0.24), H * 0.45, w * (1 - k * 0.24)], [0.02, 0.035, 0.022], 0, Q0, 0, 0.9, [0, 0, 0, 0]);
  }
  // cycads / fern clumps near the camera: radiating fronds
  for (let i = 0; i < 34; i++) {
    const x = -30 + r() * 60, z = -12 + r() * 30; if (Math.abs(x + 4) < 3 && z > 2) continue;
    const n = 7, L = 1.2 + r() * 1.6;
    pushInst(cyl, [x, 0.3, z], [0.35, 0.6, 0.35], [0.04, 0.03, 0.02], 0, Q0, 0, 0.9, [0, 0, 0, 0]);
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + r(); const tip = [x + Math.cos(a) * L, 0.55 + L * 0.55, z + Math.sin(a) * L];
      pushBar(b, [x, 0.55, z], tip, 0.16, [0.03, 0.06, 0.03], 0, 0, 0.8, [0, 0, 0, 0]); }
  }
  const boxes = E.batch(M.box, new Float32Array(b)); const cones = E.batch(M.cone, new Float32Array(cn)); const cyls = E.batch(M.cylLo, new Float32Array(cyl));
  const dino = E.batch(M.sph, new Float32Array(120 * 20), true); dino.cap = 120; dino.buf = new Float32Array(120 * 20); dino.kinds = [0];
  const dinoL = E.batch(M.cylLo, new Float32Array(20 * 20), true); dinoL.cap = 20; dinoL.buf = new Float32Array(20 * 20); dinoL.kinds = [0];
  return { boxes, cones, cyls, dino, dinoL };
}
// sauropod silhouette: body, neck chain, head, tail chain, 4 legs; walking along +x
export function dinoInstances(t, X) {
  const sph = [], leg = [];
  const DK = [0.022, 0.02, 0.019];
  const bob = Math.sin(t * 3.2) * 0.12; const Y = 5.2 + bob; const Z = DINO_Z;
  pushInst(sph, [X, Y, Z], [9.5, 4.6, 4.0], DK, 0, qz(0.05), 0, 0.9, [0, 0, 0, 0]);
  pushInst(sph, [X + 3.2, Y + 0.6, Z], [4.5, 3.6, 3.2], DK, 0, Q0, 0, 0.9, [0, 0, 0, 0]);
  // neck: rises forward with a gentle sway
  const sway = Math.sin(t * 1.3) * 0.06;
  let prev = [X + 4.6, Y + 1.2, Z];
  for (let k = 1; k <= 11; k++) { const u = k / 11; const a = 0.95 - 0.45 * u + sway;
    const p = [X + 4.6 + u * 7.4 + Math.sin(u * 2.0) * 0.3, Y + 1.2 + u * 8.6 - u * u * 1.5, Z]; const rr = lerp(1.9, 0.62, u);
    pushInst(sph, p, [rr * 1.25, rr, rr], DK, 0, qz(a), 0, 0.9, [0, 0, 0, 0]); prev = p; }
  pushInst(sph, [prev[0] + 0.7, prev[1] + 0.1, Z], [1.6, 0.75, 0.7], DK, 0, qz(-0.2), 0, 0.9, [0, 0, 0, 0]);
  // tail
  for (let k = 1; k <= 16; k++) { const u = k / 16; const p = [X - 4.2 - u * 12.5, Y + 0.4 - u * 3.6 + Math.sin(u * 3 + t * 1.6) * 0.25 * u, Z + Math.sin(t * 1.1 + u * 2) * 0.6 * u];
    const rr = lerp(1.9, 0.16, Math.pow(u, 0.9)); pushInst(sph, p, [rr * 1.4, rr, rr], DK, 0, qz(0.25), 0, 0.9, [0, 0, 0, 0]); }
  // legs: pillar legs swinging in a walk cycle
  const legs = [[2.6, 1.15, 0], [2.6, -1.15, Math.PI], [-2.6, 1.15, Math.PI], [-2.6, -1.15, 0]];
  for (const [dx, dz, ph] of legs) { const sw = Math.sin(t * 3.2 + ph) * 0.28; const top = [X + dx, Y - 1.2, Z + dz];
    const foot = [top[0] + Math.sin(sw) * 5.2, Math.max(0.0, top[1] - Math.cos(sw) * 5.2 + Math.max(0, Math.sin(t * 3.2 + ph + 1.57)) * 0.4), top[2]];
    pushBar(leg, top, foot, 1.25, DK, 0, 0, 0.9, [0, 0, 0, 0]); pushInst(sph, foot, [1.5, 0.7, 1.4], DK, 0, Q0, 0, 0.9, [0, 0, 0, 0]); }
  return { sph, leg };
}
