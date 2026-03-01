import { runSceneOnce } from "../../services/sense/scene";
import { sceneToText } from "../../engine/sceneToText"; // Helper to convert JSON results to English
import { ESP_CAM_BASE, BACKEND_API_BASE, YOLO_CONF } from "../../services/esp/config";

// Helper to convert strings to byte arrays for our payload headers
function stringToUint8Array(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i) & 0xff;
  }
  return arr;
}

export async function elevenLabsSTT(audioData: Blob): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_Spot;
  if (!apiKey) throw new Error("Missing Spot key");

  console.log('[STT] Validating blob before upload...');
  if (audioData.size < 100) {
    throw new Error(`Audio blob too small: ${audioData.size} bytes`);
  }

  // ========================================
  // 1. EXTRACT RAW BINARY FROM BLOB
  // ========================================
  console.log('[STT] Extracting ArrayBuffer from Blob in memory...');
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result as ArrayBuffer);
      } else {
        reject(new Error("FileReader returned empty ArrayBuffer"));
      }
    };
    reader.onerror = () => reject(new Error("FileReader failed to read Blob"));
    reader.readAsArrayBuffer(audioData);
  });

  // ========================================
  // 2. MANUALLY ASSEMBLE MULTIPART/FORM-DATA
  // ========================================
  console.log('[STT] Building exact multipart bytes...');
  const boundary = "ExpoBoundary" + Date.now().toString(16);

  // Headers for our two required fields
  const part1 = `--${boundary}\r\nContent-Disposition: form-data; name="model_id"\r\n\r\nscribe_v1\r\n`;
  const part2 = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  // Convert to actual byte arrays
  const uintPart1 = stringToUint8Array(part1);
  const uintPart2 = stringToUint8Array(part2);
  const uintFile = new Uint8Array(arrayBuffer); // The actual audio.wav binary
  const uintFooter = stringToUint8Array(footer);

  // Combine them all into one giant body sequence
  const bodyBytes = new Uint8Array(
    uintPart1.length + uintPart2.length + uintFile.length + uintFooter.length
  );
  
  let offset = 0;
  bodyBytes.set(uintPart1, offset);
  offset += uintPart1.length;
  
  bodyBytes.set(uintPart2, offset);
  offset += uintPart2.length;
  
  bodyBytes.set(uintFile, offset);
  offset += uintFile.length;
  
  bodyBytes.set(uintFooter, offset);

  // ========================================
  // 3. SEND DIRECTLY TO ELEVENLABS
  // ========================================
  console.log('[STT] Sending RAW binary multipart to ElevenLabs...');
  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      // We MUST explicitly state the boundary here
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Accept": "application/json"
    },
    body: bodyBytes, // Passing raw binary bypasses all React Native FormData bugs!
  });

  const raw = await r.text();
  console.log(`[STT] Response status: ${r.status}`);
  
  if (!r.ok) {
    console.error(`[STT] Error Body: ${raw}`);
    throw new Error(`STT failed ${r.status}: ${raw}`);
  }

  const json = JSON.parse(raw);
  const transcript = String(json.text ?? "").trim();
  console.log(`[STT] Success! Transcript: "${transcript}"`);
  
  return transcript;
}

