# Posting log

| Date posted | Format | Title | Status | Link |
|---|---|---|---|---|
| 2026-11-04 6:00 PM CT | what-if | What if all copper disappeared for 5 seconds? | published | [YouTube](https://www.youtube.com/shorts/BqL5TPm9IHg) · [Metricool](https://app.metricool.com/planner/calendar?blogId=7513806&openWithPostUuid=-5202755937602680592) |
| 2026-11-08 6:00 PM CT | myth-vs-fact | 5 lightning "facts." Only one is true. | scheduled | [Metricool](https://app.metricool.com/planner/calendar?blogId=7513806&openWithPostUuid=-8077389489859703737) |

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
