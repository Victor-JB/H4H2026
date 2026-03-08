// ==========================================
// AUDIO RECORDING
// Handles: mic init, capture state, WAV header,
//          /status and /audio.wav HTTP endpoints
// ==========================================
I2SClass I2S_MIC;

uint8_t*      audioBuffer        = nullptr;
size_t        audioDataSize      = 0;
volatile bool isRecording        = false;
bool          isAudioReady       = false;
uint32_t      recordingStartTime = 0;

void setupMic() {
  audioBuffer = (uint8_t*)ps_malloc(MAX_AUDIO_SIZE);
  if (!audioBuffer) {
    Serial.println("CRITICAL: PSRAM allocation failed for audio buffer!");
    while (1);
  }

  I2S_MIC.setPinsPdmRx(42, 41);
  if (!I2S_MIC.begin(I2S_MODE_PDM_RX, 16000, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) {
    Serial.println("Failed to initialize I2S Mic!");
  }
}

void sendWavHeader(WiFiClient& client, uint32_t dataSize) {
  byte     header[44];
  uint32_t fileSize      = dataSize + 36;
  uint32_t sampleRate    = 16000;
  uint16_t numChannels   = 1;
  uint16_t bitsPerSample = 16;
  uint32_t byteRate      = sampleRate * numChannels * (bitsPerSample / 8);

  memcpy(header, "RIFF", 4);
  header[4]  = fileSize & 0xFF;        header[5]  = (fileSize >> 8)  & 0xFF;
  header[6]  = (fileSize >> 16) & 0xFF; header[7]  = (fileSize >> 24) & 0xFF;
  memcpy(header + 8, "WAVEfmt ", 8);
  header[16] = 16; header[17] = 0; header[18] = 0; header[19] = 0;
  header[20] = 1;  header[21] = 0;
  header[22] = (byte)numChannels; header[23] = 0;
  header[24] = sampleRate & 0xFF;        header[25] = (sampleRate >> 8)  & 0xFF;
  header[26] = (sampleRate >> 16) & 0xFF; header[27] = (sampleRate >> 24) & 0xFF;
  header[28] = byteRate & 0xFF;          header[29] = (byteRate >> 8)  & 0xFF;
  header[30] = (byteRate >> 16) & 0xFF;  header[31] = (byteRate >> 24) & 0xFF;
  header[32] = (byte)(numChannels * bitsPerSample / 8); header[33] = 0;
  header[34] = (byte)bitsPerSample; header[35] = 0;
  memcpy(header + 36, "data", 4);
  header[40] = dataSize & 0xFF;          header[41] = (dataSize >> 8)  & 0xFF;
  header[42] = (dataSize >> 16) & 0xFF;  header[43] = (dataSize >> 24) & 0xFF;

  client.write(header, 44);
}

void setupRecordingEndpoints() {
  // Polling endpoint for React Native app
  audioServer.on("/status", []() {
    String json = isAudioReady ? "{\"ready\":true}" : "{\"ready\":false}";
    audioServer.sendHeader("Access-Control-Allow-Origin", "*");
    audioServer.send(200, "application/json", json);
  });

  // Download endpoint: app fetches recorded audio here
  audioServer.on("/audio.wav", []() {
    if (isRecording) {
      audioServer.send(400, "text/plain", "Recording in progress");
      return;
    }

    WiFiClient client = audioServer.client();
    audioServer.setContentLength(44 + audioDataSize);
    audioServer.sendHeader("Content-Type", "audio/wav");
    audioServer.sendHeader("Connection", "close");
    audioServer.sendHeader("Access-Control-Allow-Origin", "*");
    audioServer.send(200);

    sendWavHeader(client, audioDataSize);
    client.write(audioBuffer, audioDataSize);

    isAudioReady = false; // Reset after download
    Serial.println("Audio downloaded by app");
  });
}
