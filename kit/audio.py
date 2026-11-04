# audio.py — original synthesized score + sound design for the copper video (64 s, 48 kHz stereo)
import numpy as np
from scipy import signal
import wave, sys

SR = 48000
DUR = 64.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR

def buf():
    return np.zeros((N, 2), np.float32)

def place(dst, x, t0, gain=1.0, pan=0.0):
    """Add mono or stereo x into dst at time t0 (seconds)."""
    i0 = int(t0 * SR)
    if i0 >= N: return
    if x.ndim == 1:
        l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l, x * r], 1) * np.sqrt(2)
    n = min(len(x), N - i0)
    if i0 < 0: x = x[-i0:]; n = min(len(x), N); i0 = 0
    dst[i0:i0 + n] += (x[:n] * gain).astype(np.float32)

def env_ar(n, a, r, sus=1.0):
    e = np.ones(n) * sus
    na, nr = int(a * SR), int(r * SR)
    if na > 0: e[:na] = np.linspace(0, sus, na)
    if nr > 0 and nr < n: e[-nr:] = np.linspace(sus, 0, nr) * e[-nr]
    return e

def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc / (SR / 2), 0.99), 'low'); return signal.lfilter(b, a, x, axis=0)
def hp(x, fc, order=2):
    b, a = signal.butter(order, max(fc / (SR / 2), 1e-4), 'high'); return signal.lfilter(b, a, x, axis=0)
def bp(x, f1, f2, order=2):
    b, a = signal.butter(order, [f1 / (SR / 2), min(f2 / (SR / 2), 0.99)], 'band'); return signal.lfilter(b, a, x, axis=0)

def noise(sec):
    return rng.standard_normal(int(sec * SR))

def brown(sec):
    w = rng.standard_normal(int(sec * SR)); b = np.cumsum(w); b -= lp(b, 8); return b / (np.abs(b).max() + 1e-9)

def saw(freq, sec, harm=28, detune=0.0):
    n = int(sec * SR); tt = np.arange(n) / SR; out = np.zeros(n)
    f = freq * (1 + detune)
    for k in range(1, harm + 1):
        if f * k > 15000: break
        out += np.sin(2 * np.pi * f * k * tt + rng.uniform(0, 6.28)) / k
    return out

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

def pad_chord(notes, sec, cutoff=1400, att=1.5, rel=2.0, amp=0.06):
    n = int(sec * SR); L = np.zeros(n); R = np.zeros(n)
    for m in notes:
        f = mtof(m)
        for d, side in ((-0.004, -1), (0.0, 0), (0.0045, 1)):
            v = saw(f, sec, harm=18, detune=d)
            if side <= 0: L += v
            if side >= 0: R += v
    st = np.stack([L, R], 1)
    st = lp(st, cutoff, 2)
    e = env_ar(n, att, rel)[:, None]
    lfo = (1 + 0.12 * np.sin(2 * np.pi * 0.18 * np.arange(n) / SR))[:, None]
    return st * e * lfo * amp / max(1, len(notes))

def pluck(m, sec=1.2, amp=0.25, bright=3500):
    n = int(sec * SR); tt = np.arange(n) / SR; f = mtof(m)
    x = np.sin(2 * np.pi * f * tt) + 0.45 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 9) + 0.25 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt * 14)
    x *= np.exp(-tt * 4.2) * np.minimum(1, tt / 0.003)
    return lp(x, bright) * amp

def bell(f, sec=3.0, amp=0.2):
    n = int(sec * SR); tt = np.arange(n) / SR; x = np.zeros(n)
    for ratio, a, d in ((1, 1, 1.2), (2.76, 0.5, 2.6), (5.4, 0.25, 4.5), (8.93, 0.12, 7.0)):
        x += a * np.sin(2 * np.pi * f * ratio * tt) * np.exp(-tt * d)
    return x * np.minimum(1, tt / 0.002) * amp

