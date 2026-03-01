import * as FileSystem from "expo-file-system";

export async function downloadEspWav(espBaseUrl: string): Promise<string> {
  const url = `${espBaseUrl}/audio.wav`;

  // Some Expo/TS setups have mismatched type defs that don’t expose
  // documentDirectory/cacheDirectory even though they exist at runtime.
  const fsAny = FileSystem as any;
  const baseDir: string | undefined = fsAny.documentDirectory ?? fsAny.cacheDirectory;

  if (!baseDir) {
    throw new Error(
      "No writable directory available (documentDirectory/cacheDirectory missing). Check your expo-file-system install."
    );
  }

  const outUri = `${baseDir}esp_audio.wav`;
  const res = await FileSystem.downloadAsync(url, outUri);
  return res.uri;
}