#include "esp_camera.h"
#include <WiFi.h>
#include "secrets.h" 
#include <WiFiClient.h>
#include <ESP_I2S.h>
#include <WebServer.h>

// ==========================================
// FUNCTION PROTOTYPES
// ==========================================
void sendWavHeader(WiFiClient& client, uint32_t dataSize);
void startCameraServer();
void setupLedFlash(int pin);

// ==========================================
// CONFIGURATION & HARDWARE PINS
// ==========================================
#define CAMERA_MODEL_XIAO_ESP32S3
#include "camera_pins.h"

#define BUTTON_PIN 1

// NEW: Define pins for your I2S Speaker Amplifier (e.g. MAX98357A)
#define I2S_SPK_BCLK 7
#define I2S_SPK_LRC  8
#define I2S_SPK_DOUT 9

// ==========================================
// GLOBALS & STATE
// ==========================================
WebServer audioServer(8080); 
I2SClass I2S_MIC;     // For microphone
I2SClass I2S_SPEAKER; // NEW: For playback

const size_t MAX_AUDIO_SIZE = 480000; 
uint8_t* audioBuffer = nullptr;
size_t audioDataSize = 0;

// NEW: Playback buffer and state
uint8_t* playbackBuffer = nullptr;
size_t playbackDataSize = 0;
volatile bool isPlaying = false; 

volatile bool isRecording = false; 
bool isAudioReady = false;
uint32_t recordingStartTime = 0;
const uint32_t MAX_RECORD_TIME_MS = 15000; 

int lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50;

// ==========================================
// WAV HEADER GENERATOR (Unchanged)
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
// MODIFIED: FREERTOS AUDIO TASK (Handles Rec & Play)
// ==========================================
void audioTask(void *pvParameters) {
  for (;;) {
    if (isRecording && (audioDataSize + 2 < MAX_AUDIO_SIZE)) {
      int sample = I2S_MIC.read();
      if (sample && sample != -1 && sample != 1) {
        audioBuffer[audioDataSize] = sample & 0xFF;
        audioBuffer[audioDataSize + 1] = (sample >> 8) & 0xFF;
        audioDataSize += 2;
      }
    } 
    // NEW: Playback Routine
    else if (isPlaying) {
      Serial.println("🔊 Starting physical playback...");
      // Skip the 44-byte WAV header from the app
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
    else {
      vTaskDelay(10 / portTICK_PERIOD_MS); 
    }
  }
}

// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  audioBuffer = (uint8_t*)ps_malloc(MAX_AUDIO_SIZE);
  playbackBuffer = (uint8_t*)ps_malloc(MAX_AUDIO_SIZE); // NEW: Allocate playback memory
  
  if (!audioBuffer || !playbackBuffer) {
    Serial.println("CRITICAL: PSRAM allocation failed!");
    while(1); 
  }

  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_8_5dBm); 
  WiFi.setSleep(false); 
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  
  startCameraServer();

  // --- CAMERA INIT REDACTED FOR BREVITY (Keep your existing camera code here) ---

  // Init Microphone 
  I2S_MIC.setPinsPdmRx(42, 41);
  if (!I2S_MIC.begin(I2S_MODE_PDM_RX, 16000, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) {
    Serial.println("Failed to initialize I2S Mic!");
  }

  // NEW: Init Speaker Output
  // I2S1 is used to avoid conflict with I2S0 (the mic)
  I2S_SPEAKER.setPins(I2S_SPK_BCLK, I2S_SPK_LRC, I2S_SPK_DOUT, -1, -1);
  if (!I2S_SPEAKER.begin(I2S_MODE_STD_TX, 16000, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) {
    Serial.println("Failed to initialize I2S Speaker!");
  }

  // --- WEB SERVER ENDPOINTS ---
  
  audioServer.on("/status", []() {
    String json = isAudioReady ? "{\"ready\":true}" : "{\"ready\":false}";
    audioServer.sendHeader("Access-Control-Allow-Origin", "*");
    audioServer.send(200, "application/json", json);
  });

  audioServer.on("/audio.wav", []() {
    // ... (Keep your existing /audio.wav logic here) ...
  });

  // NEW: Endpoint to receive the WAV file from the iPhone
  audioServer.on("/play", HTTP_POST, 
    // Function to run AFTER upload finishes
    []() { 
      audioServer.sendHeader("Access-Control-Allow-Origin", "*");
      audioServer.send(200, "text/plain", "Audio received and queued for playback");
    },
    // Function to handle the actual file data as it streams in
    []() { 
      HTTPUpload& upload = audioServer.upload();
      
      if (upload.status == UPLOAD_FILE_START) {
        Serial.println("📥 Receiving audio response from iPhone...");
        isPlaying = false;      // Stop any current playback
        playbackDataSize = 0;   // Reset buffer
      } 
      else if (upload.status == UPLOAD_FILE_WRITE) {
        // Write the incoming data directly into our PSRAM buffer
        if (playbackDataSize + upload.currentSize < MAX_AUDIO_SIZE) {
          memcpy(playbackBuffer + playbackDataSize, upload.buf, upload.currentSize);
          playbackDataSize += upload.currentSize;
        }
      } 
      else if (upload.status == UPLOAD_FILE_END) {
        Serial.printf("✅ Received %u bytes. Starting playback...\n", playbackDataSize);
        isPlaying = true; // This tells the FreeRTOS task to start playing
      }
    }
  );

  audioServer.begin();

  // Launch Background Audio Task
  xTaskCreatePinnedToCore(audioTask, "AudioTask", 4096, NULL, 2, NULL, 1);
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
      
      if (buttonState == LOW) { 
        if (!isRecording && !isPlaying) { // Don't record if we are currently playing audio
          isRecording = true;
          isAudioReady = false;
          audioDataSize = 0; 
          recordingStartTime = millis();
          Serial.println("🎤 Recording Started!");
        } else {
          isRecording = false;
          isAudioReady = true;
          Serial.println("🛑 Recording Stopped Manually!");
        }
      }
    }
  }
  lastButtonState = reading;

  if (isRecording && (millis() - recordingStartTime >= MAX_RECORD_TIME_MS)) {
    isRecording = false;
    isAudioReady = true;
    Serial.println("🛑 Recording Stopped (Auto Limit)");
  }
}