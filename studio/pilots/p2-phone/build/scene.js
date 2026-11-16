// scene.js — "My phone at 1%": an original 2D cartoon. Characters: PHONE (dramatic) and CHARGER (deadpan), plus a hand.
// Everything is drawn with canvas paths; every frame is a pure function of t (deterministic, so any frame can be re-rendered).
import { EDIT, CAPTIONS, MOUTH } from './edit.js';
export const META = { DURATION: EDIT.DURATION, FPS: EDIT.FPS };
const W = 1080, H = 1920, INK = '#0e1024';
let ctx, cv;
export function setup(canvas) { cv = canvas; ctx = canvas.getContext('2d'); }

// ---------- helpers ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const back = (u) => { const c1 = 1.7, c3 = c1 + 1; u = clamp(u, 0, 1); return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const noise1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
const S = Object.fromEntries(EDIT.SHOTS.map(s => [s.name, s])); const EV = EDIT.EV;
const shotAt = (t) => EDIT.SHOTS.find(s => t >= s.t0 && t < s.t1) || EDIT.SHOTS[EDIT.SHOTS.length - 1];
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fillStroke(fill, lw = 7, stroke = INK) { if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); } }
function ell(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); }
// who is talking and how open is the mouth
function speech(t) {
  for (const v of EDIT.VOICE) { const k = t - v.at; if (k >= 0 && k < v.dur + 0.05) { const m = MOUTH[v.id] || []; const i = Math.floor(k * 30); return { who: v.who, id: v.id, open: m[Math.min(i, m.length - 1)] || 0, k }; } }
  return { who: '', id: '', open: 0, k: 0 };
}

