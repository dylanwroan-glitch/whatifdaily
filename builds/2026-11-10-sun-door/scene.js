// scene.js — "If the Sun were a door, where's Earth?": shots, cameras, lighting, the flying Earth. Original code.
import { Engine, V3, pushInst, pushBar, quatAxis } from './engine.js';
import * as W from './world3.js';
import { SHOTS, FPS, DURATION, laps, LAPS, FILL, LAUNCH, LANDED } from './timeline.js';
import { hudAt } from './hud.js';
export { SHOTS, FPS, DURATION };

const { clamp, lerp } = W;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ez = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const mixv = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const norm = V3.norm;
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const E0 = W.EARTH_ON_TABLE, MB = W.MAILBOX, EM = W.EARTH_ON_MAILBOX, SC = W.SUNC, DB = W.DIR_BALL, RB = W.RIGHT_BALL;
const P1A = V3.add(E0, [-DB[0] * 0.17 + RB[0] * 0.012, 0.024, -DB[2] * 0.17 + RB[2] * 0.012]);
const P1B = V3.add(E0, [-DB[0] * 0.125 + RB[0] * 0.012, 0.02, -DB[2] * 0.125 + RB[2] * 0.012]);
const P1T = (p) => V3.add(p, [DB[0], -0.17, DB[2]]);
const DS = V3.norm(V3.sub(SC, W.EARTH_ON_MAILBOX));
const S3P = (k) => V3.add(EM, [-DS[0] * k, 0.027 * k / 0.26, -DS[2] * k]);

const ENV = {
  P: { zen: [0.008, 0.013, 0.034], hor: [0.07, 0.05, 0.065], glow: 0.7, ldir: norm(V3.sub(SC, W.TABLE)), lcol: [1.0, 0.6, 0.3], amb: [[0.022, 0.03, 0.055], [0.014, 0.011, 0.01]], exp: 1.3, fog: { den: 0.0011, h: 40 }, stars: 0.12, bloom: 0.5, thr: 1.3 },
  S: { zen: [0.008, 0.013, 0.034], hor: [0.07, 0.05, 0.065], glow: 0.9, ldir: norm([0.3, 0.8, 0.2]), lcol: [0.035, 0.042, 0.065], amb: [[0.022, 0.03, 0.055], [0.014, 0.011, 0.01]], exp: 1.35, fog: { den: 0.0011, h: 40 }, stars: 0.12, bloom: 0.5, thr: 1.3 },
  T: { zen: [0.006, 0.011, 0.03], hor: [0.06, 0.045, 0.06], glow: 0.9, ldir: norm([0.3, 0.8, 0.2]), lcol: [0.03, 0.036, 0.055], amb: [[0.02, 0.026, 0.05], [0.012, 0.01, 0.009]], exp: 1.5, fog: { den: 0.00002, h: 2500 }, stars: 0.12, bloom: 0.55, thr: 1.2 },
  X: { zen: [0.0015, 0.0015, 0.003], hor: [0.0015, 0.0015, 0.003], glow: 0, ldir: norm([0, 0, 1]), lcol: [0, 0, 0], amb: [[0, 0, 0], [0, 0, 0]], exp: 1.0, fog: { den: 0, h: 100 }, stars: 1.0, bloom: 0.6, thr: 1.3, space: 1 },
  G: { zen: [0.0015, 0.0015, 0.003], hor: [0.0015, 0.0015, 0.003], glow: 0, ldir: norm([0.75, 0.3, 0.6]), lcol: [2.3, 2.2, 2.05], amb: [[0.05, 0.06, 0.09], [0.05, 0.06, 0.09]], exp: 0.95, fog: { den: 0, h: 100 }, stars: 0.8, bloom: 0.35, thr: 1.4, space: 1 },
};

