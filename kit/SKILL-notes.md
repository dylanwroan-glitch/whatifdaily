---
name: what-if-video
description: Make a ~60-second "What if ___ for 5 seconds?" 3D short for TikTok/Reels/Shorts from one premise line: premise check, sourced facts, code-built 3D scene, self-review, render, sound, captions.
---

# What-if 3D video

Use when the user sends a "what if" premise (or asks Claude to pick one) and wants a finished vertical video. Output: one 1080x1920, 30 fps MP4 of 61–65 s with synthesized sound, plus a ready-to-paste post caption and a sources list.

If the user attaches or links `whatif-kit.zip` (engine.js, world.js, scene.js, hud.js, index.html, render.mjs, audio.py), unzip it into a fresh folder and reuse it: change the story in `scene.js` and `hud.js`, add objects in `world.js`. Otherwise rebuild the same architecture from the notes below.

## 1. Premise check (before anything else)
- Web-search the exact premise plus "for 5 seconds" (TikTok, YouTube, news write-ups). Oxygen, gravity, helium, Earth stops spinning, friction are all taken.
- If it's taken, offer a fresh twist. Prefer premises with one strong visual (a landmark changes, a city goes dark) and consequences that are dramatic but not gory.
- Tell the user in one line what you found ("couldn't find any video with this premise").

## 2. Fact sheet
- Every number on screen gets a primary source (agency, official site, major outlet). Keep `facts.md`: on-screen wording, source name, URL.
- Show `SOURCE · NAME` under each fact caption.
- When official pages disagree (e.g., different NPS pages give different statue copper weights), use a figure they agree on or drop it.
- Label scenario logic as logic, not fact.

## 3. Storyboard (61–65 s)
- TikTok Creator Rewards only pays on videos of at least 1 minute (also 18+, 10K followers, 100K views in 30 days; check current rules).
- Beats: hook title over the establishing shot (0–6 s) → context with one stat (6–13) → 3-2-1 countdown → event at T+0.00 with a slow-motion clock → "SAME INSTANT · <place>" replays, one fact each → "T+5.00 s: <thing> is back" → sourced twist ending → end card "What should disappear next?".
- Captions ≤ 12 words, one idea, 2.5–3.5 s each. Safe zone on 1080x1920: captions around y 1110–1450; keep the right 140 px and bottom 420 px clear; HUD (clock, gauge, chips) at the top.

## 4. Build the scene in code
Environment notes:
- Running outside JS libraries (three.js from GitHub/CDNs) gets blocked, and pip/npm may be blocked. Write an original WebGL2 renderer. Chrome, Playwright (`/opt/npm-tools/node_modules/playwright/index.mjs`), ffmpeg, numpy and scipy are preinstalled.
- Headless Chrome flags: `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --disable-gpu-sandbox`. WebGL2, EXT_color_buffer_float (HDR) and 4x MSAA work.

Renderer design that works:
- Instanced meshes, 20 floats per instance: pos+kind, quaternion, scale+seed, rgb+roughness, 4 extras. Unit cube, single cube faces, lathe, sphere, extruded star prism.
- Materials are integer "kinds": plain, building with procedural hash windows (fade to a coarse average when fwidth > 0.35 to stop shimmer), emissive gated by a grid-power uniform (per-object random threshold so lights can return block by block), billboard, voxel skin with dissolve threshold + glowing edge, metal, wood, procedural roads with lamp pools, particles.
- Compile one shader variant per batch's set of kinds (`#define K<n>`). SwiftShader runs every branch for every pixel, so a single uber-shader was 4–5x slower. Keep `discard` only in a separate CUT variant.
- Each frame, CPU frustum + horizon-occlusion culling and front-to-back sort for city buildings (1,400 → ~250 drawn).
- 1280² directional shadow map limited to the hero object; planar water reflection at half resolution; 3-level bloom; ACES; grain; vignette.
- Render the 3D canvas at 720x1280 and let CSS scale it to 1080x1920 so the DOM HUD stays sharp. Expect 1–2 s per frame on 2 vCPUs (a 64 s video is about 45 min).
- Landmarks: union of oriented boxes, ellipsoids and capsules → voxelize on a 0.5-unit grid → keep surface voxels → draw only exposed faces. Store each voxel's dissolve order in its seed so CPU particles spawn exactly when it vanishes.
- One deterministic `frameState(t)` returns scene + camera for any time; the HUD is driven from the same `t`. Any frame can be re-rendered alone.

## 5. Check frames before the full render
- Render stills at the busiest moments (title, each event, each caption, before/after pairs) and look at them as a contact sheet.
- Fix exposure first (window emissive ~1.5, bloom ~0.4, threshold ~1.5, floodlights ~1.5), then framing: keep the subject out from under the clock and captions, and check the before/after change is obvious at phone size.
- Make the HUD and the visuals agree (a "same instant" replay resets the clock; the copper gauge drops when the event hits).

## 6. Render
- Playwright loop: `page.evaluate(renderAt(t))` → `page.screenshot({type:'jpeg', quality:92})` → pipe into one ffmpeg per shot: `-f image2pipe -framerate 30 -c:v mjpeg -i - -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p`. Write `.tmp.mp4`, rename when ffmpeg exits 0.
- Run it in the background and do the sound meanwhile; check the first finished shot before waiting on the rest.

## 7. Sound (numpy/scipy, no samples)
- Ambience per location (water, wind, city hum), pad + pluck score building to the countdown, hard cut at the event (sub sweep, power-down sweep, crackle, tinnitus ring), shimmer on dissolves, reverse whooshes into reveals, accelerating ticks under a time-lapse, hopeful chords at the end.
- Convolution reverb from decaying noise. Mix to about −17 dBFS RMS with a soft-knee limiter at −1 dBFS. Print loudness per second to check the arc.

## 8. Assemble and verify
- `ffmpeg -f concat -safe 0 -i list.txt -c copy video.mp4`, then `-map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k`.
- Verify duration and frame count with ffprobe, view a 12-frame contact sheet from the final file, and re-check each on-screen fact against `facts.md`.

## 9. Deliver
- Send the MP4, a post caption with hashtags and the sources list, and offer the next premise.
