# What-If 3D Video Kit (original code, no outside 3D libraries)

Makes a 64-second vertical (1080x1920, 30 fps) "What if ___ for 5 seconds?" short from code:
a WebGL2 renderer draws the 3D scene, an HTML layer draws captions/clock/gauge, headless Chrome
captures frames, ffmpeg encodes, and Python synthesizes the soundtrack.

## Files
- `engine.js`  WebGL2 renderer: instanced cubes, per-material shader variants, shadows, water reflections, bloom.
- `world.js`   Objects: voxel Statue of Liberty + Eiffel skeleton, procedural Manhattan, traffic, pennies, candle.
- `scene.js`   The story: shots, camera paths, lighting, event times (edit this for a new premise).
- `hud.js`     Captions, sources, clock, gauge, countdown (edit the CAPS list).
- `index.html` Page + HUD styling.
- `render.mjs` Renders stills or full shots (Playwright + ffmpeg).
- `audio.py`   Synthesized score and sound effects (numpy + scipy).
- `facts.md`   Every on-screen number with its source.

## Run it on a computer
Needs Node 18+, Google Chrome, ffmpeg, Python 3 with numpy + scipy.
```
npm i playwright
node render.mjs stills 3 16.6 27 41.5 50      # check frames -> stills/
node render.mjs shots                          # all shots -> out/*.mp4
python3 audio.py sound.wav
cd out && printf "file '%s'\n" A_harbor.mp4 B_fly.mp4 C_street.mp4 D_liberty.mp4 E_pennies.mp4 F_return.mp4 G_timelapse.mp4 > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy video.mp4
ffmpeg -i video.mp4 -i ../sound.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest final.mp4
```
On a computer with a real GPU set `GPU=1` to skip the software renderer and add `Q="?w=1080&h=1920&msaa=4"` for a full-resolution 3D pass.
Set `CHROME=/path/to/chrome` if Chrome isn't found automatically.
