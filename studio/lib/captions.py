# captions.py — turn a script plus Whisper word timings into caption "pages" for word-synced subtitles.
# The script's own spelling and punctuation are kept; Whisper only supplies the timing (matched by sequence alignment).
# usage: python3 captions.py lines.json words_dir out.json [--max 3]
#   lines.json: [{id, text, at (s, where the line starts in the edit), emph: ["word", ...]}]
#   words_dir/<id>.words.json: align.py output for that line's audio
import sys, json, re, difflib

def norm(w): return re.sub(r"[^a-z0-9']", '', w.lower().replace('’', "'"))

def time_words(text, wj):
    toks = text.split(); a = [norm(t) for t in toks]
    ww = [w for w in wj['words'] if norm(w['w'])]; b = [norm(w['w']) for w in ww]
    times = [None] * len(toks)
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == 'equal':
            for k in range(i2 - i1): times[i1 + k] = (ww[j1 + k]['s'], ww[j1 + k]['e'])
        elif op == 'replace' and j2 > j1:  # spread the matched span's time over the script words
            s, e = ww[j1]['s'], ww[j2 - 1]['e']; n = i2 - i1
            for k in range(n): times[i1 + k] = (s + (e - s) * k / n, s + (e - s) * (k + 1) / n)
    # fill gaps by interpolation between known neighbours
    for i in range(len(toks)):
        if times[i] is None:
            p = next((times[j][1] for j in range(i - 1, -1, -1) if times[j]), 0.0)
            q = next((times[j][0] for j in range(i + 1, len(toks)) if times[j]), p + 0.3)
            times[i] = (p, max(p + 0.08, min(q, p + 0.35)))
    return list(zip(toks, times))

def pages(words, maxw=3):
    out, cur = [], []
    for w, (s, e) in words:
        cur.append((w, s, e)); brk = re.search(r"[.,!?;:—…]$", w) or len(cur) >= maxw
        if brk: out.append(cur); cur = []
    if cur: out.append(cur)
    return out

if __name__ == '__main__':
    lines = json.load(open(sys.argv[1])); wdir = sys.argv[2]; outp = sys.argv[3]
    maxw = int(sys.argv[sys.argv.index('--max') + 1]) if '--max' in sys.argv else 3
    res = []
    for L in lines:
        wj = json.load(open(f"{wdir}/{L['id']}.words.json"))
        tw = time_words(L['text'], wj); emph = set(norm(x) for x in L.get('emph', []))
        for pg in pages(tw, maxw):
            res.append({'line': L['id'], 'who': L.get('who', ''), 't0': round(L['at'] + pg[0][1], 3), 't1': round(L['at'] + pg[-1][2], 3),
                        'words': [{'w': w, 's': round(L['at'] + s, 3), 'e': round(L['at'] + e, 3), 'em': norm(w) in emph} for w, s, e in pg]})
    # hold each page until the next one starts (max +0.6 s), so captions don't flicker off between words
    for i, p in enumerate(res):
        nxt = res[i + 1]['t0'] if i + 1 < len(res) else p['t1'] + 0.6
        p['t1'] = round(min(max(p['t1'], nxt - 0.02), p['t1'] + 0.6) if nxt > p['t1'] else p['t1'], 3)
    json.dump(res, open(outp, 'w'), indent=1); print('pages', len(res))
