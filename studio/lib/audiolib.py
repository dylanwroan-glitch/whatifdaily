# audiolib.py — shared sound toolkit for the studio: synthesized instruments and effects (numpy/scipy, no samples),
# a voice chain for narration, music ducking under the voice, and loudness mastering for Shorts (about -14 LUFS, -1.5 dBTP).
import numpy as np, wave
from scipy import signal
from math import gcd

SR = 48000
_rng = np.random.default_rng(7)
def seed(s): global _rng; _rng = np.random.default_rng(s)
def tt(sec): return np.arange(int(sec * SR)) / SR
def noise(sec): return _rng.standard_normal(int(sec * SR))
def nz(n): return _rng.standard_normal(n)
def lp(x, fc, order=2): b, a = signal.butter(order, min(fc / (SR / 2), 0.99), 'low'); return signal.lfilter(b, a, x, axis=0)
def hp(x, fc, order=2): b, a = signal.butter(order, max(fc / (SR / 2), 1e-4), 'high'); return signal.lfilter(b, a, x, axis=0)
def bp(x, f1, f2, order=2): b, a = signal.butter(order, [max(f1, 20) / (SR / 2), min(f2 / (SR / 2), 0.99)], 'band'); return signal.lfilter(b, a, x, axis=0)
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def db(x): return 10 ** (x / 20)
def fade(x, a, r):
    n = len(x); e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return x * (e[:, None] if x.ndim == 2 else e)
def peq(x, f0, gain_db, q=1.0):  # RBJ peaking EQ
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)
def shelf(x, f0, gain_db, high=True):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / 2 * np.sqrt(2); c = np.cos(w); s = 2 * np.sqrt(A) * al
    if high: b = [A * ((A + 1) + (A - 1) * c + s), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - s)]; a = [(A + 1) - (A - 1) * c + s, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - s]
    else: b = [A * ((A + 1) - (A - 1) * c + s), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - s)]; a = [(A + 1) + (A - 1) * c + s, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - s]
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)

# ---------------- files ----------------
def load_wav(path, sr=SR):
    w = wave.open(path); r = w.getframerate(); ch = w.getnchannels(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
    x = x.reshape(-1, ch).mean(1) if ch > 1 else x
    if r != sr: g = gcd(r, sr); x = signal.resample_poly(x, sr // g, r // g)
    return x
def save_wav(path, x, sr=SR):
    x = np.asarray(x); x = np.stack([x, x], 1) if x.ndim == 1 else x
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())

# ---------------- buses ----------------
class Bus:
    def __init__(self, dur): self.n = int(dur * SR); self.x = np.zeros((self.n, 2))
    def place(self, sig, t0, gain=1.0, pan=0.0):
        i0 = int(round(t0 * SR)); sig = np.asarray(sig, dtype=np.float64)
        if sig.ndim == 1: l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4); sig = np.stack([sig * l, sig * r], 1) * np.sqrt(2)
        if i0 < 0: sig = sig[-i0:]; i0 = 0
        if i0 >= self.n or len(sig) == 0: return
        m = min(len(sig), self.n - i0); self.x[i0:i0 + m] += sig[:m] * gain

def rms_env(x, win=0.05, attack=0.02, release=0.3):
    m = x.mean(1) if x.ndim == 2 else x; n = max(1, int(win * SR))
    e = np.sqrt(signal.fftconvolve(m ** 2, np.ones(n) / n, mode='same').clip(0))
    out = np.zeros_like(e); a = np.exp(-1 / (attack * SR)); r = np.exp(-1 / (release * SR)); v = 0.0
    # fast follower via block processing (vectorized enough for 1-minute clips)
    step = 64
    for i in range(0, len(e), step):
        tgt = e[i:i + step].max(); c = a if tgt > v else r; v = tgt + (v - tgt) * (c ** step); out[i:i + step] = v
    return out
def duck(music, voice, depth_db=-11.0, thresh=0.01, attack=0.04, release=0.45):
    env = rms_env(voice, 0.04, attack, release); k = np.clip(env / thresh, 0, 1) ** 0.7
    g = db(depth_db * k); return music * g[:, None]

