# audio.py — original synthesized score + sound design for "Where’s the coldest place in the universe?" (48 kHz stereo).
# Everything is generated with numpy/scipy: no samples, no copied music. Timings come from timeline.json.
import numpy as np
from scipy import signal
import wave, sys, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
SR = 48000
DUR = TL['DURATION']
N = int(SR * DUR)
rng = np.random.default_rng(1113)
BEAT = 60 / 140.0
EV = TL['EV']

def tt(sec): return np.arange(int(sec * SR)) / SR
def noise(sec): return rng.standard_normal(int(sec * SR))
def nz(n): return rng.standard_normal(n)
def lp(x, fc, order=2): b, a = signal.butter(order, min(fc / (SR / 2), 0.99), 'low'); return signal.lfilter(b, a, x, axis=0)
def hp(x, fc, order=2): b, a = signal.butter(order, max(fc / (SR / 2), 1e-4), 'high'); return signal.lfilter(b, a, x, axis=0)
def bp(x, f1, f2, order=2): b, a = signal.butter(order, [max(f1, 20) / (SR / 2), min(f2 / (SR / 2), 0.99)], 'band'); return signal.lfilter(b, a, x, axis=0)
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def fade(x, a, r):
    n = len(x); e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return x * (e[:, None] if x.ndim == 2 else e)

MIX = {k: np.zeros((N, 2), np.float32) for k in ['music', 'drums', 'sfx', 'send']}
def place(bus, x, t0, gain=1.0, pan=0.0, send=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N or len(x) == 0: return
    if x.ndim == 1:
        l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l, x * r], 1) * np.sqrt(2)
    if i0 < 0: x = x[-i0:]; i0 = 0
    n = min(len(x), N - i0)
    MIX[bus][i0:i0 + n] += (x[:n] * gain).astype(np.float32)
    if send: MIX['send'][i0:i0 + n] += (x[:n] * gain * send).astype(np.float32)

# ---------------- instruments ----------------
def saw(f, sec, det=0.0, harm=30):
    t = tt(sec); out = np.zeros(len(t)); ff = f * (1 + det)
    for k in range(1, harm + 1):
        if ff * k > 12000: break
        out += np.sin(2 * np.pi * ff * k * t + rng.uniform(0, 6.28)) / k
    return out
def pad(notes, sec, bright=1800):
    x = np.zeros(int(sec * SR))
    for m in notes:
        for d in (-0.004, 0.0035): x += saw(mtof(m), sec, d, 18) * 0.5
    x = lp(x, bright, 2)
    return fade(x / max(len(notes), 1), min(0.5, sec * 0.3), min(0.7, sec * 0.35))
def pluck(m, sec=0.7, bright=1.0):
    f = mtof(m); t = tt(sec)
    x = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (3.5 + 2.2 * k) / bright) / k ** 1.3 for k in range(1, 8))
    return x * np.minimum(1, t / 0.003)
def bass(m, sec):
    f = mtof(m); t = tt(sec)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return x * np.minimum(1, t / 0.01) * np.exp(-t / (sec * 0.9))
def kick(g=1.0):
    t = tt(0.45); f = 44 + 110 * np.exp(-t / 0.045); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t / 0.16) + 0.25 * lp(noise(0.45), 2000) * np.exp(-t / 0.006)) * g
def hat(sec=0.06): x = hp(noise(sec), 7000, 2); return x * np.exp(-tt(sec) / 0.018)
def snare():
    t = tt(0.25); return bp(noise(0.25), 1500, 7000) * np.exp(-t / 0.06) * 0.8 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.5
def bell(m, sec=2.5):
    f = mtof(m); t = tt(sec)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (sec * d)) for r, a, d in [(1, 1, 0.5), (2.76, 0.45, 0.25), (5.4, 0.25, 0.12), (8.93, 0.12, 0.07)])
