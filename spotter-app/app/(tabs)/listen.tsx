import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { fetchEspAudioBlob } from "../../services/esp/audio";
import { handleVoiceCommand, VoiceCommandResult } from "../../engine/handleVoiceCommand";
import { ESP_AUDIO_BASE, ESP_STATUS_URL } from "../../services/esp/config";

// ── Types ───────────────────────────────────────────────────
type Phase =
  | "polling"
  | "downloading"
  | "transcribing"
  | "executing"
  | "speaking"
  | "done"
  | "error";

interface LogEntry {
  id: number;
  transcript: string;
  intent: string;
  response: string;
  espOk: boolean;
  warning?: string;
  time: string;
}

export default function ListenScreen() {
  const [phase, setPhase] = useState<Phase>("polling");
  const [errorMsg, setErrorMsg] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const isMounted = useRef(true);
  const isProcessing = useRef(false);

  // ── Append to visible log ────────────────────────────────
  const pushLog = useCallback((r: VoiceCommandResult) => {
    logIdRef.current += 1;
    const entry: LogEntry = {
      id: logIdRef.current,
      transcript: r.transcript,
      intent: r.intent,
      response: r.response,
      espOk: r.espPlaybackOk,
      warning: r.error,
      time: new Date().toLocaleTimeString(),
    };
    setLog((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  // ── Core super-loop tick ─────────────────────────────────
  const tick = useCallback(async () => {
    if (!isMounted.current || isProcessing.current) return;

    try {
      // Poll ESP32 status – does it have a recorded clip ready?
      const res = await fetch(ESP_STATUS_URL);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ready) return;

      // ── Audio ready → enter processing gate ──────────────
      isProcessing.current = true;
      setPhase("downloading");

      // 1. Download .wav to local filesystem
      const audioBlob = await fetchEspAudioBlob(ESP_AUDIO_BASE);
      if (!isMounted.current) return;

      setPhase("transcribing");

      // 2-5.  STT → intent → execute → TTS → ESP32 playback
      //       All handled inside handleVoiceCommand
      const result = await handleVoiceCommand(audioBlob);
      if (!isMounted.current) return;

      pushLog(result);
      setPhase("done");
    } catch (e: any) {
      if (!isMounted.current) return;
      setErrorMsg(e?.message ?? String(e));
      setPhase("error");
    } finally {
      isProcessing.current = false;
      if (isMounted.current) {
        setTimeout(() => {
          if (isMounted.current) setPhase("polling");
        }, 500);
      }
    }
  }, [pushLog]);

  // ── Polling interval (every 500 ms) ──────────────────────
  useEffect(() => {
    isMounted.current = true;
    const id = setInterval(tick, 500);
    return () => {
      isMounted.current = false;
      clearInterval(id);
    };
  }, [tick]);

  // ── UI ────────────────────────────────────────────────────
  const phaseLabel: Record<Phase, string> = {
    polling: "Listening for ESP32 audio…",
    downloading: "Downloading .wav from ESP32…",
    transcribing: "Processing voice command…",
    executing: "Running command…",
    speaking: "Sending response to ESP32…",
    done: "Done — resuming…",
    error: `Error: ${errorMsg}`,
  };

  const busy =
    phase === "downloading" ||
    phase === "transcribing" ||
    phase === "executing" ||
    phase === "speaking";

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Spotter</Text>
        <View style={s.statusRow}>
          {busy && (
            <ActivityIndicator color="#4af" style={{ marginRight: 8 }} />
          )}
          <Text style={[s.phase, phase === "error" && { color: "#f66" }]}>
            {phaseLabel[phase]}
          </Text>
        </View>
      </View>

      <ScrollView style={s.log} contentContainerStyle={{ paddingBottom: 40 }}>
        {log.length === 0 && (
          <Text style={s.empty}>
            No voice commands yet.{"\n"}Speak into the ESP32 mic and responses
            will appear here.
          </Text>
        )}
        {log.map((entry) => (
          <View key={entry.id} style={s.card}>
            <Text style={s.time}>{entry.time}</Text>
            <Text style={s.transcript}>"{entry.transcript}"</Text>
            <Text style={s.intent}>{entry.intent}</Text>
            <Text style={s.response}>{entry.response}</Text>
            <View style={s.metaRow}>
              <Text
                style={[s.badge, entry.espOk ? s.badgeOk : s.badgeWarn]}
              >
                {entry.espOk ? "ESP32 ✓" : "ESP32 ✗"}
              </Text>
              {entry.warning ? (
                <Text style={s.warning} numberOfLines={2}>
                  {entry.warning}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#060E1A" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: 1 },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  phase: { color: "#4af", fontFamily: "monospace", fontSize: 13 },
  log: { flex: 1, paddingHorizontal: 20 },
  empty: {
    color: "#555",
    marginTop: 40,
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#0F1C30",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#4af",
  },
  time: { color: "#667", fontSize: 11, marginBottom: 4 },
  transcript: {
    color: "#ccc",
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 6,
  },
  intent: { color: "#4af", fontWeight: "700", fontSize: 13, marginBottom: 4 },
  response: { color: "#fff", fontSize: 15, lineHeight: 21, marginBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  badgeOk: { backgroundColor: "#143d1e", color: "#5f5" },
  badgeWarn: { backgroundColor: "#3d2714", color: "#fa5" },
  warning: { color: "#a86", fontSize: 11, flex: 1 },
});
