// scene.js — "5 lightning facts, only 1 is true": shots, cameras, lighting, lightning. Original code.
import { Engine, V3, meshBox, pushBar } from './engine.js';
import * as W2 from './world2.js';
import { SHOTS, STRIKES, STAMPS, FPS, DURATION, carX, CAR, W_STRIKE, W_RING_SPEED } from './timeline.js';
import { hudAt } from './hud.js';
export { SHOTS, FPS, DURATION };

const { clamp, lerp } = W2;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ez = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const mixv = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const norm = V3.norm;
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

const ENV = {
  T: { zen: [0.006, 0.007, 0.011], hor: [0.03, 0.031, 0.04], ldir: norm([0.3, 0.8, 0.4]), lcol: [0.05, 0.055, 0.075], amb: [[0.02, 0.022, 0.03], [0.006, 0.006, 0.007]], exp: 1.45, fog: { den: 0.00052, h: 420 }, stars: 0, bloom: 0.45 },
  C: { zen: [0.005, 0.006, 0.009], hor: [0.024, 0.025, 0.032], ldir: norm([0.3, 0.8, 0.4]), lcol: [0.04, 0.045, 0.06], amb: [[0.016, 0.018, 0.025], [0.005, 0.005, 0.006]], exp: 1.5, fog: { den: 0.0016, h: 220 }, stars: 0, bloom: 0.45 },
  FD: { zen: [0.08, 0.2, 0.55], hor: [0.55, 0.66, 0.82], sunDir: norm([0.3, 0.42, 0.86]), sunAmt: 1.0, ldir: norm([0.32, 0.5, 0.8]), lcol: [2.1, 1.98, 1.8], amb: [[0.28, 0.36, 0.5], [0.1, 0.09, 0.08]], exp: 0.6, fog: { den: 0.000016, h: 2600 }, stars: 0, bloom: 0.3 },
  FN: { zen: [0.0022, 0.003, 0.007], hor: [0.018, 0.019, 0.027], ldir: norm([-0.3, 0.6, 0.5]), lcol: [0.03, 0.035, 0.05], amb: [[0.008, 0.01, 0.015], [0.003, 0.003, 0.004]], exp: 1.65, fog: { den: 0.00002, h: 3000 }, stars: 0.75, bloom: 0.5 },
  S: { zen: [0.004, 0.005, 0.009], hor: [0.02, 0.021, 0.03], ldir: norm([-0.3, 0.6, 0.5]), lcol: [0.03, 0.035, 0.05], amb: [[0.01, 0.012, 0.018], [0.003, 0.003, 0.004]], exp: 1.15, fog: { den: 0.00035, h: 900 }, stars: 0.0, bloom: 0.55 },
  SUN: { zen: [0.0, 0.0, 0.0], hor: [0.0, 0.0, 0.002], ldir: norm([0, 0, 1]), lcol: [0, 0, 0], amb: [[0, 0, 0], [0, 0, 0]], exp: 0.95, fog: { den: 0.0, h: 100 }, stars: 0.55, bloom: 0.55 },
  W: { zen: [0.03, 0.042, 0.1], hor: [0.42, 0.21, 0.12], sunDir: norm([-0.55, 0.012, -0.83]), sunAmt: 0.5, ldir: norm([-0.5, 0.2, -0.85]), lcol: [0.16, 0.1, 0.07], amb: [[0.035, 0.038, 0.06], [0.012, 0.011, 0.01]], exp: 1.25, fog: { den: 0.00009, h: 1500 }, stars: 0.08, bloom: 0.45 },
};

