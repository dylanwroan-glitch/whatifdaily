// world2.js — objects for "5 lightning facts, only 1 is true" (all original, procedural)
import { V3, quatFromTo, quatAxis, quatMul, meshBox, meshFace, meshLathe, meshSphere, pushInst, pushBar } from './engine.js';

export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;

// plate: box whose long axis runs A->B (in a plane containing z), with given thickness and width (z)
function pushPlate(a, A, B, thick, width, col, kind = 0, rough = 0.5, e = [0, 0, 0, 0]) {
  const d = V3.sub(B, A), L = V3.len(d); const q = quatFromTo([0, 1, 0], V3.scale(d, 1 / L));
  pushInst(a, V3.scale(V3.add(A, B), 0.5), [thick, L, width], col, kind, q, 0, rough, e);
}
function puff(a, p, s, col, seed, glow = 1, ns = 1, under = 0.55) {
  pushInst(a, p, s, col, 13, undefined, seed, 0.9, [glow, ns, under, 0]);
}

// ---------------- storm deck (overcast cloud layer) ----------------
export function buildDeck(E, cx, cz, radius, y0, y1, n, seed, col = [0.07, 0.075, 0.09]) {
  const sph = E.mesh('sphere', () => meshSphere(12, 16)); const R = rng(seed); const a = [];
  for (let k = 0; k < n; k++) {
    const r = Math.sqrt(R()) * radius, ang = R() * Math.PI * 2;
    const s = 260 + R() * 420; const y = lerp(y0, y1, R());
    puff(a, [cx + Math.cos(ang) * r, y, cz + Math.sin(ang) * r], [s * 1.6, s * 0.55, s * 1.6], col.map(v => v * (0.8 + 0.4 * R())), R() * 10, 1, 0.9, 0.6);
  }
  const b = E.batch(sph, new Float32Array(a)); b.shadow = false; return b;
}

// ---------------- the tower + night city ----------------
export const TOWER_TIP = [0, 446, 0];
export const CITY_ROAD = { AS: 170, AW: 26, SS: 100, SW: 18, org: [85, 50] };
export function buildTowerCity(E) {
  const box = E.mesh('box', meshBox); const R = rng(311);
  const bld = [], det = [], gnd = [];
  const STONE = [0.31, 0.295, 0.27];
  const tiers = [[0, 26, 112, 72], [26, 186, 64, 52], [212, 64, 54, 44], [276, 44, 46, 37], [320, 28, 36, 30], [348, 24, 26, 24]];
  for (const [y0, h, w, d] of tiers) pushInst(bld, [0, y0 + h / 2, 0], [w, h, d], STONE, 1, undefined, 7, 0.75, [1.05, 1.7, 2.6, y0]);
  // setback ledges
  for (const [y0, h, w, d] of tiers.slice(1)) pushInst(det, [0, y0 + 0.6, 0], [w + 2.4, 1.2, d + 2.4], STONE.map(v => v * 0.8), 0, undefined, 0, 0.8);
  // floodlit crown + mast
  pushInst(det, [0, 361, 0], [26.6, 22, 24.6], [1.0, 0.78, 0.5], 2, undefined, 0, 0.5, [0.42, 0, 0, 0]);
  const mast = E.mesh('mast', () => meshLathe([[6.0, 0], [5.0, 8], [3.2, 20], [2.4, 38], [1.5, 40], [1.2, 58], [0.55, 60], [0.35, 74]], 16));
  const mastA = []; pushInst(mastA, [0, 372, 0], [1, 1, 1], [0.42, 0.43, 0.46], 0, undefined, 0, 0.4);
  // aviation lights
  pushInst(det, [0, 446.6, 0], [1.4, 1.4, 1.4], [1.0, 0.06, 0.04], 2, undefined, 0, 0.5, [14, 31.7, 3, 0]);
  pushInst(det, [0, 411, 0], [1.2, 1.2, 1.2], [1.0, 0.06, 0.04], 2, undefined, 0, 0.5, [10, 12.3, 3, 0]);
  // city blocks
  const PAL = [[0.20, 0.21, 0.23], [0.25, 0.19, 0.15], [0.14, 0.17, 0.22], [0.29, 0.27, 0.24], [0.11, 0.11, 0.12], [0.22, 0.23, 0.26]];
  let seed = 20;
  for (let i = -8; i <= 8; i++) for (let j = -14; j <= 14; j++) {
    if (i === 0 && j === 0) continue;
    const cx = i * CITY_ROAD.AS, cz = j * CITY_ROAD.SS; const hx = 66, hz = 36;
    const far = Math.hypot(cx, cz);
    const n = 1 + ((R() * 2.6) | 0); let x = cx - hx;
    for (let k = 0; k < n; k++) {
      const w = k === n - 1 ? cx + hx - x : (2 * hx / n) * (0.75 + 0.5 * R());
      let h = 22 + Math.pow(R(), 2.0) * 150; if (R() < 0.1) h = 160 + R() * 120; if (far < 400) h *= 0.75;
      const col = PAL[(R() * 6) | 0].map(v => v * (0.85 + 0.3 * R()));
      const dd = 2 * hz * (0.8 + 0.2 * R());
      pushInst(bld, [x + w / 2, h / 2, cz], [w - 1.2, h, dd], col, 1, undefined, seed++, 0.75, [0.6 + 0.55 * R(), 1.55 * (0.7 + 0.6 * R()), R() < 0.4 ? 2.5 : 3.2, 0]);
      if (h > 150) pushInst(det, [x + w / 2, h + 1, cz], [1.3, 1.3, 1.3], [1.0, 0.07, 0.05], 2, undefined, 0, 0.5, [9, seed, 3, 0]);
      x += w;
    }
  }
  pushInst(gnd, [0, -0.5, 0], [7000, 1.0, 7000], [0.07, 0.07, 0.07], 10, undefined, 0, 0.9);
  const b = { buildings: E.batch(box, new Float32Array(bld)), details: E.batch(box, new Float32Array(det)), ground: E.batch(box, new Float32Array(gnd)), mast: E.batch(mast, new Float32Array(mastA)) };
  b.details.shadow = false; b.ground.shadow = false; b.mast.shadow = false; b.buildings.shadow = false;
  b.deck = buildDeck(E, 0, 0, 5200, 720, 980, 170, 5);
  return b;
}

