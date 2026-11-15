// scene.js — "What if you melted the Eiffel Tower?": shots, cameras, lighting and the melt. Original code.
import { Engine, V3, pushInst, quatMul, qrot, quatFromTo, quatAxis } from './engine.js';
import * as W from './world9.js';
import { SHOTS, FPS, DURATION, EV, T, HB, meltFront } from './timeline.js';
import { hudAt } from './hud.js';
export { SHOTS, FPS, DURATION };

const { clamp, lerp, qx, qy, Q0, rng, billQ } = W;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ez = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const eo = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const mixv = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const norm = V3.norm;

let E, M, PA, TW, TB, GB, DB, IB, CB, LB, WB, RB, DROPS, FR_H2;
export async function setup(canvas, Wd = 1080, Hd = 1920, opts = {}) {
  canvas.width = Wd; canvas.height = Hd;
  E = new Engine(canvas, Wd, Hd, opts); window.__E = E;
  M = W.meshes(E);
  PA = W.buildParis(E, M);
  TW = W.prepTower(W.towerModel());
  TB = W.dyn(E, M.box, TW.nb + TW.boxes.length + 16, [45]);
  GB = W.dyn(E, M.box, TW.nb + TW.boxes.length * 4 + 16, [2], true);
  DB = W.dyn(E, M.sphLo, 4200, [2], true);
  IB = W.dyn(E, M.sphMd, 24, [45]);
  CB = W.dyn(E, M.box, 8, [45]);
  LB = W.dyn(E, M.box, 96, [2], true);
  WB = W.dyn(E, M.face, 260, [33], true);
  RB = W.dyn(E, M.box, 8, [40]);
  DROPS = W.makeDrops(1700, EV.melt0 - 0.05, EV.melt1, meltFront);
  FR_H2 = W.meltedFrac(TW, W.H2);
  return { info: E.info, bars: TW.nb, boxes: TW.boxes.length, cube: W.CUBE, sheet: W.SHEET };
}

function project(vp, p) {
  const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12], y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13], w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
  if (w <= 0) return null; return [(x / w * 0.5 + 0.5) * 1080, (1 - (y / w * 0.5 + 0.5)) * 1920];
}
function shake(t, amp) { return [Math.sin(t * 37) * amp + Math.sin(t * 61 + 1) * amp * 0.5, Math.sin(t * 43 + 2) * amp * 0.6, Math.sin(t * 29 + 4) * amp * 0.5]; }

