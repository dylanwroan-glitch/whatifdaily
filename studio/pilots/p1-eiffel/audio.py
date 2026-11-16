# audio.py — narrated Eiffel cut: narration on top, an original cinematic score that follows the story (tension under the
# facts, a heavy build under the melt, a drop-out before the reveal, an open, airy end), sound effects on every key moment,
# music ducked under the voice, mastered to about -14 LUFS.
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib'))
from audiolib import *
seed(1889)
E = json.load(open(os.path.join(HERE, 'edit.json'))); DUR = E['DURATION']; EV = E['EV']
SH = {s['name']: s for s in E['SHOTS']}
def T0(n, d=0.0): return SH[n]['t0'] + d
def T1(n): return SH[n]['t1']
voice, music, sfx = Bus(DUR + 1), Bus(DUR + 1), Bus(DUR + 1)

# ---------------- narration ----------------
for v in E['VOICE']:
    x = load_wav(os.path.join(HERE, 'vo', v['id'] + '.wav')); voice.place(x, v['at'])
voice.x = voice_chain(voice.x.mean(1))[:, None] * np.ones((1, 2))
voice.x = reverb(voice.x, 0.9, 0.18, 0.06, 6000)

# ---------------- score (D minor, 120 BPM pulse) ----------------
BEAT = 0.5; BAR = 2.0
DM, BB, GM, A7, F, C = [50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [43, 55, 58, 62, 67], [45, 52, 57, 61, 64], [41, 53, 57, 60, 65], [48, 55, 60, 64, 67]
REVEAL, TEASE, AIR = EV['reveal'], EV['tease'], T0('D_wide')
# strings bed: minor until the reveal, then the same progression lifts to major colours
prog_a = [DM, BB, GM, A7]; prog_b = [BB, F, C, DM]
t = 0.0; k = 0
while t < DUR:
    sec = BAR * 2 + 0.6
    if TEASE <= t < REVEAL: t += BAR; continue
    ch = (prog_a if t < REVEAL else prog_b)[k % 4]
    g = 0.05 if t < T0('B_heat') else (0.075 if t < T0('C_cube') else (0.055 if t < REVEAL else 0.07))
    music.place(strings(ch, min(sec, max(0.5, (TEASE if t < TEASE else DUR) - t + 0.3)), 2600 if t >= REVEAL else 1800), t, g)
    t += BAR * 2; k += 1
# pulse ostinato: 8th-note low strings / synth bass, the engine of the tension
t = 0.0; i = 0
while t < DUR:
    if not (TEASE <= t < REVEAL):
        root = {0: 38, 1: 34, 2: 31, 3: 33}[int(t // (BAR * 2)) % 4] if t < REVEAL else {0: 34, 1: 29, 2: 36, 3: 38}[int((t - REVEAL) // (BAR * 2)) % 4]
        acc = 1.0 if i % 4 == 0 else 0.62
        music.place(bass(root + (12 if i % 8 == 6 else 0), BEAT / 2 * 0.9, 700 if t < T0('B_heat') else 1100), t, 0.11 * acc)
    t += BEAT / 2; i += 1
# drums: sparse at first, taiko-like toms under the melt, a steady kit after the reveal
nb = int(DUR / BEAT) + 1
for j in range(nb):
    t = j * BEAT
    if TEASE <= t < REVEAL or t >= DUR - 0.3: continue
    if t < T0('B_heat'):
        if j % 4 == 0: music.place(kick(0.9), t, 0.5)
        if j % 2 == 1: music.place(hat(0.05), t, 0.05)
    elif t < T0('C_cube'):
        music.place(kick(1.0), t, 0.55); music.place(timpani(38 if j % 2 == 0 else 43, 1.2), t, 0.18 if j % 2 == 0 else 0.1)
        if j % 2 == 1: music.place(snare(), t, 0.16); music.place(clap(), t, 0.12)
        for q in range(2): music.place(hat(0.04), t + q * BEAT / 2, 0.05)
    else:
        if j % 4 in (0, 2) or (t >= REVEAL and j % 8 == 3): music.place(kick(0.9), t, 0.5)
        if j % 4 in (1, 3): music.place(clap(), t, 0.16); music.place(snare(), t, 0.08)
        for q in range(2): music.place(hat(0.04), t + q * BEAT / 2, 0.055 if q else 0.04)
# a soft piano motif over the cube and the air section
for j, (tt0, notes) in enumerate([(T0('C_size'), [74, 77, 81]), (T0('C_foot'), [74, 77, 79]), (AIR, [74, 78, 81, 86]), (T0('E_why'), [74, 77, 81, 84]), (T0('E_holes'), [77, 81, 84, 89])]):
    for q, m in enumerate(notes): music.place(piano(m, 2.2, 0.8), tt0 + 0.15 + q * 0.25, 0.05)

# ---------------- sound design ----------------
def sizzle(sec, lo=2500, hi=9000, rate=40.0):
    x = bp(noise(sec), lo, hi) * 0.6; n = len(x)
    for i0 in np.random.default_rng(5).integers(0, max(1, n - 400), int(rate * sec)):
        L = int(np.random.default_rng(i0).uniform(0.002, 0.01) * SR); x[i0:i0 + L] += hp(nz(L), 3000) * np.exp(-np.arange(L) / SR / 0.002)
    return x
def roar(sec, f0=120, f1=900):
    x = sweep(sec, f0, f1, 0.8, 1.0) + lp(noise(sec), 300) * 0.6; t = tt(sec)
    return x * (0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 1.3 * t + 1))
def groan(sec, f0=55, f1=38):
    t = tt(sec); f = f0 * (f1 / f0) ** (t / sec); ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(ph * r + 0.7 * r) * a for r, a in [(1, 1), (2.7, 0.5), (4.1, 0.35), (6.3, 0.2)])
    return lp(x * (1 + 4 * lp(noise(sec), 30)), 1800) * np.minimum(1, t / 0.2) * np.minimum(1, (sec - t) / 0.3)
def clank(f=900):
    t = tt(0.6); return sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) * a for r, a, d in [(1, 1, 0.12), (2.41, 0.6, 0.07), (3.98, 0.35, 0.05), (5.6, 0.2, 0.03)]) + hp(noise(0.6), 3000) * np.exp(-t / 0.004) * 0.5
