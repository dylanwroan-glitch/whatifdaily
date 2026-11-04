# Daily Shorts Playbook

This repo runs a YouTube Shorts channel on autopilot. A scheduled Claude session runs once a day, posts the video that's waiting in the queue, then makes tomorrow's video. Everything is built in code: no stock footage, no AI video, no copied music.

Channel lane: mind-blowing science, engineering, history and "what if" scenarios in under a minute. Every video is a different idea with real, sourced numbers.

## Daily run, in order

### 0. Set up
1. `add_repo` dylanwroan-glitch/whatifdaily with push access, clone it to `/home/claude/repo`, read this file, `queue.json` and `log.md`.
2. Metricool: `getBrandSettings`; the brand is blogId `7513806`. Check YouTube is connected. If it isn't, keep going (make the video and queue it), but message the user at the end: "Connect YouTube here: https://app.metricool.com/brands/connections?blogId=7513806".

### 1. Post today's video first
- Today's slot = 6:00 PM America/Chicago. If an entry in `queue.json` is already `scheduled` for today, the slot is taken: skip to step 2.
- Otherwise take the oldest `ready` entry and schedule it with `createScheduledPost` (settings below). If 6:00 PM is less than 20 minutes away or already past, use now + 20 minutes.
- On success set `status` to `scheduled`, store `postDate` and `plannerUrl`, add a row to `log.md`, commit, push.
- If Metricool rejects the media URL, commit the MP4 into `videos/` and retry once with its raw URL `https://raw.githubusercontent.com/dylanwroan-glitch/whatifdaily/main/videos/<file>`.

### 2. Make the next video
Follow the sections below, then:
- Upload: `gh release create v<YYYY-MM-DD>-<slug> <file>.mp4 --repo dylanwroan-glitch/whatifdaily --title "<title>" --notes "<sources>"`. Media URL: `https://github.com/dylanwroan-glitch/whatifdaily/releases/download/v<YYYY-MM-DD>-<slug>/<file>.mp4`.
- Add an entry to `queue.json` with `status: "ready"`, then commit and push.
- If today's slot is still empty, schedule this new video right away (step 1 rules).

### 3. Report
Send the user one short message: what's scheduled to post and when, what got queued, and anything that went wrong.

## Picking the idea
- Check `log.md` and never repeat a topic. Don't use the same format two days in a row.
- Web-search the idea before committing. If a near-identical viral video exists, change the angle.
- Good ideas have one huge, true number, something everyone recognizes (a landmark, a coin, the Moon, a phone), and a twist ending.
- Off-limits: gore, injury, real people's faces or voices, brands, logos, cartoon characters, politics, medical or money advice, scary content aimed at kids.

Formats, all buildable with the kit (3D engine for scenes, the HTML HUD layer for motion graphics):
1. **What if ___ for 5 seconds?** A thing vanishes or changes; same-instant replays in 2–3 places; a sourced twist. The copper video is the reference.
2. **Scale shock.** True relative sizes with fast zoom-outs ("If Earth were a marble, where's the Moon?").
3. **Ranked countdown.** 5 items, about 8 s each, big sourced numbers, the biggest saved for last.
4. **Simulation.** "What actually happens if…" physics with real numbers (a penny dropped off a skyscraper, a phone at the bottom of the ocean).
5. **Hidden in plain sight.** Teardown of an everyday object (a dollar bill, a credit card chip, a lightbulb).
6. **Time-lapse.** Decades compressed into 50 s (a skyline growing, a coastline changing).
7. **Myth vs fact.** Rapid-fire, 5–6 myths, each busted with a source.

## Make it impossible to scroll past
- Frame 1 already shows the hook text and motion. No fade from black, no logo, no slow build.
- The title on screen is 8 words or fewer and asks a question or states a shocking number.
- Something changes every 2–3 seconds: a cut, a reveal, a zoom, a counter. The camera is always moving.
- Captions are 10 words or fewer, one idea each, with the key number highlighted. Put a `SOURCE · NAME` line under every number.
- Put a sound hit on every cut and reveal. Music builds, then drops at the big moment.
- Payoff or twist in the last 8 seconds. End on a question ("Which one surprised you?") or a frame that loops back to the start.
- Length 45–62 s, 1080x1920, 30 fps.
- The copper video's 6–15 s shots are too slow. Cut faster than that.

## Quality gate (must pass before anything is queued)
1. Render 12+ stills at the busiest moments and look at them as a contact sheet. Check that the subject reads at phone size, nothing is blown out to white or crushed to black, captions don't cover the subject, and the HUD stays in the safe zone (captions around y 1110–1450; keep the right 140 px and bottom 420 px clear).
2. Fix and re-check. If it still fails after the second pass, simplify the scene rather than ship something broken.
3. Every on-screen number is in `facts.md` for that video with its source. Re-read each one against the source before rendering.
4. After assembly, ffprobe shows 1080x1920, 30 fps, 45–62 s and an audio stream. View a 12-frame contact sheet from the final file.
5. If the video can't pass, don't queue it. Log the failure in `log.md` and tell the user.

## Posting settings (Metricool `createScheduledPost`)
- `blogId`: `7513806`. Top-level `date`: ISO 8601 with offset, e.g. `2026-11-05T18:00:00-06:00`.
- `info`:
  - `providers`: `[{"network":"youtube"}]`, `autoPublish`: true, `draft`: false
  - `media`: `[<release asset URL>]`
  - `text`: hook line + 2 sentences about the video + `Sources: ...` + `#shorts` and 3–5 topic hashtags
  - `publicationDate`: `{"dateTime":"YYYY-MM-DDTHH:mm:ss","timezone":"America/Chicago"}`
  - `youtubeData`: `{"title": "<≤100 chars, true to the video>", "type": "short", "privacy": "public", "madeForKids": false, "category": "SCIENCE_TECHNOLOGY" | "EDUCATION" | "ENTERTAINMENT", "tags": [...], "isAiGeneratedContent": false}`
  - Set `isAiGeneratedContent` to true only if a video ever uses realistic synthetic footage. The code-built 3D and motion graphics here are stylized.

## YouTube rules to stay inside
YouTube doesn't monetize mass-produced or repetitive content (templated videos with minimal variation). Keep it from looking templated: a new idea and new visuals every day, real research, and rotating formats. Don't reuse the same scene with a different caption.

## Building (see `kit/` and `kit/SKILL-notes.md`)
- `kit/` holds the original WebGL2 engine (`engine.js`), objects (`world.js`), the copper story (`scene.js`), captions and HUD (`hud.js`, `index.html`), the renderer driver (`render.mjs`) and the synthesized soundtrack (`audio.py`). Copy it to a fresh work folder for each video and rewrite `scene.js`/`hud.js`/`audio.py` for the new story.
- The sandbox blocks outside JS libraries and often pip/npm. Chrome, Playwright (`/opt/npm-tools/node_modules/playwright/index.mjs`), ffmpeg, numpy and scipy are there.
- Speed rules that matter: one shader variant per set of material kinds, `discard` only in the cut variant, cull and sort city buildings every frame, render the 3D at 720x1280 under the 1080x1920 HUD. Expect about 1–2 s per frame; keep scenes light enough that the render finishes in under 45 minutes.
- Render each shot to its own MP4 (JPEG frames piped to ffmpeg), concat with `-c copy`, mux the audio, lower it ~1.5 dB if AAC peaks at 0 dB, then make the upload copy (`-crf 21 -preset medium`, about 45 MB).
