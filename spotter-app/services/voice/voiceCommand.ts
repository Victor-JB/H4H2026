import { Audio } from "expo-av";
import { elevenLabsSTT } from "../elevenlabs/stt";

let recording: Audio.Recording | null = null;

export async function startVoiceCommand(): Promise<void> {
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) throw new Error("Mic permission denied");

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const rec = new Audio.Recording();
  await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await rec.startAsync();
  recording = rec;
}

export async function stopVoiceCommandAndTranscribe(): Promise<{
  uri: string;
  transcript: string;
}> {
  if (!recording) throw new Error("Not recording");

  await recording.stopAndUnloadAsync();
  const uri = recording.getURI() || "";
  recording = null;

  if (!uri) throw new Error("No audio URI returned");

  const transcript = await elevenLabsSTT(uri);
  return { uri, transcript };
}