def sweep(sec, f0, f1, q=0.5, curve=1.0):
    n = int(sec * SR); x = noise(sec); out = np.zeros(n); hop = 960; win = np.hanning(hop * 2)
    for i in range(0, n, hop):
        u = (i / n) ** curve; fc = f0 * (f1 / f0) ** u
        seg = x[max(0, i - hop):i + hop]
        y = bp(seg, max(30, fc * (1 - q)), min(20000, fc * (1 + q)), 2)
        w = win[:len(y)] if len(y) == len(win) else np.hanning(len(y))
        a0 = max(0, i - hop); out[a0:a0 + len(y)] += y * w * 0.5
    return out
def impact(sec=2.6):
    t = tt(sec); sub = np.sin(2 * np.pi * (38 + 40 * np.exp(-t / 0.08)) * t) * np.exp(-t / 0.9)
    return sub + lp(noise(sec), 900) * np.exp(-t / 0.25) * 0.6 + hp(noise(sec), 3000) * np.exp(-t / 0.05) * 0.25
def thump():
    t = tt(0.3); return np.sin(2 * np.pi * (60 + 80 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.08)
def tick(big=0.0):
    t = tt(0.12); return hp(noise(0.12), 2500) * np.exp(-t / 0.003) * 0.7 + np.sin(2 * np.pi * 2100 * t) * np.exp(-t / 0.01) * 0.5 + np.sin(2 * np.pi * 90 * t) * np.exp(-t / 0.04) * big
def rumble(sec, fc=120):
    x = lp(noise(sec), fc, 3) * 2.5; t = tt(sec); return x * (0.7 + 0.3 * np.sin(2 * np.pi * 0.7 * t))
def crack(sec=0.6):
    t = tt(sec); x = np.zeros(len(t))
    for _ in range(14):
        i = int(rng.uniform(0, 0.35) * SR); L = int(rng.uniform(0.004, 0.03) * SR)
        if i + L < len(x): x[i:i + L] += hp(nz(L), 1200) * rng.uniform(0.4, 1.0)
    body = lp(noise(sec), 400) * np.exp(-t / 0.18) * 1.2
    return x + body + np.sin(2 * np.pi * (55 + 60 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.25) * 0.8
def clank(f=900):
    t = tt(0.6); return sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) * a for r, a, d in [(1, 1, 0.12), (2.41, 0.6, 0.07), (3.98, 0.35, 0.05), (5.6, 0.2, 0.03)]) + hp(noise(0.6), 3000) * np.exp(-t / 0.004) * 0.5
def splat():
    t = tt(0.5); return lp(noise(0.5), 700) * np.exp(-t / 0.09) * 1.4 + bp(noise(0.5), 300, 1600) * np.exp(-t / 0.03) * 0.6
def sizzle(sec):
    t = tt(sec); x = hp(noise(sec), 3500) * (0.5 + 0.5 * (rng.random(len(t)) > 0.97)); return x * 0.6
def water(sec):
    t = tt(sec); x = bp(noise(sec), 300, 2200) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * t)) + bp(noise(sec), 2000, 6000) * 0.25
    for _ in range(int(sec * 18)):  # bubbles
        i = int(rng.uniform(0, sec - 0.06) * SR); f0 = rng.uniform(400, 1300); tb = tt(0.05)
        b = np.sin(2 * np.pi * (f0 + 1800 * tb) * tb) * np.exp(-tb / 0.012); n2 = min(len(b), len(x) - i); x[i:i + n2] += b[:n2] * 0.5
    return x
def clink(f=2400):
    t = tt(0.4); return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.07) + np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t / 0.04) * 0.5) + hp(noise(0.4), 5000) * np.exp(-t / 0.003) * 0.4
def fire(sec):
    t = tt(sec); x = lp(noise(sec), 500) * 0.8
    for _ in range(int(sec * 30)):
        i = int(rng.uniform(0, sec - 0.01) * SR); L = int(0.004 * SR); x[i:i + L] += hp(nz(L), 2000) * rng.uniform(0.3, 1.0)
    return x
