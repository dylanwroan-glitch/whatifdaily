# What if you melted the Eiffel Tower? (2026-11-15)

Format: simulation (heat the tower past iron's melting point, melt it from the top down, gather the iron into one cube,
then spread it over the tower's own base). The payoff: all 7,300 tonnes of iron make a cube just 9.8 m wide, small enough
to fit under one of its own 25 m feet, and spread over the 125 m base it is only 6 cm deep. Twist: Gustave Eiffel's own
words say wind resistance came first, so he left the tower full of holes. Fast cut: 33.4 s on a 140 BPM grid, a cut every
1.7 s (2.6 s for the hook, the tease and the end card, each with a punch on the middle beat), counters that roll and slam,
a live gauge (iron temperature + tower height during the melt, then depth + width during the spread), word-by-word
captions, a sound effect on every cut and reveal, the beat dropping out before the 6 cm slam, and an end frame that glides
back to the first one while the tower rebuilds.

Built from the space-drive build's engine with new code: `world9.js` (a stylized lattice tower made of ~3,400 members:
four curved legs on a 125 m square, arches, three floors, the shaft, the top and the antenna; the Champ de Mars, the
Seine, Haussmann blocks with zinc roofs, lamp posts; molten drops, splashes, the pool, the cube, the sheet; a 1.75 m
standing figure for scale), `timeline.js`, `scene.js`, `hud.js`, `index.html`, `audio.py`.
Engine additions in `engine.js`: an iron material (kind 45) with a glowing-heat ramp (`heatCol`), rivet rows on close-ups,
glazed cabins, molten iron with drifting crust plates and glowing seams (a cellular pattern), and a cooled dark iron plate
with a sky sheen; kind 45 and the ruler stay out of the x-ray tint used for the diagram shots.

Every number on screen and its source: `facts.md`.

Render: a `node` dump of `timeline.js` to `timeline.json`, `node render.mjs shots [names]` (writes `out/*.mp4`; this
build ran two processes in parallel on different shots), `python3 audio.py sound.wav`, then `bash assemble.sh` (concat,
retime the score to the frame-rounded cut, `limit.py` peak limiter, AAC mux, upload copy). `sheet.py` makes labelled
contact sheets of `stills/`; `dbg.mjs` renders one frame with a debug hook (e.g. to drop a batch or the shadows).

Gotchas found this build: a still taken right after a counter lands catches the white reveal flash and looks washed out
(pick still times away from the `EV` landings); a lamp post on a camera path fills the foreground; a molten pool at full
heat blows out to white, so the pool and cube run at heat ~0.8 with a crust.
