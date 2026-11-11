// scene.js — "Why does your watch count to 32,768?": shots, cameras, lighting and animation. Original code.
import { Engine, V3, pushInst, pushBar, quatMul, qrot } from './engine.js';
import * as W from './world4.js';
import { SHOTS, FPS, DURATION, HALF_T, halvings, tickCount, EV } from './timeline.js';
import { hudAt } from './hud.js';
export { SHOTS, FPS, DURATION };

const { clamp, lerp, qx, qy, qz, Q0 } = W;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ez = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const mixv = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const norm = V3.norm;
const RD = qx(Math.PI);

let E, M, B;
export async function setup(canvas, Wd = 1080, Hd = 1920, opts = {}) {
  canvas.width = Wd; canvas.height = Hd;
  E = new Engine(canvas, Wd, Hd, opts); window.__E = E;
  M = W.meshes(E);
  B = { watch: W.buildWatch(E, M), chip: W.buildChip(E, M), lab: W.buildLab(E, M), dusk: W.buildDusk(E, M) };
  const tb = []; pushInst(tb, [0, -5, 0], [4000, 10, 4000], [1, 1, 1], 25, Q0, 0, 0.6, [0.12, 0, 0, 0]);
  B.table = E.batch(M.box, new Float32Array(tb)); B.table.shadow = false;
  return { info: E.info };
}

function project(vp, p) {
  const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12], y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13], w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
  if (w <= 0) return null; return [(x / w * 0.5 + 0.5) * 1080, (1 - (y / w * 0.5 + 0.5)) * 1920];
}