// ---------------- the car on a wet road ----------------
const PAINT = [0.42, 0.035, 0.03], GLASS = [0.012, 0.014, 0.018], TIRE = [0.03, 0.03, 0.032], RIM = [0.62, 0.64, 0.68];
export const CAR_FRAME = []; // [A, B] segments of the steel frame (car local coords)
{
  const S = [-1, 1];
  for (const s of S) {
    const z = 0.8 * s, zb = 0.92 * s;
    CAR_FRAME.push([[0.45, 1.47, z], [-1.05, 1.47, z]]);            // roof rail
    CAR_FRAME.push([[0.45, 1.47, z], [1.02, 0.95, zb]]);            // A pillar
    CAR_FRAME.push([[-0.3, 1.47, z], [-0.3, 0.95, zb]]);            // B pillar
    CAR_FRAME.push([[-1.05, 1.47, z], [-1.58, 0.95, zb]]);          // C pillar
    CAR_FRAME.push([[2.3, 0.95, zb], [-2.3, 0.95, zb]]);            // beltline
    CAR_FRAME.push([[2.3, 0.95, zb], [2.33, 0.36, zb]]);            // front corner
    CAR_FRAME.push([[-2.3, 0.95, zb], [-2.33, 0.36, zb]]);          // rear corner
    CAR_FRAME.push([[2.33, 0.36, zb], [-2.33, 0.36, zb]]);          // sill
    CAR_FRAME.push([[1.0, 0.95, zb], [1.0, 0.36, zb]]);             // door front
    CAR_FRAME.push([[-1.0, 0.95, zb], [-1.0, 0.36, zb]]);           // door rear
  }
  CAR_FRAME.push([[0.45, 1.47, -0.8], [0.45, 1.47, 0.8]]); CAR_FRAME.push([[-1.05, 1.47, -0.8], [-1.05, 1.47, 0.8]]);
  CAR_FRAME.push([[-0.3, 1.47, -0.8], [-0.3, 1.47, 0.8]]);
  CAR_FRAME.push([[2.3, 0.95, -0.92], [2.3, 0.95, 0.92]]); CAR_FRAME.push([[-2.3, 0.95, -0.92], [-2.3, 0.95, 0.92]]);
}
export const CAR_STRIKE = [-0.2, 1.48, 0.1];
export const WHEELS = [[1.45, 0.34, 0.84], [1.45, 0.34, -0.84], [-1.45, 0.34, 0.84], [-1.45, 0.34, -0.84]];
export function carInstances(a, x, z, wheelAng, lightsOn = 1) {
  const P = (p) => [p[0] + x, p[1], p[2] + z];
  const GL = [0, 0, 0, 1], GG = [0.05, 0, 0, 1]; // kind 2 with w=1: glossy, no glow (paint) / faint glow (glass)
  pushInst(a, P([0, 0.62, 0]), [4.7, 0.58, 1.84], PAINT, 2, undefined, 0, 0.22, GL);
  pushInst(a, P([0, 0.36, 0]), [4.5, 0.12, 1.7], [0.02, 0.02, 0.022], 0, undefined, 0, 0.9);
  pushPlate(a, P([2.36, 0.86, 0]), P([1.0, 0.95, 0]), 0.05, 1.8, PAINT, 2, 0.2, GL);
  pushPlate(a, P([-1.58, 0.95, 0]), P([-2.36, 0.9, 0]), 0.05, 1.8, PAINT, 2, 0.2, GL);
  pushInst(a, P([-0.3, 1.2, 0]), [1.42, 0.5, 1.62], GLASS, 2, undefined, 0, 0.06, GG);
  pushPlate(a, P([1.02, 0.93, 0]), P([0.45, 1.45, 0]), 0.05, 1.6, GLASS, 2, 0.05, GG);
  pushPlate(a, P([-1.05, 1.45, 0]), P([-1.58, 0.93, 0]), 0.05, 1.6, GLASS, 2, 0.05, GG);
  pushInst(a, P([-0.3, 1.465, 0]), [1.56, 0.06, 1.6], PAINT, 2, undefined, 0, 0.2, GL);
  for (const s of [-1, 1]) {
    pushBar(a, P([0.45, 1.46, 0.8 * s]), P([1.02, 0.93, 0.86 * s]), 0.09, PAINT, 2, 0, 0.25, GL);
    pushBar(a, P([-1.05, 1.46, 0.8 * s]), P([-1.58, 0.93, 0.86 * s]), 0.11, PAINT, 2, 0, 0.25, GL);
    pushBar(a, P([-0.3, 1.46, 0.8 * s]), P([-0.3, 0.95, 0.88 * s]), 0.08, PAINT, 2, 0, 0.25, GL);
    for (const wx of [1.45, -1.45]) pushInst(a, P([wx, 0.62, 0.915 * s]), [0.86, 0.5, 0.03], [0.01, 0.01, 0.011], 0, undefined, 0, 0.9);
  }
  pushInst(a, P([2.39, 0.48, 0]), [0.1, 0.26, 1.8], [0.03, 0.03, 0.035], 0, undefined, 0, 0.5);
  pushInst(a, P([-2.39, 0.5, 0]), [0.1, 0.26, 1.8], [0.03, 0.03, 0.035], 0, undefined, 0, 0.5);
  for (const s of [-1, 1]) {
    pushInst(a, P([2.36, 0.72, 0.64 * s]), [0.06, 0.13, 0.36], [1.0, 0.95, 0.86], 2, undefined, 0, 0.5, [9 * lightsOn, 0, 0, 1]);
    pushInst(a, P([-2.36, 0.78, 0.66 * s]), [0.06, 0.12, 0.34], [1.0, 0.05, 0.03], 2, undefined, 0, 0.5, [4.5 * lightsOn, 0, 0, 1]);
  }
  return a;
}
export function wheelInstances(a, x, z, ang) {
  const q0 = quatAxis([1, 0, 0], Math.PI / 2);
  for (const w of WHEELS) {
    const q = quatMul(quatAxis([0, 0, 1], -ang), q0);
    pushInst(a, [w[0] + x, w[1], w[2] + z], [0.68, 0.24, 0.68], TIRE, 0, q, 0, 0.8);
    pushInst(a, [w[0] + x, w[1], w[2] * 1.02 + z], [0.46, 0.245, 0.46], RIM, 0, q, 0, 0.3);
    pushInst(a, [w[0] + x, w[1], w[2] * 1.035 + z], [0.12, 0.245, 0.12], [0.2, 0.2, 0.22], 0, q, 0, 0.4);
  }
  return a;
}
export function buildRoad(E) {
  const box = E.mesh('box', meshBox); const sph = E.mesh('sphere', () => meshSphere(12, 16)); const R = rng(77);
  const g = [], mk = [], lamp = [], trees = [];
  for (const s of [-1, 1]) {
    pushInst(g, [0, -0.2, s * 156], [3000, 0.5, 300], [0.035, 0.05, 0.025], 11, undefined, 0, 0.95);
    pushInst(g, [0, 0.07, s * 5.6], [3000, 0.14, 0.35], [0.22, 0.22, 0.22], 0, undefined, 0, 0.8);
    pushInst(mk, [0, 0.012, s * 4.6], [3000, 0.024, 0.14], [0.6, 0.6, 0.58], 0, undefined, 0, 0.5);
  }
  for (let x = -1500; x < 1500; x += 9) pushInst(mk, [x, 0.012, 0], [3.2, 0.024, 0.13], [0.7, 0.55, 0.12], 0, undefined, 0, 0.5);
  for (let x = -1500; x < 1500; x += 42) {
    pushInst(lamp, [x, 4.5, -7.2], [0.22, 9, 0.22], [0.06, 0.06, 0.065], 0, undefined, 0, 0.6);
    pushInst(lamp, [x, 9.0, -6.2], [0.16, 0.16, 2.0], [0.06, 0.06, 0.065], 0, undefined, 0, 0.6);
    pushInst(lamp, [x, 8.92, -5.4], [0.9, 0.14, 0.5], [1.0, 0.78, 0.5], 2, undefined, 0, 0.5, [7, 0, 0, 0]);
  }
  for (let k = 0; k < 520; k++) {
    const s = R() < 0.5 ? -1 : 1; const x = -1500 + R() * 3000, z = s * (12 + R() * 70); const r = 3 + R() * 5;
    pushInst(trees, [x, r * 0.9, z], [r * 2, r * 2.2, r * 2], [0.012, 0.022, 0.012], 0, undefined, 0, 0.95);
  }
  const b = { ground: E.batch(box, new Float32Array(g)), marks: E.batch(box, new Float32Array(mk)), lamps: E.batch(box, new Float32Array(lamp)), trees: E.batch(sph, new Float32Array(trees)) };
  for (const k of Object.keys(b)) b[k].shadow = false;
  b.deck = buildDeck(E, 0, 0, 4200, 420, 640, 130, 9);
  b.car = E.batch(box, new Float32Array(60 * 20), true); b.car.shadow = false;
  const cyl = E.mesh('cyl', () => meshLathe([[0.5, -0.5], [0.5, 0.5]], 24));
  b.wheels = E.batch(cyl, new Float32Array(16 * 20), true); b.wheels.shadow = false;
  return b;
}

