/**
 * useConnectionWatchdog.js
 *
 * A React hook that continuously monitors:
 *   1. The device's WiFi connectivity state via @react-native-community/netinfo.
 *   2. Reachability of the ESP32 at its configured static IP by pinging it
 *      on a regular interval.
 *
 * Returns a `ConnectionStatus` object that components can use to show
 * connection state and trigger reconnection logic.
 *
 * Usage:
 *   const { isWifiConnected, isEsp32Reachable, ssid, lastPingMs } =
 *     useConnectionWatchdog(esp32Config);
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { pingESP32 } from '../services/ESP32Service';

/** How often to ping the ESP32 (milliseconds). */
const PING_INTERVAL_MS = 5_000;

/**
 * @typedef {object} ConnectionStatus
 * @property {boolean}      isWifiConnected   - True when the device has an active WiFi connection.
 * @property {boolean}      isEsp32Reachable  - True when the last ping to the ESP32 succeeded.
 * @property {string|null}  ssid              - Current WiFi SSID (may be null on Android without location permission).
 * @property {number|null}  lastPingMs        - Round-trip latency of the last successful ping in milliseconds.
 * @property {string}       status            - Human-readable connection status string.
 * @property {Function}     retryNow          - Call this to trigger an immediate ping outside the normal interval.
 */

/**
 * Monitors WiFi and ESP32 reachability.
 *
 * @param {object} esp32Config - ESP32 configuration (ip, port, pingPath, timeoutMs).
 * @returns {ConnectionStatus}
 */
export function useConnectionWatchdog(esp32Config) {
  const [isWifiConnected, setIsWifiConnected] = useState(false);
  const [isEsp32Reachable, setIsEsp32Reachable] = useState(false);
  const [ssid, setSsid] = useState(null);
  const [lastPingMs, setLastPingMs] = useState(null);

  const pingIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  // ---------------------------------------------------------------------------
  // Single ping attempt with timing
  // ---------------------------------------------------------------------------
  const doPing = useCallback(async () => {
    if (!isMountedRef.current) return;

    const t0 = Date.now();
    const reachable = await pingESP32(esp32Config);
    const elapsed = Date.now() - t0;

    if (isMountedRef.current) {
      setIsEsp32Reachable(reachable);
      if (reachable) setLastPingMs(elapsed);
    }
  }, [esp32Config]);

  // ---------------------------------------------------------------------------
  // Start / stop periodic ping
  // ---------------------------------------------------------------------------
  const startPingLoop = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    doPing(); // immediate first ping
    pingIntervalRef.current = setInterval(doPing, PING_INTERVAL_MS);
  }, [doPing]);

  const stopPingLoop = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Subscribe to NetInfo for WiFi changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!isMountedRef.current) return;

      const wifiUp = state.isConnected && state.type === 'wifi';
      setIsWifiConnected(wifiUp);
      setSsid(state.details?.ssid ?? null);

      if (wifiUp) {
        startPingLoop();
      } else {
        stopPingLoop();
        setIsEsp32Reachable(false);
        setLastPingMs(null);
      }
    });

    return () => {
      isMountedRef.current = false;
      stopPingLoop();
      unsubscribe();
    };
  }, [startPingLoop, stopPingLoop]);

  // ---------------------------------------------------------------------------
  // Re-run ping loop whenever esp32Config changes (e.g., IP updated in Settings)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isWifiConnected) startPingLoop();
  }, [esp32Config, isWifiConnected, startPingLoop]);

  // ---------------------------------------------------------------------------
  // Derived human-readable status
  // ---------------------------------------------------------------------------
  let status = 'No WiFi connection';
  if (isWifiConnected && isEsp32Reachable) {
    status = `Connected to ESP32${lastPingMs !== null ? ` (${lastPingMs} ms)` : ''}`;
  } else if (isWifiConnected) {
    status = `WiFi connected${ssid ? ` to "${ssid}"` : ''} — searching for ESP32…`;
  }

  return {
    isWifiConnected,
    isEsp32Reachable,
    ssid,
    lastPingMs,
    status,
    retryNow: doPing,
  };
}