// ---------------- cameras ----------------
// the hook camera; the last frame of F_end lands exactly on the first frame of H_hook
const hookCam = (u) => ({ pos: [lerp(46, 36, eo(u)), lerp(5, 17, eo(u)), lerp(455, 395, eo(u))], tgt: [0, lerp(180, 186, ez(u)), 0] });
export const HOOK0 = hookCam(0);
const midPunch = (shot, t, amt = 3) => t > shot.t0 + HB * 1.5 ? amt * Math.exp(-(t - shot.t0 - HB * 1.5) / 0.1) : 0;
export function camera(shot, t) {
  const u = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1), e = ez(u), o = eo(u);
  const punch = 8 * Math.exp(-(t - shot.t0) / 0.12);
  const C2 = (pos, tgt, fov, near, far, up) => ({ pos, tgt, fov: fov + punch, near, far, up });
  switch (shot.name) {
    case 'H_hook': { const c = hookCam(u); return C2(c.pos, c.tgt, 58 + midPunch(shot, t) - punch, 2.0, 30000); }
    case 'A_tall': { const a = lerp(0.0, 0.55, e); return C2([0.4, 1.7, 0.6], [0.4, 300, 0.62], lerp(84, 76, o), 0.5, 30000, [Math.sin(a), 0, -Math.cos(a)]); }
    case 'A_iron': return C2([lerp(250, 226, e), lerp(118, 138, e), lerp(250, 226, e)], [0, lerp(140, 150, e), 0], 54, 2.0, 30000);
    case 'A_rivets': return C2([lerp(72.5, 70.2, e), lerp(15.5, 18.5, e), lerp(66, 63.5, e)], [lerp(55, 54, e), lerp(19, 21.5, e), lerp(50.5, 50, e)], 46, 0.3, 30000);
    case 'B_heat': return C2([lerp(168, 150, e), lerp(214, 228, e), lerp(150, 136, e)], [0, lerp(222, 230, e), 0], 50, 2.0, 30000);
    case 'B_top': { const F = meltFront(t); return C2([lerp(-150, -138, e), lerp(270, 250, e), lerp(168, 150, e)], [0, Math.max(150, F - 40), 0], 52, 2.0, 30000); }
    case 'B_mid': return C2(add([lerp(185, 168, e), lerp(105, 92, e), lerp(205, 188, e)], shake(t, 0.25)), [0, lerp(130, 95, e), 0], 56, 2.0, 30000);
    case 'B_legs': return C2(add([lerp(40, 32, e), lerp(26, 19, e), lerp(222, 196, e)], shake(t, 0.35)), [0, lerp(38, 16, e), 0], 54, 1.0, 30000);
    case 'C_cube': return C2([lerp(66, 52, e), lerp(14, 9, e), lerp(84, 66, e)], [0, lerp(4, 5, e), 0], 50, 0.5, 30000);
    case 'C_size': return C2([lerp(19.5, 17.5, e), lerp(1.7, 2.0, e), lerp(26, 23, e)], [0, lerp(2.6, 2.4, e), 0], 56, 0.3, 30000);
    case 'C_foot': return C2([lerp(104, 98, e), lerp(46, 40, e), lerp(112, 104, e)], [lerp(34, 40, e), lerp(4, 6, e), lerp(32, 38, e)], 52, 1.0, 30000);
    case 'D_spread': return C2([lerp(150, 138, e), lerp(118, 104, e), lerp(196, 180, e)], [0, 0, lerp(6, 0, e)], 50, 1.0, 30000);
    case 'D_tease': { // the dive: from above the sheet down to its edge at ankle height
      const k = ez(sm(0.0, 0.92, u)); const lg = (a, b) => Math.exp(lerp(Math.log(a), Math.log(b), k));
      const h = lg(46, 0.11), d = lg(92, 0.62); const pos = [3.0 + lg(30, 0.32), h, 62.5 + d];
      const tgt = [3.0, lerp(0, 0.045, k), lerp(20, 62.48, k)];
      return C2(pos, tgt, 56 + midPunch(shot, t), Math.max(0.006, h * 0.06), 30000);
    }
    case 'D_reveal': return C2([lerp(3.33, 3.3, e), lerp(0.105, 0.098, e), lerp(63.15, 63.05, e)], [3.0, lerp(0.05, 0.052, e), 62.48], 50, 0.006, 30000);
    case 'D_wide': return C2([lerp(-280, -258, e), lerp(70, 92, e), lerp(330, 306, e)], [0, lerp(125, 140, e), 0], 54, 2.0, 30000);
    case 'E_why': return C2([lerp(-200, -182, e), lerp(170, 180, e), lerp(150, 136, e)], [0, lerp(160, 170, e), 0], 48, 2.0, 30000);
    case 'E_holes': return C2([lerp(-62, -54, e), lerp(150, 156, e), lerp(30, 24, e)], [0, lerp(158, 162, e), 0], 50, 1.0, 30000);
    default: { // F_end: an aerial over the rebuilding tower that glides back to the hook's first frame so the video loops
      const k = ez(sm(0.1, 1, u)); const start = { pos: [200, 150, 330], tgt: [0, 120, 0] };
      const h = hookCam(0); const pos = mixv(start.pos, h.pos, k); const tgt = mixv(start.tgt, h.tgt, k);
      return C2(pos, tgt, lerp(52, 58, k) - punch * (u > 0.5 ? 1 : 0), 2.0, 30000);
    }
  }
}