// ---------------- the field, the lone tree, the storms ----------------
export const TREE = [40, 0, -30], TREE_TOP = [40, 12.5, -30];
export const STORM1 = [0, 0, -19500], RAIN1_R = 3200;       // rain edge 16.3 km (10.1 mi) from the tree
export const STORM2 = [-9000, 0, -42000];                   // far storm (heat lightning), ~27 mi away
export const HOUSE = [0, 0, 60];
export function buildField(E) {
  const box = E.mesh('box', meshBox); const sph = E.mesh('sphere', () => meshSphere(12, 16)); const R = rng(4242);
  const g = [], tree = [], fence = [], house = [];
  pushInst(g, [0, -1, -10000], [120000, 2, 120000], [0.085, 0.13, 0.045], 11, undefined, 0, 0.95);
  // lone tree
  const trunk = E.mesh('trunk', () => meshLathe([[0.55, 0], [0.42, 2.5], [0.32, 6.5], [0.2, 9.5]], 12));
  const trunkA = []; pushInst(trunkA, TREE, [1, 1, 1], [0.07, 0.05, 0.035], 0, undefined, 0, 0.9);
  for (let k = 0; k < 14; k++) { const a = R() * Math.PI * 2, r = R() * 3.2; const s = 2.6 + R() * 2.2;
    pushInst(tree, [TREE[0] + Math.cos(a) * r, 8.5 + R() * 4.0, TREE[2] + Math.sin(a) * r], [s * 2, s * 1.7, s * 2], [0.045, 0.085, 0.03].map(v => v * (0.8 + 0.4 * R())), 0, undefined, 0, 0.95); }
  // fence line near the camera
  for (let x = -90; x <= 90; x += 3.5) pushInst(fence, [x, 0.65, 14], [0.14, 1.3, 0.14], [0.16, 0.11, 0.07], 0, undefined, 0, 0.9);
  for (const y of [0.55, 1.1]) pushInst(fence, [0, y, 14], [180, 0.07, 0.05], [0.18, 0.13, 0.08], 0, undefined, 0, 0.9);
  // house (for the counting scene) + window wall around the camera
  pushInst(house, [HOUSE[0], 3, HOUSE[2] + 4], [12, 6, 9], [0.42, 0.38, 0.33], 0, undefined, 0, 0.85);
  const ra = Math.atan2(2.4, 4.9);
  for (const s of [-1, 1]) pushInst(house, [HOUSE[0], 7.25, HOUSE[2] + 4 + s * 2.45], [12.8, 0.25, 5.7], [0.2, 0.11, 0.085], 0, quatAxis([1, 0, 0], s * ra), 0, 0.8);
  pushInst(house, [HOUSE[0] - 2.5, 3.2, HOUSE[2] - 0.52], [2.4, 1.6, 0.06], [1.0, 0.72, 0.42], 2, undefined, 0, 0.5, [2.2, 0, 0, 0]);
  const b = { ground: E.batch(box, new Float32Array(g)), trunk: E.batch(trunk, new Float32Array(trunkA)), tree: E.batch(sph, new Float32Array(tree)),
    fence: E.batch(box, new Float32Array(fence)), house: E.batch(box, new Float32Array(house)) };
  b.ground.shadow = false;
  // window wall seen from inside the house (camera looks -z through it)
  const ww = []; const WZ = HOUSE[2] - 0.55, WC = [HOUSE[0] - 2.5, 3.2];
  const WALL = [0.03, 0.028, 0.026], OW = 2.6, OH = 2.2; // opening width / height
  pushInst(ww, [WC[0] - OW / 2 - 3, WC[1], WZ], [6.0, 10, 0.3], WALL, 0, undefined, 0, 0.9);
  pushInst(ww, [WC[0] + OW / 2 + 3, WC[1], WZ], [6.0, 10, 0.3], WALL, 0, undefined, 0, 0.9);
  pushInst(ww, [WC[0], WC[1] + OH / 2 + 2.5, WZ], [OW + 0.2, 5, 0.3], WALL, 0, undefined, 0, 0.9);
  pushInst(ww, [WC[0], WC[1] - OH / 2 - 2.5, WZ], [OW + 0.2, 5, 0.3], WALL, 0, undefined, 0, 0.9);
  const FR = [0.075, 0.07, 0.065];
  for (const [x, w] of [[WC[0] - OW / 2, 0.09], [WC[0] + OW / 2, 0.09], [WC[0] + 0.45, 0.06]]) pushInst(ww, [x, WC[1], WZ - 0.02], [w, OH, 0.12], FR, 0, undefined, 0, 0.7);
  for (const [y, h] of [[WC[1] - OH / 2, 0.09], [WC[1] + OH / 2, 0.09], [WC[1] + 0.72, 0.05]]) pushInst(ww, [WC[0], y, WZ - 0.02], [OW, h, 0.12], FR, 0, undefined, 0, 0.7);
  pushInst(ww, [WC[0], WC[1] - OH / 2 - 0.05, WZ + 0.22], [OW + 0.5, 0.08, 0.5], [0.055, 0.05, 0.045], 0, undefined, 0, 0.7);
  b.window = E.batch(box, new Float32Array(ww)); b.window.shadow = false;
  b.windowC = [WC[0], WC[1], WZ];
  // storm 1: towering cumulonimbus with anvil, rain shaft
  const c1 = [];
  for (let k = 0; k < 70; k++) { const h = R(); const y = 1700 + h * 8600; const rr = (1700 + h * 1900) * Math.sqrt(R()); const a = R() * Math.PI * 2;
    const s = 1500 + R() * 1500 + h * 800;
    puff(c1, [STORM1[0] + Math.cos(a) * rr, y, STORM1[2] + Math.sin(a) * rr], [s, s * 0.85, s], [0.78, 0.8, 0.84], R() * 9, 1, 0.22, 0.32); }
  for (let k = 0; k < 46; k++) { const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 8500; const x = STORM1[0] + Math.cos(a) * rr * 1.15, z = STORM1[2] + Math.sin(a) * rr * 0.7 + 1800;
    const s = 3000 + R() * 2400; puff(c1, [x, 10900 + R() * 900, z], [s * 1.5, s * 0.36, s * 1.5], [0.82, 0.84, 0.88], R() * 9, 1, 0.18, 0.85); }
  for (let k = 0; k < 26; k++) { const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 3600; const s = 1600 + R() * 1200;
    puff(c1, [STORM1[0] + Math.cos(a) * rr, 1750 + R() * 400, STORM1[2] + Math.sin(a) * rr], [s * 1.6, s * 0.45, s * 1.6], [0.34, 0.36, 0.4], R() * 9, 1, 0.3, 0.5); }
  b.storm1 = E.batch(sph, new Float32Array(c1)); b.storm1.shadow = false;
  const shaft = E.mesh('shaft', () => meshLathe([[RAIN1_R * 1.08, 0], [RAIN1_R, 900], [RAIN1_R * 0.92, 1900]], 40));
  const sh = []; pushInst(sh, STORM1, [1, 1, 1], [0.36, 0.38, 0.43], 15, undefined, 0, 0.9);
  b.rain1 = E.batch(shaft, new Float32Array(sh)); b.rain1.shadow = false;
  // storm 2: far storm for heat lightning
  const c2 = [];
  for (let k = 0; k < 60; k++) { const h = R(); const rr = (1800 + h * 2600) * Math.sqrt(R()), a = R() * Math.PI * 2; const s = 1400 + R() * 1700;
    puff(c2, [STORM2[0] + Math.cos(a) * rr, 1800 + h * 8200, STORM2[2] + Math.sin(a) * rr], [s, s * 0.8, s], [0.2, 0.21, 0.25], R() * 9, 1.4, 0.25, 0.5); }
  for (let k = 0; k < 30; k++) { const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 9000; const s = 3000 + R() * 2400;
    puff(c2, [STORM2[0] + Math.cos(a) * rr * 1.2, 10200 + R() * 800, STORM2[2] + Math.sin(a) * rr * 0.8], [s * 1.5, s * 0.34, s * 1.5], [0.2, 0.21, 0.25], R() * 9, 1.4, 0.2, 0.5); }
  b.storm2 = E.batch(sph, new Float32Array(c2)); b.storm2.shadow = false;
  // a night cloud deck near the field (twist scene)
  b.deck = buildDeck(E, 0, -2200, 6000, 900, 1300, 120, 21, [0.1, 0.105, 0.12]);
  return b;
}

