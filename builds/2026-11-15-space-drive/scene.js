// scene.js — "Space is only 1 hour away by car": shots, cameras, lighting and animation. Original code.
import { Engine, V3, pushInst, quatMul, qrot, quatFromTo, quatAxis } from './engine.js';
import * as W from './world8.js';
import { SHOTS, FPS, DURATION, EV, T, HB } from './timeline.js';
import { hudAt } from './hud.js';
export { SHOTS, FPS, DURATION };

const { clamp, lerp, qx, qy, qz, Q0, rng, billQ, RR } = W;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ez = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const eo = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const mixv = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const norm = V3.norm;
const R_E = W.EARTH_R;
const RO = 1.22; // the diagram's launch radius (Earth radii): exaggerated for clarity, labelled NOT TO SCALE

let E, M, RD, CL, PK, EA, ST, SP, TRAJ;
export async function setup(canvas, Wd = 1080, Hd = 1920, opts = {}) {
  canvas.width = Wd; canvas.height = Hd;
  E = new Engine(canvas, Wd, Hd, opts); window.__E = E;
  const img = new Image(); img.src = './earth.png'; await img.decode(); E.setEarthTexture(img);
  M = W.meshes(E);
  RD = W.buildRoad(E, M); CL = W.buildClouds(E, M); PK = W.buildPeaks(E, M); EA = W.buildEarth(E, M); ST = W.buildStation(E, M); SP = W.buildSpace(E, M);
  TRAJ = [0.45, 0.66, 0.82, 0.93, 1.0].map(k => W.trajectory(k, RO));
  return { info: E.info, traj: TRAJ.map(p => p.length) };
}

function project(vp, p) {
  const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12], y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13], w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
  if (w <= 0) return null; return [(x / w * 0.5 + 0.5) * 1080, (1 - (y / w * 0.5 + 0.5)) * 1920];
}
function shake(t, amp) { return [Math.sin(t * 37) * amp + Math.sin(t * 61 + 1) * amp * 0.5, Math.sin(t * 43 + 2) * amp * 0.6, Math.sin(t * 29 + 4) * amp * 0.5]; }

// ---------------- the car's position along the road per shot ----------------
const carS = (nm, u) => {
  switch (nm) {
    case 'H_hook': return lerp(-270, -160, u);
    case 'A_point': return lerp(8, 100, u);
    case 'A_floor': return lerp(200, 262, u);
    case 'C_280': return lerp(-950, -900, u);
    case 'D_end': return lerp(-330, -270, u);
    default: return 0;
  }
};
const pose = (s) => { const r = W.roadAt(s); return { p: r.p, q: W.frameQ(r.f, r.u), f: r.f, u: r.u }; };
// the hook camera rides with the car; the last frame of D_end lands exactly on the first frame of H_hook
const HOOK_OFF0 = [-1.4, 2.7, 10.5], HOOK_OFF1 = [-1.1, 2.2, 8.4];
const hookCam = (s, u) => { const p = W.roadAt(s).p; return { pos: add(p, mixv(HOOK_OFF0, HOOK_OFF1, eo(u))), tgt: [0.6, lerp(22, 32, ez(u)), p[2] - 230] }; };
export const HOOK0 = hookCam(-270, 0);

