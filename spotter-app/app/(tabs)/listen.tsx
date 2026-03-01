import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { downloadEspWav } from "../../services/esp/audio";
import { handleVoiceCommand } from "../../engine/handleVoiceCommand";

// ── ESP32 audio server (port 8080) ──────────────────────────
const ESP_IP = "172.20.10.2"; // same IP as audio-listener
const ESP_AUDIO_BASE = `http://${ESP_IP}:8080`;
const STATUS_URL = `${ESP_AUDIO_BASE}/status`;

// ── Types ───────────────────────────────────────────────────
interface LogEntry {
  id: number;
  transcript: string;
  intent: string;
  action: string;
  time: string;
}

export default function ListenScreen() {
  const [phase, setPhase] = useState<
    "polling" | "downloading" | "transcribing" | "done" | "error"
  >("polling");
  const [errorMsg, setErrorMsg] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const isMounted = useRef(true);
  const isProcessing = useRef(false);

  // ── Append to visible log ────────────────────────────────
  const pushLog = useCallback(
    (transcript: string, intent: string, action: string) => {
      logIdRef.current += 1;
      const entry: LogEntry = {
        id: logIdRef.current,
        transcript,
        intent,
        action,
        time: new Date().toLocaleTimeString(),
      };
      setLog((prev) => [entry, ...prev].slice(0, 50)); // keep last 50
    },
    []
  );

  // ── Core super-loop tick ─────────────────────────────────
  const tick = useCallback(async () => {
    if (!isMounted.current || isProcessing.current) return;

    try {
      const res = await fetch(STATUS_URL);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ready) return;

      // Audio is ready — enter processing gate
      isProcessing.current = true;
      setPhase("downloading");

      // 1. Download .wav to local filesystem
      const localUri = await downloadEspWav(ESP_AUDIO_BASE);

      if (!isMounted.current) return;
      setPhase("transcribing");

      // 2. STT → intent → action (reuses existing engine)
      const result = await handleVoiceCommand(localUri);

      if (!isMounted.current) return;
      pushLog(result.transcript, result.intent, result.action);
      setPhase("done");
    } catch (e: any) {
      if (!isMounted.current) return;
      setErrorMsg(e?.message ?? String(e));
      setPhase("error");
    } finally {
      // Always release the gate so polling resumes
      isProcessing.current = false;
      if (isMounted.current) {
        // Brief pause before resuming poll to avoid hammering after processing
        setTimeout(() => {
          if (isMounted.current) setPhase("polling");
        }, 500);
      }
    }
  }, [pushLog]);

  // ── Polling interval ─────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    const id = setInterval(tick, 500);
    return () => {
      isMounted.current = false;
      clearInterval(id);
    };
  }, [tick]);

  // ── UI ────────────────────────────────────────────────────
  const phaseLabel: Record<string, string> = {
    polling: "Listening for ESP32 audio…",
    downloading: "Downloading .wav from ESP32…",
    transcribing: "Transcribing via ElevenLabs…",
    done: "Processed! Resuming…",
    error: `Error: ${errorMsg}`,
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Spotter Listen</Text>
        <View style={s.statusRow}>
          {(phase === "downloading" || phase === "transcribing") && (
            <ActivityIndicator color="#4af" style={{ marginRight: 8 }} />
          )}
          <Text style={s.phase}>{phaseLabel[phase]}</Text>
        </View>
      </View>

      <ScrollView style={s.log} contentContainerStyle={{ paddingBottom: 40 }}>
        {log.length === 0 && (
          <Text style={s.empty}>
            No voice commands yet. Speak into the ESP32 mic and it will appear
            here.
          </Text>
        )}
        {log.map((entry) => (
          <View key={entry.id} style={s.card}>
            <Text style={s.time}>{entry.time}</Text>
            <Text style={s.transcript}>"{entry.transcript}"</Text>
            <Text style={s.intent}>
              {entry.intent}
              {entry.action.startsWith("RUN_FIND:")
                ? ` → ${entry.action.replace("RUN_FIND:", "")}`
                : ""}
            </Text>
            <Text style={s.action}>→ {entry.action}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  phase: { color: "#4af", fontFamily: "monospace", fontSize: 13 },
  log: { flex: 1, paddingHorizontal: 20 },
  empty: { color: "#666", marginTop: 32, textAlign: "center" },
  card: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#4af",
  },
  time: { color: "#888", fontSize: 11, marginBottom: 4 },
  transcript: { color: "#fff", fontSize: 15, marginBottom: 4 },
  intent: { color: "#4af", fontWeight: "600", fontSize: 13 },
  action: { color: "#666", fontSize: 12, marginTop: 2 },
});
