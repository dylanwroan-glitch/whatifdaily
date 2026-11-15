# audio.py — original synthesized score + sound design for "What if you melted the Eiffel Tower?" (48 kHz stereo).
# Everything is generated with numpy/scipy: no samples, no copied music. Timings come from timeline.json.
import numpy as np
from scipy import signal
import wave, sys, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
SR = 48000
DUR = TL['DURATION']
N = int(SR * DUR)
rng = np.random.default_rng(1889)
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
def clank(f=900):
    t = tt(0.6); return sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) * a for r, a, d in [(1, 1, 0.12), (2.41, 0.6, 0.07), (3.98, 0.35, 0.05), (5.6, 0.2, 0.03)]) + hp(noise(0.6), 3000) * np.exp(-t / 0.004) * 0.5
def thud():
    t = tt(0.25); return np.sin(2 * np.pi * (70 + 60 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.07) + lp(noise(0.25), 800) * np.exp(-t / 0.03) * 0.5
def ding(m=93):
    a = bell(m, 2.2); b = bell(m + 12, 1.2) * 0.3; a[:len(b)] += b; return a
def clap():
    t = tt(0.3); x = np.zeros(len(t))
    for d in (0.0, 0.011, 0.023): i = int(d * SR); n = len(t) - i; x[i:] += bp(nz(n), 900, 5000) * np.exp(-np.arange(n) / SR / 0.012)
    return x * 0.8 + bp(noise(0.3), 1200, 6000) * np.exp(-t / 0.09) * 0.5
def k808(m, sec, glide=0.0):
    t = tt(sec); f = mtof(m) * (1 + glide * np.exp(-t / 0.06)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.25 * np.sin(2 * ph); x = np.tanh(x * 1.6)
    return x * np.minimum(1, t / 0.004) * np.exp(-t / (sec * 0.8))
def whoosh(sec=0.45, up=True):
    x = sweep(sec, 300 if up else 4000, 4000 if up else 300, 0.6, 1.0); e = np.sin(np.linspace(0, np.pi, len(x))) ** 1.5; return x * e * 1.6
def riser(sec, f0=200, f1=5000):
    x = sweep(sec, f0, f1, 0.35, 1.6); t = tt(sec); tone = np.sin(2 * np.pi * np.cumsum(f0 * 0.5 * (f1 / f0) ** (t / sec * 0.4)) / SR) * 0.3
    return (x + tone[:len(x)]) * np.linspace(0.05, 1.0, len(x)) ** 2
def revcym(sec=0.9):
    t = tt(sec); x = hp(noise(sec), 4000) * np.exp(-(sec - t) / 0.3); return x * np.minimum(1, (sec - t) / 0.01 + 0.01)
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
def wind(sec, lo=250, hi=900):
    t = tt(sec); m = 0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t) * np.sin(2 * np.pi * 0.07 * t + 1)
    return (bp(noise(sec), lo, hi) * m + bp(noise(sec), hi * 1.3, hi * 2.9) * 0.25 * m ** 2) * 1.4
def beep(f, sec=0.35):
    t = tt(sec); return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.12) * np.minimum(1, t / 0.004)
# car engine: a buzzy harmonic stack whose pitch follows f(t); a little roughness for the exhaust
def engine(sec, f0, f1, curve=1.0):
    t = tt(sec); f = f0 + (f1 - f0) * (t / sec) ** curve; ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph + 0.3 * k) / k ** 0.9 for k in range(1, 9)) + 0.4 * signal.sawtooth(ph * 0.5)
    x *= 1 + 0.25 * np.sin(ph * 0.25)
    return lp(x, 1600, 2) * 0.35 + lp(noise(sec), 300) * 0.25
def whistle(sec, f0=2400, f1=500):  # falling-object whistle
    t = tt(sec); f = f0 * (f1 / f0) ** (t / sec); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * 0.6 + bp(noise(sec), 800, 3000) * 0.15) * np.minimum(1, t / 0.05) * np.minimum(1, (sec - t) / 0.05 + 0.02)