// ---------------- cameras ----------------
const PEAK_DIR = norm([-W.PEAK_C[0], 0, -RR - W.PEAK_C[2]]); // from the peak toward the ribbon
export function camera(shot, t) {
  const u = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1), e = ez(u), o = eo(u);
  const punch = 8 * Math.exp(-(t - shot.t0) / 0.12); // fov kick at every cut
  const C2 = (pos, tgt, fov, near, far, up) => ({ pos, tgt, fov: fov + punch, near, far, up });
  const nm = shot.name;
  switch (nm) {
    case 'H_hook': { const mid = t > shot.t0 + HB * 1.5 ? 3 * Math.exp(-(t - shot.t0 - HB * 1.5) / 0.1) : 0; const c = hookCam(carS(nm, u), u);
      return C2(c.pos, c.tgt, 62 + mid - punch, 1.0, 40000); }
    case 'A_point': { const p = W.roadAt(carS(nm, u)).p;
      return C2([lerp(36, 30, e), lerp(10, 27, e), lerp(-16, -36, e)], [0, p[1] * 0.85 + 6, p[2] * 0.92], 56, 0.5, 40000); }
    case 'A_floor': { const p = W.roadAt(carS(nm, u)).p; // vertigo: above the climbing car, looking down the road to the ground
      return C2(add(p, [lerp(4.0, 3.2, e), lerp(16, 13, e), lerp(6.5, 5.5, e)]), add(p, [0.2, -30, -1.2]), 64, 0.3, 40000); }
    case 'A_clouds': { const y = lerp(1625, 1680, u);
      return C2([lerp(-26, -22, e), y + lerp(7, 10, e), -RR + 6], [30, y - 10, -RR + 1.5], 58, 1, 80000); }
    case 'A_everest': { const y = lerp(8800, 8880, u);
      return C2([lerp(-32, -28, e), y + lerp(5, 3, e), -RR + 5.5], [30, y - 3, -RR + 3.0], 54, 1, 200000); }
    case 'B_dark': { const y = lerp(-6, 6, u);
      return C2([lerp(-17, -14, e), y + 3.2, 3.6], [14, y - 3.5, 0.9], 56, 0.3, 4e6); }
    case 'B_line': { const y = (t - EV.line) * 26; const mid = t > shot.t0 + HB * 1.5 ? 4 * Math.exp(-(t - shot.t0 - HB * 1.5) / 0.1) : 0; const up = Math.max(0, y);
      return C2([lerp(-11, -9, e), 10 + up, lerp(9, 8, e)], [1.5, Math.max(lerp(-9, -5, e), y - 2.5), 0.6], 60 + mid, 0.3, 6e6); }
    case 'B_iss': return C2(mixv([100, 16, 160], [82, 12, 128], o), mixv([8, -4, 8], [10, -3, 10], e), 50, 0.5, 3e7);
    case 'C_tease': { const a = lerp(0.85, 1.15, e), r = lerp(24, 20, e); const c = CAR_I(t); const mid = t > shot.t0 + HB * 1.5 ? 3 * Math.exp(-(t - shot.t0 - HB * 1.5) / 0.1) : 0;
      return C2(add(c, [Math.sin(a) * r, lerp(4.5, 3.0, e), Math.cos(a) * r]), add(c, [-1.5, -0.4, -2.5]), 52 + mid, 0.3, 3e7); }
    case 'C_side': return C2(V3.add([lerp(9.5, 8.0, e), lerp(3.4, 2.8, e), lerp(8.5, 7.0, e)], shake(t, 0.06)), [-5, 0.2, 0], 58, 0.3, 3e7);
    case 'C_280': { const p = W.roadAt(carS(nm, u)).p; return C2(add(p, [lerp(17, 15, e), 2.0, lerp(5, 2, e)]), add(p, [0, 1.0, -1.2]), 50, 1.0, 40000); }
    case 'B_moon': { const k = sm(0.0, 0.62, u); const d = Math.exp(lerp(Math.log(4.2 * R_E), Math.log(W.MOON_D * 4.7), ez(k)));
      const ty = lerp(R_E * 0.45, W.MOON_D * 0.125, ez(k));
      return C2([d * 0.55, ty + d * 0.08, d * 0.84], [0, ty, 0], 42, d * 0.01, d * 4 + W.MOON_D * 2); }
    case 'C_reveal': case 'C_fall': case 'C_miss': case 'C_orbit': {
      const a = nm === 'C_reveal' ? lerp(-0.1, 0.0, e) : nm === 'C_fall' ? lerp(0.0, 0.08, e) : nm === 'C_miss' ? lerp(0.08, 0.16, e) : lerp(0.16, 0.26, e);
      const d = (nm === 'C_reveal' ? lerp(7.5, 8.04, o) : 8.04) * R_E;
      return C2([Math.sin(a) * d, 0.244 * R_E, Math.cos(a) * d], [0, 0.244 * R_E, 0], 40, 1e5, 1e9); }
    default: { // D_end: a high side view that glides back to the hook's first frame so the video loops
      const s = carS('D_end', u); const h = hookCam(s, 0); const k = ez(sm(0.15, 1, u));
      const p = W.roadAt(s).p; const start = { pos: add(p, [6.5, 2.2, 8.5]), tgt: add(p, [-3, 1.0, -6]) };
      const d0 = norm(V3.sub(start.tgt, start.pos)), d1 = norm(V3.sub(h.tgt, h.pos)); const pos = mixv(start.pos, h.pos, k);
      const tgt = k >= 0.999 ? h.tgt : add(pos, V3.scale(norm(mixv(d0, d1, k)), 60));
      return C2(pos, tgt, 62 - punch * (u > 0.5 ? 1 : 0), 1.0, 40000);
    }
  }
}
// the car floating by the station (set I)
const CAR_I = (t) => { const k = t - T('B_iss'); return [lerp(34, 26, sm(0, 1.7, k)) - Math.max(0, k - 1.7) * 0.6, 3.5 + Math.sin(k * 0.7) * 0.4, lerp(66, 52, sm(0, 1.7, k)) - Math.max(0, k - 1.7) * 1.0]; };

