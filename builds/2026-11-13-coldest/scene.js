// scene.js — "Where's the coldest place in the universe?": shots, cameras, lighting and animation. Original code.
import { Engine, V3, pushInst, pushBar, quatMul, qrot, quatFromTo } from './engine.js';
import * as W from './world6.js';
import { SHOTS, FPS, DURATION, EV, T, RANKS } from './timeline.js';
import { hudAt } from './hud.js';
export { SHOTS, FPS, DURATION };

const { clamp, lerp, qx, qy, qz, Q0, rng, billQ } = W;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ez = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const eo = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const ei = (t) => Math.pow(clamp(t, 0, 1), 2.2);
const mixv = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const norm = V3.norm;
const logLerp = (a, b, t) => a * Math.pow(b / a, t);

let E, M, A, P, ST, EA, ISS, LAB, GAL, NEB;
export async function setup(canvas, Wd = 1080, Hd = 1920, opts = {}) {
  canvas.width = Wd; canvas.height = Hd;
  E = new Engine(canvas, Wd, Hd, opts); window.__E = E;
  const img = new Image(); img.src = './earth.png'; await img.decode(); E.setEarthTexture(img);
  M = W.meshes(E);
  A = W.buildStation(E, M);
  A.snowfx = W.dyn(E, M.face, 500, [33], true);
  P = W.buildPluto(E, M);
  ST = W.buildStars(E, M);
  GAL = W.dyn(E, M.face, 60, [33], true);
  NEB = W.dyn(E, M.face, 1200, [33], true);
  EA = W.buildEarth(E, M);
  ISS = W.buildStation3(E, M);
  LAB = W.buildLab(E, M);
  return { info: E.info };
}

function project(vp, p) {
  const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12], y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13], w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
  if (w <= 0) return null; return [(x / w * 0.5 + 0.5) * 1080, (1 - (y / w * 0.5 + 0.5)) * 1920];
}
function shake(t, amp) { return [Math.sin(t * 37) * amp + Math.sin(t * 61 + 1) * amp * 0.5, Math.sin(t * 43 + 2) * amp * 0.6, Math.sin(t * 29 + 4) * amp * 0.5]; }

// ---------------- constants per set ----------------
const SUN_P = norm([0.72, 0.28, 0.64]);                 // direction to the Sun from Pluto
const SUN_E = norm([0.55, 0.42, 0.72]);                 // direction to the Sun at the station
const HC = norm([0, 0.36, 1]);                          // the heart's centre on Pluto (local)
const NEB_AX = norm([Math.cos(0.95), Math.sin(0.95), 0]); // the nebula's long axis (in its own plane)
// ISS module where the lab sits (label anchor)
const LAB_P = [0, -4.2, 6];

