/**
 * LiveVisionScreen.js
 *
 * Primary screen for the H4H Vision app.
 *
 * Responsibilities:
 *  - Displays the live ESP32 camera feed (JPEG snapshot polling by default;
 *    MJPEG stream available via toggle in Settings).
 *  - Prepares incoming frames for the TFLite inference pipeline.
 *  - Shows a connection status banner.
 *  - Exposes large, accessible touch targets for voice commands.
 *  - Speaks navigation alerts via SpeechService.
 */

import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConnectionWatchdog } from '../hooks/useConnectionWatchdog';
import {
  startSnapshotPolling,
  startMjpegStream,
} from '../services/ESP32Service';
import { speakAlert, narrateScene } from '../services/SpeechService';
import { preprocessFrameForTFLite } from '../services/ImagePreprocessor';
import { runInference, DEFAULT_INPUT_SIZE } from '../services/TFLiteService';
import { processDetectionsForNavigation } from '../services/NavigationAssistanceService';
import { Esp32ConfigContext } from '../../App';

// ---------------------------------------------------------------------------
// Frame → TFLite inference + navigation alerts
// ---------------------------------------------------------------------------
async function processFrameWithTFLite(frameInput) {
  const preprocessed = preprocessFrameForTFLite(
    frameInput,
    DEFAULT_INPUT_SIZE,
    DEFAULT_INPUT_SIZE,
  );
  return runInference(preprocessed, 0.5);
}

/** Convert JPEG Uint8Array to data-URI for Image display */
function jpegBytesToDataUri(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/jpeg;base64,${btoa(binary)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LiveVisionScreen({ navigation }) {
  const { config: esp32Config } = useContext(Esp32ConfigContext);
  const { isEsp32Reachable, status: connectionStatus } = useConnectionWatchdog(esp32Config);

  const [currentFrame, setCurrentFrame] = useState(null);
  const [detections, setDetections] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const streamRef = useRef(null);
  const latestFrameRef = useRef(null);
  const inferenceActiveRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Start / stop frame acquisition based on ESP32 reachability and useMjpeg
  // ---------------------------------------------------------------------------
  useEffect(() => {
    streamRef.current?.stop?.();
    streamRef.current = null;

    if (!isEsp32Reachable) {
      setCurrentFrame(null);
      latestFrameRef.current = null;
      return;
    }

    const useMjpeg = esp32Config.useMjpeg ?? false;

    if (useMjpeg) {
      startMjpegStream(
        esp32Config,
        (jpegBytes) => {
          const dataUri = jpegBytesToDataUri(jpegBytes);
          latestFrameRef.current = { dataUri, forInference: jpegBytes };
          setCurrentFrame(dataUri);
        },
        (err) => console.warn('[LiveVision] MJPEG error:', err),
      ).then((stream) => {
        streamRef.current = stream;
      });
      return () => {
        streamRef.current?.stop?.();
        streamRef.current = null;
      };
    }

    streamRef.current = startSnapshotPolling(
      esp32Config,
      (frame) => {
        latestFrameRef.current = { dataUri: frame, forInference: frame };
        setCurrentFrame(frame);
      },
      (err) => console.warn('[LiveVision] snapshot error:', err),
    );

    return () => {
      streamRef.current?.stop?.();
      streamRef.current = null;
    };
  }, [isEsp32Reachable, esp32Config]);

  // ---------------------------------------------------------------------------
  // TFLite inference loop — runs on every new frame at ~10 FPS max
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let animFrame;

    const runInferenceLoop = async () => {
      const latest = latestFrameRef.current;
      if (!inferenceActiveRef.current && latest?.forInference) {
        inferenceActiveRef.current = true;
        setIsProcessing(true);
        try {
          const results = await processFrameWithTFLite(latest.forInference);
          setDetections(results);
          processDetectionsForNavigation(results);
        } catch (err) {
          console.warn('[LiveVision] TFLite error:', err);
        } finally {
          inferenceActiveRef.current = false;
          setIsProcessing(false);
        }
      }
      animFrame = setTimeout(runInferenceLoop, 100);
    };

    runInferenceLoop();
    return () => clearTimeout(animFrame);
  }, []);

  // ---------------------------------------------------------------------------
  // Voice command: describe scene
  // ---------------------------------------------------------------------------
  const handleDescribeScene = useCallback(async () => {
    if (!currentFrame) {
      speakAlert('No frame available. Please check your ESP32 connection.');
      return;
    }
    speakAlert('Analyzing scene…');
    const description =
      detections.length > 0
        ? detections.map((d) => `${d.label} at ${Math.round(d.confidence * 100)}% confidence`).join(', ')
        : 'No objects detected in the current scene.';
    await narrateScene(description);
  }, [currentFrame, detections]);

  // ---------------------------------------------------------------------------
  // Accessibility: announce status changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(connectionStatus);
  }, [connectionStatus]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Connection status banner */}
      <View
        style={[
          styles.statusBanner,
          { backgroundColor: isEsp32Reachable ? '#1a5e1a' : '#8b0000' },
        ]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={connectionStatus}
      >
        <Text style={styles.statusText}>{connectionStatus}</Text>
        {isProcessing && <ActivityIndicator size="small" color="#ffffff" style={{ marginLeft: 8 }} />}
      </View>

      {/* Camera feed or placeholder */}
      <View style={styles.frameContainer} accessible accessibilityLabel="Live camera feed from ESP32">
        {currentFrame ? (
          <Image
            source={{ uri: currentFrame }}
            style={styles.frame}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.noFeedPlaceholder}>
            <Text style={styles.noFeedText}>
              {isEsp32Reachable ? 'Loading stream…' : 'Waiting for ESP32 connection…'}
            </Text>
          </View>
        )}

        {/* Detection overlays */}
        {detections.map((det, idx) => (
          <View
            key={idx}
            style={styles.detectionBadge}
            accessible
            accessibilityLabel={`${det.label} ${Math.round(det.confidence * 100)}%`}
          >
            <Text style={styles.detectionText}>
              {det.label} {Math.round(det.confidence * 100)}%
            </Text>
          </View>
        ))}
      </View>

      {/* Action buttons — large touch targets for blind users */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDescribeScene}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Describe scene"
          accessibilityHint="Speaks a description of what the camera sees"
        >
          <Text style={styles.actionButtonText}>🔊{'\n'}Describe</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={() => navigation.navigate('Settings')}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          accessibilityHint="Configure hotspot and ESP32 connection settings"
        >
          <Text style={styles.actionButtonText}>⚙️{'\n'}Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles — high contrast, large touch targets
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  frameContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: '100%',
    height: '100%',
  },
  noFeedPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noFeedText: {
    color: '#aaaaaa',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  detectionBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,200,0,0.85)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  detectionText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 96,
    backgroundColor: '#1a73e8',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  actionButtonSecondary: {
    backgroundColor: '#444444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },
});