def rivet():
    t = tt(0.07); return bp(nz(len(t)), 1800, 6000) * np.exp(-t / 0.004) + np.sin(2 * np.pi * 950 * t) * np.exp(-t / 0.012) * 0.5
def drip(f):
    t = tt(0.18); return np.sin(2 * np.pi * f * (1 + 0.8 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.03) * 0.5 + hp(nz(len(t)), 4000) * np.exp(-t / 0.01) * 0.25
def splash(sec=0.8):
    t = tt(sec); return lp(noise(sec), 2500) * np.exp(-t / 0.15) + sizzle(sec, 2000, 8000, 60) * np.exp(-t / 0.4) * 0.8
def wind(sec, lo=250, hi=1100):
    t = tt(sec); m = 0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t) * np.sin(2 * np.pi * 0.07 * t + 1); return (bp(noise(sec), lo, hi) * m + bp(noise(sec), hi * 1.3, hi * 2.9) * 0.25 * m ** 2) * 1.4
# the hook: a cinematic hit and an iron clang on frame 1
sfx.place(braam(26, 3.0), 0.0, 0.5); sfx.place(impact(2.2), 0.0, 0.35); sfx.place(clank(330), 0.02, 0.18, 0.2)
# every cut: a soft whoosh into it
for i, c in enumerate(E['CUTS']): sfx.place(whoosh(0.3, i % 2 == 0), c - 0.2, 0.12, 0.4 * (1 if i % 2 else -1))
# counters: ticks while rolling, a hit + ding where the number is spoken
for key, n in (('tall', 14), ('iron', 16), ('temp', 18), ('cube', 12)):
    a, b = EV[key]
    for j in range(n): sfx.place(tick(), a + (b - a) * (j / n) ** 0.7, 0.04 + 0.03 * j / n, np.sin(j * 2.1) * 0.4)
    sfx.place(impact(1.4), b, 0.22); sfx.place(ding(96 if key != 'temp' else 91), b, 0.07)
