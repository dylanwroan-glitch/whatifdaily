# Studio: how a Short gets made (v2)

This replaces the old "fast style" routine in `PLAYBOOK.md`, which is paused. Nothing in this folder publishes anything.
A video reaches the channel only after the owner has watched it and approved it.

The three pilots in `pilots/` were made with exactly these steps:

| Pilot | What it is | Length |
|---|---|---|
| `p1-eiffel` | Narrated cinematic explainer, code-built 3D | 43.9 s |
| `p2-phone` | Animated character comedy, two voices, lip-sync | 28.9 s |
| `p3-noir` | Fair-play mystery, five voices | 40.8 s |

## What runs where, and what it costs

Everything below is free and runs on the session's own CPU. There are no API fees and no subscriptions.

| Job | Tool | Licence | Notes |
|---|---|---|---|
| Narration and character voices | Kokoro-82M v1.0 (q8 ONNX) via `kokoro-js` | Apache-2.0 | 54 stock voices. About 1–3 s per line on 2 vCPU. Voices are synthetic stock voices, not clones of anyone. |
| Voice QC and caption timing | Whisper small (CTranslate2 int8) via `faster-whisper` | MIT | Used twice per line: a blind transcript to catch mispronunciations, then a scripted pass for word timings. |
| Picture | HTML canvas (2D) or WebGL (3D) in headless Chromium, frames piped to ffmpeg | — | 2D renders at about 0.15 s per frame. The 3D Eiffel scenes take 2.5–4 s per frame on SwiftShader. |
| Music and sound effects | `lib/audiolib.py`: numpy/scipy synthesis | Original | Every note and effect is generated, so there are no licensing questions. It is also clearly less rich than produced library music (see Limitations). |
| Mixing and mastering | `lib/audiolib.py`: voice chain, sidechain ducking, −14 LUFS master, −1.5 dBTP limiter | — | |
| Fonts | Montserrat, Anton, Luckiest Guy, Bangers, Special Elite | OFL / Apache | See `fonts/LICENSES.md`. |

Paid upgrades exist but are **off** until the owner approves them. Examples are ElevenLabs-quality voices and AI music or video through Higgsfield credits. See the review doc for options and costs.

## Steps (one folder per video)

```
studio/pilots/<slug>/            (later: studio/videos/<date>-<slug>/)
  brief.md        idea, format, hook, payoff, sources, why it should work (evidence, with links)
  lines.json      the script: one entry per spoken line
  vo/             narration wavs + word timings + qc.json            (wavs not committed; re-made by voice.py)
  plan.py         turns the voice timings into the edit: shots, events, caption pages → edit.json, build/edit.js
  build/          the picture: index.html + scene.js (exports setup, renderAt, META)
  audio.py        score + effects + mix → mix.wav                     (not committed)
  out/final.mp4   the upload file                                     (not committed)
```

0. **Set up the tools.** A fresh cloud session starts empty: `bash studio/setup.sh`. It takes about 40 s and checks the sha256 of every model file.
1. **Brief.** Pick the idea and the format. Write the hook (the first 2 seconds), the payoff, and the sources.
   - Every number on screen needs a source in `brief.md` or `facts.md`.
   - Don't invent trends or statistics. A "why now" claim needs a link and a date.
2. **Script → `lines.json`.** Each line has these fields: `{id, who, voice, speed, text, emph: [words to highlight], src: "on-screen source label"}`.
   - Write for the ear: short sentences, numbers spelled out the way they should be said.
   - The first line is the hook and should be under about 3 seconds.
3. **Voice.** Run `python3 studio/voice.py pilots/<slug>/lines.json pilots/<slug>/vo`.
   - Every line marked `CHECK` must be fixed. Reword it, respell it ("tonnes" is fine, "Candelight" is not), or change the speed. Then re-run just that id: `... vo p4`.
4. **Edit plan.** `python3 pilots/<slug>/plan.py` sets up the shots:
   - Each shot is its line plus a lead-in and a tail, rounded to whole frames.
   - Events (`EV`) such as counters, stamps and reveals come from word timings, so the picture lands on the spoken word.
5. **Picture.** Build `build/scene.js`, then look at stills before rendering anything long:
   `node studio/lib/render2d.mjs pilots/<slug>/build --stills <dir> 0.5 4.0 9.3 …`
   - Check the hook frame, every shot, and every caption that sits over a busy part of the picture.
6. **Sound.** Run `python3 pilots/<slug>/audio.py`.
   - Voice first. Music ducks about 9 dB under the voice.
   - Effects must not cover a spoken word. Use QC step 8 to catch this; the "gray icons" sweep in p2 was moved for this reason.
7. **Render and mux.** For 2D: `node studio/lib/render2d.mjs pilots/<slug>/build pilots/<slug>/out/video.mp4`, then:
   `ffmpeg -i out/video.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart out/final.mp4`
   - Never let two processes write the same output file.
8. **QC.** Run `python3 studio/qc.py out/final.mp4 --lines lines.json`. Every check must pass. It covers:
   - specs, duration, loudness and true peak
   - dead air, black frames and frozen frames
   - a blind transcription of the finished mix against the script
   
   Then someone actually looks at the contact sheet it writes, plus full-size frames at the hook, the payoff and the end. A video is not "checked" until that has happened, and the review notes say what was looked at.
9. **Review gate.** Send `final.mp4`, the QC output and honest notes to the owner. Only approved videos get scheduled in Metricool, with title, description, AI-content disclosure as needed, and no misleading claims.

## Roles (how the work splits between agents)

| Role | Does | Can run in parallel |
|---|---|---|
| Researcher | Trend scan, idea list, fact sourcing with links | Yes: one web agent per idea or fact set |
| Writer | Hook options, script, `lines.json` | — |
| Voice | `voice.py`, fixes `CHECK` lines | — |
| Director/editor | `plan.py`, scene, stills review | Scenes for different videos in parallel |
| Sound | `audio.py` | Yes, while the picture renders |
| Renderer | Renders and muxes | Split long 3D renders by shot across processes |
| QC reviewer | `qc.py`, plus a **fresh agent** that gets only the final file, the script and the sources (no production notes) and reports what is wrong | Yes |
| Producer | Scheduling (after approval), analytics log, experiment tracking | — |

## Quality bar (a video is not done until all of these hold)

- The hook works with the sound off: the first frame has a readable question or tension.
- Every spoken word is captioned in sync, and captions never cover the thing the line is about.
- Every fact on screen is sourced, and no "experiment" is shown that never happened.
- `qc.py` passes. Narration is intelligible over the mix: at most 2 words or 4% missed by a blind transcription.
- The end is not a frozen frame, and the loop back to the start isn't jarring.
- Original characters, music and visuals only. No real person's voice or likeness, and no third-party clips.
