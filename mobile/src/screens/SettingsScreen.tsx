/**
 * SettingsScreen.tsx
 *
 * Settings screen for configuring ESP32 connection and AI processing options.
 */

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Esp32ConfigContext } from '../../App';
import { getTestUrl } from '../services/ESP32Service';
import axios from 'axios';
import type { RootStackNavigationProp } from '../types/navigation';
import type { Esp32ConfigUpdate, StreamingMode, AiVerbosity, FrameQuality } from '../types/esp32';
import { Checkbox } from 'expo-checkbox';

const STORAGE_KEY_ESP32_CONFIG = '@h4h_esp32_config';

export default function SettingsScreen() {
  const navigation = useNavigation<RootStackNavigationProp<'Settings'>>();
  const { config, updateConfig } = useContext(Esp32ConfigContext);

  const [ip, setIp] = useState(config.ip);
  const [port, setPort] = useState(String(config.port));
  const [streamingMode, setStreamingMode] = useState<StreamingMode>(
    (config.streamingMode as StreamingMode) || 'snapshot'
  );
  const [snapshotInterval, setSnapshotInterval] = useState(
    String(config.snapshotInterval || 100)
  );
  const [aiEnabled, setAiEnabled] = useState(config.aiEnabled !== false);
  const [aiVerbosity, setAiVerbosity] = useState<AiVerbosity>(
    (config.aiVerbosity as AiVerbosity) || 'medium'
  );
  const [targetLatency, setTargetLatency] = useState(String(config.targetLatency || 200));
  const [maxLatency, setMaxLatency] = useState(String(config.maxLatency || 500));
  const [frameQuality, setFrameQuality] = useState<FrameQuality>(
    (config.frameQuality as FrameQuality) || 'medium'
  );
  const [enableObjectDetection, setEnableObjectDetection] = useState(
    config.enableObjectDetection !== false
  );
  const [enableAudioAlerts, setEnableAudioAlerts] = useState(
    config.enableAudioAlerts !== false
  );
  const [sceneDescription, setSceneDescription] = useState(
    config.sceneDescription !== false
  );
  const [obstacleAvoidance, setObstacleAvoidance] = useState(
    config.obstacleAvoidance !== false
  );
  const [signReading, setSignReading] = useState(
    config.signReading !== false
  );

  const handleSave = async () => {
    const newConfig: Esp32ConfigUpdate = {
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
      (updateConfig as (c: Esp32ConfigUpdate) => void)(newConfig);
      Alert.alert('Success', 'Settings saved!');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleTestConnection = async () => {
    const testConfig = {
      ip: ip.trim(),
      port: parseInt(port, 10) || 80,
    };

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mode Selection</Text>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setSceneDescription((v) => !v)}
          activeOpacity={0.7}
        >
          <Checkbox
            value={sceneDescription}
            onValueChange={setSceneDescription}
            color={sceneDescription ? '#1a73e8' : undefined}
          />
          <Text style={styles.checkboxLabel}>Scene Description</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setObstacleAvoidance((v) => !v)}
          activeOpacity={0.7}
        >
          <Checkbox
            value={obstacleAvoidance}
            onValueChange={setObstacleAvoidance}
            color={obstacleAvoidance ? '#1a73e8' : undefined}
          />
          <Text style={styles.checkboxLabel}>Obstacle Avoidance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setSignReading((v) => !v)}
          activeOpacity={0.7}
        >
          <Checkbox
            value={signReading}
            onValueChange={setSignReading}
            color={signReading ? '#1a73e8' : undefined}
          />
          <Text style={styles.checkboxLabel}>Sign reading</Text>
        </TouchableOpacity>
      </View>

      {/* Connection Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Settings</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ESP32 IP Address</Text>
          <TextInput
            style={styles.input}
            value={ip}
            onChangeText={setIp}
            placeholder="192.168.43.184"
            placeholderTextColor="#666"
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
            placeholderTextColor="#666"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Streaming Mode</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                streamingMode === 'snapshot' && styles.radioButtonActive,
              ]}
              onPress={() => setStreamingMode('snapshot')}
            >
              <Text
                style={[
                  styles.radioButtonText,
                  streamingMode === 'snapshot' && styles.radioButtonTextActive,
                ]}
              >
                Snapshot
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioButton,
                streamingMode === 'mjpeg' && styles.radioButtonActive,
              ]}
              onPress={() => setStreamingMode('mjpeg')}
            >
              <Text
                style={[
                  styles.radioButtonText,
                  streamingMode === 'mjpeg' && styles.radioButtonTextActive,
                ]}
              >
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
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>
              Lower values = higher frame rate but more network usage
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.testButton} onPress={handleTestConnection}>
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>
      </View>

      {/* Latency Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Latency Settings</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Target Latency (ms)</Text>
          <TextInput
            style={styles.input}
            value={targetLatency}
            onChangeText={setTargetLatency}
            placeholder="200"
            placeholderTextColor="#666"
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
            placeholderTextColor="#666"
            keyboardType="numeric"
          />
          <Text style={styles.hint}>Maximum acceptable latency before dropping frames</Text>
        </View>
      </View>

      {/* AI Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Processing</Text>

        <View style={styles.switchGroup}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Text style={styles.label}>Enable AI Processing</Text>
              <Text style={styles.hint}>Process frames with TFLite model</Text>
            </View>
            <Switch
              value={aiEnabled}
              onValueChange={setAiEnabled}
              trackColor={{ false: '#333', true: '#1a73e8' }}
              thumbColor={aiEnabled ? '#fff' : '#f4f3f4'}
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
                    style={[
                      styles.radioButton,
                      aiVerbosity === level && styles.radioButtonActive,
                    ]}
                    onPress={() => setAiVerbosity(level)}
                  >
                    <Text
                      style={[
                        styles.radioButtonText,
                        aiVerbosity === level && styles.radioButtonTextActive,
                      ]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hint}>
                Low: Critical alerts only | Medium: Important alerts | High: All detections
              </Text>
            </View>

            <View style={styles.switchGroup}>
              

              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.label}>Audio Alerts</Text>
                  <Text style={styles.hint}>Enable voice navigation alerts</Text>
                </View>
                <Switch
                  value={enableAudioAlerts}
                  onValueChange={setEnableAudioAlerts}
                  trackColor={{ false: '#333', true: '#1a73e8' }}
                  thumbColor={enableAudioAlerts ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>
          </>
        )}
      </View>

      {/* Performance Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Frame Quality</Text>
          <View style={styles.radioGroup}>
            {(['low', 'medium', 'high'] as const).map((quality) => (
              <TouchableOpacity
                key={quality}
                style={[
                  styles.radioButton,
                  frameQuality === quality && styles.radioButtonActive,
                ]}
                onPress={() => setFrameQuality(quality)}
              >
                <Text
                  style={[
                    styles.radioButtonText,
                    frameQuality === quality && styles.radioButtonTextActive,
                  ]}
                >
                  {quality.charAt(0).toUpperCase() + quality.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>
            Lower quality = faster processing but less detail
          </Text>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.buttonText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  hint: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  radioButtonActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  radioButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  radioButtonTextActive: {
    color: '#fff',
  },
  switchGroup: {
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  testButton: {
    backgroundColor: '#1a73e8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#34a853',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
