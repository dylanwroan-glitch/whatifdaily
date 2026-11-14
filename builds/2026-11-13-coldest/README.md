# Where's the coldest place in the universe? (2026-11-13)

Format: ranked countdown (#5 → #1). First video in the faster style: 38.6 s, a cut every 1.7 s (2 half-bars at 140 BPM),
rank slams with a flash and a zoom punch, a temperature counter that rolls down to ≈ −273.1499999999 °C, a thermometer
bar, word-by-word captions, and a sound effect on every cut and reveal over a D-minor trap beat.

Built from the hoover build's engine with new code: `world6.js` (an Antarctic station at night under an aurora with blowing
snow, Pluto with its heart and Charon, the Boomerang Nebula, Earth with a stylized space station, and the inside of a
laser-cooling lab), `timeline.js` (shots on the beat grid, ranks, captions), `scene.js`, `hud.js`, `index.html`, `audio.py`.
Engine additions in `engine.js`: an additive glow pass for batches marked `add`, camera-facing impostors (kind 33: bipolar
nebula, glow sprites, aurora curtains, galaxies, streaks), an icy dwarf-planet surface with the heart and nitrogen-ice
cells (35), station solar arrays / module skins / radiators (36), wind-packed snow with sparkle (37), an additive
atmosphere shell (38), and a stylized cosmic-microwave-background mottling in the sky shader.

Every number on screen and its source: `facts.md`.

Render: `python3 earthtex.py earth.png`, a `node` dump of `timeline.js` to `timeline.json`, `node render.mjs shots`
(writes `out/*.mp4`), then `python3 audio.py sound.wav`.
