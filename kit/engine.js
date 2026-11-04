// engine.js — small original WebGL2 renderer: instanced meshes, moon/sun shadows,
// point lights, emissive windows, planar water reflections, sky, bloom, tonemapping.

// ---------- math ----------
export const M4 = {
  ident() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); },
  mul(a, b) { const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
    return o; },
  persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2), o = new Float32Array(16);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; },
  ortho(l, r, b, t, n, f) { const o = new Float32Array(16);
    o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n);
    o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o; },
  lookAt(e, c, up) { let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
    let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]); },
  inv(m) { const o = new Float32Array(16);
    const a00=m[0],a01=m[1],a02=m[2],a03=m[3],a10=m[4],a11=m[5],a12=m[6],a13=m[7],a20=m[8],a21=m[9],a22=m[10],a23=m[11],a30=m[12],a31=m[13],a32=m[14],a33=m[15];
    const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,
      b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
    let d = b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06; d = 1 / d;
    o[0]=(a11*b11-a12*b10+a13*b09)*d; o[1]=(a02*b10-a01*b11-a03*b09)*d; o[2]=(a31*b05-a32*b04+a33*b03)*d; o[3]=(a22*b04-a21*b05-a23*b03)*d;
    o[4]=(a12*b08-a10*b11-a13*b07)*d; o[5]=(a00*b11-a02*b08+a03*b07)*d; o[6]=(a32*b02-a30*b05-a33*b01)*d; o[7]=(a20*b05-a22*b02+a23*b01)*d;
    o[8]=(a10*b10-a11*b08+a13*b06)*d; o[9]=(a01*b08-a00*b10-a03*b06)*d; o[10]=(a30*b04-a31*b02+a33*b00)*d; o[11]=(a21*b02-a20*b04-a23*b00)*d;
    o[12]=(a11*b07-a10*b09-a12*b06)*d; o[13]=(a00*b09-a01*b07+a02*b06)*d; o[14]=(a31*b01-a30*b03-a32*b00)*d; o[15]=(a20*b03-a21*b01+a22*b00)*d;
    return o; },
};
export const V3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
// quaternion rotating unit vector a onto unit vector b
export function quatFromTo(a, b) {
  const d = V3.dot(a, b);
  if (d < -0.999999) { let ax = V3.cross([1, 0, 0], a); if (V3.len(ax) < 1e-6) ax = V3.cross([0, 1, 0], a); ax = V3.norm(ax); return [ax[0], ax[1], ax[2], 0]; }
  const c = V3.cross(a, b); const q = [c[0], c[1], c[2], 1 + d]; const l = Math.hypot(...q); return q.map(v => v / l);
}
export function quatAxis(axis, ang) { const s = Math.sin(ang / 2); const a = V3.norm(axis); return [a[0] * s, a[1] * s, a[2] * s, Math.cos(ang / 2)]; }
export function quatMul(a, b) {
  return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
}
export function qrot(q, v) { // rotate vector
  const [x, y, z, w] = q; const cx = y * v[2] - z * v[1] + w * v[0], cy = z * v[0] - x * v[2] + w * v[1], cz = x * v[1] - y * v[0] + w * v[2];
  return [v[0] + 2 * (y * cz - z * cy), v[1] + 2 * (z * cx - x * cz), v[2] + 2 * (x * cy - y * cx)];
}

