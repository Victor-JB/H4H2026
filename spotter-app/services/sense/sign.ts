import * as FileSystem from "expo-file-system/legacy";
import { setSnapshot } from "@/stores/snapshot";

export type SignReading = {
  label: string;
  det_conf: number;
  pos: "left" | "center" | "right";
  bbox: [number, number, number, number];
  has_text: boolean;
  text: string;
  fragments: Array<{ text: string; ocr_conf: number }>;
};

export type SignResult = {
  count: number;
  with_text: number;
  readings: SignReading[];
  summary: string;
  latency_ms: number;
};

/**
 * Captures a still frame from the ESP32 and uploads it to the
 * /sign/upload endpoint (YOLO + EasyOCR) to read text on detected objects.
 */
export async function runSignOnce(params: {
  apiBase: string;
  espBase: string;
  conf?: number;
}): Promise<SignResult> {
  const { apiBase, espBase, conf = 0.30 } = params;

  // 1) Download ESP still image to phone cache
  const captureUrl = `${espBase}/capture?t=${Date.now()}`;
  const localPath = `${FileSystem.cacheDirectory}sign_frame_${Date.now()}.jpg`;

  const dl = await FileSystem.downloadAsync(captureUrl, localPath);
  setSnapshot(dl.uri);

  // 2) Upload to backend sign endpoint
  const form = new FormData();
  form.append("image", {
    uri: dl.uri,
    name: "frame.jpg",
    type: "image/jpeg",
  } as any);

  const res = await fetch(`${apiBase}/sign/upload?conf=${conf}`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`sign/upload failed: ${res.status} ${txt}`);
  }

  return (await res.json()) as SignResult;
}
