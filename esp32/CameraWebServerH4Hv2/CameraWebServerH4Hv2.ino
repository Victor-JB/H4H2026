#include "esp_camera.h"
#include <WiFi.h>
#include "secrets.h" 
#include <WiFiClient.h>
#include <ESP_I2S.h>
#include <WebServer.h>

// ==========================================
// FUNCTION PROTOTYPES (Fixes compiler bugs)
// ==========================================
void sendWavHeader(WiFiClient& client, uint32_t dataSize);
void startCameraServer();
void setupLedFlash(int pin);

// ==========================================
// CONFIGURATION & HARDWARE PINS
// ==========================================
#define CAMERA_MODEL_XIAO_ESP32S3 // Ensure this matches your camera_pins.h
#include "camera_pins.h"

#define BUTTON_PIN 1 // Physical button GPIO

// Define pins for your I2S Speaker Amplifier (e.g., MAX98357A)
#define I2S_SPK_BCLK 4
#define I2S_SPK_LRC  5
#define I2S_SPK_DOUT 6

// ==========================================
// GLOBALS & STATE
// ==========================================
WebServer audioServer(8080); 
I2SClass I2S_MIC;     // For microphone
I2SClass I2S_SPEAKER; // For playback

// 15 seconds of 16kHz 16-bit mono audio = 480,000 bytes
const size_t MAX_AUDIO_SIZE = 480000; 

// Recording buffer and state
uint8_t* audioBuffer = nullptr;
size_t audioDataSize = 0;
volatile bool isRecording = false; 
bool isAudioReady = false;
uint32_t recordingStartTime = 0;
const uint32_t MAX_RECORD_TIME_MS = 15000; // 15 seconds max

// Playback buffer and state
uint8_t* playbackBuffer = nullptr;
size_t playbackDataSize = 0;
volatile bool isPlaying = false; 

// Button debounce
int lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50;

// ==========================================
// CHIME GENERATOR (simple sine-wave beeps)
// ==========================================
void playTone(uint16_t freqHz, uint16_t durationMs) {
  const uint32_t sampleRate = 16000;
  const uint32_t totalSamples = (sampleRate * durationMs) / 1000;
  const float amplitude = 8000.0f; // Volume (max 32767 for 16-bit)

  for (uint32_t i = 0; i < totalSamples; i++) {
    float t = (float)i / (float)sampleRate;
    int16_t sample = (int16_t)(amplitude * sinf(2.0f * PI * freqHz * t));
    I2S_SPEAKER.write(sample);
    I2S_SPEAKER.write(sample); // stereo: same on both channels
  }
}

// Two rising tones = "start recording"
void playStartChime() {
  Serial.println("🔔 Start chime");
  playTone(800,  100); // short beep
  delay(30);
  playTone(1200, 100); // higher beep
}

// Two falling tones = "stop recording"
void playStopChime() {
  Serial.println("🔔 Stop chime");
  playTone(1200, 100); // high beep
  delay(30);
  playTone(600,  150); // lower, slightly longer beep
}