def reverb_ir(sec=2.8, decay=2.4):
    n = int(sec * SR); tt = np.arange(n) / SR
    L = rng.standard_normal(n) * np.exp(-tt * decay); R = rng.standard_normal(n) * np.exp(-tt * decay)
    ir = np.stack([L, R], 1); ir = lp(ir, 6000); ir[:int(0.012 * SR)] = 0; return ir / np.sqrt((ir ** 2).sum())

def apply_reverb(x, wet=0.35, ir=None):
    ir = reverb_ir() if ir is None else ir
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:N] for c in range(2)], 1)
    return x * (1 - wet * 0.5) + y * wet * 3.0

music = buf(); sfx = buf(); amb = buf()

# ------------------------- AMBIENCE -------------------------
# harbor: water lapping + wind (0-16.5 with city hum; harbor shots later)
def water(sec):
    x = bp(noise(sec), 180, 1400); n = len(x); tt = np.arange(n) / SR
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * 0.31 * tt) * np.sin(2 * np.pi * 0.11 * tt + 1.0)
    return x * mod * 0.05
def wind(sec, amp=0.05):
    x = lp(noise(sec), 500); n = len(x); tt = np.arange(n) / SR
    mod = 0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * tt) * np.sin(2 * np.pi * 0.023 * tt + 2)
    return x * mod * amp
def cityhum(sec, amp=0.06):
    n = int(sec * SR); tt = np.arange(n) / SR
    x = 0.5 * np.sin(2 * np.pi * 60 * tt) + 0.25 * np.sin(2 * np.pi * 120 * tt) + 0.12 * np.sin(2 * np.pi * 180 * tt)
    traffic = lp(noise(sec), 700) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.2 * tt))
    return (x * 0.12 + traffic * 0.6) * amp

fadein = lambda x, s: x * np.minimum(1, np.arange(len(x)) / (s * SR))[:, None] if x.ndim == 2 else x * np.minimum(1, np.arange(len(x)) / (s * SR))
def fade(x, a, r):
    n = len(x); e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return x * (e[:, None] if x.ndim == 2 else e)

place(amb, fade(water(6.6), 0.8, 0.15), 0.0, 1.0, -0.2)
place(amb, fade(wind(16.5, 0.035), 1.0, 0.05), 0.0, 1.0, 0.3)
place(amb, fade(cityhum(10.0, 0.07), 1.5, 0.02), 6.5, 1.0, 0.0)           # city hum until blackout
place(amb, fade(cityhum(0.2, 0.0), 0.01, 0.01), 16.5)
# after blackout: wind only, eerie (street 16.5-25.5)
place(amb, fade(wind(9.0, 0.06), 0.3, 0.3), 16.5, 1.0, -0.3)
# cars coasting: tire roll fading
roll = bp(noise(4.0), 90, 900) * np.exp(-np.arange(int(4.0 * SR)) / SR / 1.4) * 0.12
place(amb, roll, 16.5, 1.0, 0.0)
# liberty island & harbor scenes (25.5-40.5, 47.5-64)
place(amb, fade(wind(15.0, 0.07) + water(15.0) * 0.8, 0.2, 0.2), 25.5, 1.0, 0.2)
place(amb, fade(wind(16.5, 0.06) + water(16.5), 0.3, 1.0), 47.5, 1.0, -0.1)
# room tone for pennies (40.5-47.5): quiet + candle crackle
room = lp(noise(7.0), 300) * 0.012
crk = np.zeros(int(7.0 * SR))
for k in range(26):
    i = rng.integers(0, len(crk) - 2000); crk[i:i + 400] += hp(rng.standard_normal(400), 2000) * np.exp(-np.arange(400) / 60) * rng.uniform(0.02, 0.06)
place(amb, fade(room + crk, 0.1, 0.2), 40.5)
# city hum returns with the lights (time-lapse 58.6-64)
place(amb, fade(cityhum(5.4, 0.05), 2.5, 0.6), 58.6, 1.0, 0.0)

