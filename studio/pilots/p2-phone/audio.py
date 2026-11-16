# audio.py — "My phone at 1%": two character voices, a bouncy pizzicato/marimba underscore that plays the jokes (melodrama
# strings for the tears, a hard stop for the deadpan lines, a sad trombone for the eulogy) and cartoon sound effects.
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib'))
from audiolib import *
seed(2026)
E = json.load(open(os.path.join(HERE, 'edit.json'))); DUR = E['DURATION']; EV = E['EV']
SH = {s['name']: s for s in E['SHOTS']}
def T0(n, d=0.0): return SH[n]['t0'] + d
def T1(n): return SH[n]['t1']
voice, music, sfx = Bus(DUR + 1), Bus(DUR + 1), Bus(DUR + 1)

# ---------------- voices (slightly different treatment per character) ----------------
for v in E['VOICE']:
    x = load_wav(os.path.join(HERE, 'vo', v['id'] + '.wav'))
    if v['who'] == 'CHARGER': x = peq(x, 180, 2.0, 0.8)     # a touch warmer and deeper
    voice.place(x, v['at'], 1.0, -0.08 if v['who'] == 'PHONE' else 0.1)
voice.x = np.stack([voice_chain(voice.x[:, c]) for c in range(2)], 1); voice.x = reverb(voice.x, 0.6, 0.12, 0.05, 7000)