// ---------------- cameras ----------------
const HOOK0 = { pos: [-7, 2.2, 78], tgt: [0, 9, -60] };
function camera(shot, t) {
  const u = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1), e = ez(u), o = eo(u);
  const punch = 8 * Math.exp(-(t - shot.t0) / 0.12); // fov kick at every cut
  const C = (pos, tgt, fov, near, far, up) => ({ pos, tgt, fov: fov + punch, near, far, up });
  switch (shot.name) {
    case 'H_hook': return C(mixv(HOOK0.pos, [-1.5, 3.4, 31], o), mixv(HOOK0.tgt, [0, 13, -60], e), 58, 0.3, 12000);
    case 'A_rank': { const S = W.STATION.screen; const a = lerp(0.9, 0.35, e), r = lerp(8.5, 4.8, o);
      return C([S[0] + Math.sin(a) * r, lerp(1.0, 2.0, e), S[2] + Math.cos(a) * r], [S[0], 1.55, S[2]], 56, 0.1, 12000); }
    case 'A_screen': { const S = W.STATION.screen; return C(mixv([S[0] + 3.6, 1.0, S[2] + 3.4], [S[0] + 2.6, 1.15, S[2] + 2.5], o), [S[0] - 0.1, 1.9, S[2]], 52, 0.05, 12000); }
    case 'A_up': { const k = ei(u); return C([lerp(14, 40, k), lerp(5, 520, k), lerp(34, 60, k)], mixv([0, 6, -15], [0, 1500, -2600], sm(0, 0.8, u)), 60, 0.3, 14000); }
    case 'B_rank': return C(mixv([150, 70, 560], [40, 34, 300], o), [0, 8, 0], 52, 1, 20000);
    case 'B_far': { const side = norm(V3.cross(SUN_P, [0, 1, 0]));
      const pos = V3.add(V3.add(V3.scale(SUN_P, lerp(-330, -290, e)), V3.scale(side, lerp(-128, -112, e))), [0, lerp(25, 15, e), 0]);
      const tgt = V3.add(V3.scale(SUN_P, 60), V3.scale(side, -62)); return C(pos, tgt, 50, 1, 20000); }
    case 'B_ice': { const q = plutoQ(t); const Hw = qrot(q, HC); const Tw = norm(V3.cross([0, 1, 0], Hw)); const Bw = norm(V3.cross(Hw, Tw));
      const s0 = V3.scale(Hw, 100); const along = lerp(-50, -32, e);
      const pos = V3.add(V3.add(s0, V3.scale(Hw, lerp(17, 12, e))), V3.add(V3.scale(Tw, along), V3.scale(Bw, -14)));
      const tgt = V3.add(V3.add(s0, V3.scale(Tw, along + 16)), V3.scale(Bw, 16)); return C(pos, tgt, 56, 0.5, 20000, Hw); }
    case 'C_rank': { const d = logLerp(330, 9000, ei(u) * 0.85 + u * 0.15); return C([d * 0.12, d * 0.08, d], [0, 0, 0], 55, 1, 2e6); }
    case 'C_glow': { const d = logLerp(9000, 60000, u); const pos = [d * 0.12, d * 0.08, d];
      const dir = norm(mixv(norm(V3.scale(pos, -1)), norm([0.9, 0.35, 0.25]), ez(u)));
      return C(pos, V3.add(pos, V3.scale(dir, 1e4)), 58, 5, 2e6, [Math.sin(u * 0.6) * 0.5, 1, 0]); }
    case 'C_one': { const z = lerp(0, -52000, ei(u)); return C([0, 0, z], [0, 0, -120000], 58, 5, 2e6, [Math.sin(u * 0.5), 1, 0]); }
    case 'D_rank': return C(mixv([0, 0, 3200], [120, -60, 1500], o), [0, 0, 0], 50, 2, 1e6, [Math.sin(lerp(0.5, 0, o)), 1, 0]);
    case 'D_far': { const a = lerp(0.1, 0.55, e); return C([Math.sin(a) * 1500, lerp(-60, 40, e), Math.cos(a) * 1500], [0, 0, 0], 52, 2, 1e6); }
    case 'D_wind': return C(mixv([140, 70, 1050], [90, 45, 760], o), [0, 0, 0], 54, 1, 1e6);
    case 'E_tease': { // rush in from deep space to the station
      const k = sm(0, 1, u); const d = logLerp(4.2e7, 140, Math.pow(k, 1.6));
      const dir = norm(mixv([0.15, 0.25, 1], [0.45, 0.18, 1], k));
      const pos = V3.scale(dir, d); const tg = d > 2e6 ? mixv(W.EARTH_C, [0, 0, 0], 0) : [0, 0, 0];
      const tw = sm(0.55, 0.85, k); const tgt = mixv(W.EARTH_C, [0, -2, 0], tw);
      return C(V3.add(pos, shake(t, 0.002 * d)), tgt, 50, d > 1e5 ? Math.max(1, d * 0.01) : 0.5, Math.max(2e7, d * 3), [0, 1, 0]); }
    case 'E_rank': { const a = lerp(0.5, 1.0, e), r = lerp(130, 95, o); return C([Math.sin(a) * r, lerp(30, 18, e), Math.cos(a) * r], LAB_P, 52, 0.5, 2.5e7); }
    case 'E_known': { const r = logLerp(60, 900, ei(u)); const a = 1.15; return C([Math.sin(a) * r, r * 0.32 + 6, Math.cos(a) * r], [0, -r * 0.15, 0], 54, 0.5, 2.5e7); }
    case 'E_orbit': return C(mixv([66, 30, -118], [54, 23, -96], e), mixv([0, -8, 26], [0, -9, 30], e), 56, 0.5, 2.5e7);
    case 'E_laser': return C(mixv([0.62, 0.46, 0.82], [0.3, 0.27, 0.42], o), W.CELL, 48, 0.01, 50);
    case 'E_tenb': { const a = lerp(0.6, 1.25, e); const r = lerp(0.2, 0.15, e); return C([Math.sin(a) * r, 0.2 + 0.02 * e, Math.cos(a) * r], W.CELL, 46, 0.005, 50); }
    case 'E_zero': { const a = lerp(1.95, 2.25, e); const r = lerp(0.19, 0.15, o); return C([Math.sin(a) * r, 0.215, Math.cos(a) * r], W.CELL, 44, 0.004, 50); }
    default: { // F_end: glide back to the hook's first frame so the video loops
      const k = ez(sm(0, 1, u)); return C(mixv([4, 3.6, 40], HOOK0.pos, k), mixv([0, 14, -60], HOOK0.tgt, k), 58, 0.3, 12000);
    }
  }
}
function plutoQ(t) { return qy(0.15 + 0.03 * (t - T('B_rank'))); }