// ---------------- presets ----------------
const SKY0 = { moonDir: [0, 1, 0], moonCol: [1, 1, 1], moonAmt: 0, sunDir: [0, -1, 0], sunCol: [1, 0.9, 0.75], sunAmt: 0, stars: 0, glowCol: [0, 0, 0], glowDir: [0, 0, -1], glowAmt: 0, bgMode: 0, bgPow: 1, sfl: [0, 1, 0, 0], cmb: 0 };
const SUN_R = norm([0.62, 0.5, 0.6]);
const SUN_SPACE = norm([0.8, 0.28, -0.52]);
const SUN_E = norm([0.25, 0.42, 0.87]);
function preset(set) {
  if (set === 'R' || set === 'K') {
    return { sky: { ...SKY0, zen: [0.05, 0.16, 0.46], hor: [0.48, 0.6, 0.76], sunDir: SUN_R, sunCol: [1, 0.95, 0.85], sunAmt: 0.8 },
      light: { dir: SUN_R, col: [2.25, 2.1, 1.9] }, amb: { sky: [0.17, 0.23, 0.33], gnd: [0.08, 0.085, 0.07] },
      fog: set === 'K' ? { col: [0.5, 0.6, 0.75], den: 0.000045, h: 3000 } : { col: [0.55, 0.65, 0.8], den: 0.00009, h: 1200 },
      shadow: null, pls: [], day: 1,
      post: { exposure: 1.0, bloom: 0.28, thr: 1.7, vig: 0.34, grain: 0.022, lift: [0, 0.002, 0.006], gain: [1.01, 1, 1.0], sat: 1.08 } };
  }
  if (set === 'E') {
    return { sky: { ...SKY0, zen: [0.012, 0.045, 0.19], hor: [0.3, 0.42, 0.62], sunDir: SUN_R, sunCol: [1, 0.97, 0.9], sunAmt: 0.9 },
      light: { dir: SUN_E, col: [2.3, 2.22, 2.08] }, amb: { sky: [0.1, 0.15, 0.27], gnd: [0.1, 0.1, 0.11] },
      fog: { col: [0.42, 0.52, 0.7], den: 0.000022, h: 9000 }, shadow: null, pls: [], day: 1,
      post: { exposure: 0.72, bloom: 0.26, thr: 1.8, vig: 0.34, grain: 0.02, lift: [0, 0.002, 0.008], gain: [1, 1, 1.02], sat: 1.06 } };
  }
  if (set === 'S') {
    return { sky: { ...SKY0, zen: [0.0, 0.0, 0.002], hor: [0.006, 0.018, 0.055], stars: 0.5, sunDir: SUN_SPACE, sunCol: [1, 0.97, 0.92], sunAmt: 0.7 },
      light: { dir: SUN_SPACE, col: [2.2, 2.12, 2.0] }, amb: { sky: [0.035, 0.045, 0.07], gnd: [0.03, 0.035, 0.05] },
      fog: { col: [0, 0, 0], den: 0, h: 100 }, shadow: null, pls: [], day: 0,
      post: { exposure: 1.05, bloom: 0.34, thr: 1.5, vig: 0.38, grain: 0.02, lift: [0, 0.002, 0.008], gain: [1, 1, 1.02], sat: 1.1 } };
  }
  if (set === 'I' || set === 'V') {
    return { sky: { ...SKY0, zen: [0.0005, 0.0006, 0.0012], hor: [0.0005, 0.0006, 0.0012], stars: 0.45, bgMode: 2, sunDir: SUN_SPACE, sunCol: [1, 0.96, 0.9], sunAmt: 0.0 },
      light: { dir: SUN_SPACE, col: [2.0, 1.95, 1.85] }, amb: { sky: [0.04, 0.05, 0.075], gnd: [0.05, 0.07, 0.11] },
      fog: { col: [0, 0, 0], den: 0, h: 100 }, shadow: null, pls: [], day: 0,
      post: { exposure: 1.0, bloom: 0.32, thr: 1.4, vig: 0.38, grain: 0.02, lift: [0, 0.002, 0.006], gain: [1, 1, 1.02], sat: 1.1 } };
  }
  // M, G: deep space
  const sd = norm([0.75, 0.25, 0.62]);
  return { sky: { ...SKY0, zen: [0.0005, 0.0006, 0.0012], hor: [0.0005, 0.0006, 0.0012], stars: 0.45, bgMode: 2, sunDir: sd, sunCol: [1, 0.96, 0.9], sunAmt: 0.0 },
    light: { dir: sd, col: [1.85, 1.8, 1.7] }, amb: { sky: [0.03, 0.035, 0.05], gnd: [0.03, 0.035, 0.05] }, fog: { col: [0, 0, 0], den: 0, h: 100 },
    shadow: null, pls: [], day: 0,
    post: { exposure: 1.0, bloom: 0.32, thr: 1.4, vig: 0.38, grain: 0.02, lift: [0, 0.002, 0.006], gain: [1, 1, 1.02], sat: 1.1 } };
}