def voice_chain(x):
    x = hp(x, 75, 2); x = peq(x, 280, -2.0, 0.9); x = peq(x, 3400, 2.2, 0.8); x = shelf(x, 9000, 1.5, True)
    # gentle RMS compressor: 3:1 above -22 dBFS
    env = rms_env(x, 0.03, 0.01, 0.15) + 1e-6; lvl = 20 * np.log10(env); over = np.clip(lvl - (-22), 0, None)
    x = x * db(-over * (1 - 1 / 3.0)); r = np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
    return x * db(-17) / r

def reverb(x, sec=1.6, decay=0.35, mix=0.12, tone=5000):
    ir_t = tt(sec); ir = noise(sec) * np.exp(-ir_t / decay); ir = lp(ir, tone); ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    x2 = x if x.ndim == 2 else np.stack([x, x], 1)
    wet = np.stack([signal.fftconvolve(x2[:, c], np.roll(ir, 211 * c))[:len(x2)] for c in range(2)], 1)
    return x2 * (1 - mix) + wet * mix

def master(mix, target_lufs=-14.0, ceiling_db=-1.5):
    import pyloudnorm as pyln
    mix = hp(mix, 30, 2); meter = pyln.Meter(SR); L = meter.integrated_loudness(mix)
    mix = mix * db(target_lufs - L)
    # lookahead limiter on 4x-oversampled peaks
    up = signal.resample_poly(mix, 4, 1, axis=0); pk = np.abs(up).max(1).reshape(-1, 4).max(1)[:len(mix)]
    ceil = db(ceiling_db); g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    la = int(0.005 * SR); from scipy.ndimage import minimum_filter1d, uniform_filter1d
    g = minimum_filter1d(g, size=2 * la + 1); g = uniform_filter1d(g, size=la); g = np.minimum(g, 1.0)
    out = mix * g[:, None]; out = np.clip(out, -ceil, ceil)
    return out, L, meter.integrated_loudness(out)

# ---------------- instruments ----------------
def saw(f, sec, det=0.0, harm=40):
    t = tt(sec); out = np.zeros(len(t)); ff = f * (1 + det)
    for k in range(1, harm + 1):
        if ff * k > 14000: break
        out += np.sin(2 * np.pi * ff * k * t + _rng.uniform(0, 6.28)) / k
    return out
def strings(notes, sec, bright=2200, att=0.6, rel=0.9):  # ensemble pad: detuned saws, slow attack, gentle vibrato
    x = np.zeros(int(sec * SR)); t = tt(sec)
    for m in notes:
        for d in (-0.006, -0.002, 0.003, 0.007):
            vib = 1 + 0.0025 * np.sin(2 * np.pi * (4.6 + _rng.uniform(-.4, .4)) * t + _rng.uniform(0, 6))
            f = mtof(m) * (1 + d); ph = 2 * np.pi * np.cumsum(f * vib) / SR
            x += sum(np.sin(k * ph) / k for k in range(1, 16) if f * k < 12000) * 0.25
    x = lp(x, bright, 2); x = peq(x, 900, 2, 0.7)
    return fade(x / max(len(notes), 1), min(att, sec * 0.4), min(rel, sec * 0.4))
def pad(notes, sec, bright=1800):
    x = np.zeros(int(sec * SR))
    for m in notes:
        for d in (-0.004, 0.0035): x += saw(mtof(m), sec, d, 18) * 0.5
    return fade(lp(x, bright, 2) / max(len(notes), 1), min(0.5, sec * 0.3), min(0.7, sec * 0.35))
def piano(m, sec=2.5, vel=1.0):
    f = mtof(m); t = tt(sec); inh = 0.0004
    x = sum(np.sin(2 * np.pi * f * k * np.sqrt(1 + inh * k * k) * t) * np.exp(-t * (1.2 + 0.9 * k)) / k ** 1.1 for k in range(1, 12))
    x += lp(nz(len(t)), 3000) * np.exp(-t / 0.004) * 0.05
    return x * np.minimum(1, t / 0.002) * vel
def pluck(m, sec=0.7, bright=1.0):
    f = mtof(m); t = tt(sec)
    x = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (3.5 + 2.2 * k) / bright) / k ** 1.3 for k in range(1, 8))
    return x * np.minimum(1, t / 0.003)
