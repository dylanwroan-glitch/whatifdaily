# Posting log

| Date posted | Format | Title | Status | Link |
|---|---|---|---|---|
| 2026-11-04 6:00 PM CT | what-if | What if all copper disappeared for 5 seconds? | published | [YouTube](https://www.youtube.com/shorts/BqL5TPm9IHg) · [Metricool](https://app.metricool.com/planner/calendar?blogId=7513806&openWithPostUuid=-5202755937602680592) |
| 2026-11-08 6:00 PM CT | myth-vs-fact | 5 lightning "facts." Only one is true. | published | [YouTube](https://www.youtube.com/shorts/y5A5y8id8yk) · [Metricool](https://app.metricool.com/planner/calendar?blogId=7513806&openWithPostUuid=-8077389489859703737) |
| 2026-11-10 6:38 PM CT | scale-shock | If the Sun were a door, where's Earth? | scheduled | [Metricool](https://app.metricool.com/planner/calendar?blogId=7513806&openWithPostUuid=-3128963244922811315) |

## Run notes

### 2026-11-08 (scheduled run, 2:42 AM CT)
- Repo was already cloned at /home/claude/whatifdaily and in scope; the `add_repo` tool wasn't offered in this session, so the run used the existing clone (on `main`, up to date with origin).
- Metricool brand 7513806: YouTube connected. The copper Short shows as PUBLISHED (youtube.com/shorts/BqL5TPm9IHg); marked `published` in queue.json.
- No posts or commits from Nov 5–7; the queue had no `ready` video and nothing was scheduled for today, so today's slot went to the new video.
- Idea: myth vs fact (last format was what-if): 5 lightning claims, 4 myths + 1 true (hotter than the Sun's surface), bonus 5-second rule. Searches found plenty of lightning-myth articles and news clips but no 3D "only one is true" short; angle kept.
- Sources: weather.gov/safety/lightning-myths and the NSSL lightning FAQ couldn't be fetched this run (fetch approval not available unattended), so the facts come from other NWS pages (How Hot Is Lightning?, Understanding Lightning: Thunder, NWS Fort Worth Myths vs. Facts) plus MPR News and Live Science for the Empire State Building figures (both say ~25 strikes a year on average; both report 8 strikes in 24 minutes). Dropped the "metal attracts lightning" myth: no fetchable source. Three captions were reworded to match the source wording exactly (steel frame "gives protection", strikes outside "heavy" rain, "can" heat the air to 50,000°F). Fact sheet: builds/2026-11-08-lightning-facts/facts.md.
- Build: new world (tower city in a storm, car on a wet road, sunny field with a distant cumulonimbus, night field with heat lightning, sun) with a lightning generator and a procedural storm-cloud impostor added to the engine. 19 shots, cuts every 2.3–3.3 s, 57.4 s.
- Quality gate: passed. Contact sheets of 27 stills + 18 frames from the final file; reframed the car shots so the captions no longer cover the tires, lifted the distant storm so it reads between flashes, kept the HUD out of the right 140 px. Final upload file: 1080x1920, 30 fps, 1722 frames, 57.4 s, AAC stereo (peak -2 dB), 24.6 MB.
- Scheduled with Metricool for 2026-11-08 6:00 PM CT (post 420623843); Metricool copied the file to static.metricool.com, so videos/2026-11-08-lightning-facts.mp4 was removed.
- Nothing is queued for tomorrow; tomorrow's run will make its own video and schedule it the same day.

### 2026-11-10 (scheduled run: fired 2:42 AM CT, actually ran from 5:06 PM CT)
- The 2:42 AM firing failed after 7 seconds with "usage limit reached" (scheduled-task status), so nothing ran until the session restarted at 5:06 PM CT. No run left a commit or post on Nov 5–7, 9 or 10 (the Nov 8 run was the only one that finished after Nov 4); the only failure reason on record is today's usage limit.
- Metricool brand 7513806: YouTube connected. Both Shorts published: copper (Nov 4) and lightning (Nov 8, youtube.com/shorts/y5A5y8id8yk); lightning marked `published` in queue.json.
- Queue had no `ready` video and nothing scheduled for today, and 6:00 PM was too close to make a video first, so today's slot goes to the video this run makes, scheduled for now + 20 minutes when it passes the quality gate.
- Idea: scale shock (last format was myth vs fact): NASA's own analogy, "If the Sun were as tall as a typical front door, Earth would be the size of a nickel," carried through to the street, Neptune and the nearest star. Searches found no Short built on the door analogy; scale-of-the-solar-system videos exist, so the angle is the door, the 215 m walk down the street and the 1.4 laps around Earth to Proxima Centauri.
- Sources: NASA Science (Earth, Sun and Neptune fact pages) and NASA Space Place (How Big is the Sun?), quotes read this run; every other number is scale math from those figures, labelled "SCALE MATH · NASA DATA" on screen. The km figure is shown as 57,600 (4.24 ly at door scale) so the counter, caption and math agree. Fact sheet: builds/2026-11-10-sun-door/facts.md.
- Build: new world (porch with a 2 m Sun beside the door, Earth and a nickel on a side table, a suburban street with Earth landing on a mailbox, a town and the Neptune orbit from 24 km up, a warp to a red dwarf, a stylized globe with the trip drawn on it). PyPI and npm were unreachable, so the globe uses hand-drawn simplified coastlines. 16 shots, cuts every 2.2–3.8 s, 47.0 s.
- Quality gate: passed. Stills contact sheets over three passes (moved Earth and the nickel above the caption band, cleared the porch post out of the reveal, fixed the camera blocked by the mailbox, made the aerial climb reach the Neptune ring while it grows, lifted the globe's night side), then 16 frames from the final file. Final upload file: 1080x1920, 30 fps, 1410 frames, 47.0 s, AAC stereo (peak -0.7 dB), 18.6 MB.
- Scheduled with Metricool for 2026-11-10 6:38 PM CT (now + 20 min; post 423851070); Metricool copied the file to static.metricool.com, so videos/2026-11-10-sun-door.mp4 was removed.
- Nothing is queued for tomorrow; tomorrow's run makes and schedules its own video.