// ---------------- dynamic pieces ----------------
function carBatches(p, q, opt = {}) { const a = [], w = []; W.car(a, w, p, q, opt); W.fill(E, RD.car, a); W.fill(E, RD.wheels, w); return [RD.car, RD.wheels]; }
function ribbonBatch(y0, y1, zs, yc, win) { const a = []; W.ribbon(a, y0, y1, zs, yc, win); W.fill(E, RD.ribbon, a); return RD.ribbon; }
function impostors(b, list, cam, f = () => ({})) { // camera-facing cumulus impostors (base at c.p)
  const a = [];
  for (const c of list) { const o = f(c); if (o.skip) continue; const k = o.scale ?? 1; const w = c.w * k, h = c.h * k;
    const ctr = [c.p[0], c.p[1] + h / 2, c.p[2]];
    pushInst(a, ctr, [w, h, 0.001], o.tint || [1, 1, 1], 42, billQ(cam, ctr, [0, 1, 0]), 0, 0.9, [o.grow ?? 1, c.seed, o.dark ?? c.dark ?? 0.1, o.bright ?? 1]); }
  W.fill(E, b, a); return b;
}
// Earth with its centre at c; (la, lo) in degrees is turned to point straight up (+y), then spun about y
function earthQ(la, lo, spin = 0) { const L = la * Math.PI / 180, G = lo * Math.PI / 180; const d = [Math.cos(L) * Math.cos(G), Math.sin(L), -Math.cos(L) * Math.sin(G)]; return quatMul(qy(spin), quatFromTo(d, [0, 1, 0])); }
function earthAt(b, atmo, c, q, o = {}) {
  const a = []; pushInst(a, c, [2 * R_E, 2 * R_E, 2 * R_E], [1, 1, 1], 17, q, 0, 0.8, [o.rim ?? 0.45, o.seed ?? 3.3, o.clouds ?? 0.6, 0]); W.fill(E, b, a);
  const h = []; for (const [dr, I, pw] of (o.shells || [[6.5e4, 0.7, 6.0]])) pushInst(h, c, [2 * (R_E + dr), 2 * (R_E + dr), 2 * (R_E + dr)], [0.3, 0.55, 1.0], 38, Q0, 0, 0.5, [I, pw, 0.6, 0]);
  W.fill(E, atmo, h); return [b, atmo];
}
function glow(a, p, s, col, I, cam, mode = 1) { pushInst(a, p, [s, s, 0.001], col, 33, billQ(cam, p), 0, 0.5, [mode, I, 0, 0]); }
function bar(a, A, B, w, col, I) { const d = V3.sub(B, A), L = V3.len(d); if (L < 1e-6) return; const q = quatFromTo([0, 1, 0], V3.scale(d, 1 / L)); pushInst(a, V3.scale(V3.add(A, B), 0.5), [w, L, w], col, 2, q, 0, 0.5, [I, 0, 0, 0]); }

