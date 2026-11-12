# Pour Hoover Dam all at once. What happens? (2026-11-12)

Format: simulation. Built from `kit/` (via the watch build's engine) with new code: `world5.js` (Black Canyon as a
heightfield with buttressed walls, Hoover Dam as a curved arch-gravity mesh, its cross-section, the 5-ft-lift columns as
sheared blocks that follow the arch, crest, intake towers, powerhouse, cableways with buckets, the lower cofferdam with the
ice plant, the highway set, a bread oven, loaves and a bread pile), `timeline.js` (22 shots, captions, event times),
`scene.js`, `hud.js`, `index.html` and `audio.py`.
Engine additions in `engine.js`: canyon rock with bump, strata, desert varnish and the Lake Mead ring (kind 26), concrete with
5-ft lift lines, heat and cracks, clipping for the cutaway and the single pour (27), bread loaves and a packed-loaf pile (28),
water without the reflection pass (29), the thermal cross-section with a cooling front and isotherms (30), ice (31),
x-ray pipes with flowing water and a grout fill (32), a false-colour thermal view, an x-ray view, and sheared column instances.

The single-pour scenes are a stylized simulation of Reclamation's calculation (125 years to cool); every number on screen and
its source is in `facts.md`.

Render: `node render.mjs shots` (writes `out/*.mp4`), a `node` dump of `timeline.js` to `timeline.json`, then `python3 audio.py sound.wav`.
