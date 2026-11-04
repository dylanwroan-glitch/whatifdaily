// scene.js — the film: shots, cameras, lighting, timeline. Original code.
import { Engine, V3 } from './engine.js';
import { buildStatue, buildIsland, buildCity, buildCars, updateCars, buildFlecks, updateFlecks, buildTable, buildDust, updateDust, makeCoinTexture, COINS, clamp, lerp, ROAD } from './world.js';
import { hudAt } from './hud.js';

export const FPS = 30, DURATION = 64.0;
export const SHOTS = [
  { name: 'A_harbor', t0: 0.0, t1: 6.5 }, { name: 'B_fly', t0: 6.5, t1: 13.5 }, { name: 'C_street', t0: 13.5, t1: 25.5 },
  { name: 'D_liberty', t0: 25.5, t1: 40.5 }, { name: 'E_pennies', t0: 40.5, t1: 47.5 }, { name: 'F_return', t0: 47.5, t1: 55.0 },
  { name: 'G_timelapse', t0: 55.0, t1: 64.0 }];
export const T = { black: 16.5, skin: 26.3, skinDur: 1.0, coins: 41.2, crumble: 41.2, back: 49.0 };

const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mixv = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const norm = V3.norm;
function cr(a, b, c, d, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); }
function path(keys, t) {
  if (t <= keys[0].t) return keys[0]; const L = keys.length; if (t >= keys[L - 1].t) return keys[L - 1];
  let i = 0; while (t > keys[i + 1].t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(L - 1, i + 2)];
  const u = (t - k1.t) / (k2.t - k1.t);
  const f = (n) => k1[n].map((_, j) => cr(k0[n][j], k1[n][j], k2[n][j], k3[n][j], u));
  return { pos: f('pos'), tgt: f('tgt'), fov: cr(k0.fov, k1.fov, k2.fov, k3.fov, u) };
}
const ez = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ---------- sky / light presets ----------
const MOON_DIR = norm([0.16, 0.38, -0.91]);
const SKY = {
  night: { zen: [0.0035, 0.0055, 0.016], hor: [0.028, 0.034, 0.058], sunDir: [0, -1, 0], sunCol: [1, 0.6, 0.3], sunAmt: 0, moonAmt: 1, ldir: norm([0.42, 0.5, 0.55]), lcol: [0.15, 0.18, 0.27],
    amb: [[0.016, 0.02, 0.036], [0.005, 0.005, 0.007]], exp: 1.55 },
  dawn: { zen: [0.05, 0.085, 0.2], hor: [0.7, 0.38, 0.22], sunDir: norm([0.85, 0.06, -0.52]), sunCol: [1.0, 0.5, 0.22], sunAmt: 0.9, moonAmt: 0.25, ldir: norm([0.85, 0.12, -0.5]), lcol: [1.1, 0.55, 0.28],
    amb: [[0.09, 0.09, 0.13], [0.04, 0.035, 0.03]], exp: 1.0 },
  day: { zen: [0.09, 0.22, 0.58], hor: [0.5, 0.63, 0.8], sunDir: norm([0.35, 0.78, -0.5]), sunCol: [1.0, 0.92, 0.8], sunAmt: 1.0, moonAmt: 0, ldir: norm([0.45, 0.72, 0.35]), lcol: [2.2, 2.05, 1.85],
    amb: [[0.32, 0.4, 0.55], [0.1, 0.09, 0.08]], exp: 0.62 },
  dusk: { zen: [0.06, 0.075, 0.2], hor: [0.8, 0.36, 0.2], sunDir: norm([-0.88, 0.05, -0.47]), sunCol: [1.0, 0.42, 0.18], sunAmt: 0.85, moonAmt: 0.35, ldir: norm([-0.85, 0.15, 0.4]), lcol: [1.0, 0.45, 0.22],
    amb: [[0.08, 0.075, 0.12], [0.035, 0.03, 0.028]], exp: 1.0 },
};
function skyMix(a, b, t) { const o = {}; for (const k of Object.keys(a)) { const va = a[k], vb = b[k];
  o[k] = Array.isArray(va) ? (Array.isArray(va[0]) ? va.map((x, i) => mixv(x, vb[i], t)) : mixv(va, vb, t)) : va + (vb - va) * t; }
  o.sunDir = norm(o.sunDir); o.ldir = norm(o.ldir); return o; }

