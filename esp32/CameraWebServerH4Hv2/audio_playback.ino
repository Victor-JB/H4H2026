// ==========================================
// AUDIO PLAYBACK & CHIME
// Handles: speaker init, sine-wave chimes,
//          /play HTTP endpoint
// ==========================================
I2SClass I2S_SPEAKER;

uint8_t*      playbackBuffer   = nullptr;
size_t        playbackDataSize = 0;
volatile bool isPlaying        = false;

void setupSpeaker() {
  playbackBuffer = (uint8_t*)ps_malloc(MAX_AUDIO_SIZE);
  if (!playbackBuffer) {
    Serial.println("CRITICAL: PSRAM allocation failed for playback buffer!");
    while (1);
  }

  I2S_SPEAKER.setPins(I2S_SPK_BCLK, I2S_SPK_LRC, I2S_SPK_DOUT, -1, -1);
  if (!I2S_SPEAKER.begin(I2S_MODE_STD, 16000, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) {
    Serial.println("Failed to initialize I2S Speaker!");
  }
}

void playTone(uint16_t freqHz, uint16_t durationMs) {
  const uint32_t sampleRate   = 16000;
  const uint32_t totalSamples = (sampleRate * durationMs) / 1000;
  const float    amplitude    = 8000.0f;

  for (uint32_t i = 0; i < totalSamples; i++) {
    float   t      = (float)i / (float)sampleRate;
    int16_t sample = (int16_t)(amplitude * sinf(2.0f * PI * freqHz * t));
    I2S_SPEAKER.write(sample);
    I2S_SPEAKER.write(sample); // stereo: same sample on both channels
  }
}

// Two rising tones = "start recording"
void playStartChime() {
  playTone(800,  100);
  delay(30);
  playTone(1200, 100);
}

// Two falling tones = "stop recording"
void playStopChime() {
  playTone(1200, 100);
  delay(30);
  playTone(600,  150);
}

void setupPlaybackEndpoints() {
  // Upload endpoint: app posts ElevenLabs RAW WAV binary here
  audioServer.on("/play", HTTP_POST, []() {
    WiFiClient client = audioServer.client();
    playbackDataSize = 0;
    isPlaying        = false;

    if (client.connected()) {
      Serial.println("Receiving audio from app...");
      while (client.available() && playbackDataSize < MAX_AUDIO_SIZE) {
        playbackDataSize += client.read(
          playbackBuffer + playbackDataSize,
          MAX_AUDIO_SIZE - playbackDataSize
        );
      }
      Serial.printf("Received %u bytes. Starting playback...\n", playbackDataSize);
      isPlaying = true;
    }

    audioServer.sendHeader("Access-Control-Allow-Origin", "*");
    audioServer.send(200, "text/plain", "Sound Playback In Progress");
  });
}
