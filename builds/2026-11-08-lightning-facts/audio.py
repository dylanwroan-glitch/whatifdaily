# audio.py — original synthesized score + sound design for "5 lightning facts, only 1 is true" (57.4 s, 48 kHz stereo)
# Everything is generated with numpy/scipy: no samples, no copied music. Timings come from timeline.json.
import numpy as np
from scipy import signal
import wave, sys, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
SR = 48000
DUR = TL['DURATION']
N = int(SR * DUR)
rng = np.random.default_rng(11)

def buf(): return np.zeros((N, 2), np.float32)
def place(dst, x, t0, gain=1.0, pan=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N: return
    if x.ndim == 1:
        l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l, x * r], 1) * np.sqrt(2)
    if i0 < 0: x = x[-i0:]; i0 = 0
    n = min(len(x), N - i0)
    dst[i0:i0 + n] += (x[:n] * gain).astype(np.float32)
def lp(x, fc, order=2): b, a = signal.butter(order, min(fc / (SR / 2), 0.99), 'low'); return signal.lfilter(b, a, x, axis=0)
def hp(x, fc, order=2): b, a = signal.butter(order, max(fc / (SR / 2), 1e-4), 'high'); return signal.lfilter(b, a, x, axis=0)
def bp(x, f1, f2, order=2): b, a = signal.butter(order, [f1 / (SR / 2), min(f2 / (SR / 2), 0.99)], 'band'); return signal.lfilter(b, a, x, axis=0)
def noise(sec): return rng.standard_normal(int(sec * SR))
def tt(sec): return np.arange(int(sec * SR)) / SR
def fade(x, a, r):
    n = len(x); e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return x * (e[:, None] if x.ndim == 2 else e)
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def saw(f, sec, harm=24, det=0.0):
    t = tt(sec); out = np.zeros(len(t)); ff = f * (1 + det)
    for k in range(1, harm + 1):
        if ff * k > 14000: break
        out += np.sin(2 * np.pi * ff * k * t + rng.uniform(0, 6.28)) / k
    return out
def pad(notes, sec, cut=1300, att=0.6, rel=0.8, amp=0.06):
    n = int(sec * SR); L = np.zeros(n); R = np.zeros(n)
    for m in notes:
        for d, side in ((-0.004, -1), (0.0, 0), (0.0045, 1)):
            v = saw(mtof(m), sec, 16, d)
            if side <= 0: L += v
            if side >= 0: R += v
    st = lp(np.stack([L, R], 1), cut, 2)
    return fade(st, att, rel) * amp / max(1, len(notes))
def pluck(m, sec=0.6, amp=0.2, bright=4000):
    t = tt(sec); f = mtof(m)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) * np.exp(-t * 10) + 0.3 * np.sin(6 * np.pi * f * t) * np.exp(-t * 16)
    return lp(x * np.exp(-t * 6) * np.minimum(1, t / 0.002), bright) * amp
def bell(f, sec=2.0, amp=0.2):
    t = tt(sec); x = np.zeros(len(t))
    for ratio, a, d in ((1, 1, 1.4), (2.76, 0.45, 2.8), (5.4, 0.22, 4.6), (8.93, 0.1, 7.0)):
        x += a * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * d)
    return x * np.minimum(1, t / 0.002) * amp
def reverb_ir(sec=2.6, decay=2.2):
    t = tt(sec); ir = np.stack([rng.standard_normal(len(t)) * np.exp(-t * decay), rng.standard_normal(len(t)) * np.exp(-t * decay)], 1)
    ir = lp(ir, 6000); ir[:int(0.012 * SR)] = 0; return ir / np.sqrt((ir ** 2).sum())
def reverb(x, wet, ir):
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:N] for c in range(2)], 1)
    return x * (1 - wet * 0.5) + y * wet * 3.0

music = buf(); sfx = buf(); amb = buf()
shots = {s['name']: s for s in TL['SHOTS']}
def span(a, b): return shots[a]['t0'], shots[b]['t1']

