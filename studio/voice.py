# voice.py — narration step of the studio pipeline:
#   1. synthesize every line with Kokoro (tts/say.mjs, offline),
#   2. QC: transcribe each line blind with Whisper small and compare to the script (catches garbled or mispronounced words),
#   3. timing: transcribe again with the script as a prompt to get word timestamps for captions.
# usage: python3 voice.py lines.json outdir      (lines: [{id, text, voice, speed, who}])
import sys, json, os, re, subprocess, difflib, wave
import numpy as np
from scipy.signal import resample_poly
from math import gcd

HERE = os.path.dirname(os.path.abspath(__file__))
TTS_DIR = os.environ.get('STUDIO_TTS', '/home/claude/tools/tts')
WHISPER = os.environ.get('STUDIO_WHISPER', '/home/claude/tools/asr/whisper-small')

lines_path, outdir = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]); os.makedirs(outdir, exist_ok=True)
lines = json.load(open(lines_path))
only = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None
todo = [L for L in lines if not only or L['id'] in only]
spec = os.path.join(outdir, '_spec.json'); json.dump({'lines': todo}, open(spec, 'w'))
import shutil; shutil.copy(os.path.join(HERE, 'tts', 'say.mjs'), os.path.join(TTS_DIR, 'say.mjs'))  # ESM resolves packages next to the script
subprocess.run(['node', os.path.join(TTS_DIR, 'say.mjs'), spec, outdir], cwd=TTS_DIR, check=True)

from faster_whisper import WhisperModel
model = WhisperModel(WHISPER, device='cpu', compute_type='int8', cpu_threads=2)
def load16k(path):
    w = wave.open(path); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    g = gcd(sr, 16000); return resample_poly(x, 16000 // g, sr // g).astype(np.float32)
norm = lambda t: re.sub(r"[^a-z0-9' ]", ' ', t.lower().replace('’', "'").replace('-', ' ')).split()
qc = json.load(open(os.path.join(outdir, 'qc.json'))) if os.path.exists(os.path.join(outdir, 'qc.json')) else {}
for L in todo:
    a = load16k(os.path.join(outdir, L['id'] + '.wav'))
    blind = ' '.join(s.text for s in model.transcribe(a, language='en', beam_size=5)[0]).strip()
    sm = difflib.SequenceMatcher(None, norm(L['text']), norm(blind), autojunk=False)
    diffs = [(op, ' '.join(norm(L['text'])[i1:i2]), ' '.join(norm(blind)[j1:j2])) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal']
    # Whisper writes spoken numbers as digits ("three hundred" -> "300"); those aren't errors, so they're flagged separately
    num = lambda s: bool(re.fullmatch(r"[0-9 ,.%]+", s.strip()))
    numeric = [d for d in diffs if d[0] == 'replace' and num(d[2])]; diffs = [d for d in diffs if d not in numeric]
    segs, _ = model.transcribe(a, language='en', word_timestamps=True, beam_size=5, initial_prompt=L['text'])
    words = [{'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3), 'p': round(w.probability, 3)} for s in segs for w in s.words]
    json.dump({'words': words}, open(os.path.join(outdir, L['id'] + '.words.json'), 'w'))
    qc[L['id']] = {'match': round(sm.ratio(), 3), 'heard': blind, 'diffs': diffs, 'numbers_as_digits': numeric}
    print(f"{L['id']:>10}  {'OK ' if not diffs else 'CHECK'}  heard: {blind}")
json.dump(qc, open(os.path.join(outdir, 'qc.json'), 'w'), indent=1)