let E, B, P5a, P5b;
export async function setup(canvas, Wd = 1080, Hd = 1920, opts = {}) {
  canvas.width = Wd; canvas.height = Hd;
  E = new Engine(canvas, Wd, Hd, opts); window.__E = E;
  const T = W2.buildTowerCity(E), C = W2.buildRoad(E), F = W2.buildField(E), SUN = W2.buildSun(E);
  const bolts = E.batch(E.mesh('box', meshBox), new Float32Array(7000 * 20), true); bolts.shadow = false; bolts.kinds = [2];
  C.car.kinds = [0, 2]; C.wheels.kinds = [0];
  B = { T, C, F, SUN, bolts, imp1: W2.buildImpostor(E), imp2: W2.buildImpostor(E) };
  for (const s of STRIKES) s.geo = W2.genBolt(s.seed, s.A, s.B, { levels: s.levels, rough: s.rough, branches: s.branches, via: s.via });
  const hb = STRIKES.find(s => s.hold).geo.pts;
  const near = (y) => hb.reduce((best, p) => Math.abs(p[1] - y) < Math.abs(best[1] - y) ? p : best, hb[0]);
  P5a = near(300); P5b = near(190);
  return { info: E.info, strikes: STRIKES.length, bld: T.buildings.count };
}

function project(vp, p) {
  const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12], y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13], w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
  if (w <= 0) return null; return [(x / w * 0.5 + 0.5) * 1080, (1 - (y / w * 0.5 + 0.5)) * 1920];
}

// ---------- cameras ----------
function camera(shot, t) {
  const u = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1), e = ez(u);
  const cx = carX(t);
  switch (shot.name) {
    case 'H_hook': return { pos: mixv([300, 250, 640], [232, 302, 518], e), tgt: mixv([0, 392, 0], [0, 408, 0], e), fov: 44 };
    case 'T1a': return { pos: mixv([150, 26, 262], [136, 40, 236], e), tgt: mixv([0, 330, 0], [0, 352, 0], e), fov: 60 };
    case 'T1b': { const a = lerp(0.55, 1.3, u), r = lerp(335, 300, u); return { pos: [Math.sin(a) * r, 392 + 26 * u, Math.cos(a) * r], tgt: [0, 404, 0], fov: 46 }; }
    case 'T1c': return { pos: mixv([-980, 230, 1500], [-900, 262, 1360], e), tgt: mixv([0, 288, 0], [0, 300, 0], e), fov: 36 };
    case 'C2a': return { pos: [cx + 11 - 3 * u, 2.0, 8.4 - 0.8 * u], tgt: [cx + 0.2, -0.9, 0], fov: 40 };
    case 'C2b': return { pos: [cx + lerp(7.4, 6.4, e), lerp(0.6, 0.75, u), lerp(4.1, 3.7, e)], tgt: [cx - 0.4, -0.5, 0], fov: 50 };
    case 'C2c': { const a = lerp(0.35, 1.95, e), r = 8.4; return { pos: [cx + Math.cos(a) * r, lerp(3.9, 2.7, u), Math.sin(a) * r], tgt: [cx, -0.6, 0], fov: 40 }; }
    case 'F3a': return { pos: mixv([58, 2.4, 44], [55, 2.8, 36], e), tgt: mixv([0, 2400, -19500], [0, 2700, -19500], e), fov: 62, far: 140000 };
    case 'F3b': return { pos: mixv([66, 1.4, 12], [61, 1.8, 6], e), tgt: mixv([37, 7.5, -30], [36, 8.5, -30], e), fov: 60, far: 140000 };
    case 'F3c': return { pos: mixv([2200, 4200, 9000], [2700, 5600, 11200], e), tgt: mixv([0, 0, -1300], [0, 0, -1700], e), fov: 58, near: 4, far: 160000 };
    case 'F4a': return { pos: mixv([12, 2.0, 22], [8, 2.3, 16], e), tgt: mixv([-9000, 800, -42000], [-9000, 950, -42000], e), fov: 48, far: 160000 };
    case 'F4b': return { pos: [0, 3, 10], tgt: mixv([-9000, 4600, -42000], [-8800, 4900, -42000], e), fov: lerp(27, 22, e), far: 160000 };
    case 'F4c': return { pos: mixv([-4300, 80000, 46000], [-4700, 86000, 52000], e), tgt: mixv([-1900, 0, -9000], [-2000, 0, -9200], e), fov: 52, near: 60, far: 300000 };
    case 'S5a': return { pos: V3.add(P5a, mixv([26, 5, 34], [20, 3, 27], e)), tgt: V3.add(P5a, [0, -2, 0]), fov: 44, far: 60000 };
    case 'S5b': return { pos: V3.add(P5b, mixv([10, 2.5, 13], [7, 1.2, 9], e)), tgt: P5b, fov: 46, far: 60000 };
    case 'S5c': return { pos: mixv([0, -150, 2950], [90, -120, 2380], e), tgt: [0, -480, 0], fov: 40, far: 60000 };
    case 'W6a': return { pos: mixv([-2.5, 3.1, 64.9], [-2.5, 3.05, 64.4], e), tgt: mixv([-60, 40, -1600], [-60, 45, -1600], e), fov: 50, near: 0.2, far: 60000 };
    case 'W6b': return { pos: mixv([-60, 4100, 3350], [-140, 4400, 3650], e), tgt: mixv([-100, 0, -228], [-100, 0, -228], e), fov: 50, near: 4, far: 60000 };
    default: return { pos: mixv([-330, 280, 560], [-282, 312, 470], e), tgt: mixv([0, 398, 0], [0, 410, 0], e), fov: 44 }; // E_end
  }
}

