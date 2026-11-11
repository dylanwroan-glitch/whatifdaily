# audio.py — original synthesized score + sound design for "If the Sun were a door" (48 kHz stereo).
# Everything is generated with numpy/scipy: no samples, no copied music. Timings come from timeline.json.
import numpy as np
from scipy import signal
import wave, sys, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
SR = 48000
DUR = TL['DURATION']
N = int(SR * DUR)
rng = np.random.default_rng(1110)
BEAT = 60 / 96

def tt(sec): return np.arange(int(sec * SR)) / SR
def noise(sec): return rng.standard_normal(int(sec * SR))
def lp(x, fc, order=2): b, a = signal.butter(order, min(fc / (SR / 2), 0.99), 'low'); return signal.lfilter(b, a, x, axis=0)
def hp(x, fc, order=2): b, a = signal.butter(order, max(fc / (SR / 2), 1e-4), 'high'); return signal.lfilter(b, a, x, axis=0)
def bp(x, f1, f2, order=2): b, a = signal.butter(order, [f1 / (SR / 2), min(f2 / (SR / 2), 0.99)], 'band'); return signal.lfilter(b, a, x, axis=0)
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def env_ad(sec, a, d_tau):
    t = tt(sec); e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d_tau); return e
def fade(x, a, r):
    n = len(x); e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return x * (e[:, None] if x.ndim == 2 else e)

MIX = {k: np.zeros((N, 2), np.float32) for k in ['music', 'drums', 'sfx', 'send']}
def place(bus, x, t0, gain=1.0, pan=0.0, send=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N: return
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
        f = mtof(m)
        for d in (-0.004, 0.0035):
            x += saw(f, sec, d, 18) * 0.5
    x = lp(x, bright, 2)
    return fade(x / max(len(notes), 1), min(0.6, sec * 0.3), min(0.8, sec * 0.35))
def pluck(m, sec=0.7, bright=1.0):
    f = mtof(m); t = tt(sec)
    x = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (3.5 + 2.2 * k) / bright) / k ** 1.3 for k in range(1, 8))
    return x * np.minimum(1, t / 0.003)
def bass(m, sec):
    f = mtof(m); t = tt(sec)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return x * np.minimum(1, t / 0.01) * np.exp(-t / (sec * 0.9))
def kick(g=1.0):
    t = tt(0.45); f = 44 + 110 * np.exp(-t / 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t / 0.16) + 0.25 * lp(noise(0.45), 2000) * np.exp(-t / 0.006)) * g
def hat(sec=0.06): x = hp(noise(sec), 7000, 2); return x * np.exp(-tt(sec) / 0.018)
def snare():
    t = tt(0.25); return bp(noise(0.25), 1500, 7000) * np.exp(-t / 0.06) * 0.8 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.5
def tick(f=2600, sec=0.03): t = tt(sec); return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.008)
def bell(m, sec=2.5):
    f = mtof(m); t = tt(sec)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (sec * d)) for r, a, d in [(1, 1, 0.5), (2.76, 0.45, 0.25), (5.4, 0.25, 0.12), (8.93, 0.12, 0.07)])
def sweep(sec, f0, f1, q=0.5, curve=1.0):
    # band-pass noise whose centre moves from f0 to f1 (chunked filtering, cross-faded)
    n = int(sec * SR); x = noise(sec); out = np.zeros(n); hop = 960; win = np.hanning(hop * 2)
    for i in range(0, n, hop):
        u = (i / n) ** curve; fc = f0 * (f1 / f0) ** u
        seg = x[max(0, i - hop):i + hop]
        y = bp(seg, max(30, fc * (1 - q)), min(20000, fc * (1 + q)), 2)
        w = win[:len(y)] if len(y) == len(win) else np.hanning(len(y))
        a0 = max(0, i - hop); out[a0:a0 + len(y)] += y * w * 0.5
    return out
def impact():
    t = tt(2.6); sub = np.sin(2 * np.pi * (38 + 40 * np.exp(-t / 0.08)) * t) * np.exp(-t / 0.9)
    return sub * 1.0 + lp(noise(2.6), 900) * np.exp(-t / 0.25) * 0.6 + hp(noise(2.6), 3000) * np.exp(-t / 0.05) * 0.25
