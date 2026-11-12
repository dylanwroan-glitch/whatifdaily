// scene.js — "Pour Hoover Dam all at once. What happens?": shots, cameras, lighting and animation. Original code.
import { Engine, V3, pushInst, pushBar, quatMul, qrot } from './engine.js';
import * as W from './world5.js';
import { SHOTS, FPS, DURATION, EV, yearsAt } from './timeline.js';
import { hudAt } from './hud.js';
export { SHOTS, FPS, DURATION };

const { clamp, lerp, sstep, qx, qy, qz, Q0, rng, H, LIFT, DX, DS, zU, thick, xExt } = W;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ez = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const eo = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const mixv = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const norm = V3.norm;

let E, M, B, COLS, C0, C0I;
export async function setup(canvas, Wd = 1080, Hd = 1920, opts = {}) {
  canvas.width = Wd; canvas.height = Hd;
  E = new Engine(canvas, Wd, Hd, opts); window.__E = E;
  M = W.meshes(E);
  B = W.buildCanyon(E, M);
  B.cable = W.buildCableways(E, M);
  const ip = W.buildIcePlant(E, M); B.plantBoxes = ip.boxes; B.plantStacks = ip.stacks;
  const rs = W.buildRoadSet(E, M); B.roadGround = rs.ground; B.mesas = rs.mesas;
  B.oven = W.buildOven(E, M);
  B.cols = W.dyn(E, M.box, 320, [27]);
  B.fill = W.dyn(E, M.box, 80, [27]);
  B.lines = W.dyn(E, M.box, 24000, [32]);
  B.heatp = W.dyn(E, M.box, 1600, [2]);
  B.chunks = W.dyn(E, M.box, 900, [2, 27]);
  B.forms = W.dyn(E, M.box, 900, [11]);
  B.misc = W.dyn(E, M.box, 600, [0, 2, 11, 19, 27]);
  B.buckets = W.dyn(E, M.bucket, 12, [19]);
  B.ice = W.dyn(E, M.box, 900, [31]);
  B.loaves = W.dyn(E, M.loaf, 2600, [28]);
  B.pile = W.dyn(E, M.pile, 2, [28]);
  B.road = W.dyn(E, M.box, 600, [0, 27]);
  B.ovenLoaves = W.dyn(E, M.loaf, 80, [28]);
  COLS = W.columnList();
  C0I = COLS.findIndex(c => c.i === 0 && c.j === 2); C0 = COLS[C0I];
  return { info: E.info, columns: COLS.length };
}

function project(vp, p) {
  const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12], y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13], w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
  if (w <= 0) return null; return [(x / w * 0.5 + 0.5) * 1080, (1 - (y / w * 0.5 + 0.5)) * 1920];
}
function shake(t, amp, f = 1) { return [Math.sin(t * 37 * f) * amp + Math.sin(t * 61 * f + 1) * amp * 0.5, Math.sin(t * 43 * f + 2) * amp * 0.6, Math.sin(t * 29 * f + 4) * amp * 0.5]; }

// ================= columns =================
function columnsInst(p, heatFn, gap = 0.9, topAdj = null) {
  const a = []; LAST_TOPS.length = 0;
  for (let k = 0; k < COLS.length; k++) {
    const c = COLS[k]; let top = W.colTop(c, p); if (topAdj) top = topAdj(c, top, k); LAST_TOPS.push(top);
    const ht = heatFn ? heatFn(c, top, k) : [0, 6];
    W.pushColumn(a, c, top, ht[0], ht[1], gap);
  }
  W.fill(E, B.cols, a);
  return B.cols;
}
function c0Top(p) { return W.colTop(C0, p); }
const LAST_TOPS = [];
// the target column stands a few lifts above its neighbours in the close-ups so its form and fresh lift read clearly
const nearC0 = (c) => Math.abs(c.i - C0.i) <= 1 && Math.abs(c.j - C0.j) <= 1;
function lowerNeighbours(p) { const t0 = c0Top(p); return (c, top, k) => (k !== C0I && nearC0(c)) ? Math.min(top, t0 - LIFT * (2 + (k % 3))) : top; }
// timber forms on the columns that are mid-pour
function formsInst(skip) {
  const a = [];
  for (let k = 0; k < COLS.length; k++) { const c = COLS[k]; if (k === skip || c.r > 0.42) continue; const top = LAST_TOPS[k]; if (top >= c.yTop - 0.5 || top <= c.yBot + 30) continue;
    const hx = (DX - 0.9) / 2, hs = (DS - 0.9) / 2; const q = qy(-Math.atan(c.slope)); const fy = top + 0.9;
    for (const ss of [-1, 1]) a.push(...instArr(W.colPoint(c, 0, fy, ss * (hs + 0.2)), [DX - 0.5, 1.8, 0.3], [0.38, 0.29, 0.19], 11, q, k));
    for (const sx of [-1, 1]) a.push(...instArr(W.colPoint(c, sx * (hx + 0.2), fy, 0), [0.3, 1.8, DS - 0.5], [0.38, 0.29, 0.19], 11, q, k)); }
  W.fill(E, B.forms, a); return B.forms;
}
function instArr(p, sc, col, kind, q, seed) { const a = []; pushInst(a, p, sc, col, kind, q, seed, 0.8); return a; }