function batchesFor(shot) {
  const T = B.T, C = B.C, F = B.F;
  switch (shot.set) {
    case 'T': return [T.ground, T.buildings, T.details, T.mast, T.deck, B.bolts];
    case 'C': return [C.ground, C.marks, C.lamps, C.trees, C.deck, C.car, C.wheels, B.bolts];
    case 'FD': return [F.ground, F.trunk, F.tree, F.fence, F.house, F.rain1, B.imp1, B.bolts];
    case 'FN': return shot.name === 'F4c' ? [F.ground, F.storm2, B.bolts] : [F.ground, F.trunk, F.tree, F.fence, F.house, B.imp2, B.bolts];
    case 'S': return [F.ground, F.deck, B.bolts];
    case 'SUN': return [B.SUN];
    case 'W': return shot.name === 'W6a' ? [F.ground, F.deck, F.window, F.tree, F.trunk, F.fence, B.bolts] : [F.ground, F.house, F.tree, F.trunk, F.fence, B.bolts];
  }
  return [];
}

// ---------- the car's steel frame carrying the current ----------
function carCurrent(a, t, cx, cam) {
  const dt = t - CAR.ts; if (dt < 0) return 0;
  const wf = (p, s) => clamp(V3.len(V3.sub(p, cam)) * 0.0055, 0.007, 0.02) * s;
  const fr = Math.floor(t * 30 / 2); const k = Math.exp(-Math.max(0, dt - 3.2) / 2.5);
  const ref = W2.CAR_STRIKE;
  W2.CAR_FRAME.forEach(([A, Bp], si) => {
    const mid = V3.scale(V3.add(A, Bp), 0.5); const d = V3.len(V3.sub(mid, ref));
    const on = clamp((dt * 7.0 - d) / 0.4, 0, 1); if (on <= 0) return;
    const pts = [A]; const M = 6;
    for (let m = 1; m < M; m++) { const p = V3.lerp(A, Bp, m / M); const h = hash(fr * 17.3 + si * 7.1 + m);
      pts.push([p[0] + (h - 0.5) * 0.07, p[1] + (hash(h * 91.7) - 0.5) * 0.07, p[2] + (hash(h * 53.1) - 0.5) * 0.07]); }
    pts.push(Bp);
    const I = (2.4 + 2.6 * hash(fr * 3.1 + si)) * on * k;
    for (let m = 0; m < M; m++) { const p0 = [pts[m][0] + cx, pts[m][1], pts[m][2]], p1 = [pts[m + 1][0] + cx, pts[m + 1][1], pts[m + 1][2]];
      pushBar(a, p0, p1, wf(p0, 1), [0.55, 0.8, 1.0], 2, 0, 0.5, [I, 0, 0, 0]); }
  });
  // arcs from the body to the wet road beside each tyre: the rubber is no barrier
  const reach = clamp((dt * 7.0 - 1.4) / 0.4, 0, 1);
  if (reach > 0) for (let w = 0; w < 4; w++) {
    const wh = W2.WHEELS[w]; const sz = Math.sign(wh[2]);
    for (const side of [-1, 1]) {
      const A = [wh[0] + side * 0.5 + cx, 0.38, sz * 0.93], Bp = [wh[0] + side * 0.62 + cx, 0.0, sz * (1.08 + 0.12 * hash(fr + w))];
      const geo = W2.genBolt(fr * 13 + w * 3 + (side > 0 ? 1 : 0), A, Bp, { levels: 3, rough: 0.3, branches: 1 });
      for (const s of geo.segs) pushBar(a, s.a, s.b, wf(s.a, 0.9), [0.6, 0.85, 1.0], 2, 0, 0.5, [(3 + 3 * hash(fr * 1.7 + w + side)) * reach * k * s.i, 0, 0, 0]);
    }
  }
  return k;
}

