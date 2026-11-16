# qc.py — final-file QC for a finished Short. Run it on the exact file you would upload, never on intermediates.
#   python3 qc.py final.mp4 [--lines lines.json] [--sheet sheet.jpg] [--min 20] [--max 45] [--no-asr]
# Checks: container/stream specs (1080x1920, 30 fps, h264 + AAC), duration window, integrated loudness and true peak
# after encoding, dead air (long silences, a silent first half-second), black or frozen video stretches, and, when the
# script is given, a blind Whisper transcription of the finished mix compared with the script, which shows whether
# the narration survives the music and effects. It writes a contact sheet so a person (or Claude) can actually look at
# the frames, and qc.json next to the video. Exit code 1 if any check fails.
import sys, os, json, re, subprocess, argparse, difflib
import numpy as np

ap = argparse.ArgumentParser(); ap.add_argument('video'); ap.add_argument('--lines'); ap.add_argument('--sheet')
ap.add_argument('--min', type=float, default=20); ap.add_argument('--max', type=float, default=45)
ap.add_argument('--frames', type=int, default=24); ap.add_argument('--no-asr', action='store_true')
A = ap.parse_args(); V = os.path.abspath(A.video)
WHISPER = os.environ.get('STUDIO_WHISPER', '/home/claude/tools/asr/whisper-small')
R = {'file': os.path.basename(V), 'checks': []}
def check(name, ok, detail, level='FAIL'):
    R['checks'].append({'check': name, 'result': 'PASS' if ok else level, 'detail': detail})

# ---- streams ----
pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', V], capture_output=True, text=True).stdout)
vs = [s for s in pr['streams'] if s['codec_type'] == 'video']; au = [s for s in pr['streams'] if s['codec_type'] == 'audio']
dur = float(pr['format']['duration']); R['duration'] = round(dur, 3); R['size_mb'] = round(int(pr['format']['size']) / 1e6, 1)
if vs:
    v = vs[0]; fps = eval(v['r_frame_rate'])
    check('video 1080x1920 h264', (v['width'], v['height'], v['codec_name']) == (1080, 1920, 'h264'), f"{v['codec_name']} {v['width']}x{v['height']} {v.get('pix_fmt')}")
    check('frame rate 30', abs(fps - 30) < 0.01, f'{fps:.3f} fps')
else: check('video stream', False, 'none')
check('audio stream AAC 48k stereo', bool(au) and au[0]['codec_name'] == 'aac' and au[0]['sample_rate'] == '48000' and au[0]['channels'] == 2,
      f"{au[0]['codec_name']} {au[0]['sample_rate']} Hz {au[0]['channels']} ch" if au else 'none')
check(f'duration {A.min:.0f}-{A.max:.0f} s', A.min <= dur <= A.max, f'{dur:.2f} s')
if au: check('audio covers video', abs(float(au[0].get('duration', dur)) - dur) < 0.1, f"audio {float(au[0].get('duration', 0)):.2f} s vs video {dur:.2f} s", 'WARN')

