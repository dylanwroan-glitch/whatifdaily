# audio.py — "The Midnight Diamond": narrator and suspects on top; rain and thunder under everything; an original noir
# underscore (low drone, walking bass, brushed snare, vibraphone chords, piano stings) that drops out for the accusation and
# resolves on the reveal; foley for the clues (flashlight click, candle, notebook snap, handcuffs, rubber stamps, tape rewind).
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib'))
from audiolib import *
seed(1974)
E = json.load(open(os.path.join(HERE, 'edit.json'))); DUR = E['DURATION']; EV = E['EV']
SH = {s['name']: s for s in E['SHOTS']}
def T0(n, d=0.0): return SH[n]['t0'] + d
def T1(n): return SH[n]['t1']
voice, music, sfx, amb = Bus(DUR + 1), Bus(DUR + 1), Bus(DUR + 1), Bus(DUR + 1)

# ---------------- voices ----------------
PAN = {'NARRATOR': 0.0, 'CLEANER': -0.15, 'CURATOR': 0.12, 'GUARD': 0.1, 'DETECTIVE': -0.05}
for v in E['VOICE']:
    x = load_wav(os.path.join(HERE, 'vo', v['id'] + '.wav'))
    if v['who'] == 'NARRATOR': x = peq(x, 160, 2.5, 0.8)   # a little chest for the narrator
    voice.place(x, v['at'], 1.0, PAN.get(v['who'], 0))
voice.x = np.stack([voice_chain(voice.x[:, c]) for c in range(2)], 1); voice.x = reverb(voice.x, 1.0, 0.2, 0.07, 6000)

# ---------------- ambience: rain everywhere, heavier outside; thunder after each strike ----------------
inside = [(T0('N3_gone'), T1('S3_guard')), (T0('D1_arrest'), T1('D1_arrest'))]
r = rain(DUR, 1.0); env = np.ones(len(r))
for a, b in inside: i0, i1 = int(a * SR), int(b * SR); env[i0:i1] = 0.35
env = np.convolve(env, np.ones(4800) / 4800, mode='same'); amb.place(r * env, 0.0, 0.16)
for s0, g in ((0.02, 0.5), (2.55, 0.35), (3.95, 0.55), (13.0, 0.3), (30.2, 0.4), (T0('S3_guard', 0.75), 0.3)): amb.place(thunder(4.0), s0 + 0.25, g)

# ---------------- music ----------------
B = 60 / 84  # slow swing
CHORDS = [[45, 52, 55, 60, 64], [41, 48, 52, 57, 60], [46, 53, 57, 62, 65], [40, 47, 52, 56, 59]]  # Am9-ish, Fmaj7, Bb, E7
def vib(m, sec=1.6):
    t = tt(sec); f = mtof(m); trem = 1 + 0.25 * np.sin(2 * np.pi * 5.5 * t)
    return (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.08)) * np.exp(-t / 0.9) * trem * np.minimum(1, t / 0.004)
def brush(sec=0.25):
    return bp(noise(sec), 2000, 9000) * np.exp(-tt(sec) / 0.09) * 0.5
