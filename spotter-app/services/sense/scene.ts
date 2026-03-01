import * as FileSystem from "expo-file-system";

export type SceneResult = {
  count: number;
  detections: Array<{
    label: string;
    conf: number;
    pos: "left" | "center" | "right";
    bbox: [number, number, number, number];
  }>;
  latency_ms: number;
};

/**
 * Fetches a still frame from the ESP32 and uploads it to your backend scene endpoint.
 */
export async function runSceneOnce(params: {
  apiBase: string;     // ngrok base, e.g. https://...ngrok-free.dev
  espBase: string;     // e.g. http://172.20.10.2  (NO trailing slash)
  conf?: number;       // default 0.35
}): Promise<SceneResult> {
  const { apiBase, espBase, conf = 0.35 } = params;

  // 1) Download ESP still image to phone cache
  const captureUrl = `${espBase}/capture?t=${Date.now()}`;
  const localPath = `${FileSystem.cacheDirectory}frame_${Date.now()}.jpg`;

  const dl = await FileSystem.downloadAsync(captureUrl, localPath);

  // 2) Upload to backend
  const form = new FormData();
  form.append("image", {
    uri: dl.uri,
    name: "frame.jpg",
    type: "image/jpeg",
  } as any);

  const res = await fetch(`${apiBase}/scene/upload?conf=${conf}`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`scene/upload failed: ${res.status} ${txt}`);
  }

  return (await res.json()) as SceneResult;
}