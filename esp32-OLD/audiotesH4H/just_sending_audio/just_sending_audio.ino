#include <WiFi.h>
#include <ESP_I2S.h>
#include <WebServer.h>
#include <HTTPClient.h>

// ==========================================
// CONFIGURATION
// ==========================================
const char* ssid = "Victor";
const char* password = "Victor@2007.";

#define BUTTON_PIN 1 // Physical button GPIO (connect between GPIO 1 and GND)
const int APP_WEBHOOK_PORT = 3000; // Port your React Native app listens on

// ==========================================
// GLOBALS & STATE
// ==========================================
WebServer server(80); // Running on standard port 80 since there's no camera
I2SClass I2S;

// 15 seconds of 16kHz 16-bit mono audio = 480,000 bytes
const size_t MAX_AUDIO_SIZE = 480000; 
uint8_t* audioBuffer = nullptr;
size_t audioDataSize = 0;

volatile bool isRecording = false; // volatile because shared with FreeRTOS task
bool isAudioReady = false;
uint32_t recordingStartTime = 0;
const uint32_t MAX_RECORD_TIME_MS = 15000; // 15 seconds max

// Button debounce
int lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50;

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
// WEBHOOK NOTIFICATION
// ==========================================
void notifyApp() {
  isAudioReady = true;
  
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String gatewayIP = WiFi.gatewayIP().toString(); // The iPhone Hotspot IP
    String webhookUrl = "http://" + gatewayIP + ":" + String(APP_WEBHOOK_PORT) + "/audio-ready";
    
    Serial.print("📡 Sending Webhook: ");
    Serial.println(webhookUrl);
    
    http.begin(webhookUrl);
    int httpResponseCode = http.GET();
    
    if (httpResponseCode > 0) {
      Serial.printf("✅ App notified! Code: %d\n", httpResponseCode);
    } else {
      Serial.printf("❌ Error notifying app: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }
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
      // Yield to watchdog/OS when not actively recording
      vTaskDelay(10 / portTICK_PERIOD_MS); 
    }
  }
}

// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(500);

  // 1. Hardware Init
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Allocate PSRAM
  audioBuffer = (uint8_t*)ps_malloc(MAX_AUDIO_SIZE);
  if (!audioBuffer) {
    Serial.println("CRITICAL: PSRAM allocation failed!");
    while(1); // Halt if no memory
  }

  // 2. Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // 3. Init Microphone (from your boilerplate)
  I2S.setPinsPdmRx(42, 41);
  if (!I2S.begin(I2S_MODE_PDM_RX, 16000, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) {
    Serial.println("Failed to initialize I2S!");
    while (1) {}
  }
  Serial.println("PDM mic ready");

  // 4. Setup Web Server Endpoints
  server.on("/audio.wav", []() {
    if (isRecording) {
      server.send(400, "text/plain", "Recording in progress");
      return;
    }
    
    WiFiClient client = server.client();
    server.setContentLength(44 + audioDataSize);
    server.sendHeader("Content-Type", "audio/wav");
    server.sendHeader("Connection", "close");
    server.send(200);
    
    sendWavHeader(client, audioDataSize);
    client.write(audioBuffer, audioDataSize);
    
    isAudioReady = false; // Reset state after download
    Serial.println("📤 Audio downloaded by app");
  });

  server.on("/status", []() {
    String json = isAudioReady ? "{\"ready\":true}" : "{\"ready\":false}";
    server.send(200, "application/json", json);
  });

  server.begin();
  Serial.println("Web Server running on port 80");

  // 5. Launch Background Audio Task on Core 1
  xTaskCreatePinnedToCore(
    audioRecordTask, "AudioTask", 4096, NULL, 2, NULL, 1
  );
}

// ==========================================
// MAIN LOOP
// ==========================================
void loop() {
  // Keep web server responsive
  server.handleClient();

  // Handle Physical Button (Debounced)
  int reading = digitalRead(BUTTON_PIN);
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    static int buttonState = HIGH;
    if (reading != buttonState) {
      buttonState = reading;
      
      if (buttonState == LOW) { // Button pressed
        if (!isRecording) {
          isRecording = true;
          isAudioReady = false;
          audioDataSize = 0; // Clear buffer
          recordingStartTime = millis();
          Serial.println("🎤 Recording Started!");
        } else {
          isRecording = false;
          Serial.println("🛑 Recording Stopped Manually!");
          notifyApp(); 
        }
      }
    }
  }
  lastButtonState = reading;

  // Auto-stop recording after 15 seconds
  if (isRecording && (millis() - recordingStartTime >= MAX_RECORD_TIME_MS)) {
    isRecording = false;
    Serial.println("🛑 Recording Stopped (15s Auto Limit)");
    notifyApp();
  }
}