# intro: a low drone and a lonely piano motif
d = tt(T0('N3_gone') + 0.3); drone = (np.sin(2 * np.pi * 55 * d) * 0.5 + np.sin(2 * np.pi * 82.4 * d) * 0.25 + lp(noise(len(d) / SR), 140) * 0.6) * np.minimum(1, d / 1.5)
music.place(fade(drone, 0.8, 0.6), 0.0, 0.14)
for j, m in enumerate([69, 72, 71, 64]): music.place(piano(m, 2.5, 0.8), 0.6 + j * 1.25, 0.08)
# the theft: a sting on "gone", then the walking bass and brushes under the interviews
for m in (45, 51, 57, 60, 63): music.place(piano(m, 3.0, 1.0), EV['gone'], 0.06)
music.place(timpani(33, 2.2), EV['gone'], 0.3); music.place(braam(21, 2.6), EV['gone'], 0.18)
WALK = [45, 48, 50, 52, 41, 45, 48, 50, 46, 50, 53, 55, 40, 44, 47, 50]
t = T0('N4_three'); i = 0
while t < T0('N7_detective') - 0.1:
    music.place(pizz(WALK[i % 16] - 12, 0.6), t, 0.3); sw = B * (0.62 if i % 2 == 0 else 0.38)
    music.place(brush(0.3), t, 0.06, 0.2);
    if i % 4 == 0:
        for m in CHORDS[(i // 4) % 4][1:]: music.place(vib(m + 12, 1.8), t + 0.02, 0.022)
    if i % 2 == 1: music.place(hat(0.04), t, 0.03, -0.2)
    t += B; i += 1
# the detective: a ticking clock in near-silence
for j in range(int((T1('N7_detective') - T0('N7_detective')) / 0.5)): sfx.place(tick() * 0.6, T0('N7_detective', 0.1 + j * 0.5), 0.12, 0.3)
# the accusation: a heavy hit, then silence
music.place(braam(24, 3.0), EV['arrest'], 0.32); music.place(timpani(31, 2.0), EV['arrest'], 0.35)
for m in (36, 43, 48, 51, 54): music.place(piano(m, 2.5, 1.0), EV['arrest'], 0.07)
# the reveal: a rising piano line into a warm resolved chord on "new moon", a final stamp
for j, m in enumerate([57, 60, 64, 69, 72, 76]): music.place(piano(m, 2.0, 0.8), EV['catch'] + 0.15 + j * 0.16, 0.06)
music.place(strings([45, 52, 57, 61, 64], T1('N8_reveal') - EV['newmoon'] + 0.2, 3000, 0.5, 1.2), EV['newmoon'] - 0.2, 0.1)
music.place(vib(81, 2.5), EV['newmoon'] + 0.1, 0.05)

# ---------------- foley and stingers ----------------
def click(f=2500): t2 = tt(0.05); return np.sin(2 * np.pi * f * t2) * np.exp(-t2 / 0.006) + hp(noise(0.05), 3000) * np.exp(-t2 / 0.003)
def snap(): t2 = tt(0.15); return lp(noise(0.15), 3000) * np.exp(-t2 / 0.02) + np.sin(2 * np.pi * 180 * t2) * np.exp(-t2 / 0.03) * 0.6
def cuffs(): return np.concatenate([click(3200) * 0.8, np.zeros(int(0.07 * SR)), click(2800), np.zeros(int(0.05 * SR)), click(3600) * 0.7])
def stamp_thud(): t2 = tt(0.4); return np.sin(2 * np.pi * (70 + 60 * np.exp(-t2 / 0.02)) * t2) * np.exp(-t2 / 0.09) + lp(noise(0.4), 1200) * np.exp(-t2 / 0.03) * 0.7
def rewind(sec):
    t2 = tt(sec); f = 300 + 2500 * (t2 / sec) ** 0.5; ph = 2 * np.pi * np.cumsum(f) / SR
    return (signal.sawtooth(ph) * 0.15 + bp(noise(sec), 800, 6000) * 0.4) * np.minimum(1, t2 / 0.05)
from scipy import signal
sfx.place(impact(2.2), 0.0, 0.32)                                                   # frame 1
for j in range(10): sfx.place(click(1800 + 300 * (j % 3)) * 0.5, EV['blackout'] + j * 0.035, 0.15)   # the lights clacking off
sfx.place(fade(sweep(0.8, 3000, 80, 0.5, 1.0), 0.01, 0.2), EV['blackout'], 0.2); sfx.place(thump(), EV['blackout'] + 0.05, 0.35)
for j in range(6): sfx.place(click(5000) * 0.3, EV['lights'] + j * 0.08, 0.12)        # fluorescent flicker
sfx.place(stamp_thud(), EV['gone'] + 0.05, 0.4)
sfx.place(whoosh(0.35, True), EV['diamond'] - 0.25, 0.15, 0.4); sfx.place(ding(100), EV['diamond'] + 0.05, 0.05)
for j in range(3): sfx.place(pop(700 + j * 200), T0('N4_three', 0.3 + j * 0.25), 0.12)
sfx.place(snap(), EV['snap'], 0.45)
sfx.place(cuffs(), EV['arrest'] + 0.25, 0.35); sfx.place(stamp_thud(), EV['arrest'] + 0.05, 0.45)
sfx.place(click(2200), T0('N6_guard', 0.05), 0.2)                                      # flashlight
sfx.place(fade(rewind(EV['catch'] - T0('N8_reveal') + 0.3), 0.02, 0.1), T0('N8_reveal'), 0.12)
sfx.place(stamp_thud(), EV['newmoon'] + 1.0, 0.45)
for i, c in enumerate(E['CUTS']): sfx.place(whoosh(0.3, i % 2 == 0), c - 0.2, 0.06, 0.3 * (1 if i % 2 else -1))

# ---------------- mix ----------------
mus = reverb(music.x, 2.4, 0.6, 0.2, 4500); mus = duck(mus, voice.x, -9.0); fx = duck(sfx.x, voice.x, -3.0); am = duck(amb.x, voice.x, -5.0)
mix = (voice.x + mus * 0.9 + fx + am)[:int(DUR * SR)]
out, L0, L1 = master(mix, -14.0, -1.5); save_wav(os.path.join(HERE, 'mix.wav'), out)
print('loudness in %.1f -> out %.1f LUFS, peak %.2f dBFS' % (L0, L1, 20 * np.log10(np.abs(out).max())))
