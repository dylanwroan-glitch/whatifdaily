# align.py — transcribe narration with Whisper small (local, CPU) and return word timestamps.
# Two jobs: (1) QC: does the voice say the script (catches garbled or mispronounced words)?
#           (2) captions: word-level start/end times for word-synced subtitles.
# usage: python3 align.py audio.wav [script.txt] > words.json
import sys, json, re, difflib
from faster_whisper import WhisperModel
import numpy as np, wave
from scipy.signal import resample_poly

audio = sys.argv[1]; script = open(sys.argv[2]).read() if len(sys.argv) > 2 else None
def load16k(path):
    w = wave.open(path); sr = w.getframerate(); ch = w.getnchannels(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    if ch > 1: x = x.reshape(-1, ch).mean(1)
    from math import gcd
    g = gcd(sr, 16000); return resample_poly(x, 16000 // g, sr // g).astype(np.float32)
model = WhisperModel('/home/claude/tools/asr/whisper-small', device='cpu', compute_type='int8', cpu_threads=2)
segs, info = model.transcribe(load16k(audio), language='en', word_timestamps=True, beam_size=5, vad_filter=False,
                              initial_prompt=script[:400] if script else None)
words = []
for s in segs:
    for w in s.words: words.append({'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3), 'p': round(w.probability, 3)})
out = {'words': words, 'text': ' '.join(w['w'] for w in words)}
if script:
    norm = lambda t: re.sub(r"[^a-z0-9' ]", ' ', t.lower().replace('’', "'")).split()
    a, b = norm(script), norm(out['text'])
    sm = difflib.SequenceMatcher(None, a, b)
    out['match'] = round(sm.ratio(), 3)
    out['diffs'] = [(op, ' '.join(a[i1:i2]), ' '.join(b[j1:j2])) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal']
print(json.dumps(out, indent=1))
