# ESP32 Firmware for H4H Vision

Firmware for the **Seeed Studio XIAO ESP32-S3 Sense** camera board. Streams video over WiFi to the H4H Vision mobile app.

## Requirements

- [Arduino IDE](https://www.arduino.cc/en/software) or [PlatformIO](https://platformio.org/)
- [esp32cam](https://github.com/yoursunny/esp32cam) library (install via Arduino Library Manager: search "esp32cam")
- XIAO ESP32-S3 board support (install "ESP32" by Espressif, select board `XIAO_ESP32S3`)

## Setup

1. **Clone or copy** the `esp32_streaming_server` folder into your Arduino sketchbook or open it in PlatformIO.

2. **Edit credentials** in `esp32_streaming_server.ino`:
   ```cpp
   const char* WIFI_SSID = "YourPhoneHotspot";   // Your phone's hotspot name
   const char* WIFI_PASS = "YourHotspotPassword"; // Your hotspot password
   ```

3. **Upload** the sketch to the XIAO ESP32-S3 Sense:
   - Connect via USB-C
   - Select **Board**: `XIAO_ESP32S3`
   - Select the correct port
   - Upload

4. **Get the IP address**:
   - Open Serial Monitor at 115200 baud
   - The ESP32 will print its IP (e.g. `192.168.43.184`)

5. **Configure the app**:
   - Open H4H Vision app → Settings
   - Enter the ESP32 IP address
   - Test connection

## Endpoints

| Path     | Description                    |
|----------|--------------------------------|
| `/stream`  | MJPEG video stream (continuous) |
| `/capture` | Single JPEG snapshot            |
| `/status`  | Health check (returns `{"status":"ok"}`) |

## Phone Hotspot Notes

- **Android**: Hotspot usually uses subnet `192.168.43.x` (gateway `192.168.43.1`). The ESP32 will get an IP via DHCP.
- **iOS**: Personal Hotspot may use `172.20.10.x`. Check your phone’s hotspot settings for the IP range.
- Use a **static IP** or **DHCP reservation** for the ESP32 if its IP changes between reboots. Alternatively, update the app Settings whenever the IP changes.
