import { elevenLabsSTT } from "../services/elevenlabs/stt";
import { inferIntent } from "./inferIntent";

export async function handleVoiceCommand(audioUri: string) {
  const transcript = await elevenLabsSTT(audioUri);

  const parsed = inferIntent(transcript);

  // Trigger “scripts” (stubs for now)
  switch (parsed.intent) {
    case "SCENE":
      return { transcript, intent: parsed.intent, action: "RUN_SCENE" };
    case "OBSTACLE":
      return { transcript, intent: parsed.intent, action: "RUN_OBSTACLE" };
    case "SIGN":
      return { transcript, intent: parsed.intent, action: "RUN_SIGN" };
    case "FIND":
      return { transcript, intent: parsed.intent, action: `RUN_FIND:${parsed.target ?? ""}` };
    default:
      return { transcript, intent: parsed.intent, action: "ASK_REPHRASE" };
  }
}