// ---------------- presets ----------------
const SKY0 = { moonDir: norm([0.3, 0.5, -0.8]), moonCol: [1, 0.97, 0.9], moonAmt: 0, sunDir: [0, -1, 0], sunCol: [1, 0.9, 0.75], sunAmt: 0, stars: 0, glowCol: [0, 0, 0], glowDir: [0, 0, -1], glowAmt: 0, bgMode: 0, bgPow: 1, sfl: [0, 1, 0, 0], cmb: 0 };
function preset(kind) {
  if (kind === 'A') { const moon = norm([0.62, 0.3, 0.4]);
    return { sky: { ...SKY0, zen: [0.002, 0.006, 0.016], hor: [0.012, 0.03, 0.05], stars: 1.0, glowCol: [0.02, 0.16, 0.08], glowDir: [0, 0, -1], glowAmt: 0.55, moonDir: moon, moonCol: [0.9, 0.95, 1.0], moonAmt: 0.5 },
      light: { dir: moon, col: [0.28, 0.34, 0.5] }, amb: { sky: [0.03, 0.075, 0.07], gnd: [0.05, 0.06, 0.085] }, fog: { col: [0.012, 0.03, 0.045], den: 0.00035, h: 300 },
      shadow: { center: [0, 2, -6], radius: 48, bias: 0.12, dist: 140 }, pls: W.STATION_LIGHTS,
      post: { exposure: 1.35, bloom: 0.5, thr: 1.1, vig: 0.42, grain: 0.03, lift: [0.004, 0.008, 0.014], gain: [0.98, 1.0, 1.04], sat: 1.15 } }; }
  if (kind === 'P' || kind === 'S') { const sd = kind === 'P' ? SUN_P : SUN_P;
    return { sky: { ...SKY0, zen: [0.0006, 0.0008, 0.0016], hor: [0.0006, 0.0008, 0.0016], stars: 1.1, bgMode: 2, sunDir: sd, sunCol: [1, 0.95, 0.85], sunAmt: 0.55 },
      light: { dir: sd, col: [1.75, 1.66, 1.52] }, amb: { sky: [0.012, 0.014, 0.022], gnd: [0.012, 0.014, 0.022] }, fog: { col: [0, 0, 0], den: 0, h: 100 },
      shadow: null, pls: [], post: { exposure: 1.05, bloom: 0.45, thr: 1.3, vig: 0.4, grain: 0.025, lift: [0, 0.002, 0.006], gain: [1, 1, 1.02], sat: 1.1 } }; }
  if (kind === 'N') {
    return { sky: { ...SKY0, zen: [0.0008, 0.0008, 0.002], hor: [0.0008, 0.0008, 0.002], stars: 1.0, bgMode: 2 },
      light: { dir: norm([0.3, 0.5, 0.8]), col: [0.5, 0.5, 0.55] }, amb: { sky: [0.01, 0.01, 0.015], gnd: [0.01, 0.01, 0.015] }, fog: { col: [0, 0, 0], den: 0, h: 100 },
      shadow: null, pls: [], post: { exposure: 1.1, bloom: 0.62, thr: 0.95, vig: 0.44, grain: 0.025, lift: [0, 0.002, 0.008], gain: [1, 1, 1.03], sat: 1.15 } }; }
  if (kind === 'E') {
    return { sky: { ...SKY0, zen: [0.0005, 0.0006, 0.0012], hor: [0.0005, 0.0006, 0.0012], stars: 0.35, bgMode: 2, sunDir: SUN_E, sunCol: [1, 0.96, 0.9], sunAmt: 1.0 },
      light: { dir: SUN_E, col: [1.9, 1.84, 1.74] }, amb: { sky: [0.03, 0.035, 0.05], gnd: [0.05, 0.085, 0.15] }, fog: { col: [0, 0, 0], den: 0, h: 100 },
      shadow: { center: [0, -2, 0], radius: 70, bias: 0.15, dist: 220 }, pls: [],
      post: { exposure: 0.95, bloom: 0.3, thr: 1.55, vig: 0.38, grain: 0.02, lift: [0, 0.002, 0.006], gain: [1, 1, 1.02], sat: 1.08 } }; }
  // L: inside the lab box
  return { sky: { ...SKY0, zen: [0.004, 0.006, 0.012], hor: [0.01, 0.012, 0.02] },
    light: { dir: norm([0.25, 1.0, 0.35]), col: [0.3, 0.34, 0.42] }, amb: { sky: [0.025, 0.03, 0.045], gnd: [0.015, 0.015, 0.02] }, fog: { col: [0.004, 0.006, 0.012], den: 0.6, h: 2 },
    shadow: { center: [0, 0.1, 0], radius: 0.5, bias: 0.002, dist: 2 }, pls: [],
    post: { exposure: 1.2, bloom: 0.6, thr: 1.0, vig: 0.46, grain: 0.03, lift: [0.002, 0.003, 0.008], gain: [1, 1, 1.04], sat: 1.12 } };
}