// ================= the watch =================
function settle(u) { if (u < 0) return 0; if (u < 0.06) { const k = u / 0.06; return 1.07 * k * k * (3 - 2 * k); } return 1 + 0.07 * Math.exp(-(u - 0.06) / 0.035) * Math.cos((u - 0.06) * 55); }
function handsAt(t) {
  const n = tickCount(t); const u = t < 0.5 ? -1 : (t - 0.5) - Math.floor(t - 0.5);
  const secs = 40 + (n > 0 ? n - 1 + settle(u) : 0); const mins = 10 + secs / 60;
  return { s: secs / 60 * Math.PI * 2, m: mins / 60 * Math.PI * 2, h: (10 + mins / 60) / 12 * Math.PI * 2 };
}
const DOWN_SHOTS = ['A_explode', 'B_can', 'B_open', 'B_zap', 'B_count', 'D_tick'];
function watchState(t, shot) {
  const st = { T: [0, 0, 0], R: Q0, down: 0, explode: 0, backLift: 0, backSpin: 0, backFly: null, backHide: false, shell: 0, bend: 0, zap: 0, quartzGlow: 0.15,
    gear: 0, rotor: 0, coilGlow: 0, hand: handsAt(t), hide: null };
  const nm = shot.name;
  if (nm === 'A_flip') {
    const f = ez(sm(EV.flipT0, EV.flipT1, t));
    st.R = quatMul(qy(0.55 * Math.sin(Math.PI * f)), qx(Math.PI * f)); st.T = [0, 10.6 * f + 26 * Math.sin(Math.PI * f), 0]; st.down = f;
    if (t > EV.backPop) { const u = sm(EV.backPop, EV.backFly, t); st.backLift = 2.2 * u; st.backSpin = 1.3 * u; }
    if (t > EV.backFly) { const u = clamp((t - EV.backFly) / 0.5, 0, 1); const k = u * u; st.backFly = { off: [k * 130, k * 95, k * 35], q: qz(-k * 2.2) }; }
  } else if (DOWN_SHOTS.includes(nm)) {
    st.R = RD; st.T = [0, 10.6, 0]; st.down = 1; st.backHide = true;
    st.explode = nm === 'A_explode' ? ez(sm(EV.explode0, EV.explode1, t)) : nm === 'D_tick' ? 0 : 1;
  }
  if (t >= EV.shell0 && t < 28.4) st.shell = 8.8 * ez(sm(EV.shell0, EV.shell1, t));
  if (nm === 'B_open') st.quartzGlow = 0.2 + 0.35 * sm(10.8, 11.8, t);
  if (nm === 'B_zap') { const ph = (t - EV.zap0) * 2.3; const ramp = sm(EV.zap0, EV.zap0 + 0.45, t); const sw = Math.sin(ph * Math.PI * 2);
    st.bend = 0.085 * sw * ramp; st.zap = ramp * (1.4 + 2.6 * Math.max(0, sw)); st.quartzGlow = 0.45 + 0.9 * ramp * Math.abs(sw); }
  if (nm === 'B_count') { st.bend = 0.055 * Math.sin((t - 15.2) * 2 * Math.PI * 7.5); st.zap = 2.2 + 0.6 * Math.sin(t * 90); st.quartzGlow = 0.75 + 0.2 * Math.sin(t * 50); }
  const n = tickCount(t); const u = t - 0.5 - Math.floor(t - 0.5);
  const step = n > 0 ? n - 1 + (u < 0.1 ? ez(u / 0.1) : 1) : 0;
  st.rotor = step * Math.PI; st.gear = step;
  if (nm === 'D_tick') st.coilGlow = t >= 28.5 ? 3.2 * Math.exp(-u / 0.16) : 0;
  return st;
}
function wl(st, local, layer = 0) { const p = layer ? [local[0], local[1] - st.explode * W.LAYER_OFF[layer], local[2]] : local; return V3.add(st.T, qrot(st.R, p)); }
function canW(st, pc) { return wl(st, V3.add(W.CAN_P, qrot(W.CAN_Q, pc)), 4); }
function canAxis(st) { return norm(qrot(st.R, qrot(W.CAN_Q, [1, 0, 0]))); }
function watchXf(st) {
  return (part) => {
    let p = part.p, q = part.q, s = part.s, e = part.e; const tg = part.tag;
    if (tg) switch (tg.type) {
      case 'hand': { const r = qy(-st.hand[tg.which]); p = qrot(r, p); q = quatMul(r, q); break; }
      case 'gear': { q = quatMul(qy(st.gear * tg.rate * Math.PI * 2), q); break; }
      case 'rotor': { q = quatMul(qy(st.rotor), q); break; }
      case 'rotorMark': { const r = qy(st.rotor); p = V3.add(tg.c, qrot(r, tg.off)); q = r; break; }
      case 'coil': e = [e[0], e[1], e[2], st.coilGlow]; break;
      case 'can': {
        let pc = p, qc = q;
        if (tg.sub === 'shell') { if (st.shell > 8.6) return null; pc = [pc[0] + st.shell, pc[1], pc[2]]; }
        if (tg.sub === 'tine') { const b = qy(-tg.side * st.bend); pc = V3.add(tg.root, qrot(b, tg.off)); qc = b; }
        if (tg.sub === 'quartz' || (tg.sub === 'tine' && !tg.elec)) e = [st.quartzGlow, 0.35, 0, 0];
        if (tg.sub === 'elec' || tg.elec) e = [0, 0, 0, st.zap];
        p = V3.add(W.CAN_P, qrot(W.CAN_Q, pc)); q = quatMul(W.CAN_Q, qc); break;
      }
      case 'strap': { const g = W.strapSeg(tg.seg, tg.side, st.down); p = g.p; q = g.q; s = tg.seg === 2 ? [15.6, 3.6, 3.2] : [g.L, 2.6, 14.6]; break; }
      case 'stitch': { const yf = lerp(1.3, 9.3, st.down); p = [tg.sx * 6.0, yf + (st.down < 0.5 ? 1.33 : -1.33), tg.side * (36 + tg.i * 3.0)]; break; }
      case 'back': { if (st.backHide) return null; p = [p[0], p[1] - st.backLift, p[2]]; q = quatMul(qy(st.backSpin), q); break; }
    }
    const L = part.layer;
    if (L) { if (st.hide && st.hide.includes(L)) return null; p = [p[0], p[1] - st.explode * W.LAYER_OFF[L], p[2]]; }
    let wp = V3.add(st.T, qrot(st.R, p)), wq = quatMul(st.R, q);
    if (tg && tg.type === 'back' && st.backFly) { wp = V3.add(wp, st.backFly.off); wq = quatMul(st.backFly.q, wq); }
    return { p: wp, q: wq, s, e };
  };
}
function watchExtras(st, shot, t) {
  const box = [];
  // vibration ghosts: faint outlines of both tines at their extremes (B_count) so the blur reads at phone size
  if (shot.name === 'B_count' || shot.name === 'B_zap') {
    const amp = shot.name === 'B_count' ? 0.055 : Math.abs(st.bend);
    const a = shot.name === 'B_count' ? 1 : sm(12.9, 13.3, t);
    for (const side of [-1, 1]) for (const sg of [-1, 1]) {
      const b = qy(-side * sg * amp); const root = [2.3, 0, side * 0.32];
      const A = canW(st, V3.add(root, qrot(b, [0.2, 0.18, side * 0.17]))), Bp = canW(st, V3.add(root, qrot(b, [3.3, 0.18, side * 0.17])));
      const A2 = canW(st, V3.add(root, qrot(b, [0.2, -0.18, side * 0.17]))), B2 = canW(st, V3.add(root, qrot(b, [3.3, -0.18, side * 0.17])));
      pushBar(box, A, Bp, 0.035, [0.45, 0.75, 1.0], 2, 0, 0.5, [1.6 * a, 0, 0, 0]); pushBar(box, A2, B2, 0.035, [0.45, 0.75, 1.0], 2, 0, 0.5, [1.6 * a, 0, 0, 0]);
    }
  }
  return { box };
}