let E, W;
export async function setup(canvas, Wd = 1080, Hd = 1920, opts = {}) {
  canvas.width = Wd; canvas.height = Hd;
  E = new Engine(canvas, Wd, Hd, opts); window.__E = E;
  E.setCoinTexture(makeCoinTexture());
  const st = buildStatue(E); const isl = buildIsland(E); const city = buildCity(E); const cars = buildCars(E); const fl = buildFlecks(E, st.vox);
  const tab = buildTable(E); const dust = buildDust(E);
  for (const b of [city.lamps, city.details, city.billboards, isl[2]]) b.shadow = false;
  for (const b of [...st.skin, fl, dust]) b.cut = true;
  for (const b of isl) b.shadow = false;
  cars.kinds = [0, 2]; fl.kinds = [12]; dust.kinds = [12];
  W = { st, isl, city, cars, fl, tab, dust };
  st.skin.forEach((b, i) => b.name = 'skin' + i); st.skeleton.name = 'skel'; st.gold.name = 'gold'; isl.forEach((b, i) => b.name = 'isl' + i); for (const k of Object.keys(city)) city[k].name = k; cars.name = 'cars'; fl.name = 'flecks';
  return { info: E.info, voxels: st.vox.length, faces: st.skin.reduce((a, b) => a + b.count, 0), skel: st.skeleton.count, bld: city.buildings.count, cars: cars.cars.length };
}

function harborBatches() { const c = W.city; return [...W.st.skin, W.st.skeleton, W.st.gold, ...W.isl, c.buildings, c.details, c.lamps, c.ground, c.shore, W.fl]; }
function cityBatches(withCars) { const c = W.city; const a = [c.buildings, c.details, c.lamps, c.ground, c.billboards, c.shore]; if (withCars) a.push(W.cars); return a; }
function tableBatches() { const t = W.tab; return [t.table, t.coins, t.old, t.candle, t.wick, t.flame, W.dust]; }

function floodLights(on) {
  if (on <= 0.001) return [];
  const c = [1.0, 0.9, 0.74]; const L = [];
  for (const [x, z] of [[14, 15], [-14, 15], [14, -14], [-14, -14]]) L.push({ p: [x, 50.5, z], c, i: 1.5 * on, r: 70 });
  L.push({ p: [0, 13, 36], c, i: 0.9 * on, r: 46 }); L.push({ p: [26, 13, -10], c, i: 0.6 * on, r: 40 }); L.push({ p: [-26, 13, -10], c, i: 0.6 * on, r: 40 });
  L.push({ p: [-6, 93, 9], c: [1.0, 0.85, 0.6], i: 0.9 * on, r: 14 });
  return L;
}

