// scene.js — "What if all the water in the sky fell at once?": shots, cameras, lighting and animation. Original code.
import { Engine, V3, pushInst, quatMul, qrot, quatFromTo } from './engine.js';
import * as W from './world7.js';
import { SHOTS, FPS, DURATION, EV, T, HB } from './timeline.js';
import { hudAt } from './hud.js';
export { SHOTS, FPS, DURATION };

const { clamp, lerp, qx, qy, qz, Q0, rng, billQ } = W;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ez = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const eo = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const ei = (t) => Math.pow(clamp(t, 0, 1), 2.2);
const mixv = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const norm = V3.norm;
const R_E = W.EARTH_R;

let E, M, C, K, G, O, D, Q, ST, RAIN;
export async function setup(canvas, Wd = 1080, Hd = 1920, opts = {}) {
  canvas.width = Wd; canvas.height = Hd;
  E = new Engine(canvas, Wd, Hd, opts); window.__E = E;
  const img = new Image(); img.src = './earth.png'; await img.decode(); E.setEarthTexture(img);
  M = W.meshes(E);
  C = W.buildCity(E, M); K = W.buildCumulus(E, M); G = W.buildGlobe(E, M); O = W.buildOcean(E, M);
  D = W.buildDesert(E, M); Q = W.buildCubes(E, M); ST = W.buildStreet(E, M);
  RAIN = W.dyn(E, M.face, 760, [33], true);
  return { info: E.info };
}

function project(vp, p) {
  const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12], y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13], w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
  if (w <= 0) return null; return [(x / w * 0.5 + 0.5) * 1080, (1 - (y / w * 0.5 + 0.5)) * 1920];
}
function shake(t, amp) { return [Math.sin(t * 37) * amp + Math.sin(t * 61 + 1) * amp * 0.5, Math.sin(t * 43 + 2) * amp * 0.6, Math.sin(t * 29 + 4) * amp * 0.5]; }

