/**
 * H4H Vision - XIAO ESP32-S3 Sense Streaming Server
 *
 * Streams video from the OV2640 camera over WiFi. Connects to a phone
 * hotspot and serves:
 *   /stream  - MJPEG video stream
 *   /capture - Single JPEG snapshot
 *   /status  - Health check (lightweight)
 *
 * Hardware: Seeed Studio XIAO ESP32-S3 Sense
 * Library: esp32cam (install via Arduino Library Manager)
 *
 * Setup:
 *   1. Enable phone hotspot and note SSID + password
 *   2. Update WIFI_SSID and WIFI_PASS below
 *   3. Upload to XIAO ESP32-S3 (Board: XIAO_ESP32S3)
 *   4. Open Serial Monitor (115200) to see the ESP32 IP
 *   5. Configure that IP in the H4H Vision app Settings
 *
 * Typical Android hotspot subnet: 192.168.43.x (gateway 192.168.43.1)
 * iOS Personal Hotspot may use 172.20.10.x
 */

#include "WebServer.h"
#include "WiFi.h"
#include "esp32cam.h"

// ---------------------------------------------------------------------------
// WiFi credentials - replace with your phone hotspot SSID and password
// ---------------------------------------------------------------------------
const char* WIFI_SSID = "Nikash's iPhone (2)";
const char* WIFI_PASS = "proteindisasterpoop";

// ---------------------------------------------------------------------------
// Streaming configuration
// ---------------------------------------------------------------------------
const char* STREAM_URL = "/stream";
const char* CAPTURE_URL = "/capture";
const char* STATUS_URL = "/status";
const auto RESOLUTION = esp32cam::Resolution::find(800, 600);
const int FRAMERATE = 10;

WebServer server(80);

// ---------------------------------------------------------------------------
// MJPEG stream handler
// ---------------------------------------------------------------------------
void handleStream() {
  static char head[128];
  WiFiClient client = server.client();

  server.sendContent("HTTP/1.1 200 OK\r\n"
                     "Content-Type: multipart/x-mixed-replace; "
                     "boundary=frame\r\n\r\n");

  while (client.connected()) {
    auto frame = esp32cam::capture();
    if (frame) {
      sprintf(head,
              "--frame\r\n"
              "Content-Type: image/jpeg\r\n"
              "Content-Length: %u\r\n\r\n",
              (unsigned int)frame->size());
      client.write(head, strlen(head));
      frame->writeTo(client);
      client.write("\r\n");
      delay(1000 / FRAMERATE);
    }
  }
}

// ---------------------------------------------------------------------------
// Single JPEG snapshot handler (for snapshot polling mode)
// ---------------------------------------------------------------------------
void handleCapture() {
  auto frame = esp32cam::capture();
  if (!frame) {
    server.send(503, "image/jpeg", "");
    return;
  }
  server.send(200, "image/jpeg", (const char*)frame->data(), frame->size());
}

// ---------------------------------------------------------------------------
// Health check handler (for connection watchdog ping)
// ---------------------------------------------------------------------------
void handleStatus() {
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

// ---------------------------------------------------------------------------
// Camera initialization
// ---------------------------------------------------------------------------
void initCamera() {
  using namespace esp32cam;
  Config cfg;
  cfg.setPins(pins::XiaoSense);
  cfg.setResolution(RESOLUTION);
  cfg.setBufferCount(2);
  cfg.setJpeg(80);
  Camera.begin(cfg);
}

// ---------------------------------------------------------------------------
// WiFi connection
// ---------------------------------------------------------------------------
void initWifi() {
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Stream at: http://");
  Serial.print(WiFi.localIP());
  Serial.println(STREAM_URL);
  Serial.print("Capture at: http://");
  Serial.print(WiFi.localIP());
  Serial.println(CAPTURE_URL);
}

// ---------------------------------------------------------------------------
// HTTP server setup
// ---------------------------------------------------------------------------
void initServer() {
  server.on(STREAM_URL, handleStream);
  server.on(CAPTURE_URL, handleCapture);
  server.on(STATUS_URL, handleStatus);
  server.begin();
}

void setup() {
  Serial.begin(115200);
  initWifi();
  initCamera();
  initServer();
}

void loop() {
  server.handleClient();
}
