// say.mjs — offline narration with Kokoro-82M (Apache-2.0), run on CPU from local files only.
// usage: node say.mjs spec.json outdir
// spec: { "voice": "am_michael", "speed": 1.0, "lines": [ { "id": "l1", "text": "...", "voice"?: "...", "speed"?: 1.0 } ] }
// writes outdir/<id>.wav (24 kHz mono 16-bit) and outdir/lines.json with per-line duration, phonemes and word timing estimates.
import { env } from '@huggingface/transformers';
import { KokoroTTS, TextSplitterStream } from 'kokoro-js';
import fs from 'fs'; import path from 'path';

env.localModelPath = '/home/claude/tools/tts/models/';
env.allowRemoteModels = false;
env.allowLocalModels = true;

const [specPath, outDir] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });

function wav16(samples, sr) {
  const n = samples.length; const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const v = Math.max(-1, Math.min(1, samples[i])); buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2); }
  return buf;
}
// trim leading/trailing near-silence (keep 40 ms pads)
function trim(a, sr) { const thr = 0.006; let s = 0, e = a.length - 1; while (s < a.length && Math.abs(a[s]) < thr) s++; while (e > s && Math.abs(a[e]) < thr) e--;
  const pad = Math.round(0.04 * sr); return a.slice(Math.max(0, s - pad), Math.min(a.length, e + pad)); }

const out = [];
for (const L of spec.lines) {
  const voice = L.voice || spec.voice || 'am_michael', speed = L.speed ?? spec.speed ?? 1.0;
  const t0 = Date.now();
  // stream() returns the phonemes it used, which we keep for word-timing estimates
  let audio = null, phon = '';
  const sp = new TextSplitterStream(); sp.push(L.text); sp.close();
  for await (const r of tts.stream(sp, { voice, speed })) { // one chunk per sentence
    const a = trim(r.audio.audio, r.audio.sampling_rate);
    const gap = new Float32Array(Math.round((L.gap ?? 0.12) * 24000));
    audio = audio ? Float32Array.from([...audio, ...gap, ...a]) : a; phon += (phon ? ' | ' : '') + r.phonemes;
  }
  fs.writeFileSync(path.join(outDir, L.id + '.wav'), wav16(audio, 24000));
  out.push({ id: L.id, text: L.text, voice, speed, dur: +(audio.length / 24000).toFixed(3), phonemes: phon, ms: Date.now() - t0 });
  console.log(L.id, voice, (audio.length / 24000).toFixed(2) + ' s', (Date.now() - t0) + ' ms');
}
fs.writeFileSync(path.join(outDir, 'lines.json'), JSON.stringify(out, null, 1));