// ---------------- cameras ----------------
export const HOOK0 = { pos: [470, 175, 1650], tgt: [-40, 95, -900] };
const HOOK1 = { pos: [330, 128, 1120], tgt: [-60, 105, -1000] };
const SUN_G = norm([0.62, 0.35, 0.7]);
const CUc = [W.CU[0], 1820, W.CU[2]];
const SS = W.SKY_SIDE, LS = W.LAKE_SIDE, LC = W.LAKE_C;
export function camera(shot, t) {
  const u = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1), e = ez(u), o = eo(u);
  const punch = 8 * Math.exp(-(t - shot.t0) / 0.12) + (shot.name === 'H_hook' || shot.name === 'F_end' || shot.name === 'E_tease' ? 0 : 0) ; // fov kick at every cut
  const C2 = (pos, tgt, fov, near, far, up) => ({ pos, tgt, fov: fov + punch, near, far, up });
  switch (shot.name) {
    case 'H_hook': { const mid = 3 * Math.exp(-Math.max(0, t - (shot.t0 + HB * 1.5)) / 0.1) * (t > shot.t0 + HB * 1.5 ? 1 : 0);
      return C2(mixv(HOOK0.pos, HOOK1.pos, o), mixv(HOOK0.tgt, HOOK1.tgt, e), 62 + mid, 1, 30000); }
    case 'A_cloud': { const a = lerp(-0.5, -0.2, e), r = lerp(2750, 2450, o);
      return C2([CUc[0] + Math.sin(a) * r, lerp(950, 1050, e), CUc[2] + Math.cos(a) * r], [CUc[0], 1420, CUc[2]], 60, 2, 60000); }
    case 'A_clear': { const p = [CUc[0] + 950 + 120 * e, 1950, CUc[2] + 1350 - 200 * e];
      const look = mixv(norm([-0.45, 0.02, -0.89]), norm([0.75, 0.16, -0.64]), ez(sm(0.05, 0.9, u)));
      return C2(p, V3.add(p, V3.scale(look, 1000)), 56, 1, 60000); }
    case 'B_globe': { const a = lerp(0.42, 0.55, e); const d = lerp(3.1, 2.75, o) * R_E;
      return C2([Math.sin(a) * d, 0.34 * d, Math.cos(a) * d], [0, 0, 0], 40, 1e4, 1e9); }
    case 'B_count': { const a = lerp(0.55, 0.72, e); const d = lerp(2.75, 1.9, ei(u) * 0.7 + u * 0.3) * R_E;
      return C2(V3.add([Math.sin(a) * d, 0.3 * d, Math.cos(a) * d], shake(t, 0.004 * R_E * u)), [0, 0, 0], 40, 1e4, 1e9); }
    case 'C_drop': { const a = lerp(0.72, 0.8, e); const d = lerp(3.9, 3.5, o) * R_E; const sh = 0.02 * R_E * Math.exp(-(t - shot.t0) / 0.35);
      return C2(V3.add([Math.sin(a) * d, 0.3 * d, Math.cos(a) * d], shake(t, sh)), [0, 0, 0], 40, 1e4, 1e9); }
    case 'C_city': { const z = lerp(150, 95, e);
      return C2(V3.add([3.5, 1.8, z], shake(t, 0.02)), [-2, 18, -600], 64, 1.0, 30000); }
    case 'C_ocean': { const z = lerp(0, -70, e);
      return C2(V3.add([0, 3.2 + Math.sin(t * 2.1) * 0.5, z], shake(t, 0.05)), [40, 55, z - 1200], 62, 0.5, 1e6); }
    case 'C_desert': { const x = lerp(-60, 30, e);
      return C2(V3.add([x, 62, 240], shake(t, 0.05)), [x * 0.5 + 40, 30, -1600], 60, 0.5, 1e6); }
    case 'D_total': { const d = lerp(1, 0.95, o);
      return C2([-70000 * d, 8000, 72000 * d], [0, 9300, 0], 46, 50, 9e5); }
    case 'D_cube': { const k = o;
      return C2(mixv([-50000, 3200, 56000], [-74000, 2200, 80000], k), [0, lerp(10500, 12500, e), 0], 46, 50, 9e5); }
    case 'D_lake': { const a = lerp(-0.42, -0.12, e); const r = lerp(128000, 136000, o); const cx = LC[0] / 2;
      return C2([cx + Math.sin(a) * r, 5200, Math.cos(a) * r], [cx, 9500, 0], 46, 50, 9e5); }
    case 'E_tease': { const mid = t > shot.t0 + HB * 1.5 ? 4 * Math.exp(-(t - shot.t0 - HB * 1.5) / 0.1) : 0;
      return C2(mixv([10.0, 0.2, 1.15], [10.38, 0.085, 0.5], ez(u)), mixv([10.86, 0.09, -0.05], [10.86, 0.04, -0.01], e), 46 + mid, 0.04, 4000); }
    case 'E_reveal': return C2(mixv([10.5, 0.036, 0.16], [10.56, 0.032, 0.11], o), [10.86, 0.025, 0.0], 40, 0.03, 4000);
    case 'E_inch': return C2(mixv([10.66, 0.085, 1.02], [10.64, 0.07, 0.86], e), mixv([10.5, 0.7, -25], [10.45, 0.55, -25], e), 50, 0.03, 4000);
    case 'F_why': { const z = lerp(0, -40, e);
      return C2([0, 9, z], [0, 260, z - 1500], 64, 0.5, 1e6); }
    case 'F_refill': { const d = lerp(5.4, 5.0, e) * R_E; const a = 0.35;
      return C2([Math.sin(a) * d, 0.28 * d, Math.cos(a) * d], [0, 0, 0], 40, 1e4, 1e9); }
    default: { // F_end: glide back to the hook's first frame so the video loops
      const k = ez(sm(0, 1, u)); return C2(mixv([250, 120, 900], HOOK0.pos, k), mixv([-80, 110, -1050], HOOK0.tgt, k), 62, 1, 30000);
    }
  }
}