// ---------------- presets ----------------
const SKY0 = { moonDir: [0, 1, 0], moonCol: [1, 1, 1], moonAmt: 0, sunDir: [0, -1, 0], sunCol: [1, 0.9, 0.75], sunAmt: 0, stars: 0, glowCol: [0, 0, 0], glowDir: [0, 0, -1], glowAmt: 0, bgMode: 0, bgPow: 1, sfl: [0, 1, 0, 0], cmb: 0 };
const SUN = norm([-0.62, 0.36, 0.7]);
function preset(set) {
  if (set === 'X') { // diagram: x-ray city under a navy sky, the tower as glowing lines
    return { sky: { ...SKY0, zen: [0.002, 0.006, 0.022], hor: [0.008, 0.024, 0.06], stars: 0.15 },
      light: { dir: SUN, col: [0.5, 0.55, 0.7] }, amb: { sky: [0.05, 0.07, 0.12], gnd: [0.03, 0.035, 0.05] },
      fog: { col: [0.008, 0.02, 0.05], den: 0.0005, h: 600 }, shadow: null, pls: [], day: 0, xray: 0.92,
      post: { exposure: 1.05, bloom: 0.5, thr: 1.0, vig: 0.4, grain: 0.02, lift: [0, 0.002, 0.008], gain: [1, 1, 1.03], sat: 1.05 } };
  }
  return { sky: { ...SKY0, zen: [0.06, 0.17, 0.46], hor: [0.6, 0.7, 0.84], sunDir: SUN, sunCol: [1, 0.85, 0.6], sunAmt: 0.6, glowCol: [1.0, 0.62, 0.32], glowDir: norm([SUN[0], 0, SUN[2]]), glowAmt: 0.3 },
    light: { dir: SUN, col: [2.6, 2.2, 1.7] }, amb: { sky: [0.2, 0.25, 0.36], gnd: [0.1, 0.09, 0.07] },
    fog: { col: [0.6, 0.67, 0.78], den: 0.00022, h: 400 }, shadow: null, pls: [], day: 1, xray: 0,
    post: { exposure: 1.0, bloom: 0.3, thr: 1.6, vig: 0.34, grain: 0.02, lift: [0.004, 0.002, 0.0], gain: [1.03, 1, 0.96], sat: 1.08 } };
}
const SETS = { D_wide: 'X', E_why: 'X', E_holes: 'X' };

// ---------------- the molten iron ----------------
const POOL = (() => { const R = rng(77); const L = [{ p: [0, 0], r: 44, w: 'S' }];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.push({ p: [sx * 47, sz * 47], r: 30, w: 'L' });
  for (let i = 0; i < 10; i++) { const a = R() * Math.PI * 2, d = 25 + R() * 45; L.push({ p: [Math.cos(a) * d, Math.sin(a) * d], r: 10 + R() * 14, w: R() < 0.5 ? 'S' : 'L' }); }
  return L; })();
function poolAt(a, F, shrink = 0, heat = 1.0, crust = 0.0) {
  const mf = W.meltedFrac(TW, F); const mS = clamp(mf / FR_H2, 0, 1), mL = clamp((mf - FR_H2) / (1 - FR_H2), 0, 1);
  let i = 0; for (const b of POOL) { const m = b.w === 'S' ? Math.min(1, mS * 0.7 + mL * 0.5) : mL; const r = b.r * Math.sqrt(m) * (1 - shrink); i++; if (r < 0.3) continue;
    pushInst(a, [b.p[0] * (1 - shrink * 0.6), 0.02, b.p[1] * (1 - shrink * 0.6)], [2 * r, 0.7 + 0.5 * m, 2 * r], [1, 1, 1], 45, Q0, i * 0.37, 0.4, [heat, 1, crust, 0]); }
  return mf;
}
function slab(a, c, w, h, heat, crust, mode = 1) { pushInst(a, [c[0], h / 2, c[1]], [w, h, w], [1, 1, 1], 45, Q0, 0.5, 0.4, [heat, mode, crust, 0]); }
function square(a, c, s, col, I, wd = 0.5, y = 0.15) { const h = s / 2;
  pushInst(a, [c[0], y, c[1] - h], [s + wd, wd * 0.4, wd], col, 2, Q0, 0, 0.5, [I, 0, 0, 0]); pushInst(a, [c[0], y, c[1] + h], [s + wd, wd * 0.4, wd], col, 2, Q0, 0, 0.5, [I, 0, 0, 0]);
  pushInst(a, [c[0] - h, y, c[1]], [wd, wd * 0.4, s], col, 2, Q0, 0, 0.5, [I, 0, 0, 0]); pushInst(a, [c[0] + h, y, c[1]], [wd, wd * 0.4, s], col, 2, Q0, 0, 0.5, [I, 0, 0, 0]); }
const GOLD = [1.0, 0.78, 0.3];