// ---------------- storm impostor: one camera-facing quad with a procedural cumulonimbus ----------------
export function buildImpostor(E) {
  const b = E.batch(E.mesh('face4', () => meshFace(4)), new Float32Array(2 * 20), true);
  b.kinds = [16]; b.cut = true; b.shadow = false; b.refl = false; b.buf = new Float32Array(2 * 20); return b;
}
export function placeImpostor(E, b, c, cam, o) {
  const dx = cam[0] - c[0], dz = cam[2] - c[2]; const L = Math.hypot(dx, dz) || 1; const yaw = Math.atan2(dx, dz);
  const p = [c[0] - dx / L * (o.back || 3500), o.h / 2, c[2] - dz / L * (o.back || 3500)];
  const a = []; pushInst(a, p, [o.w, o.h, 1], o.col, 16, quatAxis([0, 1, 0], yaw), 0, 0.9, [o.glow, o.scale || 1, o.seed || 1, 0]);
  b.buf.set(a); E.updateBatch(b, b.buf, 1);
}

// ---------------- the sun (for the comparison shot) ----------------
export function buildSun(E) {
  const sph = E.mesh('sphereHi', () => meshSphere(40, 64)); const a = [];
  pushInst(a, [0, 0, 0], [1200, 1200, 1200], [1, 1, 1], 14, undefined, 0, 0.5, [2.4, 0, 0, 0]);
  const b = E.batch(sph, new Float32Array(a)); b.shadow = false; b.refl = false; return b;
}