// ================= the divider chip =================
export function focusX(t) {
  if (t < HALF_T[0]) { const u = clamp((t - 17.8) / (HALF_T[0] - 17.8), 0, 1); return lerp(-15, 12, u * u * (3 - 2 * u) * 0.35 + u * 0.65); }
  for (let k = 0; k < 14; k++) if (t < HALF_T[k + 1]) { const u = (t - HALF_T[k]) / (HALF_T[k + 1] - HALF_T[k]); return 12 * (k + 1) + 12 * u; }
  const u = clamp((t - HALF_T[14]) / 1.2, 0, 1); return 180 + 24 * (1 - Math.pow(1 - u, 2.4));
}
const SEGCOL = (j) => { const u = j / 15; return [lerp(0.45, 1.0, u), lerp(0.8, 0.72, u), lerp(1.0, 0.3, u)]; };
function chipFrame(t, vp, cam, labels) {
  const C = B.chip; const d = []; const SP = W.STAGE_SP; const nH = halvings(t);
  for (let k = 1; k <= 15; k++) {
    const x = k * SP, tk = HALF_T[k - 1]; const fired = t >= tk; const fl = fired ? Math.exp(-(t - tk) / 0.22) : 0;
    pushInst(d, [x, 2.03, 0], [4.2, 0.08, 4.2], fired ? [1.0, 0.75, 0.35] : [0.3, 0.55, 1.0], 2, Q0, 0, 0.5, [(fired ? 1.6 : 0.7) + 6 * fl, 0, 0, 0]);
    for (const sz of [-1, 1]) pushInst(d, [x, 1.0, sz * 2.53], [5.06, 0.25, 0.06], fired ? [1.0, 0.75, 0.35] : [0.3, 0.55, 1.0], 2, Q0, 0, 0.5, [(fired ? 1.2 : 0.5) + 3 * fl, 0, 0, 0]);
    
  }
  const v = 34;
  for (let j = 0; j <= 15; j++) {
    if (j > 0 && t < HALF_T[j - 1]) continue;
    const xa = j === 0 ? -9 : j * SP + 2.6, xb = j === 15 ? 15 * SP + 30 : (j + 1) * SP - 2.6;
    const start = j === 0 ? 0 : HALF_T[j - 1]; const sp = 0.34 * Math.pow(2, j); const run = (t - start) * v;
    const col = SEGCOL(j);
    if (j === 15) { const x = xa + Math.min(run, xb - xa); if (run < xb - xa + 2) pushInst(d, [x, 0.4, 0], [1.8, 0.5, 0.9], [1.0, 0.85, 0.5], 2, Q0, 0, 0.5, [9, 0, 0, 0]); continue; }
    for (let m = 0; m < 80; m++) { const x = xa + run - m * sp; if (x < xa) break; if (x > xb) continue;
      pushInst(d, [x, 0.24, 0], [0.55, 0.22, 0.8], col, 2, Q0, 0, 0.5, [6, 0, 0, 0]); }
  }
  const n = Math.min(C.dyn.cap, d.length / 20); C.dyn.buf.set(d.length > C.dyn.cap * 20 ? d.slice(0, C.dyn.cap * 20) : d); E.updateBatch(C.dyn, C.dyn.buf, n);
  // "÷2" labels over the next stages in view
  const fx = focusX(t); let li = 0;
  for (let k = 1; k <= 15 && li < 5; k++) { const x = k * SP; if (x < fx - 3 || x > fx + 40) continue;
    const p = project(vp, [x, 4.2, 0]); if (!p) continue; const fired = t >= HALF_T[k - 1];
    labels.push({ x: p[0], y: p[1], txt: '÷2', a: fired ? 0.55 : 1, small: 0 }); li++; }
  // coil at the end lights when the last pulse arrives
  const arr = HALF_T[14] + (15 * SP + 22 - (15 * SP + 2.6)) / v;
  const cg = t > arr ? 3.5 * Math.exp(-(t - arr) / 0.5) : 0;
  const cy = []; pushInst(cy, [15 * SP + 26, 1.8, 0], [3.2, 7.0, 3.2], W.COPPER, 19, qz(-Math.PI / 2), 0, 0.25, [3, 0.9, 40, cg]); E.updateBatch(C.coil, new Float32Array(cy), 1);
  return [C.ground, C.statics, C.coil, C.dyn];
}