def thud():
    t = tt(0.25); return np.sin(2 * np.pi * (70 + 60 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.07) + lp(noise(0.25), 800) * np.exp(-t / 0.03) * 0.5
def rewind(sec):
    t = tt(sec); f = 300 * np.exp(np.linspace(np.log(1), np.log(9), len(t))); ph = 2 * np.pi * np.cumsum(f) / SR
    return (signal.sawtooth(ph) * 0.3 + bp(noise(sec), 1500, 6000) * 0.4) * np.minimum(1, t / 0.05)
def ding(m=93):
    a = bell(m, 2.2); b = bell(m + 12, 1.2) * 0.3; a[:len(b)] += b; return a

# ---------------- extra instruments for the fast cut ----------------
def clap():
    t = tt(0.3); x = np.zeros(len(t))
    for d in (0.0, 0.011, 0.023): i = int(d * SR); n = len(t) - i; x[i:] += bp(nz(n), 900, 5000) * np.exp(-np.arange(n) / SR / 0.012)
    return x * 0.8 + bp(noise(0.3), 1200, 6000) * np.exp(-t / 0.09) * 0.5
def k808(m, sec, glide=0.0):
    t = tt(sec); f = mtof(m) * (1 + glide * np.exp(-t / 0.06)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.25 * np.sin(2 * ph) ; x = np.tanh(x * 1.6)
    return x * np.minimum(1, t / 0.004) * np.exp(-t / (sec * 0.8))
def whoosh(sec=0.45, up=True):
    x = sweep(sec, 300 if up else 4000, 4000 if up else 300, 0.6, 1.0); e = np.sin(np.linspace(0, np.pi, len(x))) ** 1.5; return x * e * 1.6
def riser(sec, f0=200, f1=5000):
    x = sweep(sec, f0, f1, 0.35, 1.6); t = tt(sec); tone = np.sin(2 * np.pi * np.cumsum(f0 * 0.5 * (f1 / f0) ** (t / sec * 0.4)) / SR) * 0.3
    return (x + tone[:len(x)]) * np.linspace(0.05, 1.0, len(x)) ** 2
def revcym(sec=0.9):
    t = tt(sec); x = hp(noise(sec), 4000) * np.exp(-(sec - t) / 0.3); return x * np.minimum(1, (sec - t) / 0.01 + 0.01)
def zap(f0=2600, f1=240, sec=0.22):
    t = tt(sec); f = f0 * (f1 / f0) ** (t / sec); ph = 2 * np.pi * np.cumsum(f) / SR
    return (signal.square(ph) * 0.35 + np.sin(ph) * 0.6) * np.exp(-t / (sec * 0.5))
def shimmer(sec, base=84):
    x = np.zeros(int(sec * SR))
    for k, m in enumerate([base, base + 7, base + 12, base + 16, base + 19, base + 24]):
        b = bell(m, sec - k * 0.04); i = int(k * 0.04 * SR); x[i:i + len(b)] += b[:len(x) - i] * (0.8 ** k)
    return x
def heartbeat():
    t = tt(0.5); b = np.sin(2 * np.pi * 55 * t) * np.exp(-t / 0.05); x = b.copy(); i = int(0.17 * SR); x[i:] += b[:len(x) - i] * 0.7; return lp(x, 200)
def glitch(sec=0.25):
    n = int(sec * SR); x = np.zeros(n); i = 0
    while i < n:
        L = int(rng.uniform(0.008, 0.04) * SR); f = rng.uniform(200, 3000); tl = np.arange(L) / SR; m = max(0, min(L, n - i)); x[i:i + m] = (signal.square(2 * np.pi * f * tl) * rng.uniform(0.2, 0.7))[:m]; i += L + int(rng.uniform(0, 0.02) * SR)
    return x
def pop(f=1300):
    t = tt(0.08); return np.sin(2 * np.pi * f * (1 + 0.6 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.018)
def typeclick():
    t = tt(0.05); return hp(noise(0.05), 3000) * np.exp(-t / 0.004) + np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.006) * 0.4
def wind(sec):
    t = tt(sec); m = 0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t) * np.sin(2 * np.pi * 0.07 * t + 1)
    return (bp(noise(sec), 250, 900) * m + bp(noise(sec), 1200, 2600) * 0.25 * m ** 2) * 1.4

SH = {s['name']: s for s in TL['SHOTS']}
def T0(n, d=0.0): return SH[n]['t0'] + d
RANK_T = [r['at'] for r in TL['RANKS']]
HB = TL['HB']; BAR = BEAT * 4
TEASE0, DROP = T0('E_tease'), T0('E_rank')

# ---------------- score: D minor trap at 140 BPM ----------------
CH = {'Dm': [50, 57, 62, 65, 69], 'Bb': [46, 53, 58, 62, 65], 'F': [41, 53, 57, 60, 65], 'C': [48, 55, 60, 64, 67], 'Gm': [43, 55, 58, 62, 67], 'A': [45, 52, 57, 61, 64]}
ROOT = {'Dm': 38, 'Bb': 34, 'F': 41, 'C': 36, 'Gm': 43, 'A': 33}
PROG = ['Dm', 'Bb', 'F', 'C']
def chord_at(t): return PROG[int(t // BAR) % 4] if t < DROP else ['Dm', 'Bb', 'Gm', 'A'][int((t - DROP) // BAR) % 4]
def in_tease(t): return TEASE0 <= t < DROP
t = 0.0
while t < DUR:
    c = chord_at(t); sec = min(BAR + 0.4, DUR - t)
    g = 0.0 if in_tease(t) else (0.07 if t < DROP else 0.085)
    if g: place('music', pad(CH[c], sec, 1500 if t < DROP else 2400), t, g, 0, send=0.45)
    t += BAR
# icy music-box arpeggio (16ths in the hook, 8ths in the groove)
ARP = [4, 2, 3, 1, 4, 2, 3, 0]
k = 0; t = 0.0
while t < DUR:
    if not in_tease(t):
        c = CH[chord_at(t)]; m = c[ARP[k % 8]] + 24
        place('music', pluck(m, 0.5, 0.7), t, 0.05 if t < DROP else 0.06, pan=0.4 * np.sin(k * 1.7), send=0.5)
    k += 1; t += BEAT / 2
# drums + 808
nb = int(DUR / BEAT) + 1
for i in range(nb):
    t = i * BEAT
    if in_tease(t) or t >= DUR: continue
    hook = t < RANK_T[0]
    c = chord_at(t)
    if i % 4 == 0: place('drums', kick(1.0), t, 0.62)
    if i % 4 == 2 and not hook: place('drums', kick(0.8), t + BEAT / 2, 0.42)
    if i % 2 == 1 and not hook: place('drums', clap(), t, 0.3, send=0.25); place('drums', snare(), t, 0.12, send=0.2)
    if i % 4 == 0 and not hook: place('drums', k808(ROOT[c] - 12, BEAT * 3.6, 0.5 if i % 8 == 0 else 0.0), t, 0.42)
    # hats: 8ths, 16th rolls in the last beat of every 2-bar phrase
    sub = 4 if (i % 8 == 7 or t >= DROP and i % 4 == 3) else 2
    for j in range(sub): place('drums', hat(0.045), t + j * BEAT / sub, 0.075 + 0.03 * (j % 2 == 0), pan=0.25 if j % 2 else -0.15)
# ---------------- sound design ----------------
# frame 1: impact + icy bell sting so the hook hits immediately
place('sfx', impact(1.8), 0.0, 0.42, send=0.4); place('sfx', shimmer(2.2, 84), 0.02, 0.06, send=0.6)
place('sfx', fade(wind(7.7), 0.02, 0.6), 0.0, 0.07, pan=-0.2, send=0.2)
place('sfx', riser(1.2, 300, 6000), RANK_T[0] - 1.2, 0.12, send=0.3)
# every cut: a whoosh into it and a low thump on it
for i, c in enumerate(TL['CUTS']):
    place('sfx', whoosh(0.32, up=(i % 2 == 0)), c - 0.2, 0.2, pan=0.5 * (1 if i % 2 else -1), send=0.25)
    place('sfx', thump(), c, 0.28)
# rank reveals: reverse cymbal in, boom + clang on the slam, ticks while the number rolls, a ding when it lands
for i, r in enumerate(TL['RANKS']):
    at = r['at']
    place('sfx', revcym(0.85), at - 0.85, 0.16, send=0.3)
    place('sfx', impact(2.2), at, 0.5, send=0.5); place('sfx', clank(520), at, 0.14, send=0.5)
    if i < 4:
        for j in range(18): tc = at + 0.05 + 0.7 * (j / 18) ** 0.7; place('sfx', tick(), tc, 0.05 + 0.04 * j / 18, pan=np.sin(j * 2.1) * 0.4, send=0.15)
        place('sfx', ding(96 - 2 * i), at + 0.76, 0.1, send=0.6)
    place('sfx', riser(HB * 0.95, 400, 7000), at - HB * 0.95, 0.1, send=0.3) if i > 0 and i < 4 else None
# Antarctica: ice crackle on the record, the launch up into space
for j in range(5): place('sfx', crack(0.5) * 0.5, T0('A_rank', 0.15 + j * 0.13), 0.09, pan=rng.uniform(-0.6, 0.6), send=0.3)
place('sfx', fade(sweep(1.7, 200, 6000, 0.5, 1.3), 0.05, 0.1), T0('A_up'), 0.2, send=0.3)
place('sfx', fade(rumble(1.7, 140), 0.05, 0.3), T0('A_up'), 0.22)
# Pluto + space: low drone, a shimmer for the Sun, a crunchy ice texture over the plains
td = tt(10.6); drone = (np.sin(2 * np.pi * 36.7 * td) * 0.5 + np.sin(2 * np.pi * 55 * td) * 0.3 + lp(noise(10.6), 150) * 0.5)
place('sfx', fade(drone, 0.2, 0.6), T0('B_rank'), 0.1, send=0.2)
place('sfx', shimmer(1.6, 88), T0('B_far', 0.2), 0.05, send=0.7)
for j in range(10): place('sfx', crack(0.25) * 0.25, T0('B_ice', 0.1 + j * 0.15), 0.05, pan=rng.uniform(-0.5, 0.5), send=0.2)
place('sfx', fade(sweep(1.6, 4000, 150, 0.5, 0.8), 0.05, 0.2), T0('C_rank'), 0.18, send=0.3)       # the pull-back
tg = tt(1.7); hum = sum(np.sin(2 * np.pi * mtof(m) * tg) * 0.2 for m in (50, 57, 62, 69)) * np.minimum(1, tg / 0.4)
place('sfx', fade(hum, 0.3, 0.3), T0('C_glow'), 0.07, send=0.6)
place('sfx', fade(riser(1.6, 150, 3000), 0.05, 0.05), T0('C_one'), 0.09, send=0.3)
# nebula: rushing gas
place('sfx', fade(bp(noise(5.2), 600, 5000) * 0.8, 0.3, 0.4), T0('D_rank'), 0.06, pan=0.2, send=0.3)
place('sfx', fade(sweep(1.7, 800, 7000, 0.5, 1.0), 0.05, 0.2), T0('D_wind'), 0.13, send=0.3)
# #1 tease: the beat drops out; heartbeat, scrambling digits, a long riser; then the DROP
for j in range(4): place('sfx', heartbeat(), TEASE0 + 0.1 + j * 0.62, 0.5)
for j in range(10): place('sfx', glitch(0.12), TEASE0 + 0.05 + j * 0.24, 0.06, pan=rng.uniform(-0.7, 0.7))
place('sfx', riser(DROP - TEASE0, 120, 9000), TEASE0, 0.22, send=0.35)
place('sfx', fade(lp(noise(DROP - TEASE0), 120) * 2.0, 0.2, 0.05), TEASE0, 0.12)
place('sfx', impact(3.0), DROP, 0.48, send=0.5); place('sfx', k808(26, 1.6, 1.2), DROP, 0.4)
place('sfx', shimmer(2.5, 81), DROP, 0.07, send=0.7)
# lasers: one zap per beam, then an electric hum
for j in range(3): place('sfx', zap(2600 - j * 300, 260, 0.22), TL['EV']['laser'] + j * 0.12, 0.16, pan=(-0.5, 0.0, 0.5)[j], send=0.35)
th = tt(5.0); ehum = (signal.sawtooth(2 * np.pi * 100 * th) * 0.15 + np.sin(2 * np.pi * 50 * th) * 0.3) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * th))
place('sfx', fade(lp(ehum, 1200), 0.05, 0.4), TL['EV']['laser'], 0.05)
# decimals typing out, then the freeze
for j in range(9): place('sfx', typeclick(), T0('E_tenb', 0.1 + j * 0.14), 0.16, pan=0.3 * np.sin(j))
place('sfx', shimmer(3.0, 91), T0('E_zero'), 0.12, send=0.8); place('sfx', impact(2.0) * 0.7, T0('E_zero'), 0.4, send=0.5)
place('sfx', revcym(0.7), T0('E_zero') - 0.7, 0.14, send=0.3)
# the station: a chord stab for "coldest known spot", a fly-by whoosh and a ding on 90 minutes
place('music', pad(CH['Dm'] + [74], 1.7, 3200), T0('E_known'), 0.12, send=0.6); place('sfx', impact(1.4) * 0.5, T0('E_known'), 0.3, send=0.4)
place('sfx', whoosh(1.2, True), T0('E_orbit', 0.1), 0.18, pan=0.3, send=0.3)
place('sfx', ding(98), T0('E_orbit', 0.9), 0.1, send=0.6)
# end card: a last hit, then a riser that hands back to the hook's impact when the video loops
place('sfx', impact(1.8), T0('F_end'), 0.45, send=0.5); place('sfx', fade(wind(DUR - T0('F_end')), 0.3, 0.05), T0('F_end'), 0.06, send=0.2)
place('sfx', riser(1.1, 300, 6000), DUR - 1.1, 0.12, send=0.3)
# soft pops as caption words land, a sparkle on the gold keyword
for a, b, html, src in TL['CAPS']:
    place('sfx', pop(1500), a, 0.05, pan=0.1)
    kw = html.find('<b>'); n_before = len(html[:kw].split()) if kw >= 0 else -1
    if n_before >= 0: place('sfx', bell(100, 0.6) * 0.6, a + n_before * 0.08 + 0.05, 0.04, pan=-0.2, send=0.5)

# ---------------- mix ----------------
ir_t = tt(1.8); ir = noise(1.8) * np.exp(-ir_t / 0.4); ir = np.stack([lp(ir, 5000), lp(np.roll(ir, 311), 5000)], 1) * 0.02
rev = np.stack([signal.fftconvolve(MIX['send'][:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = MIX['music'] * 0.85 + MIX['drums'] * 0.9 + MIX['sfx'] * 1.05 + rev * 0.8
mix = hp(mix, 28, 2)
rms = np.sqrt(np.mean(mix ** 2)); mix *= 10 ** (-14.5 / 20) / max(rms, 1e-9)
lim = 10 ** (-1.2 / 20)
def soft(x): return np.where(np.abs(x) < lim * 0.7, x, np.sign(x) * (lim * 0.7 + (lim * 0.3) * np.tanh((np.abs(x) - lim * 0.7) / (lim * 0.3))))
mix = soft(mix)
out = sys.argv[1] if len(sys.argv) > 1 else 'sound.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
print('peak dBFS %.2f  rms dBFS %.2f' % (20 * np.log10(np.max(np.abs(mix))), 20 * np.log10(np.sqrt(np.mean(mix ** 2)))))
sec = [20 * np.log10(np.sqrt(np.mean(mix[int(i * SR):int((i + 1) * SR)] ** 2)) + 1e-9) for i in range(int(DUR))]
print('per-second dB:', ' '.join('%d' % v for v in sec))