// ---------------- presets ----------------
const SKY0 = { moonDir: [0, 1, 0], moonCol: [1, 1, 1], moonAmt: 0, sunDir: [0, -1, 0], sunCol: [1, 0.9, 0.75], sunAmt: 0, stars: 0, glowCol: [0, 0, 0], glowDir: [0, 0, -1], glowAmt: 0, bgMode: 0, bgPow: 1, sfl: [0, 1, 0, 0], cmb: 0 };
const STORM_LIGHT = norm([0.3, 0.9, 0.25]);
function preset(kind) {
  if (kind === 'C' || kind === 'R' || kind === 'S') {
    const R = kind !== 'C';
    return { sky: { ...SKY0, zen: R ? [0.022, 0.025, 0.032] : [0.03, 0.034, 0.044], hor: R ? [0.07, 0.077, 0.088] : [0.095, 0.103, 0.118], glowCol: [0.08, 0.07, 0.06], glowDir: norm([0.3, 0, -1]), glowAmt: 0.3 },
      light: { dir: STORM_LIGHT, col: R ? [0.36, 0.38, 0.44] : [0.42, 0.45, 0.52] }, amb: { sky: R ? [0.075, 0.082, 0.098] : [0.09, 0.098, 0.115], gnd: [0.035, 0.037, 0.042] },
      fog: kind === 'S' ? { col: [0.06, 0.066, 0.076], den: 0.012, h: 60 } : R ? { col: [0.062, 0.068, 0.078], den: 0.0016, h: 300 } : { col: [0.08, 0.087, 0.1], den: 0.00026, h: 700 },
      shadow: null, pls: [], day: 0.45,
      post: { exposure: R ? 1.4 : 1.3, bloom: 0.42, thr: 1.15, vig: 0.42, grain: 0.03, lift: [0.004, 0.006, 0.01], gain: [0.98, 1.0, 1.04], sat: 1.02 } };
  }
  if (kind === 'K' || kind === 'Q') { const sd = kind === 'K' ? norm([0.5, 0.62, 0.6]) : norm([-0.55, 0.55, 0.62]);
    return { sky: { ...SKY0, zen: [0.045, 0.13, 0.38], hor: [0.42, 0.53, 0.68], sunDir: sd, sunCol: [1, 0.95, 0.85], sunAmt: 0.9 },
      light: { dir: sd, col: [2.1, 2.02, 1.86] }, amb: { sky: [0.16, 0.21, 0.3], gnd: [0.08, 0.085, 0.08] },
      fog: kind === 'K' ? { col: [0.42, 0.52, 0.66], den: 0.000055, h: 2500 } : { col: [0.52, 0.62, 0.76], den: 0.0000062, h: 9000 },
      shadow: null, pls: [], day: 1,
      post: { exposure: 1.0, bloom: 0.3, thr: 1.6, vig: 0.36, grain: 0.022, lift: [0, 0.002, 0.006], gain: [1, 1, 1.02], sat: 1.06 } };
  }
  if (kind === 'G') {
    return { sky: { ...SKY0, zen: [0.0005, 0.0006, 0.0012], hor: [0.0005, 0.0006, 0.0012], stars: 0.45, bgMode: 2, sunDir: SUN_G, sunCol: [1, 0.96, 0.9], sunAmt: 0.0 },
      light: { dir: SUN_G, col: [1.85, 1.8, 1.7] }, amb: { sky: [0.025, 0.03, 0.045], gnd: [0.025, 0.03, 0.045] }, fog: { col: [0, 0, 0], den: 0, h: 100 },
      shadow: null, pls: [], day: 0,
      post: { exposure: 1.0, bloom: 0.32, thr: 1.4, vig: 0.38, grain: 0.02, lift: [0, 0.002, 0.006], gain: [1, 1, 1.02], sat: 1.1 } };
  }
  if (kind === 'O') {
    return { sky: { ...SKY0, zen: [0.05, 0.055, 0.065], hor: [0.1, 0.107, 0.12], glowCol: [0, 0, 0], glowDir: [0, 0, -1], glowAmt: 0 },
      light: { dir: norm([0.2, 0.9, -0.35]), col: [0.36, 0.38, 0.44] }, amb: { sky: [0.07, 0.076, 0.09], gnd: [0.025, 0.03, 0.035] },
      fog: { col: [0.1, 0.107, 0.12], den: 0.00042, h: 500 }, shadow: null, pls: [], day: 0,
      water: { level: 0, deep: [0.012, 0.026, 0.032], glint: 0.35, distort: 0.045, scale: 3.0, rain: 1.0, rscale: 0.45, size: 30 },
      post: { exposure: 1.45, bloom: 0.42, thr: 1.15, vig: 0.42, grain: 0.03, lift: [0.004, 0.006, 0.01], gain: [0.98, 1, 1.04], sat: 1.0 } };
  }
  // D: desert under the storm
  return { sky: { ...SKY0, zen: [0.06, 0.052, 0.05], hor: [0.17, 0.14, 0.115], glowCol: [0, 0, 0], glowDir: [0, 0, -1], glowAmt: 0 },
    light: { dir: norm([-0.62, 0.32, -0.5]), col: [1.05, 0.86, 0.62] }, amb: { sky: [0.09, 0.085, 0.08], gnd: [0.05, 0.04, 0.03] },
    fog: { col: [0.17, 0.14, 0.115], den: 0.00032, h: 800 }, shadow: null, pls: [], day: 0,
    post: { exposure: 1.3, bloom: 0.38, thr: 1.2, vig: 0.42, grain: 0.03, lift: [0.004, 0.004, 0.006], gain: [1.02, 1, 0.98], sat: 1.0 } };
}