// ================= the fountain lab =================
const TOSS = [39.25, 42.0], TOSS_D = 1.6, APEX = 1.35;
function ballY(t) { for (const t0 of TOSS) if (t >= t0 && t < t0 + TOSS_D) { const u = (t - t0) / TOSS_D; return W.FOUNT.chamber[1] + APEX * 4 * u * (1 - u); } return W.FOUNT.chamber[1]; }
function labFrame(t, shot, cam, vp, labels) {
  const L = B.lab; const C0 = W.FOUNT.chamber;
  // cutaway shields open toward the camera
  const away = norm([-(cam.pos[0]), 0, -(cam.pos[2])]); const phi = Math.atan2(away[0], away[2]) - Math.PI / 2;
  const h = []; pushInst(h, [0, W.FOUNT.shield0, 0], [0.46, 2.92 - W.FOUNT.shield0, 0.46], [0.5, 0.51, 0.53], 19, qy(-phi), 0, 0.4, [2, 0.6, 0, 0]);
  pushInst(h, [0, W.FOUNT.shield0 + 0.05, 0], [0.38, 2.82 - W.FOUNT.shield0, 0.38], [0.66, 0.67, 0.69], 19, qy(-phi), 0, 0.3, [2, 0.6, 0, 0]);
  E.updateBatch(L.shields, new Float32Array(h), 2);
  const d = [], s = [];
  // cooling lasers into the chamber (drawn visible; the real light is near-infrared)
  const lz = 1.0 + 0.25 * Math.sin(t * 13);
  for (const src of L.LASER_SRC) pushBar(d, src, C0, 0.012, [1.0, 0.16, 0.1], 2, 0, 0.5, [5 * lz, 0, 0, 0]);
  // launch beam during a toss
  for (const t0 of TOSS) { const k = t >= t0 - 0.1 && t < t0 + 0.25 ? Math.sin(clamp((t - t0 + 0.1) / 0.35, 0, 1) * Math.PI) : 0;
    if (k > 0) pushBar(d, [0, 0.95, 0], [0, 2.9, 0], 0.016, [1.0, 0.3, 0.2], 2, 0, 0.5, [6 * k, 0, 0, 0]); }
  // the ball of cesium atoms
  const by = ballY(t); const R = W.rng(5); const spread = 0.022 + 0.02 * Math.max(0, (by - C0[1]) / APEX);
  if (shot.name !== 'E_cesium') for (let i = 0; i < 140; i++) { const g = () => (R() + R() + R() - 1.5) * 0.8;
    const p = [g() * spread, by + g() * spread, g() * spread]; pushInst(s, p, [0.007, 0.007, 0.007], [0.75, 0.6, 1.0], 2, Q0, 0, 0.5, [6 + 4 * R(), 0, 0, 0]); }
  // E_cesium: a stylized cesium atom (nucleus + orbits + one bright outer electron) and the microwave "ticks" rippling out
  if (shot.name === 'E_cesium') {
    const A = [0, 1.18, 0]; const RN = W.rng(9);
    for (let i = 0; i < 46; i++) { const z = RN() * 2 - 1, ph = RN() * 6.283, rr = Math.cbrt(RN()) * 0.024; const q = Math.sqrt(1 - z * z);
      pushInst(s, [A[0] + q * Math.cos(ph) * rr, A[1] + z * rr, A[2] + q * Math.sin(ph) * rr], [0.014, 0.014, 0.014], i % 2 ? [0.9, 0.25, 0.2] : [0.55, 0.62, 0.75], i % 2 ? 2 : 0, Q0, 0, 0.4, [i % 2 ? 0.9 : 0, 0, 0, 0]); }
    const orbits = [[0.075, 0.3, 0.2], [0.11, -0.5, 1.1], [0.15, 0.9, 2.3]];
    for (const [r0, tilt, yaw] of orbits) { const qo = quatMul(qy(yaw + t * 0.25), qx(tilt));
      for (let k = 0; k < 40; k++) { const a0 = k / 40 * 6.2832, a1 = (k + 1) / 40 * 6.2832;
        pushBar(d, V3.add(A, qrot(qo, [Math.cos(a0) * r0, 0, Math.sin(a0) * r0])), V3.add(A, qrot(qo, [Math.cos(a1) * r0, 0, Math.sin(a1) * r0])), 0.0016, [0.4, 0.7, 1.0], 2, 0, 0.5, [1.6, 0, 0, 0]); }
      const ae = t * (3.2 / r0 * 0.1) + yaw * 3; pushInst(s, V3.add(A, qrot(qo, [Math.cos(ae) * r0, 0, Math.sin(ae) * r0])), [0.011, 0.011, 0.011], [0.6, 0.85, 1.0], 2, Q0, 0, 0.5, [8, 0, 0, 0]); }
    for (let w = 0; w < 4; w++) { const ph = ((t * 1.6 + w / 4) % 1); const rr = 0.05 + ph * 0.34; const a = (1 - ph) * 1.6;
      for (let k = 0; k < 48; k++) { const a0 = k / 48 * 6.2832, a1 = (k + 1) / 48 * 6.2832;
        pushBar(d, [A[0] + Math.cos(a0) * rr, A[1], A[2] + Math.sin(a0) * rr], [A[0] + Math.cos(a1) * rr, A[1], A[2] + Math.sin(a1) * rr], 0.0022, [1.0, 0.75, 0.35], 2, 0, 0.5, [a, 0, 0, 0]); } }
  }
  const n1 = Math.min(L.dyn.cap, d.length / 20); L.dyn.buf.set(d.slice(0, n1 * 20)); E.updateBatch(L.dyn, L.dyn.buf, n1);
  const n2 = Math.min(L.dynS.cap, s.length / 20); L.dynS.buf.set(s.slice(0, n2 * 20)); E.updateBatch(L.dynS, L.dynS.buf, n2);
  if (shot.name === 'E_since' || shot.name === 'E_fountain') { const p = project(vp, [0.12, by + 0.06, 0]); if (p && by > C0[1] + 0.15) labels.push({ x: p[0] + 150, y: p[1], txt: 'CESIUM ATOMS', a: 1, small: 1 }); }
  if (shot.name === 'E_twist') { const p = project(vp, [0.9, 1.15, 0]); if (p) labels.push({ x: p[0], y: p[1] - 40, txt: 'LASERS', a: sm(34.3, 34.7, t), small: 1 }); }
  const bs = [L.boxes, L.bars, L.shields, L.dyn, L.dynS, L.cyls];
  if (shot.name !== 'E_cesium') bs.push(L.chamber, L.chamberC);
  return bs;
}

