# H4H2026

Hack 4 Humanity 2026 project — a React Native / Expo app that streams video from a Seeed Studio XIAO ESP32-S3 Sense camera over a phone hotspot and feeds frames into a TFLite navigation-assistance pipeline with audio output.

## Architecture

- **Mobile app** (`mobile/`): React Native + Expo Development Build. Connects to the ESP32 via WiFi, displays the live feed, runs on-device object detection (TFLite), and speaks navigation alerts.
- **ESP32 firmware** (`esp32/`): Arduino sketch for the XIAO ESP32-S3 Sense. Streams MJPEG and JPEG snapshots over HTTP.

## Quick Start

### 1. Phone Hotspot

1. Enable the **mobile hotspot** on your phone.
2. Note the **SSID** and **password**.
3. Android hotspots typically use subnet `192.168.43.x`. iOS Personal Hotspot may use `172.20.10.x`.

### 2. ESP32 Setup

1. Open `esp32/esp32_streaming_server/esp32_streaming_server.ino` in the Arduino IDE.
2. Set `WIFI_SSID` and `WIFI_PASS` to your hotspot credentials.
3. Install the **esp32cam** library (Arduino Library Manager → search "esp32cam").
4. Select board **XIAO_ESP32S3** and upload.
5. Open the Serial Monitor (115200 baud) and note the printed IP (e.g. `192.168.43.184`).

See [esp32/README.md](esp32/README.md) for details.

### 3. Mobile App

```bash
cd mobile
npm install --legacy-peer-deps
npx expo run:android   # or: npx expo run:ios
```

1. Connect your phone to the same hotspot (or use the hotspot on the same device if supported).
2. Open the H4H Vision app → **Settings**.
3. Enter the ESP32 **IP address** (from the Serial Monitor).
4. Tap **Test Connection** to verify.
5. Return to the Live view to see the camera feed and hear navigation alerts.

## Configuration

| Setting        | Description                                  | Default           |
|----------------|----------------------------------------------|-------------------|
| ESP32 IP       | Static IP of the ESP32 on the hotspot subnet | `192.168.43.184`  |
| Port           | HTTP port the ESP32 listens on               | `80`              |
| Streaming mode | MJPEG stream or JPEG snapshot polling        | Snapshot          |
| Snapshot interval | Polling interval (ms) in snapshot mode     | `100`             |

## Development

- **Expo dev build** required (native modules: react-native-fast-tflite). Do not use Expo Go. Use `npx expo run:android` or `npx expo run:ios` to build and run; the app will not work with `expo start` + Expo Go for object detection.
- If you see **"Tflite could not be found"**: you are running without the native TFLite binary. Build and run with `npx expo run:android` or `npx expo run:ios` (and, if needed, run `npx expo prebuild` first). The app will still run and show the camera stream without detection until then.
- **TFLite model**: The app uses `mobile/assets/models/ssd_mobilenet.tflite` if present; otherwise it may load from a remote URL. See [mobile/assets/models/README.md](mobile/assets/models/README.md).

## License

See [LICENSE](LICENSE).