def thump():
    t = tt(0.3); return np.sin(2 * np.pi * (60 + 80 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.08)

# ---------------- score ----------------
CH = {'D': [50, 57, 62, 64, 66], 'Bm': [47, 54, 57, 62, 66], 'G': [43, 50, 54, 59, 62], 'A': [45, 52, 57, 61, 64], 'Em': [40, 52, 55, 59, 62], 'Fsm': [42, 54, 57, 61, 64]}
ROOT = {'D': 38, 'Bm': 35, 'G': 31, 'A': 33, 'Em': 28, 'Fsm': 30}
prog = ['D', 'Bm', 'G', 'A']
BAR = BEAT * 4
def chord_at(t): return prog[int(t // BAR) % 4]

# pads all the way, thinner in space, swelling into the reveal
t = 0.0
while t < DUR:
    c = chord_at(t); sec = min(BAR + 0.6, DUR - t)
    space = 25.0 <= t < 29.6
    g = 0.11 if not space else 0.05
    if 36.2 <= t < 39.8: g = 0.16
    if t >= 43.2: g = 0.1
    place('music', pad(CH[c], sec, 1400 if t < 13.5 else 2200), t, g, 0, send=0.5)
    t += BAR
# plucked arpeggio (porch + end), sparkle in the globe build
ARP = [0, 2, 3, 4, 3, 2, 1, 2]
for k in range(int(DUR / (BEAT / 2))):
    t = k * BEAT / 2
    if 13.5 <= t < 19.0 or 21.8 <= t < 29.6: continue
    c = CH[chord_at(t)]; m = c[ARP[k % 8]] + 12
    g = 0.06 if t < 2.7 else 0.075
    if 29.6 <= t < 39.8: g = 0.05 + 0.04 * min(1, (t - 29.6) / 6)
    if t >= 39.8: g = 0.07
    place('music', pluck(m, 0.8), t, g, pan=0.35 * np.sin(k * 1.3), send=0.4)
# 16th pulse in the globe build (filter opens as the laps add up)
for k in range(int((36.2 - 29.6) / (BEAT / 4))):
    t = 29.6 + k * BEAT / 4; c = CH[chord_at(t)]
    x = lp(saw(mtof(c[(k % 4) + 1]), 0.14, 0.0, 12) * np.exp(-tt(0.14) / 0.05), 600 + 4000 * min(1, (t - 29.6) / 6.6))
    place('music', x, t, 0.05 + 0.03 * min(1, (t - 29.6) / 6.6), pan=0.4 * ((k % 2) * 2 - 1), send=0.2)
# bass
for k in range(int(DUR / BEAT)):
    t = k * BEAT
    if t < 2.7 or (19.0 <= t < 21.8) or (25.0 <= t < 29.6): continue
    r = ROOT[chord_at(t)]
    place('music', bass(r, BEAT * 0.95), t, 0.2 if (13.5 <= t < 19.0 or 36.2 <= t < 39.8) else 0.12)
# drums
for k in range(int(DUR / BEAT)):
    t = k * BEAT
    if 2.7 <= t < 13.5 or (t < 2.7 and k % 2 == 0): place('drums', kick(0.55), t, 0.5)
    if 13.5 <= t < 19.0 or 30.2 <= t < 36.2: place('drums', kick(1.0), t, 0.7)
    if 36.2 <= t < 39.8 and k % 2 == 0: place('drums', kick(1.0), t, 0.75)
    if 8.1 <= t < 19.0 or 32.6 <= t < 39.8:
        place('drums', hat(), t + BEAT / 2, 0.16, pan=0.3)
        if 13.5 <= t < 19.0 or 32.6 <= t < 36.2: place('drums', hat(0.04), t + BEAT / 4, 0.08, pan=-0.3); place('drums', hat(0.04), t + 3 * BEAT / 4, 0.08, pan=-0.3)
    if (13.5 <= t < 19.0 or 32.6 <= t < 36.2) and k % 2 == 1: place('drums', snare(), t, 0.3, send=0.3)
# snare build into the chase and into the reveal
for t0, t1 in [(12.0, 13.5), (34.9, 36.2)]:
    k = 0; t = t0
    while t < t1:
        place('drums', snare(), t, 0.12 + 0.25 * (t - t0) / (t1 - t0), send=0.3); k += 1
        t += max(0.06, BEAT / 2 * (1 - (t - t0) / (t1 - t0)) + 0.05)

# ---------------- sound design ----------------
for c in TL['CUTS']: place('sfx', thump(), c, 0.35); place('sfx', hp(noise(0.25), 2500) * np.exp(-tt(0.25) / 0.05), c - 0.05, 0.05, send=0.3)
# title shimmer on frame 1
place('sfx', bell(86, 2.4), 0.0, 0.08, send=0.6); place('sfx', bell(81, 2.4), 0.12, 0.06, pan=0.3, send=0.6)
# nickel 'ting'
place('sfx', bell(96, 1.6), 2.9, 0.07, pan=0.2, send=0.5)
# sun hum on the porch shots
for a, b in [(0.0, 13.5), (39.8, 47.0)]:
    sec = b - a; t = tt(sec)
    hum = lp(noise(sec), 140) * 2.0 + np.sin(2 * np.pi * 55 * t) * 0.3 + np.sin(2 * np.pi * 110.4 * t) * 0.12
    place('sfx', fade(hum, 0.05, 0.4), a, 0.08, send=0.2)
# minis pouring in: rising sizzle + plinks
place('sfx', fade(sweep(2.6, 1500, 7000, 0.35), 0.3, 0.3), 8.1, 0.18, send=0.3)
for i in range(70):
    tt0 = 8.25 + 2.4 * (i / 70) ** 0.8
    place('sfx', tick(1800 + 2400 * rng.random(), 0.04), tt0, 0.05, pan=rng.uniform(-0.7, 0.7), send=0.3)
place('sfx', bell(74, 2.0), 10.6, 0.1, send=0.6)
# launch + flight whoosh (doppler-ish), landing plink
place('sfx', fade(sweep(1.4, 300, 3000, 0.4, 0.7), 0.4, 0.1), 10.0, 0.25)
place('sfx', fade(sweep(6.2, 1800, 500, 0.5, 1.3), 0.1, 0.5), 11.35, 0.35, send=0.2)
for z in range(10, 215, 22):  # lamp/house pass-bys
    pass
place('sfx', thump(), 17.45, 0.5); place('sfx', bell(88, 1.4), 17.45, 0.12, send=0.5)
# distance ticks (every 10 m)
pass_t = [13.6 + 3.85 * (d / 215) ** 0.9 for d in range(10, 216, 10)]
for i, x in enumerate(pass_t): place('sfx', tick(2200 + 30 * i), x, 0.06, pan=0.2)
# S3: wind + distant hum (the sun far away)
place('sfx', fade(lp(noise(2.8), 500), 0.4, 0.6), 19.0, 0.1, send=0.3)
# aerial riser and the Neptune ring 'ding'
place('sfx', fade(sweep(2.2, 200, 6000, 0.3, 0.8), 0.2, 0.05), 21.8, 0.28, send=0.3)
place('sfx', bell(78, 3.0), 24.3, 0.14, send=0.7); place('sfx', bell(85, 3.0), 24.35, 0.08, pan=0.3, send=0.7)
# space: warp whoosh, deep drone, Proxima
place('sfx', fade(sweep(2.4, 4000, 200, 0.5, 0.8), 0.05, 0.6), 25.0, 0.4, send=0.4)
t = tt(4.8); drone = (np.sin(2 * np.pi * 36.7 * t) + 0.5 * np.sin(2 * np.pi * 55 * t)) * 0.5 + lp(noise(4.8), 120) * 1.5
place('sfx', fade(drone, 0.4, 0.6), 25.0, 0.16, send=0.3)
place('sfx', impact() * 0.5, 27.4, 0.35, send=0.5); place('sfx', bell(69, 2.5), 27.45, 0.08, send=0.6)
# globe: km ticks every 2,000 km, lap bell, riser, the big reveal
def laps(tq):
    T0, TL1, T1 = TL['TRIP']['t0'], TL['TRIP']['tLap'], TL['TRIP']['t1']; L = TL['LAPS']
    if tq <= T0: return 0
    if tq < TL1: u = (tq - T0) / (TL1 - T0); return u * u * (3 - 2 * u) * 0.35 + u * 0.65
    u = min(1, (tq - TL1) / (T1 - TL1)); return 1 + (L - 1) * (1 - (1 - u) ** 2.2)
grid = np.arange(29.6, 39.8, 0.005); km = np.array([laps(x) * 40074 for x in grid])
for target in range(2000, 57631, 2000):
    i = np.argmax(km >= target)
    if km[i] >= target: place('sfx', tick(1700 + target / 40, 0.03), grid[i], 0.05, pan=0.15)
place('sfx', bell(81, 2.6), TL['TRIP']['tLap'], 0.16, send=0.6); place('sfx', bell(88, 2.6), TL['TRIP']['tLap'] + 0.05, 0.08, send=0.6)
place('sfx', fade(sweep(1.6, 300, 9000, 0.3, 0.7), 0.3, 0.02), 34.6, 0.3, send=0.3)
place('sfx', impact(), 36.2, 0.55, send=0.6)
place('sfx', bell(74, 3.5), 37.6, 0.12, send=0.7)
# end: soft chime under the question
place('sfx', bell(86, 3.0), 43.3, 0.08, send=0.7)

# ---------------- mix ----------------
ir_t = tt(2.2); ir = noise(2.2) * np.exp(-ir_t / 0.55); ir = np.stack([lp(ir, 5000), lp(np.roll(ir, 311), 5000)], 1) * 0.02
rev = np.stack([signal.fftconvolve(MIX['send'][:, c], ir[:, c])[:N] for c in range(2)], 1)
music = MIX['music']; drums = MIX['drums']
# duck the music a little under the big sfx moments
mix = music * 0.9 + drums * 0.8 + MIX['sfx'] + rev * 0.9
mix = hp(mix, 28, 2)
# master: loudness then soft-knee limiter at -1 dBFS
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
