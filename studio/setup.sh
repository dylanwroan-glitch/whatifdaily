#!/bin/bash
# setup.sh — installs the studio's free, local tools: Kokoro-82M text-to-speech (narration) and Whisper small
# (transcription for voice QC and caption timing). Cloud sessions start empty, so run this once at the start of every
# session; it skips anything already installed. About 350 MB of downloads, 1–3 minutes.
#
# Where the files come from. This sandbox can reach the npm registry and PyPI but not huggingface.co or github.com,
# so the model weights come from npm packages that mirror the official files:
#   - Kokoro-82M v1.0 q8 ONNX (Apache-2.0, onnx-community/Kokoro-82M-v1.0-ONNX) from the npm package kokoro-q8-shards,
#     the Kokoro tokenizer from expo-kokoro (MIT), runtime kokoro-js (Apache-2.0)
#   - Whisper small, CTranslate2 int8 conversion (MIT) from @skillninja/shortmovie-telop-model-p0..p3
# Both are third-party mirrors. The hashes below pin the exact files used to make the pilots, so a changed upload
# is caught, but they come from the mirrors themselves. On a machine that can reach Hugging Face (the Mac Studio),
# download the weights from the official repositories instead and point STUDIO_TTS / STUDIO_WHISPER at them.
set -euo pipefail
TOOLS=${STUDIO_TOOLS:-/home/claude/tools}
TTS=$TOOLS/tts; ASR=$TOOLS/asr; M=$TTS/models/onnx-community/Kokoro-82M-v1.0-ONNX; W=$ASR/whisper-small
KOKORO_SHA=fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478
TOKENIZER_SHA=d028576fe43404f21c4791addc9a0bf3a72ff5a65dfd01df743b565975ac3e0e
WHISPER_SHA=ca732cb1379efc49417d028465f543d83a39de2c61f3027678de103dc404ce73
mkdir -p "$TTS" "$M/onnx" "$W" "$ASR/pkgs"
ok() { echo "$1  $2" | sha256sum -c --quiet - ; }

# ---- 1. Kokoro TTS ----
if [ ! -f "$M/onnx/model_quantized.onnx" ] || ! ok $KOKORO_SHA "$M/onnx/model_quantized.onnx" 2>/dev/null; then
  echo "installing Kokoro…"
  ( cd "$TTS"; [ -f package.json ] || npm init -y > /dev/null; npm install --silent --no-audit --no-fund kokoro-js@1.2.1 kokoro-q8-shards@1.0.0 )
  cat "$TTS"/node_modules/kokoro-q8-shards/kokoro-q8.part{0..5}.bin > "$M/onnx/model_quantized.onnx"
fi
ok $KOKORO_SHA "$M/onnx/model_quantized.onnx"
if [ ! -f "$M/tokenizer.json" ]; then
  T=$(mktemp -d); ( cd "$T"; npm pack --silent expo-kokoro@1.1.9 > /dev/null; tar xzf expo-kokoro-1.1.9.tgz package/src/tokenizer.json ); cp "$T/package/src/tokenizer.json" "$M/tokenizer.json"; rm -rf "$T"
fi
ok $TOKENIZER_SHA "$M/tokenizer.json"
echo '{"model_type":"style_text_to_speech_2","architectures":["StyleTextToSpeech2Model"]}' > "$M/config.json"
echo '{"model_max_length":512,"pad_token":"$","tokenizer_class":"PreTrainedTokenizer","clean_up_tokenization_spaces":false}' > "$M/tokenizer_config.json"

# ---- 2. Whisper small (CTranslate2 int8) ----
if [ ! -f "$W/model.bin" ] || ! ok $WHISPER_SHA "$W/model.bin" 2>/dev/null; then
  echo "installing Whisper small…"
  for i in 0 1 2 3; do
    T=$(mktemp -d); ( cd "$T"; npm pack --silent @skillninja/shortmovie-telop-model-p$i@1.0.0 > /dev/null; tar xzf *.tgz )
    rm -rf "$ASR/pkgs/p$i"; mv "$T" "$ASR/pkgs/p$i"
  done
  cat "$ASR/pkgs/p0/package/model.bin.part0" "$ASR/pkgs/p1/package/model.bin.part1" "$ASR/pkgs/p2/package/model.bin.part2" "$ASR/pkgs/p3/package/model.bin.part3" > "$W/model.bin"
  cp "$ASR"/pkgs/p0/package/{config.json,tokenizer.json,vocabulary.json,preprocessor_config.json} "$W/"
  rm -rf "$ASR/pkgs"
fi
ok $WHISPER_SHA "$W/model.bin"

# ---- 3. Python packages ----
python3 -c "import faster_whisper, pyloudnorm, scipy, PIL" 2>/dev/null || pip install -q --break-system-packages faster-whisper==1.1.1 pyloudnorm scipy pillow

echo "studio tools ready in $TOOLS (Kokoro $(du -h "$M/onnx/model_quantized.onnx" | cut -f1), Whisper $(du -h "$W/model.bin" | cut -f1))"