SH = {s['name']: s for s in TL['SHOTS']}
def T0(n, d=0.0): return SH[n]['t0'] + d
def T1(n): return SH[n]['t1']
HB = TL['HB']; BAR = BEAT * 4
TEASE0, DROP = T0('D_tease'), T0('D_reveal')
GROOVE0 = T0('A_tall')

# ---------- extra instruments for this story ----------
def sizzle(sec, lo=2500, hi=9000, rate=40.0):  # molten-metal hiss with crackle
    x = bp(noise(sec), lo, hi) * 0.6; n = len(x)
    k = rng.poisson(rate * sec); idx = rng.integers(0, max(1, n - 400), k)
    for i in idx: L = int(rng.uniform(0.002, 0.01) * SR); x[i:i + L] += hp(nz(L), 3000) * np.exp(-np.arange(L) / SR / 0.002) * rng.uniform(0.5, 1.5)
    return x
def roar(sec, f0=120, f1=900):  # fire roar swelling
    x = sweep(sec, f0, f1, 0.8, 1.0) + lp(noise(sec), 300) * 0.6; t = tt(sec)
    return x * (0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 1.3 * t + 1))
def groan(sec, f0=55, f1=38):  # stressed iron: slow detuned partials with a rough bow
    t = tt(sec); f = f0 * (f1 / f0) ** (t / sec); ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(ph * r + rng.uniform(0, 6)) * a for r, a in [(1, 1), (2.7, 0.5), (4.1, 0.35), (6.3, 0.2)])
    x *= 1 + 0.5 * lp(noise(sec), 30) * 8
    return lp(x, 1800) * np.minimum(1, t / 0.2) * np.minimum(1, (sec - t) / 0.3)
def creak(f=420, sec=0.5):
    t = tt(sec); f_t = f * (1 + 0.3 * np.sin(2 * np.pi * 7 * t)); ph = 2 * np.pi * np.cumsum(f_t) / SR
    g = (np.sin(2 * np.pi * 38 * t) > 0.4).astype(float); return bp(signal.sawtooth(ph) * g, 300, 3000) * np.exp(-t / (sec * 0.5)) * 0.6
