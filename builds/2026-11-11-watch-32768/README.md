# Why does your watch count to 32,768? (2026-11-11)

Format: hidden in plain sight. Built from `kit/` (via the sun-door build's engine) with new code: `world4.js` (a quartz wristwatch
and its movement in millimetres: case, sunburst dial, hands, leather strap, battery, coil and rotor, gear train, circuit board, chip
and the crystal can with its quartz tuning fork; the 15-stage divider "chip city"; an atomic-fountain lab; a dusk plain with a
sauropod), `timeline.js` (shots, captions, the 15 halving times), `scene.js`, `hud.js`, `index.html` and `audio.py`.
Engine additions in `engine.js`: brushed/polished metal with coil windings and an energize glow (kind 19), a sunburst watch dial
with a printed minute track (20), quartz crystal (21), a chip die / optical-table surface (22), dark walnut (25), a soft-box studio
environment for metals, and lathe meshes with open ends and partial sweeps (for the cutaway shields).

The soundtrack plays the halvings literally: a tone that drops one octave per halving (16,384 Hz down to 32 Hz), then click
trains at 16, 8, 4 and 2 per second, then the single tick.

Every on-screen number and its source: `facts.md`.

Render: `node render.mjs shots` (writes `out/*.mp4`), a `node` dump of `timeline.js` to `timeline.json`, then `python3 audio.py sound.wav`.
