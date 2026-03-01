import React, { useState } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { WebView } from "react-native-webview";

const ESP_IP = "172.20.10.9";
const STREAM_URL = `http://${ESP_IP}:81/stream`;

export default function StreamDebugger() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    console.log(msg);
    setLogs((prev) => [msg, ...prev].slice(0, 8)); // Keep last 8 logs on screen
  };

  // We wrap the image in a tiny HTML page so it automatically scales 
  // and centers perfectly inside the WebView without scrollbars.
  const htmlContent = `
    <html>
      <body style="margin:0;padding:0;background-color:black;display:flex;justify-content:center;align-items:center;">
        <img src="${STREAM_URL}" style="width:100%;height:100%;object-fit:contain;" />
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32 Stream & Debugger</Text>
      <Text style={styles.subtitle}>{STREAM_URL}</Text>

      <View style={styles.feed}>
        {running ? (
          <WebView
            source={{ html: htmlContent, baseUrl: `http://${ESP_IP}` }}
            style={{ flex: 1, backgroundColor: 'black' }}
            scrollEnabled={false}
            // === DEBUGGING HOOKS ===
            onLoadStart={() => addLog("🟢 [TCP] Opening connection to ESP32...")}
            onLoadEnd={() => addLog("✅ [HTTP] Stream established & rendering")}
            onError={(e) => addLog(`❌ [ERR] Network dropped: ${e.nativeEvent.description}`)}
            onHttpError={(e) => addLog(`⚠️ [HTTP ERR] Code: ${e.nativeEvent.statusCode}`)}
            onRenderProcessGone={() => addLog("💀 [CRASH] WebView engine crashed")}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={{ color: "#888" }}>Stream Stopped</Text>
          </View>
        )}
      </View>

      <View style={styles.logBox}>
        {logs.map((log, i) => (
          <Text key={i} style={styles.logText}>{log}</Text>
        ))}
      </View>

      <View style={styles.controls}>
        {!running ? (
          <Button title="Start Stream" onPress={() => { setLogs([]); setRunning(true); }} color="#28a745" />
        ) : (
          <Button title="Stop Stream" onPress={() => setRunning(false)} color="#dc3545" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 50, paddingHorizontal: 16 },
  title: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  subtitle: { color: "#888", fontSize: 12, marginBottom: 10 },
  feed: { height: 300, backgroundColor: "#111", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: '#333' },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  logBox: { flex: 1, marginTop: 10, padding: 10, backgroundColor: '#1a1a1a', borderRadius: 8 },
  logText: { color: '#00ff00', fontFamily: 'monospace', fontSize: 10, marginBottom: 4 },
  controls: { paddingVertical: 16 },
});