// ---------- the world (room) ----------
const PH = { x: 560, y: 905, w: 290, h: 560 };   // phone resting on the bed (centre)
const CH = { x: 1640, y: 1150 };                  // charger block centre (plugged into the outlet)
const FLOOR = 1500;
function room(t, dark = 0) {
  // wall
  let g = ctx.createLinearGradient(0, 0, 0, FLOOR); g.addColorStop(0, '#20284c'); g.addColorStop(1, '#2c3563');
  ctx.fillStyle = g; ctx.fillRect(-2000, -1600, 6000, FLOOR + 1600);
  ctx.globalAlpha = 0.06; ctx.fillStyle = '#ffffff';
  for (let x = -1200; x < 3200; x += 90) { ctx.fillRect(x, -1600, 18, FLOOR + 1600); } ctx.globalAlpha = 1;
  // window with the moon and city lights
  rr(1180, 380, 330, 420, 16); fillStroke('#0d1638', 9);
  ctx.save(); rr(1180, 380, 330, 420, 16); ctx.clip();
  g = ctx.createLinearGradient(0, 380, 0, 800); g.addColorStop(0, '#0b1435'); g.addColorStop(1, '#2a2f6a'); ctx.fillStyle = g; ctx.fillRect(1180, 380, 330, 420);
  const mp = 1 + (t > EV.moon - 0.05 && t < EV.moon + 0.9 ? 0.6 * Math.exp(-(t - EV.moon) / 0.35) : 0);
  ctx.globalAlpha = 0.35 * mp; ell(1420, 470, 70 * mp, 70 * mp); ctx.fillStyle = '#ffeec0'; ctx.fill(); ctx.globalAlpha = 1;
  ell(1420, 470, 36, 36); ctx.fillStyle = '#fff4d6'; ctx.fill();
  for (let i = 0; i < 26; i++) { const x = 1190 + hash(i) * 310, y = 690 + hash(i + 50) * 100, r = 3 + hash(i + 9) * 6; ctx.globalAlpha = 0.5 + 0.5 * hash(i + 3); ell(x, y, r, r); ctx.fillStyle = hash(i + 7) > 0.5 ? '#ffd27a' : '#9fd0ff'; ctx.fill(); }
  ctx.globalAlpha = 1; ctx.fillStyle = '#121a40'; for (let i = 0; i < 6; i++) ctx.fillRect(1180 + i * 60, 740 - hash(i + 20) * 140, 50, 200);
  ctx.restore(); ctx.fillStyle = INK; ctx.fillRect(1340, 380, 9, 420); ctx.fillRect(1180, 585, 330, 9);
  // poster
  rr(760, 470, 230, 300, 10); fillStroke('#f2c14e', 8); ell(875, 600, 70, 70); fillStroke('#e8505b', 0); ctx.fillStyle = '#2b2d5c'; ctx.font = '42px Bangers'; ctx.textAlign = 'center'; ctx.fillText('VIBES', 875, 735);
  // floor
  g = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 600); g.addColorStop(0, '#5b3b2a'); g.addColorStop(1, '#3a2419'); ctx.fillStyle = g; ctx.fillRect(-2000, FLOOR, 6000, 1200);
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 4; for (let x = -1200; x < 3200; x += 160) { ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x - 260, FLOOR + 600); ctx.stroke(); }
  ctx.fillStyle = '#1a1230'; ctx.fillRect(-2000, FLOOR - 16, 6000, 20);
  // nightstand + lamp
  rr(-90, 1120, 230, 380, 14); fillStroke('#7a4b33', 8); rr(-70, 1170, 190, 110, 10); fillStroke('#8c5a3e', 6);
  rr(10, 1040, 40, 80, 8); fillStroke('#c9a26b', 6);
  ctx.beginPath(); ctx.moveTo(-60, 1045); ctx.lineTo(120, 1045); ctx.lineTo(80, 900); ctx.lineTo(-20, 900); ctx.closePath(); fillStroke('#f6d38b', 7);
  // bed: headboard, mattress, pillow, blanket
  rr(150, 760, 90, 560, 30); fillStroke('#6b4330', 8);
  rr(200, 1170, 1000, 150, 26); fillStroke('#eef0f7', 8);
  ctx.fillStyle = '#4a2f22'; ctx.fillRect(230, 1320, 40, 180); ctx.fillRect(1120, 1320, 40, 180);
  rr(240, 1080, 290, 115, 50); fillStroke('#fbf3df', 8);
  ctx.beginPath(); ctx.moveTo(720, 1175); ctx.bezierCurveTo(820, 1140, 1000, 1150, 1210, 1170); ctx.lineTo(1235, 1350); ctx.lineTo(700, 1360); ctx.closePath(); fillStroke('#2bb3a3', 8);
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 6; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(760 + i * 110, 1190); ctx.lineTo(740 + i * 120, 1350); ctx.stroke(); }
  // outlet plate (charger is drawn separately)
  rr(CH.x - 70, CH.y - 110, 140, 200, 18); fillStroke('#e9e4d8', 7);
}
function lampLight(dark = 0) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(30, 980, 10, 30, 980, 900); g.addColorStop(0, `rgba(255,190,110,${0.42 * (1 - dark)})`); g.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = g; ctx.fillRect(-900, 80, 1800, 1800);
  g = ctx.createRadialGradient(1420, 470, 10, 1420, 600, 700); g.addColorStop(0, 'rgba(120,150,255,0.18)'); g.addColorStop(1, 'rgba(120,150,255,0)'); ctx.fillStyle = g; ctx.fillRect(700, -100, 1500, 1500);
  ctx.restore();
}