// ================= x-ray lines =================
const EDGE_C = [0.42, 0.72, 1.0], PIPE_C = [0.85, 0.92, 1.0], WATER_C = [0.2, 0.62, 1.0];
function boxCorners(c, top) {
  const hx = (DX - 0.9) / 2, hs = (DS - 0.9) / 2; const P = [];
  for (const yy of [c.yBot, top]) for (const sx of [-1, 1]) for (const ss of [-1, 1]) P.push(W.colPoint(c, sx * hx, yy, ss * hs));
  return P; // index: (y?4:0) + (sx>0?2:0) + (ss>0?1:0)
}
function pushEdges(a, c, top, th, glow) {
  const P = boxCorners(c, top);
  const E2 = [[0, 1], [2, 3], [0, 2], [1, 3], [4, 5], [6, 7], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (const [i, j] of E2) pushBar(a, P[i], P[j], th, EDGE_C, 32, 0, 0.5, [glow, 0, 0, 0]);
}
function pushCoils(a, c, top, step, np, th, col, glow, flow, groutFn) {
  const hx = (DX - 0.9) / 2 * 0.86, hs = (DS - 0.9) / 2; const n = Math.floor((top - c.yBot) / LIFT);
  for (let k = 0; k < n; k += step) {
    const y = c.yBot + (k + 0.5) * LIFT;
    const g = groutFn ? groutFn(c, k) : 0;
    for (let q = 0; q < np; q++) {
      const ls = -hs * 0.75 + (np > 1 ? q / (np - 1) : 0.5) * hs * 1.5; const dir = q % 2 ? -1 : 1;
      pushBar(a, W.colPoint(c, -dir * hx, y, ls), W.colPoint(c, dir * hx, y, ls), th, col, 32, 0, 0.5, [glow, flow, g, k * 3.1 + q * 7.7]);
      if (q < np - 1) { const ls2 = -hs * 0.75 + (q + 1) / (np - 1) * hs * 1.5; pushBar(a, W.colPoint(c, dir * hx, y, ls), W.colPoint(c, dir * hx, y, ls2), th, col, 32, 0, 0.5, [glow, flow, g, k * 1.3 + q]); }
    }
  }
  // supply / return headers
  for (const sx of [-1, 1]) pushBar(a, W.colPoint(c, sx * hx * 1.04, c.yBot, -hs * 0.92), W.colPoint(c, sx * hx * 1.04, top, -hs * 0.92), th * 1.6, col, 32, 0, 0.5, [glow * 0.9, flow, groutFn ? groutFn(c, -1) : 0, sx * 5]);
}

// ================= per-set frame builders =================
const TOP_FINISH = 1.12;
function canyonState(o) {
  // o: { dam: 'finished'|'mono'|'cols'|'none', lake, river: 'plane'|'strip'|'constr'|null, crest, cable, plant, ring }
  const bs = [];
  const tb = B.terrain.buf; tb.fill(0); tb.set([0, 0, 0, 26, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0.9, 0, o.ring ? W.LAKE : 0, o.ring ? W.LAKE + 22 : 0, 0]);
  E.updateBatch(B.terrain, tb, 1); B.terrain.cut = !!o.cutTerrain; bs.push(B.terrain);
  if (o.dam === 'finished' || o.dam === 'mono') bs.push(B.dam);
  if (o.crest) bs.push(B.crest, B.towers, B.bridges);
  if (o.lake) bs.push(B.lake);
  if (o.river === 'strip') bs.push(B.riverDown);
  if (o.river === 'constr') bs.push(B.riverConstr);
  if (o.cable) bs.push(B.cable);
  if (o.plant) bs.push(B.plantBoxes, B.plantStacks);
  return bs;
}
// sky / light presets
const SKY0 = { moonDir: norm([0.3, 0.5, -0.8]), moonCol: [1, 0.97, 0.9], moonAmt: 0, sunDir: [0, -1, 0], sunCol: [1, 0.9, 0.75], sunAmt: 0, stars: 0, glowCol: [0, 0, 0], glowDir: [0, 0, -1], glowAmt: 0, bgMode: 0, bgPow: 1, sfl: [0, 1, 0, 0] };
function preset(kind) {
  if (kind === 'gold') { const sun = norm([0.3, 0.3, 0.9]);
    return { sky: { ...SKY0, zen: [0.05, 0.12, 0.3], hor: [0.92, 0.62, 0.38], sunDir: sun, sunCol: [1.0, 0.72, 0.42], sunAmt: 1.2, glowCol: [1.0, 0.55, 0.25], glowDir: norm([sun[0], 0, sun[2]]), glowAmt: 0.5 },
      light: { dir: sun, col: [2.1, 1.55, 1.02] }, amb: { sky: [0.15, 0.19, 0.3], gnd: [0.1, 0.07, 0.045] }, fog: { col: [0.74, 0.6, 0.5], den: 0.00018, h: 260 },
      shadow: { center: [0, 110, 170], radius: 430, bias: 0.6, dist: 1400 }, pls: [],
      post: { exposure: 0.9, bloom: 0.32, thr: 1.6, vig: 0.38, grain: 0.02, lift: [0.01, 0.008, 0.012], gain: [1.02, 1.0, 0.98], sat: 1.1 } }; }
  if (kind === 'day') { const sun = norm([0.42, 0.72, 0.55]);
    return { sky: { ...SKY0, zen: [0.13, 0.27, 0.56], hor: [0.66, 0.74, 0.84], sunDir: sun, sunCol: [1.0, 0.92, 0.8], sunAmt: 0.9, glowCol: [0.6, 0.6, 0.55], glowDir: norm([sun[0], 0, sun[2]]), glowAmt: 0.2 },
      light: { dir: sun, col: [2.0, 1.88, 1.7] }, amb: { sky: [0.17, 0.22, 0.32], gnd: [0.12, 0.09, 0.065] }, fog: { col: [0.62, 0.69, 0.78], den: 0.0002, h: 300 },
      shadow: { center: [0, 110, 170], radius: 430, bias: 0.6, dist: 1400 }, pls: [],
      post: { exposure: 0.84, bloom: 0.25, thr: 1.8, vig: 0.34, grain: 0.02, lift: [0.008, 0.008, 0.01], gain: [1, 1, 1], sat: 1.06 } }; }
  if (kind === 'therm') {
    return { sky: { ...SKY0, zen: [0.01, 0.0, 0.035], hor: [0.035, 0.004, 0.06], bgMode: 0 },
      light: { dir: norm([0.4, 0.8, 0.45]), col: [0.5, 0.5, 0.55] }, amb: { sky: [0.12, 0.12, 0.14], gnd: [0.06, 0.06, 0.07] }, fog: { col: [0.025, 0.003, 0.05], den: 0.0007, h: 400 },
      shadow: null, pls: [], therm: 1,
      post: { exposure: 1.0, bloom: 0.5, thr: 1.15, vig: 0.42, grain: 0.03, lift: [0.006, 0.0, 0.012], gain: [1, 1, 1], sat: 1.1 } }; }
  if (kind === 'xray') {
    return { sky: { ...SKY0, zen: [0.004, 0.012, 0.035], hor: [0.008, 0.024, 0.055], bgMode: 2 },
      light: { dir: norm([0.4, 0.8, 0.45]), col: [0.6, 0.6, 0.65] }, amb: { sky: [0.12, 0.12, 0.14], gnd: [0.06, 0.06, 0.07] }, fog: { col: [0.006, 0.016, 0.04], den: 0.0006, h: 400 },
      shadow: null, pls: [], xray: 1,
      post: { exposure: 1.0, bloom: 0.55, thr: 1.0, vig: 0.42, grain: 0.03, lift: [0.0, 0.004, 0.012], gain: [1, 1, 1.03], sat: 1.05 } }; }
  // noon desert (road)
  const sun = norm([0.3, 0.85, 0.42]);
  return { sky: { ...SKY0, zen: [0.1, 0.24, 0.55], hor: [0.72, 0.78, 0.86], sunDir: sun, sunCol: [1, 0.95, 0.85], sunAmt: 0.8 },
    light: { dir: sun, col: [2.3, 2.15, 1.95] }, amb: { sky: [0.22, 0.27, 0.36], gnd: [0.16, 0.12, 0.08] }, fog: { col: [0.72, 0.76, 0.82], den: 0.00012, h: 600 },
    shadow: null, pls: [], post: { exposure: 1.0, bloom: 0.2, thr: 1.9, vig: 0.32, grain: 0.02, lift: [0.008, 0.008, 0.01], gain: [1, 1, 1], sat: 1.06 } };
}

// --------- construction extras: formwork + bucket + stream on the target column ---------
function constructionExtras(t, p, freshFrac, bucketY, pour) {
  const m = [], bk = [];
  const top = c0Top(p); const hx = (DX - 0.9) / 2, hs = (DS - 0.9) / 2; const ang = Math.atan(C0.slope); const q = qy(-ang);
  // formwork panels around the top lift
  const fy = top + 1.0;
  for (const ss of [-1, 1]) pushInst(m, W.colPoint(C0, 0, fy, ss * (hs + 0.25)), [DX - 0.4, 2.2, 0.35], [0.42, 0.33, 0.22], 11, q, 1, 0.8);
  for (const sx of [-1, 1]) pushInst(m, W.colPoint(C0, sx * (hx + 0.25), fy, 0), [0.35, 2.2, DS - 0.4], [0.42, 0.33, 0.22], 11, q, 2, 0.8);
  // walers (horizontal timbers)
  for (const ss of [-1, 1]) for (const yy of [0.4, 1.6]) pushInst(m, W.colPoint(C0, 0, top + yy, ss * (hs + 0.5)), [DX + 0.6, 0.25, 0.25], [0.3, 0.22, 0.14], 11, q, 3, 0.8);
  // the fresh lift (wet concrete) rising inside the form
  if (freshFrac > 0) { const hh = LIFT * freshFrac; pushInst(m, W.colPoint(C0, 0, top + hh / 2, 0), [DX - 0.95, hh, DS - 0.95], [1, 1, 1], 27, q, 9, 0.8, [0.86, 2, 0, 4]); }
  // bucket hanging from the cable at z = CABLES[1]
  const cz = W.CABLES[1]; const bx = C0.xc; const by = bucketY; const bz = W.colPoint(C0, 0, top, 0)[2] + 1.0;
  const trolley = [bx, W.cableSag(bx, cz) - 1.5, cz];
  pushInst(m, trolley, [3, 1.5, 2], [0.2, 0.2, 0.21], 19, Q0, 0, 0.5, [0, 0.4, 0, 0]);
  for (const ox of [-0.8, 0.8]) pushBar(m, [bx + ox, trolley[1], cz], [bx + ox * 1.3, by + 3.4, bz], 0.12, [0.08, 0.08, 0.08], 0, 0, 0.5);
  pushBar(m, [bx - 1.4, by + 3.4, bz], [bx + 1.4, by + 3.4, bz], 0.22, [0.25, 0.25, 0.26], 19, 0, 0.5, [0, 0.4, 0, 0]);
  pushInst(bk, [bx, by, bz], [1, 1, 1], [0.32, 0.31, 0.3], 19, Q0, 0, 0.55, [0, 0.5, 0, 0]);
  // falling concrete from the bucket gate
  if (pour > 0) { const y0 = by - 0.2, y1 = top + LIFT * freshFrac; const R2 = rng(5);
    pushBar(m, [bx, y0, bz], [bx, y1, bz], 0.55 * pour, [0.5, 0.48, 0.44], 27, 0, 0.8, [0.9, 3, 0, 4]);
    for (let k = 0; k < 30; k++) { const u = (R2() + t * 2.2) % 1; const y = lerp(y0, y1, u); pushInst(m, [bx + (R2() - 0.5) * 0.9, y, bz + (R2() - 0.5) * 0.9], [0.35, 0.35, 0.35], [0.5, 0.48, 0.44], 27, Q0, k, 0.8, [0.9, 3, 0, 4]); }
    for (let k = 0; k < 16; k++) { const a = R2() * 6.28, r = 0.8 + R2() * 2.2; pushInst(m, [bx + Math.cos(a) * r, y1 + 0.1 + R2() * 0.3, bz + Math.sin(a) * r], [0.5, 0.25, 0.5], [0.42, 0.4, 0.37], 27, qy(a), k, 0.8, [1, 3, 0, 4]); }
  }
  W.fill(E, B.misc, m); W.fill(E, B.buckets, bk);
  return [B.misc, B.buckets];
}
// buckets riding the other cables (construction wides)
function cableBuckets(t) {
  const bk = [], m = [];
  for (let k = 0; k < W.CABLES.length; k++) { const z = W.CABLES[k]; const x = 150 * Math.sin(t * 0.35 + k * 1.7); const yc = W.cableSag(x, z);
    const by = yc - 40 - 30 * (0.5 + 0.5 * Math.sin(t * 0.5 + k));
    pushInst(m, [x, yc - 1.5, z], [3, 1.5, 2], [0.2, 0.2, 0.21], 19, Q0, 0, 0.5, [0, 0.4, 0, 0]);
    pushBar(m, [x, yc - 1.5, z], [x, by + 3.4, z], 0.15, [0.08, 0.08, 0.08], 0, 0, 0.5);
    pushInst(bk, [x, by, z], [1, 1, 1], [0.32, 0.31, 0.3], 19, Q0, 0, 0.55, [0, 0.5, 0, 0]); }
  W.fill(E, B.misc, m); W.fill(E, B.buckets, bk);
  return [B.misc, B.buckets];
}

// --------- single pour: molten cap at the fill line ---------
function fillCap(fy) {
  const a = []; const N = 40; const xe = xExt(fy); const w = 2 * xe / N; const tk = thick(Math.max(fy, 0));
  for (let k = 0; k < N; k++) { const xc = -xe + (k + 0.5) * w; const sl = W.dzU(xc); const sx = w + 0.2, sz = tk;
    pushInst(a, [xc, fy - 0.6, zU(xc) + tk / 2], [sx, 1.2, sz], [1, 1, 1], 27, Q0, k, 0.8, [1.0, 30, sl * sx / sz, 5]); }
  W.fill(E, B.fill, a); return B.fill;
}
// --------- cracks: big crack paths down the downstream face, falling chunks ---------
const CRACKS = (() => { const R2 = rng(2027); const P = [];
  const walk = (x, y, dir, n, delay, w) => { const segs = []; let px = x, py = y;
    for (let k = 0; k < n; k++) { const nx = px + dir * (R2() - 0.35) * 6 + (R2() - 0.5) * 5, ny = py - 5 - R2() * 5;
      if (ny < 2 || Math.abs(nx) > xExt(ny) - 18) break; segs.push([px, py, nx, ny, delay + k * 0.03, w]);
      if (R2() < 0.12 && n - k > 6) segs.push(...walk(nx, ny, -dir, Math.floor((n - k) * 0.5), delay + k * 0.03, w * 0.65));
      px = nx; py = ny; }
    return segs; };
  for (let k = 0; k < 6; k++) { const x0 = -105 + 210 * (k + 0.2 + R2() * 0.6) / 6; P.push(...walk(x0, H - 1, R2() < 0.5 ? -1 : 1, 30, R2() * 0.3, 0.75 + R2() * 0.45)); }
  return P; })();
function facePt(x, y) { return [x, y, zU(x) + thick(Math.max(y, 0)) + 0.6]; }
function crackBars(t, prog, hot) {
  const a = [];
  for (const [x0, y0, x1, y1, d, w] of CRACKS) { const u = clamp((prog - d) / 0.045, 0, 1); if (u <= 0) continue;
    const xe = lerp(x0, x1, u), ye = lerp(y0, y1, u);
    pushBar(a, facePt(x0, y0), facePt(xe, ye), w, hot ? [1.0, 0.45, 0.12] : [0.05, 0.04, 0.035], 2, 0, 0.9, [hot ? 2.2 : 0, 0, 0, 0]); }
  return a;
}
function crackDebris(t) {
  const a = crackBars(t, sm(EV.crack0, EV.crack1, t) * 1.25, false); const R2 = rng(41);
  for (let k = 0; k < 46; k++) {
    const cs = CRACKS[Math.floor(R2() * CRACKS.length)]; const t0 = EV.crack0 + 0.25 + cs[4] * 1.8 / 1.25 + R2() * 0.5; const x = cs[0] + (R2() - 0.5) * 4; const y0 = cs[1]; const s = 2.5 + R2() * 5; const sp = R2();
    if (t < t0) continue; const tt = t - t0; const yy = y0 - 0.5 * 9.8 * 4 * tt * tt; if (yy < -2) continue;
    const z = zU(x) + thick(y0) + 1 + tt * (6 + 8 * sp);
    pushInst(a, [x, yy, z], [s, s * 0.7, s * 0.8], [0.5, 0.47, 0.43], 27, quatMul(qx(tt * (2 + sp * 3)), qy(sp * 6)), k, 0.8, [0.4, 3, 0, 3]);
  }
  W.fill(E, B.chunks, a); return B.chunks;
}
// --------- bread ---------
function loavesFalling(t, rate, tStart, big) {
  const a = []; const R2 = rng(97); const G = 9.8 * 7;
  for (let k = 0; k < 2400; k++) {
    const ts = tStart + k / rate; if (ts > t) break;
    const x = (R2() - 0.5) * 230, vz = 8 + R2() * 10, vy = 2 + R2() * 4, rx = R2() * 6, ry = R2() * 6, sp = 1 + R2() * 3; const tt = t - ts;
    const y = H + 6 + vy * tt - 0.5 * G * tt * tt; const z = Math.max(zU(x) + 8 + vz * tt, zU(x) + thick(Math.max(y, 0)) + big * 0.3);
    const floorY = pileY(x, z); if (y < floorY - 2) continue;
    pushInst(a, [x, Math.max(y, floorY + big * 0.25), z], [big, big * 0.48, big * 0.52], [1, 1, 1], 28, quatMul(qy(ry + tt * sp), qx(rx + tt * sp * 1.3)), k, 0.8, [0.95, 0, 0, 0]);
  }
  W.fill(E, B.loaves, a); return B.loaves;
}
let PILE_S = 0;
function pileY(x, z) { const dz = z - 205; const prof = sstep(-30, 120, dz) * (1 - sstep(500, 880, dz)); const w = Math.max(0, 1 - Math.pow(Math.abs(x) / 230, 2)); return (Math.pow(w, 0.55) * prof - 0.02) * PILE_S; }
function pileBatch(s) { PILE_S = s; const a = []; pushInst(a, [0, 0, 0], [1, Math.max(s, 0.01), 1], [1, 1, 1], 28, Q0, 0, 0.8, [1, 1, 11, 0]); W.fill(E, B.pile, a); return B.pile; }

// ================= cameras =================
function camera(shot, t) {
  const u = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1), e = ez(u);
  const c0p = (y) => W.colPoint(C0, 0, y, 0);
  switch (shot.name) {
    case 'H_hook': return { pos: mixv([64, 330, 720], [50, 292, 600], eo(u)), tgt: mixv([0, 132, 50], [0, 120, 64], e), fov: 50, near: 2, far: 9000 };
    case 'A_tall': return { pos: mixv([30, 268, 150], [22, 34, 340], e), tgt: mixv([0, 200, 18], [0, 6, 200], e), fov: 58, near: 1, far: 9000 };
    case 'A_conc': return { pos: mixv([-44, 52, 470], [38, 84, 430], e), tgt: [0, 118, 110], fov: 52, near: 2, far: 9000 };
    case 'A_road': { const xf = 30 + 52 * (t - shot.t0); return { pos: [xf - 22, lerp(3.2, 26, e * e), lerp(5.5, 14, e)], tgt: [xf + 80, lerp(1.0, 2, e), 0], fov: 52, near: 0.3, far: 20000 }; }
    case 'B_heat': { const top = c0Top(0.42); const P = c0p(top); return { pos: V3.add(P, mixv([-12, 21, 25], [-8, 15, 18], e)), tgt: V3.add(P, [0, 0.8, 0]), fov: 50, near: 0.2, far: 9000 }; }
    case 'B_pour': return { pos: mixv([28, 120, 620], [22, 150, 540], e), tgt: [0, 112, 110], fov: 52, near: 2, far: 9000 };
    case 'B_core': return { pos: mixv([470, 70, 104], [420, 62, 102], e), tgt: [0, 44, 100], fov: 58, near: 2, far: 9000 };
    case 'B_years': return { pos: mixv([410, 60, 102], [380, 56, 100], e), tgt: [0, 42, 98], fov: 58, near: 2, far: 9000 };
    case 'B_crack': { const s = shake(t, sm(EV.crack0, EV.crack0 + 0.2, t) * (1 - sm(22.4, 23.2, t)) * 1.4); return { pos: V3.add(mixv([52, 112, 470], [40, 128, 420], e), s), tgt: [0, 132, 96], fov: 52, near: 2, far: 9000 }; }
    case 'B_2058': return { pos: mixv([-70, 450, 560], [-56, 410, 500], e), tgt: [0, 100, 96], fov: 50, near: 2, far: 9000 };
    case 'C_cols': return { pos: mixv([70, 250, 450], [52, 236, 392], e), tgt: [0, 118, 92], fov: 52, near: 2, far: 9000 };
    case 'C_lifts': { const top = c0Top(0.55); const P = c0p(top); return { pos: V3.add(P, mixv([19, 13, 22], [14, 9, 17], e)), tgt: V3.add(P, [0, 1.2, 0]), fov: 50, near: 0.2, far: 9000 }; }
    case 'C_pipes': { const P = c0p(104); const a = lerp(0.55, 0.95, e), r = lerp(46, 38, e); return { pos: V3.add(P, [Math.sin(a) * r, lerp(18, 12, e), Math.cos(a) * r]), tgt: V3.add(P, [0, 2, 0]), fov: 50, near: 0.3, far: 9000 }; }
    case 'C_miles': { const P = c0p(104); const k = ez(sm(0.0, 1.0, u)); return { pos: mixv(V3.add(P, [Math.sin(0.95) * 38, 12, Math.cos(0.95) * 38]), [60, 330, 520], k), tgt: mixv(V3.add(P, [0, 2, 0]), [0, 104, 100], k), fov: 50, near: 0.3, far: 9000 }; }
    case 'C_river': { const P = c0p(110); return { pos: V3.add(P, mixv([13, 5.5, 17], [9, 3.6, 12.5], e)), tgt: V3.add(P, [-1, 0.4, -1]), fov: 50, near: 0.1, far: 9000 }; }
    case 'C_ice': { const P = [W.PLANT[0], 26, W.PLANT[2]]; return { pos: V3.add(P, mixv([-54, 15, 46], [-48, 12, 38], e)), tgt: V3.add(P, mixv([-26, 0, -40], [-24, 1.5, -60], e)), fov: 54, near: 0.3, far: 9000 }; }
    case 'C_done': return { pos: mixv([66, 440, 560], [52, 400, 500], e), tgt: [0, 104, 96], fov: 50, near: 2, far: 9000 };
    case 'C_grout': { const P = W.colPoint(C0, (DX - 0.9) / 2 * 0.9, 118, -(DS - 0.9) / 2 * 0.9); return { pos: V3.add(P, mixv([9, 3.5, -9], [6.5, 2.2, -6.5], e)), tgt: V3.add(P, [-2, -0.5, 2]), fov: 52, near: 0.1, far: 9000 }; }
    case 'D_oven': return { pos: mixv([0.35, 1.55, 4.6], [0.15, 1.1, 1.5], e), tgt: mixv([0, 0.75, -1.8], [0, 0.65, -2.2], e), fov: 50, near: 0.05, far: 200 };
    case 'D_loaves': return { pos: mixv([30, 64, 470], [24, 80, 420], e), tgt: [0, 186, 60], fov: 52, near: 2, far: 9000 };
    case 'D_3yrs': return { pos: mixv([90, 540, 920], [74, 500, 840], e), tgt: [0, 110, 330], fov: 50, near: 2, far: 9000 };
    default: { // E_end: ease back to the hook's first framing so the video loops
      const p0 = [40, 250, 470], p1 = [64, 330, 720]; const k = ez(sm(0, 0.9, u)); return { pos: mixv(p0, p1, k), tgt: mixv([0, 120, 64], [0, 132, 50], k), fov: 50, near: 2, far: 9000 };
    }
  }
}