# ------------------------- MUSIC -------------------------
BPM = 100; beat = 60 / BPM
# Section 1 (0 - 16.5): Dm9 pad + arpeggio from 6.5
place(music, pad_chord([38, 45, 53, 60, 64], 16.6, cutoff=1100, att=2.5, rel=0.08, amp=0.11), 0.0)
arp = [62, 65, 69, 72, 64, 69, 72, 76]
tt = 6.5; k = 0
while tt < 16.4:
    m = arp[k % len(arp)] - (12 if (k // 8) % 2 else 0) + (0 if tt < 12.5 else 0)
    place(music, pluck(m, 1.0, 0.07 + 0.05 * min(1, (tt - 6.5) / 6)), tt, 1.0, (-0.4 if k % 2 else 0.4))
    tt += beat / 2; k += 1
# bass pulses under the fly-through
for i in range(int((16.5 - 6.5) / beat)):
    s = 6.5 + i * beat
    if s >= 16.4: break
    n = int(0.45 * SR); x = np.sin(2 * np.pi * mtof(38) * np.arange(n) / SR) * np.exp(-np.arange(n) / SR * 6) * 0.13
    place(music, x, s)
# riser into the blackout (13.5-16.5)
n = int(3.0 * SR); tr = np.arange(n) / SR
riser = bp(noise(3.0), 600, 6000) * (tr / 3.0) ** 2 * 0.09 + np.sin(2 * np.pi * (200 * tr + 180 * tr ** 2)) * (tr / 3.0) ** 2.5 * 0.04
place(music, riser, 13.5)
# countdown ticks
for i, s in enumerate([13.8, 14.8, 15.8]):
    place(sfx, bell(880 * (1 + 0.12 * i), 0.8, 0.12), s, 1.0, 0.0)
# dark drone (17.5 - 47.5)
n = int(30.5 * SR); td = np.arange(n) / SR
drone = (np.sin(2 * np.pi * mtof(26) * td) * 0.5 + np.sin(2 * np.pi * mtof(33) * td + 0.3) * 0.35 + np.sin(2 * np.pi * (mtof(26) * 1.004) * td) * 0.4)
drone = lp(drone, 400) * 0.08 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.09 * td))
eerie = np.sin(2 * np.pi * mtof(81) * td) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.21 * td)) * 0.018
place(music, fade(np.stack([drone + eerie, drone * 0.96 + eerie * 0.8], 1), 2.5, 1.2), 17.5)
# tinnitus ring after the blackout
n = int(3.5 * SR); tr = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * 3150 * tr) * np.exp(-tr / 1.1) * 0.025, 16.55, 1.0, 0.0)
# low drone after 'the lights aren't'
n = int(3.8 * SR); tr = np.arange(n) / SR
d2 = lp(np.sin(2 * np.pi * mtof(26) * tr) * 0.5 + np.sin(2 * np.pi * mtof(38) * tr) * 0.3 + np.sin(2 * np.pi * mtof(81) * tr) * 0.05, 900) * 0.09
place(music, fade(d2, 0.6, 0.8), 51.6)
# tension before return (47.5 - 49.0)
n = int(1.5 * SR); tr = np.arange(n) / SR
place(music, bp(noise(1.5), 400, 5000) * (tr / 1.5) ** 2 * 0.08, 47.5)
for s in (47.6, 48.2, 48.7):
    m = int(0.35 * SR); x = np.sin(2 * np.pi * 52 * np.arange(m) / SR) * np.exp(-np.arange(m) / SR * 9) * 0.35
    place(sfx, x, s)
# hopeful progression for the time-lapse (55 - 64)
prog = [(55.0, [46, 53, 57, 60, 62], 2.6), (57.6, [48, 55, 60, 64, 67], 2.0), (59.6, [45, 53, 57, 60, 65], 2.0), (61.6, [38, 50, 57, 60, 64, 69], 2.4)]
for s, notes, d in prog:
    place(music, pad_chord(notes, d + 1.6, cutoff=1800, att=0.7, rel=1.4, amp=0.13), s)
tt = 57.6; k = 0
arp2 = [72, 76, 79, 84, 79, 76]
while tt < 63.0:
    place(music, pluck(arp2[k % len(arp2)] - (2 if tt > 59.6 else 0), 1.1, 0.06), tt, 1.0, (-0.5 if k % 2 else 0.5)); tt += beat / 2; k += 1
