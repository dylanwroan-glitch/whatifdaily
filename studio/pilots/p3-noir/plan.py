# plan.py — "The Midnight Diamond": each beat lasts as long as its line plus the pause the story needs.
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib'))
from captions import time_words, pages, norm
lines = {l['id']: l for l in json.load(open(os.path.join(HERE, 'lines.json')))}
durs = {l['id']: l['dur'] for l in json.load(open(os.path.join(HERE, 'vo', 'lines.json')))}
words = {k: json.load(open(os.path.join(HERE, 'vo', k + '.words.json'))) for k in lines}
FPS = 30
BEATS = [('N1_night', 'n1', 0.55, 0.3), ('N2_blackout', 'n2', 0.1, 0.6), ('N3_gone', 'n3', 0.2, 0.3), ('N4_three', 'n4', 0.1, 0.15),
         ('S1_cleaner', 's1', 0.1, 0.3), ('N5_curator', 'n5', 0.1, 0.1), ('S2_curator', 's2', 0.05, 0.35), ('N6_guard', 'n6', 0.1, 0.1),
         ('S3_guard', 's3', 0.05, 0.5), ('N7_detective', 'n7', 0.2, 0.25), ('D1_arrest', 'd1', 0.1, 0.9), ('N8_reveal', 'n8', 0.3, 1.7)]
shots, voice, t = [], [], 0.0
for name, lid, lead, tail in BEATS:
    dur = round(round((lead + durs[lid] + tail) * FPS) / FPS, 4)
    shots.append({'name': name, 't0': round(t, 4), 't1': round(t + dur, 4)}); voice.append({'id': lid, 'at': round(t + lead, 4), 'who': lines[lid]['who'], 'dur': durs[lid]}); t += dur
AT = {v['id']: v['at'] for v in voice}
def wt(lid, w, end=False, k=0):
    tw = time_words(lines[lid]['text'], words[lid]); hits = [(s, e) for x, (s, e) in tw if norm(x) == norm(w)]
    s, e = hits[min(k, len(hits) - 1)]; return round(AT[lid] + (e if end else s), 4)
S = {s['name']: s for s in shots}
EV = {'blackout': wt('n2', 'blackout'), 'lights': wt('n3', 'lights'), 'gone': wt('n3', 'gone'), 'diamond': wt('n3', 'diamond'),
      'moonlight': wt('s3', 'moonlight'), 'snap': S['N7_detective']['t0'] + 0.3 + durs['n7'] * 0.85, 'arrest': wt('d1', 'guard'),
      'catch': wt('n8', 'catch', True), 'nomoon': wt('n8', 'moonlight'), 'newmoon': wt('n8', 'new')}
caps = []
for v in voice:
    l = lines[v['id']]; tw = time_words(l['text'], words[v['id']]); emph = set(norm(x) for x in l.get('emph', []))
    for pg in pages(tw, 3):
        caps.append({'who': l['who'], 't0': round(v['at'] + pg[0][1], 3), 't1': round(v['at'] + pg[-1][2], 3),
                     'words': [{'w': w, 's': round(v['at'] + s, 3), 'e': round(v['at'] + e, 3), 'em': norm(w) in emph} for w, s, e in pg]})
for i, p in enumerate(caps):
    nxt = caps[i + 1]['t0'] if i + 1 < len(caps) else p['t1'] + 0.6
    p['t1'] = round(min(nxt - 0.02, p['t1'] + 0.55), 3) if nxt > p['t1'] else round(p['t1'], 3)
edit = {'FPS': FPS, 'SHOTS': shots, 'DURATION': round(t, 4), 'EV': EV, 'VOICE': voice, 'CUTS': [s['t0'] for s in shots[1:]]}
json.dump(edit, open(os.path.join(HERE, 'edit.json'), 'w'), indent=1)
mouth = json.load(open(os.path.join(HERE, 'build', 'mouth.json')))
open(os.path.join(HERE, 'build', 'edit.js'), 'w').write('export const EDIT = ' + json.dumps(edit) + ';\nexport const CAPTIONS = ' + json.dumps(caps) + ';\nexport const MOUTH = ' + json.dumps(mouth) + ';\n')
print('duration', edit['DURATION']); [print(f"  {s['name']:<13} {s['t0']:6.2f} – {s['t1']:6.2f}") for s in shots]; print(EV)
