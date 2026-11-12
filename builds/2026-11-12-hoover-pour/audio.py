# audio.py — original synthesized score + sound design for "Pour Hoover Dam all at once. What happens?" (48 kHz stereo).
# Everything is generated with numpy/scipy: no samples, no copied music. Timings come from timeline.json.
import numpy as np
from scipy import signal
import wave, sys, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
SR = 48000
DUR = TL['DURATION']
N = int(SR * DUR)
rng = np.random.default_rng(1112)
BEAT = 60 / 116.0
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

# ---------------- score ----------------
# A minor for the dam and the single-pour disaster, C major lift for the real method, F/C/G/Am bounce for the bread.
CH = {'Am': [45, 52, 57, 60, 64], 'F': [41, 53, 57, 60, 65], 'C': [48, 55, 60, 64, 67], 'G': [43, 55, 59, 62, 67], 'Dm': [50, 57, 62, 65, 69], 'E': [40, 52, 56, 59, 64]}
ROOT = {'Am': 33, 'F': 29, 'C': 36, 'G': 31, 'Dm': 38, 'E': 28}
BAR = BEAT * 4
def prog_at(t):
    if t < 10.2: return ['Am', 'F', 'C', 'G'][int(t // BAR) % 4]
    if t < 20.6: return ['Am', 'Am', 'F', 'E'][int((t - 10.2) // BAR) % 4]
    if t < 25.8: return ['Dm', 'Am', 'E', 'Am'][int((t - 20.6) // (BAR / 2)) % 4]
    if t < 46.4: return ['C', 'G', 'Am', 'F'][int((t - 25.8) // BAR) % 4]
    return ['F', 'C', 'G', 'C'][int((t - 46.4) // BAR) % 4]
t = 0.0
while t < DUR:
    c = prog_at(t); sec = min(BAR + 0.5, DUR - t)
    g = 0.1
    if 10.2 <= t < 20.6: g = 0.11
    if 20.6 <= t < 25.8: g = 0.06
    if 25.8 <= t < 46.4: g = 0.08
    if t >= 46.4: g = 0.09
    place('music', pad(CH[c], sec, 1400 if t < 25.8 else 2200), t, g, 0, send=0.5)
    t += BAR
ARP = [0, 2, 4, 3, 1, 2, 4, 2]
for k in range(int(DUR / (BEAT / 2))):
    t = k * BEAT / 2
    if not (0 <= t < 10.2 or 25.8 <= t < 46.4 or 48.8 <= t < 57.0): continue
    c = CH[prog_at(t)]; m = c[ARP[k % 8]] + 12
    gain = 0.065 if t < 10.2 else 0.07
    place('music', pluck(m, 0.7, 1.2 if t > 46 else 1.0), t, gain, pan=0.35 * np.sin(k * 1.3), send=0.4)
for k in range(int(DUR / BEAT)):
    t = k * BEAT
    if 12.8 <= t < 15.4 or 20.6 <= t < 21.6 or 46.4 <= t < 48.8: continue
    g = 0.13 if 25.8 <= t < 46.4 or t > 48.8 else 0.11
    place('music', bass(ROOT[prog_at(t)], BEAT * 0.95), t, g)
# drums: light pulse in the intro, groove for the real construction, bouncy for the bread
for k in range(int(DUR / BEAT)):
    t = k * BEAT
    if 2.6 <= t < 10.2 and k % 2 == 0: place('drums', kick(0.7), t, 0.4)
    if 25.8 <= t < 46.4 or 48.8 <= t < 54.0:
        if k % 2 == 0: place('drums', kick(1.0), t, 0.55)
        place('drums', hat(), t + BEAT / 2, 0.1, pan=0.3)
        if k % 4 == 2: place('drums', snare(), t, 0.22, send=0.3)
    if 31.0 <= t < 38.8: place('drums', hat(0.04), t + BEAT / 4, 0.06, pan=-0.3)
# snare build into the crack, and into the bread
for (a, b) in [(18.6, 20.6), (47.0, 48.8)]:
    t = a
    while t < b:
        place('drums', snare(), t, 0.08 + 0.2 * (t - a) / (b - a), send=0.3); t += max(0.055, BEAT / 2 * (1 - (t - a) / (b - a)) + 0.04)

# ---------------- sound design ----------------
for c in TL['CUTS']:
    place('sfx', thump(), c, 0.28); place('sfx', hp(noise(0.25), 2500) * np.exp(-tt(0.25) / 0.05), c - 0.05, 0.05, send=0.3)
# hook: wind in the canyon + a riser into the facts
place('sfx', fade(lp(noise(10.2), 600) * 0.9 + bp(noise(10.2), 800, 2400) * 0.15, 0.05, 0.6), 0.0, 0.09, send=0.2)
place('sfx', bell(81, 2.4), 0.0, 0.06, send=0.6); place('sfx', bell(88, 2.4), 0.08, 0.04, pan=0.3, send=0.6)
place('sfx', fade(sweep(1.3, 300, 2600, 0.4, 0.8), 0.4, 0.05), 1.35, 0.17, send=0.3)
# counters: rapid ticks while the numbers climb, a hit when they land
def counter(t0, t1, n=40, land=True):
    for i in range(n):
        u = i / n; tc = t0 + (t1 - t0) * (u ** 0.6)
        place('sfx', tick(), tc, 0.06 + 0.05 * u, pan=np.sin(i * 2.1) * 0.4, send=0.15)
    if land: place('sfx', impact(1.4) * 0.5, t1, 0.35, send=0.4); place('sfx', bell(88, 2.0), t1, 0.06, send=0.6)
counter(EV['tall0'], EV['tall1']); counter(EV['conc0'], EV['conc1'])
place('sfx', fade(sweep(2.4, 2000, 400, 0.4, 1.0), 0.1, 0.5), 2.6, 0.12, send=0.3)          # the dive down the face
# the highway: tyre-on-concrete rush + joint clicks
tr = tt(2.6); road = bp(noise(2.6), 200, 1800) * 0.8
place('sfx', fade(road, 0.1, 0.3), 7.6, 0.13, pan=-0.2, send=0.2)
for k in range(int(2.6 * 52 / 4.6)): place('sfx', tick(0.6) * 0.4, 7.62 + k * 4.6 / 52, 0.05, pan=0.2)
# heat: bucket gate + pour splat, then the sizzle as the thermal view comes in
place('sfx', clank(700), 10.22, 0.12, pan=0.3, send=0.3); place('sfx', splat(), 10.35, 0.25)
place('sfx', fade(sizzle(2.2), 0.4, 0.3), 10.6, 0.09, send=0.3)
place('sfx', fade(lp(noise(2.6), 220) * 1.5, 0.3, 0.3), 10.2, 0.12, send=0.2)
place('sfx', fade(sweep(1.0, 400, 3000, 0.5, 0.8), 0.3, 0.1), 10.4, 0.1, send=0.3)
# the single pour: a rising roar
place('sfx', fade(rumble(2.7, 160) * np.linspace(0.5, 1.0, int(2.7 * SR)), 0.1, 0.25), 12.8, 0.4, send=0.2)
place('sfx', fade(sweep(1.8, 150, 1800, 0.5, 0.9), 0.2, 0.1), EV['pour0'], 0.22, send=0.3)
place('sfx', impact(), EV['pour1'], 0.34, send=0.5)
# core: hot drone, sizzle
td = tt(5.2); drone = np.sin(2 * np.pi * 55 * td) * 0.6 + np.sin(2 * np.pi * 82.5 * td) * 0.3 + lp(noise(5.2), 200) * 0.5
place('sfx', fade(drone, 0.3, 0.4), 15.4, 0.14, send=0.2); place('sfx', fade(sizzle(5.2), 0.3, 0.5), 15.4, 0.035)
place('sfx', impact(1.8), 15.4, 0.3, send=0.5)                                                  # the slice
# 125 years: an accelerating clock
tc = EV['years0']; k = 0
while tc < EV['years1']:
    place('sfx', tick(0.4), tc, 0.12, pan=0.2 if k % 2 else -0.2, send=0.2); k += 1; tc += max(0.035, 0.22 * (1 - (tc - EV['years0']) / (EV['years1'] - EV['years0'])) ** 1.5)
place('sfx', bell(76, 3.0), EV['years1'], 0.12, send=0.7); place('sfx', impact(1.5) * 0.6, EV['years1'], 0.3, send=0.4)
# crack and crumble: the drop
place('sfx', impact(2.8), EV['crack0'], 0.42, send=0.6)
for i in range(9): place('sfx', crack(0.6), EV['crack0'] + 0.1 + i * 0.21 + rng.uniform(0, 0.08), 0.15, pan=rng.uniform(-0.7, 0.7), send=0.3)
place('sfx', fade(rumble(2.6, 90), 0.05, 0.6), EV['crack0'], 0.26, send=0.3)
for i in range(14): place('sfx', thud() * 0.6, EV['crack0'] + 0.7 + rng.uniform(0, 1.8), 0.12, pan=rng.uniform(-0.6, 0.6), send=0.2)
# 2058: low sting, then a rewind into the real method
place('sfx', bell(57, 3.0) + bell(64, 3.0) * 0.6, EV['y2058'], 0.12, send=0.7); place('sfx', impact(1.6) * 0.5, EV['y2058'], 0.3, send=0.5)
place('sfx', fade(rewind(0.75), 0.05, 0.05), 25.1, 0.12, send=0.2)
# columns: construction yard — cable whine, clanks
tw = tt(5.2); whine = np.sin(2 * np.pi * (420 + 12 * np.sin(2 * np.pi * 0.6 * tw)) * tw) * 0.3 + bp(noise(5.2), 600, 1400) * 0.3
place('sfx', fade(whine, 0.4, 0.5), 25.8, 0.04, pan=-0.3, send=0.3)
for tcl in (26.3, 27.1, 27.7, 28.9, 29.5): place('sfx', clank(rng.uniform(600, 1100)), tcl, 0.07, pan=rng.uniform(-0.6, 0.6), send=0.4)
# lifts: bucket gate, pour, splats, and the "5 ft" landing
place('sfx', clank(780), 28.62, 0.13, pan=0.2, send=0.3)
place('sfx', fade(lp(noise(1.7), 900) * 1.2, 0.08, 0.3), 28.7, 0.16, send=0.2)
for i in range(6): place('sfx', splat(), 28.8 + i * 0.25, 0.12, pan=rng.uniform(-0.3, 0.3))
place('sfx', impact(1.2) * 0.5, EV['lift1'], 0.3, send=0.4); place('sfx', bell(84, 2.0), EV['lift1'], 0.06, send=0.6)
# x-ray: shimmer + data blips; pipe count; river water; grout
tx = tt(7.8); shim = bp(noise(7.8), 5000, 11000) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * tx))
place('sfx', fade(shim, 0.3, 0.4), 31.0, 0.025, pan=0.3, send=0.4)
for i in range(16): place('sfx', pluck(84 + [0, 3, 7, 10][i % 4], 0.3, 0.6), 31.1 + i * BEAT / 2, 0.025, pan=np.sin(i) * 0.6, send=0.5)
counter(EV['miles0'], EV['miles1'], 48)
place('sfx', fade(water(2.6), 0.3, 0.3), 36.2, 0.1, send=0.3)
place('sfx', fade(sweep(1.2, 3000, 500, 0.4, 0.9), 0.05, 0.2), 36.25, 0.1, send=0.3)
# ice plant: compressor hum + clinks; done: whoosh to daylight and a major chord
th = tt(2.6); comp = np.sin(2 * np.pi * 60 * th) * 0.3 + np.sin(2 * np.pi * 120 * th) * 0.15 + lp(noise(2.6), 300) * 0.4
place('sfx', fade(comp, 0.2, 0.3), 38.8, 0.09, send=0.2)
for i in range(18): place('sfx', clink(rng.uniform(1800, 3200)), 38.9 + i * 0.14 + rng.uniform(0, 0.05), 0.045, pan=rng.uniform(-0.6, 0.6), send=0.4)
counter(EV['ice0'], EV['ice1'], 36)
place('sfx', bell(84, 3.0), 41.6, 0.09, send=0.7)
place('sfx', fade(sweep(1.0, 500, 5000, 0.4, 0.7), 0.4, 0.05), 42.1, 0.14, send=0.3); place('sfx', impact(1.6) * 0.5, 43.05, 0.3, send=0.5)
place('music', pad(CH['C'] + [72], 2.6, 2600), 43.05, 0.1, send=0.7)
# grout: pressure hiss + squelch, flow stops
place('sfx', fade(hp(noise(1.8), 1800) * 0.6, 0.05, 0.4), EV['grout0'], 0.06, pan=0.2, send=0.2)
for i in range(5): place('sfx', splat() * 0.7, EV['grout0'] + 0.3 + i * 0.3, 0.07, pan=rng.uniform(-0.4, 0.4))
place('sfx', fade(water(0.8), 0.05, 0.6), 44.0, 0.06)
# oven: door, fire crackle, the timer ding
place('sfx', fade(fire(2.4), 0.2, 0.3), 46.4, 0.22, send=0.3)
place('music', pad(CH['F'] + [69], 2.4, 1600), 46.4, 0.12, send=0.6)
place('sfx', clank(330) * 0.6, 46.45, 0.1, send=0.4)
place('sfx', ding(93), 48.5, 0.13, send=0.6)
# bread: soft thuds as loaves tumble, counters, the reveal
for i in range(40): place('sfx', thud(), 49.0 + i * 0.12 + rng.uniform(0, 0.06), 0.05 + 0.03 * rng.random(), pan=rng.uniform(-0.7, 0.7), send=0.2)
counter(EV['loaves0'], EV['loaves1'], 40)
for i in range(30): place('sfx', thud(), 51.5 + i * 0.075 + rng.uniform(0, 0.04), 0.05, pan=rng.uniform(-0.7, 0.7), send=0.2)
counter(EV['yrs0'], EV['yrs1'], 54)
place('sfx', impact(2.4), EV['yrs1'], 0.28, send=0.6)
# end
place('sfx', bell(84, 3.0), 54.05, 0.09, send=0.7); place('sfx', bell(79, 3.0), 54.15, 0.06, pan=-0.3, send=0.7)
place('music', pad(CH['C'], 3.0, 2000), 54.0, 0.08, send=0.7)

# ---------------- mix ----------------
ir_t = tt(2.2); ir = noise(2.2) * np.exp(-ir_t / 0.5); ir = np.stack([lp(ir, 5000), lp(np.roll(ir, 311), 5000)], 1) * 0.02
rev = np.stack([signal.fftconvolve(MIX['send'][:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = MIX['music'] * 0.9 + MIX['drums'] * 0.8 + MIX['sfx'] + rev * 0.9
mix = hp(mix, 28, 2)
rms = np.sqrt(np.mean(mix ** 2)); mix *= 10 ** (-16.5 / 20) / max(rms, 1e-9)
lim = 10 ** (-1.2 / 20)
def soft(x): return np.where(np.abs(x) < lim * 0.7, x, np.sign(x) * (lim * 0.7 + (lim * 0.3) * np.tanh((np.abs(x) - lim * 0.7) / (lim * 0.3))))
mix = soft(mix)
mix = fade(mix, 0.0, 0.25)
out = sys.argv[1] if len(sys.argv) > 1 else 'sound.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
print('peak dBFS %.2f  rms dBFS %.2f' % (20 * np.log10(np.max(np.abs(mix))), 20 * np.log10(np.sqrt(np.mean(mix ** 2)))))
sec = [20 * np.log10(np.sqrt(np.mean(mix[int(i * SR):int((i + 1) * SR)] ** 2)) + 1e-9) for i in range(int(DUR))]
print('per-second dB:', ' '.join('%d' % v for v in sec))
