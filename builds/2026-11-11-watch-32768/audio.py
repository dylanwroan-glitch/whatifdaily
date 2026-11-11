# audio.py — original synthesized score + sound design for "Why does your watch count to 32,768?" (48 kHz stereo).
# Everything is generated with numpy/scipy: no samples, no copied music. Timings come from timeline.json.
# The halving cascade is played literally: a tone that drops one octave per halving (16,384 Hz down to 32 Hz),
# then click trains at 16, 8, 4, 2 and finally 1 pulse per second.
import numpy as np
from scipy import signal
import wave, sys, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
SR = 48000
DUR = TL['DURATION']
N = int(SR * DUR)
rng = np.random.default_rng(1111)
BEAT = 0.5  # 120 BPM: the watch ticks land on every other beat (n + 0.5 s)
HALF_T = TL['HALF_T']; EV = TL['EV']

def tt(sec): return np.arange(int(sec * SR)) / SR
def noise(sec): return rng.standard_normal(int(sec * SR))
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
def tock(big=1.0):
    # a watch tick: bright click + short woody body; 'big' adds a low thump for the payoff ticks
    t = tt(0.25)
    click = hp(noise(0.25), 2500) * np.exp(-t / 0.0025)
    body = (np.sin(2 * np.pi * 1750 * t) * 0.5 + np.sin(2 * np.pi * 3100 * t) * 0.3) * np.exp(-t / 0.012)
    low = np.sin(2 * np.pi * (70 + 120 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.07)
    return click * 0.7 + body + low * 0.9 * big
def zap(sec=0.35):
    t = tt(sec); x = hp(noise(sec), 1800) * (0.4 + 0.6 * (rng.random(len(t)) > 0.9))
    buzz = signal.square(2 * np.pi * 120 * t) * 0.25 + np.sin(2 * np.pi * 240 * t) * 0.2
    return (x * 0.7 + buzz) * np.exp(-t / (sec * 0.35)) * np.minimum(1, t / 0.004)
def metal_click():
    t = tt(0.4); return (bp(noise(0.4), 3000, 9000) * np.exp(-t / 0.01) + sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in [(2380, 0.08), (3910, 0.05), (5230, 0.03)]) * 0.35)

