import {
  cacheDirectory,
  writeAsStringAsync,
  EncodingType,
} from "expo-file-system";

// ── Config ──────────────────────────────────────────────────
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" – clear, natural voice
const MODEL_ID = "eleven_turbo_v2_5"; // fastest model, good quality
const SAMPLE_RATE = 16000; // match ESP32 I2S output rate
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

// ── WAV header builder (44 bytes) ───────────────────────────
function buildWavHeader(pcmByteLength: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const v = new DataView(header);

  const byteRate = SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = CHANNELS * (BITS_PER_SAMPLE / 8);

  // RIFF chunk
  writeStr(v, 0, "RIFF");
  v.setUint32(4, 36 + pcmByteLength, true); // file size - 8
  writeStr(v, 8, "WAVE");

  // fmt sub-chunk
  writeStr(v, 12, "fmt ");
  v.setUint32(16, 16, true); // sub-chunk size (PCM = 16)
  v.setUint16(20, 1, true); // audio format (1 = PCM)
  v.setUint16(22, CHANNELS, true);
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, byteRate, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, BITS_PER_SAMPLE, true);

  // data sub-chunk
  writeStr(v, 36, "data");
  v.setUint32(40, pcmByteLength, true);

  return new Uint8Array(header);
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ── Base64 helper ───────────────────────────────────────────
function uint8ToBase64(bytes: Uint8Array): string {
  // Process in 32 KB chunks to avoid call-stack overflow with btoa
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    let binary = "";
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]);
    }
    parts.push(binary);
  }
  return btoa(parts.join(""));
}

// ── Public API ──────────────────────────────────────────────

/**
 * Convert text to a local .wav file using ElevenLabs TTS.
 * Returns the local file URI.
 */
export async function elevenLabsTTS(text: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_Spot;
  if (!apiKey) throw new Error("Missing Spot key (EXPO_PUBLIC_Spot)");

  if (!text || text.trim().length === 0) {
    throw new Error("TTS: empty text");
  }

  // Request raw PCM at 16 kHz from ElevenLabs
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=pcm_16000`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`TTS failed ${res.status}: ${errBody}`);
  }

  // Read the raw PCM bytes
  const arrayBuf = await res.arrayBuffer();
  const pcmData = new Uint8Array(arrayBuf);

  if (pcmData.length === 0) {
    throw new Error("TTS returned empty audio");
  }

  // Prepend WAV header to make a valid .wav file
  const header = buildWavHeader(pcmData.length);
  const wav = new Uint8Array(header.length + pcmData.length);
  wav.set(header, 0);
  wav.set(pcmData, header.length);

  // Write to cache as base64
  const baseDir = cacheDirectory;
  if (!baseDir) throw new Error("No cache directory available");

  const outPath = `${baseDir}tts_${Date.now()}.wav`;
  await writeAsStringAsync(outPath, uint8ToBase64(wav), {
    encoding: EncodingType.Base64,
  });

  return outPath;
}
