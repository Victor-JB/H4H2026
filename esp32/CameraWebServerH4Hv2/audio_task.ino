// ==========================================
// AUDIO FREERTOS TASK
// Runs on Core 1; handles both recording capture
// and speaker playback driven by shared state flags.
// ==========================================
void audioTask(void *pvParameters) {
  for (;;) {
    if (isRecording && (audioDataSize + 2 < MAX_AUDIO_SIZE)) {
      // --- Recording ---
      int sample = I2S_MIC.read();
      if (sample && sample != -1 && sample != 1) {
        audioBuffer[audioDataSize]     = sample & 0xFF;
        audioBuffer[audioDataSize + 1] = (sample >> 8) & 0xFF;
        audioDataSize += 2;
      }
    } else if (isPlaying) {
      // --- Playback ---
      Serial.println("Starting physical playback...");
      size_t offset = 44; // skip the 44-byte WAV header sent by the app

      while (offset < playbackDataSize && isPlaying) {
        size_t chunk = min((size_t)1024, playbackDataSize - offset);
        I2S_SPEAKER.write(playbackBuffer + offset, chunk);
        offset += chunk;
      }
      isPlaying = false;
      Serial.println("Playback finished.");
    } else {
      // --- Idle: yield to watchdog/OS ---
      vTaskDelay(10 / portTICK_PERIOD_MS);
    }
  }
}