// ================= dusk, 100 million years ago =================
function duskFrame(t) {
  const D = B.dusk; const X = lerp(-9, -2.5, (t - 44.6) / 3.8);
  const { sph, leg } = W.dinoInstances(t, X);
  // the little fountain clock in the ferns, glowing
  const C = [-4.4, 0, 3.6]; const gl = 2.2 + 0.6 * Math.sin(t * 6);
  pushInst(sph, [C[0], 1.42 + 0.25 * Math.abs(Math.sin(t * 2.1)), C[2]], [0.09, 0.09, 0.09], [0.75, 0.6, 1.0], 2, Q0, 0, 0.5, [9, 0, 0, 0]);
  const legs = leg; pushInst(legs, [C[0], 0.35, C[2]], [0.5, 0.7, 0.5], [0.5, 0.51, 0.53], 0, Q0, 0, 0.4, [0, 0, 0, 0]);
  pushInst(legs, [C[0], 1.3, C[2]], [0.16, 1.3, 0.16], [0.62, 0.63, 0.66], 0, Q0, 0, 0.3, [0, 0, 0, 0]);
  pushInst(legs, [C[0], 2.0, C[2]], [0.3, 0.1, 0.3], [0.62, 0.63, 0.66], 0, Q0, 0, 0.3, [0, 0, 0, 0]);
  for (const k of [0.8, 1.1, 1.4, 1.7]) pushInst(legs, [C[0], k, C[2]], [0.2, 0.025, 0.2], [0.5, 0.75, 1.0], 2, Q0, 0, 0.5, [gl, 0, 0, 0]);
  D.dino.kinds = [0, 2]; D.dinoL.kinds = [0, 2];
  const n1 = Math.min(D.dino.cap, sph.length / 20); D.dino.buf.set(sph.slice(0, n1 * 20)); E.updateBatch(D.dino, D.dino.buf, n1);
  const n2 = Math.min(D.dinoL.cap, legs.length / 20); D.dinoL.buf.set(legs.slice(0, n2 * 20)); E.updateBatch(D.dinoL, D.dinoL.buf, n2);
  return [D.boxes, D.cones, D.cyls, D.dino, D.dinoL];
}

