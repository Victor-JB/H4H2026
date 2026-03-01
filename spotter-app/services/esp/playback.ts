import {
  readAsStringAsync,
  EncodingType,
  getInfoAsync,
} from "expo-file-system";

/**
 * POST a local .wav file to the ESP32 playback endpoint.
 *
 * The ESP32 firmware should expose POST /play on the audio port (8080)
 * and feed the received PCM/WAV data to I2S for speaker output.
 */
export async function sendAudioToEsp32(
  localWavUri: string,
  espAudioBase: string
): Promise<void> {
  // Verify the file exists
  const info = await getInfoAsync(localWavUri);
  if (!info.exists) {
    throw new Error(`WAV file not found: ${localWavUri}`);
  }

  const form = new FormData();
  form.append("file", {
    uri: localWavUri,
    name: "response.wav",
    type: "audio/wav",
  } as any);

  const res = await fetch(`${espAudioBase}/play`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`ESP32 /play failed ${res.status}: ${errBody}`);
  }
}