place(music, bell(mtof(74), 4.0, 0.11), 61.6, 1.0, 0.0)

# ------------------------- SFX -------------------------
def impact(sec=2.5, f0=70, f1=26, amp=0.7):
    n = int(sec * SR); tt = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-tt / 0.35); ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-tt / 0.9)
    click = hp(noise(sec), 1500) * np.exp(-tt / 0.02) * 0.5
    return (body + click) * amp
def powerdown(sec=1.0, f0=900, f1=50, amp=0.12):
    n = int(sec * SR); tt = np.arange(n) / SR; f = f0 * (f1 / f0) ** (tt / sec); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.3 * np.sin(2 * ph)) * (1 - tt / sec) ** 1.5 * amp
def crackle(sec=0.6, amp=0.25):
    n = int(sec * SR); x = np.zeros(n)
    for k in range(40):
        i = rng.integers(0, n - 600); ln = rng.integers(60, 500); x[i:i + ln] += rng.standard_normal(ln) * np.exp(-np.arange(ln) / (ln / 4)) * rng.uniform(0.3, 1)
    return hp(x, 1800) * amp * np.exp(-np.arange(n) / SR / (sec / 2))
def whoosh(sec=1.0, amp=0.15, f1=300, f2=3000, rev=False):
    n = int(sec * SR); tt = np.arange(n) / SR; e = np.sin(np.pi * tt / sec) ** 2
    x = bp(noise(sec), f1, f2) * e * amp
    return x[::-1] if rev else x
def shimmer(sec=1.4, amp=0.12):
    n = int(sec * SR); x = np.zeros(n)
    for k in range(140):
        s = rng.integers(0, n - 4000); f = rng.uniform(2500, 7500); m = 3000; tt = np.arange(m) / SR
        x[s:s + m] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 40) * rng.uniform(0.2, 1)
    return x * amp * np.minimum(1, np.arange(n) / (0.05 * SR)) * np.exp(-np.arange(n) / SR / (sec * 0.6))
def creak(sec=2.0, amp=0.1, f=110):
    x = noise(sec); n = len(x); tt = np.arange(n) / SR
    y = np.zeros(n)
    for ff in (f, f * 1.51, f * 2.3):
        b, a = signal.iirpeak(min(ff * (1 + 0.05 * np.sin(1)) / (SR / 2), 0.99), 25); y += signal.lfilter(b, a, x)
    e = np.sin(np.pi * np.minimum(tt / sec, 1)) ** 1.5
    return y * e * amp
def coin_ring(sec=1.6, amp=0.12, f=3100):
    n = int(sec * SR); tt = np.arange(n) / SR; x = np.zeros(n)
    for ratio, a, d in ((1, 1, 5), (1.68, 0.6, 7), (2.71, 0.4, 9), (3.9, 0.25, 12)):
        x += a * np.sin(2 * np.pi * f * ratio * tt) * np.exp(-tt * d)
    return x * amp

# whoosh on cuts
for s in (6.5, 25.5, 40.5, 47.5):
    place(sfx, whoosh(0.9, 0.09), s - 0.45, 1.0, 0.0)
place(sfx, bell(mtof(81), 2.5, 0.06), 0.4, 1.0, 0.2)   # soft ping under title
# blackout (16.5)
place(sfx, impact(3.0, 75, 24, 0.75), 16.5)
place(sfx, powerdown(0.9), 16.5, 1.0, 0.0)
place(sfx, crackle(0.7, 0.22), 16.5, 1.0, -0.3)
place(sfx, crackle(0.5, 0.15), 16.52, 1.0, 0.4)
# liberty: reverse swell into 26.3, dissolve shimmer, impact, creaks
place(sfx, whoosh(0.8, 0.12, 500, 6000, rev=True), 26.3 - 0.8)
place(sfx, impact(2.2, 60, 28, 0.45), 26.3)
place(sfx, shimmer(1.6, 0.16), 26.3, 1.0, 0.0)
place(sfx, crackle(0.5, 0.12), 26.3, 1.0, 0.2)
place(sfx, creak(2.4, 0.06, 95), 28.0, 1.0, -0.3)
place(sfx, creak(2.0, 0.05, 130), 33.2, 1.0, 0.3)
place(sfx, shimmer(1.2, 0.07), 36.3, 1.0, 0.2)
# pennies (41.2): lamp off click + rings losing color + crumble
place(sfx, impact(1.4, 90, 40, 0.3), 41.2)
place(sfx, hp(noise(0.03), 2000) * 0.2, 41.2)
for i, f in enumerate((3100, 3550, 2850, 4000)):
    place(sfx, coin_ring(1.6, 0.05, f), 41.22 + i * 0.03, 1.0, (-0.5 + i * 0.33))
