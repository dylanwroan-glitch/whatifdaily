# What if all the water in the sky fell at once? (2026-11-15)

Format: what if (the premise, a 3-2-1, the moment it happens, "same instant" replays in three places, the numbers, a sourced
twist). Fast cut: 34.3 s on a 140 BPM grid, a cut every 1.7 s (2.6 s for the hook, the countdown, the flood build-up and the
end card, each with a punch on the middle beat), counters that roll and slam, word-by-word captions, a sound effect on every
cut and reveal, the beat dropping out before the 2.5 cm reveal, and an end frame that glides back to the first one.

Built from the coldest build's engine with new code: `world7.js` (a city under a storm-cloud base, a fair-weather cumulus,
Earth from orbit, a rain-lashed ocean, a dune field, the sky's water as a 23.45 km cube beside a Lake Superior cube, and a
curb with a ruler), `timeline.js`, `scene.js`, `hud.js`, `index.html`, `audio.py`.
Engine additions in `engine.js`: a storm-cloud base seen from below (kind 41), a soft cumulus impostor composited over the
sky (42), a fair-weather mode for the cloud puffs (13), a water volume with a fill level (39), close-up street materials
(40: ruler with mm/cm ticks, asphalt, concrete), raindrop ripple rings, wave scale and transparency in the water pass
(for the shallow flood), a camera-centred water plane, a heightfield dune mesh, and a patchy cloud dissolve on the globe (17).

Every number on screen and its source: `facts.md`.

Render: `python3 earthtex.py earth.png`, a `node` dump of `timeline.js` to `timeline.json`, `node render.mjs shots`
(writes `out/*.mp4`), `python3 audio.py sound.wav`, then `bash assemble.sh` (concat, retime the score 0.64% to the
frame-rounded cut, `limit.py` peak limiter, AAC mux, upload copy). `sheet.py` makes labelled contact sheets of `stills/`.

Gotcha found this build: SwiftShader's depth precision is far coarser than 24-bit suggests. A water plane 1.2 cm above
the street z-fought with it and vanished in some frames; the fix was a 4 cm wet layer with a 1 m near plane in the street
shot, and a 30 cm-deep floor under the flood close-ups (near plane 3–4 cm).
