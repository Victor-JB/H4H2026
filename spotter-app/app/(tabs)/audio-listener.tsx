import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

const ESP_IP = '172.20.10.9'; // Your ESP32 IP
const STATUS_URL = `http://${ESP_IP}:8080/status`;
const AUDIO_URL = `http://${ESP_IP}:8080/audio.wav`;

export default function AudioListener() {
  const [status, setStatus] = useState("Waiting for ESP32 button press...");
  const [isProcessing, setIsProcessing] = useState(false);
  const pollingTimer = useRef(null);

  // 1. The Polling Function
  const checkEspStatus = async () => {
    // If we are currently downloading or processing, skip this poll tick
    if (isProcessing) return; 

    try {
      const response = await fetch(STATUS_URL);
      if (!response.ok) return;

      const data = await response.json();
      
      // ESP32 flipped isAudioReady to true!
      if (data.ready) {
        console.log("Audio is ready on ESP32!");
        setIsProcessing(true); // Pause polling
        await downloadAndProcessAudio();
      }
    } catch (error) {
      // Ignore network timeouts if ESP32 drops momentarily
    }
  };

  // 2. The Download & Process Function
  const downloadAndProcessAudio = async () => {
    setStatus("Downloading .wav from ESP32...");
    
    try {
      const response = await fetch(AUDIO_URL);
      if (!response.ok) throw new Error("Failed to download audio");

      const audioBlob = await response.blob();
      setStatus("Audio downloaded! Processing...");

      // --- DO YOUR ELEVENLABS / API PROCESSING HERE ---
      console.log("Blob size:", audioBlob.size);
      // const formData = new FormData();
      // formData.append('file', audioBlob, 'recording.wav');
      // await fetch('YOUR_BACKEND_URL', { method: 'POST', body: formData });
      // ------------------------------------------------

      setStatus("Done! Waiting for next recording...");
    } catch (error) {
      console.error("Audio fetch error:", error);
      setStatus("Error fetching audio. Waiting for next recording...");
    } finally {
      // Resume polling for the next time the user presses the button
      setIsProcessing(false); 
    }
  };

  // 3. Start Polling on Mount
  useEffect(() => {
    // Poll every 500ms (0.5 seconds)
    pollingTimer.current = setInterval(checkEspStatus, 500);

    return () => {
      // Cleanup when component unmounts
      if (pollingTimer.current) clearInterval(pollingTimer.current);
    };
  }, [isProcessing]); // Re-bind if isProcessing changes

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32 Audio Link</Text>
      
      <View style={styles.statusBox}>
        {isProcessing && <ActivityIndicator color="#00ff00" style={{marginRight: 10}} />}
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  statusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', padding: 20, borderRadius: 10 },
  statusText: { color: '#00ff00', fontFamily: 'monospace' }
});