# ---------------- music ----------------
BPM = 112; B = 60 / BPM
def bounce(t0, t1, key=53, gain=1.0, busy=1):  # F major oom-pah: pizz bass on 1 and 3, marimba chords on 2 and 4, little melody
    prog = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]]; mel = [12, 14, 16, 19, 16, 14, 12, 7]
    t = t0; i = 0
    while t < t1 - 0.05:
        ch = prog[(i // 4) % 4]
        if i % 2 == 0: music.place(pizz(key - 12 + ch[0] + (7 if i % 4 == 2 else 0), 0.5), t, 0.22 * gain)
        else:
            for n in ch: music.place(marimba(key + 12 + n, 0.4), t, 0.05 * gain)
        if busy and i % 2 == 1: music.place(marimba(key + 24 + mel[(i // 2) % 8], 0.35), t + B / 2, 0.06 * gain)
        if i % 4 == 0: music.place(kick(0.5), t, 0.18 * gain)
        music.place(hat(0.03), t + B / 2, 0.035 * gain); t += B; i += 1
# hook: a beep, then a melodramatic sting on "This is it"
sfx.place(np.concatenate([np.sin(2 * np.pi * 1760 * tt(0.08)) * 0.5, np.zeros(int(0.05 * SR)), np.sin(2 * np.pi * 1320 * tt(0.12)) * 0.5]), 0.03, 0.12)
sfx.place(timpani(36, 2.0), T0('S1_phone', 0.42), 0.45); music.place(strings([41, 48, 53, 56, 60], 2.2, 2200, 0.05, 0.8), T0('S1_phone', 0.42), 0.09)
# tears: soap-opera strings in F minor with a wobbly solo line
music.place(strings([41, 48, 53, 56], T1('S2_tears') - T0('S2_tears') + 0.3, 2400, 0.4, 0.5), T0('S2_tears'), 0.1)
for j, m in enumerate([72, 70, 68, 67]): music.place(strings([m], 0.9, 3200, 0.1, 0.4), T0('S2_tears', 0.25 + j * 0.62), 0.05)
# the charger's deadpan: the music stops dead (record stop), then bounces back
def recstop(sec=0.45):
    t = tt(sec); f = 220 * (1 - t / sec) ** 2 + 20; ph = 2 * np.pi * np.cumsum(f) / SR; return np.sin(ph) * np.exp(-t / 0.3) * 0.6 + bp(noise(sec), 200, 2000) * np.exp(-t / 0.1) * 0.3
sfx.place(recstop(), T0('S3_charger') - 0.05, 0.25)
bounce(T0('S4_gap'), T1('S5_charger'), gain=0.85)
# the gap: a whoosh on the zoom-out, the tape measure zips out, "6 FT" pops, a twinkle on "moon"
sfx.place(whoosh(0.5, False), T0('S4_gap'), 0.2); sfx.place(fade(sweep(0.5, 600, 5000, 0.3, 1.0), 0.02, 0.05), EV['six'] - 0.25, 0.18); sfx.place(pop(900), EV['six'] + 0.3, 0.3)
sfx.place(np.concatenate([bell(96, 0.6) * 0.5, bell(103, 0.8) * 0.4]), EV['moon'], 0.08)
# rage: faster, busier; desaturation power-down on "gray icons"; boing + calculator beeps
bounce(T0('S6_rage'), EV['calc'] - 0.1, key=53, gain=1.0, busy=1)
sfx.place(fade(sweep(0.6, 600, 60, 0.5, 1.0), 0.01, 0.1), EV['gray'] + 0.05, 0.16)   # low power-down: kept under 600 Hz so it doesn't mask "gray icons" (QC heard "great" with the old 3 kHz sweep)
sfx.place(boing(160, 600, 0.5), EV['calc'] - 0.02, 0.4); sfx.place(slide_whistle(1400, 500, 0.45), EV['calc'] + 0.05, 0.08)
for j in range(3): sfx.place(np.sin(2 * np.pi * [880, 1320, 990][j] * tt(0.07)) * np.exp(-tt(0.07) / 0.03), EV['calc'] + 0.35 + j * 0.14, 0.12)
# the lift: a swish as the hand grabs, a slide whistle up, a little "heavenly" chord of hope
sfx.place(swish(0.25), EV['grab'] - 0.15, 0.4); sfx.place(slide_whistle(400, 1400, 0.7), EV['lift'], 0.12)
music.place(strings([65, 69, 72, 77], 2.3, 4000, 0.3, 0.6), EV['lift'] + 0.2, 0.09); music.place(bell(89, 2.0) * 0.6, EV['lift'] + 0.25, 0.08)
# the video: a click, a cheesy intro sting, then the power-down
sfx.place(tick(), EV['video'], 0.4); sfx.place(pop(1800), EV['video'] + 0.02, 0.2)
for j, m in enumerate([72, 76, 79, 84]): music.place(marimba(m, 0.3), EV['video'] + 0.15 + j * 0.09, 0.09)
bounce(EV['video'] + 0.5, EV['die'], key=58, gain=0.7, busy=1)
pd = tt(0.9); powerdown = np.sin(2 * np.pi * np.cumsum(900 * (1 - pd / 0.9) ** 3 + 40) / SR) * np.exp(-pd / 0.5) * 0.7
sfx.place(powerdown, EV['die'], 0.3); sfx.place(thump(), EV['die'] + 0.05, 0.3)
# the eulogy: crickets in the silence, then a sad trombone after the line
cr = np.zeros(int(1.4 * SR))
for j in range(7): i0 = int(j * 0.2 * SR); c = np.sin(2 * np.pi * 4300 * tt(0.06)) * (np.sin(2 * np.pi * 60 * tt(0.06)) > 0) * np.exp(-tt(0.06) / 0.03); cr[i0:i0 + len(c)] += c
sfx.place(cr, T0('S9_rip', 0.05), 0.05, 0.4)
def trombone(m, sec, wob=0.0):
    t = tt(sec); f = mtof(m) * (1 + wob * 0.03 * np.sin(2 * np.pi * 6 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph) * (0.9 ** k) for k in range(1, 10)); return lp(x, 1600) * np.minimum(1, t / 0.04) * np.minimum(1, (sec - t) / 0.08)
tb = T1('S9_rip') - 0.45
for j, (m, sec) in enumerate([(58, 0.32), (57, 0.32), (56, 0.32), (55, 1.0)]): sfx.place(trombone(m, sec, 1.0 if j == 3 else 0.0), tb + j * 0.34, 0.1)
# end card: a bright little outro
for j, m in enumerate([65, 69, 72, 77, 81]): music.place(marimba(m, 0.5), T0('S10_end', 0.1 + j * 0.1), 0.1)
music.place(strings([53, 60, 65, 69], 2.0, 3500, 0.05, 0.8), T0('S10_end', 0.1), 0.07)
# a soft whoosh into each cut
for i, c in enumerate(E['CUTS']): sfx.place(whoosh(0.28, i % 2 == 0), c - 0.18, 0.08, 0.3 * (1 if i % 2 else -1))
# room tone so the silences aren't digital black
sfx.place(fade(room_tone(DUR, 80, 600), 0.3, 0.3), 0.0, 0.08)

# ---------------- mix ----------------
mus = reverb(music.x, 1.6, 0.35, 0.14, 6000); mus = duck(mus, voice.x, -9.0); fx = duck(sfx.x, voice.x, -3.0)
mix = (voice.x + mus * 0.9 + fx)[:int(DUR * SR)]
out, L0, L1 = master(mix, -14.0, -1.5); save_wav(os.path.join(HERE, 'mix.wav'), out)
print('loudness in %.1f -> out %.1f LUFS, peak %.2f dBFS' % (L0, L1, 20 * np.log10(np.abs(out).max())))