# ------------------------- AMBIENCE -------------------------
def rain(sec, amp=0.05, bright=7000):
    x = bp(noise(sec), 900, bright) * amp
    drops = np.zeros(len(x))
    for k in range(int(sec * 140)):
        i = rng.integers(0, len(drops) - 300); drops[i:i + 200] += rng.standard_normal(200) * np.exp(-np.arange(200) / 30) * rng.uniform(0.2, 1)
    return x + hp(drops, 2500) * amp * 0.9
def wind(sec, amp=0.05):
    x = lp(noise(sec), 450); t = tt(sec)
    return x * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t) * np.sin(2 * np.pi * 0.037 * t + 1)) * amp
def crickets(sec, amp=0.045):
    t = tt(sec); x = np.zeros(len(t))
    for c in range(5):
        f = rng.uniform(4300, 5200); rate = rng.uniform(2.2, 3.4); ph = rng.uniform(0, 1)
        gate = (np.sin(2 * np.pi * (rate * t + ph)) > 0.55).astype(float)
        trill = 0.5 + 0.5 * np.sin(2 * np.pi * 38 * t)
        x += np.sin(2 * np.pi * f * t) * lp(gate, 60) * trill * rng.uniform(0.4, 1)
    return x * amp
t0, t1 = span('H_hook', 'T1c'); place(amb, fade(np.stack([rain(t1 - t0, 0.042), rain(t1 - t0, 0.042)], 1), 0.01, 0.15), t0)
t0, t1 = span('C2a', 'C2c'); place(amb, fade(np.stack([rain(t1 - t0, 0.065, 8000), rain(t1 - t0, 0.065, 8000)], 1), 0.05, 0.15), t0)
t0, t1 = span('F3a', 'F3c'); place(amb, fade(np.stack([wind(t1 - t0, 0.06), wind(t1 - t0, 0.055)], 1), 0.1, 0.2), t0)
t0, t1 = span('F4a', 'F4c'); place(amb, fade(np.stack([crickets(t1 - t0), crickets(t1 - t0)], 1), 0.15, 0.2), t0)
t0, t1 = span('S5a', 'S5b'); place(amb, fade(np.stack([rain(t1 - t0, 0.025), rain(t1 - t0, 0.025)], 1), 0.1, 0.2), t0)
t0, t1 = span('W6a', 'W6a'); place(amb, fade(lp(np.stack([rain(t1 - t0, 0.05), rain(t1 - t0, 0.05)], 1), 2200), 0.1, 0.1), t0)  # rain on the window, muffled
t0, t1 = span('W6b', 'W6b'); place(amb, fade(np.stack([wind(t1 - t0, 0.05), wind(t1 - t0, 0.05)], 1), 0.1, 0.1), t0)
t0, t1 = span('E_end', 'E_end'); place(amb, fade(np.stack([rain(t1 - t0, 0.06), rain(t1 - t0, 0.06)], 1), 0.05, 0.6), t0)
# car engine until the strike, electric buzz while the frame carries the current
t0 = shots['C2a']['t0']; d = 14.7 - t0; t = tt(d)
eng = lp(saw(38, d, 12) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t)), 400) * 0.05 + lp(noise(d), 200) * 0.03
place(amb, fade(eng, 0.3, 0.05), t0, 1.0, 0.1)
d = 21.2 - 14.75; t = tt(d)
buzz = (np.sin(2 * np.pi * 120 * t) + 0.5 * np.sin(2 * np.pi * 240 * t) + 0.3 * np.sign(np.sin(2 * np.pi * 60 * t))) * 0.035
crk = np.zeros(len(t))
for k in range(int(d * 60)):
    i = rng.integers(0, len(crk) - 900); ln = rng.integers(80, 800); crk[i:i + ln] += rng.standard_normal(ln) * np.exp(-np.arange(ln) / (ln / 5)) * rng.uniform(0.2, 1)
el = (lp(buzz, 2000) + hp(crk, 1800) * 0.07) * np.exp(-np.maximum(0, t - 3.2) / 2.5)
place(sfx, fade(el, 0.05, 0.4), 14.75, 1.0, 0.0)

