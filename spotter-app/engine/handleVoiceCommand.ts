import { elevenLabsSTT } from "../services/elevenlabs/stt";
import { elevenLabsTTS } from "../services/elevenlabs/tts";
import { inferIntent, Intent } from "./inferIntent";
import { sceneToText } from "./sceneToText";
import { runSceneOnce } from "../services/sense/scene";
import { sendAudioToEsp32 } from "../services/esp/playback";
import {
  ESP_CAM_BASE,
  ESP_AUDIO_BASE,
  BACKEND_API_BASE,
  YOLO_CONF,
} from "../services/esp/config";

// Result type returned to the UI
export interface VoiceCommandResult {
  transcript: string;
  intent: Intent;
  response: string;
  ttsBuffer?: ArrayBuffer;
  espPlaybackOk: boolean;
  error?: string;
}

async function describeScene(): Promise<string> {
  const scene = await runSceneOnce({
    apiBase: BACKEND_API_BASE,
    espBase: ESP_CAM_BASE,
    conf: YOLO_CONF,
  });
  return sceneToText(scene);
}

async function findObject(target: string): Promise<string> {
  const scene = await runSceneOnce({
    apiBase: BACKEND_API_BASE,
    espBase: ESP_CAM_BASE,
    conf: YOLO_CONF,
  });

  const needle = target.toLowerCase();
  const match = scene.detections.find((d: any) =>
    d.label.toLowerCase().includes(needle)
  );

  if (match) {
    const dir =
      match.pos === "center"
        ? "straight ahead"
        : match.pos === "left"
        ? "to your left"
        : "to your right";
    return `I found your ${target} ${dir}.`;
  }

  const fallback = sceneToText(scene);
  return `I couldn't spot your ${target}. Here's what I see instead: ${fallback}`;
}

/**
 * Full end-to-end voice command pipeline:
 *   Audio URI -> STT -> intent -> execute -> TTS -> ESP32 playback
 */
export async function handleVoiceCommand(audioData: Blob): Promise<VoiceCommandResult> {
  // 1. Speech-to-text
  const transcript = await elevenLabsSTT(audioData);

  // 2. Intent inference
  const parsed = inferIntent(transcript);

  // 3. Execute command -> produce response text
  let response: string;

  switch (parsed.intent) {
    case "SCENE":
      response = await describeScene();
      break;

    case "OBSTACLE":
      try {
        const raw = await describeScene();
        response = `Watch out. ${raw}`;
      } catch {
        response =
          "I couldn't check for obstacles right now. Please try again.";
      }
      break;

    case "SIGN":
      response =
        "Sign reading isn't available yet, but I can describe the scene if you ask.";
      break;

    case "FIND":
      response = await findObject(parsed.target ?? "object");
      break;

    default:
      response = "Sorry, I didn't understand that. Could you rephrase?";
      break;
  }

  // 4. Text-to-speech -> Pure ArrayBuffer in memory
  let ttsBuffer: ArrayBuffer | undefined;
  let espPlaybackOk = false;
  let error: string | undefined;

  try {
    ttsBuffer = await elevenLabsTTS(response);
  } catch (e: any) {
    error = `TTS failed: ${e?.message ?? e}`;
  }

  // 5. Send .wav to ESP32 speaker
  if (ttsBuffer) {
    try {
      await sendAudioToEsp32(ttsBuffer, ESP_AUDIO_BASE);
      espPlaybackOk = true;
    } catch (e: any) {
      error = (error ? error + " | " : "") + `ESP play: ${e?.message ?? e}`;
    }
  }

  return {
    transcript,
    intent: parsed.intent,
    response,
    ttsBuffer,
    espPlaybackOk,
    error,
  };
}
