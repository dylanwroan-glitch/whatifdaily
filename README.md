# whatifdaily

Daily code-built YouTube Shorts. A scheduled Claude session follows [PLAYBOOK.md](PLAYBOOK.md): it posts the queued video through Metricool at 6:00 PM Central, then builds and renders the next one.

- `PLAYBOOK.md`: formats, pacing, quality gate, posting settings
- `queue.json`: finished videos waiting to post
- `log.md`: everything posted so far
- `kit/`: the original 3D engine, scene, captions, renderer and soundtrack code
- `videos/`: the next video waiting to post. Metricool copies each file when it's scheduled, then the run deletes it here to keep the repo light.