// ---------- the flying Earth ----------
const KEYS = [
  [LAUNCH, E0], [LAUNCH + 0.55, [E0[0] - 0.25, E0[1] + 0.5, E0[2] - 0.05]], [12.65, [12.2, 1.8, -2.8]], [13.6, [6.2, 1.75, -16]],
  [15.2, [5.5, 1.7, -118]], [16.75, [5.35, 1.62, MB[2] + 7]], [17.15, [EM[0], EM[1] + 0.3, EM[2] + 0.4]], [LANDED, EM],
];
function earthPos(t) {
  if (t <= KEYS[0][0]) return E0; if (t >= KEYS[KEYS.length - 1][0]) return EM;
  let i = 0; while (t > KEYS[i + 1][0]) i++;
  const P = (k) => KEYS[clamp(k, 0, KEYS.length - 1)][1];
  const u = (t - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0]);
  const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2); // Catmull-Rom
  return p1.map((_, c) => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * u + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u * u + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * u * u * u));
}
export function earthDist(t) { const p = earthPos(t); return Math.hypot(p[0] - SC[0], p[2] - SC[2]); }

// ---------- globe trip ----------
const GR = 50; const P0 = W.latLon(39, -95, 1);
const T0 = norm(V3.cross([0, 1, 0], P0)); // local east
const HEAD0 = norm(V3.add(V3.scale(T0, Math.cos(0.33)), V3.scale(norm(V3.cross(P0, T0)), Math.sin(0.33)))); // heading a bit north of east
const AX0 = norm(V3.cross(P0, HEAD0));
function tripPoint(L) { // L in laps
  const ax = W.rotAxis(AX0, P0, (L / 1) * 0.16); // the second lap drifts so both loops show
  return W.rotAxis(P0, ax, L * Math.PI * 2);
}
function tripAxis(L) { return W.rotAxis(AX0, P0, L * 0.16); }

let E, B;
export async function setup(canvas, Wd = 1080, Hd = 1920, opts = {}) {
  canvas.width = Wd; canvas.height = Hd;
  E = new Engine(canvas, Wd, Hd, opts); window.__E = E;
  const img = new Image(); img.src = './earth.png'; await img.decode(); E.setEarthTexture(img);
  B = { st: W.buildStreet(E), town: W.buildTown(E), sp: W.buildSpace(E) };
  // warp streaks for X1
  const R = W.rng(99); const st = [];
  for (let k = 0; k < 520; k++) { const a = R() * Math.PI * 2, r = 120 + Math.pow(R(), 0.7) * 2600, z = R() * 42000 - 2000;
    pushInst(st, [Math.cos(a) * r, Math.sin(a) * r, z], [2.5, 2.5, 500 + R() * 900], [0.75, 0.82, 1.0], 2, undefined, 0, 0.5, [0.9 + R() * 1.6, 0, 0, 0]); }
  B.streaks = E.batch(E.mesh('box'), new Float32Array(st)); B.streaks.shadow = false;
  return { info: E.info, town: B.town.houses.count };
}

function project(vp, p) {
  const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12], y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13], w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
  if (w <= 0) return null; return [(x / w * 0.5 + 0.5) * 1080, (1 - (y / w * 0.5 + 0.5)) * 1920];
}