export function frameState(t) {
  const shot = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  let sky = SKY.night, restore = 1.05, carPow = 1, skinCut = 0, copper = 1, glitch = 0, flash = 0, stars = 0.28, cam, batches, shadow = null, water = null, pls = [], fade = 1;
  let fog = { den: 0.00028, h: 160 }, bgMode = 0, bgPow = 1, coins = null, day = 0, expAdj = 1;
  const kick = (t0) => { const d = t - t0; if (d < 0) return [0, 0]; return [Math.exp(-d / 0.09) * 0.9, Math.exp(-d / 0.05) * 0.28]; };
  if (shot.name === 'A_harbor') {
    const u = ez((t - shot.t0) / (shot.t1 - shot.t0));
    cam = { pos: mixv([-74, 22, 312], [-60, 25, 262], u), tgt: mixv([0, 57, 0], [0, 58, 0], u), fov: 40 };
    batches = harborBatches(); water = { level: 0, deep: [0.004, 0.006, 0.01], distort: 0.035 };
    shadow = { center: [0, 50, 0], radius: 70, bias: 0.06 }; pls = floodLights(1); fade = sm(0, 0.5, t);
  } else if (shot.name === 'B_fly') {
    const u = (t - shot.t0) / (shot.t1 - shot.t0);
    const p = mixv([4, 128, -930], [10, 104, -1170], ez(u));
    cam = { pos: p, tgt: V3.add(p, [-0.06 * 300, -0.36 * 300, -300]), fov: 52 };
    batches = cityBatches(true); fog = { den: 0.0006, h: 220 }; shadow = { center: V3.add(p, [0, -90, -260]), radius: 330, bias: 0.4 };
  } else if (shot.name === 'C_street') {
    const u = (t - shot.t0) / (shot.t1 - shot.t0);
    const p = mixv([3.2, 22, -1288], [2.2, 18.5, -1318], u);
    cam = { pos: p, tgt: V3.add(p, [-0.012 * 400, -0.03 * 400, -400]), fov: 50 };
    batches = cityBatches(true); fog = { den: 0.00085, h: 160 }; shadow = { center: [0, 30, -1460], radius: 240, bias: 0.3 };
    if (t >= T.black) { restore = -0.05; carPow = 0; [glitch, flash] = kick(T.black); stars = 1.0; }
  } else if (shot.name === 'D_liberty') {
    const keys = [
      { t: 25.5, pos: [30, 78, 54], tgt: [-2.5, 81, 0], fov: 42 }, { t: 27.5, pos: [26, 79, 50], tgt: [-2.5, 80.5, 0], fov: 43 },
      { t: 30.5, pos: [42, 70, 62], tgt: [-1, 72, 0], fov: 44 }, { t: 33.5, pos: [76, 58, 52], tgt: [-1, 70, 0], fov: 44 },
      { t: 36.5, pos: [48, 86, 42], tgt: [-4, 88, 1], fov: 40 }, { t: 40.5, pos: [17, 97, 22], tgt: [-6, 94, 1.2], fov: 36 }];
    const k = path(keys, t); cam = { pos: k.pos, tgt: k.tgt, fov: k.fov };
    batches = harborBatches(); water = { level: 0, deep: [0.004, 0.006, 0.01], distort: 0.035 };
    shadow = { center: [0, 70, 0], radius: 55, bias: 0.05 };
    skinCut = clamp((t - T.skin) / T.skinDur, 0, 1) * 1.02;
    if (t >= T.skin) { restore = -0.05; [glitch, flash] = kick(T.skin); stars = 1.0; } else pls = floodLights(1);
    updateFlecks(E, W.fl, t, T.skin, T.skinDur);
  } else if (shot.name === 'E_pennies') {
    const u = ez((t - shot.t0) / (shot.t1 - shot.t0));
    cam = { pos: mixv([-1.8, 5.6, 11.6], [-1.2, 4.9, 10.2], u), tgt: mixv([0.9, 1.7, -1.2], [0.8, 1.5, -1.2], u), fov: 38 };
    batches = tableBatches(); bgMode = 1; fog = { den: 0.0, h: 100 };
    const on = t < T.coins ? 1 : 0; bgPow = on ? 1.05 : -0.05; copper = on;
    if (!on) [glitch, flash] = kick(T.coins);
    const fl = 1 + 0.12 * Math.sin(t * 13.1) + 0.08 * Math.sin(t * 29.7 + 1.3) + 0.05 * Math.sin(t * 51.0);
    pls = [{ p: [6.6, 4.5, -10.5], c: [1.0, 0.6, 0.3], i: 1.8 * fl, r: 26 }];
    if (on) pls.push({ p: [-9, 12, 6], c: [1.0, 0.85, 0.68], i: 1.6, r: 40 });
    W.tab.old.visible = t < T.crumble; if (t >= T.crumble) updateDust(E, W.dust, t, T.crumble); else W.dust.count = 0;
    coins = COINS.map(c => [c.p[0], 0, c.p[2], (c.old && t >= T.crumble) ? 0 : 1]);
    shadow = on ? { center: [0, 0, 0], radius: 9, bias: 0.01 } : null;
  } else if (shot.name === 'F_return') {
    const u = ez((t - shot.t0) / (shot.t1 - shot.t0));
    cam = { pos: mixv([-50, 33, 172], [-43, 35, 152], u), tgt: mixv([0, 60, 0], [0, 61, 0], u), fov: 40 };
    batches = harborBatches(); water = { level: 0, deep: [0.004, 0.006, 0.01], distort: 0.035 };
    shadow = { center: [0, 50, 0], radius: 70, bias: 0.06 }; restore = -0.05; stars = 1.0;
    skinCut = t < T.back ? 1.02 : 1.02 * (1 - clamp((t - T.back) / 0.35, 0, 1));
    if (t >= T.back) [glitch, flash] = kick(T.back).map(v => v * 0.6);
    W.fl.count = 0;
  } else { // G_timelapse
    const u = (t - shot.t0) / (shot.t1 - shot.t0);
    cam = { pos: mixv([-84, 24, 330], [-100, 27, 380], ez(u)), tgt: mixv([-48, 64, -60], [-60, 66, -60], ez(u)), fov: 42 };
    batches = harborBatches(); water = { level: 0, deep: [0.004, 0.006, 0.01], distort: 0.035 };
    shadow = { center: [0, 50, 0], radius: 70, bias: 0.06 }; W.fl.count = 0;
    const k = [[55.9, 'night', 'dawn', 56.9], [56.9, 'dawn', 'day', 57.7], [57.7, 'day', 'day', 59.0], [59.0, 'day', 'dusk', 59.9], [59.9, 'dusk', 'night', 60.9]];
    sky = SKY.night;
    for (const [a, s0, s1, b] of k) if (t >= a) sky = skyMix(SKY[s0], SKY[s1], sm(a, b, t));
    if (t >= 60.9) sky = SKY.night;
    day = clamp(1 - Math.abs(t - 58.4) / 1.6, 0, 1);
    restore = lerp(-0.05, 1.06, sm(58.6, 61.6, t)); stars = lerp(1.0, 0.3, sm(59.5, 61.8, t)) * (1 - day);
    pls = floodLights(sm(60.8, 61.4, t));
    fade = 1 - sm(63.4, 64.0, t) * 0.0;
  }
  const lit = clamp(restore, 0, 1);
  const night = sky === SKY.night ? 1 : clamp(1 - day * 1.2, 0, 1);
  const glowAmt = lit * night * (bgMode ? 0 : 1);
  const exp = sky.exp * (bgMode ? 1.0 : lerp(1.0 + 0.45 * night, 1.0, lit));
  const S = {
    time: t, batches, restore, carPow, skinCut, copper, day, coins,
    sky: { zen: sky.zen, hor: sky.hor, moonDir: MOON_DIR, moonCol: [1.0, 0.97, 0.9], moonAmt: sky.moonAmt, sunDir: sky.sunDir, sunCol: sky.sunCol, sunAmt: sky.sunAmt,
      stars, glowCol: [0.17, 0.11, 0.06], glowDir: [0, 0, -1], glowAmt: glowAmt * 0.6, bgMode, bgPow },
    light: { dir: sky.ldir, col: sky.lcol }, amb: { sky: sky.amb[0], gnd: sky.amb[1] },
    fog: { col: V3.add(V3.scale(sky.hor, 0.9), V3.scale([0.26, 0.15, 0.065], 0.35 * glowAmt)), den: fog.den, h: fog.h },
    water, shadow, pls, road: [ROAD.AS, ROAD.AW, ROAD.SS, ROAD.SW], roadOrg: [0, 0],
    post: { exposure: exp * expAdj, bloom: bgMode ? 0.5 : 0.42, thr: 1.5, glitch, flash, vig: 0.42, grain: 0.03, fade, lift: [0.006, 0.008, 0.014], gain: [1.0, 1.0, 1.03], sat: 1.06 },
  };
  if (shot.name === 'E_pennies') { S.light = copper ? { dir: norm([-0.55, 0.75, 0.4]), col: [0.85, 0.74, 0.6] } : { dir: norm([-0.6, 0.6, -0.5]), col: [0.1, 0.13, 0.2] }; S.amb = { sky: [0.012, 0.012, 0.018], gnd: [0.004, 0.003, 0.003] }; S.post.exposure = 1.25; }
  updateCars(E, W.cars, t, T.black);
  const camO = { pos: cam.pos, target: cam.tgt, fov: cam.fov, near: 0.6, far: 7000 };
  if (shot.name !== 'E_pennies') { E.cullBatch(W.city.buildings, camO, true); E.cullBatch(W.city.shore, camO, true); E.cullBatch(W.city.lamps, camO, false); E.cullBatch(W.city.details, camO, false); }
  const cityShot = shot.name === 'B_fly' || shot.name === 'C_street';
  W.city.buildings.shadow = cityShot; W.city.shore.shadow = false; W.city.ground.shadow = cityShot;
  return { S, cam: { pos: cam.pos, target: cam.tgt, fov: cam.fov, near: shot.name === 'E_pennies' ? 0.1 : 0.6, far: 7000 }, shot };
}

export function renderAt(t) {
  const { S, cam, shot } = frameState(t);
  E.render(S, cam);
  hudAt(t);
  E.finish();
  return shot.name;
}