// ---------------- dynamic pieces ----------------
function rainFx(cam, t, o) { // falling streaks in a box around the camera (additive, depth-tested)
  const a = []; const R = rng(o.seed || 77); const box = o.box, fall = norm([o.wind[0], -o.speed, o.wind[1]]);
  for (let k = 0; k < o.n; k++) {
    const ox = R() * box, oy = R() * box, oz = R() * box, sp = 0.85 + R() * 0.3;
    const y = cam[1] + box * 0.5 - ((oy + t * o.speed * sp) % box);
    if (o.floor !== undefined && y < o.floor) continue;
    const x = cam[0] - box / 2 + (((ox + t * o.wind[0] * sp) % box) + box) % box;
    const z = cam[2] - box / 2 + (((oz + t * o.wind[1] * sp) % box) + box) % box;
    const p = [x, y, z]; const d = V3.len(V3.sub(p, cam)); if (d < box * 0.04) continue;
    pushInst(a, p, [o.wid, o.len * sp, 0.001], o.col, 33, billQ(cam, p, fall), k, 0.5, [4, o.I * clamp(d / (box * 0.12), 0.25, 1) * (0.6 + 0.4 * R()), 0, 0]);
  }
  W.fill(E, RAIN, a); return RAIN;
}
function motes(cam, t, I) { // stylized water vapor: tiny soft glints drifting in clear air
  const a = []; const R = rng(12); const box = 260;
  for (let k = 0; k < 400; k++) {
    const x = cam[0] - box / 2 + (((R() * box + t * 4) % box) + box) % box, y = cam[1] - box / 2 + (((R() * box + Math.sin(t + k) * 2) % box) + box) % box, z = cam[2] - box / 2 + (((R() * box - t * 3) % box) + box) % box;
    const p = [x, y, z]; const d = V3.len(V3.sub(p, cam)); if (d < 6) continue; const s = (0.8 + R() * 1.4) * (1 + d / 120);
    const tw = 0.6 + 0.4 * Math.sin(t * 5 + k * 1.7);
    pushInst(a, p, [s, s, 0.001], [0.8, 0.92, 1.0], 33, billQ(cam, p), 0, 0.5, [1, I * tw * clamp(d / 30, 0.3, 1) * 3.0, 0, 0]);
  }
  W.fill(E, K.motes, a); return K.motes;
}
function globe(t, o) { // o: {spin, clouds, seed, dissolve, rim}
  const a = []; pushInst(a, [0, 0, 0], [2 * R_E, 2 * R_E, 2 * R_E], [1, 1, 1], 17, qy(o.spin), 0, 0.8, [o.rim ?? 0.5, o.seed ?? 3.3, o.clouds ?? 0.8, o.dissolve ?? 0]); W.fill(E, G.earth, a);
  const h = []; pushInst(h, [0, 0, 0], [2 * (R_E + 7e4), 2 * (R_E + 7e4), 2 * (R_E + 7e4)], [0.3, 0.55, 1.0], 38, Q0, 0, 0.5, [0.75, 6.0, 0.6, 0]);
  if (o.veil) pushInst(h, [0, 0, 0], [2 * (R_E + 2e4), 2 * (R_E + 2e4), 2 * (R_E + 2e4)], [0.55, 0.75, 1.0], 38, Q0, 0, 0.5, [o.veil, 1.6, 0.0, 0]);
  W.fill(E, G.atmo, h); return [G.earth, G.atmo];
}
function cubes(t, fill, lakeOn) {
  const a = []; const g = 1.0;
  pushInst(a, [W.SKY_C[0], SS / 2, W.SKY_C[2]], [SS, SS, SS], [1, 1, 1], 39, Q0, 1, 0.3, [fill, 0, g, 0]);
  if (fill < 0.999 && fill > 0.002) pushInst(a, [W.SKY_C[0], fill * SS + 6, W.SKY_C[2]], [SS * 0.9995, 12, SS * 0.9995], [1, 1, 1], 39, Q0, 2, 0.3, [1, 1, g, 0]);
  W.fill(E, Q.cube, a);
  const b = []; if (lakeOn > 0) pushInst(b, [LC[0], LS / 2 * lakeOn, LC[2]], [LS, LS * lakeOn, LS], [1, 1, 1], 39, Q0, 3, 0.3, [1, 0, 0.85, 0]);
  W.fill(E, Q.lake, b);
  return [Q.cube, Q.lake];
}
function impostors(b, list, cam, f = () => ({})) { // camera-facing cumulus impostors (base at c.p)
  const a = [];
  for (const c of list) { const o = f(c); if (o.skip) continue; const k = o.scale ?? 1; const w = c.w * k, h = c.h * k;
    const ctr = [c.p[0], c.p[1] + h / 2, c.p[2]];
    pushInst(a, ctr, [w, h, 0.001], o.tint || [1, 1, 1], 42, billQ(cam, ctr, [0, 1, 0]), 0, 0.9, [o.grow ?? 1, c.seed, o.dark ?? c.dark ?? 0.1, o.bright ?? 1]); }
  W.fill(E, b, a); return b;
}
function tlClouds(cam, u) { // F_why time-lapse: clouds bubble up, darken and rain out, again and again
  return impostors(O.tl, W.TL_CLOUDS, cam, c => { const ph = (u * 1.6 + c.ph) % 1; const g = Math.pow(Math.sin(Math.PI * ph), 0.7); if (g < 0.06) return { skip: true };
    return { grow: 0.35 + 0.65 * g, scale: 0.55 + 0.45 * g, dark: lerp(0.05, 0.9, sm(0.45, 0.85, ph)), bright: lerp(1.05, 0.55, sm(0.5, 0.9, ph)) }; });
}
const lightning = (p, t, at, I = 1) => { const d = t - at; if (d < 0 || d > 0.35) return 0; return I * (d < 0.06 ? 1 : d < 0.12 ? 0.35 : d < 0.18 ? 0.8 : Math.exp(-(d - 0.18) / 0.05)); };

