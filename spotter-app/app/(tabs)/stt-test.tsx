import React, { useRef, useState } from "react";
import { Button, Text, View } from "react-native";
import { Audio } from "expo-av";
import { elevenLabsSTT } from "../../services/elevenlabs/stt";
import { inferIntent } from "../../engine/inferIntent";

export default function SttTestScreen() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [status, setStatus] = useState("idle");
  const [uri, setUri] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [mode, setMode] = useState<string>("-");

  async function startRec() {
    setTranscript("");
    setMode("-");
    setUri("");
    setStatus("requesting mic…");

    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      setStatus("mic permission denied");
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();

    recordingRef.current = rec;
    setStatus("recording… (try: 'where am i', 'read this sign', 'avoid obstacles', 'find my backpack')");
  }

  async function stopRecAndTranscribe() {
    const rec = recordingRef.current;
    if (!rec) {
      setStatus("not recording");
      return;
    }

    setStatus("stopping…");
    await rec.stopAndUnloadAsync();
    const audioUri = rec.getURI() || "";
    recordingRef.current = null;

    if (!audioUri) {
      setStatus("no audio uri");
      return;
    }

    setUri(audioUri);
    setStatus("uploading to ElevenLabs STT…");

    try {
      // Quick sanity log
      console.log("Spot key present:", !!process.env.EXPO_PUBLIC_Spot);
      console.log("Audio URI:", audioUri);

      const text = await elevenLabsSTT(audioUri);
      const parsed = inferIntent(text);

      if (parsed.intent === "FIND") {
        setMode(`FIND (${parsed.target ?? ""})`);
      } else {
        setMode(parsed.intent);
      }
      
      setTranscript(text);
      setStatus("done ✅");
      console.log("Transcript:", text);
    } catch (e: any) {
      setStatus(`error: ${e?.message ?? String(e)}`);
      console.log("STT error:", e);
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>ElevenLabs STT Test</Text>

      <Text>Status: {status}</Text>
      <Text>Mode: {mode}</Text>
      <Text>URI: {uri || "-"}</Text>

      <Button title="Start Recording" onPress={startRec} />
      <Button title="Stop + Transcribe" onPress={stopRecAndTranscribe} />

      <Text style={{ marginTop: 12, fontWeight: "600" }}>Transcript</Text>
      <Text>{transcript || "-"}</Text>
    </View>
  );
}