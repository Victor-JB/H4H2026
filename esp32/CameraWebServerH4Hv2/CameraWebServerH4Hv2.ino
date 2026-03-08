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

// extern declarations for variables defined in sub-sketch files
// (Arduino concatenates .ino files after the main, so these are
// declared here to make them visible to setup() and loop())
extern volatile bool isRecording;
extern volatile bool isPlaying;
extern bool          isAudioReady;
extern size_t        audioDataSize;

// ==========================================
// CONFIGURATION & HARDWARE PINS
// ==========================================
#define CAMERA_MODEL_XIAO_ESP32S3
#include "camera_pins.h"

#define BUTTON_PIN   1
#define I2S_SPK_BCLK 4
#define I2S_SPK_LRC  5
#define I2S_SPK_DOUT 6

// ==========================================
// SHARED GLOBALS
// ==========================================
// 15 seconds of 16kHz 16-bit mono audio = 480,000 bytes
const size_t   MAX_AUDIO_SIZE     = 480000;
const uint32_t MAX_RECORD_TIME_MS = 15000;

WebServer audioServer(8080);

// Button debounce
int           lastButtonState  = HIGH;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay    = 50;

// WiFi Reconnect Timer Globals
unsigned long lastWiFiCheckTime = 0;
const unsigned long wifiCheckInterval = 10000; // Check every 10 seconds (10,000 ms)

// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();

  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // WiFi
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false); // Crucial for camera stream stability
  
  // Enable built-in auto-reconnect as a baseline
  WiFi.setAutoReconnect(true); 
  
  WiFi.begin(ssid, password);
  Serial.printf("WiFi connecting to SSID: '%s'\n", ssid);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 60) {
    delay(500);
    Serial.printf("  [%d/60] status=%d\n", retries + 1, WiFi.status());
    retries++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("\nFailed. Final status=%d (1=no SSID, 4=wrong password, 6=disconnected)\n", WiFi.status());
    Serial.println("Restarting...");
    ESP.restart();
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Camera: start HTTP server first (Port 80), then init hardware
  startCameraServer();
  setupCamera();

  // Audio I/O
  setupMic();
  setupSpeaker();

  // Audio Server Endpoints (Port 8080)
  setupRecordingEndpoints();
  setupPlaybackEndpoints();
  audioServer.begin();

  Serial.println("Camera Server running on Port 80");
  Serial.println("Audio Server running on Port 8080");

  // FreeRTOS audio task pinned to Core 1
  xTaskCreatePinnedToCore(audioTask, "AudioTask", 4096, NULL, 2, NULL, 1);
}

// ==========================================
// MAIN LOOP
// ==========================================
void loop() {
  // --- WIFI RECONNECT LOGIC ---
  // Check WiFi status every 10 seconds. If disconnected, attempt to reconnect.
  if (WiFi.status() != WL_CONNECTED && (millis() - lastWiFiCheckTime >= wifiCheckInterval)) {
    Serial.println("WiFi connection lost. Attempting to reconnect...");
    WiFi.disconnect();
    WiFi.reconnect();
    lastWiFiCheckTime = millis();
  }

  // Handle incoming web requests
  audioServer.handleClient();

  // --- BUTTON LOGIC ---
  int reading = digitalRead(BUTTON_PIN);
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    static int buttonState = HIGH;
    if (reading != buttonState) {
      buttonState = reading;

      if (buttonState == LOW) {
        if (!isRecording && !isPlaying) {
          // Play start chime BEFORE recording begins
          playStartChime();
          delay(50);

          isRecording  = true;
          isAudioReady = false;
          audioDataSize = 0;
          Serial.println("Recording Started!");

        } else if (isRecording) {
          // Stop recording FIRST so chime isn't captured
          isRecording  = false;
          isAudioReady = true;
          Serial.println("Recording Stopped!");

          delay(50);
          playStopChime();
          Serial.println("Ready for app to fetch.");
        }
      }
    }
  }
  lastButtonState = reading;
}