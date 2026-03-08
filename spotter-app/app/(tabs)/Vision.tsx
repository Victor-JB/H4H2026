import { useSyncExternalStore } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { subscribe, getSnapshot, subscribeCommand, getLastCommand } from '@/stores/snapshot';

const INTENT_COLORS: Record<string, { bg: string; text: string }> = {
  SCENE:    { bg: 'rgba(29,111,232,0.18)',  text: '#7AB8FF' },
  OBSTACLE: { bg: 'rgba(239,68,68,0.15)',   text: '#F87171' },
  SIGN:     { bg: 'rgba(255,209,102,0.15)', text: '#FFD166' },
  FIND:     { bg: 'rgba(34,197,94,0.15)',   text: '#4ADE80' },
};

export default function VisionScreen() {
  const snapshotUri = useSyncExternalStore(subscribe, getSnapshot);
  const lastCommand = useSyncExternalStore(subscribeCommand, getLastCommand);
  const { width } = useWindowDimensions();
  const imgHeight = (width - 32) * 0.75; // 4:3 ratio, 16px padding each side

  const intentStyle = INTENT_COLORS[lastCommand?.intent ?? ''] ?? { bg: 'rgba(61,88,128,0.2)', text: '#3D5880' };

  if (!snapshotUri && !lastCommand) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>◉</Text>
          <Text style={s.emptyTitle}>No capture yet</Text>
          <Text style={s.emptySub}>Waiting for a voice command from the ESP32…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Last Seen</Text>
        {lastCommand && <Text style={s.headerTime}>{lastCommand.time}</Text>}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Snapshot ── */}
        <View style={[s.imageCard, { height: imgHeight }]}>
          {snapshotUri ? (
            <Image source={{ uri: snapshotUri }} style={s.image} contentFit="cover" />
          ) : (
            <View style={s.imagePlaceholder}>
              <Text style={s.imagePlaceholderText}>Image pending…</Text>
            </View>
          )}
        </View>

        {/* ── Command card ── */}
        {lastCommand && (
          <View style={s.commandCard}>
            {/* Intent + playback row */}
            <View style={s.commandMeta}>
              <View style={[s.intentBadge, { backgroundColor: intentStyle.bg }]}>
                <Text style={[s.intentText, { color: intentStyle.text }]}>
                  {lastCommand.intent}
                </Text>
              </View>
              <View style={[s.espBadge, lastCommand.espPlaybackOk ? s.espBadgeOk : s.espBadgeWarn]}>
                <Text style={[s.espText, lastCommand.espPlaybackOk ? s.espTextOk : s.espTextWarn]}>
                  {lastCommand.espPlaybackOk ? 'ESP32 ✓' : 'ESP32 ✗'}
                </Text>
              </View>
            </View>

            {/* Transcript */}
            <Text style={s.heardLabel}>HEARD</Text>
            <Text style={s.transcript}>"{lastCommand.transcript}"</Text>

            {/* Divider */}
            <View style={s.divider} />

            {/* Response */}
            <Text style={s.responseLabel}>TOLD USER</Text>
            <Text style={s.response}>{lastCommand.response}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#060F1E',
  },

  // ── Empty state ───────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 44,
    color: '#1A3464',
    marginBottom: 4,
  },
  emptyTitle: {
    color: '#3D5880',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySub: {
    color: '#1A3464',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Header ───────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#F0F4FF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerTime: {
    color: '#3D5880',
    fontSize: 12,
    fontFamily: 'monospace',
  },

  // ── Scroll ───────────────────────────────
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },

  // ── Image ────────────────────────────────
  imageCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1A3464',
    backgroundColor: '#0D1F3C',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: '#1A3464',
    fontSize: 13,
    fontFamily: 'monospace',
  },

  // ── Command card ─────────────────────────
  commandCard: {
    backgroundColor: '#0D1F3C',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1A3464',
    padding: 16,
    gap: 8,
  },
  commandMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  intentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  intentText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
  },
  espBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  espBadgeOk:   { backgroundColor: 'rgba(34,197,94,0.12)' },
  espBadgeWarn: { backgroundColor: 'rgba(239,68,68,0.12)' },
  espText:      { fontSize: 11, fontWeight: '600' },
  espTextOk:    { color: '#4ADE80' },
  espTextWarn:  { color: '#F87171' },

  heardLabel: {
    color: '#3D5880',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  transcript: {
    color: '#7AB8FF',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#1A3464',
    marginVertical: 4,
  },
  responseLabel: {
    color: '#3D5880',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  response: {
    color: '#F0F4FF',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
});