def marimba(m, sec=0.6):
    f = mtof(m); t = tt(sec)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.18) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.04) + 0.1 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / 0.01)) * np.minimum(1, t / 0.001)
def pizz(m, sec=0.5):
    f = mtof(m); t = tt(sec); x = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (8 + 3 * k)) / k for k in range(1, 9))
    return lp(x, 3500) * np.minimum(1, t / 0.002)
def musicbox(m, sec=2.0):
    f = mtof(m); t = tt(sec)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (sec * d)) for r, a, d in [(1, 1, 0.45), (4.0, 0.3, 0.12), (8.9, 0.12, 0.05)]) * np.minimum(1, t / 0.001)
def bell(m, sec=2.5):
    f = mtof(m); t = tt(sec)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (sec * d)) for r, a, d in [(1, 1, 0.5), (2.76, 0.45, 0.25), (5.4, 0.25, 0.12), (8.93, 0.12, 0.07)])
def bass(m, sec, cut=900):
    t = tt(sec); f = mtof(m); ph = 2 * np.pi * f * t
    x = np.tanh((np.sin(ph) + 0.3 * signal.sawtooth(ph)) * 1.4); return lp(x, cut) * np.minimum(1, t / 0.005) * np.minimum(1, (sec - t) / 0.03 + 0.001)
def kick(g=1.0):
    t = tt(0.45); f = 44 + 110 * np.exp(-t / 0.045); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t / 0.16) + 0.25 * lp(noise(0.45), 2000) * np.exp(-t / 0.006)) * g
def snare():
    t = tt(0.25); return bp(noise(0.25), 1500, 7000) * np.exp(-t / 0.06) * 0.8 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.5
def hat(sec=0.06): x = hp(noise(sec), 7000, 2); return x * np.exp(-tt(sec) / 0.018)
def clap():
    t = tt(0.3); x = np.zeros(len(t))
    for d in (0.0, 0.011, 0.023): i = int(d * SR); n = len(t) - i; x[i:] += bp(nz(n), 900, 5000) * np.exp(-np.arange(n) / SR / 0.012)
    return x * 0.8 + bp(noise(0.3), 1200, 6000) * np.exp(-t / 0.09) * 0.5
def k808(m, sec, glide=0.0):
    t = tt(sec); f = mtof(m) * (1 + glide * np.exp(-t / 0.06)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.tanh((np.sin(ph) + 0.25 * np.sin(2 * ph)) * 1.6); return x * np.minimum(1, t / 0.004) * np.exp(-t / (sec * 0.8))
def timpani(m=38, sec=2.2):
    t = tt(sec); f = mtof(m); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-t / 0.3)) * np.exp(-t / 0.7) + lp(noise(sec), 400) * np.exp(-t / 0.05) * 0.4

# ---------------- sound effects ----------------
def sweep(sec, f0, f1, q=0.5, curve=1.0):
    n = int(sec * SR); x = noise(sec); out = np.zeros(n); hop = 960; win = np.hanning(hop * 2)
    for i in range(0, n, hop):
        u = (i / n) ** curve; fc = f0 * (f1 / f0) ** u; seg = x[max(0, i - hop):i + hop]
        y = bp(seg, max(30, fc * (1 - q)), min(20000, fc * (1 + q)), 2); w = win[:len(y)] if len(y) == len(win) else np.hanning(len(y))
        a0 = max(0, i - hop); out[a0:a0 + len(y)] += y * w * 0.5
    return out
def whoosh(sec=0.45, up=True):
    x = sweep(sec, 300 if up else 4000, 4000 if up else 300, 0.6, 1.0); return x * np.sin(np.linspace(0, np.pi, len(x))) ** 1.5 * 1.6
def riser(sec, f0=200, f1=5000):
    x = sweep(sec, f0, f1, 0.35, 1.6); t = tt(sec); tone = np.sin(2 * np.pi * np.cumsum(f0 * 0.5 * (f1 / f0) ** (t / sec * 0.4)) / SR) * 0.3
    return (x + tone[:len(x)]) * np.linspace(0.05, 1.0, len(x)) ** 2