# ---------------- score ----------------
# D minor colour for the mystery (watch + chip), F major lift when the tick resolves, wide Bb/F/C for the atom, Dm at the end
CH = {'Dm': [50, 57, 62, 65, 69], 'Bb': [46, 53, 58, 62, 65], 'F': [41, 53, 57, 60, 65], 'C': [48, 55, 60, 64, 67], 'Gm': [43, 55, 58, 62, 67], 'A': [45, 57, 61, 64, 69]}
ROOT = {'Dm': 38, 'Bb': 34, 'F': 29, 'C': 36, 'Gm': 31, 'A': 33}
BAR = BEAT * 4
def prog_at(t):
    if t < 17.8: return ['Dm', 'Bb', 'F', 'C'][int(t // BAR) % 4]
    if t < 26.44: return 'Dm'
    if t < 33.6: return ['F', 'C', 'Dm', 'Bb'][int((t - 28.4) // BAR) % 4]
    if t < 44.6: return ['Bb', 'F', 'C', 'Gm'][int((t - 33.6) // BAR) % 4]
    if t < 48.4: return ['Dm', 'Bb', 'F', 'C'][int((t - 44.6) // 0.95) % 4]
    return ['Dm', 'Bb', 'F', 'A'][int((t - 48.4) // BAR) % 4]
# pads
t = 0.0
while t < DUR:
    c = prog_at(t); sec = min(BAR + 0.5, DUR - t)
    if 26.44 <= t < 28.4: t += BAR; continue          # silence after the last halving
    g = 0.09
    if 12.6 <= t < 20.4: g = 0.1
    if 20.4 <= t < 26.4: g = 0.05
    if 33.6 <= t < 44.6: g = 0.12
    if 44.6 <= t < 48.4: g = 0.15
    place('music', pad(CH[c], sec, 1300 if t < 17.8 else 2200), t, g, 0, send=0.5)
    t += BAR
place('music', pad(CH['F'], 2.0, 1800), 26.45, 0.1, send=0.7)  # soft swell under "exactly 1"
# pluck arpeggio in the watch sections
ARP = [0, 2, 3, 4, 3, 2, 1, 2]
for k in range(int(DUR / (BEAT / 2))):
    t = k * BEAT / 2
    if not (2.6 <= t < 12.6 or 28.4 <= t < 33.6 or 48.4 <= t < 55.0): continue
    c = CH[prog_at(t)]; m = c[ARP[k % 8]] + 12
    place('music', pluck(m, 0.8), t, 0.06 if t < 12.6 else 0.07, pan=0.35 * np.sin(k * 1.3), send=0.4)
# bass
for k in range(int(DUR / BEAT)):
    t = k * BEAT
    if t < 2.6 or 20.4 <= t < 28.4 or 33.6 <= t < 36.2: continue
    g = 0.16 if 44.6 <= t < 48.4 else 0.1 if 12.6 <= t < 20.4 else 0.12
    place('music', bass(ROOT[prog_at(t)], BEAT * 0.95), t, g)
# drums: kick on the watch ticks, groove when the tick resolves, big slow hits under the dinosaur
for k in range(int(DUR / BEAT)):
    t = k * BEAT
    if 2.6 <= t < 12.6 and k % 2 == 1: place('drums', kick(0.6), t, 0.45)
    if 28.4 <= t < 33.6 or 48.4 <= t < 51.0:
        if k % 2 == 1: place('drums', kick(1.0), t, 0.6)
        place('drums', hat(), t + BEAT / 2, 0.12, pan=0.3)
        if k % 4 == 3: place('drums', snare(), t, 0.25, send=0.3)
    if 38.0 <= t < 44.6 and k % 2 == 1: place('drums', kick(0.8), t, 0.4)
    if 41.6 <= t < 44.6: place('drums', hat(0.04), t + BEAT / 4, 0.08, pan=-0.3); place('drums', hat(), t + BEAT / 2, 0.1, pan=0.3)
for t in np.arange(44.6, 48.4, 0.95): place('drums', impact(1.2) * 0.6, t, 0.35, send=0.4)  # footsteps
# snare build into the atom twist
k = 0; t = 32.1
while t < 33.6:
    place('drums', snare(), t, 0.1 + 0.22 * (t - 32.1) / 1.5, send=0.3); t += max(0.06, BEAT / 2 * (1 - (t - 32.1) / 1.5) + 0.05)

# ---------------- the watch ticks ----------------
for n in range(0, 56):
    tk = n + 0.5
    if tk >= DUR: break
    if tk < 2.6 or 28.4 <= tk < 33.6 or 48.4 <= tk < DUR:
        big = 1.0 if 28.4 <= tk < 31.0 else 0.35
        place('sfx', tock(big), tk, 0.42 if big < 1 else 0.6, pan=0.1, send=0.25)
    elif 2.6 <= tk < 12.6:
        place('sfx', tock(0.2), tk, 0.18, pan=0.1, send=0.2)

# ---------------- sound design ----------------
for c in TL['CUTS']:
    place('sfx', thump(), c, 0.3); place('sfx', hp(noise(0.25), 2500) * np.exp(-tt(0.25) / 0.05), c - 0.05, 0.05, send=0.3)
place('sfx', bell(86, 2.4), 0.0, 0.07, send=0.6); place('sfx', bell(93, 2.4), 0.1, 0.05, pan=0.3, send=0.6)
place('sfx', fade(sweep(1.2, 300, 2500, 0.4, 0.8), 0.4, 0.05), 1.5, 0.18, send=0.3)                    # riser into the flip
place('sfx', fade(sweep(1.0, 600, 3000, 0.5), 0.1, 0.3), EV['flipT0'], 0.2, send=0.2)                   # flip whoosh
place('sfx', thump(), EV['flipT1'], 0.45)                                                                # lands face-down
for i in range(3): place('sfx', metal_click(), EV['backPop'] + i * 0.09, 0.18, pan=0.2, send=0.4)       # unscrew
place('sfx', fade(sweep(0.6, 1200, 6000, 0.4, 0.6), 0.02, 0.2), EV['backFly'], 0.3, pan=0.4, send=0.3)   # back flies off
for i in range(6): place('sfx', bell(84 + (i * 5) % 12, 1.4), EV['explode0'] + i * 0.22, 0.05, pan=np.sin(i) * 0.6, send=0.6)
place('sfx', fade(sweep(1.8, 400, 4000, 0.4, 0.7), 0.3, 0.2), 7.6, 0.22, send=0.3)                      # dive to the can
place('sfx', fade(lp(noise(0.9), 3000) * 0.6 + bp(noise(0.9), 2500, 7000) * 0.4, 0.05, 0.2), EV['shell0'], 0.14, pan=0.3)  # shell slides
place('sfx', bell(98, 2.0), EV['shell1'], 0.06, send=0.7); place('sfx', bell(105, 2.0), EV['shell1'] + 0.08, 0.04, pan=-0.3, send=0.7)
# the fork: zaps in time with the slow-motion bending, then a glassy ring that rises as the counter runs
for k in range(6):
    tz = EV['zap0'] + k / 2.3 - 0.02
    if tz < 15.2: place('sfx', zap(0.3), tz, 0.22, pan=np.sin(k) * 0.4, send=0.3)
tr = tt(5.2); ring = (np.sin(2 * np.pi * (3200 + 30 * np.sin(2 * np.pi * 6 * tr)) * tr) * 0.6 + np.sin(2 * np.pi * 6400 * tr) * 0.15)
ring *= np.minimum(1, tr / 0.6) * (0.4 + 0.6 * np.clip((tr - 2.6) / 1.0, 0, 1))
place('sfx', fade(ring, 0.3, 0.4), 12.6, 0.035, send=0.5)
place('sfx', fade(sweep(1.0, 500, 9000, 0.3, 0.8), 0.05, 0.02), EV['count0'], 0.22, send=0.3)
place('sfx', bell(93, 2.4), EV['count1'], 0.1, send=0.6); place('sfx', impact(1.5) * 0.4, EV['count1'], 0.3, send=0.4)
# chip: digital bed, then the literal octave-drop cascade
tb = tt(2.4); bed = bp(noise(2.4), 4000, 12000) * (0.5 + 0.5 * (np.sin(2 * np.pi * 7 * tb) > 0)) * 0.3
place('sfx', fade(bed, 0.3, 0.3), 17.8, 0.12, send=0.2)
def tone(f, sec):
    t = tt(sec)
    if f >= 20:
        x = np.sin(2 * np.pi * f * t)
        for h in (3, 5):
            if f * h < 18000: x += np.sin(2 * np.pi * f * h * t) / (h * 1.6)
        g = 0.5 if f > 6000 else 1.0
        return x * g * np.minimum(1, t / 0.005)
    # below 20 Hz: a click train at f pulses per second
    x = np.zeros(len(t)); per = 1.0 / f
    for k in range(int(sec / per) + 1):
        i = int(k * per * SR)
        if i < len(x):
            c = tock(0.5)[:len(x) - i]; x[i:i + len(c)] += c
    return x
for k in range(1, 16):
    f = 32768 / 2 ** k; t0 = HALF_T[k - 1]; t1 = HALF_T[k] if k < 15 else t0 + 0.55
    sec = t1 - t0
    if k == 15: break
    x = fade(tone(f, sec + 0.02), 0.004, 0.012)
    gain = 0.07 if f > 6000 else 0.11 if f > 300 else 0.16 if f >= 20 else 0.3
    place('sfx', x, t0, gain, send=0.2)
    place('sfx', thump() * 0.6, t0, 0.2); place('sfx', bell(84 - k * 2, 0.5) * 0.6, t0, 0.05, pan=0.3, send=0.4)
place('sfx', fade(sweep(5.9, 200, 6000, 0.3, 0.7), 0.5, 0.05), 20.55, 0.13, send=0.3)                  # riser under the cascade
place('sfx', impact(), HALF_T[14], 0.6, send=0.6)                                                       # "1"
place('sfx', tock(1.0), HALF_T[14], 0.55, send=0.5)
arr = HALF_T[14] + (22 - 2.6) / 34
place('sfx', tock(1.0), arr, 0.5, send=0.5); place('sfx', bell(74, 2.5), arr, 0.08, send=0.7)          # pulse reaches the coil
# motor + gears on the payoff ticks
for tk in (28.5, 29.5, 30.5):
    place('sfx', zap(0.18), tk - 0.01, 0.12, send=0.2)
    for i in range(4): place('sfx', metal_click() * 0.5, tk + 0.03 + i * 0.025, 0.1, pan=0.3, send=0.2)
# atom: lab hum, laser shimmer, rapid count, 1967 bell, the two tosses
tl = tt(11.0); hum = lp(noise(11.0), 160) * 1.6 + np.sin(2 * np.pi * 60 * tl) * 0.25 + np.sin(2 * np.pi * 120 * tl) * 0.1
place('sfx', fade(hum, 0.2, 0.6), 33.6, 0.12, send=0.2)
place('sfx', fade(bp(noise(11.0), 5000, 11000) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * tl)), 0.4, 0.6), 33.6, 0.025, pan=-0.3, send=0.3)
place('sfx', impact(), 33.6, 0.45, send=0.6)
for i in range(60):
    u = i / 60; tc = EV['atomCount0'] + (EV['atomCount1'] - EV['atomCount0']) * (u ** 0.6)
    place('sfx', tock(0.0)[:2400] * 0.5, tc, 0.08 + 0.05 * u, pan=np.sin(i * 2.1) * 0.5, send=0.2)
place('sfx', bell(81, 3.0), EV['atomCount1'], 0.12, send=0.7); place('sfx', bell(88, 3.0), EV['atomCount1'] + 0.06, 0.07, pan=0.3, send=0.7)
place('sfx', bell(77, 3.0), 39.15, 0.1, send=0.7)
for t0 in (39.25, 42.0):
    place('sfx', fade(sweep(0.8, 300, 3000, 0.4, 0.8), 0.05, 0.05), t0, 0.2, send=0.3)
    place('sfx', fade(sweep(0.8, 3000, 300, 0.4, 1.2), 0.05, 0.2), t0 + 0.8, 0.16, send=0.3)
    place('sfx', zap(0.25), t0 - 0.05, 0.08, send=0.3)
# dinosaur era: wind, the years counter rush, the "< 1 s" tick
place('sfx', fade(lp(noise(3.9), 700) * 1.2, 0.3, 0.5), 44.6, 0.1, send=0.3)
place('sfx', fade(sweep(1.15, 300, 7000, 0.3, 0.6), 0.05, 0.02), EV['years0'], 0.2, send=0.3)
place('sfx', impact(), EV['years1'], 0.4, send=0.6)
place('sfx', tock(1.0), 46.65, 0.55, send=0.6); place('sfx', bell(86, 3.0), 46.7, 0.08, send=0.7)
# end
place('sfx', bell(86, 3.0), 51.25, 0.09, send=0.7); place('sfx', bell(81, 3.0), 51.35, 0.06, pan=-0.3, send=0.7)

# ---------------- mix ----------------
ir_t = tt(2.2); ir = noise(2.2) * np.exp(-ir_t / 0.5); ir = np.stack([lp(ir, 5000), lp(np.roll(ir, 311), 5000)], 1) * 0.02
rev = np.stack([signal.fftconvolve(MIX['send'][:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = MIX['music'] * 0.9 + MIX['drums'] * 0.8 + MIX['sfx'] + rev * 0.9
mix = hp(mix, 28, 2)
rms = np.sqrt(np.mean(mix ** 2)); mix *= 10 ** (-16.5 / 20) / max(rms, 1e-9)
lim = 10 ** (-1.2 / 20)
def soft(x): return np.where(np.abs(x) < lim * 0.7, x, np.sign(x) * (lim * 0.7 + (lim * 0.3) * np.tanh((np.abs(x) - lim * 0.7) / (lim * 0.3))))
mix = soft(mix)
mix = fade(mix, 0.0, 0.2)
out = sys.argv[1] if len(sys.argv) > 1 else 'sound.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
print('peak dBFS %.2f  rms dBFS %.2f' % (20 * np.log10(np.max(np.abs(mix))), 20 * np.log10(np.sqrt(np.mean(mix ** 2)))))
sec = [20 * np.log10(np.sqrt(np.mean(mix[int(i * SR):int((i + 1) * SR)] ** 2)) + 1e-9) for i in range(int(DUR))]
print('per-second dB:', ' '.join('%d' % v for v in sec))
