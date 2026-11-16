// scene.js — "The Midnight Diamond": an original noir mini-mystery. Silhouette characters with rim light, rain, lightning,
// practical lights (candle, flashlight, streetlamp), evidence cards and a fair-play clue. Every frame is a pure function of t.
import { EDIT, CAPTIONS, MOUTH } from './edit.js';
export const META = { DURATION: EDIT.DURATION, FPS: EDIT.FPS };
const W = 1080, H = 1920;
let ctx;
export function setup(canvas) { ctx = canvas.getContext('2d'); }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const back = (u) => { const c1 = 1.7, c3 = c1 + 1; u = clamp(u, 0, 1); return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const S = Object.fromEntries(EDIT.SHOTS.map(s => [s.name, s])); const EV = EDIT.EV;
const shotAt = (t) => EDIT.SHOTS.find(s => t >= s.t0 && t < s.t1) || EDIT.SHOTS[EDIT.SHOTS.length - 1];
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2); }
function amp(t) { for (const v of EDIT.VOICE) { const k = t - v.at; if (k >= 0 && k < v.dur) { const m = MOUTH[v.id] || []; return { who: v.who, a: m[Math.min(Math.floor(k * 30), m.length - 1)] || 0 }; } } return { who: '', a: 0 }; }
// lightning: a few strikes; returns 0..1 brightness
const STRIKES = [0.02, 2.55, 3.95, 13.0, 30.2];
function flash(t) { let f = 0; for (const s of STRIKES) { const d = t - s; if (d >= 0 && d < 0.6) f = Math.max(f, Math.exp(-d / 0.07) + 0.5 * Math.exp(-Math.abs(d - 0.18) / 0.04)); } return clamp(f, 0, 1.3); }

