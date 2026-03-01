/**
 * DemoScreen.tsx
 *
 * Demo/test page for ESP32 camera functionality with placeholder video feed.
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Esp32ConfigContext } from '../../App';
import { getStreamUrl } from '../services/ESP32Service';
import type { RootStackNavigationProp } from '../types/navigation';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface FrameInfo {
  uri: string;
  timestamp: number;
}

export default function DemoScreen() {
  const navigation = useNavigation<RootStackNavigationProp<'Demo'>>();
  const { config } = useContext(Esp32ConfigContext);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<FrameInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [lastFrameTime, setLastFrameTime] = useState(Date.now());

  const streamUrl = getStreamUrl(config);

  // Simulate frame updates for demo
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeDiff = now - lastFrameTime;
      if (timeDiff > 0) {
        const currentFps = Math.round(1000 / timeDiff);
        setFps(currentFps);
      }
      setLastFrameTime(now);
      setFrameCount((prev) => prev + 1);

      // In a real implementation, this would fetch the actual frame from ESP32
      // For now, we'll use a placeholder
      setCurrentFrame({ uri: streamUrl, timestamp: Date.now() });
    }, config.snapshotInterval || 100);

    return () => clearInterval(interval);
  }, [isStreaming, config.snapshotInterval, streamUrl, lastFrameTime]);

  const handleStartStream = () => {
    if (!config.ip || !config.port) {
      Alert.alert('Error', 'Please configure ESP32 IP and port in Settings first.');
      navigation.navigate('Settings');
      return;
    }
    setIsStreaming(true);
    setConnectionStatus('connecting');
    setFrameCount(0);
    setLastFrameTime(Date.now());

    // Simulate connection delay
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 1000);
  };

  const handleStopStream = () => {
    setIsStreaming(false);
    setConnectionStatus('disconnected');
    setCurrentFrame(null);
    setFps(0);
  };

  const getStatusColor = (): string => {
    switch (connectionStatus) {
      case 'connected':
        return '#34a853';
      case 'connecting':
        return '#fbbc04';
      default:
        return '#ea4335';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with connection info */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>{connectionStatus.toUpperCase()}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.connectionInfo}>
          {config.ip}:{config.port} • {config.streamingMode}
        </Text>
      </View>

      {/* Video feed area */}
      <View style={styles.videoContainer}>
        {isStreaming ? (
          currentFrame ? (
            <Image
              source={{ uri: currentFrame.uri }}
              style={styles.videoPlaceholder}
              onError={() => {
                // If image fails to load, show placeholder
                setCurrentFrame(null);
              }}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <ActivityIndicator size="large" color="#1a73e8" />
              <Text style={styles.placeholderText}>Loading camera feed...</Text>
              <Text style={styles.placeholderSubtext}>
                Placeholder: Real ESP32 feed will appear here
              </Text>
            </View>
          )
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderIcon}>📹</Text>
            <Text style={styles.placeholderText}>Camera Feed Placeholder</Text>
            <Text style={styles.placeholderSubtext}>
              Press "Start Stream" to begin receiving frames from ESP32
            </Text>
            <Text style={styles.placeholderSubtext}>
              ESP32 URL: {streamUrl}
            </Text>
          </View>
        )}

        {/* Overlay stats */}
        {isStreaming && (
          <View style={styles.statsOverlay}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>FPS</Text>
              <Text style={styles.statValue}>{fps}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Frames</Text>
              <Text style={styles.statValue}>{frameCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Mode</Text>
              <Text style={styles.statValue}>{config.streamingMode}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isStreaming ? (
          <TouchableOpacity style={styles.startButton} onPress={handleStartStream}>
            <Text style={styles.buttonText}>▶ Start Stream</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={handleStopStream}>
            <Text style={styles.buttonText}>⏹ Stop Stream</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info panel */}
      <ScrollView style={styles.infoPanel} contentContainerStyle={styles.infoContent}>
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Stream Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Stream URL:</Text>
            <Text style={styles.infoValue}>{streamUrl}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Update Interval:</Text>
            <Text style={styles.infoValue}>{config.snapshotInterval}ms</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>AI Processing:</Text>
            <Text style={styles.infoValue}>
              {config.aiEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          {config.aiEnabled && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>AI Verbosity:</Text>
              <Text style={styles.infoValue}>{config.aiVerbosity || 'Medium'}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  connectionInfo: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: '#111',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  statsOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 12,
    minWidth: 100,
  },
  statItem: {
    marginBottom: 8,
  },
  statLabel: {
    color: '#888',
    fontSize: 10,
    marginBottom: 2,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controls: {
    padding: 20,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  startButton: {
    backgroundColor: '#34a853',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#ea4335',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoPanel: {
    maxHeight: 150,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  infoContent: {
    padding: 16,
  },
  infoSection: {
    marginBottom: 12,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
  },
  infoValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
