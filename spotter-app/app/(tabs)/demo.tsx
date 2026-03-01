/**
 * Minimal ESP32 Camera Demo
 * Hard-coded IP, fetches /capture repeatedly
 */

import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Image, Button } from "react-native";

const ESP_IP = "172.20.10.2";
const CAPTURE_URL = `http://${ESP_IP}/capture`;

export default function DemoScreen() {
  const [running, setRunning] = useState(false);
  const [frameUri, setFrameUri] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Poll ESP32 every 300ms
    timerRef.current = setInterval(() => {
      // Cache-buster so Image reloads
      const uri = `${CAPTURE_URL}?t=${Date.now()}`;
      setFrameUri(uri);
    }, 300);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32 Camera Feed</Text>
      <Text style={styles.subtitle}>{CAPTURE_URL}</Text>

      <View style={styles.feed}>
        {frameUri ? (
          <Image
            source={{ uri: frameUri }}
            style={styles.image}
            resizeMode="contain"
            onError={(e) => {
              console.log("Image error:", e.nativeEvent);
            }}
          />
        ) : (
          <Text style={{ color: "#888" }}>No frame yet</Text>
        )}
      </View>

      <View style={styles.controls}>
        {!running ? (
          <Button title="Start Camera" onPress={() => setRunning(true)} />
        ) : (
          <Button title="Stop Camera" onPress={() => setRunning(false)} />
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