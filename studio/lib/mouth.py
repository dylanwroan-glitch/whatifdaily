# mouth.py — per-frame mouth openness (0..1) from each voice line, for cartoon lip-sync.
# usage: python3 mouth.py vo_dir out.json [fps]
import sys, os, json, wave, numpy as np
d, out = sys.argv[1], sys.argv[2]; fps = int(sys.argv[3]) if len(sys.argv) > 3 else 30
res = {}
for f in sorted(os.listdir(d)):
    if not f.endswith('.wav'): continue
    w = wave.open(os.path.join(d, f)); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    hop = sr // fps; n = len(x) // hop + 1; v = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2) + 1e-9) for i in range(n)])
    db = 20 * np.log10(v); o = np.clip((db + 42) / 26, 0, 1)            # -42 dB closed .. -16 dB wide open
    o = np.convolve(o, [0.25, 0.5, 0.25], mode='same')                   # soften the flapping a little
    res[f[:-4]] = [round(float(a), 3) for a in o]
json.dump(res, open(out, 'w')); print('lines', len(res))