dust = bp(noise(2.2), 1500, 9000) * np.exp(-np.arange(int(2.2 * SR)) / SR / 0.9) * 0.09
gr = np.zeros(len(dust));
for k in range(300):
    i = rng.integers(0, len(gr) - 200); gr[i:i + 120] += rng.standard_normal(120) * np.exp(-np.arange(120) / 25) * rng.uniform(0.02, 0.08)
place(sfx, dust + hp(gr, 2500) * np.exp(-np.arange(len(gr)) / SR / 0.8), 41.25, 1.0, 0.1)
# copper returns (49.0)
place(sfx, whoosh(0.9, 0.16, 400, 7000, rev=True), 49.0 - 0.9)
place(sfx, impact(2.0, 110, 40, 0.4), 49.0)
place(sfx, shimmer(1.0, 0.13), 49.0, 1.0, 0.0)
place(sfx, bell(mtof(86), 2.0, 0.05), 49.02)
# "the lights aren't" — dull thud
m = int(0.8 * SR); place(sfx, np.sin(2 * np.pi * 45 * np.arange(m) / SR) * np.exp(-np.arange(m) / SR * 5) * 0.35, 51.8)
# time-lapse: accelerating ticks (55.2 - 61.2)
tt = 55.2; iv = 0.42
while tt < 61.2:
    m = int(0.03 * SR); place(sfx, hp(noise(0.03), 3000) * np.exp(-np.arange(m) / SR * 160) * 0.12, tt, 1.0, 0.3)
    tt += iv; iv = max(0.06, iv * 0.93)
place(sfx, whoosh(2.5, 0.06, 200, 2500), 55.3)
# power-on swell as lights return (60.6)
n = int(1.6 * SR); tr = np.arange(n) / SR
swell = (np.sin(2 * np.pi * 60 * tr) * 0.5 + np.sin(2 * np.pi * 120 * tr) * 0.3) * (tr / 1.6) ** 2 * 0.12
place(sfx, swell, 59.6)

# ------------------------- MIX -------------------------
ir = reverb_ir(3.2, 1.9)
music = apply_reverb(music, 0.45, ir)
sfx_w = apply_reverb(sfx, 0.18, ir)
mix = music * 0.9 + sfx_w * 1.0 + amb * 1.0
# hard cut of music/hum at blackout already arranged; gentle fade-out at the end
endf = np.ones(N); i0 = int(63.3 * SR); endf[i0:] = np.linspace(1, 0, N - i0) ** 1.5
mix *= endf[:, None]
mix = hp(mix, 25)
rms = np.sqrt(np.mean(mix ** 2)); target = 10 ** (-17 / 20); mix *= target / (rms + 1e-9)
peak = np.abs(mix).max()
k = 0.7  # soft-knee limiter, ceiling 0.89
a = np.abs(mix); over = a > k
mix[over] = np.sign(mix[over]) * (k + (0.89 - k) * np.tanh((a[over] - k) / (0.89 - k)))
out = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'sound.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('wrote', len(out) / SR, 's  rms', 20 * np.log10(np.sqrt(np.mean((out / 32767.0) ** 2)) + 1e-9), 'dBFS  peak', 20 * np.log10(np.abs(out).max() / 32767 + 1e-9), 'dBFS')
