# 5 lightning "facts." Only 1 is true. (2026-11-08)

Format: myth vs fact. Built from `kit/` with new code: `world2.js` (tower city, car on a wet road, field, storms, sun, lightning generator),
`timeline.js` (shots, verdict stamps, every strike), `scene.js`, `hud.js`, `index.html`, `audio.py`. Engine additions in `engine.js`:
storm-cloud puffs with inner flash glow (kind 13), sun surface (14), rain curtain (15), camera-facing cumulonimbus impostor with fbm (16),
rotated fbm noise, sky flash glow.

Every on-screen number and its source: `facts.md`.

Render: `node render.mjs shots` (writes `out/*.mp4`), `node -e` dump of `timeline.js` to `timeline.json`, then `python3 audio.py sound.wav`.