// ---------- reusable pieces ----------
function rain(t, n = 260, a = 0.32, slant = 0.22, len = 70) {
  ctx.save(); ctx.strokeStyle = `rgba(170,205,255,${a})`; ctx.lineWidth = 2.2; ctx.beginPath();
  for (let i = 0; i < n; i++) { const sp = 1900 + hash(i) * 900; const x0 = hash(i + 7) * 1500 - 200; const y = ((hash(i + 3) * 2200 + t * sp) % 2200) - 140; const x = x0 + y * slant;
    const L = len * (0.6 + hash(i + 11) * 0.8); ctx.moveTo(x, y); ctx.lineTo(x + L * slant, y + L); }
  ctx.stroke(); ctx.restore();
}
function grain(t, a = 0.07) {
  ctx.save(); ctx.globalAlpha = a; for (let i = 0; i < 900; i++) { const x = hash(i + Math.floor(t * 30) * 13.7) * W, y = hash(i * 1.7 + Math.floor(t * 30) * 7.1) * H; ctx.fillStyle = i % 2 ? '#fff' : '#000'; ctx.fillRect(x, y, 2, 2); } ctx.restore();
}
function vignette(a = 0.75) { const g = ctx.createRadialGradient(540, 900, 250, 540, 960, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function glow(x, y, r, col, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
// a standing silhouette (feet at x,y; height h); kind: cleaner | curator | guard | detective | thief; rim: [side, colour]
function person(x, y, h, kind, rim = [1, '#7fc8ff'], bob = 0, sway = 0) {
  const s = h / 900; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(sway);
  const P = new Path2D();
  // legs + coat + torso + head
  if (kind === 'detective') { P.moveTo(-150, -560); P.lineTo(-175, -40); P.lineTo(-60, -40); P.lineTo(-40, 0); P.lineTo(40, 0); P.lineTo(60, -40); P.lineTo(175, -40); P.lineTo(150, -560); }
  else if (kind === 'curator') { P.moveTo(-120, -560); P.lineTo(-160, -170); P.lineTo(-60, -170); P.lineTo(-50, 0); P.lineTo(-10, 0); P.lineTo(-5, -150); P.lineTo(5, -150); P.lineTo(10, 0); P.lineTo(50, 0); P.lineTo(60, -170); P.lineTo(160, -170); P.lineTo(120, -560); }
  else { P.moveTo(-125, -560); P.lineTo(-110, -300); P.lineTo(-80, 0); P.lineTo(-15, 0); P.lineTo(-5, -260); P.lineTo(5, -260); P.lineTo(15, 0); P.lineTo(80, 0); P.lineTo(110, -300); P.lineTo(125, -560); }
  P.quadraticCurveTo(110, -650, 55, -665); P.lineTo(-55, -665); P.quadraticCurveTo(-110, -650, -125, -560); P.closePath();
  P.ellipse(0, -745 + bob, 64, 78, 0, 0, Math.PI * 2);
  if (kind === 'detective') { P.ellipse(0, -800 + bob, 125, 22, 0, 0, Math.PI * 2); P.roundRect(-70, -880 + bob, 140, 85, 30); }
  if (kind === 'guard') { P.roundRect(-75, -838 + bob, 150, 55, 18); P.ellipse(35, -790 + bob, 70, 12, 0, 0, Math.PI * 2); }
  if (kind === 'curator') { P.ellipse(0, -840 + bob, 42, 36, 0, 0, Math.PI * 2); }
  if (kind === 'cleaner') { P.roundRect(-70, -830 + bob, 140, 60, 28); }
  ctx.fillStyle = '#020306'; ctx.fill(P);
  ctx.save(); ctx.clip(P); ctx.translate(rim[0] * 14, -4); ctx.lineWidth = 9; ctx.strokeStyle = rim[1]; ctx.shadowColor = rim[1]; ctx.shadowBlur = 24; ctx.globalAlpha = 0.7; ctx.stroke(P); ctx.restore();
  // props
  if (kind === 'cleaner') { ctx.strokeStyle = '#020306'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(170, -720); ctx.lineTo(210, 0); ctx.stroke(); rr(150, -40, 120, 50, 12); ctx.fillStyle = '#020306'; ctx.fill(); ctx.strokeStyle = rim[1]; ctx.lineWidth = 4; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1; }
  if (kind === 'curator') { ell(-25, -748 + bob, 18, 12); ell(25, -748 + bob, 18, 12); ctx.strokeStyle = '#ffd08a'; ctx.lineWidth = 4; ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
}
function backlight(x, y, r, col = 'rgba(120,150,200,A)', a = 0.55) { glow(x, y, r, col, a); }
function moonIcon(x, y, r, a = 1, label = true) {
  ctx.save(); ctx.globalAlpha = a; ell(x, y, r, r); ctx.fillStyle = '#05070d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(200,215,255,.55)'; ctx.stroke();
  if (label) { ctx.font = '34px Elite'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,230,255,.85)'; ctx.fillText('NEW MOON', x, y + r + 46); } ctx.restore();
}
function stamp(text, x, y, k, col = '#e23d3d', rot = -0.18, size = 150) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); const sc = 1.8 - 0.8 * back(k); ctx.scale(sc, sc); ctx.globalAlpha = clamp(k * 3, 0, 1);
  ctx.font = `${size}px Anton`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText(text).width + 60;
  rr(-w / 2, -size * 0.62, w, size * 1.24, 18); ctx.lineWidth = 12; ctx.strokeStyle = col; ctx.stroke(); ctx.fillStyle = col; ctx.fillText(text, 0, 6); ctx.restore();
}

// ---------- sets ----------
function exterior(t, k, lit = 1) { // the museum at night in the rain; k = push-in 0..1
  const f = flash(t); const z = lerp(1, 1.12, k);
  ctx.save(); ctx.translate(540, 1100); ctx.scale(z, z); ctx.translate(-540, -1100); ctx.translate(0, 210);
  let g = ctx.createLinearGradient(0, 0, 0, 1200); g.addColorStop(0, `rgb(${5 + f * 120},${8 + f * 130},${18 + f * 170})`); g.addColorStop(1, `rgb(${16 + f * 60},${24 + f * 70},${46 + f * 90})`);
  ctx.fillStyle = g; ctx.fillRect(-100, -400, 1300, 1700);
  ctx.globalAlpha = 0.5; for (let i = 0; i < 7; i++) { ell(hash(i) * 1200 - 60, 150 + hash(i + 4) * 350, 380, 90); ctx.fillStyle = `rgba(${30 + f * 140},${36 + f * 150},${60 + f * 170},.6)`; ctx.fill(); } ctx.globalAlpha = 1;
  // building
  ctx.fillStyle = '#0b0e18'; ctx.fillRect(60, 560, 960, 760);
  ctx.beginPath(); ctx.moveTo(40, 600); ctx.lineTo(540, 330); ctx.lineTo(1040, 600); ctx.closePath(); ctx.fillStyle = '#0d1120'; ctx.fill(); ctx.strokeStyle = `rgba(150,190,255,${0.25 + f * 0.5})`; ctx.lineWidth = 4; ctx.stroke();
  ctx.font = '62px Anton'; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(210,220,240,${0.55 + f * 0.4})`; ctx.fillText('BELMONT MUSEUM', 540, 545);
  // clock on the pediment: midnight
  ell(540, 450, 56, 56); ctx.fillStyle = '#1a2033'; ctx.fill(); ctx.strokeStyle = 'rgba(200,210,235,.6)'; ctx.lineWidth = 4; ctx.stroke();
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(540, 450); ctx.lineTo(540, 408); ctx.moveTo(540, 450); ctx.lineTo(540, 418); ctx.stroke();
  // windows (lit until the blackout, block by block)
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { const x = 130 + c * 180, y = 690 + r * 230; const id = r * 5 + c; const on = lit > 0 ? (t < EV.blackout + hash(id) * 0.35 ? 1 : 0) : 0;
    rr(x, y, 100, 150, 8); ctx.fillStyle = on ? '#f3b45a' : '#090b12'; ctx.fill(); if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(x + 50, y + 75, 140, 'rgba(255,170,80,A)', 0.25); ctx.restore(); } }
  // columns, steps, street
  for (let i = 0; i < 6; i++) { const x = 100 + i * 176; const cg = ctx.createLinearGradient(x, 0, x + 70, 0); cg.addColorStop(0, '#141a2a'); cg.addColorStop(0.6, `rgb(${40 + f * 90},${48 + f * 100},${70 + f * 120})`); cg.addColorStop(1, '#10131f');
    ctx.fillStyle = cg; ctx.fillRect(x, 600, 70, 720); }
  for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgb(${22 + i * 6},${26 + i * 6},${40 + i * 6})`; ctx.fillRect(20 - i * 30, 1320 + i * 40, 1040 + i * 60, 40); }
  g = ctx.createLinearGradient(0, 1480, 0, 2000); g.addColorStop(0, '#0b0f1c'); g.addColorStop(1, '#05070c'); ctx.fillStyle = g; ctx.fillRect(-100, 1480, 1300, 600);
  // wet-street reflections of the lit windows
  ctx.globalAlpha = 0.25; for (let c = 0; c < 5; c++) { const on = lit > 0 && t < EV.blackout + hash(c) * 0.35; if (on) { ctx.fillStyle = '#f3b45a'; ctx.fillRect(150 + c * 180, 1500, 60, 300 + 40 * Math.sin(t * 3 + c)); } } ctx.globalAlpha = 1;
  ctx.restore();
}
function gallery(t, k, lightsOn, empty) { // inside: the display case under a spotlight
  const z = lerp(1.32, 1.45, k); ctx.save(); ctx.translate(540, 980); ctx.scale(z, z); ctx.translate(-540, -1020);
  ctx.fillStyle = '#07090f'; ctx.fillRect(-100, -100, 1300, 2200);
  for (let i = 0; i < 3; i++) { rr(60 + i * 360, 380, 240, 300, 6); ctx.strokeStyle = 'rgba(190,160,100,.35)'; ctx.lineWidth = 10; ctx.stroke(); ctx.fillStyle = '#0d1018'; ctx.fill(); }
  ctx.fillStyle = '#0c0f17'; ctx.fillRect(-100, 1350, 1300, 800);
  const fl = lightsOn ? (t < EV.lights + 0.5 ? (hash(Math.floor(t * 24)) > 0.45 ? 1 : 0.15) : 1) : 0.08;
  // spotlight cone
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * fl;
  const cg = ctx.createLinearGradient(0, 0, 0, 1300); cg.addColorStop(0, 'rgba(255,240,210,.55)'); cg.addColorStop(1, 'rgba(255,240,210,.04)');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(500, -50); ctx.lineTo(580, -50); ctx.lineTo(830, 1300); ctx.lineTo(250, 1300); ctx.closePath(); ctx.fill(); ctx.restore();
  // pedestal + glass case
  ctx.fillStyle = '#151a26'; ctx.fillRect(390, 1100, 300, 420); ctx.fillStyle = `rgba(255,235,200,${0.15 * fl})`; ctx.fillRect(390, 1100, 300, 18);
  rr(400, 830, 280, 270, 6); ctx.fillStyle = `rgba(150,190,230,${0.06 + 0.06 * fl})`; ctx.fill(); ctx.strokeStyle = `rgba(200,230,255,${0.2 + 0.5 * fl})`; ctx.lineWidth = 4; ctx.stroke();
  ell(540, 1070, 95, 26); ctx.fillStyle = '#5a0f1f'; ctx.fill();
  if (!empty) { ctx.save(); ctx.translate(540, 1015); diamond(70, t, fl); ctx.restore(); }
  ctx.globalAlpha = 0.25 * fl; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(420, 850); ctx.lineTo(470, 850); ctx.lineTo(420, 960); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
}
function diamond(r, t, light = 1) {
  ctx.beginPath(); ctx.moveTo(-r, -r * 0.2); ctx.lineTo(-r * 0.55, -r * 0.7); ctx.lineTo(r * 0.55, -r * 0.7); ctx.lineTo(r, -r * 0.2); ctx.lineTo(0, r); ctx.closePath();
  const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#dff6ff'); g.addColorStop(0.5, '#7fc8ff'); g.addColorStop(1, '#e9f9ff'); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r, -r * 0.2); ctx.lineTo(r, -r * 0.2); ctx.moveTo(-r * 0.55, -r * 0.7); ctx.lineTo(0, r); ctx.lineTo(r * 0.55, -r * 0.7); ctx.stroke();
  const tw = 0.5 + 0.5 * Math.sin(t * 7); ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(r * 0.3, -r * 0.4, r * 1.4, 'rgba(200,240,255,A)', 0.5 * light * tw); ctx.restore();
}
function hallway(t, warm = false) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05070d'); g.addColorStop(1, warm ? '#1a0f08' : '#0a0f1a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = warm ? 'rgba(255,170,90,.12)' : 'rgba(127,200,255,.12)'; ctx.lineWidth = 3;
  for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(540, 820); ctx.lineTo(540 + i * 260, 1920); ctx.stroke(); }
  for (let i = 0; i < 6; i++) { const y = 820 + Math.pow(i / 6, 1.8) * 1100; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  rr(440, 560, 200, 260, 4); ctx.fillStyle = warm ? 'rgba(255,170,90,.18)' : 'rgba(127,200,255,.12)'; ctx.fill();
}
function windowRain(t, x, y, w, h, lightA = 0.25) {
  ctx.save(); rr(x, y, w, h, 6); ctx.clip(); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#0d1630'); g.addColorStop(1, '#1b2448'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = lightA; for (let i = 0; i < 40; i++) { const px = x + hash(i) * w, py = y + ((hash(i + 5) * h + t * (80 + hash(i + 2) * 120)) % h); ell(px, py, 3, 6); ctx.fillStyle = '#bcd6ff'; ctx.fill(); } ctx.globalAlpha = 1;
  ctx.restore(); rr(x, y, w, h, 6); ctx.strokeStyle = '#1e2638'; ctx.lineWidth = 16; ctx.stroke(); ctx.fillStyle = '#1e2638'; ctx.fillRect(x + w / 2 - 6, y, 12, h); ctx.fillRect(x, y + h / 2 - 6, w, 12);
}

