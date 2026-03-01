import React, { useMemo, useState } from "react";
import { View, Text, Button, StyleSheet, Image, ScrollView } from "react-native";
import { runSceneOnce } from "@/services/sense/scene";

const API_BASE = "https://letisha-unmetalled-enzymatically.ngrok-free.dev";
const ESP_BASE = "http://172.20.10.2"; // change if your ESP has a different IP

export default function SceneTestScreen() {
  const [status, setStatus] = useState("idle");
  const [out, setOut] = useState<string>("");
  const [imgKey, setImgKey] = useState(0);

  const captureUrl = useMemo(() => `${ESP_BASE}/capture?t=${Date.now()}&k=${imgKey}`, [imgKey]);

  async function refreshImage() {
    setImgKey((k) => k + 1);
  }

  async function runScene() {
    setStatus("capturing + uploading + running YOLO…");
    setOut("");
    try {
      const res = await runSceneOnce({ apiBase: API_BASE, espBase: ESP_BASE, conf: 0.35 });
      const lines = res.detections.slice(0, 15).map(
        (d) => `${d.label} (${Math.round(d.conf * 100)}%) @ ${d.pos}`
      );
      setOut(`latency: ${res.latency_ms}ms\ncount: ${res.count}\n\n${lines.join("\n")}`);
      setStatus("done ✅");
    } catch (e: any) {
      setStatus(`error: ${e?.message ?? String(e)}`);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scene Test (ESP capture → ngrok → YOLO)</Text>
      <Text style={styles.small}>ESP: {ESP_BASE}/capture</Text>
      <Text style={styles.small}>API: {API_BASE}</Text>

      <View style={styles.preview}>
        <Image source={{ uri: captureUrl }} style={styles.img} resizeMode="contain" />
      </View>

      <View style={styles.row}>
        <Button title="Refresh Capture" onPress={refreshImage} />
        <Button title="Run Scene" onPress={runScene} />
      </View>

      <Text style={styles.status}>Status: {status}</Text>

      <ScrollView style={styles.box}>
        <Text style={styles.mono}>{out || "-"}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 70, padding: 16, backgroundColor: "#000" },
  title: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 8 },
  small: { color: "#888", fontSize: 12, marginBottom: 4 },
  preview: { height: 240, backgroundColor: "#111", borderRadius: 8, marginTop: 12 },
  img: { width: "100%", height: "100%" },
  row: { flexDirection: "row", gap: 12, marginTop: 12, justifyContent: "space-between" },
  status: { color: "#fff", marginTop: 12, marginBottom: 8 },
  box: { marginTop: 8, padding: 12, backgroundColor: "#111", borderRadius: 8 },
  mono: { color: "#fff", fontFamily: "Menlo" },
});