// ---------- cameras ----------
function camera(shot, t) {
  const u = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1), e = ez(u);
  switch (shot.name) {
    case 'H_door': return { pos: mixv([6.2, 1.8, 0.9], [7.3, 1.7, 0.6], e), tgt: mixv([15.6, 1.62, -0.45], [15.6, 1.58, -0.5], e), fov: 50 };
    case 'P1_nickel': { const p = mixv(P1A, P1B, e); return { pos: p, tgt: P1T(p), fov: 44, near: 0.004, far: 600 }; }
    case 'P2_109': { const k = Math.pow(ez(u), 0.8); return { pos: mixv(P1B, [12.85, 1.62, 1.75], k), tgt: mixv(P1T(P1B), [14.35, 1.12, -1.05], k), fov: lerp(44, 44, k), near: lerp(0.004, 0.05, k), far: 2000 }; }
    case 'P3_fill': { const a = lerp(-0.6, -0.15, e), r = lerp(5.0, 4.4, e); return { pos: [SC[0] - Math.cos(a) * r, 1.9 + 0.3 * u, SC[2] - Math.sin(a) * r], tgt: [SC[0], SC[1] + 0.05, SC[2]], fov: 46, near: 0.05 }; }
    case 'P4_launch': return { pos: mixv([15.1, 1.42, 0.35], [14.9, 1.5, 0.15], e), tgt: mixv([7.5, 1.3, -5.0], [5.8, 1.55, -12.0], e), fov: 52, near: 0.02 };
    case 'S1_chase': { const p = earthPos(t), q = earthPos(t + 0.05); const v = V3.norm(V3.sub(q, p)); const side = [-v[2], 0, v[0]];
      return { pos: V3.add(p, [-v[0] * 0.24 + side[0] * 0.05, -0.02, -v[2] * 0.24 + side[2] * 0.05]), tgt: V3.add(p, [v[0] * 3 - side[0] * 0.3, -0.23, v[2] * 3 - side[2] * 0.3]), fov: 60, near: 0.004 }; }
    case 'S2_land': { const p = mixv(V3.add(EM, [0.2, 0.035, -0.46]), V3.add(EM, [0.17, 0.03, -0.4]), e); const d = V3.sub(EM, p);
      return { pos: p, tgt: V3.add(EM, [d[0] * 2, d[1] * 2 - 0.09, d[2] * 2]), fov: 46, near: 0.005 }; }
    case 'S3_look': { const p = S3P(lerp(0.26, 0.23, e)); return { pos: p, tgt: V3.add(p, [DS[0], -0.114, DS[2]]), fov: 20, near: 0.004, far: 3000 }; }
    case 'T1_up': {
      const k = sm(0, 1, Math.min(1, u / 0.62)); const h = 60 * Math.pow(24000 / 60, k) * (1 + 0.08 * Math.max(0, u - 0.62) / 0.38);
      const cz = lerp(MB[2] * 0.5, SC[2], sm(0.0, 0.6, u));
      return { pos: [lerp(MB[0], SC[0], sm(0, 0.4, u)) + h * 0.015, h, cz + h * 0.14], tgt: [lerp(MB[0], SC[0], sm(0, 0.4, u)), 0, cz + h * 0.085], up: [0, 0, -1], fov: 52, near: Math.max(0.05, h * 0.01), far: Math.max(3000, h * 3) };
    }
    case 'X1_warp': return { pos: [Math.sin(t * 0.7) * 30, Math.cos(t * 0.5) * 20, lerp(36000, 7000, Math.pow(u, 0.8))], tgt: [0, 0, 0], fov: 60, near: 1, far: 60000 };
    case 'X2_proxima': { const a = lerp(0.5, 0.15, e), r = lerp(205, 175, e); return { pos: [Math.sin(a) * r, 22 - 10 * u, Math.cos(a) * r], tgt: [0, 6, 0], fov: 40, near: 1, far: 60000 }; }
    case 'G1_start': { const d = norm(V3.add(V3.scale(P0, 1), [0.25, 0.1, 0.35])); const r = lerp(330, 175, e);
      return { pos: V3.scale(d, r), tgt: V3.scale(P0, lerp(0, 18, e)), fov: 38, near: 1, far: 5000 }; }
    case 'G2_lap': {
      const L = laps(t); const ax = tripAxis(L);
      const back = W.rotAxis(P0, ax, (L - 0.11) * Math.PI * 2); const ahead = tripPoint(L + 0.06);
      const pos = V3.add(V3.scale(back, 150), V3.scale(ax, 55));
      return { pos, tgt: V3.scale(ahead, 22), up: ax, fov: 40, near: 1, far: 5000 };
    }
    case 'G3_reveal': {
      const L = laps(t); const ax = tripAxis(LAPS); const end = tripPoint(LAPS);
      const d0 = norm(V3.add(V3.scale(W.rotAxis(P0, ax, (L - 0.11) * Math.PI * 2), 150), V3.scale(ax, 55)));
      const d1 = norm(V3.add(V3.scale(norm(V3.add(end, P0)), 1.0), V3.scale(ax, 0.55)));
      const d = norm(V3.lerp(d0, d1, sm(0.2, 0.9, u))); const r = lerp(160, 265, sm(0.15, 1, u));
      return { pos: V3.scale(d, r), tgt: [0, 0, 0], up: V3.lerp(ax, [0, 1, 0], sm(0.3, 1, u) * 0.5), fov: 40, near: 1, far: 5000 };
    }
    case 'E1_porch': return { pos: mixv([12.6, 1.55, -0.9], [9.4, 1.7, 0.2], e), tgt: mixv([14.9, 1.45, -1.3], [15.4, 1.55, -0.6], e), fov: 46 };
    default: return { pos: mixv([8.6, 1.66, 0.3], [6.4, 1.78, 0.85], e), tgt: mixv([15.5, 1.56, -0.55], [15.6, 1.62, -0.45], e), fov: 50 }; // E2_end -> loops to H
  }
}