// ================= cameras =================
function hookPose(a, d, el) { return [Math.sin(a) * d * Math.cos(el), 6 + d * Math.sin(el), Math.cos(a) * d * Math.cos(el)]; }
function camera(shot, t, st) {
  const u = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1), e = ez(u);
  switch (shot.name) {
    case 'H_hook': return { pos: hookPose(lerp(-0.24, 0.04, e), lerp(134, 112, e), lerp(0.86, 0.92, e)), tgt: [0, 6, -3], fov: 40, near: 1, far: 3000 };
    case 'A_flip': { const k = sm(4.3, 5.0, t); const p = mixv(mixv([10, 168, 66], [2, 150, 48], e), [0, 96, 40], k); return { pos: p, tgt: mixv(mixv([0, 14, -2], [0, 12, 0], e), [0, 9, 2], k), fov: 42, near: 1, far: 3000 }; }
    case 'A_explode': return { pos: mixv([0, 96, 40], [44, 42.5, 49], e), tgt: mixv([0, 9, 2], [-2, 28.5, 1], e), fov: 48, near: 1, far: 3000 };
    case 'B_can': { const C = canW(st, [3.2, 0, 0]); const P0 = [44, 42.5, 49], P2 = V3.add(C, [-6.5, 8.5, 13.5]); const P1 = [10, 52, 34];
      const k = e; const pos = P0.map((v, i) => (1 - k) * (1 - k) * v + 2 * (1 - k) * k * P1[i] + k * k * P2[i]);
      return { pos, tgt: mixv([-2, 28.5, 1], C, ez(Math.min(1, u * 1.3))), fov: 42, near: 0.2, far: 3000 }; }
    case 'B_open': { const ax = canAxis(st), pp = [-ax[2], 0, ax[0]]; const C = canW(st, [lerp(3.2, 3.4, e), 0, 0]);
      const pos = V3.add(C, V3.add([0, lerp(15.5, 11.5, e), 0], V3.add(V3.scale(ax, -lerp(5.5, 3.5, e)), V3.scale(pp, lerp(-2.0, 1.0, e)))));
      return { pos, tgt: C, up: ax, fov: 40, near: 0.2, far: 3000 }; }
    case 'B_zap': { const ax = canAxis(st), pp = [-ax[2], 0, ax[0]]; const F = canW(st, [3.5, 0, 0]);
      const pos = V3.add(F, V3.add([0, lerp(8.4, 7.4, e), 0], V3.add(V3.scale(ax, -2.2), V3.scale(pp, lerp(1.4, -0.6, e)))));
      return { pos, tgt: V3.add(F, V3.scale(ax, 0.2)), up: ax, fov: 40, near: 0.1, far: 2000 }; }
    case 'B_count': { const ax = canAxis(st), pp = [-ax[2], 0, ax[0]]; const F = canW(st, [3.7, 0, 0]);
      const pos = V3.add(F, V3.add([0, lerp(8.0, 7.2, e), 0], V3.add(V3.scale(ax, -1.6), V3.scale(pp, lerp(-1.8, -0.8, e)))));
      return { pos, tgt: V3.add(F, V3.scale(ax, 0.4)), up: ax, fov: 40, near: 0.1, far: 2000 }; }
    case 'C_why': { const fx = focusX(t); return { pos: [fx - lerp(30, 20, e), lerp(13, 7.5, e), lerp(3, 0.8, e)], tgt: [fx + 34, 0, 0], fov: 52, near: 0.3, far: 2000 }; }
    case 'C_half1': { const fx = focusX(t); return { pos: [fx - 9, 7.5, 9.5], tgt: [fx + 13, 0.5, -1.5], fov: 52, near: 0.3, far: 2000 }; }
    case 'C_half2': { const fx = focusX(t); return { pos: [fx - 9, 1.9, 3.2], tgt: [fx + 32, 1.6, -0.6], fov: 58, near: 0.3, far: 2000 }; }
    case 'C_half3': { const fx = focusX(t); return { pos: [fx - 5, lerp(24, 19, e), 0.01], tgt: [fx + 7, 0, 0], up: [1, 0, 0], fov: 55, near: 0.3, far: 2000 }; }
    case 'D_tick': return { pos: mixv([24, 42, 33], [19, 35, 27], e), tgt: [5.4, 8.3, 4.6], fov: 38, near: 0.5, far: 3000 };
    case 'D_gears': return { pos: mixv([20, 48, 46], [11, 41, 39], e), tgt: [0, 7.4, 0], fov: 36, near: 0.5, far: 3000 };
    case 'E_twist': { const a = lerp(0.8, 0.55, e), r = lerp(3.6, 3.15, e); return { pos: [Math.sin(a) * r, lerp(1.75, 1.95, e), Math.cos(a) * r], tgt: [0, 1.85, 0], fov: 52, near: 0.05, far: 200 }; }
    case 'E_cesium': { const a = lerp(0.35, -0.05, e); const r = lerp(0.62, 0.5, e); return { pos: [Math.sin(a) * r, 1.24, Math.cos(a) * r], tgt: [0, 1.17, 0], fov: 40, near: 0.01, far: 200 }; }
    case 'E_since': return { pos: mixv([0.45, 1.95, 1.95], [0.3, 2.0, 1.7], e), tgt: [0, 2.05, 0], fov: 56, near: 0.02, far: 200 };
    case 'E_fountain': { const by = ballY(t); const y = lerp(1.25, by, 0.85) ; return { pos: [0.62, y + 0.12, 0.78], tgt: [0, y, 0], fov: 46, near: 0.02, far: 200 }; }
    case 'P_dino1': return { pos: mixv([-9.5, 1.7, 14], [-8, 1.85, 13], e), tgt: [1.5, 6.2, -16], fov: 52, near: 0.1, far: 6000 };
    case 'P_dino2': return { pos: mixv([-1.0, 1.05, 9.6], [-1.7, 1.12, 8.9], e), tgt: [-4.3, 1.35, 3.4], fov: 42, near: 0.05, far: 6000 };
    case 'F_back': return { pos: mixv([-34, 64, 72], [-14, 50, 52], e), tgt: [0, 7, -1], fov: 38, near: 0.5, far: 3000 };
    default: { // F_end: ease back to the hook's first framing so the video loops
      const p0 = [-14, 50, 52], p1 = hookPose(-0.24, 134, 0.86); return { pos: mixv(p0, p1, ez(sm(0, 0.85, u))), tgt: mixv([0, 7, -1], [0, 6, -3], ez(sm(0, 0.85, u))), fov: 40, near: 1, far: 3000 };
    }
  }
}

