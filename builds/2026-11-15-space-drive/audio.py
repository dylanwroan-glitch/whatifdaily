# audio.py — original synthesized score + sound design for "Space is only 1 hour away by car" (48 kHz stereo).
# Everything is generated with numpy/scipy: no samples, no copied music. Timings come from timeline.json.
import numpy as np
from scipy import signal
import wave, sys, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
SR = 48000
DUR = TL['DURATION']
N = int(SR * DUR)
rng = np.random.default_rng(1511)
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
TEASE0, DROP = T0('C_tease'), T0('C_reveal')
GROOVE0 = T0('A_point')

# ---------------- score: F# minor trap at 140 BPM ----------------
CH = {'F#m': [54, 61, 66, 69, 73], 'D': [50, 57, 62, 66, 69], 'A': [45, 57, 61, 64, 69], 'E': [52, 59, 64, 68, 71], 'Bm': [47, 59, 62, 66, 71]}
ROOT = {'F#m': 42, 'D': 38, 'A': 45, 'E': 40, 'Bm': 47}
def chord_at(t): return ['F#m', 'D', 'A', 'E'][int(t // BAR) % 4] if t < DROP else ['D', 'A', 'E', 'F#m'][int((t - DROP) // BAR) % 4]
def in_tease(t): return TEASE0 <= t < DROP
t = 0.0
while t < DUR:
    c = chord_at(t); sec = min(BAR + 0.4, DUR - t)
    g = 0.0 if in_tease(t) else (0.055 if t < DROP else 0.075)
    if g: place('music', pad(CH[c], sec, 1400 if t < DROP else 2600), t, g, 0, send=0.45)
    t += BAR
ARP = [4, 2, 3, 1, 4, 2, 3, 0]
k = 0; t = 0.0
while t < DUR:
    if not in_tease(t):
        c = CH[chord_at(t)]; m = c[ARP[k % 8]] + 24
        place('music', pluck(m, 0.45, 0.7), t, 0.042 if t < DROP else 0.058, pan=0.4 * np.sin(k * 1.7), send=0.5)
    k += 1; t += BEAT / 2
nb = int(DUR / BEAT) + 1
for i in range(nb):
    t = i * BEAT
    if in_tease(t) or t >= DUR: continue
    hook = t < GROOVE0
    c = chord_at(t)
    if i % 4 == 0: place('drums', kick(1.0), t, 0.62)
    if i % 4 == 2 and not hook: place('drums', kick(0.8), t + BEAT / 2, 0.42)
    if i % 2 == 1 and not hook: place('drums', clap(), t, 0.3, send=0.25); place('drums', snare(), t, 0.12, send=0.2)
    if i % 4 == 0 and not hook: place('drums', k808(ROOT[c] - 12, BEAT * 3.6, 0.5 if i % 8 == 0 else 0.0), t, 0.42)
    sub = 4 if (i % 8 == 7 or t >= DROP and i % 4 == 3) else 2
    for j in range(sub): place('drums', hat(0.045), t + j * BEAT / sub, 0.075 + 0.03 * (j % 2 == 0), pan=0.25 if j % 2 else -0.15)

# ---------------- sound design ----------------
# frame 1: a hit, the engine revving, a whoosh; a second punch on the hook's middle beat
place('sfx', impact(1.8), 0.0, 0.42, send=0.4); place('sfx', fade(engine(T0('A_point') + 0.2, 70, 105, 1.2), 0.005, 0.2), 0.0, 0.2, pan=0.1)
place('sfx', whoosh(0.5, True), 0.0, 0.16, send=0.3); place('sfx', thump(), T0('H_hook', HB * 1.5), 0.3)
place('sfx', fade(wind(GROOVE0 + 0.3, 200, 700), 0.02, 0.3), 0.0, 0.035, send=0.2)
place('sfx', riser(1.1, 300, 6000), GROOVE0 - 1.1, 0.11, send=0.3)
# every cut: a whoosh into it and a low thump on it
for i, c in enumerate(TL['CUTS']):
    place('sfx', whoosh(0.32, up=(i % 2 == 0)), c - 0.2, 0.2, pan=0.5 * (1 if i % 2 else -1), send=0.25)
    place('sfx', thump(), c, 0.28)
# the ramp: the engine climbs in pitch as the road curls up; a long whoosh; then the vertical climb with rushing wind
place('sfx', fade(engine(HB * 2 + 0.1, 105, 170, 1.4), 0.02, 0.1), T0('A_point'), 0.22, pan=-0.1)
place('sfx', fade(sweep(HB * 2, 300, 2500, 0.5, 1.0), 0.1, 0.2), T0('A_point'), 0.12, send=0.3)
place('sfx', fade(engine(HB * 2, 170, 185, 1.0), 0.02, 0.15), T0('A_floor'), 0.2)
place('sfx', fade(wind(HB * 4, 300, 1200), 0.1, 0.3), T0('A_floor'), 0.1, send=0.2)
# counters: ticks while the number rolls, an impact + ding when it lands
for key, n in (('kmh', 14), ('everest', 18), ('km100', 22), ('moon', 18), ('grav', 14), ('speed', 20), ('x280', 18), ('lap', 16)):
    a, b = EV[key]
    for j in range(n): tc = a + (b - a) * (j / n) ** 0.7; place('sfx', tick(), tc, 0.05 + 0.04 * j / n, pan=np.sin(j * 2.1) * 0.4, send=0.15)
    if key not in ('km100', 'grav'): place('sfx', impact(1.6), b, 0.3, send=0.4); place('sfx', ding(96 if key not in ('moon', 'lap') else 93), b, 0.1, send=0.6)
# the clouds: an airy swell; Everest: a thin, cold wind
place('sfx', fade(sweep(1.7, 400, 5000, 0.5, 1.0) * 0.6, 0.2, 0.4), T0('A_clouds'), 0.1, send=0.4)
place('sfx', fade(wind(1.75, 600, 2200), 0.1, 0.3), T0('A_everest'), 0.07, pan=0.3, send=0.3)
# the air thins: the wind fades to nothing at 50 km; a low drone takes over
place('sfx', fade(wind(1.7, 250, 900) * np.linspace(1, 0, int(1.7 * SR)), 0.05, 0.1), T0('B_dark'), 0.06, send=0.2)
td = tt(T1('B_moon') - T0('B_dark')); drone = np.sin(2 * np.pi * 46.25 * td) * 0.5 + np.sin(2 * np.pi * 69.3 * td) * 0.3 + lp(noise(len(td) / SR), 150) * 0.5
place('sfx', fade(drone, 0.5, 0.3), T0('B_dark'), 0.09, send=0.2)
# the Kármán line: a riser to the crossing, then a bright hit, a shimmer and a glitch
place('sfx', riser(EV['line'] - T0('B_line'), 200, 8000), T0('B_line'), 0.15, send=0.35)
place('sfx', revcym(0.7), EV['line'] - 0.7, 0.15, send=0.3)
place('sfx', impact(2.6), EV['line'], 0.5, send=0.5); place('sfx', k808(30, 1.4, 1.0), EV['line'], 0.3)
place('sfx', shimmer(2.0, 86), EV['line'] + 0.02, 0.09, send=0.7); place('sfx', ding(98), EV['line'] + 0.05, 0.12, send=0.6)
place('sfx', glitch(0.2), EV['line'], 0.06)
# the station: radio chirps; the Moon: a long zoom-out whoosh
for j, f in enumerate((1320, 1760, 1480)): place('sfx', beep(f, 0.18), T0('B_iss', 0.35 + j * 0.22), 0.06, pan=0.3, send=0.4)
place('sfx', fade(sweep(1.6, 5000, 200, 0.5, 0.8), 0.05, 0.3), T0('B_moon'), 0.14, send=0.4)
# the tease: the beat drops out; heartbeat, a warning buzz on "NO GRAVITY?", a long riser; then the SLAM
for j in range(4): place('sfx', heartbeat(), TEASE0 + 0.1 + j * 0.62, 0.5)
td = tt(DROP - TEASE0); place('sfx', fade(np.sin(2 * np.pi * 46.25 * td) * 0.5 + lp(noise(len(td) / SR), 120) * 0.4, 0.2, 0.05), TEASE0, 0.08)
place('sfx', glitch(0.3), T0('C_tease', 0.55), 0.08); place('sfx', fade(signal.square(2 * np.pi * 110 * tt(0.35)) * 0.4, 0.005, 0.05), T0('C_tease', 0.55), 0.05)
place('sfx', riser(DROP - TEASE0, 120, 9000), TEASE0, 0.2, send=0.35)
place('sfx', impact(3.0), DROP, 0.55, send=0.5); place('sfx', k808(30, 1.6, 1.2), DROP, 0.4)
place('sfx', ding(98), EV['grav'][1], 0.12, send=0.6)
# falling: whistles down to two thuds; then the near misses; the last one keeps going around
place('sfx', whistle(0.72, 2200, 500), T0('C_fall', 0.05), 0.07, pan=-0.3, send=0.3); place('sfx', thud(), T0('C_fall', 0.75), 0.35)
place('sfx', whistle(0.8, 2000, 450), T0('C_fall', 0.75), 0.07, pan=-0.1, send=0.3); place('sfx', thud(), T0('C_fall', 1.55), 0.35)
# orbital speed: a jet-fast pass and a sub hit
place('sfx', fade(sweep(1.2, 200, 6000, 0.4, 0.7), 0.02, 0.3), T0('C_side'), 0.16, send=0.3); place('sfx', whoosh(0.6, False), T0('C_side', 0.9), 0.2, send=0.3)
place('sfx', fade(engine(HB * 2, 95, 100, 1.0), 0.02, 0.15), T0('C_280'), 0.2, pan=0.2)
place('sfx', whistle(0.5, 2200, 700), T0('C_miss', 0.0), 0.06, pan=-0.4, send=0.3); place('sfx', thud(), T0('C_miss', 0.5), 0.25)
place('sfx', whistle(0.5, 2200, 900), T0('C_miss', 0.45), 0.06, pan=0.0, send=0.3); place('sfx', thud(), T0('C_miss', 0.95), 0.25)
place('sfx', shimmer(1.4, 88), T0('C_miss', 1.0), 0.07, send=0.6); place('sfx', fade(sweep(0.8, 600, 3000, 0.5, 1.0), 0.05, 0.2), T0('C_miss', 0.9), 0.1, send=0.4)
for j in range(2): place('sfx', fade(sweep(1.3, 300, 2400, 0.5, 1.0) * np.sin(np.linspace(0, np.pi, int(1.3 * SR))), 0.02, 0.05), T0('C_orbit', j * 1.3 - 0.4), 0.1, pan=np.sin(j * 2) * 0.5, send=0.4)
# end card: a last hit, the engine idling, then a riser that hands back to the hook's impact when the video loops
place('sfx', impact(1.8), T0('D_end'), 0.42, send=0.5); place('sfx', fade(engine(DUR - T0('D_end'), 60, 72, 1.0), 0.2, 0.05), T0('D_end'), 0.15)
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
