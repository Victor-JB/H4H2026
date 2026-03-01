/**
 * Central configuration for ESP32 and backend services.
 *
 * Change the IP/port here once and every service picks it up.
 */

// ── Network ────────────────────────────────────────────────
export const ESP_IP = "172.20.10.2";

/** Camera server (port 80) */
export const ESP_CAM_BASE = `http://${ESP_IP}`;

/** Audio record / playback server (port 8080) */
export const ESP_AUDIO_BASE = `http://${ESP_IP}:8080`;

/** Audio status endpoint */
export const ESP_STATUS_URL = `${ESP_AUDIO_BASE}/status`;

/** YOLO / scene-analysis backend (ngrok) */
export const BACKEND_API_BASE =
  "https://letisha-unmetalled-enzymatically.ngrok-free.dev";

/** Default YOLO confidence threshold */
export const YOLO_CONF = 0.35;

