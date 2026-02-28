/**
 * ESP32Service.js
 *
 * Handles all networking communication with the Seeed Studio XIAO ESP32-S3 Sense
 * camera module over a local phone hotspot.
 *
 * Supports two streaming modes:
 *   1. MJPEG stream  — parsed via chunked HTTP response
 *   2. JPEG snapshot — high-frequency polling via axios GET requests
 */

import axios from 'axios';

// ---------------------------------------------------------------------------
// Configuration defaults (override via SettingsScreen / AsyncStorage)
// ---------------------------------------------------------------------------
export const ESP32_DEFAULTS = {
  /** Static IP assigned to the ESP32 on the phone hotspot subnet */
  ip: '192.168.43.184',
  /** HTTP port the ESP32 web-server listens on */
  port: 80,
  /** Path for the MJPEG stream endpoint */
  mjpegPath: '/stream',
  /** Path for a single JPEG snapshot */
  snapshotPath: '/capture',
  /** Path for a lightweight ping/health-check */
  pingPath: '/status',
  /** Polling interval in milliseconds for snapshot mode */
  snapshotIntervalMs: 100,
  /** Request timeout in milliseconds */
  timeoutMs: 3000,
};

// ---------------------------------------------------------------------------
// Helper – build a full URL from the current config
// ---------------------------------------------------------------------------
function buildUrl(config, path) {
  return `http://${config.ip}:${config.port}${path}`;
}

// ---------------------------------------------------------------------------
// Ping / reachability check
// ---------------------------------------------------------------------------

/**
 * Attempts a lightweight GET request to the ESP32 /status endpoint.
 *
 * @param {object} config - Merged ESP32 configuration object.
 * @returns {Promise<boolean>} Resolves `true` if the device responds with 2xx.
 */
export async function pingESP32(config = ESP32_DEFAULTS) {
  try {
    const response = await axios.get(buildUrl(config, config.pingPath), {
      timeout: config.timeoutMs,
    });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// JPEG Snapshot Mode
// ---------------------------------------------------------------------------

/**
 * Fetches a single JPEG frame from the ESP32 snapshot endpoint.
 *
 * @param {object} config - Merged ESP32 configuration object.
 * @returns {Promise<string>} A `data:image/jpeg;base64,…` data-URI string.
 */
export async function fetchSnapshot(config = ESP32_DEFAULTS) {
  const response = await axios.get(buildUrl(config, config.snapshotPath), {
    responseType: 'arraybuffer',
    timeout: config.timeoutMs,
  });

  // Convert the raw ArrayBuffer to a base64 data-URI for use with <Image />
  // React Native does not ship Node's `Buffer`; use the bundled btoa approach instead.
  const bytes = new Uint8Array(response.data);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Starts a high-frequency JPEG snapshot polling loop.
 *
 * @param {object}   config     - Merged ESP32 configuration object.
 * @param {Function} onFrame    - Callback invoked with each new data-URI frame.
 * @param {Function} onError    - Callback invoked when a request fails.
 * @returns {{ stop: Function }} An object with a `stop()` method to cancel polling.
 */
export function startSnapshotPolling(config = ESP32_DEFAULTS, onFrame, onError) {
  let active = true;

  const poll = async () => {
    while (active) {
      const start = Date.now();
      try {
        const frame = await fetchSnapshot(config);
        if (active) onFrame(frame);
      } catch (err) {
        if (active && onError) onError(err);
      }
      // Maintain target FPS; subtract elapsed time from the next wait
      const elapsed = Date.now() - start;
      const wait = Math.max(0, config.snapshotIntervalMs - elapsed);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  };

  poll();

  return {
    stop: () => {
      active = false;
    },
  };
}

// ---------------------------------------------------------------------------
// MJPEG Stream Mode
// ---------------------------------------------------------------------------

/**
 * Returns the full MJPEG stream URL for use as the `source.uri` of an
 * Expo <Image /> or a WebView, or for direct consumption via fetch().
 *
 * @param {object} config - Merged ESP32 configuration object.
 * @returns {string} The MJPEG stream URL.
 */
export function getMjpegStreamUrl(config = ESP32_DEFAULTS) {
  return buildUrl(config, config.mjpegPath);
}

/**
 * Opens a raw MJPEG stream using the Fetch API and invokes `onFrame` for every
 * decoded JPEG boundary found in the multipart response.
 *
 * NOTE: Full MJPEG parsing requires a ReadableStream-capable runtime. This
 * implementation works on React Native 0.73+ (Hermes with fetch streams).
 * Fall back to `startSnapshotPolling` on older runtimes.
 *
 * @param {object}   config   - Merged ESP32 configuration object.
 * @param {Function} onFrame  - Callback with a Uint8Array of JPEG bytes per frame.
 * @param {Function} onError  - Error callback.
 * @returns {Promise<{ stop: Function }>} Resolves when the stream is open.
 */
export async function startMjpegStream(config = ESP32_DEFAULTS, onFrame, onError) {
  const controller = new AbortController();

  try {
    const response = await fetch(buildUrl(config, config.mjpegPath), {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ESP32 stream returned HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    let buffer = new Uint8Array(0);

    // JPEG SOI (0xFF 0xD8) and EOI (0xFF 0xD9) markers
    const SOI = [0xff, 0xd8];
    const EOI = [0xff, 0xd9];

    const findMarker = (buf, marker, fromIndex = 0) => {
      for (let i = fromIndex; i < buf.length - 1; i++) {
        if (buf[i] === marker[0] && buf[i + 1] === marker[1]) return i;
      }
      return -1;
    };

    const readLoop = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new chunk to buffer
        const next = new Uint8Array(buffer.length + value.length);
        next.set(buffer);
        next.set(value, buffer.length);
        buffer = next;

        // Extract all complete JPEG frames from the buffer
        let soiIdx = findMarker(buffer, SOI);
        while (soiIdx !== -1) {
          const eoiIdx = findMarker(buffer, EOI, soiIdx + 2);
          if (eoiIdx === -1) break; // Frame incomplete — wait for more data

          const frame = buffer.slice(soiIdx, eoiIdx + 2);
          onFrame(frame);

          buffer = buffer.slice(eoiIdx + 2);
          soiIdx = findMarker(buffer, SOI);
        }
      }
    };

    readLoop().catch((err) => {
      if (err.name !== 'AbortError' && onError) onError(err);
    });
  } catch (err) {
    if (err.name !== 'AbortError' && onError) onError(err);
  }

  return {
    stop: () => controller.abort(),
  };
}
