/**
 * Optimized ESP32 Camera Demo
 * Uses continuous MJPEG /stream instead of polling /capture
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Button } from "react-native";

const ESP_IP = "172.20.10.2";
// ==== NEW: Use Port 81 and the /stream endpoint ====
// In the standard ESP32 CameraWebServer, the stream runs on Port 81
// to prevent blocking the main control server on Port 80.
const STREAM_URL = `http://${ESP_IP}:81/stream`;

export default function DemoScreen() {
  const [running, setRunning] = useState(false);
  // We use a stream key to force the Image component to completely remount
  // when we stop/start, clearing out any dead sockets or cached broken streams.
  const [streamKey, setStreamKey] = useState(Date.now());

  const handleStart = () => {
    setStreamKey(Date.now()); // Generate a fresh timestamp
    setRunning(true);
  };

  const handleStop = () => {
    setRunning(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32 Camera Feed</Text>
      <Text style={styles.subtitle}>{STREAM_URL}</Text>

      <View style={styles.feed}>
        {/* ==== NEW: Let the native Image component handle the MJPEG stream ==== */}
        {running ? (
          <Image
            key={streamKey} // Forces a fresh mount when started
            source={{ uri: STREAM_URL }}
            style={styles.image}
            resizeMode="contain"
            onError={(e) => {
              console.log("Stream error or disconnected:", e.nativeEvent);
              // Optional: auto-stop if the stream hard crashes
              // setRunning(false); 
            }}
          />
        ) : (
          <Text style={{ color: "#888" }}>Camera Stopped</Text>
        )}
      </View>

      <View style={styles.controls}>
        {!running ? (
          <Button title="Start Camera" onPress={handleStart} color="#28a745" />
        ) : (
          <Button title="Stop Camera" onPress={handleStop} color="#dc3545" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    color: "#888",
    fontSize: 12,
    marginBottom: 12,
  },
  feed: {
    flex: 1,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  controls: {
    paddingVertical: 16,
  },
});