// ---------------- lightning ----------------
function displace(R, pts, levels, rough) {
  for (let l = 0; l < levels; l++) {
    const np = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]; const d = V3.sub(b, a); const L = V3.len(d); const dn = V3.scale(d, 1 / L);
      let r = [R() - 0.5, R() - 0.5, R() - 0.5]; r = V3.sub(r, V3.scale(dn, V3.dot(r, dn)));
      np.push(V3.add(V3.lerp(a, b, 0.5 + (R() - 0.5) * 0.12), V3.scale(r, L * rough * 1.7)), b);
    }
    pts = np;
  }
  return pts;
}
export function genBolt(seed, A, B, opt = {}) {
  if (opt.via) { // long bolt: a far section to the via point, then a steep, finely detailed descent
    const g1 = genBolt(seed, A, opt.via, { ...opt, via: null }), g2 = genBolt(seed + 1000, opt.via, B, { ...opt, via: null, levels: opt.levels2 ?? 7, rough: opt.rough2 ?? 0.24, branches: 4 });
    const k = opt.split ?? 0.65;
    return { segs: [...g1.segs.map(s => ({ ...s, d0: s.d0 * k })), ...g2.segs.map(s => ({ ...s, d0: k + s.d0 * (1 - k) }))], A, B, pts: [...g1.pts, ...g2.pts.slice(1)] };
  }
  const R = rng(seed * 7919 + 13); const pts = displace(R, [A, B], opt.levels ?? 6, opt.rough ?? 0.2);
  const n = pts.length - 1; const segs = [];
  for (let i = 0; i < n; i++) segs.push({ a: pts[i], b: pts[i + 1], w: 1, i: 1, d0: i / n, br: 0 });
  const L = V3.len(V3.sub(B, A)); const mainDir = V3.norm(V3.sub(B, A));
  const nb = opt.branches ?? 6;
  for (let k = 0; k < nb; k++) {
    const si = Math.floor((0.06 + R() * 0.62) * n); const st = pts[si];
    const dir = V3.norm(V3.add(mainDir, [(R() - 0.5) * 1.7, (R() - 0.35) * 0.5, (R() - 0.5) * 1.7]));
    const en = V3.add(st, V3.scale(dir, L * (0.1 + R() * 0.2)));
    const bp = displace(R, [st, en], 4, 0.22); const m = bp.length - 1; const bi = 0.35 + R() * 0.3;
    for (let i = 0; i < m; i++) segs.push({ a: bp[i], b: bp[i + 1], w: 0.6 * (1 - 0.5 * i / m), i: bi * (1 - 0.6 * i / m), d0: si / n + (i / m) * 0.22, br: 1 });
  }
  return { segs, A, B, pts };
}
export function strikeEnv(dt) {
  if (dt < 0 || dt > 0.7) return 0;
  if (dt < 0.06) return 0.22 * dt / 0.06;
  let e = 0;
  for (const [p, a] of [[0.06, 1.0], [0.16, 0.72], [0.28, 0.45]]) if (dt >= p) e += a * Math.exp(-(dt - p) / 0.045);
  e += 0.14 * Math.max(0, 1 - (dt - 0.06) / 0.55);
  return e;
}
// push a bolt's bars for time dt after its start; widths keep a roughly constant on-screen size
export function pushBolt(a, bolt, dt, cam, o) {
  const env = o.hold ? o.hold : strikeEnv(dt); if (env <= 0.002) return 0;
  const lead = o.hold ? 1 : clamp(dt / 0.06, 0, 1);
  for (const s of bolt.segs) {
    if (s.d0 > lead + 1e-6) continue;
    const vis = s.br ? Math.max(0, 1 - dt / (o.brLife || 0.24)) : 1; if (vis <= 0 && !o.hold) continue;
    const I = (dt < 0.06 && !o.hold ? 0.4 : env) * s.i * (o.hold ? 1 : vis) * o.I; if (I < 0.01) continue;
    const mid = V3.scale(V3.add(s.a, s.b), 0.5); const dist = V3.len(V3.sub(mid, cam));
    const w = Math.max(o.wMin || 0.05, dist * (o.wK || 0.0022)) * s.w;
    pushBar(a, s.a, s.b, w, o.col || [0.78, 0.84, 1.0], 2, 0, 0.5, [I, 0, 0, 0]);
  }
  return env;
}
export function pushRing(a, c, r, w, col, I, n = 96, y = null) {
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
    pushBar(a, [c[0] + Math.cos(a0) * r, y ?? c[1], c[2] + Math.sin(a0) * r], [c[0] + Math.cos(a1) * r, y ?? c[1], c[2] + Math.sin(a1) * r], w, col, 2, 0, 0.5, [I, 0, 0, 0]);
  }
}