// ---------------- per-frame state ----------------
export function frameState(t) {
  const shot = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const cam = camera(shot, t);
  const camF = { pos: cam.pos, target: cam.tgt, fov: cam.fov, near: cam.near || 1, far: cam.far || 9000, up: cam.up };
  const vp = E.viewProj(camF);
  const labels = []; let batches = [], S; const nm = shot.name, set = shot.set;
  const u = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1);
  let warn = 0;
  S = preset(set);
  S.flashes = []; S.flashCol = [0.62, 0.68, 1.0];
  if (set === 'R') {
    const s = carS(nm, u); const P = pose(s);
    batches = [RD.ground, RD.hills, RD.road, RD.lines, RD.glow, RD.trunks, RD.canopy, RD.piers, ribbonBatch(RR, 150000, -RR + 0.02, cam.pos[1], 700),
      ...carBatches(P.p, P.q, { spin: -s / 0.34 })];
    S.shadow = { center: add(P.p, V3.scale(P.u, 0.8)), radius: 7, bias: 0.04, dist: 40 };
    if (nm === 'C_280') S.post.exposure = 1.02;
  } else if (set === 'K') {
    const y = lerp(1625, 1680, u); const P = { p: [0, y, -RR + 0.02], q: W.frameQ([0, 1, 0], [0, 0, 1]) };
    batches = [RD.ground, RD.hills, impostors(CL.cloud, W.CL_LIST, cam.pos), ribbonBatch(RR, 150000, -RR + 0.02, y, 700), ...carBatches(P.p, P.q, { spin: -t * 80 })];
  } else if (set === 'E') {
    const y = lerp(8800, 8880, u); const P = { p: [0, y, -RR + 0.02], q: W.frameQ([0, 1, 0], [0, 0, 1]) };
    batches = [PK.plateau, PK.peak, PK.peaks, impostors(PK.sea, W.SEA_LIST, cam.pos), ribbonBatch(RR, 150000, -RR + 0.02, y, 700), ...carBatches(P.p, P.q, { spin: -t * 80 })];
    const sp = project(vp, [W.PEAK_C[0], W.EVEREST + 120, W.PEAK_C[2]]);
    if (sp) labels.push({ x: sp[0], y: sp[1] - 50, txt: 'MOUNT EVEREST', a: sm(T('A_everest') + 0.35, T('A_everest') + 0.55, t), small: 1 });
  } else if (set === 'S') {
    const alt = nm === 'B_dark' ? 50e3 : 100e3;
    const y = nm === 'B_dark' ? lerp(-6, 6, u) : (t - EV.line) * 26;
    const P = { p: [0, y, 0.02], q: W.frameQ([0, 1, 0], [0, 0, 1]) };
    const ec = [0, -(R_E + alt), 0];
    batches = [...earthAt(EA.earth, EA.atmo, ec, earthQ(39, -98, 0.6 + t * 0.002), { clouds: 0.38, rim: 0.12, shells: [[alt * 0.25, 1.4, 4.0]] }),
      ribbonBatch(-alt + 1, 400000, 0.02, y, 700), ...carBatches(P.p, P.q, { spin: -t * 80 })];
    if (nm === 'B_line') { // the Kármán line as a glowing grid sheet at 100 km; a flash as the car crosses it
      const g = []; const gI = 2.0 + 2.0 * Math.exp(-Math.max(0, t - EV.line) / 0.3) * (t > EV.line ? 1 : 0);
      for (let i = -20; i < 20; i++) for (let j = -20; j < 20; j++) { const sz = 2250; pushInst(g, [(i + 0.5) * sz, 0, (j + 0.5) * sz], [sz, sz, 0.001], [0.3, 0.85, 1.0], 33, qx(-Math.PI / 2), 0, 0.5, [5, gI, 12, 45000]); }
      W.fill(E, EA.grid, g); batches.push(EA.grid);
      const f = []; const d = t - EV.line; if (d > -0.05 && d < 0.6) glow(f, [0, 0.5, 0], 60, [0.6, 0.9, 1.0], 3.0 * Math.exp(-Math.max(d, 0) / 0.15), cam.pos); W.fill(E, EA.fx, f); batches.push(EA.fx);
      const lp = project(vp, [700, 0, 260]); if (lp) labels.push({ x: lp[0], y: lp[1] + 10, txt: 'THE KÁRMÁN LINE', a: sm(T('B_line') + 0.3, T('B_line') + 0.5, t), small: 1, ymin: 640, ymax: 1060 });
    }
  } else if (set === 'I' || set === 'V') {
    const alt = 400e3; const ec = [0, -(R_E + alt), 0];
    if (set === 'I') {
      batches = [...earthAt(EA.earth, EA.atmo, ec, earthQ(24, -84, 0.35 + (t - T('B_iss')) * 0.004)), ST.solid, ST.bars, ST.panels, ST.rads, ST.mods];
      const c = CAR_I(t); const k = t - T('B_iss'); const q = quatMul(quatAxis(norm([0.3, 1, 0.2]), 0.6 + k * 0.18), W.frameQ([0, 1, 0], [0, 0, 1]));
      batches.push(...carBatches(c, q, { spin: k * 2, lights: 0.6 }));
      if (nm === 'B_iss') { const sp = project(vp, [0, 8, 0]); if (sp) labels.push({ x: sp[0], y: sp[1] - 70, txt: 'SPACE STATION', a: sm(T('B_iss') + 0.3, T('B_iss') + 0.5, t), small: 1 }); }
      if (nm === 'C_tease') warn = 1;
    } else { // V: the chase at orbital speed (time-lapse ground, speed streaks)
      const k = t - T('C_side');
      batches = [...earthAt(EA.earth, EA.atmo, ec, quatMul(quatAxis([0, 0, 1], -k * 0.09), earthQ(20, -60, 0.2)))];
      const q = W.frameQ([-1, 0, 0], [0, 1, 0]); batches.push(...carBatches([0, 0, 0], q, { spin: 0, lights: 1 }));
      const f = []; const Rn = rng(31);
      for (let i = 0; i < 70; i++) { const x0 = Rn() * 400 - 200, y0 = (Rn() - 0.5) * 30, z0 = (Rn() - 0.5) * 60; const sp = 260 + Rn() * 200; const x = ((x0 + k * sp) % 400 + 400) % 400 - 200;
        const p = [x, y0, z0]; const d = V3.len(V3.sub(p, cam.pos)); if (d < 3) continue;
        pushInst(f, p, [0.35, 9 + Rn() * 10, 0.001], [0.7, 0.85, 1.0], 33, billQ(cam.pos, p, [1, 0, 0]), 0, 0.5, [4, 0.5 * clamp(d / 20, 0.2, 1), 0, 0]); }
      W.fill(E, EA.fx, f); batches.push(EA.fx);
    }
  } else if (set === 'M') { // Earth and the Moon, to scale
    const k = t - T('B_moon');
    const a = []; pushInst(a, [0, 0, 0], [2 * R_E, 2 * R_E, 2 * R_E], [1, 1, 1], 17, earthQ(30, -90, 0.3 + k * 0.05), 0, 0.8, [0.45, 3.3, 0.6, 0]); W.fill(E, SP.earth, a);
    const h = []; pushInst(h, [0, 0, 0], [2 * (R_E + 7e4), 2 * (R_E + 7e4), 2 * (R_E + 7e4)], [0.3, 0.55, 1.0], 38, Q0, 0, 0.5, [0.75, 6.0, 0.6, 0]); W.fill(E, SP.atmo, h);
    const m = []; pushInst(m, [0, W.MOON_D, 0], [2 * W.MOON_R, 2 * W.MOON_R, 2 * W.MOON_R], [1, 1, 1], 35, qy(1.2), 0, 0.9, [2, 1, 0, 0]); W.fill(E, SP.moon, m);
    const ln = []; const dist = V3.len(V3.sub(cam.pos, [0, W.MOON_D * 0.4, 0])); const wd = Math.max(dist * 0.0016, 2e4);
    const prog = sm(0.15, 1.1, k);
    for (let i = 0; i < 60; i++) { const y0 = R_E * 1.02 + (W.MOON_D - R_E * 1.02 - W.MOON_R * 1.05) * i / 60, y1 = y0 + (W.MOON_D - R_E * 2) / 60 * 0.55; bar(ln, [0, y0, 0], [0, y1, 0], wd, [1.0, 0.8, 0.3], i / 60 < prog ? 2.2 : 0.35); }
    W.fill(E, SP.lines, ln);
    const gl = []; const cy = R_E * 1.02 + (W.MOON_D - R_E * 2.2) * prog; glow(gl, [0, cy, 0], wd * 14, [1.0, 0.75, 0.3], 2.5, cam.pos);
    const dE = V3.len(cam.pos); glow(gl, [0, 0, 0], Math.max(dE * 0.07, R_E * 3.2), [0.35, 0.6, 1.0], 0.55, cam.pos); glow(gl, [0, W.MOON_D, 0], Math.max(dist * 0.05, W.MOON_R * 3.5), [0.95, 0.93, 0.85], 1.3, cam.pos);
    W.fill(E, SP.glows, gl);
    batches = [SP.earth, SP.atmo, SP.moon, SP.lines, SP.glows];
    const mp = project(vp, [0, W.MOON_D, 0]), ep = project(vp, [0, 0, 0]);
    if (mp) labels.push({ x: mp[0] + 150, y: mp[1], txt: 'THE MOON', a: sm(T('B_moon') + 0.5, T('B_moon') + 0.75, t), small: 1, ymin: 470 });
    if (ep) labels.push({ x: ep[0] + 120, y: ep[1], txt: 'EARTH', a: sm(T('B_moon') + 0.7, T('B_moon') + 0.9, t), small: 1, ymax: 1080 });
  } else { // G: the orbit diagram (not to scale): gravity arrows, Newton's cannonball arcs, the station's lap
    const a = []; const spin = 0.4 + t * 0.03; pushInst(a, [0, 0, 0], [2 * R_E, 2 * R_E, 2 * R_E], [1, 1, 1], 17, earthQ(10, -30, spin), 0, 0.8, [0.45, 3.3, 0.55, 0]); W.fill(E, SP.earth, a);
    const h = []; pushInst(h, [0, 0, 0], [2 * (R_E + 7e4), 2 * (R_E + 7e4), 2 * (R_E + 7e4)], [0.3, 0.55, 1.0], 38, Q0, 0, 0.5, [0.75, 6.0, 0.6, 0]); W.fill(E, SP.atmo, h);
    const ln = [], gl = []; const wd = R_E * 0.02; const P0 = [0, RO * R_E, 0];
    const ringA = nm === 'C_reveal' ? sm(T('C_reveal') + 0.2, T('C_reveal') + 0.9, t) * 0.5 + 0.1 : nm === 'C_orbit' ? 0.9 : 0.25;
    for (let i = 0; i < 96; i += 1) { const a0 = i / 96 * Math.PI * 2, a1 = (i + 0.5) / 96 * Math.PI * 2; bar(ln, [Math.sin(a0) * RO * R_E, Math.cos(a0) * RO * R_E, 0], [Math.sin(a1) * RO * R_E, Math.cos(a1) * RO * R_E, 0], wd * 0.4, [0.4, 0.8, 1.0], ringA); }
    const drawArc = (pts, prog, col, I) => { const n = Math.floor((pts.length - 1) * prog); for (let i = 0; i < n; i += 1) { const A = pts[i], B = pts[Math.min(i + 1, pts.length - 1)]; bar(ln, [A[0] * R_E, A[1] * R_E, 0], [B[0] * R_E, B[1] * R_E, 0], wd, col, I); }
      if (n > 0) { const L = pts[Math.min(n, pts.length - 1)]; return [L[0] * R_E, L[1] * R_E, 0]; } return null; };
    let marker = P0;
    if (nm === 'C_reveal') { // gravity: arrows all pointing at Earth's centre, the big one under the station
      const g = sm(T('C_reveal') + 0.05, T('C_reveal') + 0.6, t);
      for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; const r0 = RO * R_E, r1 = lerp(r0, 1.03 * R_E, g * (i === 0 ? 1 : 0.8));
        const dir = [Math.sin(an), Math.cos(an), 0]; const big = i === 0; const A = V3.scale(dir, r0), B = V3.scale(dir, r1);
        bar(ln, A, B, wd * (big ? 1.6 : 0.9), big ? [1.0, 0.82, 0.3] : [1.0, 0.6, 0.3], big ? 3.5 : 2.0);
        if (g > 0.3) { const side = [dir[1], -dir[0], 0]; const L = R_E * (big ? 0.09 : 0.06); bar(ln, B, V3.add(B, V3.add(V3.scale(dir, L), V3.scale(side, L * 0.7))), wd * (big ? 1.6 : 0.9), big ? [1.0, 0.82, 0.3] : [1.0, 0.6, 0.3], big ? 3.5 : 2.0);
          bar(ln, B, V3.add(B, V3.add(V3.scale(dir, L), V3.scale(side, -L * 0.7))), wd * (big ? 1.6 : 0.9), big ? [1.0, 0.82, 0.3] : [1.0, 0.6, 0.3], big ? 3.5 : 2.0); } }
    } else if (nm === 'C_fall') {
      const k = t - T('C_fall');
      const e1 = drawArc(TRAJ[0], sm(0.05, 0.75, k), [1.0, 0.55, 0.3], 4.0), e2 = drawArc(TRAJ[1], sm(0.75, 1.55, k), [1.0, 0.7, 0.3], 4.0);
      if (k > 0.75 && k < 1.3) glow(gl, [TRAJ[0].at(-1)[0] * R_E, TRAJ[0].at(-1)[1] * R_E, 0], R_E * 0.25, [1.0, 0.6, 0.3], 2.5 * Math.exp(-(k - 0.75) / 0.2), cam.pos);
      if (k > 1.55) glow(gl, [TRAJ[1].at(-1)[0] * R_E, TRAJ[1].at(-1)[1] * R_E, 0], R_E * 0.25, [1.0, 0.6, 0.3], 2.5 * Math.exp(-(k - 1.55) / 0.2), cam.pos);
      marker = k < 0.75 ? (e1 || P0) : (e2 || P0);
    } else if (nm === 'C_miss') {
      const k = t - T('C_miss');
      drawArc(TRAJ[0], 1, [1.0, 0.55, 0.3], 1.2); drawArc(TRAJ[1], 1, [1.0, 0.7, 0.3], 1.2);
      const e3 = drawArc(TRAJ[2], sm(0.0, 0.5, k), [1.0, 0.8, 0.35], 4.0), e4 = drawArc(TRAJ[3], sm(0.45, 0.95, k), [1.0, 0.88, 0.4], 4.0), e5 = drawArc(TRAJ[4], sm(0.9, 1.68, k), [0.5, 0.95, 1.0], 4.5);
      marker = k < 0.45 ? (e3 || P0) : k < 0.9 ? (e4 || P0) : (e5 || P0);
    } else if (nm === 'C_orbit') { // one lap ≈ every 1.3 s of screen time
      const k = t - T('C_orbit'); drawArc(TRAJ[4], 1, [0.5, 0.95, 1.0], 2.0);
      const an = k / 1.3 * Math.PI * 2; marker = [-Math.sin(an) * RO * R_E, Math.cos(an) * RO * R_E, 0];
      for (let j = 1; j < 14; j++) { const aj = an - j * 0.05; glow(gl, [-Math.sin(aj) * RO * R_E, Math.cos(aj) * RO * R_E, 0], R_E * 0.09 * (1 - j / 14), [0.6, 0.95, 1.0], 1.2 * (1 - j / 14), cam.pos); }
    }
    glow(gl, marker, R_E * 0.16, [1.0, 0.95, 0.85], 3.0, cam.pos); glow(gl, marker, R_E * 0.45, [0.6, 0.85, 1.0], 0.5, cam.pos);
    W.fill(E, SP.lines, ln); W.fill(E, SP.glows, gl);
    batches = [SP.earth, SP.atmo, SP.lines, SP.glows];
    const mp = project(vp, marker); if (mp && (nm === 'C_reveal' || nm === 'C_orbit')) labels.push({ x: mp[0], y: mp[1] - 64, txt: nm === 'C_reveal' ? 'SPACE STATION' : '', a: nm === 'C_reveal' ? sm(T('C_reveal') + 0.15, T('C_reveal') + 0.3, t) : 0, small: 1, ymin: 470 });
  }
  // flashes + glitch: a soft pop on cuts, a white pop and glitch on every big reveal
  S.post.glitch = 0; S.post.flash = 0; S.post.fade = 1;
  for (const s of SHOTS) { const d = t - s.t0; if (s.t0 > 0 && d >= 0 && d < 0.12) S.post.flash = Math.max(S.post.flash, 0.07 * (1 - d / 0.12)); }
  for (const at of [EV.kmh[1], EV.everest[1], EV.line, EV.moon[1], EV.reveal, EV.grav[1], EV.speed[1], EV.x280[1]]) { const d = t - at; if (d >= 0 && d < 0.25) { S.post.flash = Math.max(S.post.flash, (at === EV.line || at === EV.reveal ? 0.4 : 0.2) * (1 - d / 0.25)); S.post.glitch = Math.max(S.post.glitch, 0.7 * (1 - d / 0.2)); } }
  { const d = t - T('C_tease'); if (d >= 0 && t < T('C_reveal')) S.post.glitch = Math.max(S.post.glitch, 0.06 + 0.1 * (d > 2.2 ? 1 : 0)); }
  S.therm = 0; S.xray = 0; S.monoHeat = 0; S.crack = 0; S.crackGlow = 0; S.cutX = 1e6; S.fillY = 1e6; S.years = 0;
  S.time = t; S.batches = batches; S.restore = 1; S.carPow = 1; S.skinCut = 0; S.copper = 1;
  window.__frame = { labels, shot: nm, set, warn };
  return { S, cam: camF, shot };
}

export function renderAt(t) {
  const { S, cam, shot } = frameState(t);
  E.render(S, cam);
  hudAt(t, window.__frame);
  E.finish();
  return shot.name;
}