// ================= per-frame state =================
const SKY0 = { moonDir: norm([0.3, 0.5, -0.8]), moonCol: [1, 0.97, 0.9], moonAmt: 0, sunDir: [0, -1, 0], sunCol: [1, 0.9, 0.75], sunAmt: 0, stars: 0, glowCol: [0, 0, 0], glowDir: [0, 0, -1], glowAmt: 0, bgMode: 1, bgPow: 0.6, sfl: [0, 1, 0, 0] };
export function frameState(t) {
  const shot = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const st = shot.set === 'W' ? watchState(t, shot) : null;
  const cam = camera(shot, t, st);
  const camF = { pos: cam.pos, target: cam.tgt, fov: cam.fov, near: cam.near || 0.5, far: cam.far || 5000, up: cam.up };
  const vp = E.viewProj(camF);
  const labels = []; let batches = [], S;
  let counter = null;
  if (shot.set === 'W') {
    if (shot.name === 'B_count' || shot.name === 'B_zap') st.hide = [5];
    const ex = watchExtras(st, shot, t);
    batches = [B.table, ...B.watch.emit(watchXf(st), ex)];
    if (shot.name === 'A_explode' && t > 6.0) {
      const a = sm(6.05, 6.45, t);
      const pb = project(vp, wl(st, [-7, 1.7, 4.4], 5)); if (pb && pb[1] > 110) labels.push({ x: pb[0], y: pb[1] + 85, txt: 'BATTERY', a: a * sm(110, 170, pb[1]), small: 1, ymin: 150 });
      const pc = project(vp, wl(st, W.COIL_C, 3)); if (pc) labels.push({ x: pc[0] - 130, y: pc[1] + 10, txt: 'COIL', a, small: 1 });
      const pg = project(vp, wl(st, [5.4, 2.0, 6.9], 2)); if (pg) labels.push({ x: pg[0] + 40, y: pg[1] + 70, txt: 'GEARS', a, small: 1 });
    }
    if (shot.name === 'B_can') { const pq = project(vp, V3.add(canW(st, [3.2, 0, 0]), [0, 2.0, 0])); if (pq) labels.push({ x: pq[0], y: pq[1] - 70, txt: 'QUARTZ CRYSTAL', a: sm(8.6, 9.0, t), small: 1 }); }
    const key = norm([-0.55, 0.78, -0.3]);
    const down = DOWN_SHOTS.includes(shot.name);
    S = {
      sky: { ...SKY0, zen: [0.012, 0.013, 0.02], hor: [0.006, 0.006, 0.009], bgMode: 1, bgPow: 0.3 },
      light: { dir: key, col: [1.75, 1.62, 1.48] }, amb: { sky: [0.05, 0.056, 0.075], gnd: [0.03, 0.022, 0.016] },
      fog: { col: [0.004, 0.004, 0.006], den: 0.0011, h: 400 }, envMode: 1, envTint: [1, 1, 1],
      shadow: { center: down ? [0, 20, 0] : [0, 6, 0], radius: down ? 75 : 62, bias: 0.12, dist: 320 },
      pls: [{ p: [-70, 55, -80], c: [1.0, 0.7, 0.42], i: 1.4, r: 320 }, { p: [90, 35, 50], c: [0.5, 0.65, 1.0], i: 0.9, r: 260 }],
      post: { exposure: 1.05, bloom: 0.45, thr: 1.35, vig: 0.42, grain: 0.022, lift: [0.004, 0.004, 0.007], gain: [1, 1, 1.01], sat: 1.06 },
    };
    if (['B_open', 'B_zap', 'B_count'].includes(shot.name)) { const F = canW(st, [3.6, 0, 0]); S.pls.push({ p: V3.add(F, [0, 3, 0]), c: [0.55, 0.75, 1.0], i: 0.6 + 0.6 * st.quartzGlow, r: 14 }); S.shadow = { center: F, radius: 9, bias: 0.02, dist: 60 }; }
    if (shot.name === 'D_tick') S.pls.push({ p: wl(st, W.COIL_C, 3), c: [0.4, 0.65, 1.0], i: st.coilGlow * 0.6, r: 20 });
    if (shot.name === 'B_count') counter = { kind: 'count' };
  } else if (shot.set === 'C') {
    batches = chipFrame(t, vp, camF, labels);
    S = {
      sky: { ...SKY0, zen: [0.004, 0.008, 0.02], hor: [0.01, 0.02, 0.045], bgMode: 0, glowCol: [0.05, 0.12, 0.3], glowAmt: 0.6, glowDir: [1, 0, 0] },
      light: { dir: norm([0.3, 0.85, 0.4]), col: [0.55, 0.62, 0.8] }, amb: { sky: [0.03, 0.04, 0.07], gnd: [0.01, 0.012, 0.02] },
      fog: { col: [0.008, 0.016, 0.04], den: 0.012, h: 60 }, envMode: 1, envTint: [0.5, 0.6, 0.9], shadow: null, pls: [],
      post: { exposure: 1.1, bloom: 0.6, thr: 1.2, vig: 0.4, grain: 0.022, lift: [0.004, 0.006, 0.012], gain: [1, 1, 1.02], sat: 1.08 },
    };
    const fx = focusX(t); S.pls.push({ p: [fx + 4, 6, 3], c: [0.5, 0.7, 1.0], i: 1.2, r: 30 });
  } else if (shot.set === 'A') {
    batches = labFrame(t, shot, camF, vp, labels);
    S = {
      sky: { ...SKY0, zen: [0.01, 0.012, 0.02], hor: [0.006, 0.006, 0.01], bgMode: 1, bgPow: 0.75 },
      light: { dir: norm([0.25, 0.9, 0.35]), col: [0.75, 0.8, 0.95] }, amb: { sky: [0.035, 0.04, 0.06], gnd: [0.015, 0.012, 0.012] },
      fog: { col: [0.006, 0.006, 0.01], den: 0.035, h: 10 }, envMode: 1, envTint: [0.55, 0.55, 0.62],
      shadow: { center: [0, 1.2, 0], radius: 2.2, bias: 0.004, dist: 8 },
      pls: [{ p: [0.0, 1.15, 0.45], c: [1.0, 0.25, 0.15], i: 0.8, r: 2.0 }, { p: [1.5, 2.4, 1.6], c: [0.6, 0.7, 1.0], i: 0.9, r: 6 }, { p: [0, ballY(t), 0.15], c: [0.7, 0.55, 1.0], i: 0.6, r: 1.0 }],
      post: { exposure: 1.1, bloom: 0.55, thr: 1.25, vig: 0.42, grain: 0.022, lift: [0.004, 0.004, 0.008], gain: [1, 1, 1.02], sat: 1.06 },
    };
  } else {
    batches = duskFrame(t);
    const sun = norm([0.5, 0.06, -0.86]);
    S = {
      sky: { ...SKY0, zen: [0.03, 0.035, 0.09], hor: [0.8, 0.33, 0.11], bgMode: 0, glowCol: [0.9, 0.36, 0.1], glowDir: norm([sun[0], 0, sun[2]]), glowAmt: 1.1, sunDir: sun, sunCol: [1.0, 0.62, 0.3], sunAmt: 1.3, stars: 0.05 },
      light: { dir: sun, col: [1.1, 0.6, 0.3] }, amb: { sky: [0.08, 0.06, 0.09], gnd: [0.04, 0.025, 0.015] },
      fog: { col: [0.5, 0.24, 0.1], den: 0.0024, h: 60 }, envMode: 0, envTint: [1, 1, 1], shadow: null,
      pls: [{ p: [-4.4, 1.5, 3.6], c: [0.6, 0.6, 1.0], i: 1.6, r: 6 }],
      post: { exposure: 1.0, bloom: 0.55, thr: 1.2, vig: 0.45, grain: 0.024, lift: [0.006, 0.004, 0.006], gain: [1.02, 1, 0.98], sat: 1.05 },
    };
  }
  S.time = t; S.batches = batches; S.restore = 1; S.carPow = 1; S.skinCut = 0; S.copper = 1; S.day = 0; S.water = null;
  S.post.glitch = 0; S.post.flash = 0; S.post.fade = 1;
  // a white pop on the big moments
  for (const [tf, a] of [[HALF_T[14], 0.12], [28.5, 0.1], [36.45, 0.08]]) if (t >= tf && t < tf + 0.2) S.post.flash = Math.max(S.post.flash, a * (1 - (t - tf) / 0.2));
  window.__frame = { labels, shot: shot.name, set: shot.set, halvings: halvings(t) };
  return { S, cam: camF, shot };
}

export function renderAt(t) {
  const { S, cam, shot } = frameState(t);
  E.render(S, cam);
  hudAt(t, window.__frame);
  E.finish();
  return shot.name;
}