// ================= per-frame state =================
export function frameState(t) {
  const shot = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const cam = camera(shot, t);
  const camF = { pos: cam.pos, target: cam.tgt, fov: cam.fov, near: cam.near || 1, far: cam.far || 9000, up: cam.up };
  const vp = E.viewProj(camF);
  const labels = []; let batches = [], S;
  const nm = shot.name;
  let st = { therm: 0, xray: 0, monoHeat: 0, crack: 0, crackGlow: 0, cutX: 1e6, fillY: 1e6, years: 0 };
  let water = null;
  if (shot.set === 'D') {
    if (['H_hook', 'A_tall', 'A_conc', 'E_end'].includes(nm)) {
      S = preset('gold'); batches = canyonState({ dam: 'finished', lake: true, crest: true, ring: true }); water = { level: W.RIVER, deep: [0.01, 0.035, 0.045], glint: 1.0, distort: 0.025 };
    } else if (nm === 'B_pour') {
      S = preset('therm'); batches = canyonState({ dam: 'mono', river: 'strip' });
      const fy = lerp(-6, H, ez(sm(EV.pour0, EV.pour1, t))); st.fillY = fy; st.monoHeat = 0.8;
      if (fy < H - 0.5) batches.push(fillCap(fy));
    } else if (nm === 'B_core' || nm === 'B_years') {
      S = preset('therm'); batches = canyonState({ dam: 'mono', cutTerrain: true }); batches.push(B.section);
      st.cutX = 0; st.years = nm === 'B_years' ? yearsAt(t) : 0; st.monoHeat = nm === 'B_years' ? lerp(0.62, 0.12, sm(EV.years0, EV.years1, t)) : 0.66;
      const pc = project(vp, [0, 70, 100]); if (pc && nm === 'B_core') labels.push({ x: pc[0], y: pc[1], txt: 'CORE', a: sm(16.2, 16.6, t), small: 1 });
    } else if (nm === 'B_crack') {
      S = preset('day'); batches = canyonState({ dam: 'mono', river: 'strip' });
      st.crack = 0; st.crackGlow = 0;
      batches.push(crackDebris(t));
    } else if (nm === 'B_2058') {
      S = preset('therm'); batches = canyonState({ dam: 'mono', river: 'strip' }); st.crack = 0.55; st.monoHeat = 0.38;
      W.fill(E, B.chunks, crackBars(t, 1.3, true)); batches.push(B.chunks);
    } else if (nm === 'C_cols') {
      S = preset('day'); batches = canyonState({ dam: 'cols', river: 'constr', cable: true, plant: true });
      const p = lerp(0.5, 0.6, sm(shot.t0 + 0.2, shot.t1, t));
      batches.push(columnsInst(p, null)); batches.push(formsInst(-1)); batches.push(...cableBuckets(t));
    } else if (nm === 'C_done') {
      const k = sm(42.9, 43.6, t);
      if (k <= 0.001) {
        S = preset('therm'); batches = canyonState({ dam: 'cols', river: 'constr' });
        const cool = sm(EV.done0, EV.done1, t);
        batches.push(columnsInst(TOP_FINISH, (c, top) => { const w = clamp(cool * 1.6 - (c.yBot + 30) / 260 * 0.6, 0, 1); return [lerp(0.75, 0.08, w), lerp(70, 40, w)]; }));
      } else {
        S = preset('gold'); batches = canyonState({ dam: 'finished', lake: true, crest: true, ring: true }); water = { level: W.RIVER, deep: [0.01, 0.035, 0.045], glint: 1.0, distort: 0.025 };
        S.post.flash = 0.35 * (1 - sm(42.9, 43.5, t));
      }
    } else if (nm === 'D_loaves' || nm === 'D_3yrs') {
      S = preset('day'); batches = canyonState({ dam: 'finished', lake: true, crest: true, ring: true, river: 'strip' });
      const s = nm === 'D_loaves' ? lerp(0, 46, sm(EV.loaves0 + 0.6, shot.t1, t)) : lerp(46, 172, ez(sm(shot.t0, EV.yrs1 + 0.6, t)));
      batches.push(pileBatch(s)); batches.push(loavesFalling(t, nm === 'D_loaves' ? 120 : 200, nm === 'D_loaves' ? EV.loaves0 - 0.3 : shot.t0 - 2.5, 15));
    }
  } else if (shot.set === 'F') {
    if (nm === 'B_heat') {
      S = preset('day'); const th = sm(EV.heat0, EV.heat1, t); S.therm = th;
      Object.assign(S.sky, { zen: mixv(S.sky.zen, [0.01, 0.0, 0.035], th), hor: mixv(S.sky.hor, [0.035, 0.004, 0.06], th) }); S.fog.col = mixv(S.fog.col, [0.025, 0.003, 0.05], th);
      S.post.bloom = lerp(0.25, 0.5, th); S.post.thr = lerp(1.8, 1.15, th);
      batches = canyonState({ dam: 'cols', river: 'constr', cable: true });
      batches.push(columnsInst(0.42, (c, top, k) => k === C0I ? [0.8, 5] : [0.25 + 0.4 * c.r, 4 + 6 * c.r], 0.9, lowerNeighbours(0.42))); batches.push(formsInst(C0I));
      batches.push(...constructionExtras(t, 0.42, 1, c0Top(0.42) + 9, sm(10.2, 10.4, t) * (1 - sm(11.4, 11.8, t))));
      st.therm = th;
    } else {
      S = preset('day');
      batches = canyonState({ dam: 'cols', river: 'constr', cable: true });
      const top = c0Top(0.55); const fr = sm(EV.lift0, EV.lift1, t);
      batches.push(columnsInst(0.55, null, 0.9, lowerNeighbours(0.55))); batches.push(formsInst(C0I));
      const by = top + lerp(14, 7.5, sm(28.4, 29.2, t));
      batches.push(...constructionExtras(t, 0.55, fr, by, sm(28.6, 28.8, t) * (1 - sm(30.3, 30.6, t))));
      const pf = project(vp, W.colPoint(C0, (DX - 0.9) / 2 + 0.3, top + LIFT * fr * 0.5, (DS - 0.9) / 2 + 0.3));
      if (pf) labels.push({ x: pf[0] + 120, y: pf[1], txt: '5 FT', a: sm(30.0, 30.3, t), small: 0 });
    }
  } else if (shot.set === 'X') {
    S = preset('xray'); batches = canyonState({ dam: 'none' });
    const a = [], hp = [];
    const near = (c) => Math.abs(c.i - C0.i) <= 1 && Math.abs(c.j - C0.j) <= 1;
    const wide = nm === 'C_miles'; const kWide = wide ? sm(shot.t0, shot.t0 + 1.4, t) : 0;
    const flow = nm === 'C_river' ? 0.9 : nm === 'C_grout' ? 0.9 * (1 - sm(EV.grout0, EV.grout0 + 0.6, t)) : 0;
    const pipeC = nm === 'C_river' || nm === 'C_grout' ? WATER_C : PIPE_C;
    const groutFn = nm === 'C_grout' ? (c, k) => clamp((t - EV.grout0 - 0.25 - (k < 0 ? 0 : k % 7) * 0.05) / 0.9, 0, 1) : null;
    for (let k = 0; k < COLS.length; k++) {
      const c = COLS[k]; const top = W.colTop(c, TOP_FINISH);
      const isC0 = k === C0I, nb = near(c);
      const thE = lerp(0.07, 0.75, kWide), thP = lerp(0.11, 0.85, kWide);
      if (isC0 || nb) pushEdges(a, c, top, thE, isC0 ? 1.4 : 0.6);
      else if (kWide > 0.02) pushEdges(a, c, top, thE, 0.75 * kWide);
      else continue; // close-ups show only the target column and its neighbours
      if (isC0) pushCoils(a, c, top, 1, 4, thP, pipeC, 1.7, flow, groutFn);
      else if (nb && !wide) pushCoils(a, c, top, 2, 3, thP * 0.8, pipeC, 0.42, flow, groutFn);
      else if (wide) pushCoils(a, c, top, 4, 2, thP, PIPE_C, 1.0 * sm(shot.t0 + 0.2, shot.t0 + 1.2, t) + 0.15, 0, null);
    }
    W.fill(E, B.lines, a); batches.push(B.lines);
    // heat inside the target column (fades as the water carries it away)
    const heat = nm === 'C_pipes' ? 1 : nm === 'C_river' ? lerp(1, 0.25, sm(EV.river0 + 0.3, shot.t1, t)) : nm === 'C_miles' ? 1 - kWide : 0.12;
    if (heat > 0.02) { const R2 = rng(13); const top = W.colTop(C0, TOP_FINISH);
      for (let k = 0; k < 900; k++) { const lx = (R2() - 0.5) * (DX - 2), ls = (R2() - 0.5) * (DS - 2), y = C0.yBot + R2() * (top - C0.yBot); const fl = 0.6 + 0.4 * Math.sin(t * 7 + k);
        pushInst(hp, W.colPoint(C0, lx, y, ls), [0.16, 0.16, 0.16], [1.0, 0.42, 0.08], 2, Q0, 0, 0.5, [heat * 3.2 * fl, 0, 0, 0]); } }
    W.fill(E, B.heatp, hp); if (hp.length) batches.push(B.heatp);
    if (nm === 'C_pipes') { const pp = project(vp, W.colPoint(C0, 0, 112, 0)); if (pp) labels.push({ x: pp[0] - 60, y: pp[1] - 80, txt: 'COOLING COILS', a: sm(31.5, 31.9, t), small: 1 }); }
    if (nm === 'C_grout') { const pp = project(vp, W.colPoint(C0, (DX - 0.9) / 2 * 0.9, 118, -(DS - 0.9) / 2 * 0.9)); if (pp) labels.push({ x: pp[0], y: pp[1] - 120, txt: 'GROUT', a: sm(44.5, 44.9, t), small: 1 }); }
  } else if (shot.set === 'I') {
    S = preset('day'); batches = canyonState({ dam: 'cols', river: 'constr', cable: true, plant: true });
    batches.push(columnsInst(0.62, null)); batches.push(formsInst(-1)); batches.push(...cableBuckets(t));
    const a = []; const P = W.PLANT; const n = Math.floor(lerp(30, 640, eo(sm(EV.ice0, EV.ice1, t))));
    const R2 = rng(3); let k = 0;
    for (let ly = 0; ly < 12 && k < n; ly++) for (let r = 0; r < 9 - Math.floor(ly * 0.6) && k < n; r++) for (let cI = 0; cI < 6 && k < n; cI++, k++) {
      const x = P[0] - 46 + cI * 1.25 + (ly % 2) * 0.3, z = P[2] + 8 - r * 0.62 - ly * 0.3, y = 25.8 + 0.3 + ly * 0.6;
      pushInst(a, [x, y, z], [1.15, 0.56, 0.58], [1, 1, 1], 31, qy((R2() - 0.5) * 0.06), k, 0.2, [0, 0, 0, 0]);
    }
    // the newest block sliding down a chute
    const sl = (t * 1.7) % 1; pushInst(a, [P[0] - 31 - sl * 6, 31 - sl * 3, P[2] + 4], [1.15, 0.56, 0.58], [1, 1, 1], 31, qz(0.45), 999, 0.2, [0, 0, 0, 0]);
    W.fill(E, B.ice, a); batches.push(B.ice);
    S.pls = [{ p: [P[0] - 22, 34, P[2] + 6], c: [0.6, 0.8, 1.0], i: 0.5, r: 30 }];

  } else if (shot.set === 'R') {
    S = preset('noon'); batches = [B.roadGround, B.mesas];
    const a = []; const xf = 30 + 52 * (t - shot.t0);
    pushInst(a, [xf * 0.5 + 6000, 0.12, 0], [12000 + xf, 0.24, 4.88], [1, 1, 1], 27, Q0, 0, 0.8, [0, 0, 0, 2]);
    for (const sz of [-1, 1]) pushInst(a, [xf * 0.5 + 6000, 0.05, sz * 3.2], [12000 + xf, 0.1, 1.4], [0.5, 0.42, 0.32], 0, Q0, 0, 0.9);
    for (let k = -2; k < 60; k++) { const x = Math.floor(xf / 40) * 40 + k * 40; pushInst(a, [x, 0.7, 5.2], [0.12, 1.4, 0.12], [0.85, 0.85, 0.82], 0, Q0, 0, 0.6); pushInst(a, [x, 1.3, 5.2], [0.14, 0.16, 0.14], [1.0, 0.85, 0.3], 0, Q0, 0, 0.3); }
    W.fill(E, B.road, a); batches.push(B.road);
    const pn = project(vp, [xf + 9000, 2, 0]); if (pn) labels.push({ x: pn[0], y: pn[1] - 70, txt: 'NEW YORK →', a: sm(8.0, 8.4, t), small: 1, ymin: 300 });
  } else { // oven
    S = preset('therm'); S.therm = 0;
    S.sky = { ...SKY0, zen: [0.005, 0.004, 0.004], hor: [0.008, 0.006, 0.005], bgMode: 1, bgPow: 0 };
    S.light = { dir: norm([0.2, 0.9, 0.4]), col: [0.25, 0.18, 0.12] }; S.amb = { sky: [0.05, 0.035, 0.025], gnd: [0.06, 0.03, 0.015] };
    S.fog = { col: [0.02, 0.01, 0.005], den: 0.02, h: 10 };
    S.pls = [{ p: [0, 0.4, -1.8], c: [1.0, 0.5, 0.18], i: 2.2, r: 4.5 }, { p: [0, 1.6, -0.8], c: [1.0, 0.62, 0.3], i: 1.0, r: 4 }, { p: [0, 2.5, 3.0], c: [0.5, 0.45, 0.4], i: 0.25, r: 8 }];
    S.post = { exposure: 1.05, bloom: 0.55, thr: 1.1, vig: 0.5, grain: 0.03, lift: [0.01, 0.005, 0.0], gain: [1.03, 1, 0.95], sat: 1.1 };
    const O = B.oven; batches = [O.brick, O.glow, O.racks];
    const a = []; const bake = sm(46.5, 48.6, t); const rise = lerp(0.82, 1.0, sm(46.6, 48.2, t));
    for (const y of [0.45, 1.05]) for (let r = 0; r < 3; r++) for (let cI = 0; cI < 5; cI++) {
      const x = -1.1 + cI * 0.55, z = -0.75 - r * 1.0; const sc = 0.42;
      pushInst(a, [x, y + 0.05 + 0.1 * rise, z], [sc * 1.05, sc * 0.5 * rise, sc * 0.52], [1, 1, 1], 28, qy(0.08 * Math.sin(cI * 3 + r)), cI * 7 + r, 0.8, [bake, 0, 0, 0]);
    }
    W.fill(E, B.ovenLoaves, a); batches.push(B.ovenLoaves);
  }
  Object.assign(S, { therm: S.therm ?? st.therm, xray: S.xray ?? st.xray });
  if (shot.set === 'D' || shot.set === 'X') { S.therm = S.therm || st.therm; }
  S.monoHeat = st.monoHeat; S.crack = st.crack; S.crackGlow = st.crackGlow; S.cutX = st.cutX; S.fillY = st.fillY; S.years = st.years;
  S.time = t; S.batches = batches; S.restore = 1; S.carPow = 1; S.skinCut = 0; S.copper = 1; S.day = 1; S.water = water;
  S.post.glitch = 0; S.post.flash = S.post.flash || 0; S.post.fade = 1;
  // white pops on the big reveals; a short rewind glitch into the real method
  for (const [tf, a] of [[EV.pour1, 0.1], [15.4, 0.22], [EV.crack0 + 0.1, 0.12], [25.8, 0.18], [EV.lift1, 0.06], [EV.miles1, 0.06], [EV.done0, 0.06]]) if (t >= tf && t < tf + 0.22) S.post.flash = Math.max(S.post.flash, a * (1 - (t - tf) / 0.22));
  if (t >= 25.8 && t < 26.1) S.post.glitch = 1 - (t - 25.8) / 0.3;
  window.__frame = { labels, shot: nm, set: shot.set, years: st.years };
  return { S, cam: camF, shot };
}

export function renderAt(t) {
  const { S, cam, shot } = frameState(t);
  E.render(S, cam);
  hudAt(t, window.__frame);
  E.finish();
  return shot.name;
}
