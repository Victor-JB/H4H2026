/**
 * SettingsScreen.js
 *
 * Allows the user to configure:
 *   - The ESP32 static IP address and port.
 *   - Streaming mode (JPEG snapshot polling vs. MJPEG stream).
 *   - Snapshot polling interval.
 *   - ElevenLabs API key (stored securely in AsyncStorage — never hard-coded).
 *
 * All values are persisted via AsyncStorage and surfaced to the rest of the
 * app through the Esp32ConfigContext defined in App.js.
 */

import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Esp32ConfigContext } from '../../App';
import { pingESP32 } from '../services/ESP32Service';

// AsyncStorage keys
const STORAGE_KEY_ESP32_CONFIG = '@h4h_esp32_config';
const STORAGE_KEY_ELEVENLABS_KEY = '@h4h_elevenlabs_key';

export default function SettingsScreen({ navigation }) {
  const { config: esp32Config, updateConfig } = useContext(Esp32ConfigContext);

  const [ip, setIp] = useState(esp32Config.ip);
  const [port, setPort] = useState(String(esp32Config.port));
  const [useMjpeg, setUseMjpeg] = useState(esp32Config.useMjpeg ?? false);
  const [intervalMs, setIntervalMs] = useState(String(esp32Config.snapshotIntervalMs));
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // ---------------------------------------------------------------------------
  // Save settings to AsyncStorage and update the shared context
  // ---------------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    const portNum = parseInt(port, 10);
    const intervalNum = parseInt(intervalMs, 10);

    if (!ip.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid IP address.');
      return;
    }
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      Alert.alert('Validation Error', 'Port must be a number between 1 and 65535.');
      return;
    }
    if (!useMjpeg && (isNaN(intervalNum) || intervalNum < 50)) {
      Alert.alert('Validation Error', 'Snapshot interval must be at least 50 ms.');
      return;
    }

    const newConfig = {
      ...esp32Config,
      ip: ip.trim(),
      port: portNum,
      useMjpeg,
      snapshotIntervalMs: intervalNum,
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEY_ESP32_CONFIG, JSON.stringify(newConfig));
      if (elevenLabsKey.trim()) {
        // Never log or transmit the key — store it locally only
        await AsyncStorage.setItem(STORAGE_KEY_ELEVENLABS_KEY, elevenLabsKey.trim());
      }

      // Propagate to the rest of the app via context updater
      updateConfig(newConfig);

      Alert.alert('Saved', 'Settings have been saved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', `Failed to save settings: ${err.message}`);
    }
  }, [ip, port, useMjpeg, intervalMs, elevenLabsKey, esp32Config, navigation]);

  // ---------------------------------------------------------------------------
  // Test connection to the configured ESP32
  // ---------------------------------------------------------------------------
  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    const testConfig = { ...esp32Config, ip: ip.trim(), port: parseInt(port, 10) };
    const reachable = await pingESP32(testConfig);
    setTestResult(reachable);
    setIsTesting(false);
  }, [esp32Config, ip, port]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* ---- ESP32 Connection ---- */}
          <Text style={styles.sectionHeader}>ESP32 Connection</Text>

          <Text style={styles.label}>Static IP Address</Text>
          <TextInput
            style={styles.input}
            value={ip}
            onChangeText={setIp}
            keyboardType="numeric"
            placeholder="192.168.43.184"
            placeholderTextColor="#666666"
            accessible
            accessibilityLabel="ESP32 IP address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Port</Text>
          <TextInput
            style={styles.input}
            value={port}
            onChangeText={setPort}
            keyboardType="number-pad"
            placeholder="80"
            placeholderTextColor="#666666"
            accessible
            accessibilityLabel="ESP32 port number"
          />

          {/* Test connection button */}
          <TouchableOpacity
            style={[styles.secondaryButton, isTesting && styles.buttonDisabled]}
            onPress={handleTestConnection}
            disabled={isTesting}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Test ESP32 connection"
          >
            <Text style={styles.secondaryButtonText}>
              {isTesting ? 'Testing…' : 'Test Connection'}
            </Text>
          </TouchableOpacity>

          {testResult !== null && (
            <Text
              style={[styles.testResult, { color: testResult ? '#4caf50' : '#f44336' }]}
              accessible
              accessibilityRole="text"
              accessibilityLabel={testResult ? 'ESP32 reachable' : 'ESP32 not reachable'}
            >
              {testResult ? '✅ ESP32 reachable' : '❌ ESP32 not reachable'}
            </Text>
          )}

          {/* ---- Streaming Mode ---- */}
          <Text style={styles.sectionHeader}>Streaming Mode</Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              {useMjpeg ? 'MJPEG Stream' : 'JPEG Snapshot Polling'}
            </Text>
            <Switch
              value={useMjpeg}
              onValueChange={setUseMjpeg}
              trackColor={{ false: '#444444', true: '#1a73e8' }}
              thumbColor="#ffffff"
              accessible
              accessibilityLabel="Toggle between MJPEG stream and JPEG snapshot polling"
            />
          </View>

          {!useMjpeg && (
            <>
              <Text style={styles.label}>Snapshot Interval (ms)</Text>
              <TextInput
                style={styles.input}
                value={intervalMs}
                onChangeText={setIntervalMs}
                keyboardType="number-pad"
                placeholder="100"
                placeholderTextColor="#666666"
                accessible
                accessibilityLabel="Snapshot polling interval in milliseconds"
              />
            </>
          )}

          {/* ---- ElevenLabs API ---- */}
          <Text style={styles.sectionHeader}>ElevenLabs Narration (optional)</Text>
          <Text style={styles.helperText}>
            Leave blank to use the built-in Expo Speech for scene descriptions.
          </Text>

          <Text style={styles.label}>ElevenLabs API Key</Text>
          <TextInput
            style={styles.input}
            value={elevenLabsKey}
            onChangeText={setElevenLabsKey}
            placeholder="Enter your ElevenLabs API key"
            placeholderTextColor="#666666"
            secureTextEntry
            accessible
            accessibilityLabel="ElevenLabs API key"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* ---- Save ---- */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Save settings"
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 28,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    paddingBottom: 8,
  },
  label: {
    color: '#cccccc',
    fontSize: 16,
    marginBottom: 6,
    marginTop: 14,
  },
  helperText: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    fontSize: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#444444',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
  },
  toggleLabel: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '500',
  },
  secondaryButton: {
    marginTop: 16,
    backgroundColor: '#333333',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  testResult: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  saveButton: {
    marginTop: 36,
    backgroundColor: '#1a73e8',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
});