// ---------------- per-frame state ----------------
export function frameState(t) {
  const shot = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const cam = camera(shot, t);
  const camF = { pos: cam.pos, target: cam.tgt, fov: cam.fov, near: cam.near || 1, far: cam.far || 9000, up: cam.up };
  const vp = E.viewProj(camF);
  const labels = []; let batches = [], S; let rain = 0, meas = null, fillY = 1e6; const nm = shot.name, set = shot.set;
  const u = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1);
  S = preset(set === 'R' || set === 'S' ? set : set);
  S.flashes = []; S.flashCol = [0.62, 0.68, 1.0];
  if (set === 'C' || set === 'R') {
    E.cullBatch(C.buildings, camF);
    batches = [C.ground, C.buildings, C.deck, C.shafts];
    S.road = W.ROAD; S.roadOrg = [0, 0];
    if (set === 'C') { // lightning inside the deck on frame 1 and on the hook's mid-beat
      const f1 = lightning(null, t, 0.0, 1.2), f2 = lightning(null, t, T('H_hook', HB * 1.5), 0.9), f3 = nm === 'F_end' ? lightning(null, t, T('F_end', 0.5), 0.6) : 0;
      if (f1 > 0) S.flashes.push({ p: [-300, 760, -1400], i: f1 * 1.7, r: 1300 });
      if (f2 > 0) S.flashes.push({ p: [500, 780, -2300], i: f2 * 3.0, r: 1500 });
      if (f3 > 0) S.flashes.push({ p: [-900, 760, -1800], i: f3 * 2.5, r: 1400 });
      const fl = Math.max(f1 * 0.6, f2, f3); S.sky.sfl = [0.1, 0.4, -1, fl * 0.5];
    } else { // C_city: the downpour at street level; the wet avenue mirrors the buildings
      rain = 1.0; S.water = { level: 0.04, deep: [0.012, 0.014, 0.017], glint: 0.3, distort: 0.025, scale: 9, rain: 1.0, rscale: 5, alpha: 0.6 };
      batches.push(rainFx(cam.pos, t, { n: 720, box: 26, len: 0.75, wid: 0.018, speed: 11, wind: [1.2, 0.8], col: [0.62, 0.67, 0.78], I: 0.55 }));
      const f = lightning(null, t, T('C_city', 0.55), 1.0); if (f > 0) { S.flashes.push({ p: [-200, 700, -1400], i: f * 2.5, r: 1600 }); S.sky.sfl = [0, 0.5, -1, f * 0.45]; }
    }
  } else if (set === 'K') {
    batches = [Q.ground, Q.hills, impostors(K.cloud, W.CU_LIST, cam.pos)];
    if (nm === 'A_clear') batches.push(motes(cam.pos, t, sm(T('A_clear') + 0.25, T('A_clear') + 0.8, t)));
  } else if (set === 'G') {
    let o = { spin: 0.2 + 0.01 * t, clouds: 0.85, seed: 3.3, dissolve: 0 };
    if (nm === 'C_drop') { const k = sm(T('C_drop') + 0.05, T('C_drop') + 0.8, t); o.dissolve = k * 1.35; o.veil = 1.2 * Math.exp(-Math.max(0, t - T('C_drop')) / 0.35);
      const p = project(vp, [0, 0, 0]); if (p) labels.push({ x: p[0], y: 760, txt: 'EVERY CLOUD · ALL THE VAPOR', a: sm(T('C_drop') + 0.3, T('C_drop') + 0.45, t), small: 1 }); }
    if (nm === 'F_refill') { const k = t - T('F_refill'); o.spin = 0.2 + k * 2.4; o.seed = 3.3 + k * 1.8; o.clouds = 0.62 + 0.25 * Math.sin(k * 26.0); }
    if (nm === 'B_count') { o.clouds = 0.85 + 0.1 * u; }
    batches = globe(t, o);
  } else if (set === 'O') {
    batches = [O.deck];
    S.water.center = [cam.pos[0], cam.pos[2]];
    if (nm === 'C_ocean') { rain = 1.0; batches.push(rainFx(cam.pos, t, { n: 700, box: 34, len: 1.0, wid: 0.025, speed: 12, wind: [2.5, 1.0], col: [0.6, 0.65, 0.75], I: 0.5, floor: 0 }));
      S.water.rain = 2.0;
      const f = Math.max(lightning(null, t, T('C_ocean', 0.25), 1.0), lightning(null, t, T('C_ocean', 1.25), 0.7)); if (f > 0) { S.flashes.push({ p: [600, 650, -2400], i: f * 2.8, r: 1800 }); S.sky.sfl = [0.2, 0.4, -1, f * 0.5]; } }
    if (nm === 'F_why') { // time-lapse: brighter, broken sky; clouds build and rain out
      batches = [tlClouds(cam.pos, u)]; S.sky.zen = [0.05, 0.08, 0.15]; S.sky.hor = [0.2, 0.23, 0.28]; S.light.col = [1.1, 1.05, 0.98]; S.light.dir = norm([0.4, 0.5, -0.7]);
      S.sky.sunDir = S.light.dir; S.sky.sunAmt = 0.6; S.amb.sky = [0.12, 0.14, 0.18]; S.fog = { col: [0.16, 0.18, 0.22], den: 0.00018, h: 900 };
      S.water.rain = 0.15; S.water.glint = 0.8; S.water.deep = [0.01, 0.03, 0.045]; S.post.exposure = 1.15; }
  } else if (set === 'D') {
    rain = 0.9; batches = [D.ground, D.dunes, D.deck, rainFx(cam.pos, t, { n: 640, box: 34, len: 0.95, wid: 0.024, speed: 12, wind: [3.0, 1.5], col: [0.66, 0.62, 0.6], I: 0.45, floor: -20 })];
    const f = lightning(null, t, T('C_desert', 0.4), 1.0); if (f > 0) { S.flashes.push({ p: [-500, 1000, -3200], i: f * 2.6, r: 1700 }); S.sky.sfl = [-0.1, 0.4, -1, f * 0.5]; }
  } else if (set === 'Q') {
    const fill = nm === 'D_total' ? sm(EV.km3[0], EV.km3[1], t) : 1;
    const lakeOn = nm === 'D_lake' ? eo(sm(T('D_lake') + 0.05, T('D_lake') + 0.6, t)) : 0;
    batches = [Q.ground, Q.hills, impostors(Q.clouds, W.Q_CLOUDS, cam.pos), Q.town, ...cubes(t, fill, lakeOn)];
    if (nm === 'D_cube') { const a = project(vp, [-SS / 2, 0, SS / 2]), b = project(vp, [-SS / 2, SS, SS / 2]);
      if (a && b) meas = { x: a[0] - 36, y0: b[1], y1: a[1], txt: '23 KM', a: sm(T('D_cube') + 0.2, T('D_cube') + 0.45, t) };
      const cp = project(vp, W.CLOUD_MARK); if (cp) labels.push({ x: cp[0], y: cp[1] - 60, txt: 'CLOUDS', a: sm(T('D_cube') + 0.6, T('D_cube') + 0.8, t), small: 1, ymax: 1080 }); }
    if (nm === 'D_lake') { const p1 = project(vp, [0, SS + 2500, 0]), p2 = project(vp, [LC[0], LS * lakeOn + 2500, LC[2]]);
      if (p1) labels.push({ x: p1[0], y: p1[1] - 40, txt: 'THE SKY\n12,900 KM³', a: sm(T('D_lake') + 0.1, T('D_lake') + 0.3, t), small: 1, xmax: 860 });
      if (p2) labels.push({ x: p2[0], y: p2[1] - 40, txt: 'LAKE SUPERIOR\n12,100 KM³', a: sm(T('D_lake') + 0.55, T('D_lake') + 0.75, t), small: 1, xmax: 860 }); }
  } else { // S: the curb, the ruler and the flood
    E.cullBatch(C.buildings, camF);
    batches = [C.buildings, C.groundLow, ST.street, ST.props]; S.road = W.ROAD; S.roadOrg = [0, 0];
    let lev;
    if (nm === 'E_tease') lev = 0.0175 * sm(T('E_tease') + 0.2, T('E_reveal'), t);
    else if (nm === 'E_reveal') lev = 0.0175 + 0.0075 * eo(sm(T('E_reveal'), T('E_reveal') + 0.25, t));
    else lev = 0.025;
    S.water = { level: Math.max(lev, 0.0006), deep: [0.012, 0.015, 0.018], glint: 0.5, distort: 0.012, scale: 34, rain: 1.0, rscale: 16, alpha: 0.42, size: 1, center: [10, 0] };
    fillY = lev > 0.0025 ? lev : 1e6;
    S.pls = [{ p: [8.6, 4.6, -4.5], c: [1.0, 0.82, 0.6], i: 1.3, r: 14 }];
    rain = nm === 'E_tease' ? 0.7 : 0.45;
    batches.push(rainFx(cam.pos, t, { n: 420, box: nm === 'E_tease' ? 3.2 : 1.6, len: nm === 'E_tease' ? 0.16 : 0.09, wid: 0.0035, speed: 7.5, wind: [0.3, 0.2], col: [0.65, 0.7, 0.8], I: 0.5, floor: lev }));
    // ruler numbers (cm) and the water line label
    if (nm !== 'E_tease') {
      for (const cm of [1, 2, 3, 4]) { const p = project(vp, [W.RULER[0] - 0.003, cm / 100, W.RULER[2] - 0.006]); if (p) labels.push({ x: p[0] + (nm === 'E_reveal' ? -46 : -30), y: p[1], txt: String(cm), a: 1, tiny: 1, ymin: 200, ymax: 1900 }); }
      const pw = project(vp, [W.RULER[0], lev, W.RULER[2] + 0.02]);
      if (pw) { const flip = pw[0] + 230 > 900; labels.push({ x: flip ? pw[0] - 190 : pw[0] + 230, y: pw[1] - 4, txt: flip ? '2.5 CM →' : '← 2.5 CM', a: nm === 'E_inch' ? 1 : sm(T('E_reveal') + 0.25, T('E_reveal') + 0.4, t), small: 0, ymin: 200, ymax: 1900, xmax: 900 }); }
    }
    S.post.exposure = 1.5;
  }
  // flashes + glitch: white pop on every big reveal, a soft pop on cuts
  S.post.glitch = 0; S.post.flash = 0; S.post.fade = 1;
  for (const s of SHOTS) { const d = t - s.t0; if (s.t0 > 0 && d >= 0 && d < 0.12) S.post.flash = Math.max(S.post.flash, 0.07 * (1 - d / 0.12)); }
  for (const at of [EV.kg[1], EV.km3[1], EV.reveal, EV.drop, T('B_count'), T('B_count', HB), T('B_count', 2 * HB), EV.refills[1]]) { const d = t - at; if (d >= 0 && d < 0.25) { S.post.flash = Math.max(S.post.flash, (at === EV.drop || at === EV.reveal ? 0.42 : 0.22) * (1 - d / 0.25)); S.post.glitch = Math.max(S.post.glitch, 0.7 * (1 - d / 0.2)); } }
  { const d = t - T('E_tease'); if (d >= 0 && t < T('E_reveal')) S.post.glitch = Math.max(S.post.glitch, 0.08 + 0.1 * (d > 2.2 ? 1 : 0)); }
  S.therm = 0; S.xray = 0; S.monoHeat = 0; S.crack = 0; S.crackGlow = 0; S.cutX = 1e6; S.fillY = fillY; S.years = 0;
  S.time = t; S.batches = batches; S.restore = 1; S.carPow = 1; S.skinCut = 0; S.copper = 1;
  window.__frame = { labels, shot: nm, set, rain, meas };
  return { S, cam: camF, shot };
}

export function renderAt(t) {
  const { S, cam, shot } = frameState(t);
  E.render(S, cam);
  hudAt(t, window.__frame);
  E.finish();
  return shot.name;
}