def drip(f=None):  # a bright drop + tiny splash
    f = f or rng.uniform(1400, 2600); t = tt(0.18); return np.sin(2 * np.pi * f * (1 + 0.8 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.03) * 0.5 + hp(nz(len(t)), 4000) * np.exp(-t / 0.01) * 0.25
def rivet():  # pneumatic rivet hammer tap
    t = tt(0.07); return (bp(nz(len(t)), 1800, 6000) * np.exp(-t / 0.004) + np.sin(2 * np.pi * 950 * t) * np.exp(-t / 0.012) * 0.5)
def rumble(sec):
    t = tt(sec); return lp(noise(sec), 120) * 2.2 * np.minimum(1, t / 0.3) * np.minimum(1, (sec - t) / 0.4)
def splash(sec=0.8):
    t = tt(sec); return (lp(noise(sec), 2500) * np.exp(-t / 0.15) + sizzle(sec, 2000, 8000, 60) * np.exp(-t / 0.4) * 0.8)
def whistle_tone(sec, f=1800, wob=6.0):  # wind through a lattice: a breathy resonance
    t = tt(sec); x = bp(noise(sec), f * 0.92, f * 1.08) * (1 + 0.3 * np.sin(2 * np.pi * wob * t)); return x * 2.5

# ---------------- score: G minor trap at 140 BPM ----------------
CH = {'Gm': [55, 62, 67, 70, 74], 'Eb': [51, 58, 63, 67, 70], 'Bb': [46, 58, 62, 65, 70], 'F': [53, 60, 65, 69, 72], 'Cm': [48, 60, 63, 67, 72]}
ROOT = {'Gm': 43, 'Eb': 39, 'Bb': 46, 'F': 41, 'Cm': 48}
def chord_at(t): return ['Gm', 'Eb', 'Bb', 'F'][int(t // BAR) % 4] if t < DROP else ['Eb', 'Bb', 'F', 'Gm'][int((t - DROP) // BAR) % 4]
def in_tease(t): return TEASE0 <= t < DROP
t = 0.0
while t < DUR:
    c = chord_at(t); sec = min(BAR + 0.4, DUR - t)
    g = 0.0 if in_tease(t) else (0.05 if t < DROP else 0.07)
    if g: place('music', pad(CH[c], sec, 1300 if t < DROP else 2400), t, g, 0, send=0.45)
    t += BAR
ARP = [4, 2, 3, 1, 4, 2, 3, 0]
k = 0; t = 0.0
while t < DUR:
    if not in_tease(t):
        c = CH[chord_at(t)]; m = c[ARP[k % 8]] + 24
        place('music', pluck(m, 0.45, 0.7), t, 0.04 if t < DROP else 0.055, pan=0.4 * np.sin(k * 1.7), send=0.5)
    k += 1; t += BEAT / 2
nb = int(DUR / BEAT) + 1
for i in range(nb):
    t = i * BEAT
    if in_tease(t) or t >= DUR: continue
    hook = False
    c = chord_at(t)
    if i % 4 == 0: place('drums', kick(1.0), t, 0.62)
    if i % 4 == 2 and not hook: place('drums', kick(0.8), t + BEAT / 2, 0.42)
    if i % 2 == 1 and not hook: place('drums', clap(), t, 0.3, send=0.25); place('drums', snare(), t, 0.12, send=0.2)
    if i % 4 == 0 and not hook: place('drums', k808(ROOT[c] - 12, BEAT * 3.6, 0.5 if i % 8 == 0 else 0.0), t, 0.42)
    sub = 4 if (i % 8 == 7 or t >= DROP and i % 4 == 3) else 2
    for j in range(sub): place('drums', hat(0.045), t + j * BEAT / sub, 0.075 + 0.03 * (j % 2 == 0), pan=0.25 if j % 2 else -0.15)

# ---------------- sound design ----------------
# frame 1: a hit and a big iron clang under the title; a second punch on the hook's middle beat; a riser into the groove
place('sfx', impact(1.8), 0.0, 0.42, send=0.4); place('sfx', clank(330), 0.0, 0.22, send=0.5); place('sfx', clank(495), 0.02, 0.1, pan=0.3, send=0.5)
place('sfx', whoosh(0.5, True), 0.0, 0.16, send=0.3); place('sfx', thump(), T0('H_hook', HB * 1.5), 0.3); place('sfx', clank(660), T0('H_hook', HB * 1.5), 0.08, pan=-0.3, send=0.5)
place('sfx', fade(wind(GROOVE0 + 0.3, 200, 700), 0.02, 0.3), 0.0, 0.03, send=0.2)
place('sfx', riser(1.1, 300, 6000), GROOVE0 - 1.1, 0.11, send=0.3)
# every cut: a whoosh into it and a low thump on it
for i, c in enumerate(TL['CUTS']):
    place('sfx', whoosh(0.32, up=(i % 2 == 0)), c - 0.2, 0.2, pan=0.5 * (1 if i % 2 else -1), send=0.25)
    place('sfx', thump(), c, 0.28)
# counters: ticks while the number rolls, an impact + ding when it lands
for key, n in (('tall', 16), ('iron', 18), ('temp', 20), ('cube', 14)):
    a, b = EV[key]
    for j in range(n): tc = a + (b - a) * (j / n) ** 0.7; place('sfx', tick(), tc, 0.05 + 0.04 * j / n, pan=np.sin(j * 2.1) * 0.4, send=0.15)
    place('sfx', impact(1.6), b, 0.3, send=0.4); place('sfx', ding(96 if key != 'temp' else 91), b, 0.1, send=0.6)
place('sfx', clank(220), EV['iron'][1], 0.25, send=0.5)                                        # 7,300 tonnes: a heavy iron hit
a, b = EV['rivets']                                                                              # 2.5 million rivets: a rivet hammer
for j in range(26): place('sfx', rivet(), a + (b - a) * j / 26, 0.18, pan=0.3 * np.sin(j * 1.3), send=0.2)
place('sfx', impact(1.6), b, 0.3, send=0.4); place('sfx', ding(98), b, 0.1, send=0.6)
# the heat: a fire roar swelling to the melting point, then a hiss
place('sfx', fade(roar(T1('B_heat') - T0('B_heat') + 0.1, 100, 1200), 0.2, 0.1), T0('B_heat'), 0.2, send=0.3)
place('sfx', fade(sizzle(1.0), 0.05, 0.4), EV['temp'][1], 0.12, pan=0.2, send=0.3)
# the melt: hiss bed, groaning iron, creaks, drips, splashes; the second floor and the first floor give way
M0, M1 = T0('B_top'), T1('B_legs')
place('sfx', fade(sizzle(M1 - M0 + 0.4, 2200, 9000, 70), 0.15, 0.4), M0, 0.09, send=0.3)
place('sfx', fade(roar(M1 - M0, 80, 500), 0.3, 0.4), M0, 0.12, send=0.2)
place('sfx', groan(2.2, 62, 40), M0 + 0.1, 0.22, send=0.4); place('sfx', groan(2.4, 48, 30), T0('B_mid', 0.2), 0.26, send=0.4)
for j, (tc, f) in enumerate([(M0 + 0.4, 520), (M0 + 1.1, 380), (T0('B_mid', 0.5), 300), (T0('B_mid', 1.3), 450), (T0('B_legs', 0.3), 260)]):
    place('sfx', creak(f, 0.6), tc, 0.12, pan=(-0.4 if j % 2 else 0.4), send=0.4)
r = np.random.default_rng(7)
for j in range(60): tc = M0 + r.uniform(0, M1 - M0); place('sfx', drip(), tc, 0.05, pan=r.uniform(-0.7, 0.7), send=0.35)
for j in range(14): tc = T0('B_mid', 0.1) + r.uniform(0, M1 - T0('B_mid')); place('sfx', splash(0.6), tc, 0.06, pan=r.uniform(-0.5, 0.5), send=0.3)
place('sfx', impact(2.2), 12.45, 0.4, send=0.5); place('sfx', rumble(1.6), 12.45, 0.35); place('sfx', clank(180), 12.45, 0.18, send=0.6)
place('sfx', impact(2.0), 13.36, 0.36, send=0.5); place('sfx', rumble(1.4), 13.36, 0.3); place('sfx', splash(1.4), 14.3, 0.22, send=0.4)
# the cube: the pool slides together and rises; a heavy clunk when it sets
G0, G1 = EV['gather0'], EV['gather1']
place('sfx', fade(sweep(G1 - G0, 120, 1500, 0.6, 1.4), 0.1, 0.05), G0, 0.18, send=0.3); place('sfx', fade(sizzle(G1 - G0 + 0.3, 2000, 7000, 30), 0.1, 0.3), G0, 0.06)
place('sfx', thud(), G1, 0.5); place('sfx', clank(160), G1, 0.2, send=0.5); place('sfx', k808(31, 1.0, 0.8), G1, 0.25)
place('sfx', fade(sizzle(1.6, 3000, 9000, 15), 0.2, 0.5), T0('C_size'), 0.05, pan=-0.2)
# one foot: a heavy slide and a thud into the footprint
place('sfx', fade(sweep(EV['slide1'] - EV['slide0'], 200, 900, 0.5, 1.0) + lp(noise(EV['slide1'] - EV['slide0']), 400), 0.05, 0.05), EV['slide0'], 0.16, pan=0.3, send=0.2)
place('sfx', thud(), EV['slide1'], 0.5); place('sfx', clank(140), EV['slide1'], 0.14, send=0.5)
# the spread: a long hiss as it flattens; the depth gauge ticks down
S0, S1 = EV['spread0'], EV['spread1']
place('sfx', fade(sizzle(S1 - S0 + 0.3, 1500, 8000, 50), 0.1, 0.3), S0, 0.12, send=0.3); place('sfx', fade(sweep(S1 - S0, 1800, 150, 0.6, 0.8), 0.05, 0.2), S0, 0.14, send=0.3)
for j in range(16): place('sfx', tick(), S0 + (S1 - S0) * (j / 16) ** 0.8, 0.04, pan=np.sin(j) * 0.3)
# the tease: the beat drops out; heartbeat, cooling ticks, a long riser; then the SLAM
for j in range(4): place('sfx', heartbeat(), TEASE0 + 0.1 + j * 0.62, 0.5)
td = tt(DROP - TEASE0); place('sfx', fade(np.sin(2 * np.pi * 49 * td) * 0.5 + lp(noise(len(td) / SR), 120) * 0.4, 0.2, 0.05), TEASE0, 0.08)
for j in range(7): place('sfx', drip(rng.uniform(2600, 4200)) * 0.6, TEASE0 + 0.25 + j * 0.33, 0.05, pan=np.sin(j * 1.9) * 0.6, send=0.5)  # cooling iron ticks
place('sfx', riser(DROP - TEASE0, 120, 9000), TEASE0, 0.2, send=0.35); place('sfx', revcym(0.8), DROP - 0.8, 0.14, send=0.3)
place('sfx', impact(3.0), DROP, 0.55, send=0.5); place('sfx', k808(31, 1.6, 1.2), DROP, 0.4); place('sfx', glitch(0.2), DROP, 0.06)
a, b = EV['deep']
for j in range(10): place('sfx', tick(), a + (b - a) * (j / 10) ** 0.7, 0.06, pan=np.sin(j * 2.1) * 0.4)
place('sfx', ding(98), b, 0.13, send=0.6); place('sfx', shimmer(1.6, 86), b + 0.02, 0.07, send=0.7)
# the diagram: a cool shimmer as the ghost tower lights up
place('sfx', shimmer(2.0, 81), T0('D_wide', 0.15), 0.08, send=0.7); place('sfx', fade(sweep(1.4, 400, 4000, 0.4, 1.0), 0.1, 0.3), T0('D_wide'), 0.08, send=0.4)
# the wind: gusts, then the lattice whistling as the wind goes through the holes
place('sfx', fade(wind(HB * 4 + 0.3, 250, 1100), 0.15, 0.3), T0('E_why'), 0.2, send=0.3)
for j in range(3): place('sfx', fade(sweep(0.9, 300, 2600, 0.5, 1.0) * np.sin(np.linspace(0, np.pi, int(0.9 * SR))), 0.02, 0.05), T0('E_why', 0.1 + j * 0.55), 0.12, pan=(-0.5 + 0.5 * j), send=0.4)
for j, f in enumerate((1250, 1680, 2240)): place('sfx', fade(whistle_tone(1.4, f, 4 + j), 0.2, 0.4), T0('E_holes', 0.1 + j * 0.25), 0.05, pan=(-0.4 + 0.4 * j), send=0.5)
# the end: a rewind sweep as the tower rebuilds, an iron clang when it's whole, then a riser that hands back to the hook's hit
place('sfx', fade(sweep(EV['rebuild1'] - EV['rebuild0'], 200, 3500, 0.5, 1.3), 0.1, 0.1), EV['rebuild0'], 0.16, send=0.4)
place('sfx', fade(sizzle(EV['rebuild1'] - EV['rebuild0'], 2500, 9000, 30)[::-1].copy(), 0.1, 0.1), EV['rebuild0'], 0.05)
place('sfx', impact(1.8), T0('F_end'), 0.4, send=0.5); place('sfx', clank(330), EV['rebuild1'], 0.14, send=0.6)
place('sfx', riser(1.1, 300, 6000), DUR - 1.1, 0.11, send=0.3)
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