sfx.place(clank(220), EV['iron'][1], 0.2)
a, b = EV['rivets']
for j in range(22): sfx.place(rivet(), a + (b - a) * j / 22, 0.14, 0.3 * np.sin(j * 1.3))
sfx.place(impact(1.4), b, 0.22); sfx.place(ding(98), b, 0.07)
# heat and melt
sfx.place(fade(roar(T1('B_heat') - T0('B_heat') + 0.2, 100, 1200), 0.2, 0.1), T0('B_heat'), 0.16)
M0, M1 = T0('B_top'), T1('B_legs')
sfx.place(fade(sizzle(M1 - M0 + 0.4, 2200, 9000, 70), 0.15, 0.4), M0, 0.07)
sfx.place(fade(roar(M1 - M0, 80, 500), 0.3, 0.4), M0, 0.1)
sfx.place(groan(2.0, 62, 40), M0 + 0.1, 0.2); sfx.place(groan(2.2, 48, 30), T0('B_mid', 0.2), 0.24)
r = np.random.default_rng(7)
for j in range(40): sfx.place(drip(r.uniform(1400, 2600)), M0 + r.uniform(0, M1 - M0), 0.04, r.uniform(-0.7, 0.7))
for j in range(10): sfx.place(splash(0.6), T0('B_mid', 0.1) + r.uniform(0, M1 - T0('B_mid')), 0.05, r.uniform(-0.5, 0.5))
sfx.place(impact(2.0), T0('B_mid', 0.95), 0.3); sfx.place(impact(2.0), T0('B_legs', 0.5), 0.3); sfx.place(splash(1.4), T1('B_legs') - 0.3, 0.18)
# the cube rises and sets; slides into the footprint; spreads with a long hiss
G0, G1 = EV['gather0'], EV['gather1']
sfx.place(fade(sweep(G1 - G0, 120, 1500, 0.6, 1.4), 0.1, 0.05), G0, 0.14); sfx.place(thump(), G1, 0.45); sfx.place(clank(160), G1, 0.16); sfx.place(k808(31, 1.0, 0.8), G1, 0.2)
sfx.place(fade(sweep(EV['slide1'] - EV['slide0'], 200, 900, 0.5, 1.0) + lp(noise(EV['slide1'] - EV['slide0']), 400), 0.05, 0.05), EV['slide0'], 0.12, 0.3)
sfx.place(thump(), EV['slide1'], 0.45); sfx.place(clank(140), EV['slide1'], 0.12)
S0, S1 = EV['spread0'], EV['spread1']
sfx.place(fade(sizzle(S1 - S0 + 0.3, 1500, 8000, 50), 0.1, 0.3), S0, 0.1); sfx.place(fade(sweep(S1 - S0, 1800, 150, 0.6, 0.8), 0.05, 0.2), S0, 0.12)
# the tease: score drops out; heartbeat and a riser into the reveal
for j in range(int((REVEAL - TEASE) / 0.62)): sfx.place(heartbeat(), TEASE + 0.1 + j * 0.62, 0.45)
sfx.place(riser(REVEAL - TEASE, 120, 9000), TEASE, 0.14)
sfx.place(braam(29, 3.0), REVEAL, 0.5); sfx.place(impact(3.0), REVEAL, 0.45); sfx.place(k808(31, 1.6, 1.2), REVEAL, 0.32)
a, b = EV['deep']; sfx.place(ding(98), b, 0.1)
# the diagram and the wind
sfx.place(fade(sweep(1.4, 400, 4000, 0.4, 1.0), 0.1, 0.3), AIR, 0.07)
sfx.place(fade(wind(T1('E_holes') - T0('E_why') + 0.3), 0.3, 0.4), T0('E_why'), 0.16)
# the end: a rewind sweep while the tower rebuilds, a clang when it is whole, a riser back into the hook
sfx.place(fade(sweep(EV['rebuild1'] - EV['rebuild0'], 200, 3500, 0.5, 1.3), 0.1, 0.1), EV['rebuild0'], 0.12)
sfx.place(clank(330), EV['rebuild1'], 0.12); sfx.place(riser(1.0, 300, 6000), DUR - 1.0, 0.08)

# ---------------- mix ----------------
mus = reverb(music.x, 2.2, 0.5, 0.18, 5000)
mus = duck(mus, voice.x, -10.5); fx = duck(sfx.x, voice.x, -4.0)
mix = voice.x * 1.0 + mus * 0.95 + fx * 0.95
mix = mix[:int(DUR * SR)]
out, L0, L1 = master(mix, -14.0, -1.5)
save_wav(os.path.join(HERE, 'mix.wav'), out)
print('loudness in %.1f LUFS -> out %.1f LUFS, peak %.2f dBFS' % (L0, L1, 20 * np.log10(np.abs(out).max())))
v = voice.x[:int(DUR * SR), 0]; m = mus[:int(DUR * SR), 0]
act = np.abs(v) > 0.02
print('voice-to-music ratio while speaking: %.1f dB' % (10 * np.log10(np.mean(v[act] ** 2) / (np.mean(m[act] ** 2) + 1e-12))))
