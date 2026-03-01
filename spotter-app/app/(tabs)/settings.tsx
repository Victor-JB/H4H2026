/**
 * Settings Screen
 *
 * Settings screen for configuring ESP32 connection and AI processing options.
 */

import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ESP32_DEFAULTS, getTestUrl, type Esp32Config } from '@/services/esp/config';
import axios from 'axios';

const STORAGE_KEY_ESP32_CONFIG = '@h4h_esp32_config';

// ── Tiny helper so we don't repeat the yellow-accent row for every section title ──
function SectionTitle({ children }: { children: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<Esp32Config>(ESP32_DEFAULTS);

  const [ip, setIp]                           = useState(config.ip);
  const [port, setPort]                       = useState(String(config.port));
  const [streamingMode, setStreamingMode]     = useState<'snapshot' | 'mjpeg'>(config.streamingMode);
  const [snapshotInterval, setSnapshotInterval] = useState(String(config.snapshotInterval || 100));
  const [aiEnabled, setAiEnabled]             = useState(config.aiEnabled !== false);
  const [aiVerbosity, setAiVerbosity]         = useState<'low' | 'medium' | 'high'>(config.aiVerbosity);
  const [targetLatency, setTargetLatency]     = useState(String(config.targetLatency || 200));
  const [maxLatency, setMaxLatency]           = useState(String(config.maxLatency || 500));
  const [frameQuality, setFrameQuality]       = useState<'low' | 'medium' | 'high'>(config.frameQuality);
  const [enableObjectDetection, setEnableObjectDetection] = useState(config.enableObjectDetection !== false);
  const [enableAudioAlerts, setEnableAudioAlerts]         = useState(config.enableAudioAlerts !== false);
  const [sceneDescription, setSceneDescription]           = useState(config.sceneDescription !== false);
  const [obstacleAvoidance, setObstacleAvoidance]         = useState(config.obstacleAvoidance !== false);
  const [signReading, setSignReading]         = useState(config.signReading !== false);

  // Load config from storage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_ESP32_CONFIG);
        if (stored) {
          const parsed     = JSON.parse(stored);
          const loadedConfig = { ...ESP32_DEFAULTS, ...parsed };
          setConfig(loadedConfig);
          setIp(loadedConfig.ip);
          setPort(String(loadedConfig.port));
          setStreamingMode(loadedConfig.streamingMode);
          setSnapshotInterval(String(loadedConfig.snapshotInterval));
          setAiEnabled(loadedConfig.aiEnabled);
          setAiVerbosity(loadedConfig.aiVerbosity);
          setTargetLatency(String(loadedConfig.targetLatency));
          setMaxLatency(String(loadedConfig.maxLatency));
          setFrameQuality(loadedConfig.frameQuality);
          setEnableObjectDetection(loadedConfig.enableObjectDetection);
          setEnableAudioAlerts(loadedConfig.enableAudioAlerts);
          setSceneDescription(loadedConfig.sceneDescription);
          setObstacleAvoidance(loadedConfig.obstacleAvoidance);
          setSignReading(loadedConfig.signReading);
        }
      } catch (err) {
        console.warn('[Settings] Failed to load stored ESP32 config:', err);
      }
    })();
  }, []);

  const handleSave = async () => {
    const newConfig: Esp32Config = {
      ...ESP32_DEFAULTS,
      ip: ip.trim(),
      port: parseInt(port, 10) || 80,
      streamingMode,
      snapshotInterval: parseInt(snapshotInterval, 10) || 100,
      aiEnabled,
      aiVerbosity,
      targetLatency: parseInt(targetLatency, 10) || 200,
      maxLatency: parseInt(maxLatency, 10) || 500,
      frameQuality,
      enableObjectDetection,
      enableAudioAlerts,
      sceneDescription,
      obstacleAvoidance,
      signReading,
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEY_ESP32_CONFIG, JSON.stringify(newConfig));
      setConfig(newConfig);
      Alert.alert('Success', 'Settings saved!');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleTestConnection = async () => {
    const testConfig = { ip: ip.trim(), port: parseInt(port, 10) || 80 };
    try {
      const url = getTestUrl(testConfig);
      await axios.get(url, { timeout: 5000 });
      Alert.alert('Success', 'Connection successful!');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Failed to connect: ${message}`);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Fixed Page Header ── */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSubtitle}>Configure your BlindSpot device</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── Mode Selection ── */}
        <View style={styles.card}>
          <SectionTitle>Mode Selection</SectionTitle>

          <View style={styles.switchGroup}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.label}>Scene Description</Text>
                <Text style={styles.hint}>Enable scene description AI</Text>
              </View>
              <Switch
                value={sceneDescription}
                onValueChange={setSceneDescription}
                trackColor={{ false: '#1A3464', true: '#1D6FE8' }}
                thumbColor={sceneDescription ? '#FFD166' : '#F0F4FF'}
              />
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.label}>Obstacle Avoidance</Text>
                <Text style={styles.hint}>Enable obstacle detection and avoidance</Text>
              </View>
              <Switch
                value={obstacleAvoidance}
                onValueChange={setObstacleAvoidance}
                trackColor={{ false: '#1A3464', true: '#1D6FE8' }}
                thumbColor={obstacleAvoidance ? '#FFD166' : '#F0F4FF'}
              />
            </View>
            <View style={[styles.switchRow, styles.switchRowLast]}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.label}>Sign Reading</Text>
                <Text style={styles.hint}>Enable sign reading and recognition</Text>
              </View>
              <Switch
                value={signReading}
                onValueChange={setSignReading}
                trackColor={{ false: '#1A3464', true: '#1D6FE8' }}
                thumbColor={signReading ? '#FFD166' : '#F0F4FF'}
              />
            </View>
          </View>
        </View>

        {/* ── Connection Settings ── */}
        <View style={styles.card}>
          <SectionTitle>Connection Settings</SectionTitle>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ESP32 IP Address</Text>
            <TextInput
              style={styles.input}
              value={ip}
              onChangeText={setIp}
              placeholder="192.168.43.184"
              placeholderTextColor="#3D5880"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Port</Text>
            <TextInput
              style={styles.input}
              value={port}
              onChangeText={setPort}
              placeholder="80"
              placeholderTextColor="#3D5880"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Streaming Mode</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioButton, streamingMode === 'snapshot' && styles.radioButtonActive]}
                onPress={() => setStreamingMode('snapshot')}
              >
                <Text style={[styles.radioButtonText, streamingMode === 'snapshot' && styles.radioButtonTextActive]}>
                  Snapshot
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, streamingMode === 'mjpeg' && styles.radioButtonActive]}
                onPress={() => setStreamingMode('mjpeg')}
              >
                <Text style={[styles.radioButtonText, streamingMode === 'mjpeg' && styles.radioButtonTextActive]}>
                  MJPEG Stream
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {streamingMode === 'snapshot' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Snapshot Interval (ms)</Text>
              <TextInput
                style={styles.input}
                value={snapshotInterval}
                onChangeText={setSnapshotInterval}
                placeholder="100"
                placeholderTextColor="#3D5880"
                keyboardType="numeric"
              />
              <Text style={styles.hint}>Lower values = higher frame rate but more network usage</Text>
            </View>
          )}

          <TouchableOpacity style={styles.testButton} onPress={handleTestConnection} activeOpacity={0.8}>
            <Text style={styles.testButtonText}>Test Connection</Text>
          </TouchableOpacity>
        </View>

        {/* ── Latency Settings ── */}
        <View style={styles.card}>
          <SectionTitle>Latency Settings</SectionTitle>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Latency (ms)</Text>
            <TextInput
              style={styles.input}
              value={targetLatency}
              onChangeText={setTargetLatency}
              placeholder="200"
              placeholderTextColor="#3D5880"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>Desired latency for frame processing</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Max Latency (ms)</Text>
            <TextInput
              style={styles.input}
              value={maxLatency}
              onChangeText={setMaxLatency}
              placeholder="500"
              placeholderTextColor="#3D5880"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>Maximum acceptable latency before dropping frames</Text>
          </View>
        </View>

        {/* ── AI Processing ── */}
        <View style={styles.card}>
          <SectionTitle>AI Processing</SectionTitle>

          <View style={styles.switchGroup}>
            <View style={[styles.switchRow, !aiEnabled && styles.switchRowLast]}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.label}>Enable AI Processing</Text>
                <Text style={styles.hint}>Process frames with TFLite model</Text>
              </View>
              <Switch
                value={aiEnabled}
                onValueChange={setAiEnabled}
                trackColor={{ false: '#1A3464', true: '#1D6FE8' }}
                thumbColor={aiEnabled ? '#FFD166' : '#F0F4FF'}
              />
            </View>
          </View>

          {aiEnabled && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>AI Verbosity</Text>
                <View style={styles.radioGroup}>
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[styles.radioButton, aiVerbosity === level && styles.radioButtonActive]}
                      onPress={() => setAiVerbosity(level)}
                    >
                      <Text style={[styles.radioButtonText, aiVerbosity === level && styles.radioButtonTextActive]}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.hint}>
                  Low: Critical alerts only | Medium: Important | High: All detections
                </Text>
              </View>

              <View style={styles.switchGroup}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Text style={styles.label}>Object Detection</Text>
                    <Text style={styles.hint}>Enable TFLite object detection</Text>
                  </View>
                  <Switch
                    value={enableObjectDetection}
                    onValueChange={setEnableObjectDetection}
                    trackColor={{ false: '#1A3464', true: '#1D6FE8' }}
                    thumbColor={enableObjectDetection ? '#FFD166' : '#F0F4FF'}
                  />
                </View>

                <View style={[styles.switchRow, styles.switchRowLast]}>
                  <View style={styles.switchLabelContainer}>
                    <Text style={styles.label}>Audio Alerts</Text>
                    <Text style={styles.hint}>Enable voice navigation alerts</Text>
                  </View>
                  <Switch
                    value={enableAudioAlerts}
                    onValueChange={setEnableAudioAlerts}
                    trackColor={{ false: '#1A3464', true: '#1D6FE8' }}
                    thumbColor={enableAudioAlerts ? '#FFD166' : '#F0F4FF'}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Performance ── */}
        <View style={styles.card}>
          <SectionTitle>Performance</SectionTitle>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Frame Quality</Text>
            <View style={styles.radioGroup}>
              {(['low', 'medium', 'high'] as const).map((quality) => (
                <TouchableOpacity
                  key={quality}
                  style={[styles.radioButton, frameQuality === quality && styles.radioButtonActive]}
                  onPress={() => setFrameQuality(quality)}
                >
                  <Text style={[styles.radioButtonText, frameQuality === quality && styles.radioButtonTextActive]}>
                    {quality.charAt(0).toUpperCase() + quality.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>Lower quality = faster processing but less detail</Text>
          </View>
        </View>

        {/* ── Save Button ── */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#060F1E',
  },

  // ── Page Header ──────────────────────────
  pageHeader: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3464',
    backgroundColor: '#060F1E',
  },
  pageTitle: {
    color: '#F0F4FF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
  },
  pageSubtitle: {
    color: '#7A96BE',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '400',
  },

  // ── Scroll container ─────────────────────
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 14,
  },

  // ── Card ─────────────────────────────────
  card: {
    backgroundColor: '#0D1F3C',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1A3464',
  },

  // ── Section Title ─────────────────────────
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  sectionAccent: {
    width: 3,
    height: 18,
    backgroundColor: '#FFD166',
    borderRadius: 2,
  },
  sectionTitle: {
    color: '#F0F4FF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Inputs ───────────────────────────────
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    color: '#F0F4FF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#060F1E',
    color: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#1A3464',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  hint: {
    color: '#3D5880',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 17,
  },

  // ── Radio Buttons ─────────────────────────
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioButton: {
    flex: 1,
    backgroundColor: '#060F1E',
    borderWidth: 1,
    borderColor: '#1A3464',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  radioButtonActive: {
    backgroundColor: '#1D6FE8',
    borderColor: '#1D6FE8',
  },
  radioButtonText: {
    color: '#3D5880',
    fontSize: 13,
    fontWeight: '600',
  },
  radioButtonTextActive: {
    color: '#F0F4FF',
  },

  // ── Switches ─────────────────────────────
  switchGroup: {
    gap: 0,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 52, 100, 0.7)',
  },
  switchRowLast: {
    borderBottomWidth: 0,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },

  // ── Buttons ───────────────────────────────
  testButton: {
    backgroundColor: '#1D6FE8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#1D6FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  testButtonText: {
    color: '#F0F4FF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  saveButton: {
    backgroundColor: '#FFD166',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#FFD166',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 10,
  },
  saveButtonText: {
    color: '#060F1E',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
