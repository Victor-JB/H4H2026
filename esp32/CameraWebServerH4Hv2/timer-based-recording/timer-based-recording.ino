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

// ==========================================
// GLOBALS & STATE
// ==========================================
// IMPORTANT: Audio server MUST be on 8080 because the camera takes over port 80
WebServer audioServer(8080); 
I2SClass I2S;

// 5 seconds of 16kHz 16-bit mono audio = 160,000 bytes
const size_t MAX_AUDIO_SIZE = 160000; 
uint8_t* audioBuffer = nullptr;
size_t audioDataSize = 0;

volatile bool isRecording = false; // volatile because shared with FreeRTOS task
bool isAudioReady = false;
uint32_t recordingStartTime = 0;
const uint32_t RECORD_DURATION_MS = 5000; // Record for 5 seconds

// Timer state: auto-start recording 2s after WiFi connects
bool recordingTriggered = false;

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
void audioRecordTask(void *pvParameters) {
  for (;;) {
    if (isRecording && (audioDataSize + 2 < MAX_AUDIO_SIZE)) {
      int sample = I2S.read();
      if (sample && sample != -1 && sample != 1) {
        // Write 16-bit sample (Little Endian)
        audioBuffer[audioDataSize] = sample & 0xFF;
        audioBuffer[audioDataSize + 1] = (sample >> 8) & 0xFF;
        audioDataSize += 2;
      }
    } else {
      // Yield to watchdog/OS when not actively recording to save CPU
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
  // Allocate PSRAM for audio
  audioBuffer = (uint8_t*)ps_malloc(MAX_AUDIO_SIZE);
  if (!audioBuffer) {
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
  s->set_quality(s, 4);

#if defined(LED_GPIO_NUM)
  setupLedFlash(LED_GPIO_NUM);
#endif

  // 5. Init Microphone 
  I2S.setPinsPdmRx(42, 41);
  if (!I2S.begin(I2S_MODE_PDM_RX, 16000, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) {
    Serial.println("Failed to initialize I2S!");
  }

  // 6. Setup Audio Web Server Endpoints (Port 8080)
  audioServer.on("/audio.wav", []() {
    if (isRecording) {
      audioServer.send(400, "text/plain", "Recording in progress");
      return;
    }
    
    WiFiClient client = audioServer.client();
    audioServer.setContentLength(44 + audioDataSize);
    audioServer.sendHeader("Content-Type", "audio/wav");
    audioServer.sendHeader("Connection", "close");
    
    // Add CORS headers so React Native fetch doesn't complain
    audioServer.sendHeader("Access-Control-Allow-Origin", "*");
    audioServer.send(200);
    
    sendWavHeader(client, audioDataSize);
    client.write(audioBuffer, audioDataSize);
    
    isAudioReady = false; // Reset state after download
    Serial.println("📤 Audio downloaded by app");
  });

  audioServer.on("/status", []() {
    String json = isAudioReady ? "{\"ready\":true}" : "{\"ready\":false}";
    audioServer.sendHeader("Access-Control-Allow-Origin", "*");
    audioServer.send(200, "application/json", json);
  });

  audioServer.begin();
  Serial.println("Camera Server running on Port 80");
  Serial.println("Audio Server running on Port 8080");

  // 7. Launch Background Audio Task on Core 1
  xTaskCreatePinnedToCore(
    audioRecordTask, "AudioTask", 4096, NULL, 2, NULL, 1
  );

  // 8. Wait 2s after setup, then auto-start recording
  Serial.println("⏳ Waiting 15s before starting recording...");
  delay(15000);

  audioDataSize = 0;
  isAudioReady = false;
  recordingStartTime = millis();
  isRecording = true;
  recordingTriggered = true;
  Serial.println("🎤 Recording started (auto-timer). Will record for 5s.");
}

// ==========================================
// MAIN LOOP
// ==========================================
void loop() {
  // Keep audio web server responsive (Camera server handles itself in the background)
  audioServer.handleClient();

  // Auto-stop recording after 5 seconds
  if (isRecording && (millis() - recordingStartTime >= RECORD_DURATION_MS)) {
    isRecording = false;
    isAudioReady = true;
    Serial.printf("🛑 Recording stopped (%lu bytes captured). Ready for app to fetch.\n", audioDataSize);
  }
}