// ---------- captions ----------
function captions(t) {
  let P = null; for (const p of CAPTIONS) if (t >= p.t0 - 0.04 && t < p.t1) P = p; if (!P) return;
  ctx.font = '78px Elite'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  const ws = P.words.map(w => w.w.toUpperCase()); const sp = 26; const widths = ws.map(w => ctx.measureText(w).width);
  const lines = []; let cur = [], cw = 0; ws.forEach((w, i) => { if (cw + widths[i] > 880 && cur.length) { lines.push(cur); cur = []; cw = 0; } cur.push(i); cw += widths[i] + sp; }); if (cur.length) lines.push(cur);
  const y0 = 1290 - (lines.length - 1) * 46;
  lines.forEach((ln, li) => { const tot = ln.reduce((a, i) => a + widths[i], 0) + sp * (ln.length - 1); let x = 540 - tot / 2; const y = y0 + li * 92;
    for (const i of ln) { const W2 = P.words[i]; if (t < W2.s - 0.05) { x += widths[i] + sp; continue; } const act = t < W2.e + 0.04; const u = (t - W2.s + 0.05) / 0.12;
      ctx.save(); ctx.translate(x + widths[i] / 2, y); const sc = (0.8 + 0.2 * back(u)) * (act ? 1.05 : 1); ctx.scale(sc, sc);
      ctx.lineWidth = 14; ctx.strokeStyle = '#000'; ctx.strokeText(ws[i], -widths[i] / 2, 0); ctx.fillStyle = W2.em ? '#ffb547' : act ? '#fff2cf' : '#ffffff'; ctx.fillText(ws[i], -widths[i] / 2, 0); ctx.restore(); x += widths[i] + sp; } });
  if (P.who !== 'NARRATOR') { const tag = P.who === 'DETECTIVE' ? 'THE DETECTIVE' : 'THE ' + P.who; ctx.font = '46px Anton'; ctx.textAlign = 'center'; const tw = ctx.measureText(tag).width;
    ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.strokeText(tag, 540, y0 - 100); ctx.fillStyle = P.who === 'DETECTIVE' ? '#ffb547' : '#cfe2ff'; ctx.fillText(tag, 540, y0 - 100);
    ctx.fillStyle = '#e23d3d'; ctx.fillRect(540 - tw / 2, y0 - 86, tw, 6); }
}