// ---------- characters ----------
// expression: eyes 0..1 open, look [x,y], brow tilt (-1 sad .. +1 angry), mouthCurve (+ smile, - frown), tears, sparkle, sweat
function face(cx, cy, s, ex, open, opt = {}) {
  const ew = 54 * s, eh = 62 * s, dx = 70 * s;
  for (const side of [-1, 1]) {
    const x = cx + side * dx, y = cy; const o = clamp(ex.eyes, 0.05, 1);
    ell(x, y, ew, eh); fillStroke('#ffffff', 6 * s);
    const pr = (ex.pupil ?? 1) * 24 * s; const px = x + (ex.look?.[0] || 0) * 20 * s, py = y + (ex.look?.[1] || 0) * 22 * s;
    ell(px, py, pr, pr * 1.08); ctx.fillStyle = INK; ctx.fill(); ell(px - pr * 0.35, py - pr * 0.4, pr * 0.32, pr * 0.32); ctx.fillStyle = '#fff'; ctx.fill();
    if (ex.sparkle) { ctx.fillStyle = '#fff'; for (const [a, b, r] of [[0.5, 0.3, 0.22], [-0.2, 0.55, 0.14]]) { ell(px + a * pr * 1.6, py + b * pr, pr * r, pr * r); ctx.fill(); } }
    // eyelid: covers the top of the eye as the eye closes
    if (o < 0.98) { ctx.save(); ell(x, y, ew, eh); ctx.clip(); ctx.fillStyle = opt.lid || '#24305e'; ctx.fillRect(x - ew - 2, y - eh - 2, ew * 2 + 4, (eh * 2 + 4) * (1 - o)); ctx.restore();
      ell(x, y, ew, eh); ctx.lineWidth = 6 * s; ctx.strokeStyle = INK; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - ew, y - eh + (eh * 2) * (1 - o)); ctx.lineTo(x + ew, y - eh + (eh * 2) * (1 - o)); ctx.stroke(); }
    // brow
    const tilt = (ex.brow || 0) * side; const by = y - eh - 22 * s + (ex.browY || 0) * s;
    ctx.beginPath(); ctx.moveTo(x - ew * 0.9, by + tilt * -16 * s); ctx.lineTo(x + ew * 0.9, by + tilt * 16 * s); ctx.lineWidth = 13 * s; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    if (ex.tears) { const k = ex.tears; ctx.fillStyle = '#7fd6ff'; ctx.globalAlpha = 0.9; ctx.beginPath(); const tx = x + side * ew * 0.55, ty = y + eh * 0.7 + ((opt.t || 0) * 160 % 120) * s;
      ctx.moveTo(tx, ty - 22 * s); ctx.quadraticCurveTo(tx + 14 * s, ty + 6 * s, tx, ty + 12 * s); ctx.quadraticCurveTo(tx - 14 * s, ty + 6 * s, tx, ty - 22 * s); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(127,214,255,.5)'; rr(x + side * ew * 0.45 - 7 * s, y + eh * 0.6, 14 * s, 160 * s * k, 7 * s); ctx.fill(); }
  }
  // mouth
  const my = cy + 120 * s, mw = (ex.mouthW || 60) * s; const curve = ex.mouth || 0; const op = clamp(open, 0, 1);
  if (op < 0.08) { ctx.beginPath(); ctx.moveTo(cx - mw, my); ctx.quadraticCurveTo(cx, my + curve * 40 * s, cx + mw, my); ctx.lineWidth = 10 * s; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); }
  else { const mh = (14 + 70 * op) * s; ctx.beginPath(); ctx.moveTo(cx - mw, my); ctx.quadraticCurveTo(cx, my + curve * 30 * s - mh * 0.4, cx + mw, my); ctx.quadraticCurveTo(cx, my + mh + curve * 26 * s, cx - mw, my); ctx.closePath();
    fillStroke('#3a0d1f', 8 * s); ctx.save(); ctx.clip(); ell(cx, my + mh * 0.9, mw * 0.6, mh * 0.45); ctx.fillStyle = '#f0627a'; ctx.fill(); ctx.restore(); }
  if (ex.sweat) { ctx.fillStyle = '#9fe3ff'; ctx.beginPath(); const sx = cx + 150 * s, sy = cy - 80 * s; ctx.moveTo(sx, sy - 30 * s); ctx.quadraticCurveTo(sx + 22 * s, sy + 10 * s, sx, sy + 18 * s); ctx.quadraticCurveTo(sx - 22 * s, sy + 10 * s, sx, sy - 30 * s); ctx.fill(); }
}
function arm(x0, y0, x1, y1, bend, s) {
  const mx = (x0 + x1) / 2 + bend[0], my = (y0 + y1) / 2 + bend[1];
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.lineWidth = 30 * s; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineWidth = 17 * s; ctx.strokeStyle = '#3d4a7a'; ctx.stroke(); ell(x1, y1, 30 * s, 30 * s); fillStroke('#f5f5fb', 7 * s);
}
// the phone: pose {x,y,rot,s}, expression, screen mode
function phone(P, ex, open, t, mode = {}) {
  const s = P.s, w = PH.w * s, h = PH.h * s;
  ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.rot || 0);
  // arms behind the body
  const A = mode.arms || 'rest'; const wob = Math.sin(t * 14) * 18 * s;
  const L0 = [-w / 2 + 6 * s, 30 * s], R0 = [w / 2 - 6 * s, 30 * s];
  const poses = {
    rest: [[-w / 2 - 60 * s, 210 * s], [w / 2 + 60 * s, 210 * s], [-30, 20], [30, 20]],
    forehead: [[-w / 2 - 70 * s, 220 * s], [60 * s, -h * 0.33], [-30, 20], [120 * s, 60 * s]],
    flail: [[-w / 2 - 170 * s, -160 * s + wob], [w / 2 + 170 * s, -170 * s - wob], [-60 * s, 40 * s], [60 * s, 40 * s]],
    reach: [[-w / 2 - 80 * s, 200 * s], [w / 2 + 230 * s, -10 * s], [-30, 20], [40 * s, 60 * s]],
    up: [[-w / 2 - 150 * s, -200 * s], [w / 2 + 150 * s, -200 * s], [-40 * s, 30 * s], [40 * s, 30 * s]],
    limp: [[-w / 2 - 40 * s, 300 * s], [w / 2 + 40 * s, 300 * s], [-10, 30], [10, 30]],
  };
  const pz = poses[A] || poses.rest;
  arm(L0[0], L0[1], pz[0][0], pz[0][1], pz[2], s); if (A !== 'forehead') arm(R0[0], R0[1], pz[1][0], pz[1][1], pz[3], s);
  // body
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 40 * s; ctx.shadowOffsetY = 18 * s; rr(-w / 2, -h / 2, w, h, 52 * s); ctx.fillStyle = '#171a2c'; ctx.fill(); ctx.restore();
  rr(-w / 2, -h / 2, w, h, 52 * s); fillStroke('#1b1f36', 9 * s);
  rr(-w / 2 + 6 * s, -h / 2 + 6 * s, w - 12 * s, h - 12 * s, 46 * s); ctx.lineWidth = 4 * s; ctx.strokeStyle = '#59617f'; ctx.stroke();
  // screen
  const sx = -w / 2 + 18 * s, sy = -h / 2 + 18 * s, sw = w - 36 * s, sh = h - 36 * s;
  ctx.save(); rr(sx, sy, sw, sh, 36 * s); ctx.clip();
  const dead = mode.dead || 0;
  let g = ctx.createLinearGradient(0, sy, 0, sy + sh); g.addColorStop(0, '#2d6cdf'); g.addColorStop(1, '#6a3fd1'); ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
  if (mode.calc) { // the calculator gag
    ctx.fillStyle = '#111'; ctx.fillRect(sx, sy, sw, sh); ctx.fillStyle = '#fff'; ctx.font = `${70 * s}px Montserrat`; ctx.textAlign = 'right'; ctx.fillText('0.01', sx + sw - 20 * s, sy + 150 * s);
    const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+'];
    for (let i = 0; i < 16; i++) { const cx2 = sx + 20 * s + (i % 4) * (sw - 40 * s) / 4 + (sw - 40 * s) / 8, cy2 = sy + 230 * s + Math.floor(i / 4) * 66 * s; ell(cx2, cy2, 25 * s, 25 * s); ctx.fillStyle = i % 4 === 3 ? '#f39a1e' : '#3b3b3b'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `${28 * s}px Montserrat`; ctx.textAlign = 'center'; ctx.fillText(keys[i], cx2, cy2 + 10 * s); }
  } else {
    const fy = mode.video ? sy + sh * 0.2 : sy + sh * 0.38, fs = mode.video ? 0.62 * s : s; const fx = mode.video ? sx + sw * 0.33 : 0;
    face(fx, fy, fs * 0.92, ex, open, { t, lid: '#2a4fb8' });
    if (mode.video) { const k = mode.video; ctx.globalAlpha = clamp(k * 1.5, 0, 1); const vy = sy + sh * lerp(1.0, 0.42, ease(clamp(k, 0, 1)));
      ctx.fillStyle = '#0b0b0f'; ctx.fillRect(sx, vy, sw, sh * 0.58); ctx.beginPath(); ctx.moveTo(-26 * s, vy + 95 * s); ctx.lineTo(34 * s, vy + 130 * s); ctx.lineTo(-26 * s, vy + 165 * s); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = '#ff3b3b'; ctx.fillRect(sx + 20 * s, vy + 230 * s, (sw - 40 * s) * 0.02, 8 * s); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(sx + 20 * s + (sw - 40 * s) * 0.02, vy + 230 * s, (sw - 40 * s) * 0.98, 8 * s);
      // the joke is the length, so it gets a big duration chip at the top of the player (the old bottom label sat under the captions)
      rr(sx + sw - 152 * s, vy + 18 * s, 134 * s, 50 * s, 10 * s); ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fill(); ctx.lineWidth = 3 * s; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `${32 * s}px Montserrat`; ctx.textAlign = 'center'; ctx.fillText('40:00', sx + sw - 85 * s, vy + 54 * s); ctx.globalAlpha = 1; }
  }
  if (mode.gray) { ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${mode.gray})`; ctx.fillRect(sx, sy, sw, sh); ctx.globalCompositeOperation = 'source-over'; }
  // status bar: time + battery
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = `${26 * s}px Montserrat`; ctx.textAlign = 'left'; ctx.fillText('2:47', sx + 26 * s, sy + 44 * s);
  const bl = mode.batt ?? 1; const blink = (mode.blink && Math.floor(t * 4) % 2) ? 0.25 : 1;
  ctx.globalAlpha = blink; rr(sx + sw - 96 * s, sy + 22 * s, 58 * s, 28 * s, 6 * s); ctx.lineWidth = 4 * s; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(sx + sw - 36 * s, sy + 30 * s, 6 * s, 12 * s);
  ctx.fillStyle = '#ff3d3d'; ctx.fillRect(sx + sw - 91 * s, sy + 27 * s, Math.max(3 * s, 48 * s * bl / 100 * 3), 18 * s);
  ctx.font = `${24 * s}px Montserrat`; ctx.textAlign = 'right'; ctx.fillStyle = '#ff6b6b'; ctx.fillText(bl + '%', sx + sw - 104 * s, sy + 45 * s); ctx.globalAlpha = 1;
  if (dead) { ctx.fillStyle = `rgba(3,3,6,${dead})`; ctx.fillRect(sx, sy, sw, sh); }
  // glass glint
  ctx.globalAlpha = 0.12; ctx.beginPath(); ctx.moveTo(sx, sy + sh * 0.1); ctx.lineTo(sx + sw * 0.6, sy); ctx.lineTo(sx + sw * 0.9, sy); ctx.lineTo(sx, sy + sh * 0.45); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
  if (A === 'forehead') arm(R0[0], R0[1], pz[1][0], pz[1][1], pz[3], s);
  ctx.restore();
}
function charger(ex, open, t, opt = {}) {
  const s = opt.s || 1; ctx.save(); ctx.translate(CH.x, CH.y);
  // cable: from the bottom of the block down to the floor, then along the floor toward the bed (it doesn't reach)
  ctx.beginPath(); ctx.moveTo(0, 95); ctx.bezierCurveTo(10, 220, -60, 300, -40, FLOOR - CH.y + 10); ctx.bezierCurveTo(-30, FLOOR - CH.y + 40, -260, FLOOR - CH.y + 30, -420, FLOOR - CH.y + 26);
  ctx.lineWidth = 26; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 15; ctx.strokeStyle = '#f2f2f6'; ctx.stroke();
  rr(-450, FLOOR - CH.y + 6, 48, 40, 8); fillStroke('#dcdce6', 6);
  // block
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; rr(-95, -105, 190, 205, 34); ctx.fillStyle = '#f7f7fb'; ctx.fill(); ctx.restore();
  rr(-95, -105, 190, 205, 34); fillStroke('#f7f7fb', 8); rr(-80, -92, 160, 26, 12); ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fill();
  face(0, -20, 0.62, ex, open, { lid: '#d9dbe8', t });
  // tiny arm holding the plug end to its chest (the eulogy)
  if (opt.salute) { const k = opt.salute; ctx.globalAlpha = k; arm(92, 30, lerp(170, 66, k), lerp(150, 98, k), [40, 50], 0.8); ctx.globalAlpha = 1; }
  ctx.restore();
}
function handBack(P, k) { // arm from the bottom-right, palm behind the phone (drawn before the phone)
  const s = P.s; ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.rot || 0);
  const ox = lerp(700, 0, k), oy = lerp(900, 0, k);
  ctx.save(); ctx.translate(ox, oy);
  ctx.beginPath(); ctx.moveTo(60 * s, 200 * s); ctx.quadraticCurveTo(330 * s, 520 * s, 420 * s, 1400 * s); ctx.lineTo(760 * s, 1400 * s); ctx.quadraticCurveTo(560 * s, 420 * s, 200 * s, 120 * s); ctx.closePath(); fillStroke('#7d8597', 9 * s);
  rr(-170 * s, 20 * s, 340 * s, 260 * s, 110 * s); fillStroke('#e7b48f', 8 * s);
  ctx.restore(); ctx.restore();
}
function handFront(P, k) { // fingers wrapping the left edge and a thumb on the lower-right bezel (drawn after the phone)
  if (k <= 0) return; const s = P.s, w = PH.w * s; ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.rot || 0);
  const ox = lerp(700, 0, k), oy = lerp(900, 0, k); ctx.translate(ox, oy);
  for (let i = 0; i < 3; i++) { rr(-w / 2 - 34 * s, 70 * s + i * 62 * s, 70 * s, 54 * s, 27 * s); fillStroke('#e7b48f', 7 * s); }
  ctx.save(); ctx.translate(w / 2 - 20 * s, 200 * s); ctx.rotate(-0.5); rr(-36 * s, -95 * s, 72 * s, 150 * s, 36 * s); fillStroke('#e7b48f', 7 * s); ctx.restore();
  ctx.restore();
}

// ---------- shots: camera + what everyone is doing ----------
function cam(c) { ctx.setTransform(c.z, 0, 0, c.z, 540 - c.x * c.z, 960 - c.y * c.z); if (c.rot) { ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.translate(-c.x, -c.y); } }
function state(t) {
  const sh = shotAt(t), u = (t - sh.t0) / (sh.t1 - sh.t0), sp = speech(t), blink = (k) => { const p = (t + k) % 3.1; return p < 0.12 ? 0.1 : 1; };
  const P = { x: PH.x, y: PH.y, rot: -0.06, s: 1 }; let ex = { eyes: blink(0), look: [0, 0], brow: 0, mouth: 0 }; let mode = { batt: 1, arms: 'rest', blink: true };
  let cex = { eyes: 0.42, look: [0, 0.2], brow: 0, mouth: 0, pupil: 0.8 }; let c = { x: PH.x, y: 1060, z: 1.5 }; let hp = null; let copt = {};
  const shake = (a) => [noise1(t * 23) * a, noise1(t * 19 + 5) * a];
  switch (sh.name) {
    case 'S1_phone': { const k = sm(0, 0.35, t - sh.t0); c = { x: PH.x - 10, y: lerp(1010, 1050, ease(u)), z: lerp(1.42, 1.62, ease(u)) };
      ex = { eyes: k < 1 ? lerp(0.15, 1, k) : blink(0.4) * 0.7, look: [0, -0.35], brow: -0.9, mouth: -0.5, pupil: 0.85 }; mode.arms = t - sh.t0 > 0.5 ? 'forehead' : 'rest'; break; }
    case 'S2_tears': c = { x: PH.x, y: lerp(1000, 960, ease(u)), z: lerp(1.65, 1.95, ease(u)) };
      ex = { eyes: 0.8, look: [0.15, -0.8], brow: -1, mouth: -0.7, tears: sm(0, 1.2, t - sh.t0), sparkle: 1 }; mode.arms = 'forehead'; P.rot = -0.12; break;
    case 'S3_charger': case 'S5_charger': { const z0 = sh.name === 'S3_charger' ? 1.85 : 2.05; c = { x: CH.x, y: lerp(1260, 1240, u), z: lerp(z0, z0 + 0.1, u) };
      cex = { eyes: 0.4, look: [-0.5, 0.1], brow: 0.15, mouth: sh.name === 'S3_charger' ? -0.1 : 0, pupil: 0.8 }; break; }
    case 'S4_gap': { const k = ease(sm(0, 0.5, t - sh.t0)); c = { x: lerp(PH.x + 20, 1085, k), y: lerp(1050, 1040, k), z: lerp(1.5, 0.7, k) };
      ex = { eyes: blink(0.2) * 0.85, look: [0.9, 0.1], brow: -0.8, mouth: -0.6 }; mode.arms = 'reach'; cex = { eyes: 0.4, look: [-0.6, 0], brow: 0.1, mouth: 0 }; break; }
    case 'S6_rage': { const sk = shake(sp.who === 'PHONE' ? 7 : 2); c = { x: PH.x + sk[0], y: 1040 + sk[1], z: lerp(1.5, 1.7, u) };
      ex = { eyes: 1, look: [0, 0], brow: 1, mouth: -0.3, pupil: 0.62, sweat: 1, mouthW: 72 }; mode.arms = 'flail';
      mode.gray = t > EV.gray && t < EV.gray + 0.9 ? 1 : 0; mode.calc = t >= EV.calc; if (mode.calc) mode.arms = 'limp'; break; }
    case 'S7_lift': { const g = sm(EV.grab - 0.4, EV.grab, t), lift = ease(sm(EV.lift, EV.lift + 0.9, t));
      P.y = lerp(PH.y, 640, lift); P.x = lerp(PH.x, 620, lift); P.rot = lerp(-0.06, 0.04, lift) + Math.sin(t * 6) * 0.02 * lift;
      hp = { k: g }; c = { x: lerp(PH.x, 620, lift * 0.8), y: lerp(1050, 820, lift), z: lerp(1.25, 1.35, u) };
      ex = { eyes: blink(0.7), look: [0.3, -0.6], brow: -0.4, mouth: 0.9, sparkle: lift > 0.2 ? 1 : 0, pupil: 1.25 }; mode.arms = lift > 0.3 ? 'up' : 'rest'; break; }
    case 'S8_video': { P.x = 620; P.y = 640; P.rot = 0.04; hp = { k: 1 }; c = { x: 620 + noise1(t * 3) * 6, y: lerp(760, 720, u), z: lerp(1.6, 1.8, u) };
      const v = sm(EV.video, EV.video + 0.5, t); mode.video = v; ex = { eyes: 1, look: [0.6, 0.6], brow: -0.6, mouth: -0.8, pupil: 0.45, sweat: 1, mouthW: 64 }; mode.arms = 'flail';
      const d = sm(EV.die, EV.die + 0.12, t); if (t > EV.die - 0.4) { mode.batt = 0; } mode.dead = d; if (d > 0.5) mode.arms = 'limp'; break; }
    case 'S9_rip': c = { x: CH.x + 20, y: lerp(1200, 1180, u), z: lerp(2.0, 2.2, u) };
      cex = { eyes: t - sh.t0 < 0.55 ? 0.05 : 0.45, look: [0.05, 0.1], brow: -0.3, mouth: -0.2, pupil: 0.8 }; copt.salute = sm(sh.t0, sh.t0 + 0.4, t); break;
    default: { P.x = 620; P.y = 640; P.rot = 0.04; hp = { k: 1 }; mode.dead = 1; mode.batt = 0; mode.arms = 'limp'; c = { x: 900, y: 900, z: lerp(0.95, 0.9, u) }; }
  }
  const punch = 1 + 0.06 * Math.exp(-(t - sh.t0) / 0.1); c.z *= punch;
  if (sp.who === 'PHONE' && !mode.dead) { ex.mouthOpen = sp.open; } if (sp.who === 'CHARGER') cex.mouthOpen = sp.open;
  return { sh, u, c, P, ex, mode, cex, hp, copt, sp };
}

// ---------- captions ----------
function captions(t) {
  let P = null; for (const p of CAPTIONS) if (t >= p.t0 - 0.04 && t < p.t1) P = p; if (!P) return;
  const col = P.who === 'CHARGER' ? '#8ff2ff' : '#ffffff';
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = '86px Luckiest'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const ws = P.words.map(w => w.w.toUpperCase()); const sp = 30; const widths = ws.map(w => ctx.measureText(w).width);
  const lines = []; let cur = [], cw = 0; ws.forEach((w, i) => { if (cw + widths[i] > 860 && cur.length) { lines.push(cur); cur = []; cw = 0; } cur.push(i); cw += widths[i] + sp; }); if (cur.length) lines.push(cur);
  const y0 = 1270 - (lines.length - 1) * 50;
  lines.forEach((ln, li) => { const tot = ln.reduce((a, i) => a + widths[i], 0) + sp * (ln.length - 1); let x = 540 - tot / 2; const y = y0 + li * 100;
    for (const i of ln) { const W2 = P.words[i]; const on = t >= W2.s - 0.05; if (!on) { x += widths[i] + sp; continue; } const act = t < W2.e + 0.04; const u = (t - W2.s + 0.05) / 0.12; const sc = (0.7 + 0.3 * back(u)) * (act ? 1.08 : 1);
      ctx.save(); ctx.translate(x + widths[i] / 2, y); ctx.scale(sc, sc); ctx.rotate((hash(i + P.t0) - 0.5) * 0.06);
      ctx.lineWidth = 16; ctx.strokeStyle = '#000'; ctx.strokeText(ws[i], -widths[i] / 2, 0); ctx.fillStyle = W2.em ? '#ffd23f' : act ? '#fff6a8' : col; ctx.fillText(ws[i], -widths[i] / 2, 0); ctx.restore(); x += widths[i] + sp; } });
  // speaker tag
  ctx.font = '50px Bangers'; ctx.textAlign = 'center'; const tag = P.who; const tw = ctx.measureText(tag).width + 50; const ty = y0 - 112;
  rr(540 - tw / 2, ty - 46, tw, 62, 31); ctx.fillStyle = P.who === 'CHARGER' ? '#0aa8c2' : '#ff4f6d'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillText(tag, 540, ty);
}

// ---------- frame ----------
export function renderAt(t) {
  const st = state(t); const { c, P, ex, mode, cex, hp, copt, sh } = st;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  cam(c); room(t); charger({ ...cex }, cex.mouthOpen || 0, t, copt);
  if (hp) handBack(P, hp.k);
  phone(P, ex, ex.mouthOpen || 0, t, mode); if (hp) handFront(P, hp.k);
  lampLight();
  // the gap gag: a tape measure across the room
  if (sh.name === 'S4_gap') { const k = sm(EV.six - 0.25, EV.six + 0.3, t); if (k > 0) { const x0 = PH.x + 170, x1 = lerp(x0, CH.x - 120, ease(k)), y = 1120;
    ctx.lineWidth = 34; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.lineWidth = 24; ctx.strokeStyle = '#ffd23f'; ctx.stroke();
    for (let x = x0 + 30; x < x1; x += 30) { ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + (Math.round((x - x0) / 30) % 4 ? 0 : 10)); ctx.stroke(); }
    if (k > 0.85) { ctx.font = '120px Luckiest'; ctx.textAlign = 'center'; ctx.lineWidth = 18; ctx.strokeStyle = '#000'; const sc = back((t - EV.six - 0.25) / 0.25);
      ctx.save(); ctx.translate((x0 + CH.x - 120) / 2, y - 70); ctx.scale(sc, sc); ctx.strokeText('6 FT', 0, 0); ctx.fillStyle = '#ffd23f'; ctx.fillText('6 FT', 0, 0); ctx.restore(); } } }
  // screen effects: flash on cuts, darken when the phone dies
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(540, 900, 300, 540, 960, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const fl = Math.max(0, 1 - (t - sh.t0) / 0.1) * 0.12; if (fl > 0 && sh.t0 > 0) { ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(0, 0, W, H); }
  if (sh.name === 'S8_video' && t > EV.die) { const k = sm(EV.die, EV.die + 0.12, t); ctx.fillStyle = `rgba(255,255,255,${0.5 * Math.exp(-(t - EV.die) / 0.06)})`; ctx.fillRect(0, 0, W, H); }
  if (sh.name === 'S9_rip') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, W, H); const sg = ctx.createRadialGradient(540, 760, 50, 540, 760, 620); sg.addColorStop(0, 'rgba(255,240,200,.18)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); }
  captions(t);
  // a little "1%" hook badge in the first second (frame 1 reads even with the sound off)
  if (t < 2.2) { const a = 1 - sm(1.9, 2.2, t); ctx.globalAlpha = a; ctx.font = '150px Luckiest'; ctx.textAlign = 'center'; const sc = 1 + 0.05 * Math.sin(t * 9);
    ctx.save(); ctx.translate(540, 250); ctx.scale(sc, sc); ctx.lineWidth = 22; ctx.strokeStyle = '#000'; ctx.strokeText('1%', 0, 0); ctx.fillStyle = '#ff3d3d'; ctx.fillText('1%', 0, 0); ctx.restore();
    ctx.font = '50px Bangers'; ctx.lineWidth = 10; ctx.strokeText('POV: YOUR PHONE AT 2:47 AM', 540, 330); ctx.fillStyle = '#fff'; ctx.fillText('POV: YOUR PHONE AT 2:47 AM', 540, 330); ctx.globalAlpha = 1; }
  // end card
  if (sh.name === 'S10_end') { const k = sm(sh.t0, sh.t0 + 0.3, t); ctx.fillStyle = `rgba(8,10,24,${0.55 * k})`; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = k;
    ctx.font = '96px Luckiest'; ctx.textAlign = 'center'; ctx.lineWidth = 18; ctx.strokeStyle = '#000';
    const L1 = ['TAG SOMEONE', 'WHO LIVES', 'ON 1%']; L1.forEach((s, i) => { const sc = back((t - sh.t0 - 0.1 - i * 0.12) / 0.25); ctx.save(); ctx.translate(540, 760 + i * 110); ctx.scale(sc, sc); ctx.strokeText(s, 0, 0); ctx.fillStyle = i === 2 ? '#ff4f6d' : '#fff'; ctx.fillText(s, 0, 0); ctx.restore(); });
    ctx.globalAlpha = 1; }
}