// ==========================================
// WAV HEADER GENERATOR
// ==========================================
void sendWavHeader(WiFiClient& client, uint32_t dataSize) {
  byte header[44];
  uint32_t fileSize = dataSize + 36;
  uint32_t sampleRate = 16000;
  uint16_t numChannels = 1;
  uint16_t bitsPerSample = 16;
  uint32_t byteRate = sampleRate * numChannels * (bitsPerSample / 8);

  memcpy(header, "RIFF", 4);
  header[4] = (byte)(fileSize & 0xFF); header[5] = (byte)((fileSize >> 8) & 0xFF); header[6] = (byte)((fileSize >> 16) & 0xFF); header[7] = (byte)((fileSize >> 24) & 0xFF);
  memcpy(header + 8, "WAVEfmt ", 8);
  header[16] = 16; header[17] = 0; header[18] = 0; header[19] = 0;
  header[20] = 1; header[21] = 0;
  header[22] = (byte)numChannels; header[23] = 0;
  header[24] = (byte)(sampleRate & 0xFF); header[25] = (byte)((sampleRate >> 8) & 0xFF); header[26] = (byte)((sampleRate >> 16) & 0xFF); header[27] = (byte)((sampleRate >> 24) & 0xFF);
  header[28] = (byte)(byteRate & 0xFF); header[29] = (byte)((byteRate >> 8) & 0xFF); header[30] = (byte)((byteRate >> 16) & 0xFF); header[31] = (byte)((byteRate >> 24) & 0xFF);
  header[32] = (byte)(numChannels * bitsPerSample / 8); header[33] = 0;
  header[34] = (byte)bitsPerSample; header[35] = 0;
  memcpy(header + 36, "data", 4);
  header[40] = (byte)(dataSize & 0xFF); header[41] = (byte)((dataSize >> 8) & 0xFF); header[42] = (byte)((dataSize >> 16) & 0xFF); header[43] = (byte)((dataSize >> 24) & 0xFF);

  client.write(header, 44);
}

// ==========================================
// DEDICATED FREERTOS AUDIO TASK
// ==========================================
void audioTask(void *pvParameters) {
  for (;;) {
    // 1. Recording Routine
    if (isRecording && (audioDataSize + 2 < MAX_AUDIO_SIZE)) {
      int sample = I2S_MIC.read();
      if (sample && sample != -1 && sample != 1) {
        // Write 16-bit sample (Little Endian)
        audioBuffer[audioDataSize] = sample & 0xFF;
        audioBuffer[audioDataSize + 1] = (sample >> 8) & 0xFF;
        audioDataSize += 2;
      }
    } 
    // 2. Playback Routine
    else if (isPlaying) {
      Serial.println("🔊 Starting physical playback...");
      // Skip the 44-byte WAV header sent by the app
      size_t offset = 44; 
      
      while (offset < playbackDataSize && isPlaying) {
        // Write chunks to the I2S speaker amplifier
        size_t bytesToWrite = 1024;
        if (offset + bytesToWrite > playbackDataSize) {
          bytesToWrite = playbackDataSize - offset;
        }
        
        I2S_SPEAKER.write(playbackBuffer + offset, bytesToWrite);
        offset += bytesToWrite;
      }
      isPlaying = false;
      Serial.println("🔊 Playback finished!");
    } 
    // 3. Idle Routine
    else {
      // Yield to watchdog/OS when not actively recording or playing to save CPU
      vTaskDelay(10 / portTICK_PERIOD_MS); 
    }
  }
}

// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();

  // 1. Hardware Init
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Allocate PSRAM for audio buffers
  audioBuffer = (uint8_t*)ps_malloc(MAX_AUDIO_SIZE);
  playbackBuffer = (uint8_t*)ps_malloc(MAX_AUDIO_SIZE);
  
  if (!audioBuffer || !playbackBuffer) {
    Serial.println("CRITICAL: PSRAM allocation failed for audio!");
    while(1); 
  }

  // 2. Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_8_5dBm); 
  WiFi.setSleep(false); // Crucial for camera stream stability
  WiFi.begin(ssid, password);
  Serial.print("WiFi connecting");
  
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nFailed to connect to Hotspot. Restarting...");
    ESP.restart();
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // 3. Start the Camera's hidden Web Server (Port 80)
  startCameraServer();

  // 4. Initialize the Camera Hardware
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  
  // Stabilized values for streaming over mobile hotspot
  config.xclk_freq_hz = 10000000;
  config.frame_size = FRAMESIZE_VGA;
  config.pixel_format = PIXFORMAT_JPEG;  
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 15;
  config.fb_count = 1;

  if (psramFound()) {
    config.jpeg_quality = 15;
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  sensor_t *s = esp_camera_sensor_get();
  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_brightness(s, 1);  
    s->set_saturation(s, -2);
  }

  s->set_framesize(s, FRAMESIZE_VGA);
  s->set_quality(s, 15);

