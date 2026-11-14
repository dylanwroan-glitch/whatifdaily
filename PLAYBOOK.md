# Daily Shorts Playbook

This repo runs a YouTube Shorts channel on autopilot. **3 posts a day** at 10:00 AM, 2:00 PM and 6:00 PM America/Chicago (the user asked for at least 3 a day on 2026-11-13; those are the busiest hours in Metricool's best-time data). A scheduled Claude session runs 3 times a day; each run fills open slots from the queue and makes one new video. Everything is built in code: no stock footage, no AI video, no copied music.

Channel lane: mind-blowing science, engineering, history and "what if" scenarios in under a minute. Every video is a different idea with real, sourced numbers.

## Daily run, in order

### 0. Set up
0. Check the real time before anything else: compare `date` with an HTTP `Date` header (`curl -sI https://pypi.org/simple/ | grep -i date`). On 2026-11-13 the run fired at 2:42 AM CT, hit the usage limit, and only resumed at ~5 PM.
1. `add_repo` dylanwroan-glitch/whatifdaily with push access, clone it to `/home/claude/repo`, read this file, `queue.json` and `log.md`.
2. Metricool: `getBrandSettings`; the brand is blogId `7513806`. Check YouTube is connected. If it isn't, keep going (make the video and queue it), but message the user at the end: "Connect YouTube here: https://app.metricool.com/brands/connections?blogId=7513806".

### 1. Fill the open slots first
- Slots: 10:00 AM, 2:00 PM and 6:00 PM America/Chicago, every day. A slot is taken if `queue.json` has an entry `scheduled` for it or Metricool `getScheduledPosts` shows a post at that time. Never put two videos in one slot.
- For each open slot in the next 24 hours that is at least 20 minutes away, take the oldest `ready` entry and schedule it with `createScheduledPost` (settings below). Missed slots are skipped, not back-filled.
- On success set `status` to `scheduled`, store `postDate` and `plannerUrl`, add a row to `log.md`, commit, push.
- Metricool copies the video into its own storage when you schedule (the response's `media` shows a `static.metricool.com` URL). Once that happens, `git rm` the file from `videos/` in the same commit so the repo stays light.

### 2. Make the next video
Claim the idea first: as soon as you've picked it, add an `in progress` row to `log.md` and push, so a run that overlaps with yours picks something else. Follow the sections below, then:
- Host: commit the upload file to `videos/<YYYY-MM-DD>-<slug>.mp4` on `main` and push. GitHub releases are blocked for these sessions. Media URL: `https://raw.githubusercontent.com/dylanwroan-glitch/whatifdaily/main/videos/<file>`. Keep the upload file at 25 MB or less (`-crf 23 -preset medium -maxrate 3.5M -bufsize 7M`) so the repo history stays small, and tell the user if the repo passes 1 GB (`gh api repos/dylanwroan-glitch/whatifdaily --jq .size` is in KB).
- Add an entry to `queue.json` (same fields as the existing entries) with `status: "ready"`, then commit and push. Commit straight to `main`: this repo is the pipeline's storage. Don't create other branches: these sessions can't delete branches, so they'd pile up.
- Another run may have pushed while you worked: `git pull --rebase` before every push. Pushes sometimes fail with a transient server error; retry the same push up to 3 times before treating it as a failure.
- Schedule it into the earliest open slot at least 20 minutes away (step 1 rules). If none is open in the next 24 hours, leave it `ready` for the next run.

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
3. **Ranked countdown.** 5 items, about 5–7 s each (3 quick shots per item), big sourced numbers, the biggest saved for last.
4. **Simulation.** "What actually happens if…" physics with real numbers (a penny dropped off a skyscraper, a phone at the bottom of the ocean).
5. **Hidden in plain sight.** Teardown of an everyday object (a dollar bill, a credit card chip, a lightbulb).
6. **Time-lapse.** Decades compressed into 50 s (a skyline growing, a coastline changing).
7. **Myth vs fact.** Rapid-fire, 5–6 myths, each busted with a source.

## Make it impossible to scroll past (fast viral-explainer style, from 2026-11-13)
The user's feedback on the first 5 videos: too slow, can get boring, needs sound effects, should hold short attention spans like the viral explainer channels. The best video had ~1.2k views; the goal is millions. So:
- **30–40 s long** (45 s max). Every shot lasts 1.2–1.8 s and cuts on the beat; build the timeline on a beat grid (e.g. 2 half-bars at 140 BPM = 1.71 s).
- **Frame 1 hits:** hook title + camera motion + an impact sound, no fade-in. The hook opens a curiosity gap that only the ending closes (e.g. "Where's the coldest place in the universe?" + "HINT: #1 IS MAN-MADE").
- **Countdowns and big numbers slam in:** a white flash, a quick glitch and a zoom punch on every reveal; a counter that rolls to the number with tick sounds and lands with a ding.
- **Captions pop in word by word** (10 words or fewer, one idea, the key number in gold) with a `SOURCE · NAME` line under every number.
- **Sound on everything:** a whoosh into every cut and a thump on it, an impact + clang on each reveal, risers and reverse cymbals before big moments, set-specific effects (wind, ice cracks, laser zaps, glitches, heartbeats). A driving beat (130–150 BPM) under it all; drop the beat out for 2–3 s before the payoff, then slam back in.
- **Payoff in the last 10 s**, then end on a question ("Which one shocked you most?") over a frame that glides back to the first frame so the Short loops.
- Something new on screen at least every 1.5 s: a cut, a reveal, a label, a counter, a camera punch.
- Narration: a voiceover would make these closer to the viral explainers, but no TTS voice can be downloaded unattended (the sandbox refused the open-source model download on 2026-11-13). Add one only once the user approves a voice source.

## Quality gate (must pass before anything is queued)
1. Render 12+ stills at the busiest moments and look at them as a contact sheet. Check that the subject reads at phone size, nothing is blown out to white or crushed to black, captions don't cover the subject, and the HUD stays in the safe zone (captions around y 1110–1450; keep the right 140 px and bottom 420 px clear).
2. Fix and re-check. If it still fails after the second pass, simplify the scene rather than ship something broken.
3. Every on-screen number is in `facts.md` for that video with its source. Re-read each one against the source before rendering.
4. After assembly, ffprobe shows 1080x1920, 30 fps, 30–45 s and an audio stream. View a 12-frame contact sheet from the final file.
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
- Render each shot to its own MP4 (JPEG frames piped to ffmpeg), concat with `-c copy`, mux the audio, lower it ~1.5 dB if AAC peaks at 0 dB, then make the upload copy (25 MB or less, settings above).
