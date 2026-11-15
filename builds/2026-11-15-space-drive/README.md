# Space is only 1 hour away by car (2026-11-15)

Format: scale shock (a car drives straight up at 100 km/h: the clouds in 1 minute, Everest in 5, a black sky at 30, the
100 km Kármán line at 1 hour, the space station in 3–4 hours, the Moon in 160 days; then the twist: astronauts float because
they are falling sideways at 28,000 km/h, with about 90% of Earth's gravity still pulling on them). Fast cut: 32.6 s on a
140 BPM grid, a cut every 1.7 s (2.6 s for the hook, the Kármán line, the tease and the end card, each with a punch on the
middle beat), a trip computer (clock + altitude) during the climb, counters that roll and slam, word-by-word captions, a sound
effect on every cut and reveal, the beat dropping out under a heartbeat before the gravity reveal, and an end frame that glides
back to the first one.

Built from the sky-water build's engine with new code: `world8.js` (a prairie highway whose road curls up into a vertical
ribbon with glowing edge lights, a red hatchback, a cumulus layer, Everest-height ridged peaks over a cloud sea, Earth from
50 and 100 km, the space station, the Moon, and a Newton's-cannonball orbit diagram integrated with inverse-square gravity),
`timeline.js`, `scene.js`, `hud.js`, `index.html`, `audio.py`.
Engine additions in `engine.js`: a mountain material (rock on steep faces, snow on gentle ones, kind 43), car paint / glass /
rubber / chrome (44), a glowing grid sheet for the Kármán line (kind 33 mode 5), the Moon (kind 35 mode 2), and fine
cloud and ground detail on the globe when the camera is close to the surface (17).

Every number on screen and its source: `facts.md`.

Render: `python3 earthtex.py earth.png`, a `node` dump of `timeline.js` to `timeline.json`, `node render.mjs shots`
(writes `out/*.mp4`), `python3 audio.py sound.wav`, then `bash assemble.sh` (concat, retime the score to the frame-rounded
cut, `limit.py` peak limiter, AAC mux, upload copy). `sheet.py` makes labelled contact sheets of `stills/`.

Gotchas found this build: big "hill" ellipsoids placed near the origin swallowed the camera (everything turned dark green);
keep scenery spheres several km from any camera. A road plane seen face-on fills the frame: shoot the vertical road edge-on
(camera just in front of its surface, looking along it) so the background shows.
