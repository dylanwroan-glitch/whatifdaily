# If the Sun were a door, where's Earth? (2026-11-10)

Format: scale shock. Built from `kit/` (via the lightning build's engine) with new code: `world3.js` (porch with a 2 m Sun next to the door,
a nickel-sized Earth on a side table, a suburban street with a mailbox 215 m away, a town for the aerial shot, a red dwarf, a globe),
`timeline.js` (shots, captions, the globe trip), `scene.js`, `hud.js`, `index.html`, `audio.py`, and `earthtex.py` (a stylized
Earth texture from hand-drawn, simplified coastlines). Engine additions in `engine.js`: planet material with clouds and atmosphere
rim (kind 17), nickel metal with rim and relief (18), red-dwarf tint for the star surface, suburban lawns and distance glow for the
road ground, and a starfield-everywhere sky mode for space.

Every on-screen number and its source: `facts.md`.

Render: `python3 earthtex.py earth.png`, `node render.mjs shots` (writes `out/*.mp4`), a `node` dump of `timeline.js` to
`timeline.json`, then `python3 audio.py sound.wav`.
