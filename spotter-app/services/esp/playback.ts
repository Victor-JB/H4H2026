import { Audio } from 'expo-audio'; // or 'expo-av'
import { Buffer } from 'buffer';

/**
 * POST a raw binary .wav file to the ESP32 playback endpoint.
 *
 * The ESP32 firmware should expose POST /play on the audio port (8080)
 * and feed the received PCM/WAV data to I2S for speaker output.
 */
// Helper to convert strings to byte arrays
function stringToUint8Array(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i) & 0xff;
  }
  return arr;
}

export async function sendAudioToEsp32(
  wavBinary: ArrayBuffer,
  espAudioBase: string
): Promise<void> {

  // We are skipping multipart/form-data completely.
  // We send the pure raw binary directly into the body.
  const res = await fetch(`${espAudioBase}/play`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: wavBinary,
  });

  const base64String = Buffer.from(wavBinary).toString('base64');
  
  // 2. Create the Data URI (ensure the mime type matches your data, e.g., audio/wav or audio/mpeg)
  const sourceUri = `data:audio/wav;base64,${base64String}`;

  // 3. Load and play
  const player = await Audio.createPlayer(sourceUri);
  player.play();
    

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`ESP32 /play failed ${res.status}: ${errBody}`);
  }
}