// ---------------- dynamic pieces ----------------
function snowFx(cam, t, I = 1) { // blowing snow streaks around the camera
  const a = []; const R = rng(5); const V = [13, 0.4, 2.0];
  for (let k = 0; k < 420; k++) {
    const ox = R() * 60, oy = R() * 3.2, oz = R() * 60, sp = 0.7 + R() * 0.6;
    const x = cam[0] - 30 + ((ox + t * V[0] * sp) % 60 + 60) % 60, y = 0.05 + ((oy + t * V[1]) % 3.2), z = cam[2] - 30 + ((oz + t * V[2] * sp) % 60 + 60) % 60;
    const p = [x, y, z]; const d = V3.len(V3.sub(p, cam)); if (d < 0.6) continue;
    const q = billQ(cam, p, norm([1, 0.03, 0.15]));
    pushInst(a, p, [0.035, 0.32 * sp, 0.001], [0.55, 0.62, 0.75], 33, q, k, 0.5, [4, 0.55 * I * clamp(d / 3, 0.3, 1), 0, 0]);
  }
  W.fill(E, A.snowfx, a); return A.snowfx;
}
function starsFx(cam, scale = 1, center = [0, 0, 0], I = 1) {
  const a = [];
  for (const s of W.STARFIELD) { const p = V3.add(center, V3.scale(s.p, scale)); const d = V3.len(V3.sub(p, cam)); if (d < 20 * scale) continue;
    const sz = s.size * scale * Math.max(1, d / (2500 * scale)) * 0.6;
    pushInst(a, p, [sz, sz, 0.001], s.col, 33, billQ(cam, p), 0, 0.5, [1, s.I * I, 0, 0]); }
  W.fill(E, ST, a); return ST;
}
function galaxies(cam, I = 1) {
  const a = []; const R = rng(31);
  for (let k = 0; k < 46; k++) {
    const u = R() * 2 - 1, th = R() * 6.2832, rr = 3e4 + R() * 1.4e5; const s = Math.sqrt(1 - u * u);
    const p = [Math.cos(th) * s * rr, u * rr * 0.7, Math.sin(th) * s * rr - 4e4]; const sz = 1500 + R() * 5000;
    const col = R() < 0.5 ? [0.85, 0.82, 1.0] : [1.0, 0.85, 0.7];
    pushInst(a, p, [sz, sz * (0.35 + R() * 0.5), 0.001], col, 33, quatMul(billQ(cam, p), qz(R() * 3)), 0, 0.5, [3, (0.5 + R()) * I, R() * 9, 0]);
  }
  W.fill(E, GAL, a); return GAL;
}
function nebula(cam, t, I = 1, wind = 0, center = [0, 0, 0], scale = 1) {
  const a = [];
  const up = norm([-NEB_AX[1], NEB_AX[0], 0]);
  const layers = [[0, 1.0, 0.3, 0], [-70, 1.18, 2.3, 0.12], [90, 0.84, 4.1, -0.1]];
  for (const [dz, s, seed, roll] of layers) {
    const p = V3.add(center, [0, 0, dz * scale]);
    const q = quatMul(billQ(cam, p, up), qz(roll));
    pushInst(a, p, [1150 * s * scale, 1150 * s * scale, 0.001], [1, 1, 1], 33, q, 0, 0.5, [0, (dz === 0 ? 0.72 : 0.3) * I, seed, 0]);
  }
  // the dying central star
  pushInst(a, center, [110 * scale, 110 * scale, 0.001], [1.0, 0.92, 0.8], 33, billQ(cam, center), 0, 0.5, [1, 3.2 * I, 0, 0]);
  // wind: gas streaming out along both lobes
  if (wind > 0.001) { const R = rng(8);
    const qb = billQ(cam, center, up); const ax = qrot(qb, [1, 0, 0]), ay = qrot(qb, [0, 1, 0]), az = qrot(qb, [0, 0, 1]);
    for (let k = 0; k < 520; k++) {
      const side = R() < 0.5 ? -1 : 1; const ph = R(); const sp = 0.6 + R() * 0.8; const L = ((ph + t * 0.32 * sp) % 1);
      const r = 18 + L * 520; const spread = (R() - 0.5) * 1.1 * (0.35 + r / 900); const dep = (R() - 0.5) * 0.5 * r;
      const p = V3.add(center, V3.scale(V3.add(V3.add(V3.scale(ax, side * r), V3.scale(ay, spread * r)), V3.scale(az, dep)), scale));
      const sz = (2 + R() * 3.5) * scale * (0.6 + L);
      pushInst(a, p, [sz, sz * 3.2, 0.001], [0.62, 0.78, 1.0], 33, quatMul(billQ(cam, p, V3.scale(ax, side)), Q0), k, 0.5, [4, 0.3 * wind * (1 - L * 0.7), 0, 0]);
    }
  }
  W.fill(E, NEB, a); return NEB;
}
function plutoBatches(t, haze = 1) {
  const q = plutoQ(t); const a = []; pushInst(a, [0, 0, 0], [200, 200, 200], [1, 1, 1], 35, q, 0, 0.9, [0, 1, 0, 0]); W.fill(E, P.pluto, a);
  const h = []; pushInst(h, [0, 0, 0], [208, 208, 208], [0.32, 0.6, 1.0], 38, Q0, 0, 0.5, [0.9 * haze, 5.0, 6.0, 0]); W.fill(E, P.haze, h);
  return [P.pluto, P.charon, P.haze];
}
function earthBatches(t, spin = 0) {
  // rotate the Earth so that the point below the station is over the Gulf of Mexico, then drift east
  const la = 27 * Math.PI / 180, lo = (-86 + spin) * Math.PI / 180; const d = [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)];
  const q = quatMul(qy(0.35), quatFromTo(d, [0, 1, 0]));
  const a = []; pushInst(a, W.EARTH_C, [2 * W.EARTH_R, 2 * W.EARTH_R, 2 * W.EARTH_R], [1, 1, 1], 17, q, 0, 0.8, [0.45, 3.3, 0.55, 0]); W.fill(E, EA.earth, a);
  const h = []; pushInst(h, W.EARTH_C, [2 * (W.EARTH_R + 6.5e4), 2 * (W.EARTH_R + 6.5e4), 2 * (W.EARTH_R + 6.5e4)], [0.3, 0.55, 1.0], 38, Q0, 0, 0.5, [0.7, 6.0, 0.6, 0]); W.fill(E, EA.atmo, h);
  return [EA.earth, EA.atmo];
}
function labBatches(t, nm) {
  const bs = [LAB.bb, LAB.met, LAB.glass, LAB.coils, LAB.walls, LAB.frame, LAB.cell];
  // lasers fire one axis at a time
  const b = []; const dim = 1 - 0.8 * sm(T('E_zero'), T('E_zero') + 0.35, t); const on = [EV.laser, EV.laser + 0.12, EV.laser + 0.24].map(x => clamp((t - x) / 0.05, 0, 1) * dim);
  W.BEAMS.forEach(([A2, B2], i) => { if (on[i] <= 0) return; const fl = 1 + 0.08 * Math.sin(t * 60 + i);
    pushBar(b, A2, B2, 0.0022, [1.0, 0.12, 0.06], 2, 0, 0.5, [9 * on[i] * fl, 0, 0, 0]); });
  W.fill(E, LAB.beams, b); bs.push(LAB.beams);
  // the atom cloud: hot and wide before the lasers, then shrinking, slowing and turning icy blue
  const cool = nm === 'E_laser' ? sm(EV.laser, EV.laser + 1.6, t) * 0.45 : nm === 'E_tenb' ? 0.45 + 0.5 * sm(T('E_tenb'), T('E_tenb') + 1.5, t) : 0.97 + 0.03 * sm(T('E_zero'), T('E_zero') + 0.5, t);
  const R = rng(17); const a = []; const rad = lerp(0.016, 0.0016, Math.pow(cool, 0.8)); const jit = lerp(1.0, 0.04, cool);
  const col = mixv([1.0, 0.55, 0.25], [0.45, 0.88, 1.0], sm(0.2, 0.8, cool));
  const cam = window.__camPos;
  const n = nm === 'E_laser' && t < EV.laser ? 260 : 520;
  for (let k = 0; k < n; k++) {
    const g = [R() + R() + R() - 1.5, R() + R() + R() - 1.5, R() + R() + R() - 1.5];
    const ph = R() * 6.28, f = 3 + R() * 9;
    const j = [Math.sin(t * f + ph), Math.sin(t * f * 1.3 + ph * 2), Math.sin(t * f * 0.9 + ph * 3)];
    const p = V3.add(W.CELL, V3.scale(V3.add(V3.scale(g, 0.75), V3.scale(j, 0.35 * jit)), rad));
    const sz = lerp(0.0016, 0.0009, cool);
    pushInst(a, p, [sz, sz, 0.00001], col, 33, billQ(cam, p), k, 0.5, [1, lerp(0.5, 1.2, cool), 0, 0]);
  }
  if (cool > 0.85) { const s = 0.016 * (cool - 0.85) / 0.15 + 0.006; pushInst(a, W.CELL, [s, s, 0.00001], [0.5, 0.9, 1.0], 33, billQ(cam, W.CELL), 0, 0.5, [1, 6.0 * sm(0.85, 1.0, cool), 0, 0]); }
  W.fill(E, LAB.atoms, a); bs.push(LAB.atoms);
  return { bs, laserOn: Math.max(...on), cool };
}