// ---------- frame ----------
export function renderAt(t) {
  const sh = shotAt(t), u = (t - sh.t0) / (sh.t1 - sh.t0), k = t - sh.t0, A = amp(t); const bob = -A.a * 10;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const punch = 1 + 0.05 * Math.exp(-k / 0.12); ctx.translate(540, 960); ctx.scale(punch, punch); ctx.translate(-540, -960);
  switch (sh.name) {
    case 'N1_night': exterior(t, ease(u) * 0.6); rain(t, 300, 0.35); moonIcon(880, 600, 46, sm(0.9, 1.4, k)); break;
    case 'N2_blackout': exterior(t, 0.6 + ease(u) * 0.4); rain(t, 300, 0.35); break;
    case 'N3_gone': { const lit = t >= EV.lights; gallery(t, ease(u), lit, true);
      stamp('STOLEN', 540, 640, sm(EV.gone, EV.gone + 0.25, t), '#e23d3d', -0.16, 170);
      const dk = sm(EV.diamond - 0.15, EV.diamond + 0.25, t); if (dk > 0) { ctx.save(); ctx.translate(lerp(1300, 760, back(dk)), 1650); ctx.rotate(0.08); rr(-190, -230, 380, 440, 10); ctx.fillStyle = '#eee8dc'; ctx.fill();
        ctx.fillStyle = '#0b0f1a'; ctx.fillRect(-160, -200, 320, 300); ctx.save(); ctx.translate(0, -50); diamond(95, t, 1); ctx.restore(); ctx.fillStyle = '#222'; ctx.font = '34px Elite'; ctx.textAlign = 'center'; ctx.fillText('THE BELMONT STAR', 0, 150); ctx.font = '30px Elite'; ctx.fillText('40 CARATS', 0, 190); ctx.restore(); } break; }
    case 'N4_three': { hallway(t); ctx.strokeStyle = 'rgba(200,215,255,.18)'; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, 520 + i * 110); ctx.lineTo(W, 520 + i * 110); ctx.stroke(); }
      const pick = sm(EV.gone + 4.6, EV.gone + 5.0, t) * 0 + sm(S.N4_three.t0 + 1.7, S.N4_three.t0 + 2.1, t);
      backlight(540, 1000, 900, 'rgba(110,140,190,A)', 0.45);
      [['cleaner', 250], ['curator', 540], ['guard', 830]].forEach(([kd, x], i) => { const dim = i === 0 ? 1 : 1 - 0.6 * pick; ctx.globalAlpha = dim; person(x, 1450, 820, kd, [i === 1 ? 1 : -1, i === 0 && pick > 0 ? '#ffb547' : '#7fc8ff'], 0, 0); ctx.globalAlpha = 1;
        ctx.font = '120px Anton'; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(255,255,255,${0.18 * (1 - pick)})`; ctx.fillText('?', x, 600); });
      ctx.font = '40px Elite'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,230,255,.8)'; ctx.fillText('3 PEOPLE INSIDE', 540, 380); break; }
    case 'S1_cleaner': hallway(t); backlight(540, 820, 760); backlight(540, 700, 300, 'rgba(200,220,255,A)', 0.35); person(500 + Math.sin(t * 2) * 6, 1700, 1250, 'cleaner', [-1, '#7fc8ff'], bob, Math.sin(t * 1.3) * 0.01);
      ctx.save(); ctx.globalAlpha = 0.25; ell(520, 1690, 360, 40); ctx.fillStyle = '#9ec9ff'; ctx.fill(); ctx.restore(); break;
    case 'N5_curator': case 'S2_curator': { const fl = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 7.3);
      const g0 = ctx.createLinearGradient(0, 0, 0, H); g0.addColorStop(0, '#0a0604'); g0.addColorStop(1, '#1c1008'); ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#2a170c'; ctx.fillRect(-20, 1330, 1120, 70); ctx.fillStyle = '#140b06'; ctx.fillRect(-20, 1400, 1120, 600);
      for (let i = 0; i < 9; i++) { ctx.fillStyle = ['#3b1e12', '#2b2210', '#1e2a1c'][i % 3]; ctx.fillRect(80 + i * 50, 420 + hash(i) * 30, 40, 210); ctx.fillRect(640 + (i % 5) * 70, 700 + hash(i + 3) * 20, 50, 180); }
      if (sh.name === 'N5_curator') { rr(330, 350, 420, 980, 10); ctx.fillStyle = '#0d0805'; ctx.fill(); rr(380, 420, 320, 380, 8); ctx.fillStyle = `rgba(255,190,110,${0.35 * fl})`; ctx.fill();
        ctx.font = '64px Anton'; ctx.textAlign = 'center'; ctx.fillStyle = '#20120a'; ctx.fillText('CURATOR', 540, 640); }
      else { person(560, 1420, 1100, 'curator', [1, '#ffb05a'], bob, 0); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(sh.name === 'N5_curator' ? 540 : 300, sh.name === 'N5_curator' ? 620 : 1180, 700, 'rgba(255,170,80,A)', 0.42 * fl); ctx.restore();
      if (sh.name === 'S2_curator') { ctx.fillStyle = '#e9dcc1'; ctx.fillRect(280, 1240, 34, 90); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ell(297, 1215 + Math.sin(t * 17) * 3, 14, 30); ctx.fillStyle = `rgba(255,200,110,${0.9 * fl})`; ctx.fill(); ctx.restore(); }
      break; }
    case 'N6_guard': case 'S3_guard': { const g0 = ctx.createLinearGradient(0, 0, 0, H); g0.addColorStop(0, '#04060c'); g0.addColorStop(1, '#0b1020'); ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
      windowRain(t, 230, 300, 620, 860, 0.3); backlight(540, 760, 700, 'rgba(90,120,190,A)', 0.4);
      { const lf = flash(t + (sh.name === 'S3_guard' ? 30.2 - (S.S3_guard.t0 + 0.75) : 0)); if (sh.name === 'S3_guard' && lf > 0) { ctx.save(); rr(230, 300, 620, 860, 6); ctx.clip(); ctx.fillStyle = `rgba(200,220,255,${0.75 * lf})`; ctx.fillRect(230, 300, 620, 860); ctx.restore(); } }
      if (sh.name === 'S3_guard' && t > S.S3_guard.t0 + 0.7 && t < S.S3_guard.t0 + 1.6) { const kk = (t - S.S3_guard.t0 - 0.7) / 0.9; ctx.save(); rr(230, 300, 620, 860, 6); ctx.clip(); ctx.globalAlpha = 0.9; person(lerp(150, 950, kk), 1180, 560, 'thief', [1, '#bcd6ff'], 0, -0.12); ctx.restore(); }
      if (sh.name === 'S3_guard' && t > EV.moonlight - 0.1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(540, 520, 520, 'rgba(180,200,255,A)', 0.22 * sm(EV.moonlight - 0.1, EV.moonlight + 0.4, t)); ctx.restore(); }
      person(sh.name === 'N6_guard' ? 540 : 520, 1720, sh.name === 'N6_guard' ? 1150 : 1350, 'guard', [1, '#7fc8ff'], bob, 0);
      // flashlight beam
      const ang = -0.5 + Math.sin(t * 1.4) * 0.25; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(700, 1250); ctx.rotate(ang); const bg = ctx.createLinearGradient(0, 0, 900, 0); bg.addColorStop(0, 'rgba(255,245,220,.45)'); bg.addColorStop(1, 'rgba(255,245,220,0)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(900, -150); ctx.lineTo(900, 150); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill(); ctx.restore(); break; }
    case 'N7_detective': { const g0 = ctx.createLinearGradient(0, 0, 0, H); g0.addColorStop(0, '#03050a'); g0.addColorStop(1, '#0a0e1a'); ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#10141f'; ctx.fillRect(820, 200, 22, 1500); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createLinearGradient(0, 260, 0, 1700); lg.addColorStop(0, 'rgba(255,214,150,.5)'); lg.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(780, 260); ctx.lineTo(880, 260); ctx.lineTo(1150, 1700); ctx.lineTo(360, 1700); ctx.closePath(); ctx.fill(); ctx.restore(); rr(770, 230, 120, 40, 10); ctx.fillStyle = '#ffd796'; ctx.fill();
      backlight(700, 1100, 800, 'rgba(255,200,130,A)', 0.25); person(560, 1700, 1300, 'detective', [1, '#ffd796'], 0, 0); rain(t, 220, 0.3);
      const sn = sm(EV.snap - 0.15, EV.snap, t); ctx.save(); ctx.translate(760, 1080); ctx.rotate(-0.2); ctx.fillStyle = '#e8e0cf'; rr(-60, -80, 120, 160, 6); ctx.fill(); ctx.fillStyle = '#7a1f1f'; ctx.fillRect(-60, -80, 120 * (1 - sn * 0.95) + 4, 160); ctx.restore(); break; }
    case 'D1_arrest': { const g0 = ctx.createLinearGradient(0, 0, 0, H); g0.addColorStop(0, '#120406'); g0.addColorStop(1, '#05070d'); ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
      backlight(540, 1000, 800, 'rgba(160,40,50,A)', 0.5); person(540, 1700, 1300, 'guard', [1, '#ff5a5a'], 0, 0); const kk = sm(EV.arrest, EV.arrest + 0.2, t); stamp('GUILTY', 540, 820, kk, '#e23d3d', -0.14, 190);
      if (kk > 0) { ctx.fillStyle = `rgba(255,40,40,${0.25 * Math.exp(-(t - EV.arrest) / 0.15)})`; ctx.fillRect(0, 0, W, H); } break; }
    default: { // N8_reveal: rewind to the sky; there was no moon
      const rw = t < EV.catch + 0.2 ? 1 : 0; exterior(t, 0.2); rain(t, 200, 0.25);
      if (rw) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H); for (let i = 0; i < 12; i++) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(0, hash(i + Math.floor(t * 30)) * H, W, 6 + hash(i) * 20); }
        ctx.font = '70px Anton'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('◀◀ REWIND', 540, 260); }
      const mk = sm(EV.nomoon - 0.3, EV.nomoon + 0.2, t) * (1 - sm(EV.newmoon + 0.9, EV.newmoon + 1.1, t)); if (mk > 0) { ctx.save(); ctx.translate(540, 300); ctx.scale(lerp(0.6, 1.5, ease(mk)), lerp(0.6, 1.5, ease(mk))); moonIcon(0, 0, 80, 1, false); ctx.restore();
        ctx.font = '66px Anton'; ctx.textAlign = 'center'; ctx.lineWidth = 12; ctx.strokeStyle = '#000'; ctx.strokeText('NEW MOON = NO MOONLIGHT', 540, 520); ctx.fillStyle = '#ffb547'; ctx.fillText('NEW MOON = NO MOONLIGHT', 540, 520); }
      const ek = sm(EV.newmoon + 0.9, EV.newmoon + 1.3, t); if (ek > 0) { ctx.fillStyle = `rgba(0,0,0,${0.86 * ek})`; ctx.fillRect(0, 0, W, H);   // dark enough that the museum sign no longer shows through the stamp
        const pz = 1 + 0.05 * sm(EV.newmoon + 0.9, META.DURATION, t); ctx.save(); ctx.translate(540, 820); ctx.scale(pz, pz); ctx.translate(-540, -820);   // slow push-in: the end card never sits frozen
        stamp('CASE CLOSED', 540, 700, ek, '#e23d3d', -0.12, 140);
        ctx.globalAlpha = ek; ctx.font = '52px Elite'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('Did you solve it? Comment below.', 540, 950); ctx.font = '44px Elite'; ctx.fillStyle = '#ffb547'; ctx.fillText('CASE #2 NEXT', 540, 1030); ctx.globalAlpha = 1; ctx.restore(); } }
  }
  // atmosphere, hook title, captions
  ctx.setTransform(1, 0, 0, 1, 0, 0); vignette(0.7); grain(t, 0.06);
  const fl = Math.max(0, 1 - k / 0.1) * 0.1; if (fl > 0 && sh.t0 > 0) { ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(0, 0, W, H); }
  if (t < S.N1_night.t1 - 0.1) { const a = 1 - sm(S.N1_night.t1 - 0.45, S.N1_night.t1 - 0.1, t); ctx.globalAlpha = a; const sc = 1.15 - 0.15 * back(t / 0.3);
    ctx.save(); ctx.translate(540, 240); ctx.scale(sc, sc); ctx.font = '104px Anton'; ctx.textAlign = 'center'; ctx.lineWidth = 16; ctx.strokeStyle = '#000'; ctx.strokeText('ONE OF THEM', 0, 0); ctx.fillStyle = '#fff'; ctx.fillText('ONE OF THEM', 0, 0);
    ctx.strokeText('IS LYING.', 0, 112); ctx.fillStyle = '#e23d3d'; ctx.fillText('IS LYING.', 0, 112); ctx.restore();
    ctx.font = '44px Elite'; ctx.textAlign = 'center'; ctx.fillStyle = '#e8eefc'; ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.strokeText('Can you catch it before the detective?', 540, 420); ctx.fillText('Can you catch it before the detective?', 540, 420); ctx.globalAlpha = 1; }
  if (sh.name === 'N1_night' || sh.name === 'N2_blackout') { ctx.font = '40px Elite'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(230,235,250,.85)'; ctx.fillText('CASE #1 · 12:00 AM', 60, 1520); }
  captions(t);
}