# ------------------------- THUNDER -------------------------
def crack(amp=0.8):
    sec = 0.6; t = tt(sec)
    x = hp(noise(sec), 900) * np.exp(-t / 0.035) + bp(noise(sec), 200, 3000) * np.exp(-t / 0.12) * 0.6
    sub = np.sin(2 * np.pi * np.cumsum(32 + 50 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.5) * 0.9
    return (x + sub) * amp
def rumble(sec=3.0, amp=0.5, cut=400):
    t = tt(sec); x = lp(noise(sec), cut, 3)
    mod = np.clip(lp(np.abs(noise(sec)) * 3, 5), 0, None); mod /= (mod.max() + 1e-9)
    env = (1 - np.exp(-t / 0.08)) * np.exp(-t / (sec * 0.33))
    return x * (0.35 + 0.65 * mod) * env * amp * 3.0
def thunder(kind, t0):
    if kind == 'close':
        place(sfx, crack(0.75), t0, 1.0, rng.uniform(-0.2, 0.2))
        place(sfx, np.stack([rumble(3.2, 0.45), rumble(3.2, 0.45)], 1), t0 + 0.05)
    elif kind == 'mid':
        place(sfx, lp(crack(0.45), 2500), t0 + 0.12)
        place(sfx, np.stack([rumble(3.0, 0.4, 300), rumble(3.0, 0.4, 300)], 1), t0 + 0.15)
    elif kind == 'far':
        place(sfx, np.stack([rumble(3.5, 0.28, 220), rumble(3.5, 0.28, 220)], 1), t0 + 0.6)
    elif kind == 'tick':
        place(sfx, hp(crack(0.22), 1500), t0, 1.0, rng.uniform(-0.5, 0.5))
        place(sfx, lp(crack(0.25), 180), t0)
for s in TL['STRIKES']:
    k = s['thunder']
    if k == 'delayed':
        boom = np.stack([rumble(3.4, 0.6, 260), rumble(3.4, 0.6, 260)], 1)
        place(sfx, lp(crack(0.6), 900), s['t'] + s['delay'])
        place(sfx, boom, s['t'] + s['delay'] + 0.03, 0.9 if s['t'] < 50 else 0.55)
        # window rattle indoors for the first one
        if s['t'] < 50:
            t = tt(0.8); rat = bp(noise(0.8), 300, 1400) * (np.sin(2 * np.pi * 23 * t) > 0.3) * np.exp(-t / 0.25) * 0.08
            place(sfx, rat, s['t'] + s['delay'] + 0.08)
    elif k != 'none':
        thunder(k, s['t'])
# the bolt from the blue lands on a quiet sunny scene: extra-hard crack
place(sfx, crack(0.5), 23.5, 1.0, 0.3)
# heat lightning: silent flashes, only a faint electric shimmer in the music bed (no thunder on purpose)
# sound waves in the aerial shot: soft, fading thumps as each ring spreads
for i, t0 in enumerate((35.7, 36.25, 36.8)):
    place(sfx, np.stack([rumble(1.8, 0.22 * (0.8 ** i), 200)] * 2, 1), t0)

# ------------------------- MUSIC -------------------------
BPM = 120; beat = 60 / BPM
def bass_line(t0, t1, root, amp=0.075):
    x = t0
    while x < t1 - 0.05:
        d = beat / 2 * 0.9; t = tt(d); f = mtof(root)
        raw = saw(f, d, 10); v = (lp(raw, 650) + (lp(raw, 2400) - lp(raw, 650)) * np.exp(-t / 0.05)) * np.exp(-t / 0.18) * amp
        place(music, v, x); x += beat / 2
def arp(t0, t1, notes, amp=0.05, step=0.25):
    x = t0; k = 0
    while x < t1 - 0.05:
        place(music, pluck(notes[k % len(notes)], 0.5, amp), x, 1.0, -0.35 if k % 2 else 0.35); x += step; k += 1
# hook + claim 1: D minor
place(music, pad([50, 53, 57, 62], 12.6, 1200, 0.02, 0.4, 0.12), 0.0)
bass_line(0.0, 12.4, 38); arp(3.6, 12.3, [62, 65, 69, 74, 69, 65], 0.04)
# claim 2: Bb
place(music, pad([46, 53, 58, 62], 8.9, 1200, 0.05, 0.4, 0.15), 12.4); bass_line(12.4, 21.2, 34, 0.085); arp(15.0, 21.1, [58, 62, 65, 70, 65, 62], 0.05)
# claim 3: G minor, lighter (daylight)
place(music, pad([43, 50, 55, 58, 62], 8.9, 1500, 0.05, 0.4, 0.16), 21.2); bass_line(23.5, 30.0, 31, 0.085); arp(21.2, 29.9, [67, 70, 74, 79, 74, 70], 0.05)
# claim 4: Bb -> A (tension), sparse, night
place(music, pad([46, 53, 58, 62], 5.4, 1100, 0.3, 0.5, 0.17), 30.0); place(music, pad([45, 52, 57, 61, 64], 3.6, 1100, 0.3, 0.3, 0.17), 35.3); bass_line(32.3, 38.7, 34, 0.05)
arp(30.0, 38.7, [70, 74, 77, 74], 0.04, 0.5)
# claim 5: dominant pedal + riser into TRUE, then the music drops out for a beat
place(music, pad([45, 52, 57, 61, 64], 2.3, 1600, 0.1, 0.05, 0.12), 38.8); bass_line(38.8, 41.0, 33, 0.08)
t = tt(2.3); riser = bp(noise(2.3), 500, 7000) * (t / 2.3) ** 2.5 * 0.07 + np.sin(2 * np.pi * np.cumsum(220 + 600 * (t / 2.3) ** 2) / SR) * (t / 2.3) ** 3 * 0.035
place(music, riser, 38.8)
# TRUE: bright D major, wide
place(music, pad([50, 54, 57, 62, 66, 69], 6.6, 2600, 0.02, 1.2, 0.17), 41.15); bass_line(41.15, 47.5, 38, 0.07)
arp(41.6, 47.4, [74, 78, 81, 86, 81, 78], 0.045, 0.125)
place(music, bell(mtof(86), 2.5, 0.08), 41.12); place(music, bell(mtof(81), 2.5, 0.06), 41.14, 1.0, 0.4)
# bonus: near silence while counting, resolution at the thunder
place(music, pad([38, 45, 50], 2.7, 600, 0.4, 0.3, 0.11), 47.6)
place(music, pad([41, 48, 53, 57, 60], 4.3, 1500, 0.02, 0.6, 0.13), 50.3); arp(50.4, 54.3, [65, 69, 72, 77, 72, 69], 0.035)
# end: D minor resolution
place(music, pad([38, 50, 53, 57, 62], 3.2, 1300, 0.05, 1.2, 0.13), 54.4); bass_line(54.4, 56.6, 38, 0.06)
place(music, bell(mtof(74), 3.0, 0.07), 54.62)

# ------------------------- UI SOUNDS -------------------------
def whoosh(sec=0.6, amp=0.1, f1=400, f2=4000, rev=False):
    t = tt(sec); e = np.sin(np.pi * t / sec) ** 2; x = bp(noise(sec), f1, f2) * e * amp
    return x[::-1] if rev else x
def thud(f=60, sec=0.5, amp=0.5):
    t = tt(sec); return np.sin(2 * np.pi * np.cumsum(f + 60 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.12) * amp
def buzzer(sec=0.38, amp=0.08):
    t = tt(sec); x = saw(mtof(50), sec, 18) + saw(mtof(51), sec, 18)   # clashing semitone
    return lp(x, 1800) * np.minimum(1, t / 0.005) * np.exp(-t / 0.22) * amp
def tick(amp=0.12):
    t = tt(0.03); return hp(noise(0.03), 3000) * np.exp(-t * 180) * amp
# whoosh into every cut
for s in TL['SHOTS'][1:]:
    place(sfx, whoosh(0.5, 0.06, rev=True), s['t0'] - 0.45, 1.0, 0.0)
# claim cards: a tick-tock "guess" clock while each claim is on screen
for c0, (ts, v) in zip([3.65, 12.45, 21.25, 30.05, 38.85], TL['STAMPS']):
    x = c0 + 0.1; k = 0
    while x < ts - 0.15:
        place(sfx, tick(0.09 if k % 2 == 0 else 0.06), x, 1.0, -0.3 if k % 2 else 0.3); x += beat; k += 1
    place(sfx, whoosh(0.35, 0.09, 800, 6000, rev=True), ts - 0.35)
    place(sfx, thud(55, 0.6, 0.55), ts)
    if v == 'MYTH': place(sfx, buzzer(), ts + 0.01)
    else:
        for i, m in enumerate((74, 78, 81, 86)): place(sfx, bell(mtof(m), 1.6, 0.06), ts + 0.012 * i, 1.0, -0.3 + 0.2 * i)
# counters
for x in TL['COUNT2']: place(sfx, tick(0.1), x)
for i, x in enumerate(TL['COUNT_W']):
    place(sfx, bell(mtof(81 + (i == 4) * 5), 0.5, 0.06), x)
    place(sfx, tick(0.12), x)
# temperature counter: rising tone + sizzle
d = 43.3 - 41.75; t = tt(d)
place(sfx, np.sin(2 * np.pi * np.cumsum(260 + 1200 * (t / d) ** 1.6) / SR) * 0.03 * np.minimum(1, t / 0.05) + hp(noise(d), 4000) * 0.012 * (t / d), 41.75)
# the sun: deep warm swell
d = 3.3; t = tt(d); place(sfx, fade(lp(noise(d), 160) * 0.25 + np.sin(2 * np.pi * 41 * t) * 0.05, 0.4, 0.6), 44.3)
# title hit at frame 1 + ding when the "guess" chip appears
place(sfx, thud(48, 0.7, 0.4), 0.0); place(sfx, bell(mtof(86), 1.2, 0.05), 0.9)
# labels in the aerial shots
for x in (27.5, 37.1, 51.4): place(sfx, bell(mtof(88), 0.9, 0.04), x)
# end card
place(sfx, whoosh(0.6, 0.08, 300, 5000, rev=True), 54.0)

# ------------------------- MIX -------------------------
ir = reverb_ir(2.8, 2.0)
music = reverb(music, 0.35, ir); sfx_w = reverb(sfx, 0.16, ir)
mix = music * 0.85 + sfx_w + amb
endf = np.ones(N); i0 = int((DUR - 0.5) * SR); endf[i0:] = np.linspace(1, 0.25, N - i0)
mix *= endf[:, None]
mix = hp(mix, 28)
# slow leveler: halve the loudness swings between quiet and stormy sections
env = np.sqrt(np.clip(lp((mix ** 2).mean(1), 1.5, 2), 1e-10, None)); ref = np.median(env)
mix *= np.clip((ref / env) ** 0.45, 0.6, 2.2)[:, None]
rms = np.sqrt(np.mean(mix ** 2)); mix *= 10 ** (-16.5 / 20) / (rms + 1e-9)
k = 0.7; a = np.abs(mix); over = a > k
mix[over] = np.sign(mix[over]) * (k + (0.89 - k) * np.tanh((a[over] - k) / (0.89 - k)))
# true-peak limiter (4x oversampled, 2 ms look-ahead) so AAC encoding doesn't overshoot to 0 dBFS
from scipy.signal import resample_poly
from scipy.ndimage import minimum_filter1d, uniform_filter1d
mix = lp(mix, 15500, 4)
for _ in range(3):
    up = resample_poly(mix, 4, 1, axis=0)
    pk = np.abs(up).max(1)[:len(mix) * 4].reshape(-1, 4).max(1)
    g = np.minimum(1.0, 10 ** (-3.0 / 20) / np.maximum(pk, 1e-9))
    g = minimum_filter1d(g, size=int(0.004 * SR) + 1)
    g = uniform_filter1d(g, size=int(0.002 * SR) + 1)
    mix = mix * g[:, None]
out = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'sound.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
o = out / 32767.0
print('wrote', len(out) / SR, 's  rms', round(20 * np.log10(np.sqrt(np.mean(o ** 2)) + 1e-9), 2), 'dBFS  peak', round(20 * np.log10(np.abs(o).max() + 1e-9), 2), 'dBFS')
sec = [round(20 * np.log10(np.sqrt(np.mean(o[int(i * SR):int((i + 1) * SR)] ** 2)) + 1e-9), 1) for i in range(int(DUR))]
print('per-second dB:', sec)