# ---- audio: decode the encoded AAC (what viewers hear) ----
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', V, '-vn', '-ac', '2', '-ar', '48000', '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32).reshape(-1, 2); SR = 48000
import pyloudnorm as pyln
from scipy.signal import resample_poly
L = pyln.Meter(SR).integrated_loudness(x.astype(np.float64)); tp = 20 * np.log10(np.abs(resample_poly(x, 4, 1, axis=0)).max() + 1e-12)
L, tp = float(L), float(tp); R['lufs'] = round(L, 2); R['true_peak_dbtp'] = round(tp, 2)
check('loudness -14 LUFS +-1', abs(L + 14) <= 1.0, f'{L:.1f} LUFS integrated')
check('true peak <= -1 dBTP', tp <= -1.0, f'{tp:.2f} dBTP')
mono = x.mean(1); hop = SR // 20; n = len(mono) // hop
rms = 20 * np.log10(np.sqrt((mono[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)
quiet = rms < -50; run = best = 0
for q in quiet: run = run + 1 if q else 0; best = max(best, run)
check('no dead air > 1.5 s', best * 0.05 <= 1.5, f'longest stretch under -50 dBFS: {best * 0.05:.2f} s', 'WARN')
check('sound in the first 0.5 s', rms[:10].max() > -40, f'max level in first 0.5 s: {rms[:10].max():.1f} dBFS')

# ---- video: black and frozen stretches ----
log = subprocess.run(['ffmpeg', '-v', 'info', '-i', V, '-an', '-vf', 'blackdetect=d=0.25:pix_th=0.06,freezedetect=n=0.002:d=1.2', '-f', 'null', '-'],
                     capture_output=True, text=True).stderr
blacks = re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', log)
ev = re.findall(r'freeze_(start|duration): ([\d.]+)', log); freezes = []
for k, v in ev:  # a freeze that runs to the end of the file has a start but no duration
    if k == 'start': freezes.append([float(v), None])
    elif freezes: freezes[-1][1] = float(v)
freezes = [(a, d if d is not None else dur - a) for a, d in freezes]
check('no black stretches >= 0.25 s', not blacks, ', '.join(f'{float(a):.2f}-{float(b):.2f}' for a, b in blacks) or 'none', 'WARN')
check('no frozen picture >= 1.2 s', not freezes, ', '.join(f'{a:.2f} s for {d:.2f} s' for a, d in freezes) or 'none', 'WARN')

# ---- contact sheet ----
from PIL import Image, ImageDraw, ImageFont
times = [dur * (i + 0.5) / A.frames for i in range(A.frames)]; tw, th, cols = 216, 384, 8
rows = (len(times) + cols - 1) // cols; sheet = Image.new('RGB', (cols * tw, rows * (th + 26)), (16, 16, 16)); d = ImageDraw.Draw(sheet)
fpath = next((p for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'] if os.path.exists(p)), None)
font = ImageFont.truetype(fpath, 18) if fpath else ImageFont.load_default()
for i, t in enumerate(times):
    fr = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', V, '-frames:v', '1', '-vf', f'scale={tw}:{th}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    if len(fr) == tw * th * 3:
        im = Image.frombytes('RGB', (tw, th), fr); sheet.paste(im, ((i % cols) * tw, (i // cols) * (th + 26) + 26))
    d.text(((i % cols) * tw + 6, (i // cols) * (th + 26) + 3), f'{t:5.2f}s', fill=(255, 220, 80), font=font)
sp = A.sheet or os.path.splitext(V)[0] + '_sheet.jpg'; sheet.save(sp, quality=88); R['sheet'] = sp

# ---- narration intelligibility over the finished mix ----
if A.lines and not A.no_asr:
    from faster_whisper import WhisperModel
    lines = json.load(open(A.lines)); script = ' '.join(l['text'] for l in lines)
    norm = lambda t: re.sub(r"[^a-z0-9' ]", ' ', t.lower().replace('’', "'").replace('-', ' ')).split()
    a16 = resample_poly(mono, 1, 3).astype(np.float32)
    m = WhisperModel(WHISPER, device='cpu', compute_type='int8', cpu_threads=2)
    heard = ' '.join(s.text for s in m.transcribe(a16, language='en', beam_size=5, vad_filter=False)[0]).strip()
    a_, b_ = norm(script), norm(heard); sm = difflib.SequenceMatcher(None, a_, b_, autojunk=False)
    num = lambda s: bool(re.fullmatch(r"[0-9 ,.%]+", s.strip()))
    diffs = [(op, ' '.join(a_[i1:i2]), ' '.join(b_[j1:j2])) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal']
    real = [d for d in diffs if not (d[0] == 'replace' and num(d[2]))]
    missed = sum(len(d[1].split()) for d in real if d[0] in ('replace', 'delete'))
    R['asr'] = {'heard': heard, 'word_match': round(sm.ratio(), 3), 'diffs': real, 'script_words_missed_or_changed': missed, 'script_words': len(a_)}
    check('narration intelligible over mix (blind ASR)', missed <= max(2, 0.04 * len(a_)), f'{missed} of {len(a_)} script words missed or changed; word match {sm.ratio():.2f}', 'WARN')

json.dump(R, open(os.path.splitext(V)[0] + '_qc.json', 'w'), indent=1)
for c in R['checks']: print(f"{c['result']:5}  {c['check']:44} {c['detail']}")
if 'asr' in R:
    for d in R['asr']['diffs']: print('       asr diff:', d)
print('sheet:', sp)
sys.exit(1 if any(c['result'] == 'FAIL' for c in R['checks']) else 0)