#if defined(LED_GPIO_NUM)
  setupLedFlash(LED_GPIO_NUM);
#endif

  // 5. Init Microphone 
  I2S_MIC.setPinsPdmRx(42, 41);
  if (!I2S_MIC.begin(I2S_MODE_PDM_RX, 16000, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) {
    Serial.println("Failed to initialize I2S Mic!");
  }

  // 6. Init Speaker Output
  I2S_SPEAKER.setPins(I2S_SPK_BCLK, I2S_SPK_LRC, I2S_SPK_DOUT, -1, -1);
  if (!I2S_SPEAKER.begin(I2S_MODE_STD, 16000, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) {
    Serial.println("Failed to initialize I2S Speaker!");
  }

  // 7. Setup Audio Web Server Endpoints (Port 8080)
  
  // Polling endpoint for React Native app
  audioServer.on("/status", []() {
    String json = isAudioReady ? "{\"ready\":true}" : "{\"ready\":false}";
    audioServer.sendHeader("Access-Control-Allow-Origin", "*");
    audioServer.send(200, "application/json", json);
  });

  // Download endpoint: App fetches recorded audio here
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
    
    isAudioReady = false; // Reset state after download
    Serial.println("📤 Audio downloaded by app");
  });

  // Upload endpoint: App posts ElevenLabs RAW WAV binary here
  audioServer.on("/play", HTTP_POST, 
    []() { 
      audioServer.sendHeader("Access-Control-Allow-Origin", "*");
      audioServer.send(200, "text/plain", "Audio received");
    },
    // We don't use HTTPUpload because React Native will just stream raw binary.
    // Instead we read the data directly out of the client.
    []() { }
  );

  // We add a custom handler to grab the raw binary body data from the request
  audioServer.on("/play", HTTP_POST, []() {
    if (audioServer.hasArg("plain")) {
      String body = audioServer.arg("plain");
      // Fallback if small string body
    }
    
    // Check if there is data to read
    WiFiClient client = audioServer.client();
    playbackDataSize = 0;
    isPlaying = false;
    
    if (client.connected()) {
      Serial.println("📥 Receiving RAW audio streaming response from iPhone...");
      
      while (client.available() && playbackDataSize < MAX_AUDIO_SIZE) {
        size_t bytesRead = client.read(playbackBuffer + playbackDataSize, MAX_AUDIO_SIZE - playbackDataSize);
        playbackDataSize += bytesRead;
      }
      
      Serial.printf("✅ Received %u bytes. Starting playback...\n", playbackDataSize);
      isPlaying = true;
    }
    
    audioServer.sendHeader("Access-Control-Allow-Origin", "*");
    audioServer.send(200, "text/plain", "Sound Playback In Progress");
  });

  audioServer.begin();
  Serial.println("Camera Server running on Port 80");
  Serial.println("Audio Server running on Port 8080");

  // 8. Launch Background Audio Task on Core 1
  xTaskCreatePinnedToCore(
    audioTask, "AudioTask", 4096, NULL, 2, NULL, 1
  );
}

// ==========================================
// MAIN LOOP
// ==========================================
void loop() {
  audioServer.handleClient();

  int reading = digitalRead(BUTTON_PIN);
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    static int buttonState = HIGH;
    if (reading != buttonState) {
      buttonState = reading;

      if (buttonState == LOW) { // Button pressed
        if (!isRecording && !isPlaying) {
          // Play start chime BEFORE recording begins
          playStartChime();
          delay(50); // tiny gap so chime doesn't bleed into recording

          isRecording = true;
          isAudioReady = false;
          audioDataSize = 0;
          Serial.println("🎤 Recording Started!");

        } else if (isRecording) {
          // Stop recording FIRST so chime isn't captured
          isRecording = false;
          isAudioReady = true;
          Serial.println("🛑 Recording Stopped!");

          // Play stop chime AFTER recording ends
          delay(50);
          playStopChime();
          Serial.println("✅ Ready for App to fetch.");
        }
      }
    }
  }
  lastButtonState = reading;
}