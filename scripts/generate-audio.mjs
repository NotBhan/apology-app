/**
 * Generates small, loopable ambient beds for /public/audio.
 * Run: node scripts/generate-audio.mjs
 *
 * These are synthesised from sine partials + slow LFOs, so the repo carries no
 * third-party audio and the app streams nothing from external services.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const RATE = 22050;
const DURATION = 24;
const OUT = join(process.cwd(), "public", "audio");

const TRACKS = {
  "soft-lavender": {
    root: 174.61, // F3
    chord: [1, 1.25, 1.5, 1.888], // Fmaj7-ish
    bell: [2, 2.5, 3, 3.75],
    lfo: 0.055,
    warmth: 0.62,
  },
  "paper-morning": {
    root: 196.0, // G3
    chord: [1, 1.2, 1.5, 1.8],
    bell: [2, 2.4, 3, 4],
    lfo: 0.07,
    warmth: 0.52,
  },
  "midnight-glow": {
    root: 146.83, // D3
    chord: [1, 1.189, 1.498, 1.782],
    bell: [2, 2.378, 3, 3.564],
    lfo: 0.032,
    warmth: 0.74,
  },
  "sunlit-room": {
    root: 220.0, // A3
    chord: [1, 1.25, 1.5, 2],
    bell: [2, 2.5, 3, 4],
    lfo: 0.085,
    warmth: 0.42,
  },
};

function renderTrack({ root, chord, bell, lfo, warmth }) {
  const frames = RATE * DURATION;
  const buffer = new Float32Array(frames);

  for (let i = 0; i < frames; i += 1) {
    const t = i / RATE;
    const fadeIn = Math.min(1, t / 2.2);
    const fadeOut = Math.min(1, (DURATION - t) / 2.2);
    const envelope = Math.min(fadeIn, fadeOut);

    let sample = 0;

    chord.forEach((ratio, index) => {
      const freq = root * ratio;
      const drift = 1 + 0.0016 * Math.sin(2 * Math.PI * (0.021 + index * 0.004) * t);
      const amp = (0.17 / (index + 1.2)) * (1 + 0.2 * Math.sin(2 * Math.PI * lfo * t + index));
      sample += Math.sin(2 * Math.PI * freq * drift * t) * amp;
      // soft octave shimmer
      sample += Math.sin(2 * Math.PI * freq * 2 * t) * amp * 0.12 * warmth;
    });

    // sparse bell arpeggio, one note every 3s
    const step = Math.floor(t / 3) % bell.length;
    const sinceStep = t % 3;
    if (sinceStep < 3) {
      const bellFreq = root * bell[step] * 2;
      const bellEnv = Math.exp(-sinceStep * 1.35);
      sample += Math.sin(2 * Math.PI * bellFreq * t) * 0.055 * bellEnv * warmth;
      sample += Math.sin(2 * Math.PI * bellFreq * 2.01 * t) * 0.02 * bellEnv;
    }

    // gentle low pad
    sample += Math.sin(2 * Math.PI * (root / 2) * t) * 0.05;

    buffer[i] = sample * envelope * 0.9;
  }

  // Normalise then 16-bit encode
  let peak = 0;
  for (let i = 0; i < frames; i += 1) peak = Math.max(peak, Math.abs(buffer[i]));
  const gain = peak > 0 ? 0.82 / peak : 1;

  const bytes = 44 + frames * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(bytes - 8, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(frames * 2, 40);

  const data = Buffer.alloc(frames * 2);
  for (let i = 0; i < frames; i += 1) {
    const value = Math.max(-1, Math.min(1, buffer[i] * gain));
    data.writeInt16LE(Math.round(value * 32767), i * 2);
  }

  return Buffer.concat([header, data]);
}

mkdirSync(OUT, { recursive: true });

/**
 * Writes a WAV, then compresses it to a 64 kbps mono MP3 so the repo and the
 * mobile bundle stay small. Requires ffmpeg; without it the WAV is kept.
 */
for (const [name, config] of Object.entries(TRACKS)) {
  const wav = join(OUT, `${name}.wav`);
  writeFileSync(wav, renderTrack(config));

  try {
    const mp3 = join(OUT, `${name}.mp3`);
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "64k", "-ac", "1", "-ar", "44100", mp3]);
    rmSync(wav);
    console.log(`wrote ${mp3}`);
  } catch {
    console.log(`wrote ${wav} (ffmpeg unavailable, kept WAV)`);
  }
}
