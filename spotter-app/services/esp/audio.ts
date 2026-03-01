import {
  cacheDirectory,
  documentDirectory,
  downloadAsync,
} from "expo-file-system";

export async function downloadEspWav(espBaseUrl: string): Promise<string> {
  const url = `${espBaseUrl}/audio.wav`;

  const baseDir = documentDirectory ?? cacheDirectory;
  if (!baseDir) {
    throw new Error(
      "No writable directory available (documentDirectory/cacheDirectory missing). " +
        "Make sure expo-file-system is linked and you are running on a real device or Expo Go."
    );
  }

  // Append a cache-busting query so repeated downloads don't get a stale file
  const outUri = `${baseDir}esp_audio_${Date.now()}.wav`;
  const res = await downloadAsync(url, outUri);
  return res.uri;
}