def impact(sec=2.6):
    t = tt(sec); sub = np.sin(2 * np.pi * (38 + 40 * np.exp(-t / 0.08)) * t) * np.exp(-t / 0.9)
    return sub + lp(noise(sec), 900) * np.exp(-t / 0.25) * 0.6 + hp(noise(sec), 3000) * np.exp(-t / 0.05) * 0.25
def braam(m=29, sec=2.8):  # cinematic brass-like hit: distorted low saw stack with a slow filter close
    t = tt(sec); x = np.zeros(len(t))
    for mm, a in ((m, 1.0), (m + 12, 0.6), (m + 19, 0.35)):
        for d in (-0.01, 0.0, 0.012): x += signal.sawtooth(2 * np.pi * mtof(mm) * (1 + d) * t) * a
    x = np.tanh(x * 0.6); env = np.minimum(1, t / 0.03) * np.exp(-t / 1.1)
    out = np.zeros_like(x); hop = 1200
    for i in range(0, len(x), hop): fc = 2600 * np.exp(-(i / SR) / 0.6) + 180; out[i:i + hop] = lp(x[max(0, i - 2400):i + hop], fc)[-len(x[i:i + hop]):]
    return out * env * 0.5
def thump():
    t = tt(0.3); return np.sin(2 * np.pi * (60 + 80 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.08)
def tick():
    t = tt(0.12); return hp(noise(0.12), 2500) * np.exp(-t / 0.003) * 0.7 + np.sin(2 * np.pi * 2100 * t) * np.exp(-t / 0.01) * 0.5
def ding(m=93):
    a = bell(m, 2.2); b = bell(m + 12, 1.2) * 0.3; a[:len(b)] += b; return a
def pop(f=1300):
    t = tt(0.08); return np.sin(2 * np.pi * f * (1 + 0.6 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.018)
def boing(f0=180, f1=520, sec=0.45):
    t = tt(sec); f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.05)) + 40 * np.sin(2 * np.pi * 14 * t) * np.exp(-t / 0.2); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.18) * np.minimum(1, t / 0.003)
def slide_whistle(f0, f1, sec=0.5):
    t = tt(sec); f = f0 * (f1 / f0) ** (t / sec); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.15 * np.sin(2 * ph)) * np.sin(np.linspace(0, np.pi, len(t))) ** 0.6 + bp(noise(sec), 1500, 4000) * 0.05
def swish(sec=0.2):
    x = bp(noise(sec), 2000, 9000) * np.sin(np.linspace(0, np.pi, int(sec * SR))) ** 2; return x
def heartbeat():
    t = tt(0.5); b = np.sin(2 * np.pi * 55 * t) * np.exp(-t / 0.05); x = b.copy(); i = int(0.17 * SR); x[i:] += b[:len(x) - i] * 0.7; return lp(x, 200)
def rain(sec, amt=1.0):
    x = bp(noise(sec), 400, 9000) * 0.5 + hp(noise(sec), 5000) * 0.3; n = len(x)
    for i in _rng.integers(0, max(1, n - 300), int(sec * 220 * amt)): L = int(_rng.uniform(0.002, 0.006) * SR); x[i:i + L] += hp(nz(L), 2000) * np.exp(-np.arange(L) / SR / 0.0015) * _rng.uniform(0.3, 1.2)
    return x * amt
def thunder(sec=4.0):
    t = tt(sec); x = lp(noise(sec), 300) * np.exp(-t / 1.2) * (1 + 0.6 * np.sin(2 * np.pi * 3 * t)) + lp(noise(sec), 1500) * np.exp(-t / 0.15) * 0.8
    return x * np.minimum(1, t / 0.02)
def room_tone(sec, lo=60, hi=900): return bp(noise(sec), lo, hi) * 0.15
def glitch(sec=0.25):
    n = int(sec * SR); x = np.zeros(n); i = 0
    while i < n:
        L = int(_rng.uniform(0.008, 0.04) * SR); f = _rng.uniform(200, 3000); tl = np.arange(L) / SR; m = max(0, min(L, n - i)); x[i:i + m] = (signal.square(2 * np.pi * f * tl) * _rng.uniform(0.2, 0.7))[:m]; i += L + int(_rng.uniform(0, 0.02) * SR)
    return x
