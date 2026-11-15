#!/bin/bash
# assemble.sh — concat the shots in timeline order, retime the score to the frame-rounded cut, mux, and make the upload copy.
set -e
cd "$(dirname "$0")"
ORDER="H_hook A_cloud A_clear B_globe B_count C_drop C_city C_ocean C_desert D_total D_cube D_lake E_tease E_reveal E_inch F_why F_refill F_end"
: > out/list.txt; for s in $ORDER; do echo "file '$s.mp4'" >> out/list.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i out/list.txt -c copy out/video.mp4
VD=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/video.mp4)
AD=$(python3 -c "import json;print(json.load(open('timeline.json'))['DURATION'])")
TEMPO=$(python3 -c "print('%.6f' % ($AD / $VD))")
echo "video $VD s, score $AD s, atempo $TEMPO"
ffmpeg -y -loglevel error -i sound.wav -af "atempo=$TEMPO" -ar 48000 -ac 2 -c:a pcm_s16le out/sound_rt.wav
python3 limit.py out/sound_rt.wav out/sound_lim.wav -4.5
ffmpeg -y -loglevel error -i out/video.mp4 -i out/sound_lim.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/final.mp4
ffmpeg -y -loglevel error -i out/final.mp4 -c:v libx264 -crf 23 -preset medium -maxrate 3.5M -bufsize 7M -pix_fmt yuv420p -r 30 -c:a copy -movflags +faststart out/upload.mp4
ls -la out/final.mp4 out/upload.mp4