export function frameState(t) {
  const shot = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const env = ENV[shot.set];
  let cam = camera(shot, t);
  const camO = { pos: cam.pos, target: cam.tgt, fov: cam.fov, near: cam.near || 0.6, far: cam.far || 9000 };
  const bars = [];
  // ---- lightning ----
  let flashSum = 0, shake = 0; const best = [];
  for (const s of STRIKES) {
    if (s.set !== shot.set) continue;
    let dt = t - (s.t - 0.06);
    let I = s.I, hold = 0;
    if (s.hold) { if (t < s.hold[0] || t > s.hold[1]) continue; dt = t - s.hold[0] + 0.06;
      const fl = 0.75 + 0.25 * Math.sin(t * 41.0) * Math.sin(t * 17.3 + 1.0) + (hash(Math.floor(t * 30)) - 0.5) * 0.3;
      hold = clamp(fl, 0.35, 1.2) * (t < 41.1 ? 0.55 : 0.9); }
    if (!s.hold && (dt < 0 || dt > 0.7)) continue;
    if (s.ic) I *= shot.name === 'F4b' ? 1.0 : 0.0; // in-cloud channels only show in the telephoto shot
    const wK = s.ic ? 0.0016 : shot.set === 'FD' ? (shot.name === 'F3c' ? 0.0042 : 0.0042) : shot.set === 'W' ? (shot.name === 'W6b' ? 0.004 : 0.0026) : 0.0022;
    const e = W2.pushBolt(bars, s.geo, dt, cam.pos, { I: shot.set === 'FD' ? I * 1.6 : I, hold, wK, wMin: shot.set === 'S' ? 0.12 : 0.04 });
    const ee = s.ic ? W2.strikeEnv(dt) : (hold || e);
    if (ee > 0.001) {
      const d = V3.len(V3.sub(s.B, cam.pos)); const prox = s.ic ? 0.25 : clamp(900 / (d + 200), 0.08, 1.0);
      flashSum += ee * prox; best.push({ s, e: ee, prox, d });
      if (!s.ic && d < 1500 && !s.hold && dt < 0.5) shake = Math.max(shake, ee * clamp(1 - d / 1500, 0, 1));
    }
  }
  if (shot.set === 'C') carCurrent(bars, t, carX(t), cam.pos);
  // sound rings, distance lines, labels
  const labels = [];
  const vp = E.viewProj(camO);
  if (shot.name === 'F3c') {
    const Bp = [W2.TREE[0], 30, W2.TREE[2]], Ae = [0, 30, W2.STORM1[2] + W2.RAIN1_R];
    const grow = sm(26.9, 27.7, t);
    pushBar(bars, Ae, V3.lerp(Ae, Bp, grow), 70, [1.0, 0.8, 0.25], 2, 0, 0.5, [7, 0, 0, 0]);
    for (const p of [Ae, Bp]) pushBar(bars, [p[0], 0, p[2]], [p[0], 900 * grow + 1, p[2]], 60, [1.0, 0.8, 0.25], 2, 0, 0.5, [6, 0, 0, 0]);
    const m = project(vp, V3.lerp(Ae, Bp, 0.5)); if (m && grow > 0.6) labels.push({ x: m[0] + 90, y: m[1], txt: '10 MILES', a: sm(27.5, 27.9, t) });
    const tr = project(vp, [W2.TREE[0], 0, W2.TREE[2]]); if (tr) labels.push({ x: tr[0], y: tr[1] - 70, txt: 'BLUE SKY HERE', a: sm(27.0, 27.4, t), small: 1 });
    const rn = project(vp, [W2.STORM1[0], 0, W2.STORM1[2]]); if (rn) labels.push({ x: rn[0], y: rn[1] + 50, txt: 'RAIN', a: sm(27.0, 27.4, t), small: 1 });
  }
  if (shot.name === 'F4c') {
    const fade = 1 - sm(37.9, 38.6, t);
    for (const t0 of [35.7, 36.25, 36.8]) { // sound waves spreading from the storm, dying out at ~10 miles
      const p = clamp((t - t0) / 1.9, 0, 1); if (p <= 0) continue; const r = 16093 * Math.pow(p, 0.8);
      W2.pushRing(bars, W2.STORM2, r, 900, [0.7, 0.82, 1.0], 9 * (1 - p * 0.75) * fade, 140, 60);
    }
    W2.pushRing(bars, W2.STORM2, 16093, 600, [1.0, 0.8, 0.25], 6 * sm(37.0, 37.5, t) * fade, 140, 40);
    const pulse = 0.65 + 0.35 * Math.sin(t * 9);
    pushBar(bars, [0, 0, 0], [0, 6000, 0], 1500, [1.0, 0.85, 0.3], 2, 0, 0.5, [12 * pulse, 0, 0, 0]);
    const py = project(vp, [0, 6000, 0]); if (py) labels.push({ x: py[0], y: py[1] - 40, txt: 'YOU', a: sm(35.6, 35.9, t) });
    const pr = project(vp, [W2.STORM2[0] + 16093 * 0.71, 60, W2.STORM2[2] + 16093 * 0.71]); if (pr) labels.push({ x: pr[0] + 40, y: pr[1] + 50, txt: '10 MILES', a: sm(37.1, 37.5, t) * fade, small: 1 });
  }
  if (shot.set === 'W') {
    for (const s of STRIKES) if (s.set === 'W') {
      const dt = t - s.t; if (dt < 0 || dt > 3.2) continue;
      const r = W_RING_SPEED * dt; const fade = 1 - sm(2.4, 3.0, dt);
      W2.pushRing(bars, s.B, r, shot.name === 'W6a' ? 6 : 30, [0.8, 0.88, 1.0], 4.5 * fade, 140, 1.0);
    }
    if (shot.name === 'W6b') {
      const H = [W2.HOUSE[0] - 2.5, 1.5, W2.HOUSE[2] - 1]; const S0 = [W_STRIKE.B[0], 1.5, W_STRIKE.B[2]];
      const g = sm(51.0, 51.6, t);
      pushBar(bars, H, V3.lerp(H, S0, g), 26, [1.0, 0.8, 0.25], 2, 0, 0.5, [6, 0, 0, 0]);
      const pulse = 0.7 + 0.3 * Math.sin(t * 9);
      pushBar(bars, [H[0], 0, H[2]], [H[0], 260, H[2]], 60, [1.0, 0.85, 0.3], 2, 0, 0.5, [9 * pulse, 0, 0, 0]);
      const m = project(vp, V3.lerp(H, S0, 0.5)); if (m) labels.push({ x: m[0] + 120, y: m[1], txt: '1 MILE', a: sm(51.4, 51.8, t) });
      const hp = project(vp, H); if (hp) labels.push({ x: hp[0], y: hp[1] + 70, txt: 'YOU, INDOORS', a: sm(51.1, 51.5, t), small: 1 });
    }
  }
  // fill the bolt batch
  const nb = Math.min(bars.length / 20, 7000); if (!B.bolts.buf) B.bolts.buf = new Float32Array(7000 * 20);
  B.bolts.buf.set(bars.length > 7000 * 20 ? bars.slice(0, 7000 * 20) : bars); E.updateBatch(B.bolts, B.bolts.buf, nb);
  // ---- storm impostors ----
  if (shot.set === 'FD') W2.placeImpostor(E, B.imp1, W2.STORM1, cam.pos, { w: 36000, h: 14000, col: [0.78, 0.8, 0.84], glow: 1.0, seed: 1.3, back: 3600 });
  if (shot.set === 'FN') W2.placeImpostor(E, B.imp2, W2.STORM2, cam.pos, { w: 36000 * 0.6, h: 14000 * 0.6, scale: 0.6, col: [0.21, 0.22, 0.27], glow: 1.4, seed: 2.7, back: 2000 });
  // ---- car ----
  if (shot.set === 'C') {
    const cx = carX(t); const a = []; W2.carInstances(a, cx, 0, 0, 1);
    if (!B.C.car.buf) B.C.car.buf = new Float32Array(60 * 20); B.C.car.buf.set(a); E.updateBatch(B.C.car, B.C.car.buf, a.length / 20);
    const w = []; W2.wheelInstances(w, cx, 0, cx / 0.34);
    if (!B.C.wheels.buf) B.C.wheels.buf = new Float32Array(16 * 20); B.C.wheels.buf.set(w); E.updateBatch(B.C.wheels, B.C.wheels.buf, w.length / 20);
  }
  // camera shake after close strikes
  if (shake > 0.01 && shot.set !== 'SUN') {
    const k = shake * (shot.set === 'C' ? 0.05 : shot.set === 'W' ? 0.012 : 0.6);
    cam = { ...cam, tgt: V3.add(cam.tgt, [(hash(t * 91) - 0.5) * k * 6, (hash(t * 57) - 0.5) * k * 6, 0]) };
  }
  // ---- lights + sky ----
  best.sort((x, y) => y.e * y.prox - x.e * x.prox);
  const flashes = best.slice(0, 3).map(b => ({ p: b.s.ic ? b.s.A : [b.s.A[0], b.s.A[1] - 40, b.s.A[2]], i: b.e * (b.s.ic ? 2.6 : 3.2), r: b.s.ic ? 2600 : (shot.set === 'FD' ? 2600 : 520) }));
  const pls = [];
  for (const b of best.slice(0, 2)) {
    if (b.s.ic) continue;
    pls.push({ p: V3.lerp(b.s.A, b.s.B, 0.75), c: [0.72, 0.78, 1.0], i: b.e * (shot.set === 'FD' ? 1.0 : 3.6), r: shot.set === 'C' ? 900 : shot.set === 'T' ? 1600 : 2600 });
  }
  if (shot.set === 'C') {
    const cx = carX(t); const l0 = Math.round(cx / 42) * 42;
    for (const lx of [l0, l0 + 42, l0 - 42]) pls.push({ p: [lx, 8.8, -5.4], c: [1.0, 0.76, 0.48], i: 1.5, r: 26 });
    pls.push({ p: [cx + 5.5, 0.9, 0.0], c: [1.0, 0.94, 0.84], i: 1.3, r: 16 });
  }
  if (shot.name === 'W6b') pls.push({ p: [W2.HOUSE[0] - 2.5, 3.2, W2.HOUSE[2] - 2.5], c: [1.0, 0.72, 0.42], i: 0.9, r: 14 });
  const fl = clamp(flashSum, 0, 2.5);
  let sfl = [0, 1, 0, 0];
  if (best.length) { const b = best[0]; const d = V3.norm(V3.sub(b.s.A, cam.pos)); sfl = [d[0], d[1], d[2], clamp(b.e * b.prox, 0, 2) * (shot.set === 'FD' ? 0.15 : shot.set === 'FN' ? 0.35 : 0.5)]; }
  const ambK = shot.set === 'FD' ? 0.0 : 1.0;
  const amb = { sky: V3.add(env.amb[0], V3.scale([0.05, 0.055, 0.085], fl * ambK)), gnd: V3.add(env.amb[1], V3.scale([0.02, 0.022, 0.03], fl * ambK)) };
  const water = shot.set === 'C' ? { level: 0, deep: [0.008, 0.0085, 0.01], distort: 0.012, glint: 0 } : null;
  const shadow = (shot.name === 'F3a' || shot.name === 'F3b') ? { center: [W2.TREE[0], 6, W2.TREE[2]], radius: 26, bias: 0.05 } : null;
  const stampFlash = STAMPS.reduce((m, [ts]) => (t >= ts && t < ts + 0.4) ? Math.max(m, Math.exp(-(t - ts) / 0.07)) : m, 0);
  const S = {
    time: t, batches: batchesFor(shot), restore: 1.05, carPow: 1, skinCut: 0, copper: 1, day: shot.set === 'FD' ? 1 : 0,
    sky: { zen: env.zen, hor: env.hor, moonDir: norm([0.3, 0.5, -0.8]), moonCol: [1, 0.97, 0.9], moonAmt: 0, sunDir: env.sunDir || [0, -1, 0], sunCol: [1.0, 0.9, 0.75], sunAmt: env.sunAmt || 0,
      stars: env.stars, glowCol: [0.17, 0.11, 0.06], glowDir: [0, 0, -1], glowAmt: shot.set === 'T' ? 0.5 : 0, bgMode: 0, bgPow: 1, sfl },
    light: { dir: env.ldir, col: env.lcol }, amb,
    fog: { col: V3.add(shot.set === 'W' ? [0.035, 0.04, 0.065] : V3.scale(env.hor, 0.95), V3.scale([0.3, 0.32, 0.45], 0.08 * fl * ambK)), den: shot.name === 'F3c' ? 0.000009 : env.fog.den, h: env.fog.h },
    water, shadow, pls, flashes, flashCol: [0.62, 0.68, 1.0],
    road: shot.set === 'T' ? [W2.CITY_ROAD.AS, W2.CITY_ROAD.AW, W2.CITY_ROAD.SS, W2.CITY_ROAD.SW] : [90, 22, 60, 14], roadOrg: W2.CITY_ROAD.org,
    post: { exposure: env.exp, bloom: env.bloom, thr: 1.5, glitch: 0, flash: stampFlash * 0.06 + clamp(fl - 1.2, 0, 1) * 0.03, vig: 0.4, grain: 0.03, fade: 1, lift: [0.006, 0.008, 0.014], gain: [1.0, 1.0, 1.03], sat: 1.06 },
  };
  const camF = { pos: cam.pos, target: cam.tgt, fov: cam.fov, near: cam.near || 0.6, far: cam.far || 9000 };
  if (shot.set === 'T') { E.cullBatch(B.T.buildings, camF, true); E.cullBatch(B.T.details, camF, false); }
  const rain = shot.set === 'T' ? 1.0 : shot.set === 'C' ? 1.0 : shot.set === 'S' ? 0.3 : shot.name === 'W6a' ? 0.55 : shot.name === 'W6b' ? 0.35 : 0;
  window.__frame = { rain, flash: clamp(fl, 0, 1.5), labels, shot: shot.name, set: shot.set };
  return { S, cam: camF, shot };
}

export function renderAt(t) {
  const { S, cam, shot } = frameState(t);
  E.render(S, cam);
  hudAt(t, window.__frame);
  E.finish();
  return shot.name;
}
