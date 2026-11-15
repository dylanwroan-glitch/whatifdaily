# limit.py — lookahead peak limiter for the retimed score: python3 limit.py in.wav out.wav [ceiling_dBFS]
import sys, wave, numpy as np
from scipy.ndimage import minimum_filter1d, uniform_filter1d
src, dst = sys.argv[1], sys.argv[2]; ceil = 10 ** (float(sys.argv[3]) / 20) if len(sys.argv) > 3 else 10 ** (-3.0 / 20)
w = wave.open(src); sr = w.getframerate(); ch = w.getnchannels(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, ch).astype(np.float64) / 32768.0
peak = np.abs(x).max(1); g = np.minimum(1.0, ceil / np.maximum(peak, 1e-9))
la = int(0.006 * sr); g = minimum_filter1d(g, size=2 * la + 1)          # look ahead and behind 6 ms
g = uniform_filter1d(g, size=la)                                            # smooth the gain changes
g = np.minimum(g, minimum_filter1d(np.minimum(1.0, ceil / np.maximum(peak, 1e-9)), size=3))
y = x * g[:, None]
y = np.clip(y, -ceil, ceil)
nf = int(0.015 * sr); y[:nf] *= (np.linspace(0, 1, nf) ** 2)[:, None]  # 15 ms fade-in so the encoder doesn't overshoot on the first hit
with wave.open(dst, 'wb') as o:
    o.setnchannels(ch); o.setsampwidth(2); o.setframerate(sr); o.writeframes((y * 32767).astype(np.int16).tobytes())
print('in peak %.2f dB  out peak %.2f dB  rms %.2f dB  min gain %.2f dB' % (20 * np.log10(peak.max()), 20 * np.log10(np.abs(y).max()), 20 * np.log10(np.sqrt((y ** 2).mean())), 20 * np.log10(g.min())))
