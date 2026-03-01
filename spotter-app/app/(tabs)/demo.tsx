import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';

const ESP_IP    = '172.20.10.9';
const STREAM_URL = `http://${ESP_IP}:81/stream`;

type LogEntry = string;

function getLogColor(msg: LogEntry): string {
  if (msg.startsWith('✅') || msg.startsWith('🟢')) return '#22C55E';
  if (msg.startsWith('❌') || msg.startsWith('💀')) return '#EF4444';
  if (msg.startsWith('⚠️'))                          return '#F59E0B';
  return '#7AB8FF';
}

export default function StreamDebugger() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs]       = useState<LogEntry[]>([]);

  const addLog = (msg: LogEntry) => {
    console.log(msg);
    setLogs((prev) => [msg, ...prev].slice(0, 8));
  };

  const htmlContent = `
    <html>
      <body style="margin:0;padding:0;background-color:#000;display:flex;
                   justify-content:center;align-items:center;height:100vh;">
        <img src="${STREAM_URL}" style="width:100%;height:100%;object-fit:contain;" />
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>ESP32 Stream</Text>
          <Text style={styles.headerSub}>Live camera debugger</Text>
        </View>
        {/* Connection status badge */}
        <View style={[styles.statusBadge, running ? styles.statusBadgeLive : styles.statusBadgeOff]}>
          <View style={[styles.statusDot, { backgroundColor: running ? '#22C55E' : '#3D5880' }]} />
          <Text style={[styles.statusText, { color: running ? '#22C55E' : '#3D5880' }]}>
            {running ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      {/* ── URL Badge ── */}
      <View style={styles.urlRow}>
        <Text style={styles.urlLabel}>STREAM URL</Text>
        <Text style={styles.urlValue}>{STREAM_URL}</Text>
      </View>

      {/* ── Feed Card ── */}
      <View style={styles.feedCard}>
        <View style={styles.feedHeader}>
          <Text style={styles.feedLabel}>LIVE FEED</Text>
          <View style={styles.feedLiveRow}>
            <View style={[styles.liveDot, { backgroundColor: running ? '#EF4444' : '#1A3464' }]} />
            <Text style={[styles.liveText, { color: running ? '#EF4444' : '#3D5880' }]}>
              {running ? 'REC' : 'IDLE'}
            </Text>
          </View>
        </View>

        <View style={styles.feed}>
          {running ? (
            <WebView
              source={{ html: htmlContent, baseUrl: `http://${ESP_IP}` }}
              style={{ flex: 1, backgroundColor: '#000' }}
              scrollEnabled={false}
              onLoadStart={() => addLog('🟢 [TCP] Opening connection to ESP32...')}
              onLoadEnd={()   => addLog('✅ [HTTP] Stream established & rendering')}
              onError={(e)    => addLog(`❌ [ERR] Network dropped: ${e.nativeEvent.description}`)}
              onHttpError={(e) => addLog(`⚠️ [HTTP ERR] Code: ${e.nativeEvent.statusCode}`)}
              onRenderProcessGone={() => addLog('💀 [CRASH] WebView engine crashed')}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>◉</Text>
              <Text style={styles.placeholderText}>Stream Offline</Text>
              <Text style={styles.placeholderSub}>Press Start Stream to connect</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Debug Log ── */}
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <Text style={styles.logLabel}>DEBUG LOG</Text>
          {logs.length > 0 && (
            <TouchableOpacity onPress={() => setLogs([])}>
              <Text style={styles.logClear}>CLEAR</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView style={styles.logScroll} showsVerticalScrollIndicator={false}>
          {logs.length === 0 ? (
            <Text style={styles.logEmpty}>No logs yet — start the stream to see activity.</Text>
          ) : (
            logs.map((log, i) => (
              <Text key={i} style={[styles.logLine, { color: getLogColor(log) }]}>
                {log}
              </Text>
            ))
          )}
        </ScrollView>
      </View>

      {/* ── Controls ── */}
      <View style={styles.controls}>
        {!running ? (
          <TouchableOpacity
            style={[styles.controlBtn, styles.startBtn]}
            onPress={() => { setLogs([]); setRunning(true); }}
            activeOpacity={0.82}
          >
            <Text style={styles.controlBtnText}>▶  Start Stream</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.controlBtn, styles.stopBtn]}
            onPress={() => setRunning(false)}
            activeOpacity={0.82}
          >
            <Text style={styles.controlBtnText}>■  Stop Stream</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060F1E',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // ── Header ──────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerTitle: {
    color: '#F0F4FF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  headerSub: {
    color: '#3D5880',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '400',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  statusBadgeLive: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor:     'rgba(34, 197, 94, 0.3)',
  },
  statusBadgeOff: {
    backgroundColor: 'rgba(26, 52, 100, 0.5)',
    borderColor:     '#1A3464',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  // ── URL Row ──────────────────────────────
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0D1F3C',
    borderWidth: 1,
    borderColor: '#1A3464',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 14,
  },
  urlLabel: {
    color: '#3D5880',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
  },
  urlValue: {
    color: '#7A96BE',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },

  // ── Feed Card ────────────────────────────
  feedCard: {
    backgroundColor: '#0D1F3C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A3464',
    overflow: 'hidden',
    marginBottom: 12,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3464',
  },
  feedLabel: {
    color: '#3D5880',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  feedLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  feed: {
    height: 250,
    backgroundColor: '#000',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  placeholderIcon: {
    fontSize: 40,
    color: '#1A3464',
    marginBottom: 6,
  },
  placeholderText: {
    color: '#3D5880',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderSub: {
    color: '#1A3464',
    fontSize: 12,
  },

  // ── Log Card ──────────────────────────────
  logCard: {
    flex: 1,
    backgroundColor: '#0D1F3C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A3464',
    padding: 14,
    marginBottom: 12,
    minHeight: 80,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logLabel: {
    color: '#3D5880',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  logClear: {
    color: '#1D6FE8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  logScroll: {
    flex: 1,
  },
  logEmpty: {
    color: '#1A3464',
    fontSize: 11,
    fontFamily: 'monospace',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  logLine: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 5,
    lineHeight: 17,
  },

  // ── Controls ─────────────────────────────
  controls: {
    paddingBottom: 4,
  },
  controlBtn: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    elevation: 8,
  },
  startBtn: {
    backgroundColor: '#1D6FE8',
    shadowColor: '#1D6FE8',
    shadowOpacity: 0.42,
  },
  stopBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.38,
  },
  controlBtnText: {
    color: '#F0F4FF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