// ---------------- per-frame state ----------------
export function frameState(t) {
  const shot = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const cam = camera(shot, t);
  const camF = { pos: cam.pos, target: cam.tgt, fov: cam.fov, near: cam.near || 1, far: cam.far || 9000, up: cam.up };
  const vp = E.viewProj(camF);
  const labels = []; const nm = shot.name; const set = SETS[nm] || 'P'; const u = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1);
  const S = preset(set);
  const batches = [...PA.list];
  for (const b of [PA.bld, PA.roofs, PA.crowns, PA.trunks]) E.cullBatch(b, camF, false);
  const tw = [], gh = [], dr = [], ib = [], cb = [], lb = [], wb = [], rb = [];
  let F = 400, warm = 0, rebuild = false, sheetOn = false, padsOn = true;
  // ---- the tower ----
  if (nm === 'B_heat') warm = sm(T('B_heat', 0.05), T('B_heat', 1.2), t) * 0.34;
  if (['B_top', 'B_mid', 'B_legs'].includes(nm)) { F = meltFront(t); warm = 0.3; }
  if (['C_cube', 'C_size', 'C_foot', 'D_spread', 'D_tease', 'D_reveal', 'D_wide', 'E_why', 'E_holes'].includes(nm)) F = -5;
  if (nm === 'F_end') { rebuild = true; F = lerp(-3, 345, sm(EV.rebuild0, EV.rebuild1, t)); if (t >= EV.rebuild1 + 0.45) { rebuild = false; F = 400; } }
  const tips = [];
  if (F > -2) W.emitTower(tw, TW, F, warm, { rebuild, tips, zone: rebuild ? 26 : 30 });
  // ---- drops, pendant drips, splashes, pool ----
  let mf = 0;
  if (['B_top', 'B_mid', 'B_legs', 'C_cube'].includes(nm)) {
    W.emitDrops(dr, DROPS, t, cam.pos, nm === 'C_cube' ? 0.6 : 1); W.emitSplashes(dr, DROPS, t);
    for (const [x, y, z, th] of tips) { const L = 1.2 + 2.2 * ((x * 13.1 + z * 7.7) % 1 + 1) % 1; pushInst(dr, [x, y - L * 0.45, z], [th * 0.5, L, th * 0.5], [1.0, 0.6, 0.2], 2, Q0, 0, 0.5, [2.2, 0, 0, 0]); }
  }
  if (['B_mid', 'B_legs'].includes(nm)) mf = poolAt(ib, F, 0, 0.78, 0.3);
  if (nm === 'C_cube') { // the pool gathers into one glowing block that rises into a cube
    const g = sm(EV.gather0, EV.gather1, t); poolAt(ib, -3, ez(g), 0.78, 0.3);
    const h = lerp(0.5, W.CUBE, Math.pow(ez(g), 0.85)); const w = Math.min(46, Math.sqrt(W.IRON_V / h)); if (g > 0.02) slab(cb, [0, 0], w, h, 0.84, lerp(0.3, 0.2, g));
  }
  if (nm === 'C_size') { slab(cb, [0, 0], W.CUBE, W.CUBE, lerp(0.8, 0.68, u), lerp(0.35, 0.6, u)); W.person(rb, [7.2, 0, 7.6], 0.5); }
  if (nm === 'C_foot') { const s = ez(sm(EV.slide0, EV.slide1, t)); slab(cb, [50 * s, 50 * s], W.CUBE, W.CUBE, 0.66, 0.65);
    W.emitGhost(gh, TW, 0.36 * sm(T('C_foot', 0.05), T('C_foot', 0.4), t), [0.3, 0.75, 1.0], 26);
    square(lb, [50, 50], 25, GOLD, 3.0 * sm(T('C_foot', 0.1), T('C_foot', 0.3), t), 1.3);
    for (const [x, z] of [[-50, 50], [50, -50], [-50, -50]]) square(lb, [x, z], 25, GOLD, 1.2 * sm(T('C_foot', 0.1), T('C_foot', 0.3), t), 0.9);
    const lp = project(vp, [50, 0, 64]); if (lp) labels.push({ x: lp[0], y: lp[1] + 40, txt: 'ONE PILLAR · 25 M', a: sm(T('C_foot', 0.3), T('C_foot', 0.5), t), small: 1, ymin: 420, ymax: 1060 }); }
  if (nm === 'D_spread') { const s = ez(sm(EV.spread0, EV.spread1, t)); const c = [50 * (1 - s), 50 * (1 - s)];
    const h = Math.exp(lerp(Math.log(W.CUBE), Math.log(W.SHEET), s)); const w = Math.sqrt(W.IRON_V / h);
    slab(cb, c, w, h, lerp(0.85, 0.7, s), lerp(0.3, 0.15, s)); if (s > 0.6) padsOn = false;
    square(lb, [0, 0], 125, GOLD, 2.0 * sm(T('D_spread', 0.05), T('D_spread', 0.3), t), 0.9, 0.3);
    const lp = project(vp, [0, 0, 64]); if (lp) labels.push({ x: lp[0], y: lp[1] + 36, txt: '125 M', a: sm(T('D_spread', 0.25), T('D_spread', 0.45), t), ymin: 420, ymax: 1060 }); }
  if (['D_tease', 'D_reveal', 'D_wide', 'E_why', 'E_holes'].includes(nm)) { sheetOn = true; padsOn = false;
    const cool = nm === 'D_tease' ? lerp(0.42, 0.0, sm(0, 0.7, u)) : 0.0; slab(cb, [0, 0], 125, W.SHEET, cool, 0.6, 2); }
  if (nm === 'F_end') { const k = sm(EV.rebuild0, EV.rebuild1 - 0.3, t); if (k < 0.999) { sheetOn = true; padsOn = false; const w = 125 * Math.sqrt(1 - k * 0.6); slab(cb, [0, 0], w, W.SHEET * (1 - k) + 0.002, 0.0, 0.6, 2); } }
  // ---- the ruler and a close-up floor at the sheet's edge ----
  if (nm === 'D_tease' || nm === 'D_reveal') {
    pushInst(rb, [3.0, 0.15, 62.5 + 0.0025 + 0.002], [0.035, 0.30, 0.004], [1, 1, 1], 40, Q0, 0, 0.5, [0, 0, 0, 0]);
    if (cam.pos[1] < 6) pushInst(rb, [3.0, -0.01, 66.0], [10, 0.02, 7], [0.42, 0.38, 0.32], 40, Q0, 0, 0.9, [0, 0, 0, 2]);
  }
  // ---- the ghost tower (diagram shots) and the wind ----
  if (set === 'X') {
    W.emitGhost(gh, TW, nm === 'D_wide' ? 1.4 * sm(T('D_wide', 0.15), T('D_wide', 0.6), t) : 1.3, [0.3, 0.75, 1.0]);
    if (nm !== 'D_wide') { const R = rng(9); const k = t - T('E_why');
      for (let i = 0; i < 120; i++) { const y0 = 20 + R() * 290, z0 = (R() - 0.5) * 140; const sp = 160 + R() * 120; const x = ((R() * 600 + k * sp) % 600) - 300;
        const p = [x, y0 + Math.sin(k * 2 + i) * 2, z0]; const d = V3.len(V3.sub(p, cam.pos)); if (d < 4) continue;
        pushInst(wb, p, [Math.max(0.5, d * 0.004), 18 + R() * 26, 0.001], [0.75, 0.92, 1.0], 33, billQ(cam.pos, p, [1, 0, 0]), 0, 0.5, [4, 0.65 * clamp(d / 30, 0.25, 1) * sm(T('E_why'), T('E_why', 0.3), t), 0, 0]); }
    }
    // the sheet's outline so it reads in the dark
    square(lb, [0, 0], 125, [1.0, 0.55, 0.25], 1.6, 0.8, 0.2);
  }
  // ---- lights: the glow of hot iron lights up the ground and the tower ----
  const ORANGE = [1.0, 0.48, 0.16];
  if (['B_top', 'B_mid', 'B_legs'].includes(nm)) { const fy = Math.max(4, F);
    const wf = fy > W.H2 ? W.Wsh(Math.min(fy, W.H3)) : W.xo(fy);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; S.pls.push({ p: [Math.cos(a) * wf * 1.6, fy, Math.sin(a) * wf * 1.6], r: 140, c: ORANGE, i: 2.6 }); }
    if (mf > 0.02) S.pls.push({ p: [0, 8, 0], r: 60 + 160 * mf, c: ORANGE, i: 1.5 + 2.5 * mf }, { p: [60, 6, 60], r: 80 + 80 * mf, c: ORANGE, i: 1.5 * mf });
  }
  if (nm === 'B_heat') S.pls.push({ p: [0, 260, 0], r: 160, c: ORANGE, i: 1.6 * warm });
  if (['C_cube', 'C_size', 'C_foot'].includes(nm)) { const c = nm === 'C_foot' ? [50 * ez(sm(EV.slide0, EV.slide1, t)), 50 * ez(sm(EV.slide0, EV.slide1, t))] : [0, 0];
    S.pls.push({ p: [c[0] + 9, 6, c[1] + 9], r: 60, c: ORANGE, i: 1.6 }, { p: [c[0] - 9, 6, c[1] - 9], r: 60, c: ORANGE, i: 1.0 }); }
  if (nm === 'D_spread') S.pls.push({ p: [0, 14, 0], r: 160, c: ORANGE, i: 1.6 }, { p: [60, 8, 60], r: 90, c: ORANGE, i: 1.0 });
  if (nm === 'D_tease') S.pls.push({ p: [3, 3, 58], r: 30, c: ORANGE, i: 1.2 * (1 - sm(0, 0.8, u)) });
  if (rebuild && F > 0 && F < 340) { const fy = F; const wf = fy > W.H2 ? W.Wsh(Math.min(fy, W.H3)) : W.xo(fy);
    for (let i = 0; i < 3; i++) { const a = i * 2.1; S.pls.push({ p: [Math.cos(a) * wf * 1.5, fy, Math.sin(a) * wf * 1.5], r: 110, c: ORANGE, i: 2.2 }); } }
  // ---- shadows ----
  if (set === 'P') {
    if (nm === 'A_rivets') S.shadow = { center: [55, 20, 52], radius: 30, bias: 0.04, dist: 160 };
    else if (F > 0) S.shadow = { center: [0, 140, 0], radius: 185, bias: 0.3, dist: 700 };
    else if (['C_cube', 'C_size', 'C_foot', 'D_spread'].includes(nm)) S.shadow = { center: [25, 5, 25], radius: 60, bias: 0.06, dist: 200 };
  }
  // ---- assemble ----
  if (sheetOn || nm === 'D_spread' && ez(sm(EV.spread0, EV.spread1, t)) > 0.8) batches.splice(batches.indexOf(PA.center), 1);
  if (!padsOn) batches.splice(batches.indexOf(PA.pads), 1);
  const put = (b, arr) => { if (arr.length) { W.fill(E, b, arr); batches.push(b); } };
  put(TB, tw); put(GB, gh); put(DB, dr); put(IB, ib); put(CB, cb); put(LB, lb); put(WB, wb); put(RB, rb);
  S.xray = S.xray || 0;
  // flashes + glitch: a soft pop on cuts, a white pop and glitch on every big reveal
  S.post.glitch = 0; S.post.flash = 0; S.post.fade = 1;
  for (const s of SHOTS) { const d = t - s.t0; if (s.t0 > 0 && d >= 0 && d < 0.12) S.post.flash = Math.max(S.post.flash, 0.07 * (1 - d / 0.12)); }
  for (const at of [EV.tall[1], EV.iron[1], EV.rivets[1], EV.temp[1], EV.cube[1], EV.reveal, EV.deep[1]]) { const d = t - at; if (d >= 0 && d < 0.25) { S.post.flash = Math.max(S.post.flash, (at === EV.reveal ? 0.42 : 0.2) * (1 - d / 0.25)); S.post.glitch = Math.max(S.post.glitch, 0.6 * (1 - d / 0.2)); } }
  { const d = t - EV.tease; if (d >= 0 && t < EV.reveal) S.post.glitch = Math.max(S.post.glitch, 0.05); }
  S.therm = 0; S.monoHeat = 0; S.crack = 0; S.crackGlow = 0; S.cutX = 1e6; S.fillY = -1e6; S.years = 0;
  S.time = t; S.batches = batches; S.restore = 1; S.carPow = 1; S.skinCut = 0; S.copper = 1;
  let meas = null;
  if (nm === 'C_size') { const p0 = project(vp, [W.CUBE / 2, 0, -W.CUBE / 2]), p1 = project(vp, [W.CUBE / 2, W.CUBE, -W.CUBE / 2]);
    if (p0 && p1) meas = { x: Math.min(900, Math.max(p0[0], p1[0]) + 46), y0: p0[1], y1: p1[1], txt: '', a: sm(T('C_size', 0.2), T('C_size', 0.4), t) }; }
  if (nm === 'D_reveal') { const p0 = project(vp, [3.045, 0, 62.51]), p1 = project(vp, [3.045, W.SHEET, 62.51]);
    if (p0 && p1) meas = { x: Math.min(900, Math.max(p0[0], p1[0]) + 40), y0: p0[1], y1: p1[1], txt: '', a: sm(T('D_reveal', 0.05), T('D_reveal', 0.3), t) }; }
  if (window.__dbg) window.__dbg(S, batches, { TB, GB, DB, IB, CB, LB, WB, RB, PA });
  window.__frame = { labels, shot: nm, set, F, meas };
  return { S, cam: camF, shot };
}

export function renderAt(t) {
  const { S, cam, shot } = frameState(t);
  E.render(S, cam);
  hudAt(t, window.__frame);
  E.finish();
  return shot.name;
}