// ---------------- per-frame state ----------------
export function frameState(t) {
  const shot = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const cam = camera(shot, t);
  const camF = { pos: cam.pos, target: cam.tgt, fov: cam.fov, near: cam.near || 1, far: cam.far || 9000, up: cam.up };
  window.__camPos = cam.pos;
  const vp = E.viewProj(camF);
  const labels = []; let batches = [], S;
  const nm = shot.name, set = shot.set;
  if (set === 'A') {
    S = preset('A'); batches = [A.snow, A.solid, A.win, A.glow, A.aurora, snowFx(cam.pos, t, nm === 'A_up' ? 1 - sm(6.2, 6.8, t) : 1)];
    if (nm === 'A_rank') { const pp = project(vp, [W.STATION.screen[0], 2.3, W.STATION.screen[2]]); if (pp) labels.push({ x: pp[0], y: pp[1] - 70, txt: 'VOSTOK STATION', a: sm(T('A_rank') + 0.3, T('A_rank') + 0.5, t) * (1 - sm(T('A_screen') - 0.1, T('A_screen'), t)), small: 1 }); }
  } else if (set === 'P') {
    S = preset('P'); batches = plutoBatches(t, 1);
    if (nm === 'B_rank') { const pc = project(vp, W.CHARON); if (pc) labels.push({ x: pc[0], y: pc[1] + 90, txt: 'CHARON', a: sm(T('B_rank') + 0.5, T('B_rank') + 0.7, t), small: 1 }); }
    if (nm === 'B_far') { const ps = project(vp, V3.add(cam.pos, V3.scale(SUN_P, 1e5))); if (ps) labels.push({ x: ps[0], y: ps[1] - 70, txt: 'THE SUN', a: sm(T('B_far') + 0.25, T('B_far') + 0.45, t), small: 1, ymin: 300 }); }
    batches.push(starsFx(cam.pos, 1, [0, 0, 0], 0.7));
  } else if (set === 'S') {
    S = preset('S');
    const k = nm === 'C_rank' ? 0 : nm === 'C_glow' ? sm(T('C_glow'), T('C_glow') + 1.0, t) : 1;
    S.sky.cmb = 0.62 * k; S.sky.stars = lerp(1.1, 0.55, k);
    if (nm === 'C_rank') { batches = plutoBatches(t, 1); batches.push(starsFx(cam.pos, 1, [0, 0, 0], 1)); }
    else { batches = [galaxies(cam.pos, 0.6 + 0.4 * k)]; }
    if (nm === 'C_one') { batches.push(nebula(cam.pos, t, 0.9 * sm(T('C_one'), T('C_one') + 0.5, t), 0, [0, 0, -120000], 30)); S.post.bloom = 0.55; }
  } else if (set === 'N') {
    S = preset('N'); const w = nm === 'D_wind' ? sm(T('D_wind'), T('D_wind') + 0.4, t) : nm === 'D_far' ? 0.35 : 0.2;
    batches = [nebula(cam.pos, t, nm === 'D_wind' ? 0.8 : 1, w), starsFx(cam.pos, 0.6, [0, 0, 0], 0.8)];
  } else if (set === 'E') {
    S = preset('E');
    const spin = nm === 'E_orbit' ? (t - T('E_orbit')) * 6 : nm === 'E_known' ? (t - T('E_known')) * 1.2 : 0;
    batches = [...earthBatches(t, spin), ISS.solid, ISS.bars, ISS.panels, ISS.rads, ISS.mods];
    if (nm === 'E_tease') { const k = sm(T('E_tease'), T('E_rank'), t); S.sky.stars = lerp(1.0, 0.35, k); S.post.exposure = lerp(1.05, 0.95, k); }
    if (nm === 'E_rank') { const pl = project(vp, LAB_P); if (pl) labels.push({ x: pl[0], y: pl[1] + 120, txt: 'COLD ATOM LAB IN HERE', a: sm(T('E_rank') + 0.35, T('E_rank') + 0.5, t), small: 0, ymin: 600 }); }
    if (nm === 'E_known') { const pl = project(vp, [0, 0, 0]); if (pl) labels.push({ x: pl[0], y: pl[1] - 110, txt: 'COLDEST KNOWN SPOT', a: sm(T('E_known') + 0.6, T('E_known') + 0.8, t), small: 0, ymin: 560 }); }
  } else { // L
    S = preset('L'); const L = labBatches(t, nm); batches = L.bs;
    if (nm !== 'E_laser') { const pa = project(vp, W.CELL); if (pa) labels.push({ x: pa[0] + 150, y: pa[1] - 120, txt: nm === 'E_zero' ? 'ATOMS ← NEARLY FROZEN' : 'ATOMS', a: sm(T('E_tenb') + 0.4, T('E_tenb') + 0.6, t), small: 1, ymin: 560 }); }
    S.pls = [{ p: [W.CELL[0], W.CELL[1] + 0.02, W.CELL[2] + 0.04], c: [1.0, 0.15, 0.08], i: 0.7 * L.laserOn, r: 0.22 }, { p: [-0.3, 0.6, 0.4], c: [0.45, 0.65, 1.0], i: 1.2, r: 1.6 },
      { p: [0.4, 0.3, -0.2], c: [0.4, 0.55, 1.0], i: 0.6, r: 1.2 }, { p: [W.CELL[0], W.CELL[1], W.CELL[2] + 0.02], c: [0.5, 0.9, 1.0], i: 0.9 * sm(0.6, 1.0, L.cool), r: 0.25 }];
  }
  S.therm = 0; S.xray = 0; S.monoHeat = 0; S.crack = 0; S.crackGlow = 0; S.cutX = 1e6; S.fillY = 1e6; S.years = 0;
  S.time = t; S.batches = batches; S.restore = 1; S.carPow = 1; S.skinCut = 0; S.copper = 1; S.day = 0; S.water = null;
  S.post.glitch = 0; S.post.flash = S.post.flash || 0; S.post.fade = 1;
  // white pops + glitch on every rank reveal; a softer pop on ordinary cuts
  for (const R of RANKS) { const d = t - R.at; if (d >= 0 && d < 0.25) { S.post.flash = Math.max(S.post.flash, 0.32 * (1 - d / 0.25)); S.post.glitch = Math.max(S.post.glitch, 0.9 * (1 - d / 0.2)); } }
  for (const s of SHOTS) { const d = t - s.t0; if (s.t0 > 0 && d >= 0 && d < 0.12) S.post.flash = Math.max(S.post.flash, 0.08 * (1 - d / 0.12)); }
  { const d = t - T('E_tease'); if (d >= 0 && d < 2.6) S.post.glitch = Math.max(S.post.glitch, (d > 2.2 ? 0.6 : 0.12) * (0.5 + 0.5 * Math.sin(t * 50))); }
  { const d = t - T('E_zero'); if (d >= 0 && d < 0.3) S.post.flash = Math.max(S.post.flash, 0.45 * (1 - d / 0.3)); }
  window.__frame = { labels, shot: nm, set };
  return { S, cam: camF, shot };
}

export function renderAt(t) {
  const { S, cam, shot } = frameState(t);
  E.render(S, cam);
  hudAt(t, window.__frame);
  E.finish();
  return shot.name;
}