// ---------- meshes (interleaved pos3 nrm3 uv2) ----------
export function meshBox() {
  const v = [], idx = [];
  const faces = [[[1,0,0],[0,0,-1],[0,1,0]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[1,0,0],[0,0,-1]],
                 [[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]];
  for (const [n, u, w] of faces) {
    const b = v.length / 8;
    for (const [su, sw] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
      v.push(0.5 * (n[0] + su * u[0] + sw * w[0]), 0.5 * (n[1] + su * u[1] + sw * w[1]), 0.5 * (n[2] + su * u[2] + sw * w[2]), ...n, (su + 1) / 2, (sw + 1) / 2);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return { v: new Float32Array(v), i: new Uint16Array(idx) };
}
export function meshFace(dir) { // one face of the unit cube, dir 0..5 = +x,-x,+y,-y,+z,-z
  const all = meshBox(); const order = [0, 1, 2, 3, 4, 5]; const f = order[dir];
  const v = all.v.slice(f * 4 * 8, f * 4 * 8 + 32); return { v, i: new Uint16Array([0, 1, 2, 0, 2, 3]) };
}
export function meshLathe(profile, seg) { // profile: [[r,y],...] bottom->top along outside
  const v = [], idx = [];
  const P = profile.length;
  for (let i = 0; i < P - 1; i++) {
    const [r0, y0] = profile[i], [r1, y1] = profile[i + 1];
    const dy = y1 - y0, dr = r1 - r0; let nl = Math.hypot(dy, dr) || 1; const nr = dy / nl, ny = -dr / nl;
    const base = v.length / 8;
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      v.push(r0 * ca, y0, r0 * sa, nr * ca, ny, nr * sa, s / seg, i / (P - 1));
      v.push(r1 * ca, y1, r1 * sa, nr * ca, ny, nr * sa, s / seg, (i + 1) / (P - 1));
    }
    for (let s = 0; s < seg; s++) { const a = base + s * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  // caps
  for (const [r, y, up] of [[profile[0][0], profile[0][1], -1], [profile[P - 1][0], profile[P - 1][1], 1]]) {
    if (r < 1e-4) continue; const c = v.length / 8; v.push(0, y, 0, 0, up, 0, 0.5, 0.5);
    for (let s = 0; s <= seg; s++) { const a = (s / seg) * Math.PI * 2; v.push(r * Math.cos(a), y, r * Math.sin(a), 0, up, 0, 0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)); }
    for (let s = 0; s < seg; s++) up > 0 ? idx.push(c, c + 2 + s, c + 1 + s) : idx.push(c, c + 1 + s, c + 2 + s);
  }
  return { v: new Float32Array(v), i: new Uint16Array(idx) };
}
export function meshSphere(lat = 12, lon = 16) {
  const v = [], idx = [];
  for (let i = 0; i <= lat; i++) { const th = (i / lat) * Math.PI; for (let j = 0; j <= lon; j++) { const ph = (j / lon) * Math.PI * 2;
    const x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph); v.push(x * 0.5, y * 0.5, z * 0.5, x, y, z, j / lon, i / lat); } }
  for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) { const a = i * (lon + 1) + j, b = a + lon + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  return { v: new Float32Array(v), i: new Uint16Array(idx) };
}
export function meshPrism(poly, h) { // star-shaped polygon around origin, y from 0..h
  const v = [], idx = []; const n = poly.length;
  const c0 = v.length / 8; v.push(0, h, 0, 0, 1, 0, 0.5, 0.5);
  for (const [x, z] of poly) v.push(x, h, z, 0, 1, 0, 0, 0);
  for (let k = 0; k < n; k++) idx.push(c0, c0 + 1 + ((k + 1) % n), c0 + 1 + k);
  for (let k = 0; k < n; k++) {
    const [x0, z0] = poly[k], [x1, z1] = poly[(k + 1) % n]; let nx = z1 - z0, nz = -(x1 - x0); const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    const b = v.length / 8;
    v.push(x0, 0, z0, nx, 0, nz, 0, 0, x1, 0, z1, nx, 0, nz, 1, 0, x1, h, z1, nx, 0, nz, 1, 1, x0, h, z0, nx, 0, nz, 0, 1);
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  return { v: new Float32Array(v), i: new Uint16Array(idx) };
}

// instance layout: 20 floats
// [px,py,pz,kind, qx,qy,qz,qw, sx,sy,sz,seed, r,g,b,rough, e0,e1,e2,e3]
export function pushInst(a, p, s, c, kind = 0, q = [0, 0, 0, 1], seed = 0, rough = 0.8, e = [0, 0, 0, 0]) {
  a.push(p[0], p[1], p[2], kind, q[0], q[1], q[2], q[3], s[0], s[1], s[2], seed, c[0], c[1], c[2], rough, e[0], e[1], e[2], e[3]);
}
export function pushBar(a, A, B, t, c, kind = 0, seed = 0, rough = 0.7, e = [0, 0, 0, 0]) {
  const d = V3.sub(B, A), L = V3.len(d); if (L < 1e-5) return;
  const q = quatFromTo([0, 1, 0], V3.scale(d, 1 / L));
  pushInst(a, V3.scale(V3.add(A, B), 0.5), [t, L, t], c, kind, q, seed, rough, e);
}

// ---------- shaders ----------
const NOISE = `
float hash11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float hash13(vec3 p3){ p3=fract(p3*.1031); p3+=dot(p3,p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x), mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x), mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y), f.z); }
float vnoise2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x), f.y); }
`;

const VS_INST = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos; layout(location=1) in vec3 a_nrm; layout(location=2) in vec2 a_uv;
layout(location=3) in vec4 i_pk; layout(location=4) in vec4 i_q; layout(location=5) in vec4 i_ss;
layout(location=6) in vec4 i_col; layout(location=7) in vec4 i_ex;
uniform mat4 u_vp;
out vec3 v_wpos; out vec3 v_nrm; out vec3 v_lpos; out vec3 v_lnrm; out vec2 v_uv;
flat out vec4 v_ss; flat out vec4 v_col; flat out vec4 v_ex; flat out vec4 v_pk; flat out vec4 v_q;
vec3 qrot(vec4 q, vec3 v){ return v + 2.0*cross(q.xyz, cross(q.xyz, v) + q.w*v); }
void main(){
  vec3 wp = i_pk.xyz + qrot(i_q, a_pos * i_ss.xyz);
  v_wpos = wp; v_nrm = qrot(i_q, a_nrm / max(i_ss.xyz, vec3(1e-4)));
  v_lpos = a_pos; v_lnrm = a_nrm; v_uv = a_uv; v_ss = i_ss; v_col = i_col; v_ex = i_ex; v_pk = i_pk; v_q = i_q;
  gl_Position = u_vp * vec4(wp, 1.0);
}`;

const FS_DEPTH = `#version 300 es
precision highp float;
in vec3 v_wpos; in vec3 v_nrm; in vec3 v_lpos; in vec3 v_lnrm; in vec2 v_uv;
flat in vec4 v_ss; flat in vec4 v_col; flat in vec4 v_ex; flat in vec4 v_pk;
uniform float u_skinCut;
out vec4 o;
void main(){ int k=int(v_pk.w+0.5); if(k==3 && v_ss.w < u_skinCut) discard; if(k==12 && v_ex.w < 0.5) discard; if(k==2||k==9) discard; o=vec4(1.0); }`;

const FS_MAIN = (cut, kinds) => `#version 300 es
${cut ? '#define CUT 1' : ''}
${kinds.map(k => '#define K' + k + ' 1').join('\n')}
precision highp float; precision highp sampler2DShadow;
in vec3 v_wpos; in vec3 v_nrm; in vec3 v_lpos; in vec3 v_lnrm; in vec2 v_uv;
flat in vec4 v_ss; flat in vec4 v_col; flat in vec4 v_ex; flat in vec4 v_pk; flat in vec4 v_q;
uniform vec3 u_cam; uniform vec3 u_ldir; uniform vec3 u_lcol;
uniform mat4 u_smat; uniform sampler2DShadow u_smap; uniform float u_shadowOn; uniform float u_sbias;
uniform vec3 u_ambSky; uniform vec3 u_ambGnd;
uniform vec3 u_fogCol; uniform float u_fogDen; uniform float u_fogH;
uniform int u_npl; uniform vec4 u_plp[8]; uniform vec4 u_plc[8];
uniform float u_restore; uniform float u_carPow; uniform float u_time;
uniform float u_clipOn; uniform float u_clipY;
uniform float u_skinCut; uniform float u_copper; uniform float u_day;
uniform vec3 u_skyZen; uniform vec3 u_skyHor;
uniform sampler2D u_winTex; uniform sampler2D u_coinTex;
uniform vec4 u_coins[12]; uniform int u_ncoins;
uniform vec4 u_road; // avenue spacing, avenue width, street spacing, street width
uniform vec2 u_roadOrg;
out vec4 o_col;
${NOISE}
vec3 qrotf(vec4 q, vec3 v){ return v + 2.0*cross(q.xyz, cross(q.xyz, v) + q.w*v); }
float gateGrid(float seed){ return clamp((u_restore - hash11(seed*7.31+0.17))*60.0, 0.0, 1.0); }
float gate(float ch, float seed){
  if(ch < 0.5) return 1.0;
  if(ch < 1.5) return gateGrid(seed);
  if(ch < 2.5) return u_carPow;
  return gateGrid(seed) * step(0.55, fract(u_time*0.9 + hash11(seed)));
}
float shadowAt(vec3 p, vec3 n){
  if(u_shadowOn < 0.5) return 1.0;
  vec4 sp = u_smat * vec4(p + n*u_sbias*2.0, 1.0); vec3 q = sp.xyz/sp.w*0.5+0.5;
  if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0||q.z>1.0) return 1.0;
  float s=0.0; float ts = 1.0/1280.0;
  for(int i=0;i<2;i++) for(int j=0;j<2;j++) s += texture(u_smap, vec3(q.xy+(vec2(float(i),float(j))-0.5)*ts*1.6, q.z - u_sbias*0.0015));
  return s*0.25;
}
float pulse(float x, float a, float b, float w){ // filtered window pulse
  return clamp((min(x,b)-max(x-w, a)) / max(w,1e-4), 0.0, 1.0);
}
void main(){
  int kind = int(v_pk.w + 0.5);
  vec3 N = normalize(v_nrm);
  vec3 V = normalize(u_cam - v_wpos);
  vec3 alb = v_col.rgb; float rough = v_col.a; vec3 emis = vec3(0.0); float specK = 0.03; float shin = 16.0;
  float seed = v_ss.w; vec3 extraLight = vec3(0.0);
  vec3 envRefl = vec3(0.0); float metal = 0.0;
#ifdef K1
  if(kind == 1){ // building with procedural windows (hash-based, LOD fade)
    vec3 ln = v_lnrm; vec3 s = v_ss.xyz;
    if(abs(ln.y) > 0.5){ alb *= 0.45; }
    else {
      bool fx = abs(ln.x) > 0.5;
      float u = fx ? (v_lpos.z+0.5)*s.z : (v_lpos.x+0.5)*s.x;
      float fw = fx ? s.z : s.x;
      float y = (v_lpos.y+0.5)*s.y + v_ex.w;
      vec2 cs = vec2(v_ex.z > 0.0 ? v_ex.z : 3.2, 3.7);
      vec2 c = vec2(u, y) / cs;
      float fwid = max(fwidth(c.x), fwidth(c.y));
      vec2 ci = floor(c); vec2 cf = fract(c);
      float pw = clamp(fwid, 0.0, 1.0);
      float wm = pulse(cf.x, 0.16, 0.84, pw) * pulse(cf.y, 0.2, 0.86, pw);
      float far = smoothstep(0.35, 0.9, fwid);
      wm = mix(wm, 0.45, far);
      wm *= smoothstep(0.0, 0.6, u) * smoothstep(fw, fw-0.6, u) * step(2.2, y);
      float face = fx ? (ln.x > 0.0 ? 1.0 : 2.0) : (ln.z > 0.0 ? 3.0 : 4.0);
      float sf = seed*17.31 + face*3.7;
      float floorOn = step(0.15, hash12(vec2(ci.y*1.37, sf)));
      float on = step(hash13(vec3(ci, sf)), 0.42) * floorOn;
      float hcol = hash13(vec3(ci + 3.1, sf));
      vec3 wc = mix(vec3(1.0, 0.7, 0.38), vec3(0.72, 0.84, 1.0), step(0.72, hcol)) * (0.45 + 0.55*hash13(vec3(ci + 7.7, sf)));
      vec2 cc = floor(c * 0.25); vec2 cc2 = floor(c * 0.0625);
      float h1 = hash13(vec3(cc, sf + 11.0)), h2 = hash13(vec3(cc2, sf + 23.0));
      vec3 avg = vec3(1.0, 0.74, 0.46) * 0.24;
      vec3 farC = avg * mix(0.35 + 1.3*h1, 0.55 + 0.9*h2, smoothstep(2.5, 6.0, fwid));
      vec3 wl = mix(on * wc, farC, far);
      float nv = 1.0 - max(dot(N, V), 0.0); float fres = nv*nv*nv;
      vec3 glass = mix(vec3(0.012,0.016,0.024), u_skyHor*0.8 + u_skyZen*0.3, clamp(fres*0.7 + u_day*0.45, 0.0, 1.0));
      float band = 0.9 + 0.1*step(0.5, fract(y/7.4));
      alb = mix(alb*band, glass, wm);
      emis = wl * wm * v_ex.y * v_ex.x * gateGrid(seed);
      specK = mix(0.03, 0.35, wm); shin = mix(12.0, 90.0, wm);
    }
  }
#endif
#ifdef K2
  if(kind == 2){ // emissive
    float g = gate(v_ex.z, v_ex.y);
    emis = alb * v_ex.x * g; if(v_ex.w > 0.5){ specK = 0.6; shin = 60.0; } else { alb *= 0.12; }
  }
#endif
#ifdef K9
  if(kind == 9){ // billboard: animated color panel
    float g = gate(1.0, v_ex.y);
    vec2 uv = v_uv; float t = u_time*0.6 + seed*10.0;
    vec3 c1 = 0.5+0.5*cos(6.2831*(vec3(0.0,0.33,0.67) + seed*3.1 + uv.y*0.4 + t*0.15));
    float stripes = 0.6 + 0.4*step(0.5, fract(uv.x*3.0 + t*0.5 + seed));
    emis = c1 * stripes * v_ex.x * g; alb = vec3(0.02);
  }
#endif
#ifdef K3
  if(kind == 3){ // statue skin voxels
    float cut = u_skinCut;
#ifdef CUT
    if(seed < cut) discard;
#endif
    float edge = (cut > 0.001 && cut < 0.999) ? smoothstep(cut + 0.05, cut, seed) : 0.0;
    emis += vec3(1.0, 0.42, 0.12) * edge * 4.5;
    float streak = vnoise(vec3(v_pk.x*0.9, v_pk.y*0.12, v_pk.z*0.9));
    float spot = hash13(floor(v_pk.xyz*1.3));
    alb = alb * (0.78 + 0.32*streak) * (0.92 + 0.16*spot);
  }
#endif
#ifdef K5
  if(kind == 5){ // coin: copper <-> zinc
    float h = 0.0; vec3 Np = N;
    if(abs(v_lnrm.y) > 0.5){
      vec2 uv = v_lpos.xz*0.5 + 0.5; float e = 1.0/512.0;
      float hc = texture(u_coinTex, uv).r;
      float hx = texture(u_coinTex, uv+vec2(e,0)).r - texture(u_coinTex, uv-vec2(e,0)).r;
      float hz = texture(u_coinTex, uv+vec2(0,e)).r - texture(u_coinTex, uv-vec2(0,e)).r;
      Np = qrotf(v_q, normalize(vec3(-hx*6.0, 1.0, -hz*6.0)) * vec3(1.0, sign(v_lnrm.y), 1.0));
      h = hc;
    }
    N = Np;
    float cu = clamp(u_copper*v_ex.x + (1.0 - v_ex.x), 0.0, 1.0); // e0=1 means reacts to copper
    vec3 copperC = vec3(0.86, 0.38, 0.19) * (0.8 + 0.3*vnoise(v_wpos*9.0));
    vec3 zincC = vec3(0.56, 0.6, 0.66) * (0.85 + 0.2*vnoise(v_wpos*14.0));
    alb = mix(zincC, copperC, cu) * (0.7 + 0.3*h);
    metal = 1.0; rough = mix(0.5, 0.3, cu);
  }
#endif
#ifdef K6
  if(kind == 6){ // wood table
    vec2 p = v_wpos.xz;
    float g = vnoise(vec3(p.x*0.35, p.y*3.5, 0.0))*0.6 + vnoise(vec3(p.x*1.4, p.y*14.0, 3.0))*0.4;
    float rings = 0.5 + 0.5*sin((p.y*6.0 + g*6.0));
    alb = mix(vec3(0.07,0.04,0.025), vec3(0.2,0.115,0.06), rings*0.6 + g*0.4);
    float ao = 1.0;
    for(int i=0;i<12;i++){ if(i>=u_ncoins) break; vec4 cc = u_coins[i]; if(cc.w < 0.5) continue; float d = length(p - cc.xz);
      ao *= mix(1.0, smoothstep(0.0, 1.25, d - 0.9), 0.75); }
    alb *= ao; specK = 0.05; shin = 30.0;
  }
#endif
#ifdef K7
  if(kind == 7){ // candle wax
    alb = vec3(0.93, 0.88, 0.78); float top = smoothstep(0.2, 0.5, v_lpos.y);
    emis = vec3(1.0, 0.55, 0.22) * top * 0.9 * v_ex.x;
  }
#endif
#ifdef K8
  if(kind == 8){ // flame
    float yy = v_lpos.y + 0.5;
    vec3 fc = mix(vec3(1.0, 0.85, 0.55), vec3(1.0, 0.45, 0.10), yy);
    emis = fc * (6.0 + 2.0*sin(u_time*31.0 + seed)) * v_ex.x; alb = vec3(0.0);
  }
#endif
#ifdef K10
  if(kind == 10){ // city ground with roads, markings, lamp pools
    vec2 p = v_wpos.xz - u_roadOrg;
    float AS = u_road.x, AW = u_road.y, SS = u_road.z, SW = u_road.w;
    float ax = p.x - AS*floor(p.x/AS + 0.5); float sz = p.y - SS*floor(p.y/SS + 0.5);
    float onAve = step(abs(ax), AW*0.5); float onSt = step(abs(sz), SW*0.5);
    float road = max(onAve, onSt);
    float side = max(step(abs(ax), AW*0.5+4.0), step(abs(sz), SW*0.5+4.0)) * (1.0-road);
    vec3 asph = vec3(0.035, 0.036, 0.04) * (0.85 + 0.3*vnoise(vec3(p*0.4, 1.0)));
    vec3 walk = vec3(0.16, 0.155, 0.15);
    vec3 blockC = vec3(0.07);
    alb = mix(blockC, walk, side); alb = mix(alb, asph, road);
    // lane dashes on avenues (not in intersections)
    float fwx = fwidth(p.x)+1e-4;
    float dash = onAve*(1.0-onSt) * smoothstep(0.22+fwx, 0.22, abs(abs(ax) - AW*0.25)) * step(0.5, fract(p.y/9.0));
    float center = onAve*(1.0-onSt) * smoothstep(0.35+fwx, 0.35, abs(ax));
    float zebra = onAve * (1.0-onSt) * step(abs(sz) - SW*0.5, 3.0) * step(SW*0.5, abs(sz)) * step(0.5, fract(p.x/1.6));
    alb = mix(alb, vec3(0.75), clamp(dash*0.9 + zebra*0.8, 0.0, 1.0));
    alb = mix(alb, vec3(0.75, 0.6, 0.15), center*0.9);
    // street lamp pools (lamps along avenue edges every 30)
    float lx = abs(ax) - (AW*0.5 - 0.8);
    float lzc = 30.0*floor(p.y/30.0 + 0.5); float lz = p.y - lzc;
    float lampIdx = floor((p.x/AS)+0.5)*1000.0 + floor(p.y/30.0+0.5) + sign(ax)*0.5;
    float pool = exp(-(lx*lx + lz*lz)/70.0) * gateGrid(lampIdx) * step(9.0, abs(lzc - 60.0*floor(lzc/60.0 + 0.5)));
    extraLight += vec3(1.0, 0.78, 0.5) * pool * 2.2;
    specK = 0.12*road; shin = 40.0;
  }
#endif
#ifdef K11
  if(kind == 11){ // grass/lawn
    alb = alb * (0.8 + 0.4*vnoise(vec3(v_wpos.xz*0.2, 2.0)));
  }
#endif
#ifdef K12
  if(kind == 12){ // particle (emissive fleck or dust), e3 = alive
#ifdef CUT
    if(v_ex.w < 0.5) discard;
#endif
    emis = vec3(1.0, 0.5, 0.18) * v_ex.x; alb *= 1.0;
  }
#endif
  // ---- lighting ----
  float ndl = max(dot(N, u_ldir), 0.0);
  float sh = ndl > 0.0 ? shadowAt(v_wpos, N) : 1.0;
  vec3 H = normalize(u_ldir + V);
  vec3 amb = mix(u_ambGnd, u_ambSky, N.y*0.5 + 0.5);
  vec3 diff = u_lcol * ndl * sh + amb + extraLight;
  vec3 spec = u_lcol * pow(max(dot(N, H), 0.0), shin) * specK * sh * ndl;
  for(int i=0;i<8;i++){ if(i >= u_npl) break;
    vec3 L = u_plp[i].xyz - v_wpos; float d = length(L); L /= max(d, 1e-3);
    float r = u_plp[i].w; float att = pow(clamp(1.0 - d/r, 0.0, 1.0), 2.0);
    float nl = max(dot(N, L), 0.0);
    diff += u_plc[i].rgb * u_plc[i].a * nl * att;
    vec3 Hp = normalize(L + V); spec += u_plc[i].rgb * u_plc[i].a * pow(max(dot(N,Hp),0.0), max(shin, 8.0)) * att * nl * (specK + metal*0.9);
  }
  vec3 col = alb * diff + spec;
#ifdef K5
  if(metal > 0.5){
    vec3 R = reflect(-V, N);
    float sp = pow(max(dot(normalize(R), u_ldir), 0.0), 1.0/(rough*rough*0.05+0.004));
    vec3 env = vec3(0.012) + vec3(0.16, 0.1, 0.05) * pow(max(dot(R, normalize(vec3(0.55, 0.45, -0.7))), 0.0), 6.0)
             + vec3(0.05, 0.065, 0.09) * pow(max(dot(R, normalize(vec3(-0.6, 0.6, -0.5))), 0.0), 3.0) + vec3(0.03) * clamp(R.y, 0.0, 1.0);
    col = alb * (diff*0.12 + env*1.4) + alb * spec * 2.2 + alb * u_lcol * sp * sh * 1.2;
  }
#endif
  col += emis;
  // fog
  float dist = length(u_cam - v_wpos);
  float hf = exp(-max(v_wpos.y, 0.0) / u_fogH);
  float fog = 1.0 - exp(-dist * u_fogDen * (0.35 + 0.65*hf));
  col = mix(col, u_fogCol, clamp(fog, 0.0, 1.0));
  o_col = vec4(col, 1.0);
}`;

const FS_PRE = `#version 300 es
precision mediump float;
void main(){}`;

const VS_QUAD = `#version 300 es
layout(location=0) in vec2 a_p; out vec2 v_uv; out vec2 v_ndc;
void main(){ v_ndc = a_p; v_uv = a_p*0.5+0.5; gl_Position = vec4(a_p, 0.0, 1.0); }`;

const FS_SKY = `#version 300 es
precision highp float;
in vec2 v_uv; in vec2 v_ndc;
uniform mat4 u_ivp; uniform vec3 u_cam; uniform float u_mirror;
uniform vec3 u_zen; uniform vec3 u_hor; uniform vec3 u_moonDir; uniform vec3 u_moonCol; uniform float u_moonAmt;
uniform vec3 u_sunDir; uniform vec3 u_sunCol; uniform float u_sunAmt; uniform float u_stars; uniform float u_time;
uniform vec3 u_glowCol; uniform vec3 u_glowDir; uniform float u_glowAmt; uniform float u_bgMode; uniform float u_bgPow;
out vec4 o;
${NOISE}
void main(){
  vec4 p = u_ivp * vec4(v_ndc, 1.0, 1.0); vec3 dir = normalize(p.xyz/p.w - u_cam);
  if(u_mirror > 0.5) dir.y = -dir.y;
  if(u_bgMode > 0.5){ // dark room with window bokeh (city lights through a window)
    vec2 q = v_uv;
    vec3 col = mix(vec3(0.006,0.006,0.009), vec3(0.018,0.02,0.03), q.y);
    vec2 g = q * vec2(13.0, 23.0);
    for(int k=0;k<3;k++){
      vec2 gk = g*(1.0+float(k)*0.37) + float(k)*7.3; vec2 ci = floor(gk); vec2 cf = fract(gk);
      float h = hash12(ci + float(k)*13.0);
      if(h > 0.45){
        vec2 o2 = vec2(hash12(ci+1.7), hash12(ci+3.1))*0.6+0.2; float d = length(cf - o2);
        float r = 0.14 + 0.16*hash12(ci+5.0);
        float disk = smoothstep(r, r*0.35, d) * 0.8;
        vec3 bc = mix(vec3(1.0,0.62,0.3), vec3(0.6,0.75,1.0), step(0.72, hash12(ci+9.0)));
        float on = clamp((u_bgPow - hash12(ci+11.0))*40.0, 0.0, 1.0);
        col += bc * disk * 0.22 * on * smoothstep(0.3, 0.8, q.y) * (0.4 + 0.6*hash12(ci+13.0));
      }
    }
    o = vec4(col, 1.0); return;
  }
  float e = dir.y;
  vec3 col = mix(u_hor, u_zen, pow(clamp(e, 0.0, 1.0), 0.42));
  vec3 hd = normalize(vec3(dir.x, 0.0, dir.z) + 1e-5);
  float gd = max(dot(hd, u_glowDir), 0.0);
  col += u_glowCol * u_glowAmt * exp(-max(e, 0.0)*9.0) * (0.35 + 0.65*pow(gd, 4.0));
  // sun
  float sd = max(dot(dir, u_sunDir), 0.0);
  col += u_sunCol * u_sunAmt * (pow(sd, 900.0)*40.0 + pow(sd, 18.0)*0.35 + pow(sd, 3.0)*0.08);
  // stars
  if(u_stars > 0.001 && e > 0.0){
    vec3 sp = dir * 320.0; vec3 ci = floor(sp); vec3 cf = fract(sp); float h = hash13(ci);
    if(h > 0.982){ vec3 oo = vec3(hash13(ci+1.3), hash13(ci+2.7), hash13(ci+4.1))*0.6+0.2; float d = length(cf - oo);
      float sz = 0.16 + 0.22*hash13(ci+5.5); float tw = 0.75 + 0.25*sin(u_time*3.0 + h*90.0);
      col += vec3(0.9, 0.93, 1.0) * smoothstep(sz, 0.0, d) * tw * u_stars * (0.4 + 1.6*hash13(ci+7.7)) * smoothstep(0.0, 0.18, e); }
    // faint milky band
    float band = exp(-pow(dot(dir, normalize(vec3(0.3, 0.55, 0.78))), 2.0)*30.0) * vnoise(dir*14.0);
    col += vec3(0.05, 0.055, 0.07) * band * u_stars;
  }
  // moon
  float md = dot(dir, u_moonDir);
  float disk = smoothstep(0.999925, 0.99996, md);
  float crater = 0.85 + 0.15*vnoise(dir*900.0);
  col += u_moonCol * u_moonAmt * (disk*3.2*crater + pow(max(md, 0.0), 9000.0)*0.5 + pow(max(md, 0.0), 300.0)*0.06 + pow(max(md,0.0), 12.0)*0.02);
  if(e < 0.0) col = mix(u_hor, u_hor*0.4, clamp(-e*6.0, 0.0, 1.0));
  o = vec4(col, 1.0);
}`;

const VS_WATER = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
uniform mat4 u_vp; uniform float u_level; out vec3 v_wpos;
void main(){ vec3 p = vec3(a_pos.x, u_level, a_pos.z); v_wpos = p; gl_Position = u_vp * vec4(p, 1.0); }`;

const FS_WATER = `#version 300 es
precision highp float;
in vec3 v_wpos;
uniform sampler2D u_refl; uniform vec2 u_res; uniform vec3 u_cam; uniform float u_time;
uniform vec3 u_deep; uniform vec3 u_ldir; uniform vec3 u_lcol; uniform float u_glint;
uniform vec3 u_fogCol; uniform float u_fogDen; uniform float u_fogH; uniform float u_distort;
out vec4 o;
${NOISE}
vec2 grad(vec2 p, float t){
  vec2 g = vec2(0.0);
  vec2 d1 = normalize(vec2(1.0, 0.35)), d2 = normalize(vec2(-0.6, 1.0)), d3 = normalize(vec2(0.2, -1.0)), d4 = normalize(vec2(0.9, 0.8));
  g += d1 * cos(dot(d1, p)*0.09 + t*0.9) * 0.6;
  g += d2 * cos(dot(d2, p)*0.17 + t*1.3) * 0.35;
  g += d3 * cos(dot(d3, p)*0.31 + t*1.9) * 0.22;
  g += d4 * cos(dot(d4, p)*0.57 + t*2.6) * 0.12;
  float n1 = vnoise2(p*0.35 + vec2(t*0.3, t*0.2)); float n2 = vnoise2(p*0.35 + vec2(0.13, 0.0) + vec2(t*0.3, t*0.2));
  float n3 = vnoise2(p*0.35 + vec2(0.0, 0.13) + vec2(t*0.3, t*0.2));
  g += vec2(n2 - n1, n3 - n1) * 3.0;
  return g;
}
void main(){
  vec3 V = normalize(u_cam - v_wpos); float dist = length(u_cam - v_wpos);
  vec2 g = grad(v_wpos.xz, u_time);
  float fade = 1.0 / (1.0 + dist*0.004);
  vec3 N = normalize(vec3(-g.x*0.12*fade, 1.0, -g.y*0.12*fade));
  vec2 uv = gl_FragCoord.xy / u_res;
  uv += vec2(N.x*0.25, N.z*1.0) * u_distort * fade;
  vec3 refl = texture(u_refl, clamp(uv, 0.001, 0.999)).rgb;
  float fres = 0.025 + 0.975*pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 col = mix(u_deep, refl, clamp(fres*1.15 + 0.12, 0.0, 1.0));
  vec3 H = normalize(V + u_ldir);
  col += u_lcol * pow(max(dot(N, H), 0.0), 600.0) * u_glint * 30.0;
  float hf = exp(-max(v_wpos.y,0.0)/u_fogH);
  float fog = 1.0 - exp(-dist * u_fogDen * (0.35 + 0.65*hf));
  col = mix(col, u_fogCol, clamp(fog, 0.0, 1.0));
  o = vec4(col, 1.0);
}`;

const FS_BRIGHT = `#version 300 es
precision highp float; in vec2 v_uv; uniform sampler2D u_src; uniform vec2 u_texel; uniform float u_thr; out vec4 o;
void main(){ vec3 c = vec3(0.0);
  c += texture(u_src, v_uv + u_texel*vec2(-0.5,-0.5)).rgb; c += texture(u_src, v_uv + u_texel*vec2(0.5,-0.5)).rgb;
  c += texture(u_src, v_uv + u_texel*vec2(-0.5,0.5)).rgb; c += texture(u_src, v_uv + u_texel*vec2(0.5,0.5)).rgb; c *= 0.25;
  float l = max(c.r, max(c.g, c.b)); vec3 b = c * max(l - u_thr, 0.0) / max(l, 1e-4); o = vec4(min(b, vec3(60.0)), 1.0); }`;
const FS_BLUR = `#version 300 es
precision highp float; in vec2 v_uv; uniform sampler2D u_src; uniform vec2 u_dir; out vec4 o;
void main(){ vec3 c = texture(u_src, v_uv).rgb * 0.227027;
  c += texture(u_src, v_uv + u_dir*1.3846153846).rgb * 0.3162162162; c += texture(u_src, v_uv - u_dir*1.3846153846).rgb * 0.3162162162;
  c += texture(u_src, v_uv + u_dir*3.2307692308).rgb * 0.0702702703; c += texture(u_src, v_uv - u_dir*3.2307692308).rgb * 0.0702702703;
  o = vec4(c, 1.0); }`;
const FS_COMP = `#version 300 es
precision highp float; in vec2 v_uv;
uniform sampler2D u_scene, u_b1, u_b2, u_b3; uniform float u_exp, u_bloom, u_time, u_glitch, u_vig, u_grain, u_fade, u_flash;
uniform vec3 u_lift, u_gain; uniform float u_sat;
out vec4 o;
${NOISE}
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
void main(){
  vec2 uv = v_uv; vec3 c;
  if(u_glitch > 0.001){
    float row = floor(uv.y*48.0); float sh = (hash12(vec2(row, floor(u_time*30.0))) - 0.5) * 0.05 * u_glitch * step(0.6, hash12(vec2(row*1.7, floor(u_time*30.0))));
    uv.x += sh; float ca = 0.008*u_glitch;
    c = vec3(texture(u_scene, uv + vec2(ca, 0.0)).r, texture(u_scene, uv).g, texture(u_scene, uv - vec2(ca, 0.0)).b);
  } else c = texture(u_scene, uv).rgb;
  vec3 bl = texture(u_b1, uv).rgb*0.5 + texture(u_b2, uv).rgb*0.45 + texture(u_b3, uv).rgb*0.5;
  c += bl * u_bloom;
  c *= u_exp;
  c += vec3(u_flash);
  c = aces(c);
  c = pow(c, vec3(1.0/2.2));
  float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, u_sat);
  c = c*u_gain + u_lift*(1.0 - c);
  vec2 d = v_uv - 0.5; d.y *= 1.25; c *= 1.0 - u_vig*pow(clamp(length(d)*1.35, 0.0, 1.0), 2.4);
  c += (hash12(gl_FragCoord.xy + fract(u_time*7.13)*317.0) - 0.5) * u_grain;
  c *= u_fade;
  o = vec4(c, 1.0);
}`;

// ---------- engine ----------
export class Engine {
  constructor(canvas, W, H, opts = {}) {
    this.W = W; this.H = H; this.opts = opts;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('no webgl2');
    this.gl = gl;
    this.hdr = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    this.fmt = this.hdr ? gl.RGBA16F : gl.RGBA8;
    this.samples = Math.min(opts.msaa ?? 4, gl.getParameter(gl.MAX_SAMPLES));
    this.progs = {
      depth: this.prog(VS_INST, FS_DEPTH), pre: this.prog(VS_INST, FS_PRE), sky: this.prog(VS_QUAD, FS_SKY),
      water: this.prog(VS_WATER, FS_WATER), bright: this.prog(VS_QUAD, FS_BRIGHT), blur: this.prog(VS_QUAD, FS_BLUR), comp: this.prog(VS_QUAD, FS_COMP),
    };
    this.mainProgs = new Map();
    this.quad = this.makeQuad();
    this.waterVAO = this.makeWaterPlane();
    this.initTargets();
    this.meshCache = new Map();
    this.winTex = this.makeWindowTexture();
    this.coinTex = null;
    this.info = { hdr: this.hdr, samples: this.samples, renderer: gl.getParameter(gl.RENDERER) };
  }
  prog(vs, fs) {
    const gl = this.gl;
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) + '\n' + s.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n').slice(0, 200)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); const name = a.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  }
  mainProg(b) {
    const key = (b.cut ? 'c' : 'o') + b.kinds.join(',');
    if (!this.mainProgs.has(key)) this.mainProgs.set(key, this.prog(VS_INST, FS_MAIN(!!b.cut, b.kinds)));
    return this.mainProgs.get(key);
  }
  drawMain(S, vp, cam, which) {
    const gl = this.gl; const groups = new Map();
    for (const b of S.batches) { if (!b.visible || b.count <= 0) continue; if (which === 'refl' && !b.refl) continue;
      const P = this.mainProg(b); if (!groups.has(P)) groups.set(P, []); groups.get(P).push(b); }
    const order = [...groups.entries()].sort((x, y) => (x[1][0].cut ? 1 : 0) - (y[1][0].cut ? 1 : 0));
    for (const [P, bs] of order) {
      gl.useProgram(P.p); this.setCommon(P, S, vp, cam);
      const pre = this.opts.prepass && which === 'main' && !bs[0].cut; if (pre) { gl.depthFunc(gl.LEQUAL); gl.depthMask(false); }
      for (const b of bs) { gl.bindVertexArray(b.vao); gl.drawElementsInstanced(gl.TRIANGLES, b.mesh.n, gl.UNSIGNED_SHORT, 0, b.count);
        if (this._mark && which === 'main') this._mark((b.name || '?') + '[' + b.count + ']'); }
      gl.depthFunc(gl.LESS); gl.depthMask(true);
    }
    gl.bindVertexArray(null);
  }
  makeQuad() { const gl = this.gl; const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null); return vao; }
  makeWaterPlane() { const gl = this.gl; const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    const S = 9000; gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-S, 0, -S, S, 0, -S, S, 0, S, -S, 0, -S, S, 0, S, -S, 0, S]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null); return vao; }
  tex(w, h, fmt, filter = 'LINEAR') { const gl = this.gl; const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[filter]); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[filter]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
  fboTex(t) { const gl = this.gl; const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; }
  initTargets() {
    const gl = this.gl, W = this.W, H = this.H;
    // MSAA main
    this.msFBO = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFBO);
    const cr = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, cr); if (this.samples > 0) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, this.fmt, W, H); else gl.renderbufferStorage(gl.RENDERBUFFER, this.fmt, W, H);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, cr);
    const dr = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, dr); if (this.samples > 0) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, W, H); else gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dr);
    this.sceneTex = this.tex(W, H, this.fmt); this.sceneFBO = this.fboTex(this.sceneTex);
    // reflection (half res)
    const rf = this.opts.reflDiv || 2; this.rW = Math.round(W / rf); this.rH = Math.round(H / rf);
    this.reflTex = this.tex(this.rW, this.rH, this.fmt); this.reflFBO = this.fboTex(this.reflTex);
    const rd = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rd); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, this.rW, this.rH);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.reflFBO); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rd);
    // shadow
    this.SM = 1280; this.shadowTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, this.SM, this.SM);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.shadowFBO = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    // bloom chain
    this.bl = [];
    for (const d of [2, 4, 8]) { const w = Math.max(1, W / d | 0), h = Math.max(1, H / d | 0); const a = this.tex(w, h, this.fmt), b = this.tex(w, h, this.fmt);
      this.bl.push({ w, h, a, b, fa: this.fboTex(a), fb: this.fboTex(b) }); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  makeWindowTexture() {
    const gl = this.gl, S = 512, d = new Uint8Array(S * S * 4);
    let s = 1234567; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let y = 0; y < S; y++) {
      const floorOn = rnd() < 0.85 ? 1 : 0.15; // some floors mostly dark
      for (let x = 0; x < S; x++) {
        const i = (y * S + x) * 4; const on = rnd() < 0.42 * floorOn;
        if (!on) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = 255; continue; }
        const cool = rnd() < 0.28; const k = 0.45 + 0.55 * rnd();
        const c = cool ? [0.72, 0.84, 1.0] : [1.0, 0.7, 0.38];
        d[i] = c[0] * k * 255; d[i + 1] = c[1] * k * 255; d[i + 2] = c[2] * k * 255; d[i + 3] = 255;
      }
    }
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, d); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return t;
  }
  setCoinTexture(canvas2d) {
    const gl = this.gl; const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas2d); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.coinTex = t;
  }
  mesh(name, builder) {
    if (this.meshCache.has(name)) return this.meshCache.get(name);
    const gl = this.gl, m = builder(); const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, m.v, gl.STATIC_DRAW);
    const ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.i, gl.STATIC_DRAW);
    const r = { vbo, ibo, n: m.i.length }; this.meshCache.set(name, r); return r;
  }
  batch(mesh, data, dynamic = false) { // data: Float32Array of instances
    const gl = this.gl; const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    for (let k = 0; k < 5; k++) { gl.enableVertexAttribArray(3 + k); gl.vertexAttribPointer(3 + k, 4, gl.FLOAT, false, 80, k * 16); gl.vertexAttribDivisor(3 + k, 1); }
    gl.bindVertexArray(null);
    const ks = new Set(); for (let i = 3; i < data.length; i += 20) ks.add(Math.round(data[i]));
    return { vao, ib, mesh, count: data.length / 20, cap: data.length / 20, visible: true, shadow: true, refl: true, srcData: dynamic ? null : data, kinds: [...ks].sort((x, y) => x - y) };
  }
  viewProj(camera) {
    const proj = M4.persp(camera.fov * Math.PI / 180, this.W / this.H, camera.near || 0.5, camera.far || 6000);
    return M4.mul(proj, M4.lookAt(camera.pos, camera.target, camera.up || [0, 1, 0]));
  }
  // front-to-back sort + frustum + horizon occlusion culling (buildings stand on the ground)
  cullBatch(b, camera, horizon = true) {
    if (!b.srcData) return; const src = b.srcData; const n = src.length / 20; const cam = camera.pos;
    const vp = this.viewProj(camera);
    const d = new Float32Array(n); const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) { const o = i * 20; idx[i] = i; d[i] = (src[o] - cam[0]) ** 2 + (src[o + 2] - cam[2]) ** 2; }
    const ord = Array.from(idx).sort((x, y) => d[x] - d[y]);
    const C = 640; const hor = new Float32Array(C).fill(-2);
    if (!b.sorted) b.sorted = new Float32Array(src.length);
    let m = 0;
    for (const i of ord) {
      const o = i * 20; const px = src[o], py = src[o + 1], pz = src[o + 2], sx = src[o + 8] / 2, sy = src[o + 9] / 2, sz = src[o + 10] / 2;
      let minX = 9, maxX = -9, topMax = -9, topMin = 9, behind = false, minY = 9;
      for (let c = 0; c < 8; c++) {
        const x = px + (c & 1 ? sx : -sx), y = py + (c & 2 ? sy : -sy), z = pz + (c & 4 ? sz : -sz);
        const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12], cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13], cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
        if (cw <= 0.5) { behind = true; break; }
        const X = cx / cw, Y = cy / cw; minX = Math.min(minX, X); maxX = Math.max(maxX, X); minY = Math.min(minY, Y);
        if (c & 2) { topMax = Math.max(topMax, Y); topMin = Math.min(topMin, Y); }
      }
      if (!behind) {
        if (maxX < -1 || minX > 1 || minY > 1 || topMax < -1) continue; // outside frustum
        if (horizon) {
          const c0 = Math.max(0, Math.floor((minX + 1) / 2 * C)), c1 = Math.min(C - 1, Math.ceil((maxX + 1) / 2 * C));
          let hidden = true; for (let c = c0; c <= c1; c++) if (hor[c] < topMax) { hidden = false; break; }
          if (hidden) continue;
          const i0 = Math.max(0, Math.ceil((minX + 1) / 2 * C) + 1), i1 = Math.min(C - 1, Math.floor((maxX + 1) / 2 * C) - 1);
          if (src[o + 19] < 1.5) for (let c = i0; c <= i1; c++) if (hor[c] < topMin) hor[c] = topMin;
        }
      }
      b.sorted.set(src.subarray(o, o + 20), m * 20); m++;
    }
    this.updateBatch(b, b.sorted, m); b.lastCull = m;
  }
  sortBatch(b, cam) { // reorder static instances front-to-back for early-z
    if (!b.src) { const gl = this.gl; b.src = b.srcData; if (!b.src) return; }
    const n = b.src.length / 20; if (!b.order) b.order = new Uint32Array(n).map((_, i) => i);
    const d = new Float32Array(n); for (let i = 0; i < n; i++) { const o = i * 20; d[i] = (b.src[o] - cam[0]) ** 2 + (b.src[o + 1] - cam[1]) ** 2 + (b.src[o + 2] - cam[2]) ** 2; }
    const ord = Array.from(b.order); ord.sort((x, y) => d[x] - d[y]);
    if (!b.sorted) b.sorted = new Float32Array(b.src.length);
    for (let i = 0; i < n; i++) b.sorted.set(b.src.subarray(ord[i] * 20, ord[i] * 20 + 20), i * 20);
    this.updateBatch(b, b.sorted, n);
  }
  updateBatch(b, data, count) { const gl = this.gl; gl.bindBuffer(gl.ARRAY_BUFFER, b.ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * 20); b.count = count; }

  setCommon(P, S, vp, cam) {
    const gl = this.gl, u = P.u;
    gl.uniformMatrix4fv(u.u_vp, false, vp);
    if (!u.u_cam) return;
    gl.uniform3fv(u.u_cam, cam);
    gl.uniform3fv(u.u_ldir, S.light.dir); gl.uniform3fv(u.u_lcol, S.light.col);
    gl.uniformMatrix4fv(u.u_smat, false, this.shadowVP || M4.ident()); gl.uniform1f(u.u_shadowOn, S.shadow ? 1 : 0); gl.uniform1f(u.u_sbias, S.shadow ? S.shadow.bias : 0.1);
    gl.uniform3fv(u.u_ambSky, S.amb.sky); gl.uniform3fv(u.u_ambGnd, S.amb.gnd);
    gl.uniform3fv(u.u_fogCol, S.fog.col); gl.uniform1f(u.u_fogDen, S.fog.den); gl.uniform1f(u.u_fogH, S.fog.h);
    const pl = S.pls || []; const n = Math.min(8, pl.length); gl.uniform1i(u.u_npl, n);
    if (n) { const pp = new Float32Array(32), pc = new Float32Array(32); for (let i = 0; i < n; i++) { pp.set(pl[i].p, i * 4); pp[i * 4 + 3] = pl[i].r; pc.set(pl[i].c, i * 4); pc[i * 4 + 3] = pl[i].i; }
      gl.uniform4fv(u.u_plp, pp); gl.uniform4fv(u.u_plc, pc); }
    gl.uniform1f(u.u_restore, S.restore); gl.uniform1f(u.u_carPow, S.carPow ?? 1); gl.uniform1f(u.u_time, S.time);
    gl.uniform1f(u.u_skinCut, S.skinCut || 0); gl.uniform1f(u.u_copper, S.copper ?? 1); gl.uniform1f(u.u_day, S.day || 0);
    gl.uniform3fv(u.u_skyZen, S.sky.zen); gl.uniform3fv(u.u_skyHor, S.sky.hor);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex); gl.uniform1i(u.u_smap, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.winTex); gl.uniform1i(u.u_winTex, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.coinTex || this.winTex); gl.uniform1i(u.u_coinTex, 2);
    const coins = S.coins || []; gl.uniform1i(u.u_ncoins, coins.length);
    if (coins.length) { const a = new Float32Array(48); coins.forEach((c, i) => a.set(c, i * 4)); gl.uniform4fv(u.u_coins, a); }
    const r = S.road || [90, 22, 60, 14]; gl.uniform4fv(u.u_road, r); gl.uniform2fv(u.u_roadOrg, S.roadOrg || [0, 0]);
  }
  drawBatches(P, S, which, cutSel) {
    const gl = this.gl;
    for (const b of S.batches) { if (!b.visible || b.count <= 0) continue; if (which === 'shadow' && !b.shadow) continue; if (which === 'refl' && !b.refl) continue;
      if (cutSel !== undefined && !!b.cut !== cutSel) continue;
      gl.bindVertexArray(b.vao); gl.drawElementsInstanced(gl.TRIANGLES, b.mesh.n, gl.UNSIGNED_SHORT, 0, b.count); if (this._mark && which === 'main') this._mark((b.name || '?') + '[' + b.count + ']'); }
    gl.bindVertexArray(null);
  }
  drawSky(S, vp, cam, mirror) {
    const gl = this.gl, P = this.progs.sky, u = P.u; gl.useProgram(P.p);
    gl.uniformMatrix4fv(u.u_ivp, false, M4.inv(vp)); gl.uniform3fv(u.u_cam, cam); gl.uniform1f(u.u_mirror, mirror ? 1 : 0);
    const k = S.sky; gl.uniform3fv(u.u_zen, k.zen); gl.uniform3fv(u.u_hor, k.hor);
    gl.uniform3fv(u.u_moonDir, k.moonDir); gl.uniform3fv(u.u_moonCol, k.moonCol); gl.uniform1f(u.u_moonAmt, k.moonAmt);
    gl.uniform3fv(u.u_sunDir, k.sunDir); gl.uniform3fv(u.u_sunCol, k.sunCol); gl.uniform1f(u.u_sunAmt, k.sunAmt);
    gl.uniform1f(u.u_stars, k.stars); gl.uniform1f(u.u_time, S.time);
    gl.uniform3fv(u.u_glowCol, k.glowCol); gl.uniform3fv(u.u_glowDir, k.glowDir); gl.uniform1f(u.u_glowAmt, k.glowAmt);
    gl.uniform1f(u.u_bgMode, k.bgMode || 0); gl.uniform1f(u.u_bgPow, k.bgPow ?? 1);
    gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(this.quad); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
    gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
  }
  render(S, camera) {
    const gl = this.gl, W = this.W, H = this.H;
    const prof = this.profile ? [] : null; const mark = (n) => { if (prof) { if (!this.syncFBO) { this.syncTex = this.tex(1, 1, gl.RGBA8); this.syncFBO = this.fboTex(this.syncTex); this.syncBuf = new Uint8Array(4); } const rb = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.syncFBO); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.syncBuf); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, rb); prof.push([n, performance.now()]); } }; mark('start'); this._mark = prof ? mark : null;
    const proj = M4.persp(camera.fov * Math.PI / 180, W / H, camera.near || 0.5, camera.far || 6000);
    const view = M4.lookAt(camera.pos, camera.target, camera.up || [0, 1, 0]);
    const vp = M4.mul(proj, view);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    // shadow pass
    if (S.shadow) {
      const sc = S.shadow.center, r = S.shadow.radius, ld = S.light.dir;
      const eye = V3.add(sc, V3.scale(ld, S.shadow.dist || r * 2));
      const up = Math.abs(ld[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
      const lv = M4.lookAt(eye, sc, up); const lp = M4.ortho(-r, r, -r, r, 1, (S.shadow.dist || r * 2) * 2.2);
      this.shadowVP = M4.mul(lp, lv);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO); gl.viewport(0, 0, this.SM, this.SM); gl.clear(gl.DEPTH_BUFFER_BIT);
      const P = this.progs.depth; gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.u_vp, false, this.shadowVP); gl.uniform1f(P.u.u_skinCut, S.skinCut || 0);
      gl.colorMask(false, false, false, false); this.drawBatches(P, S, 'shadow'); gl.colorMask(true, true, true, true);
    }
    mark('shadow');
    // reflection pass
    if (S.water) {
      const L = S.water.level; const R = new Float32Array([1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 2 * L, 0, 1]);
      const rvp = M4.mul(vp, R);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.reflFBO); gl.viewport(0, 0, this.rW, this.rH); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      this.drawSky(S, vp, camera.pos, true);
      this.drawMain(S, rvp, camera.pos, 'refl');
    }
    mark('refl');
    // main pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFBO); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.drawSky(S, vp, camera.pos, false);
    mark('sky');
    if (this.opts.prepass) { const P = this.progs.pre; gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.u_vp, false, vp); gl.colorMask(false, false, false, false);
      const keep = this._mark; this._mark = null; this.drawBatches(P, S, 'pre', false); this._mark = keep; gl.colorMask(true, true, true, true); mark('pre'); }
    this.drawMain(S, vp, camera.pos, 'main'); mark('batches');
    if (S.water) {
      const P = this.progs.water, u = P.u; gl.useProgram(P.p);
      gl.uniformMatrix4fv(u.u_vp, false, vp); gl.uniform1f(u.u_level, S.water.level);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.reflTex); gl.uniform1i(u.u_refl, 0);
      gl.uniform2f(u.u_res, W, H); gl.uniform3fv(u.u_cam, camera.pos); gl.uniform1f(u.u_time, S.time);
      gl.uniform3fv(u.u_deep, S.water.deep); gl.uniform3fv(u.u_ldir, S.light.dir); gl.uniform3fv(u.u_lcol, S.light.col); gl.uniform1f(u.u_glint, S.water.glint ?? 1);
      gl.uniform3fv(u.u_fogCol, S.fog.col); gl.uniform1f(u.u_fogDen, S.fog.den); gl.uniform1f(u.u_fogH, S.fog.h); gl.uniform1f(u.u_distort, S.water.distort ?? 0.03);
      gl.bindVertexArray(this.waterVAO); gl.drawArrays(gl.TRIANGLES, 0, 6); gl.bindVertexArray(null);
    }
    mark('main');
    // resolve
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msFBO); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.sceneFBO);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.disable(gl.DEPTH_TEST);
    // bloom
    const post = S.post;
    const B = this.progs.bright, BL = this.progs.blur;
    gl.useProgram(B.p); gl.bindFramebuffer(gl.FRAMEBUFFER, this.bl[0].fa); gl.viewport(0, 0, this.bl[0].w, this.bl[0].h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.sceneTex); gl.uniform1i(B.u.u_src, 0); gl.uniform2f(B.u.u_texel, 1 / W, 1 / H); gl.uniform1f(B.u.u_thr, post.thr);
    gl.bindVertexArray(this.quad); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.useProgram(BL.p); gl.uniform1i(BL.u.u_src, 0);
    for (let i = 0; i < 3; i++) {
      const L = this.bl[i];
      if (i > 0) { // downsample from previous level
        gl.bindFramebuffer(gl.FRAMEBUFFER, L.fa); gl.viewport(0, 0, L.w, L.h); gl.bindTexture(gl.TEXTURE_2D, this.bl[i - 1].a);
        gl.uniform2f(BL.u.u_dir, 0, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      for (let pass = 0; pass < 1; pass++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, L.fb); gl.viewport(0, 0, L.w, L.h); gl.bindTexture(gl.TEXTURE_2D, L.a); gl.uniform2f(BL.u.u_dir, 1.4 / L.w, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, L.fa); gl.bindTexture(gl.TEXTURE_2D, L.b); gl.uniform2f(BL.u.u_dir, 0, 1.4 / L.h); gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }
    // composite to canvas
    const C = this.progs.comp, u = C.u; gl.useProgram(C.p); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    const texs = [this.sceneTex, this.bl[0].a, this.bl[1].a, this.bl[2].a]; const names = ['u_scene', 'u_b1', 'u_b2', 'u_b3'];
    texs.forEach((t, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u[names[i]], i); });
    gl.uniform1f(u.u_exp, post.exposure); gl.uniform1f(u.u_bloom, post.bloom); gl.uniform1f(u.u_time, S.time); gl.uniform1f(u.u_glitch, post.glitch || 0);
    gl.uniform1f(u.u_vig, post.vig ?? 0.35); gl.uniform1f(u.u_grain, post.grain ?? 0.035); gl.uniform1f(u.u_fade, post.fade ?? 1); gl.uniform1f(u.u_flash, post.flash || 0);
    gl.uniform3fv(u.u_lift, post.lift || [0, 0, 0]); gl.uniform3fv(u.u_gain, post.gain || [1, 1, 1]); gl.uniform1f(u.u_sat, post.sat ?? 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
    mark('post');
    if (prof) this.lastProf = prof.slice(1).map((p, i) => p[0] + ':' + (p[1] - prof[i][1]).toFixed(0)).join(' ');
  }
  finish() { this.gl.finish(); }
}