function lampLights(cam) {
  const out = [];
  for (let z = -510; z <= 150; z += 60) for (const side of [-1, 1]) {
    const p = [side * 4.6 - side * 1.15, 4.95, z + 30]; const d = V3.len(V3.sub(p, cam)); out.push({ p, d });
  }
  out.sort((a, b) => a.d - b.d);
  return out.slice(0, 4).map(o => ({ p: o.p, c: [1.0, 0.78, 0.5], i: 1.3, r: 20 }));
}

export function frameState(t) {
  const shot = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const env = ENV[shot.set];
  const cam = camera(shot, t);
  const camF = { pos: cam.pos, target: cam.tgt, fov: cam.fov, near: cam.near || 0.15, far: cam.far || 9000, up: cam.up };
  const vp = E.viewProj(camF);
  const st = B.st; const labels = []; const fx = []; const minis = [];
  let batches = [];
  const ep = earthPos(t);
  // ---- the Earth ----
  const spin = quatAxis([0, 1, 0], t * 0.6 + 2.2);
  if (shot.set === 'P' || shot.set === 'S') {
    const showEarth = !(shot.name === 'E1_porch' || shot.name === 'E2_end');
    const e = []; if (showEarth) pushInst(e, ep, [W.EARTH_D, W.EARTH_D, W.EARTH_D], [1, 1, 1], 17, quatAxis([0, 1, 0], -t * 0.9 + 1.8), 0, 0.5, [1.2, t * 0.01, 0.55, 0]);
    if (!st.earth.buf) st.earth.buf = new Float32Array(2 * 20); st.earth.buf.set(e); E.updateBatch(st.earth, st.earth.buf, e.length / 20);
    // trail behind the flying Earth
    if (t > LAUNCH + 0.2 && t < LANDED + 0.3 && shot.name !== 'S1_chase') {
      let prev = earthPos(t);
      for (let k = 1; k <= 26; k++) {
        const tk = t - k * 0.018; if (tk < LAUNCH) break; const p = earthPos(tk); const fade = (1 - k / 27) * (1 - sm(LANDED - 0.15, LANDED + 0.12, t)); if (fade < 0.03) break;
        if (V3.len(V3.sub(p, prev)) > 1e-4 && V3.len(V3.sub(p, cam.pos)) > 0.3) pushBar(fx, prev, p, Math.max(W.EARTH_D * 0.5, V3.len(V3.sub(p, cam.pos)) * 0.0028) * (1 - k / 30), [0.45, 0.7, 1.0], 2, 0, 0.5, [5 * fade, 0, 0, 0]);
        prev = p;
      }
    }
    batches = [st.ground, st.static, st.win, st.trees, st.lamps, st.lampHeads, st.sun, st.nickel, st.earth];
    if (shot.set === 'S' || shot.name === 'P4_launch') batches.push(B.town.houses, B.town.wins);
  }
  // ---- 1.3 million Earths pouring in (P3) ----
  if (shot.name === 'P3_fill' || (shot.name === 'P2_109' && t > 7.6)) {
    const R = W.rng(5); const n = 2400;
    for (let i = 0; i < n; i++) {
      const u0 = R(), u1 = R(), u2 = R(), u3 = R();
      const ti = FILL.t0 - 0.35 + (FILL.t1 - FILL.t0) * Math.pow(u0, 0.75); const dur = 0.75 + 0.5 * u1;
      const k = (t - ti) / dur; if (k < 0 || k >= 1) continue;
      const z = u2 * 2 - 1, ph = u3 * Math.PI * 2, rr = Math.sqrt(1 - z * z);
      const dir = [rr * Math.cos(ph), z * 0.75, rr * Math.sin(ph)];
      const r0 = 3.0 + 3.5 * R(); const r = lerp(r0, 0.6, k * k);
      if (r < 1.0) continue;
      const p = V3.add(SC, V3.scale(dir, r));
      pushInst(minis, p, [W.EARTH_D, W.EARTH_D, W.EARTH_D], [1, 1, 1], 17, quatAxis([0, 1, 0], i * 1.7), 0, 0.5, [3.0, i * 0.13, 0.4, 0]);
    }
    batches.push(st.minis);
  }
  if (!st.minis.buf) st.minis.buf = new Float32Array(2600 * 20);
  st.minis.buf.set(minis.length > 2600 * 20 ? minis.slice(0, 2600 * 20) : minis); E.updateBatch(st.minis, st.minis.buf, Math.min(2600, minis.length / 20));
  // ---- labels on the porch ----
  if (shot.name === 'P2_109') {
    const pe = project(vp, V3.add(E0, [0, 0.03, 0])); if (pe) labels.push({ x: pe[0], y: pe[1] - 50, txt: 'EARTH', a: sm(6.6, 7.0, t), small: 1 });
    const ps = project(vp, V3.add(SC, [0, 1.2, 0])); if (ps) labels.push({ x: ps[0], y: ps[1] - 30, txt: 'SUN', a: sm(6.8, 7.2, t), small: 1 });
  }
  if (shot.name === 'S3_look') { const ps = project(vp, V3.add(SC, [0, 1.6, 0])); if (ps) labels.push({ x: ps[0], y: ps[1] - 55, txt: 'THE SUN', a: sm(19.5, 19.9, t), small: 1 }); }
  // ---- aerial: orbits and markers ----
  if (shot.set === 'T') {
    const h = cam.pos[1];
    batches = [st.ground, st.static, st.win, st.trees, st.lampHeads, st.sun, B.town.houses, B.town.wins];
    const w1 = Math.max(0.25, h * 0.0028);
    W.pushRing(fx, SC, W.AU, w1, [0.5, 0.75, 1.0], 6 * sm(22.0, 22.5, t), 120, 1.5);
    const g = sm(23.2, 24.3, t); const rN = lerp(W.AU, W.NEPTUNE_R, g);
    if (g > 0) W.pushRing(fx, SC, rN, Math.max(0.4, h * 0.0034), [1.0, 0.8, 0.3], 7, 160, 2);
    const pulse = 0.7 + 0.3 * Math.sin(t * 9);
    pushBar(fx, [SC[0], 0, SC[2]], [SC[0], Math.max(4, h * 0.05), SC[2]], Math.max(0.5, h * 0.006), [1.0, 0.7, 0.3], 2, 0, 0.5, [10 * pulse, 0, 0, 0]);
    const nep = [SC[0] + Math.sin(0.25) * rN, 2, SC[2] - Math.cos(0.25) * rN];
    if (g > 0.98) pushBar(fx, [nep[0], 0, nep[2]], [nep[0], h * 0.04, nep[2]], h * 0.007, [0.45, 0.65, 1.0], 2, 0, 0.5, [9 * pulse, 0, 0, 0]);
    const ps = project(vp, [SC[0], h * 0.05, SC[2]]); if (ps) labels.push({ x: ps[0], y: ps[1] - 40, txt: 'SUN', a: sm(22.1, 22.5, t), small: 1 });
    const pe = project(vp, [MB[0], 2, MB[2]]); if (pe && t < 23.4) labels.push({ x: pe[0] + 90, y: pe[1], txt: 'EARTH', a: sm(22.1, 22.5, t) * (1 - sm(23.0, 23.4, t)), small: 1 });
    const pn = project(vp, [nep[0], h * 0.04, nep[2]]); if (pn) labels.push({ x: pn[0], y: pn[1] - 40, txt: 'NEPTUNE', a: sm(24.2, 24.5, t) });
  }
  // ---- space ----
  if (shot.set === 'X') {
    batches = [B.sp.red]; if (shot.name === 'X1_warp') batches.push(B.streaks);
    if (shot.name === 'X2_proxima') { const p = project(vp, [0, 62, 0]); if (p) labels.push({ x: p[0], y: p[1] - 30, txt: 'PROXIMA CENTAURI', a: sm(27.6, 28.0, t), small: 1 }); }
  }
  if (shot.set === 'G') {
    const g = []; pushInst(g, [0, 0, 0], [GR * 2, GR * 2, GR * 2], [1, 1, 1], 17, undefined, 0, 0.5, [1.0, 0.3, 0.7, 0]);
    if (!B.sp.globe.buf) B.sp.globe.buf = new Float32Array(20); B.sp.globe.buf.set(g); E.updateBatch(B.sp.globe, B.sp.globe.buf, 1);
    batches = [B.sp.globe];
    const L = laps(t); const steps = Math.ceil(L * 220);
    let prev = V3.scale(P0, GR * 1.012);
    for (let k = 1; k <= steps; k++) {
      const p = V3.scale(tripPoint(Math.min(L, k / 220)), GR * 1.012);
      pushBar(fx, prev, p, 0.55, k / 220 > 1 ? [1.0, 0.55, 0.25] : [1.0, 0.8, 0.3], 2, 0, 0.5, [5.5, 0, 0, 0]); prev = p;
    }
    // start pin and travelling head
    const pin = V3.scale(P0, GR * 1.0); pushBar(fx, pin, V3.scale(P0, GR * 1.09), 0.7, [1.0, 0.85, 0.4], 2, 0, 0.5, [9, 0, 0, 0]);
    if (L > 0.001) { const hd = V3.scale(tripPoint(L), GR * 1.012); pushInst(fx, hd, [1.9, 1.9, 1.9], [1.0, 0.95, 0.85], 2, undefined, 0, 0.5, [14, 0, 0, 0]); }
    const pp = project(vp, V3.scale(P0, GR * 1.1)); if (pp && shot.name === 'G1_start') labels.push({ x: pp[0], y: pp[1] - 40, txt: 'START', a: sm(29.8, 30.2, t), small: 1 });
    if (shot.name === 'G3_reveal') { const pe = project(vp, V3.scale(tripPoint(LAPS), GR * 1.04)); if (pe) labels.push({ x: pe[0], y: pe[1] - 45, txt: 'PROXIMA', a: sm(37.7, 38.1, t) }); }
  }
  batches.push(st.fx);
  if (!st.fx.buf) st.fx.buf = new Float32Array(4000 * 20);
  const nfx = Math.min(4000, fx.length / 20); st.fx.buf.set(fx.length > 4000 * 20 ? fx.slice(0, 4000 * 20) : fx); E.updateBatch(st.fx, st.fx.buf, nfx);
  // ---- the door-sized Sun ----
  if (shot.set === 'P' || shot.set === 'S' || shot.set === 'T') {
    const si = shot.name === 'P1_nickel' ? 1.15 : shot.name === 'P2_109' ? lerp(1.15, 1.45, sm(5.4, 7.0, t)) : shot.set === 'S' ? 2.6 : shot.set === 'T' ? 6 : 1.45;
    const a = []; pushInst(a, SC, [W.SUN_D, W.SUN_D, W.SUN_D], [1, 1, 1], 14, quatAxis([0, 1, 0], t * 0.05), 0, 0.5, [si, 0, 0, 0]);
    st.sun.buf.set(a); E.updateBatch(st.sun, st.sun.buf, 1);
  }
  // ---- lights ----
  const pls = [];
  if (shot.set === 'P' || shot.set === 'S') {
    pls.push({ p: SC, c: [1.0, 0.66, 0.36], i: 2.6, r: 34 });
    if (shot.name === 'P1_nickel' || (shot.name === 'P2_109' && t < 6.6)) pls.push({ p: V3.add(cam.pos, [RB[0] * -0.08, 0.06, RB[2] * -0.08]), c: [0.7, 0.78, 1.0], i: 0.75, r: 0.7 });
    if (shot.name === 'P3_fill') pls.push({ p: V3.add(cam.pos, [0, 0.5, 0]), c: [0.6, 0.7, 1.0], i: 1.1, r: 9 });
    if (shot.name === 'S3_look' || shot.name === 'S2_land' || shot.name === 'S1_chase') pls.push({ p: V3.add(cam.pos, [0.05, 0.08, 0]), c: [0.7, 0.78, 1.0], i: shot.name === 'S1_chase' ? 0.55 : 0.32, r: 0.6 });
    for (const l of lampLights(cam.pos)) pls.push(l);
    if (t > LAUNCH && t < LANDED + 0.6) pls.push({ p: ep, c: [0.4, 0.62, 1.0], i: 0.5 * (1 - sm(LANDED, LANDED + 0.6, t)), r: 3 });
  }
  let shadow = null;
  if (shot.name === 'P1_nickel' || shot.name === 'P2_109') shadow = { center: [W.TABLE[0], W.TABLE[1], W.TABLE[2]], radius: shot.name === 'P1_nickel' ? 0.32 : 0.9, bias: 0.0025, dist: 3 };
  if (shot.name === 'H_door' || shot.name === 'E1_porch' || shot.name === 'E2_end' || shot.name === 'P3_fill') shadow = { center: [14.6, 0.8, -0.6], radius: 4.5, bias: 0.02, dist: 8 };
  const ldir = (shot.set === 'P') ? norm(V3.sub(SC, shadow && shadow.radius > 2 ? [12.6, 0.2, 1.5] : W.TABLE)) : env.ldir;
  const lcol = shot.set === 'P' ? V3.scale(env.lcol, shadow ? 1.05 : 0.4) : env.lcol;
  const S = {
    time: t, batches, restore: 1.05, carPow: 1, skinCut: 0, copper: 1, day: 0,
    sky: { zen: env.zen, hor: env.hor, moonDir: norm([0.3, 0.5, -0.8]), moonCol: [1, 0.97, 0.9], moonAmt: 0, sunDir: [0, -1, 0], sunCol: [1.0, 0.9, 0.75], sunAmt: 0,
      stars: env.stars, glowCol: [0.2, 0.085, 0.04], glowDir: [0, 0, -1], glowAmt: env.glow, bgMode: env.space ? 2 : 0, bgPow: 1, sfl: [0, 1, 0, 0] },
    light: { dir: ldir, col: lcol }, amb: { sky: env.amb[0], gnd: env.amb[1] },
    fog: { col: V3.scale(env.hor, 0.9), den: env.fog.den, h: env.fog.h },
    water: null, shadow, pls,
    road: [W.ROAD.AS, W.ROAD.AW, W.ROAD.SS, W.ROAD.SW], roadOrg: W.ROAD.org,
    post: { exposure: env.exp, bloom: env.bloom, thr: env.thr, glitch: 0, flash: 0, vig: 0.38, grain: 0.025, fade: 1, lift: [0.004, 0.006, 0.012], gain: [1.0, 1.0, 1.02], sat: 1.08 },
  };
  if (shot.set === 'T' || shot.set === 'S' || shot.name === 'P4_launch') E.cullBatch(B.town.houses, camF, false);
  window.__frame = { labels, shot: shot.name, set: shot.set, dist: earthDist(t), laps: laps(t) };
  return { S, cam: camF, shot };
}

export function renderAt(t) {
  const { S, cam, shot } = frameState(t);
  E.render(S, cam);
  hudAt(t, window.__frame);
  E.finish();
  return shot.name;
}
